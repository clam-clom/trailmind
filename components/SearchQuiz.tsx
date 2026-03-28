'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SearchQuery } from '@/lib/types'

const STEPS = ['Activity', 'Duration', 'Difficulty', 'Distance', 'Features']

const ACTIVITY_OPTIONS = [
  { value: 'hike', label: 'Day Hike', sub: 'Out and back same day' },
  { value: 'backpack', label: 'Backpacking', sub: 'Overnight, multi-day' },
  { value: 'kayak', label: 'Kayaking', sub: 'Flatwater or whitewater' },
]

// Duration is now a free number input (1-30 days), not a dropdown

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', sub: 'Casual, anyone can do it' },
  { value: 'moderate', label: 'Moderate', sub: 'Some fitness required' },
  { value: 'hard', label: 'Hard', sub: 'Experienced and fit' },
  { value: 'strenuous', label: 'Strenuous', sub: 'I want to suffer' },
  { value: 'surprise', label: 'Surprise me', sub: 'Mix of difficulties' },
]

const DISTANCE_OPTIONS = [
  { value: 'under_1hr', label: 'Under 1 hour', sub: 'Close to the city' },
  { value: '1-2hrs', label: '1–2 hours', sub: 'Easy drive' },
  { value: '2-3hrs', label: '2–3 hours', sub: 'Worth the drive' },
  { value: '3plus', label: '3+ hours', sub: 'Road trip territory' },
  { value: 'any', label: "Don't care", sub: 'Distance no object' },
]

const FEATURE_CHIPS = [
  'Views / Summit',
  'Waterfalls',
  'Solitude',
  'Forest / Canopy',
  'Wildlife',
  'History / Ruins',
  'Lake / Water',
  'Ridge walking',
  'Wildflowers',
  'Dog-friendly',
  'Designated campsites',
  'Backcountry camping',
  'No rock scrambles',
  'Water sources available',
]

function buildQueryLabel(q: SearchQuery): string {
  const parts: string[] = []
  const act = { hike: 'Hike', backpack: 'Backpacking', kayak: 'Kayak' }[q.activity]
  parts.push(act)
  const dur = q.duration_days === 1 ? 'day trip' : `${q.duration_days} days`
  parts.push(dur)
  const diff = { easy: 'easy', moderate: 'moderate', hard: 'hard', strenuous: 'strenuous', surprise: 'any difficulty' }[q.difficulty]
  parts.push(diff)
  if (q.features.length > 0) parts.push(q.features.slice(0, 3).join(', '))
  return parts.join(' · ')
}

