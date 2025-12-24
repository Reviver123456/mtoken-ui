'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const BASE_PATH = "/test6"

async function apiFetch(url, options) {
  const finalUrl = url.startsWith(BASE_PATH + "/") ? url : `${BASE_PATH}${url}`
  const res = await fetch(finalUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })
  const text = await res.text()
  const json = safeJson(text)
  if (!res.ok) {
    throw new Error(json?.error || json?.message || text || `HTTP ${res.status}`)
  }
  if (!json?.ok) {
    throw new Error(json?.error || 'Request failed')
  }
  return json
}

function extractCitizenIdFromDeproc(data) {
  // รองรับหลายรูปแบบของ payload จาก eGOV
  const candidates = [
    data?.result?.citizenId,
    data?.Result?.citizenId,
    data?.result?.citizenID,
    data?.Result?.citizenID,
    data?.result?.CitizenId,
    data?.Result?.CitizenId,
    // บางระบบฝังใน data.result.data หรือ data.result.profile
    data?.result?.data?.citizenId,
    data?.result?.profile?.citizenId,
    data?.Result?.data?.citizenId,
    data?.Result?.profile?.citizenId,
  ]
  for (const v of candidates) {
    const s = (v || '').toString().trim()
    if (s) return s
  }
  return ''
}

