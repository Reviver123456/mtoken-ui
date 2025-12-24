import { Suspense } from 'react'
import styles from './page.module.css'
import Test6Client from './Test6Client'


export default function Test6Page({ searchParams }) {
  const get = (...keys) => {
    for (const k of keys) {
      const v = searchParams?.[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
    }
    return ''
  }

  const appId = get('appId', 'appid', 'AppId', 'APPID')
  const mToken = get('mToken', 'mtoken', 'MToken', 'MTOKEN')

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
      <Test6Client appId={appId} mToken={mToken} />
    </Suspense>
  )
}
