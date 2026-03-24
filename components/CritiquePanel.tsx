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
      style={{ background: 'rgba(26,26,24,0.3)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="frost-card w-full max-w-lg p-6 mb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3
            className="text-base font-semibold"
            style={{ fontFamily: 'var(--font-nunito), sans-serif', color: 'var(--text)' }}
          >
            What wasn&apos;t right?
          </h3>
          <button
            onClick={onClose}
            className="text-lg leading-none"
            style={{ color: 'var(--text3)' }}
          >
            ×
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text3)' }}>
          {trailName}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {CRITIQUE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => toggle(chip)}
              className="px-3 py-1.5 rounded-full text-sm transition-all"
              style={{
                background: selected.includes(chip) ? 'var(--green)' : 'var(--cream2)',
                color: selected.includes(chip) ? '#fff' : 'var(--text2)',
                border: '1.5px solid',
                borderColor: selected.includes(chip) ? 'var(--green)' : 'var(--stone)',
                fontFamily: 'var(--font-outfit), sans-serif',
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
            background: 'var(--cream2)',
            border: '1.5px solid var(--stone)',
            color: 'var(--text)',
            fontFamily: 'var(--font-outfit), sans-serif',
          }}
        />

        <button
          onClick={() => onSubmit(selected, text)}
          disabled={selected.length === 0 && !text.trim()}
          className="pill-btn btn-green w-full py-3 justify-center text-sm font-medium disabled:opacity-40"
        >
          Show me better options →
        </button>
      </div>
    </div>
  )
}
