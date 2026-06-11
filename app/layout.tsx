import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Linen Tracker',
  description: 'LCA Cleaning Services linen management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#08080c' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