export default function HomeClient({ citizenId, appId, mToken }) {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [notifyResult, setNotifyResult] = useState(null)
  const [info, setInfo] = useState('')
  const [effectiveCitizenId, setEffectiveCitizenId] = useState('')
  const [effectiveAppId, setEffectiveAppId] = useState('')

  useEffect(() => {
    let alive = true

    function pickFromClientUrl() {
      try {
        const sp = new URLSearchParams(window.location.search)
        const pick = (...keys) => {
          for (const k of keys) {
            const v = sp.get(k)
            if (v && String(v).trim() !== '') return String(v).trim()
          }
          return ''
        }
        return {
          citizenId: pick('citizenId', 'citizenid', 'CitizenId', 'CITIZENID'),
          appId: pick('appId', 'appid', 'AppId', 'APPID'),
          mToken: pick('mToken', 'mtoken', 'MToken', 'MTOKEN'),
        }
      } catch {
        return { citizenId: '', appId: '', mToken: '' }
      }
    }

    function pickFromStorage(key) {
      try {
        return (localStorage.getItem(key) || sessionStorage.getItem(key) || '').toString().trim()
      } catch {
        return ''
      }
    }

    async function load() {
      setError('')
      setInfo('')
      setNotifyResult(null)

      const fromUrl = pickFromClientUrl()
      const cidFromInputs = (citizenId || fromUrl.citizenId || pickFromStorage('egov.citizenId')).toString().trim()
      const aid = (appId || fromUrl.appId || pickFromStorage('egov.appId')).toString().trim()
      const token = (mToken || fromUrl.mToken || pickFromStorage('egov.mToken')).toString().trim()

      setEffectiveAppId(aid)

      // ✅ เป้าหมาย: ให้หน้า Home ใช้ citizenId เป็นหลัก (ไม่ใช้ appId ในการดึง DB)
      // หากไม่มี citizenId แต่มี appId+mToken -> เรียก deproc เพื่อถอด citizenId
      let cid = cidFromInputs
      if (!cid && aid && token) {
        try {
          const deproc = await apiFetch('/api/deproc', {
            method: 'POST',
            body: JSON.stringify({ appId: aid, mToken: token }),
          })
          const extracted = extractCitizenIdFromDeproc(deproc?.data)
          if (extracted) cid = extracted

          // เก็บ mToken ไว้เพื่อใช้ต่อ (ถ้าต้องการ)
          try {
            if (token) {
              localStorage.setItem('egov.mToken', token)
              sessionStorage.setItem('egov.mToken', token)
            }
          } catch {}
        } catch (e) {
          // ถ้าถอดไม่สำเร็จ ก็ปล่อยให้ไป fallback ด้านล่าง (แสดงล่าสุด/หรือ error)
        }
      }

      setEffectiveCitizenId(cid)

      setLoading(true)
      try {
        // ✅ ดึงจาก DB ด้วย citizenId เท่านั้น
        const url = cid ? `/api/user?citizenId=${encodeURIComponent(cid)}` : '/api/user/latest'

        const res = await apiFetch(url, { method: 'GET' })

        if (!alive) return
        if (!res?.data) {
          setError('ไม่พบข้อมูลผู้ใช้ในฐานข้อมูล')
          return
        }
        setUser(res.data)

        try {
          const savedCitizenId = (res.data?.citizenId || cid || '').toString().trim()
          if (savedCitizenId) {
            localStorage.setItem('egov.citizenId', savedCitizenId)
            sessionStorage.setItem('egov.citizenId', savedCitizenId)
            setEffectiveCitizenId(savedCitizenId)
          }
          if (aid) {
            localStorage.setItem('egov.appId', aid)
            sessionStorage.setItem('egov.appId', aid)
          }
        } catch {}

        if (!cidFromInputs && cid) {
          setInfo('หมายเหตุ: ระบบถอด citizenId จาก mToken แล้วใช้ citizenId นั้นในการดึงข้อมูลจากฐานข้อมูล')
        } else if (!cid) {
          setInfo('หมายเหตุ: ไม่ได้ระบุ citizenId และถอดจาก mToken ไม่สำเร็จ จึงแสดง “ผู้ใช้ล่าสุด” จากฐานข้อมูล')
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ'
        if (alive) setError(msg)
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [citizenId, appId, mToken])

  async function onNotify() {
    const cid = (effectiveCitizenId || user?.citizenId || '').toString().trim()
    if (!cid) return
    setSending(true)
    setError('')
    setNotifyResult(null)

    try {
      const res = await apiFetch('/api/notify', {
        method: 'POST',
        body: JSON.stringify({
          citizenId: cid,
          appId: effectiveAppId || user?.appId || '',
          message: 'ยินดีต้อนรับการทดสอบเทส',
        }),
      })

      setNotifyResult(res.data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ส่งแจ้งเตือนไม่สำเร็จ'
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''

  return (
    <main className={styles.wrap}>
      <section className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>ข้อมูลส่วนบุคคล</h1>
          </div>
        </div>

        <div className={styles.hr} />

        {loading ? <div className={styles.alert}>กำลังโหลดข้อมูลจากฐานข้อมูล...</div> : null}
        {info ? <div className={styles.alert}>{info}</div> : null}
        {error ? <div className={`${styles.alert} ${styles.error}`}>{error}</div> : null}

        {user ? (
          <>
            <div className={styles.grid}>
              <div className={styles.panel}>
                <p className={styles.label}>เลขบัตรประชาชน</p>
                <p className={`${styles.value} ${styles.mono}`}>{user.citizenId}</p>
              </div>
              <div className={styles.panel}>
                <p className={styles.label}>ชื่อ-นามสกุล</p>
                <p className={styles.value}>{fullName || '-'}</p>
              </div>
              <div className={styles.panel}>
                <p className={styles.label}>Mobile</p>
                <p className={`${styles.value} ${styles.mono}`}>{user.mobile || '-'}</p>
              </div>
              <div className={styles.panel}>
                <p className={styles.label}>Email</p>
                <p className={`${styles.value} ${styles.mono}`}>{user.email || '-'}</p>
              </div>
            </div>

            <div className={styles.actions}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNotify} disabled={sending}>
                {sending ? 'กำลังส่ง...' : 'ส่ง Notification'}
              </button>
            </div>

            {notifyResult ? (
              <div className={styles.alert} style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>ส่งแจ้งเตือนสำเร็จ</div>
                <div className={styles.small}>
                  <div>
                    messageCode: <span className={styles.mono}>{notifyResult.messageCode ?? '-'}</span>
                  </div>
                  <div>
                    requestTimeStamp:{' '}
                    <span className={styles.mono}>{notifyResult.requestTimeStamp ?? '-'}</span>
                  </div>
                  <div>
                    result IDs: <span className={styles.mono}>{(notifyResult.result || []).join(', ')}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}
