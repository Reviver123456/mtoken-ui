export const EGOV = {
  ConsumerKey: '2907f3d6-19e5-4545-a058-b7077f342bfa',
  ConsumerSecret: 'TP0mPcTfAFJ',
  AgentID: '8a816448-0207-45f4-8613-65b0ad80afd0',
  AuthValidateUrl: 'https://api.egov.go.th/ws/auth/validate',
  DeprocUrl: 'https://api.egov.go.th/ws/dga/czp/uat/v1/core/shield/data/deproc',
  NotifyUrl: 'https://api.egov.go.th/ws/dga/czp/uat/v1/core/notification/push',
}

function withTimeout(ms = 20000) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(new Error('timeout')), ms)
  return { signal: controller.signal, clear: () => clearTimeout(t) }
}

function consumerHeaders() {
  // Some gateways expect ConsumerKey, others Consumer-Key
  return {
    ConsumerKey: EGOV.ConsumerKey,
    'Consumer-Key': EGOV.ConsumerKey,
  }
}

export async function egovValidateToken() {
  const url = new URL(EGOV.AuthValidateUrl)
  url.searchParams.set('ConsumerSecret', EGOV.ConsumerSecret)
  url.searchParams.set('AgentID', EGOV.AgentID)

  const { signal, clear } = withTimeout(20000)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      ...consumerHeaders(),
    },
    cache: 'no-store',
    signal,
  }).finally(clear)

  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // ignore
  }

  if (!res.ok) {
    const detail = json?.message || json?.Message || json?.error || text
    throw new Error(`Auth validate failed: HTTP ${res.status}. ${detail}`)
  }

  const token = json?.Result || json?.result
  if (!token) throw new Error('Auth validate: missing token in response')

  return token
}

export async function egovDeproc({ appId, mToken }) {
  const token = await egovValidateToken()

  const { signal, clear } = withTimeout(25000)

  const res = await fetch(EGOV.DeprocUrl, {
    method: 'POST',
    headers: {
      ...consumerHeaders(),
      Token: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appId, mToken }),
    cache: 'no-store',
    signal,
  }).finally(clear)

  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // ignore
  }

  if (!res.ok) {
    const detail = json?.message || json?.Message || json?.error || text
    const code = json?.messageCode || json?.MessageCode
    throw new Error(`Deproc failed: HTTP ${res.status}${code ? ` (code ${code})` : ''}. ${detail}`)
  }

  // Some eGOV endpoints may return HTTP 200 with an error payload.
  // Treat non-200 messageCode (or null result with message) as failure.
  const mc = json?.messageCode ?? json?.MessageCode
  if (mc !== undefined && mc !== null) {
    const n = Number(mc)
    if (!Number.isNaN(n) && n !== 200) {
      const detail = json?.message || json?.Message || 'Unknown eGOV error'
      throw new Error(`Deproc returned messageCode ${n}. ${detail}`)
    }
  }

  if ((json?.result === null || json?.Result === null) && (json?.message || json?.Message)) {
    const detail = json?.message || json?.Message
    throw new Error(`Deproc returned empty result. ${detail}`)
  }

  return json
}

export async function egovPushNotification({ appId, userId, message, sendDateTime }) {
  const token = await egovValidateToken()

  const payload = {
    appId,
    data: [{ message, userId }],
  }

  // ไม่ส่ง sendDateTime ถ้าไม่ได้ระบุ (ให้ระบบปลายทางกำหนดเวลาเอง)
  if (sendDateTime) payload.sendDateTime = sendDateTime

  const { signal, clear } = withTimeout(25000)

  const res = await fetch(EGOV.NotifyUrl, {
    method: 'POST',
    headers: {
      ...consumerHeaders(),
      Token: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal,
  }).finally(clear)

  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // ignore
  }

  if (!res.ok) {
    const detail = json?.message || json?.Message || json?.error || text
    const code = json?.messageCode || json?.MessageCode
    throw new Error(`Notification push failed: HTTP ${res.status}${code ? ` (code ${code})` : ''}. ${detail}`)
  }

  const mc = json?.messageCode ?? json?.MessageCode
  if (mc !== undefined && mc !== null) {
    const n = Number(mc)
    if (!Number.isNaN(n) && n !== 200) {
      const detail = json?.message || json?.Message || 'Unknown eGOV error'
      throw new Error(`Notification push returned messageCode ${n}. ${detail}`)
    }
  }

  return json
}
