'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
    cache: 'no-store',
  })
  const text = await res.text()
  const json = safeJson(text)
  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`
    const err = new Error(msg)
    err.details = json || { raw: text, status: res.status }
    throw err
  }
  if (!json?.ok) {
    const err = new Error(json?.error || 'Request failed')
    err.details = json
    throw err
  }
  return json
}

export default function RegisterClient({ appId, mToken }) {
  const router = useRouter()
  const ran = useRef(false)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [profile, setProfile] = useState(null)
  const [hint, setHint] = useState('')
  const [debug, setDebug] = useState('')
  const [effectiveAppId, setEffectiveAppId] = useState('')
  const [effectiveMToken, setEffectiveMToken] = useState('')

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    let alive = true

    async function run() {
      setError('')
      setNotice('')
      setHint('')
      setProfile(null)
      setDebug('')

      let appIdFromUrl = appId
      let mTokenFromUrl = mToken
      try {
        const sp = new URLSearchParams(window.location.search)
        const pick = (...keys) => {
          for (const k of keys) {
            const v = sp.get(k)
            if (v && String(v).trim() !== '') return String(v).trim()
          }
          return ''
        }
        appIdFromUrl = appIdFromUrl || pick('appId', 'appid', 'AppId', 'APPID')
        mTokenFromUrl = mTokenFromUrl || pick('mToken', 'mtoken', 'MToken', 'MTOKEN')
      } catch {
        // ignore
      }

      setEffectiveAppId(appIdFromUrl)
      setEffectiveMToken(mTokenFromUrl)

      if (!appIdFromUrl || !mTokenFromUrl) {
        setError('กรุณาระบุ appId และ mToken ใน URL เช่น /test6?appId=xxxxx&mToken=yyyyy')
        return
      }

      try {
        sessionStorage.setItem('egov.appId', appIdFromUrl)
        sessionStorage.setItem('egov.mToken', mTokenFromUrl)
      } catch {
        // ignore
      }

      setLoading(true)
      try {
        const boot = await apiFetch('/api/bootstrap', {
          method: 'POST',
          body: JSON.stringify({ appId: appIdFromUrl, mToken: mTokenFromUrl }),
        })

        if (!alive) return

        if (boot?.status === 'exists' && boot?.citizenId) {
          try {
            localStorage.setItem('egov.citizenId', boot.citizenId)
            localStorage.setItem('egov.appId', appIdFromUrl)
            sessionStorage.setItem('egov.citizenId', boot.citizenId)
            sessionStorage.setItem('egov.appId', appIdFromUrl)
          } catch {
            // ignore
          }
          router.replace(`/home?appId=${encodeURIComponent(appIdFromUrl)}`)
          return
        }

        if (boot?.status === 'new' && boot?.profile?.citizenId) {
          setProfile(boot.profile)
          setNotice('ไม่พบข้อมูลในฐานข้อมูล กรุณากด “บันทึกข้อมูล” เพื่อเข้าสู่หน้า Home')
          try {
            localStorage.setItem('egov.citizenId', boot.profile.citizenId)
            localStorage.setItem('egov.appId', appIdFromUrl)
            sessionStorage.setItem('egov.citizenId', boot.profile.citizenId)
            sessionStorage.setItem('egov.appId', appIdFromUrl)
          } catch {
            // ignore
          }
          return
        }

        throw new Error('Bootstrap response ไม่ถูกต้อง (ไม่พบ citizenId)')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'
        if (alive) {
          setError(msg)
          try {
            const details = e?.details
            if (details) setDebug(JSON.stringify(details, null, 2))
          } catch {
            // ignore
          }
          const lower = String(msg).toLowerCase()
          if (lower.includes('redis data not found') || lower.includes('mtoken')) {
            setHint('mToken ใช้ได้ครั้งเดียวและอายุประมาณ 2 นาที: ห้ามรีเฟรชหน้า และต้องใช้ลิงก์ที่ได้มาใหม่อีกครั้งหากหมดอายุ')
          } else if (lower.includes('auth validate failed')) {
            setHint('ตรวจสอบว่าเครื่อง/คอนเทนเนอร์ออกอินเทอร์เน็ตได้ และ API eGOV เข้าถึงได้ (ลองดู docker logs ของเว็บ)')
          } else if (lower.includes('deproc failed')) {
            setHint('เปิด DevTools → Network → ดู response ของ /api/bootstrap เพื่อดู messageCode/message จาก eGOV')
          }
        }
      } finally {
        if (alive) setLoading(false)
      }
    }

    run()
    return () => {
      alive = false
    }
  }, [appId, mToken, router])

  async function onSave() {
    if (!profile) return
    setSaving(true)
    setError('')
    try {
      await apiFetch('/api/user', {
        method: 'POST',
        body: JSON.stringify({
          ...profile,
          appId: effectiveAppId || appId,
        }),
      })

      try {
        const cid = (profile.citizenId || '').toString().trim()
        const aid = (effectiveAppId || appId || '').toString().trim()
        if (cid) {
          localStorage.setItem('egov.citizenId', cid)
          sessionStorage.setItem('egov.citizenId', cid)
        }
        if (aid) {
          localStorage.setItem('egov.appId', aid)
          sessionStorage.setItem('egov.appId', aid)
        }
      } catch {
        // ignore
      }

      router.replace(`/home?appId=${encodeURIComponent(effectiveAppId || appId)}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'บันทึกข้อมูลไม่สำเร็จ'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : ''

  return (
    <main className={styles.wrap}>
      <section className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>สมัครสมาชิก</h1>
          </div>
        </div>

        <div className={styles.hr} />

        {loading ? <div className={styles.alert}>กำลังเรียก Deproc และตรวจฐานข้อมูล...</div> : null}

        {hint ? <div className={styles.alert}>{hint}</div> : null}
        {error ? <div className={`${styles.alert} ${styles.error}`}>{error}</div> : null}

        {profile ? (
          <div className={styles.grid}>
            <div className={styles.panel}>
              <p className={styles.label}>เลขบัตรประชาชน</p>
              <p className={`${styles.value} ${styles.mono}`}>{profile.citizenId}</p>
            </div>
            <div className={styles.panel}>
              <p className={styles.label}>ชื่อ-นามสกุล</p>
              <p className={styles.value}>{fullName || '-'}</p>
            </div>
          </div>
        ) : null}

        {profile ? (
          <div className={styles.actions}>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={onSave}
              disabled={saving || loading}
            >
              {saving ? 'กำลังบันทึก...' : notice ? 'บันทึกข้อมูล' : 'บันทึก/อัปเดตข้อมูล'}
            </button>
          </div>
        ) : null}

        {debug ? (
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer' }}>Debug</summary>
            <pre className={styles.debug}>{debug}</pre>
          </details>
        ) : null}
      </section>
    </main>
  )
}
