import { NextResponse } from 'next/server'
import { egovDeproc } from '@/lib/egov'

export async function POST(req) {
  try {
    const body = await req.json()
    const appId = (body?.appId || '').toString().trim()
    const mToken = (body?.mToken || '').toString().trim()

    if (!appId || !mToken) {
      return NextResponse.json({ ok: false, error: 'Missing appId or mToken' }, { status: 400 })
    }

    const data = await egovDeproc({ appId, mToken })
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
