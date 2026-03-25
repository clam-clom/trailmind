'use client'

import { useState } from 'react'

const CRITIQUE_CHIPS = [
  'Too long',
  'Too short',
  'Too hard',
  'Too easy',
  'Too far',
  'Too crowded',
  'Not enough views',
  'Wrong activity',
]

interface CritiquePanelProps {
  trailId: string
  trailName: string
  onSubmit: (chips: string[], text: string) => void
  onClose: () => void
}

export default function CritiquePanel({ trailName, onSubmit, onClose }: CritiquePanelProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [text, setText] = useState('')

  const toggle = (chip: string) => {
    setSelected((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(24,36,8,0.35)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="frost-card w-full max-w-lg p-6 mb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3
            className="text-base"
            style={{ fontFamily: 'Comfortaa, sans-serif', fontWeight: 700, color: '#182408' }}
          >
            What wasn&apos;t right?
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-base"
            style={{ color: '#547a20', background: 'rgba(255,255,255,0.4)' }}
          >
            ×
          </button>
        </div>
        <p
          className="text-sm mb-4"
          style={{ color: '#547a20', fontFamily: 'Comfortaa, sans-serif', fontWeight: 300 }}
        >
          {trailName}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {CRITIQUE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => toggle(chip)}
              className="px-3 py-1.5 rounded-full text-sm transition-all"
              style={{
                background: selected.includes(chip) ? '#285010' : 'rgba(255,255,255,0.45)',
                color: selected.includes(chip) ? '#fff' : '#182408',
                border: '1.5px solid',
                borderColor: selected.includes(chip) ? '#285010' : 'rgba(255,255,255,0.72)',
                fontFamily: 'Comfortaa, sans-serif',
                fontWeight: 600,
                fontSize: '11px',
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Anything else? (optional)"
          rows={2}
          className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none mb-4"
          style={{
            background: 'rgba(255,255,255,0.45)',
            border: '1.5px solid rgba(255,255,255,0.72)',
            color: '#182408',
            fontFamily: 'Comfortaa, sans-serif',
          }}
        />

        <button
          onClick={() => onSubmit(selected, text)}
          disabled={selected.length === 0 && !text.trim()}
          className="pill-btn btn-green w-full py-3 justify-center text-sm disabled:opacity-40"
        >
          Show me better options →
        </button>
      </div>
    </div>
  )
}
