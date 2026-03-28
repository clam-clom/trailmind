'use client'

import { useState } from 'react'
import { DopeSheetQuizAnswers, Trail } from '@/lib/types'

interface DopeSheetQuizProps {
  trail: Trail
  onSubmit: (answers: DopeSheetQuizAnswers) => void
  onClose: () => void
}

const STEPS = ['Trip type', 'Group size', 'Duration', 'Season', 'Experience']

export default function DopeSheetQuiz({ trail, onSubmit, onClose }: DopeSheetQuizProps) {
  const defaultType: DopeSheetQuizAnswers['trip_type'] =
    trail.activity === 'kayak' ? 'kayak_day'
    : trail.activity === 'backpack' ? 'backpack'
    : 'hike'

  const defaultDays = Math.max(1, Math.min(30, Math.ceil(trail.estimated_hours / 8)))

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<DopeSheetQuizAnswers>({
    trip_type: defaultType,
    group_size: 'solo',
    duration_days: defaultDays,
    season: 'summer',
    experience: 'some_experience',
  })
  const [durationInput, setDurationInput] = useState(String(defaultDays))
  const [durationError, setDurationError] = useState('')

  const handleSelect = (field: keyof DopeSheetQuizAnswers, value: string) => {
    const updated = { ...answers, [field]: value } as DopeSheetQuizAnswers
    setAnswers(updated)
    if (step < 4) setStep(step + 1)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(13,51,35,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="tm-card w-full max-w-md p-6 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-base transition-colors"
          style={{ color: '#5a7860', background: '#edf1e4' }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-5">
          <p className="label-caps mb-1">DOPE Sheet — {trail.name}</p>
          <h2
            style={{
              fontFamily: 'var(--font-playfair), Playfair Display, serif',
              fontWeight: 700,
              fontSize: '22px',
              color: '#0D3323',
            }}
          >
            A few quick questions
          </h2>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= step ? '#0D3323' : 'rgba(13,51,35,0.15)' }}
            />
          ))}
        </div>

        {/* Step label */}
        <p className="label-caps mb-4">
          {step + 1} / {STEPS.length} — {STEPS[step]}
        </p>

        {/* Questions */}
        {step === 0 && (
          <QuizQuestion
            label="What type of trip?"
            options={[
              { value: 'hike', label: 'Hike', sub: 'Day hike' },
              { value: 'backpack', label: 'Backpack', sub: 'Overnight+' },
              { value: 'kayak_day', label: 'Kayak', sub: 'Day paddle' },
              { value: 'kayak_expedition', label: 'Kayak expedition', sub: 'Overnight+' },
            ]}
            selected={answers.trip_type}
            onSelect={(v) => handleSelect('trip_type', v)}
          />
        )}

        {step === 1 && (
          <QuizQuestion
            label="How many people?"
            options={[
              { value: 'solo', label: 'Solo', sub: 'Just you' },
              { value: '2', label: '2', sub: 'A pair' },
              { value: '3-4', label: '3–4', sub: 'Small group' },
              { value: '5+', label: '5+', sub: 'Large group' },
            ]}
            selected={answers.group_size}
            onSelect={(v) => handleSelect('group_size', v)}
          />
        )}

        {step === 2 && (
          <div>
            <p className="text-base font-medium mb-4" style={{ color: '#0D3323', fontFamily: 'Comfortaa, sans-serif' }}>
              How many days?
            </p>
            <div className="flex items-center gap-4 mb-3">
              <input
                type="number"
                min={1}
                max={30}
                value={durationInput}
                onChange={(e) => {
                  const raw = e.target.value
                  setDurationInput(raw)
                  const num = parseInt(raw, 10)
                  if (isNaN(num) || num < 1 || num > 30) {
                    setDurationError('Enter a number between 1 and 30')
                  } else {
                    setDurationError('')
                    setAnswers((prev) => ({ ...prev, duration_days: num }))
                  }
                }}
                className="w-24 px-4 py-3 rounded-xl text-center text-lg outline-none"
                style={{ background: '#edf1e4', border: '1px solid #c0ceac', color: '#0D3323', fontFamily: 'Comfortaa, sans-serif', fontWeight: 700 }}
              />
              <span style={{ color: '#4a6858', fontFamily: 'Comfortaa, sans-serif', fontSize: '14px' }}>
                {answers.duration_days === 1 ? 'day' : 'days'}
              </span>
            </div>
            {durationError && <p className="text-xs mb-2" style={{ color: '#FCA944' }}>{durationError}</p>}
            <p className="text-xs mb-4" style={{ color: '#5a7860' }}>
              {answers.duration_days > 20 ? 'Over 20 days: DOPE sheet will show summary instead of daily breakdown' : '1 = day trip · 30 max'}
            </p>
            <button
              onClick={() => {
                const num = parseInt(durationInput, 10)
                if (!isNaN(num) && num >= 1 && num <= 30) {
                  setAnswers((prev) => ({ ...prev, duration_days: num }))
                  setStep(step + 1)
                }
              }}
              className="pill-btn btn-green px-6 py-2.5 text-sm"
              disabled={!!durationError || !durationInput}
            >
              Next →
            </button>
          </div>
        )}

        {step === 3 && (
          <QuizQuestion
            label="What season?"
            options={[
              { value: 'spring', label: 'Spring', sub: 'Mar – May' },
              { value: 'summer', label: 'Summer', sub: 'Jun – Aug' },
              { value: 'fall', label: 'Fall', sub: 'Sep – Nov' },
              { value: 'winter', label: 'Winter', sub: 'Dec – Feb' },
            ]}
            selected={answers.season}
            onSelect={(v) => handleSelect('season', v)}
          />
        )}

        {step === 4 && (
          <QuizQuestion
            label="Experience level?"
            options={[
              { value: 'first_timer', label: 'First timer', sub: 'New to this activity' },
              { value: 'some_experience', label: 'Some experience', sub: 'Done it a few times' },
              { value: 'comfortable', label: 'Comfortable', sub: 'Regular outdoorsperson' },
              { value: 'very_experienced', label: 'Very experienced', sub: 'Know what you\'re doing' },
            ]}
            selected={answers.experience}
            onSelect={(v) => handleSelect('experience', v)}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm"
              style={{ color: '#3A5A4C', fontFamily: 'Comfortaa, sans-serif' }}
            >
              ← Back
            </button>
          ) : (
            <span />
          )}

          {step === 4 && (
            <button
              onClick={() => onSubmit(answers)}
              className="pill-btn btn-green px-6 py-2.5 text-sm font-medium"
            >
              Build my DOPE Sheet →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function QuizQuestion({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: { value: string; label: string; sub: string }[]
  selected: string
  onSelect: (v: string) => void
}) {
  return (
    <div>
      <p
        className="text-base font-medium mb-4"
        style={{ color: '#0D3323', fontFamily: 'Comfortaa, sans-serif' }}
      >
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className="p-3 rounded-xl text-left transition-all"
              style={{
                background: isSelected ? '#edf1e4' : '#ffffff',
                border: isSelected ? '1.5px solid #3A5A4C' : '1.5px solid #c0ceac',
                color: '#0D3323',
              }}
            >
              <div
                className="font-medium text-sm"
                style={{ fontFamily: 'Comfortaa, sans-serif', color: '#0D3323' }}
              >
                {opt.label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#5a7860' }}>
                {opt.sub}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
