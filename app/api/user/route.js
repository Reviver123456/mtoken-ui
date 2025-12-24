import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

function norm(v) {
  return (v || '').toString().trim()
}

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const citizenId = norm(url.searchParams.get('citizenId'))
    const appId = norm(url.searchParams.get('appId') || url.searchParams.get('appid'))


    const client = await clientPromise
    const db = client.db()
    const col = db.collection('users')

    let user = null
    if (citizenId) {
      user = await col.findOne({ citizenId })
    } else if (appId) {

      user = (await col.findOne({ lastAppId: appId })) || (await col.findOne({ appId }))
    } else {
      // fallback: latest record
      user = await col.findOne({}, { sort: { updatedAt: -1, createdAt: -1 } })
    }

    if (!user) {
      return NextResponse.json({ ok: true, data: null })
    }

    const { _id, ...safe } = user
    return NextResponse.json({ ok: true, data: safe })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const citizenId = norm(body?.citizenId)
    const appId = norm(body?.appId || body?.appid)

    if (!citizenId) {
      return NextResponse.json({ ok: false, error: 'Missing citizenId' }, { status: 400 })
    }

    const doc = {
      citizenId,
      firstName: norm(body?.firstName),
      lastName: norm(body?.lastName),
      dateOfBirthString: norm(body?.dateOfBirthString),
      mobile: norm(body?.mobile),
      email: norm(body?.email),
      czpUserId: norm(body?.czpUserId),
      notification: body?.notification ?? null,
      appId,
      lastAppId: appId,
      updatedAt: new Date(),
    }

    const client = await clientPromise
    const db = client.db()
    const col = db.collection('users')

    await col.updateOne(
      { citizenId },
      {
        $set: doc,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    const saved = await col.findOne({ citizenId })
    const { _id, ...safe } = saved
    return NextResponse.json({ ok: true, data: safe })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
