import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro, EB_Garamond } from 'next/font/google'
import { salon } from '@/config/salon'
import './globals.css'

// Both families ship the Vietnamese subset, which covers Ọ (U+1ECC) and à.
const garamond = EB_Garamond({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-garamond',
  display: 'swap',
})
const vietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500'],
  variable: '--font-vietnam',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: `${salon.name} · ${salon.address.line}`, template: `%s · ${salon.name}` },
  description: `${salon.tagline} ${salon.address.line}. Hold your chair with a deposit.`,
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
}

export const viewport: Viewport = { themeColor: '#f4efe6', width: 'device-width', initialScale: 1 }

// Everything reads live availability; nothing is prerendered at build time.
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${vietnam.variable}`}>
      <body>{children}</body>
    </html>
  )
}
