'use client'

import { useState, useMemo } from 'react'
import { DopeSheetQuizAnswers, Trail } from '@/lib/types'

interface DopeSheetQuizProps {
  trail: Trail
  onSubmit: (answers: DopeSheetQuizAnswers) => void
  onClose: () => void
}

type StepId = 'trip_type' | 'group_size' | 'duration' | 'season' | 'experience' | 'pack_weight'

export default function DopeSheetQuiz({ trail, onSubmit, onClose }: DopeSheetQuizProps) {
  // Whitewater trails default to expedition (safer); flatwater/generic default to day
  const defaultType: DopeSheetQuizAnswers['trip_type'] =
    trail.activity === 'kayak_whitewater' ? 'kayak_expedition'
    : trail.activity === 'kayak_flatwater' ? 'kayak_day'
    : trail.activity === 'backpack' ? 'backpack'
    : 'hike'

  const defaultIsDayTrip = defaultType === 'hike' || defaultType === 'kayak_day'
  const defaultDays = defaultIsDayTrip ? 1 : Math.max(2, Math.min(30, Math.ceil(trail.estimated_hours / 8)))
  const defaultHours = defaultIsDayTrip ? Math.max(1, Math.min(16, Math.ceil(trail.estimated_hours))) : undefined

  // Pre-populate season from the search query if available (post-clamp version)
  let storedSeason: DopeSheetQuizAnswers['season'] = 'summer'
  if (typeof window !== 'undefined') {
    try {
      const sq = JSON.parse(sessionStorage.getItem('trailmind_search_query') || '{}')
      if (sq.season && ['spring', 'summer', 'fall', 'winter'].includes(sq.season)) {
        storedSeason = sq.season
      }
    } catch {}
  }

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<DopeSheetQuizAnswers>({
    trip_type: defaultType,
    group_size: 'solo',
    duration_days: defaultDays,
    duration_hours: defaultHours,
    season: storedSeason,
    experience: 'some_experience',
  })
  const [durationInput, setDurationInput] = useState(String(defaultIsDayTrip ? (defaultHours ?? 4) : defaultDays))
  const [durationError, setDurationError] = useState('')

  const isDayTrip = answers.trip_type === 'hike' || answers.trip_type === 'kayak_day'
  const isOvernight = answers.trip_type === 'backpack' || answers.trip_type === 'kayak_expedition'

  // Dynamic steps array — pack weight only for overnight trips
  const steps = useMemo<{ id: StepId; label: string }[]>(() => {
    const base: { id: StepId; label: string }[] = [
      { id: 'trip_type', label: 'Trip type' },
      { id: 'group_size', label: 'Group size' },
      { id: 'duration', label: 'Duration' },
      { id: 'season', label: 'Season' },
      { id: 'experience', label: 'Experience' },
    ]
    if (isOvernight) {
      base.push({ id: 'pack_weight', label: 'Pack weight' })
    }
    return base
  }, [isOvernight])

  const currentStepId = steps[step]?.id
  const isLastStep = step === steps.length - 1

  const handleSelect = (field: keyof DopeSheetQuizAnswers, value: string) => {
    const updated = { ...answers, [field]: value } as DopeSheetQuizAnswers
    // Reset duration when switching between day/overnight trip types
    if (field === 'trip_type') {
      const newIsDayTrip = value === 'hike' || value === 'kayak_day'
      if (newIsDayTrip) {
        updated.duration_days = 1
        updated.duration_hours = Math.max(1, Math.min(16, Math.ceil(trail.estimated_hours)))
        setDurationInput(String(updated.duration_hours))
      } else {
        updated.duration_days = Math.max(2, Math.min(30, Math.ceil(trail.estimated_hours / 8)))
        updated.duration_hours = undefined
        setDurationInput(String(updated.duration_days))
      }
      setDurationError('')
    }
    setAnswers(updated)
    if (!isLastStep) setStep(step + 1)
  }

  const handleNext = () => {
    if (!isLastStep) setStep(step + 1)
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

        {/* Progress bar — derived from dynamic steps */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= step ? '#0D3323' : 'rgba(13,51,35,0.15)' }}
            />
          ))}
        </div>

        {/* Step label */}
        <p className="label-caps mb-4">
          {step + 1} / {steps.length} — {steps[step]?.label}
        </p>

        {/* Step: Trip type */}
        {currentStepId === 'trip_type' && (
          <>
            <QuizQuestion
              label="What type of trip?"
              options={[
                { value: 'hike', label: 'Hike', sub: 'Day hike' },
                { value: 'backpack', label: 'Backpack', sub: 'Overnight+' },
                { value: 'kayak_day', label: 'Kayak', sub: 'Day paddle' },
                { value: 'kayak_expedition', label: 'Kayak expedition', sub: 'Overnight+' },
              ]}
              onSelect={(v) => handleSelect('trip_type', v)}
            />
            {trail.activity === 'kayak_whitewater' && trail.estimated_hours <= 8 && (
              <div
                className="mt-3 px-4 py-3 rounded-xl text-xs"
                style={{ background: 'rgba(252,169,68,0.2)', color: '#0D3323', border: '1px solid #FCA944' }}
              >
                This trail is typically done as a day run (~{trail.estimated_hours}h). Select &quot;Kayak&quot; above if planning a single-day trip.
              </div>
            )}
          </>
        )}

        {/* Step: Group size */}
        {currentStepId === 'group_size' && (
          <GroupSizeStep onSelect={(v) => handleSelect('group_size', v)} />
        )}

        {/* Step: Duration — hours for day trips */}
        {currentStepId === 'duration' && isDayTrip && (
          <div>
            <p className="text-base font-medium mb-4" style={{ color: '#0D3323', fontFamily: 'Comfortaa, sans-serif' }}>
              How many hours?
            </p>
            <div className="flex items-center gap-4 mb-3">
              <input
                type="number"
                min={1}
                max={16}
                value={durationInput}
                onChange={(e) => {
                  const raw = e.target.value
                  setDurationInput(raw)
                  const num = parseInt(raw, 10)
                  if (isNaN(num) || num < 1 || num > 16) {
                    setDurationError('Enter a number between 1 and 16')
                  } else {
                    setDurationError('')
                    setAnswers((prev) => ({ ...prev, duration_days: 1, duration_hours: num }))
                  }
                }}
                className="w-24 px-4 py-3 rounded-xl text-center text-lg outline-none"
                style={{ background: '#edf1e4', border: '1px solid #c0ceac', color: '#0D3323', fontFamily: 'Comfortaa, sans-serif', fontWeight: 700 }}
              />
              <span style={{ color: '#4a6858', fontFamily: 'Comfortaa, sans-serif', fontSize: '14px' }}>
                {(answers.duration_hours ?? 1) === 1 ? 'hour' : 'hours'}
              </span>
            </div>
            {durationError && <p className="text-xs mb-2" style={{ color: '#FCA944' }}>{durationError}</p>}
            <p className="text-xs mb-4" style={{ color: '#5a7860' }}>
              1–16 hours · out and back same day
            </p>
            <button
              onClick={() => {
                const num = parseInt(durationInput, 10)
                if (!isNaN(num) && num >= 1 && num <= 16) {
                  setAnswers((prev) => ({ ...prev, duration_days: 1, duration_hours: num }))
                  handleNext()
                }
              }}
              className="pill-btn btn-green px-6 py-2.5 text-sm"
              disabled={!!durationError || !durationInput}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step: Duration — days for overnight */}
        {currentStepId === 'duration' && !isDayTrip && (
          <div>
            <p className="text-base font-medium mb-4" style={{ color: '#0D3323', fontFamily: 'Comfortaa, sans-serif' }}>
              How many days?
            </p>
            <div className="flex items-center gap-4 mb-3">
              <input
                type="number"
                min={2}
                max={30}
                value={durationInput}
                onChange={(e) => {
                  const raw = e.target.value
                  setDurationInput(raw)
                  const num = parseInt(raw, 10)
                  if (isNaN(num) || num < 2 || num > 30) {
                    setDurationError('Enter a number between 2 and 30')
                  } else {
                    setDurationError('')
                    setAnswers((prev) => ({ ...prev, duration_days: num, duration_hours: undefined }))
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
              {answers.duration_days > 20 ? 'Over 20 days: DOPE sheet will show summary instead of daily breakdown' : '2–30 days'}
            </p>
            <button
              onClick={() => {
                const num = parseInt(durationInput, 10)
                if (!isNaN(num) && num >= 2 && num <= 30) {
                  setAnswers((prev) => ({ ...prev, duration_days: num, duration_hours: undefined }))
                  handleNext()
                }
              }}
              className="pill-btn btn-green px-6 py-2.5 text-sm"
              disabled={!!durationError || !durationInput}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step: Season */}
        {currentStepId === 'season' && (
          <QuizQuestion
            label="What season?"
            options={[
              { value: 'spring', label: 'Spring', sub: 'Mar – May' },
              { value: 'summer', label: 'Summer', sub: 'Jun – Aug' },
              { value: 'fall', label: 'Fall', sub: 'Sep – Nov' },
              { value: 'winter', label: 'Winter', sub: 'Dec – Feb' },
            ]}
            onSelect={(v) => handleSelect('season', v)}
          />
        )}

        {/* Step: Experience */}
        {currentStepId === 'experience' && (
          <QuizQuestion
            label="Experience level?"
            options={[
              { value: 'first_timer', label: 'First timer', sub: 'New to this activity' },
              { value: 'some_experience', label: 'Some experience', sub: 'Done it a few times' },
              { value: 'comfortable', label: 'Comfortable', sub: 'Regular outdoorsperson' },
              { value: 'very_experienced', label: 'Very experienced', sub: 'Know what you\'re doing' },
            ]}
            onSelect={(v) => handleSelect('experience', v)}
          />
        )}

        {/* Step: Pack weight (overnight only) */}
        {currentStepId === 'pack_weight' && (
          <>
            <QuizQuestion
              label="Approximate pack weight?"
              options={[
                { value: 'ultralight', label: 'Ultralight', sub: 'Sub-15 lbs base weight' },
                { value: 'standard', label: 'Standard', sub: '15–25 lbs base weight' },
                { value: 'heavy', label: 'Heavy', sub: '25+ lbs base weight' },
                { value: 'unknown', label: 'Not sure', sub: "I haven't weighed my gear" },
              ]}
              onSelect={(v) => handleSelect('pack_category', v)}
            />
            {answers.pack_category === 'unknown' && (
              <div
                className="mt-3 px-4 py-3 rounded-xl text-xs"
                style={{ background: 'rgba(252,169,68,0.2)', color: '#0D3323', border: '1px solid #FCA944' }}
              >
                We&apos;ll plan around a standard pack (18–22 lbs base). If your gear weighs significantly more or less, your pacing and food estimates may be off. Weigh your pack before your trip.
              </div>
            )}
          </>
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

          {isLastStep && (
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

function GroupSizeStep({ onSelect }: { onSelect: (v: string) => void }) {
  const [showInput, setShowInput] = useState(false)
  const [groupCount, setGroupCount] = useState('6')
  const [error, setError] = useState('')

  const smallOptions = [
    { value: 'solo', label: 'Solo', sub: 'Just you' },
    { value: '2', label: '2', sub: 'A pair' },
    { value: '3-4', label: '3–4', sub: 'Small group' },
  ]

  return (
    <div>
      <p
        className="text-base font-medium mb-4"
        style={{ color: '#0D3323', fontFamily: 'Comfortaa, sans-serif' }}
      >
        How many people?
      </p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {smallOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="p-3 rounded-xl text-left transition-all"
            style={{ background: '#ffffff', border: '1.5px solid #c0ceac', color: '#0D3323' }}
          >
            <div className="font-medium text-sm" style={{ fontFamily: 'Comfortaa, sans-serif', color: '#0D3323' }}>
              {opt.label}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#5a7860' }}>{opt.sub}</div>
          </button>
        ))}
        <button
          onClick={() => setShowInput(true)}
          className="p-3 rounded-xl text-left transition-all"
          style={{
            background: showInput ? '#edf1e4' : '#ffffff',
            border: `1.5px solid ${showInput ? '#0D3323' : '#c0ceac'}`,
            color: '#0D3323',
          }}
        >
          <div className="font-medium text-sm" style={{ fontFamily: 'Comfortaa, sans-serif', color: '#0D3323' }}>5+</div>
          <div className="text-xs mt-0.5" style={{ color: '#5a7860' }}>Large group</div>
        </button>
      </div>

      {showInput && (
        <div className="mt-3">
          <div className="flex items-center gap-4 mb-2">
            <input
              type="number"
              min={5}
              max={12}
              value={groupCount}
              onChange={(e) => {
                const raw = e.target.value
                setGroupCount(raw)
                const num = parseInt(raw, 10)
                if (isNaN(num) || num < 5 || num > 12) {
                  setError('Enter a number between 5 and 12')
                } else {
                  setError('')
                }
              }}
              className="w-24 px-4 py-3 rounded-xl text-center text-lg outline-none"
              style={{ background: '#edf1e4', border: '1px solid #c0ceac', color: '#0D3323', fontFamily: 'Comfortaa, sans-serif', fontWeight: 700 }}
            />
            <span style={{ color: '#4a6858', fontFamily: 'Comfortaa, sans-serif', fontSize: '14px' }}>people</span>
          </div>
          {error && <p className="text-xs mb-2" style={{ color: '#FCA944' }}>{error}</p>}
          <p className="text-xs mb-3" style={{ color: '#5a7860' }}>
            5–12 people · groups over 8 may need to split for permits
          </p>
          <button
            onClick={() => {
              const num = parseInt(groupCount, 10)
              if (!isNaN(num) && num >= 5 && num <= 12) {
                onSelect(String(num))
              }
            }}
            className="pill-btn btn-green px-6 py-2.5 text-sm"
            disabled={!!error || !groupCount}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

function QuizQuestion({
  label,
  options,
  onSelect,
}: {
  label: string
  options: { value: string; label: string; sub: string }[]
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
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="p-3 rounded-xl text-left transition-all"
            style={{
              background: '#ffffff',
              border: '1.5px solid #c0ceac',
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
        ))}
      </div>
    </div>
  )
}
