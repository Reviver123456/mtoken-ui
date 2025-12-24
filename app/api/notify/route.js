import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { egovPushNotification } from '@/lib/egov'

function norm(v) {
  return (v || '').toString().trim()
}

export async function POST(req) {
  try {
    const body = await req.json()
    const citizenId = norm(body?.citizenId)
    const message = norm(body?.message) || 'ยินดีต้อนรับการทดสอบเทส'
    const appIdFromReq = norm(body?.appId)

    if (!citizenId) {
      return NextResponse.json({ ok: false, error: 'Missing citizenId' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()
    const col = db.collection('users')
    const user = await col.findOne({ citizenId })

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found in DB' }, { status: 404 })
    }

    const appId = appIdFromReq || norm(user.appId)
    const userId = norm(user.czpUserId)

    if (!appId) {
      return NextResponse.json(
        { ok: false, error: 'Missing appId. Please enter via /??appId=...&mToken=...' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Missing czpUserId in DB. Cannot send notification.' },
        { status: 400 }
      )
    }

    const result = await egovPushNotification({ appId, userId, message })
    await col.updateOne(
      { citizenId },
      {
        $set: {
          lastNotifyAt: new Date(),
          lastNotifyMessage: message,
          lastNotifyResult: result,
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
