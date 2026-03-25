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

  const defaultDuration: DopeSheetQuizAnswers['duration'] =
    trail.estimated_hours <= 8 ? 'day'
    : trail.estimated_hours <= 20 ? '1_night'
    : trail.estimated_hours <= 56 ? '2-3_nights'
    : '4+_nights'

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<DopeSheetQuizAnswers>({
    trip_type: defaultType,
    group_size: 'solo',
    duration: defaultDuration,
    season: 'summer',
    experience: 'some_experience',
  })

  const handleSelect = (field: keyof DopeSheetQuizAnswers, value: string) => {
    const updated = { ...answers, [field]: value } as DopeSheetQuizAnswers
    setAnswers(updated)
    if (step < 4) setStep(step + 1)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(26,26,24,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="frost-card w-full max-w-md p-6 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-base transition-colors"
          style={{ color: 'var(--text3)', background: 'var(--cream2)' }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-5">
          <p className="label-caps mb-1" style={{ color: 'var(--teal)' }}>
            📋 DOPE Sheet — {trail.name}
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-nunito), sans-serif',
              fontWeight: 400,
              fontSize: '22px',
              color: 'var(--text)',
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
              style={{ background: i <= step ? 'var(--green)' : 'var(--stone)' }}
            />
          ))}
        </div>

        {/* Step label */}
        <p className="label-caps mb-4" style={{ color: 'var(--text3)' }}>
          {step + 1} / {STEPS.length} — {STEPS[step]}
        </p>

        {/* Questions */}
        {step === 0 && (
          <QuizQuestion
            label="What type of trip?"
            options={[
              { value: 'hike', label: '🥾 Hike', sub: 'Day hike' },
              { value: 'backpack', label: '⛺ Backpack', sub: 'Overnight+' },
              { value: 'kayak_day', label: '🛶 Kayak', sub: 'Day paddle' },
              { value: 'kayak_expedition', label: '🏕️ Kayak expedition', sub: 'Overnight+' },
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
          <QuizQuestion
            label="How long?"
            options={[
              { value: 'day', label: 'Day trip', sub: 'Back home same day' },
              { value: '1_night', label: '1 night', sub: '2 days out' },
              { value: '2-3_nights', label: '2–3 nights', sub: '3–4 days out' },
              { value: '4+_nights', label: '4+ nights', sub: 'Extended trip' },
            ]}
            selected={answers.duration}
            onSelect={(v) => handleSelect('duration', v)}
          />
        )}

        {step === 3 && (
          <QuizQuestion
            label="What season?"
            options={[
              { value: 'spring', label: '🌱 Spring', sub: 'Mar – May' },
              { value: 'summer', label: '☀️ Summer', sub: 'Jun – Aug' },
              { value: 'fall', label: '🍂 Fall', sub: 'Sep – Nov' },
              { value: 'winter', label: '❄️ Winter', sub: 'Dec – Feb' },
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
              style={{ color: 'var(--text3)', fontFamily: 'var(--font-outfit), sans-serif' }}
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
        style={{ color: 'var(--text)', fontFamily: 'var(--font-outfit), sans-serif' }}
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
                background: isSelected ? 'rgba(99,136,114,0.1)' : 'rgba(255,255,255,0.5)',
                border: isSelected ? '1.5px solid var(--green)' : '1.5px solid var(--stone)',
                color: 'var(--text)',
              }}
            >
              <div
                className="font-medium text-sm"
                style={{ fontFamily: 'var(--font-outfit), sans-serif', color: isSelected ? 'var(--green-dark)' : 'var(--text)' }}
              >
                {opt.label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                {opt.sub}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
