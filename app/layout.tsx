import type { Metadata } from 'next'
import { Outfit, Nunito } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-outfit',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-nunito',
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
    <html lang="en" className={`${outfit.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  )
}
