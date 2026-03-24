import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      trail_id,
      trail_name,
      activity_type,
      status,
      critique_text,
      review_difficulty,
      review_loved,
      review_disliked,
      would_repeat,
      rating,
    } = body

    // Get current user (optional — anonymous interactions are dropped silently)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Anonymous — just acknowledge, don't persist
      return NextResponse.json({ ok: true, saved: false })
    }

    const { error } = await supabase.from('trip_interactions').upsert({
      user_id: user.id,
      trail_id,
      trail_name,
      activity_type,
      status,
      critique_text,
      review_difficulty,
      review_loved,
      review_disliked,
      would_repeat,
      rating,
      updated_at: new Date().toISOString(),
    })

    if (error) throw error

    return NextResponse.json({ ok: true, saved: true })
  } catch (err) {
    console.error('Interact error:', err)
    return NextResponse.json({ error: 'Failed to save interaction' }, { status: 500 })
  }
}
