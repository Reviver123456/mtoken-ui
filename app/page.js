import Link from 'next/link'

export default function Index() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div
        style={{
          maxWidth: 760,
          width: '100%',
          background: 'rgba(15,23,42,.65)',
          border: '1px solid rgba(148,163,184,.18)',
          borderRadius: 18,
          padding: 24,
          backdropFilter: 'blur(10px)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>eGOV Test6</h1>
        <p style={{ color: 'rgba(148,163,184,.95)', marginTop: 10, lineHeight: 1.6 }}>
          เริ่มทดสอบที่เส้นทาง <b>/test6</b> โดยส่ง Query Params: <b>appId</b> และ <b>mToken</b>
        </p>
        <div style={{ marginTop: 14 }}>
          <Link
            href="/test6"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,.22)',
              background: 'rgba(11,18,32,.75)',
            }}
          >
            ไปหน้า /test6
          </Link>
        </div>
      </div>
    </main>
  )
}