export default function SearchQuiz() {
  const [step, setStep] = useState(0)
  const [query, setQuery] = useState<SearchQuery>({
    activity: 'hike',
    duration_days: 1,
    difficulty: 'moderate',
    distance_from_nyc: 'any',
    features: [],
    notes: '',
  })
  const [durationInput, setDurationInput] = useState('1')
  const [durationError, setDurationError] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const router = useRouter()
  const abortRef = useRef<AbortController | null>(null)

  // Throttled status
  const pendingStatusRef = useRef<string | null>(null)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastShownAtRef = useRef<number>(0)

  const showStatus = (msg: string) => {
    const now = Date.now()
    const elapsed = now - lastShownAtRef.current
    if (elapsed >= 5000 || lastShownAtRef.current === 0) {
      setStatusMsg(msg)
      lastShownAtRef.current = now
      pendingStatusRef.current = null
      if (statusTimerRef.current) { clearTimeout(statusTimerRef.current); statusTimerRef.current = null }
    } else {
      pendingStatusRef.current = msg
      if (!statusTimerRef.current) {
        statusTimerRef.current = setTimeout(() => {
          statusTimerRef.current = null
          if (pendingStatusRef.current) {
            setStatusMsg(pendingStatusRef.current)
            lastShownAtRef.current = Date.now()
            pendingStatusRef.current = null
          }
        }, 5000 - elapsed)
      }
    }
  }

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  const handleSingleSelect = (field: keyof SearchQuery, value: string) => {
    setQuery((prev) => ({ ...prev, [field]: value } as SearchQuery))
    if (step < STEPS.length - 1) setStep(step + 1)
  }

  const toggleFeature = (feature: string) => {
    setQuery((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }))
  }

  const handleSubmit = async () => {
    if (loading) return
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setLoading(true)
    setStatusMsg('')
    lastShownAtRef.current = 0
    pendingStatusRef.current = null
    if (statusTimerRef.current) { clearTimeout(statusTimerRef.current); statusTimerRef.current = null }

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structured: query }),
        signal: abort.signal,
      })
      if (!res.ok) throw new Error('Search failed')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let lineBuffer = ''
      let dataBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        lineBuffer += chunk
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('s:')) {
            showStatus(line.slice(2))
          } else {
            dataBuffer += line + '\n'
          }
        }
      }
      if (lineBuffer && !lineBuffer.startsWith('s:')) dataBuffer += lineBuffer

      const data = JSON.parse(dataBuffer.trim())
      const label = buildQueryLabel(query)
      sessionStorage.setItem('trailmind_results', JSON.stringify(data))
      sessionStorage.setItem('trailmind_query', label)
      router.push(`/results?q=${encodeURIComponent(label)}`)
    } catch {
      setLoading(false)
      setStatusMsg('')
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-6">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className="h-1 flex-1 rounded-full transition-all duration-300 cursor-pointer"
            onClick={() => { if (i <= step) setStep(i) }}
            style={{ background: i <= step ? '#0D3323' : 'rgba(13,51,35,0.15)' }}
          />
        ))}
      </div>

      {/* Step label */}
      <p className="label-caps mb-4">
        {step + 1} / {STEPS.length} — {STEPS[step]}
      </p>

      {/* Step 1: Activity */}
      {step === 0 && (
        <OptionGrid
          label="What kind of trip?"
          options={ACTIVITY_OPTIONS}
          onSelect={(v) => handleSingleSelect('activity', v)}
        />
      )}

      {/* Step 2: Duration (number input) */}
      {step === 1 && (
        <div>
          <p
            className="text-base font-medium mb-4"
            style={{ color: '#0D3323', fontFamily: 'Comfortaa, sans-serif' }}
          >
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
                  setQuery((prev) => ({ ...prev, duration_days: num }))
                }
              }}
              className="w-24 px-4 py-3 rounded-xl text-center text-lg outline-none"
              style={{
                background: '#edf1e4',
                border: '1px solid #c0ceac',
                color: '#0D3323',
                fontFamily: 'Comfortaa, sans-serif',
                fontWeight: 700,
              }}
            />
            <span style={{ color: '#4a6858', fontFamily: 'Comfortaa, sans-serif', fontSize: '14px' }}>
              {query.duration_days === 1 ? 'day' : 'days'}
            </span>
          </div>
          {durationError && (
            <p className="text-xs mb-3" style={{ color: '#FCA944' }}>{durationError}</p>
          )}
          <p className="text-xs mb-4" style={{ color: '#5a7860' }}>
            1 = day trip · 30 max
          </p>
          <button
            onClick={() => {
              const num = parseInt(durationInput, 10)
              if (!isNaN(num) && num >= 1 && num <= 30) {
                setQuery((prev) => ({ ...prev, duration_days: num }))
                setStep(step + 1)
              } else {
                setDurationError('Enter a number between 1 and 30')
              }
            }}
            className="pill-btn btn-green px-6 py-2.5 text-sm"
            disabled={!!durationError || !durationInput}
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 3: Difficulty */}
      {step === 2 && (
        <OptionGrid
          label="How hard?"
          options={DIFFICULTY_OPTIONS}
          onSelect={(v) => handleSingleSelect('difficulty', v)}
        />
      )}

      {/* Step 4: Distance from NYC */}
      {step === 3 && (
        <OptionGrid
          label="How far from NYC?"
          options={DISTANCE_OPTIONS}
          onSelect={(v) => handleSingleSelect('distance_from_nyc', v)}
        />
      )}

      {/* Step 5: Features + optional notes + submit */}
      {step === 4 && (
        <div>
          <p
            className="text-base font-medium mb-4"
            style={{ color: '#0D3323', fontFamily: 'Comfortaa, sans-serif' }}
          >
            What matters to you?
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {FEATURE_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => toggleFeature(chip)}
                className={query.features.includes(chip) ? 'chip-active' : 'chip-inactive'}
                style={{ cursor: 'pointer', transition: 'all 0.15s' }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Optional notes */}
          <div className="mb-5">
            <label className="label-caps block mb-2">Anything else? (optional)</label>
            <input
              type="text"
              value={query.notes}
              onChange={(e) => setQuery({ ...query, notes: e.target.value.slice(0, 200) })}
              placeholder="e.g. no crowds, want to bring my dog"
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: '#edf1e4',
                border: '1px solid #c0ceac',
                color: '#0D3323',
                fontFamily: 'Comfortaa, sans-serif',
              }}
            />
            <p className="text-right mt-1" style={{ fontSize: '9px', color: '#5a7860' }}>
              {query.notes.length}/200
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="pill-btn btn-green w-full py-3 justify-center text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Finding trails...
              </>
            ) : (
              'Find trails →'
            )}
          </button>

          {/* Status line */}
          <p
            style={{
              minHeight: '18px',
              textAlign: 'center',
              fontSize: '11px',
              fontFamily: 'Comfortaa, sans-serif',
              color: '#5a7860',
              letterSpacing: '0.3px',
              transition: 'opacity 0.2s',
              opacity: loading && statusMsg ? 1 : 0,
              marginTop: '8px',
            }}
          >
            {statusMsg}
          </p>
        </div>
      )}

      {/* Back button (steps 1-4) */}
      {step > 0 && !loading && (
        <div className="mt-5">
          <button
            onClick={() => setStep(step - 1)}
            className="text-sm"
            style={{ color: '#3A5A4C', fontFamily: 'Comfortaa, sans-serif' }}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}

function OptionGrid({
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
              style={{ fontFamily: 'Comfortaa, sans-serif' }}
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
