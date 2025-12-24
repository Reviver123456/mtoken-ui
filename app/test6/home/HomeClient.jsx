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

async function apiFetch(url, options) {
  const res = await fetch(url, {
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

export default function HomeClient({ citizenId, appId }) {
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
        }
      } catch {
        return { citizenId: '', appId: '' }
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
      const cid = (citizenId || fromUrl.citizenId || pickFromStorage('test6.citizenId')).toString().trim()
      const aid = (appId || fromUrl.appId || pickFromStorage('test6.appId')).toString().trim()

      setEffectiveCitizenId(cid)
      setEffectiveAppId(aid)

      setLoading(true)
      try {
        const url = aid
          ? `/api/test6/user?appId=${encodeURIComponent(aid)}`
          : cid
            ? `/api/test6/user?citizenId=${encodeURIComponent(cid)}`
            : '/api/test6/user/latest'

        const res = await apiFetch(url, { method: 'GET' })

        if (!alive) return
        if (!res?.data) {
          setError('ไม่พบข้อมูลผู้ใช้ในฐานข้อมูล')
          return
        }
        setUser(res.data)

        try {
          const savedCitizenId = (res.data?.citizenId || cid || '').toString().trim()
          const savedAppId = (aid || res.data?.lastAppId || res.data?.appId || '').toString().trim()
          if (savedCitizenId) {
            localStorage.setItem('test6.citizenId', savedCitizenId)
            sessionStorage.setItem('test6.citizenId', savedCitizenId)
            setEffectiveCitizenId(savedCitizenId)
          }
          if (savedAppId) {
            localStorage.setItem('test6.appId', savedAppId)
            sessionStorage.setItem('test6.appId', savedAppId)
            setEffectiveAppId(savedAppId)
          }
        } catch {

        }

        if (!aid && (res.data?.lastAppId || res.data?.appId)) {
          setInfo('หมายเหตุ: หน้านี้ไม่ได้รับ appId จาก URL แต่พบ appId ที่บันทึกไว้ในฐานข้อมูลและจะใช้ค่านั้นแทน')
        } else if (!aid && !cid) {
          setInfo('หมายเหตุ: ไม่ได้ระบุ appId/citizenId ใน URL จึงแสดง “ผู้ใช้ล่าสุด” จากฐานข้อมูล')
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
  }, [citizenId, appId])

  async function onNotify() {
    const cid = (effectiveCitizenId || user?.citizenId || '').toString().trim()
    if (!cid) return
    setSending(true)
    setError('')
    setNotifyResult(null)

    try {
      const res = await apiFetch('/api/test6/notify', {
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
