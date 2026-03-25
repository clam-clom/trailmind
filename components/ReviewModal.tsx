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
    background: 'rgba(255,255,255,0.45)',
    border: '1.5px solid rgba(255,255,255,0.72)',
    color: '#182408',
    fontFamily: 'Comfortaa, sans-serif',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(24,36,8,0.4)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="frost-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3
              className="text-lg"
              style={{ fontFamily: 'Comfortaa, sans-serif', fontWeight: 700, color: '#182408' }}
            >
              How was it?
            </h3>
            <p
              className="text-sm"
              style={{ color: '#547a20', fontFamily: 'Comfortaa, sans-serif', fontWeight: 300 }}
            >
              {trailName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none w-8 h-8 flex items-center justify-center rounded-full"
            style={{ color: '#547a20', background: 'rgba(255,255,255,0.4)' }}
          >
            ×
          </button>
        </div>

        {/* Difficulty */}
        <div className="mb-5">
          <label
            className="block mb-2 uppercase"
            style={{ fontSize: '9px', letterSpacing: '1px', color: '#547a20', fontFamily: 'Comfortaa, sans-serif' }}
          >
            How hard was it really?
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: '#285010' }}
            />
            <span
              className="text-sm w-24 text-right"
              style={{ color: '#4a6a18', fontFamily: 'Comfortaa, sans-serif', fontWeight: 600 }}
            >
              {DIFFICULTY_LABELS[difficulty]}
            </span>
          </div>
        </div>

        {/* Stars */}
        <div className="mb-5">
          <label
            className="block mb-2 uppercase"
            style={{ fontSize: '9px', letterSpacing: '1px', color: '#547a20', fontFamily: 'Comfortaa, sans-serif' }}
          >
            Overall rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(rating === star ? null : star)}
                className="text-2xl transition-all"
                style={{ color: rating && star <= rating ? '#a06800' : 'rgba(80,120,20,0.25)' }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* What did you love */}
        <div className="mb-4">
          <label
            className="block mb-2 uppercase"
            style={{ fontSize: '9px', letterSpacing: '1px', color: '#547a20', fontFamily: 'Comfortaa, sans-serif' }}
          >
            What did you love?
          </label>
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
          <label
            className="block mb-2 uppercase"
            style={{ fontSize: '9px', letterSpacing: '1px', color: '#547a20', fontFamily: 'Comfortaa, sans-serif' }}
          >
            Anything disappoint?
          </label>
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
          <label
            className="block mb-2 uppercase"
            style={{ fontSize: '9px', letterSpacing: '1px', color: '#547a20', fontFamily: 'Comfortaa, sans-serif' }}
          >
            Would you do it again?
          </label>
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                onClick={() => setWouldRepeat(wouldRepeat === val ? null : val)}
                className="pill-btn px-6 py-2 text-sm transition-all"
                style={{
                  background: wouldRepeat === val ? '#285010' : 'rgba(255,255,255,0.45)',
                  color: wouldRepeat === val ? '#fff' : '#182408',
                  border: '1.5px solid',
                  borderColor: wouldRepeat === val ? '#285010' : 'rgba(255,255,255,0.72)',
                  fontFamily: 'Comfortaa, sans-serif',
                }}
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
          Save review ✓
        </button>
      </div>
    </div>
  )
}
