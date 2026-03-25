import type { Metadata } from 'next'
import { Comfortaa } from 'next/font/google'
import './globals.css'

const comfortaa = Comfortaa({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-comfortaa',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TrailMind — Find your next outdoor adventure',
  description: 'Personalized outdoor activity finder for the Northeast US. Hiking, backpacking, and kayaking.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={comfortaa.variable}>
      <body>{children}</body>
    </html>
  )
}
