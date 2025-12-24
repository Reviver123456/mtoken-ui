import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const col = db.collection('users')

    const user = await col.find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(1).next()

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
