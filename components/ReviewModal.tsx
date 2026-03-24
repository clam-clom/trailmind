'use client'

import { useState } from 'react'

interface ReviewModalProps {
  trailId: string
  trailName: string
  onSubmit: (review: ReviewData) => void
  onClose: () => void
}

export interface ReviewData {
  difficulty: number
  loved: string
  disliked: string
  would_repeat: boolean | null
  rating: number | null
}

export default function ReviewModal({ trailName, onSubmit, onClose }: ReviewModalProps) {
  const [difficulty, setDifficulty] = useState(3)
  const [loved, setLoved] = useState('')
  const [disliked, setDisliked] = useState('')
  const [wouldRepeat, setWouldRepeat] = useState<boolean | null>(null)
  const [rating, setRating] = useState<number | null>(null)

  const DIFFICULTY_LABELS = ['', 'Very easy', 'Easy', 'Moderate', 'Hard', 'Brutal']

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,26,24,0.35)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="frost-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-nunito), sans-serif', color: 'var(--text)' }}
            >
              How was it?
            </h3>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>{trailName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none w-8 h-8 flex items-center justify-center rounded-full"
            style={{ color: 'var(--text3)', background: 'var(--cream2)' }}
          >
            ×
          </button>
        </div>

        {/* Difficulty */}
        <div className="mb-5">
          <label className="label-caps block mb-2">How hard was it really?</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: 'var(--green)' }}
            />
            <span
              className="text-sm font-medium w-24 text-right"
              style={{ color: 'var(--text2)' }}
            >
              {DIFFICULTY_LABELS[difficulty]}
            </span>
          </div>
        </div>

        {/* Star rating */}
        <div className="mb-5">
          <label className="label-caps block mb-2">Overall rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(rating === star ? null : star)}
                className="text-2xl transition-all"
                style={{ color: rating && star <= rating ? 'var(--amber)' : 'var(--stone)' }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* What did you love */}
        <div className="mb-4">
          <label className="label-caps block mb-2">What did you love?</label>
          <textarea
            value={loved}
            onChange={(e) => setLoved(e.target.value)}
            placeholder="Views, solitude, the climb..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
            style={{
              background: 'var(--cream2)',
              border: '1.5px solid var(--stone)',
              color: 'var(--text)',
              fontFamily: 'var(--font-outfit), sans-serif',
            }}
          />
        </div>

        {/* What disappointed */}
        <div className="mb-5">
          <label className="label-caps block mb-2">Anything disappoint?</label>
          <textarea
            value={disliked}
            onChange={(e) => setDisliked(e.target.value)}
            placeholder="Crowded parking, trail condition..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
            style={{
              background: 'var(--cream2)',
              border: '1.5px solid var(--stone)',
              color: 'var(--text)',
              fontFamily: 'var(--font-outfit), sans-serif',
            }}
          />
        </div>

        {/* Would repeat */}
        <div className="mb-6">
          <label className="label-caps block mb-2">Would you do it again?</label>
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                onClick={() => setWouldRepeat(wouldRepeat === val ? null : val)}
                className="pill-btn px-6 py-2 text-sm transition-all"
                style={{
                  background: wouldRepeat === val ? 'var(--green)' : 'var(--cream2)',
                  color: wouldRepeat === val ? '#fff' : 'var(--text2)',
                  border: '1.5px solid',
                  borderColor: wouldRepeat === val ? 'var(--green)' : 'var(--stone)',
                }}
              >
                {val ? 'Yes, definitely' : 'Probably not'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() =>
            onSubmit({ difficulty, loved, disliked, would_repeat: wouldRepeat, rating })
          }
          className="pill-btn btn-green w-full py-3 justify-center text-sm font-medium"
        >
          Save review ✓
        </button>
      </div>
    </div>
  )
}
