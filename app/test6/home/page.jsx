import { Suspense } from 'react'
import styles from './page.module.css'
import HomeClient from './HomeClient'
export const dynamic = 'force-dynamic'

export default function HomePage({ searchParams }) {
  const get = (...keys) => {
    for (const k of keys) {
      const v = searchParams?.[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
    }
    return ''
  }

  const citizenId = get('citizenId', 'citizenid', 'CitizenId', 'CITIZENID')
  const appId = get('appId', 'appid', 'AppId', 'APPID')

  return (
    <Suspense
      fallback={
        <main className={styles.wrap}>
          <section className={styles.card}>
            <div className={styles.alert}>กำลังโหลด...</div>
          </section>
        </main>
      }
    >
      <HomeClient citizenId={citizenId} appId={appId} />
    </Suspense>
  )
}
