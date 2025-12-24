import { Suspense } from 'react'
import styles from './page.module.css'
import HomeClient from './HomeClient'

// This page depends on runtime URL query parameters.
// Force dynamic rendering so Next won't attempt to prerender/capture stale params.
export const dynamic = 'force-dynamic'

// Next.js will prerender this route during `next build`.
// We avoid calling `useSearchParams()` directly in the page component.
// Instead we read `searchParams` on the server and pass them down to a client component.

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
