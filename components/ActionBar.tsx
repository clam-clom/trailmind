'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CritiquePanel from './CritiquePanel'
import ReviewModal, { ReviewData } from './ReviewModal'
import { Trail } from '@/lib/types'

interface ActionBarProps {
  trail: Trail
  onDopeSheetClick: () => void
}

type ActivePanel = 'critique' | 'review' | null

const BTN_BASE: React.CSSProperties = {
  background: '#edf1e4',
  border: '1px solid #c0ceac',
  color: '#0D3323',
}

export default function ActionBar({ trail, onDopeSheetClick }: ActionBarProps) {
  const router = useRouter()
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [actionDone, setActionDone] = useState<string | null>(null)

  const handleSave = () => {
    const confirmed = window.confirm(
      'Create a free account to save trails and track your adventures.'
    )
    if (confirmed) {
      setActionDone('saved')
    }
  }

  const handleCritiqueSubmit = async (chips: string[], text: string) => {
    setActivePanel(null)
    const critiqueText = [...chips, text].filter(Boolean).join(', ')

    try {
      await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trail_id: trail.id,
          trail_name: trail.name,
          activity_type: trail.activity,
          status: 'critiqued',
          critique_text: critiqueText,
        }),
      })
    } catch {}

    const originalQuery = sessionStorage.getItem('trailmind_query') || trail.activity
    const newQuery = `${originalQuery} — but ${critiqueText.toLowerCase()}`
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: newQuery }),
    })
    if (res.ok) {
      const data = await res.json()
      sessionStorage.setItem('trailmind_results', JSON.stringify(data))
      sessionStorage.setItem('trailmind_query', newQuery)
      router.push(`/results?q=${encodeURIComponent(newQuery)}`)
    }
  }

  const handleReviewSubmit = async (review: ReviewData) => {
    setActivePanel(null)
    setActionDone('completed')

    try {
      await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trail_id: trail.id,
          trail_name: trail.name,
          activity_type: trail.activity,
          status: 'completed',
          review_difficulty: review.difficulty,
          review_loved: review.loved,
          review_disliked: review.disliked,
          would_repeat: review.would_repeat,
          rating: review.rating,
        }),
      })
    } catch {}
  }

  const handlePass = async () => {
    setActionDone('passed')
    try {
      await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trail_id: trail.id,
          trail_name: trail.name,
          activity_type: trail.activity,
          status: 'passed',
        }),
      })
    } catch {}
    router.back()
  }

  if (actionDone === 'saved' || actionDone === 'completed') {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center py-4 px-4 no-print"
        style={{
          background: 'rgba(232,237,218,0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTop: '1px solid #c0ceac',
        }}
      >
        <div
          className="px-6 py-3 rounded-full text-sm font-semibold"
          style={{
            background: '#0D3323',
            color: '#FFBA04',
            fontFamily: 'Comfortaa, sans-serif',
          }}
        >
          {actionDone === 'saved' ? '♡ Saved to wishlist' : '✓ Logged — nice work'}
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40 no-print"
        style={{
          background: 'rgba(232,237,218,0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTop: '1px solid #c0ceac',
        }}
      >
        {/* DOPE Sheet row */}
        <div className="flex justify-center px-4 pt-3 pb-1">
          <button
            onClick={onDopeSheetClick}
            className="pill-btn w-full max-w-sm py-2.5 text-sm justify-center"
            style={{
              background: '#edf1e4',
              border: '1px solid #c0ceac',
              color: '#0D3323',
              fontFamily: 'Comfortaa, sans-serif',
            }}
          >
            Generate DOPE Sheet
          </button>
        </div>

        {/* Action row */}
        <div className="flex justify-center gap-2 px-4 pb-4 pt-2">
          <button
            onClick={handleSave}
            className="pill-btn px-4 py-2.5 text-sm flex-1 max-w-[100px] justify-center"
            style={BTN_BASE}
          >
            Save
          </button>

          <button
            onClick={() => setActivePanel('critique')}
            className="pill-btn px-4 py-2.5 text-sm flex-1 max-w-[110px] justify-center"
            style={BTN_BASE}
          >
            Not quite
          </button>

          <button
            onClick={() => setActivePanel('review')}
            className="pill-btn px-4 py-2.5 text-sm flex-1 max-w-[110px] justify-center"
            style={BTN_BASE}
          >
            I did this
          </button>

          <button
            onClick={handlePass}
            className="pill-btn px-4 py-2.5 text-sm flex-1 max-w-[70px] justify-center"
            style={{ ...BTN_BASE, color: '#5a7860' }}
          >
            Pass
          </button>
        </div>
      </div>

      {activePanel === 'critique' && (
        <CritiquePanel
          trailId={trail.id}
          trailName={trail.name}
          onSubmit={handleCritiqueSubmit}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === 'review' && (
        <ReviewModal
          trailId={trail.id}
          trailName={trail.name}
          onSubmit={handleReviewSubmit}
          onClose={() => setActivePanel(null)}
        />
      )}
    </>
  )
}
