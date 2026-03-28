import { NextRequest, NextResponse } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD || 'hivemind'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password === SITE_PASSWORD) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('trailmind_auth', 'granted', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // 90 days
    })
    return res
  }

  return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 })
}
