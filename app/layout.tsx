import type { Metadata } from 'next'
import { Comfortaa, Playfair_Display } from 'next/font/google'
import './globals.css'

const comfortaa = Comfortaa({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-comfortaa',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
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
    <html lang="en" className={`${comfortaa.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  )
}
