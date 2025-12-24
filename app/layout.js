import './globals.css'

export const metadata = {
  title: 'eGOV Test6',
  description: 'eGOV CZP Test6 (Next.js + MongoDB)'
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
