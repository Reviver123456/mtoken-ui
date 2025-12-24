import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { egovDeproc } from '@/lib/egov'

function norm(v) {
  return (v || '').toString().trim()
}

function pickProfile(raw) {
  if (!raw) return null

  const unwrap = (x) => {
    if (!x) return x
    if (x?.data) x = x.data
    if (x?.result) x = x.result
    if (x?.Result) x = x.Result
    return x
  }

  const normalizeThaiId = (s) => {
    const digits = String(s || '').replace(/\D/g, '')
    return digits.length === 13 ? digits : ''
  }

  const KEYS = ['citizenId', 'citizenID', 'citizen_id', 'pid', 'personalId']
  const visited = new Set()
  const queue = [unwrap(raw)]
  let foundNode = null
  let foundId = ''

  while (queue.length) {
    const cur = queue.shift()
    if (!cur || typeof cur !== 'object') continue
    if (visited.has(cur)) continue
    visited.add(cur)

    for (const k of KEYS) {
      if (cur?.[k] != null && String(cur[k]).trim() !== '') {
        const nid = normalizeThaiId(cur[k])
        if (nid) {
          foundNode = cur
          foundId = nid
          queue.length = 0
          break
        }
        if (!foundNode) {
          foundNode = cur
          foundId = String(cur[k]).trim()
        }
      }
    }

    for (const v of Object.values(cur)) {
      if (v && typeof v === 'object') queue.push(unwrap(v))
    }
  }

  const p = foundNode ? unwrap(foundNode) : unwrap(raw)
  const citizenId = foundId || normalizeThaiId(p?.citizenId || p?.citizenID || p?.citizen_id)
  if (!citizenId) return null

  return {
    citizenId: String(citizenId),
    firstName: String(p?.firstName || p?.firstname || ''),
    lastName: String(p?.lastName || p?.lastname || ''),
    dateOfBirthString: String(p?.dateOfBirthString || p?.dateOfBirth || ''),
    mobile: String(p?.mobile || p?.phone || ''),
    email: String(p?.email || ''),
    czpUserId: String(p?.czpUserId || p?.czp_user_id || p?.userId || p?.userid || ''),
    notification: p?.notification ?? null,
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const appId = norm(body?.appId)
    const mToken = norm(body?.mToken)

    if (!appId || !mToken) {
      return NextResponse.json({ ok: false, error: 'Missing appId or mToken' }, { status: 400 })
    }

    const deprocRaw = await egovDeproc({ appId, mToken })
    const profile = pickProfile(deprocRaw)

    if (!profile?.citizenId) {
      return NextResponse.json(
        { ok: false, error: 'Deproc success but missing citizenId', raw: deprocRaw },
        { status: 502 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    const users = db.collection('users')

    const user = await users.findOne({ citizenId: profile.citizenId })

    if (user) {
      await users.updateOne(
        { citizenId: profile.citizenId },
        {
          $set: {
            ...profile,
            appId, 
            lastAppId: appId,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      )

      return NextResponse.json({ ok: true, status: 'exists', citizenId: profile.citizenId, appId })
    }

    return NextResponse.json({
      ok: true,
      status: 'new',
      profile: { ...profile, appId },
      appId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
