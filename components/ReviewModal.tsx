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

  const inputStyle: React.CSSProperties = {
    background: '#edf1e4',
    border: '1px solid #c0ceac',
    color: '#0D3323',
    fontFamily: 'Comfortaa, sans-serif',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,51,35,0.4)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="tm-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3
              className="text-lg"
              style={{ fontFamily: 'var(--font-playfair), Playfair Display, serif', fontWeight: 700, color: '#0D3323' }}
            >
              How was it?
            </h3>
            <p
              className="text-sm"
              style={{ color: '#4a6858', fontFamily: 'Comfortaa, sans-serif', fontWeight: 300 }}
            >
              {trailName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none w-8 h-8 flex items-center justify-center rounded-full"
            style={{ color: '#5a7860', background: '#edf1e4' }}
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
              style={{ accentColor: '#0D3323' }}
            />
            <span
              className="text-sm w-24 text-right"
              style={{ color: '#4a6858', fontFamily: 'Comfortaa, sans-serif', fontWeight: 600 }}
            >
              {DIFFICULTY_LABELS[difficulty]}
            </span>
          </div>
        </div>

        {/* Stars */}
        <div className="mb-5">
          <label className="label-caps block mb-2">Overall rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(rating === star ? null : star)}
                className="text-2xl transition-all"
                style={{ color: rating && star <= rating ? '#FFBA04' : 'rgba(13,51,35,0.2)' }}
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
            style={inputStyle}
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
            style={inputStyle}
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
                className={wouldRepeat === val ? 'chip-active pill-btn px-6 py-2 text-sm' : 'chip-inactive pill-btn px-6 py-2 text-sm'}
                style={{ cursor: 'pointer', transition: 'all 0.15s' }}
              >
                {val ? 'Yes, definitely' : 'Probably not'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onSubmit({ difficulty, loved, disliked, would_repeat: wouldRepeat, rating })}
          className="pill-btn btn-green w-full py-3 justify-center text-sm"
        >
          Save review
        </button>
      </div>
    </div>
  )
}
