'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ActionBar from '@/components/ActionBar'
import DopeSheetQuiz from '@/components/DopeSheetQuiz'
import DopeSheetDisplay from '@/components/DopeSheetDisplay'
import { Trail, DopeSheet, DopeSheetQuizAnswers } from '@/lib/types'

const DIFFICULTY_CLASS: Record<string, string> = {
  easy: 'tag-base tag-easy',
  moderate: 'tag-base tag-moderate',
  hard: 'tag-base tag-hard',
  strenuous: 'tag-base tag-strenuous',
}

const BANNER_CLASS: Record<string, string> = {
  hike: 'tm-card-banner-hike',
  backpack: 'tm-card-banner-backpack',
  kayak: 'tm-card-banner-kayak',
}

const ACTIVITY_LABELS: Record<string, string> = {
  hike: 'Day Hike',
  backpack: 'Backpacking',
  kayak: 'Kayaking',
}

export default function TrailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [trail, setTrail] = useState<Trail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [dopeSheet, setDopeSheet] = useState<DopeSheet | null>(null)
  const [dopeLoading, setDopeLoading] = useState(false)
  const [dopeError, setDopeError] = useState<string | null>(null)
  const [dopeStatus, setDopeStatus] = useState('')

  // Throttled status: each message stays visible for at least 5s
  const dopePendingRef = useRef<string | null>(null)
  const dopeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dopeShownAtRef = useRef<number>(0)

  const showDopeStatus = (msg: string) => {
    const now = Date.now()
    const elapsed = now - dopeShownAtRef.current
    if (elapsed >= 5000 || dopeShownAtRef.current === 0) {
      setDopeStatus(msg)
      dopeShownAtRef.current = now
      dopePendingRef.current = null
      if (dopeTimerRef.current) { clearTimeout(dopeTimerRef.current); dopeTimerRef.current = null }
    } else {
      dopePendingRef.current = msg
      if (!dopeTimerRef.current) {
        dopeTimerRef.current = setTimeout(() => {
          dopeTimerRef.current = null
          if (dopePendingRef.current) {
            setDopeStatus(dopePendingRef.current)
            dopeShownAtRef.current = Date.now()
            dopePendingRef.current = null
          }
        }, 5000 - elapsed)
      }
    }
  }

  useEffect(() => {
    return () => { if (dopeTimerRef.current) clearTimeout(dopeTimerRef.current) }
  }, [])

  const handleDopeSheetSubmit = async (answers: DopeSheetQuizAnswers) => {
    if (!trail) return
    setShowQuiz(false)
    setDopeLoading(true)
    setDopeError(null)
    setDopeStatus('')
    dopeShownAtRef.current = 0
    dopePendingRef.current = null
    if (dopeTimerRef.current) { clearTimeout(dopeTimerRef.current); dopeTimerRef.current = null }
    try {
      const res = await fetch('/api/dope-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trail, quiz: answers }),
      })
      if (!res.ok) throw new Error('Generation failed')

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
            showDopeStatus(line.slice(2))
          } else {
            dataBuffer += line + '\n'
          }
        }
      }
      if (lineBuffer && !lineBuffer.startsWith('s:')) dataBuffer += lineBuffer

      const data = JSON.parse(dataBuffer.trim())
      setDopeSheet(data.sheet)
      setTimeout(() => {
        document.getElementById('dope-sheet-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch {
      setDopeError('Something went wrong generating the DOPE Sheet. Try again.')
    } finally {
      setDopeLoading(false)
    }
  }

  useEffect(() => {
    const cached = sessionStorage.getItem('trailmind_results')
    if (cached) {
      try {
        const data = JSON.parse(cached)
        const found = data.trails?.find((t: Trail) => t.id === id)
        if (found) {
          setTrail(found)
          return
        }
      } catch {}
    }
    setNotFound(true)
  }, [id])

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ background: '#e8edda' }}>
        <div className="tm-card p-8 text-center max-w-sm">
          <p className="mb-4" style={{ color: '#4a6858' }}>
            Trail not found. Try searching again.
          </p>
          <Link href="/" className="pill-btn btn-green px-6 py-2.5 text-sm inline-flex">
            Search trails
          </Link>
        </div>
      </main>
    )
  }

  if (!trail) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#e8edda' }}>
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#0D3323', borderTopColor: 'transparent' }}
        />
      </main>
    )
  }

  const diffClass = DIFFICULTY_CLASS[trail.difficulty] || 'tag-base'
  const driveHours = Math.round((trail.distance_from_nyc_miles / 55) * 10) / 10

  return (
    <main className="min-h-screen pb-36" style={{ background: '#e8edda' }}>
      {/* Nav bar */}
      <nav className="tm-nav">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="no-underline">
            <p className="logo-eyebrow mb-0.5">outdoor planner</p>
            <span className="logo-text">TrailMind</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="tm-nav-link">Search</Link>
          </div>
        </div>
      </nav>

      {/* Activity band */}
      <div className="results-band">
        <span>{ACTIVITY_LABELS[trail.activity] || trail.activity}</span>
        <div className="dot" />
        <span>{trail.region}, {trail.state}</span>
      </div>

      {/* Back button */}
      <div className="px-6 pt-5">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm"
          style={{ color: '#3A5A4C', fontFamily: 'Comfortaa, sans-serif' }}
        >
          ← Back to results
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-5">
        {/* Trail name card */}
        <div className="tm-card mb-5">
          <div className={BANNER_CLASS[trail.activity] || 'tm-card-banner-hike'} />
          <div style={{ padding: '16px 20px' }}>
            <h1
              className="leading-tight mb-1"
              style={{
                fontFamily: 'var(--font-playfair), Playfair Display, serif',
                fontWeight: 700,
                fontSize: 'clamp(22px, 4vw, 28px)',
                color: '#0D3323',
              }}
            >
              {trail.name}
            </h1>
            <p style={{ color: '#4a6858', fontSize: '11px', fontFamily: 'Comfortaa, sans-serif', fontWeight: 300 }}>
              {trail.region}, {trail.state}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div
          className="mb-5"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}
        >
          <div className="stat-tile">
            <div className="stat-value">{trail.distance_miles} mi</div>
            <div className="stat-label">distance</div>
          </div>
          {trail.elevation_gain_ft !== null && (
            <div className="stat-tile">
              <div className="stat-value">{trail.elevation_gain_ft.toLocaleString()} ft</div>
              <div className="stat-label">elevation</div>
            </div>
          )}
          <div className="stat-tile">
            <div className="stat-value">~{trail.estimated_hours}h</div>
            <div className="stat-label">time</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{trail.distance_from_nyc_miles} mi</div>
            <div className="stat-label">from nyc</div>
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-5">
          <span className={diffClass}>{trail.difficulty}</span>
        </div>

        {/* Description */}
        <div className="tm-card p-5 mb-4">
          <p style={{ color: '#4a6858', lineHeight: 1.7, fontSize: '14px', fontFamily: 'Comfortaa, sans-serif' }}>
            {trail.description}
          </p>
        </div>

        {/* Tags */}
        {trail.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {trail.tags.map((tag) => (
              <span key={tag} className="tag-base tag-feature">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Getting there */}
        <div className="tm-card p-5 mb-4">
          <h2 className="label-caps mb-3">Getting there</h2>
          <p className="text-sm mb-2" style={{ color: '#4a6858' }}>
            ~{driveHours}h drive from NYC ({trail.distance_from_nyc_miles} miles)
          </p>
          {trail.transit_accessible && (
            <p className="text-sm" style={{ color: '#0D3323' }}>
              ✓ Transit accessible from NYC
            </p>
          )}
          {!trail.transit_accessible && (
            <p className="text-sm" style={{ color: '#5a7860' }}>
              Car or carpool recommended
            </p>
          )}
        </div>

        {/* Permits */}
        {trail.permit_required && (
          <div
            className="tm-card p-4 mb-4 flex items-start gap-3"
            style={{ borderLeft: '3px solid #FCA944' }}
          >
            <span>⚠️</span>
            <p className="text-sm" style={{ color: '#4a6858' }}>
              Permit required — check before you go.
            </p>
          </div>
        )}

        {/* Source — only show if we have a verified URL */}
        {trail.source_url && (
          <div className="mb-6">
            <a
              href={trail.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
              style={{ color: '#0D3323' }}
            >
              View on {trail.source} →
            </a>
          </div>
        )}

        {/* DOPE Sheet loading state */}
        {dopeLoading && (
          <div
            className="tm-card p-8 mb-6 flex flex-col items-center gap-3"
            style={{ textAlign: 'center' }}
          >
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#0D3323', borderTopColor: 'transparent' }}
            />
            <p style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: '14px', color: '#4a6858' }}>
              Building your DOPE Sheet...
            </p>
            <p
              style={{
                fontSize: '11px',
                fontFamily: 'Comfortaa, sans-serif',
                color: '#5a7860',
                letterSpacing: '0.3px',
                minHeight: '16px',
                transition: 'opacity 0.2s',
                opacity: dopeStatus ? 1 : 0,
              }}
            >
              {dopeStatus}
            </p>
          </div>
        )}

        {/* DOPE Sheet error */}
        {dopeError && (
          <div
            className="tm-card p-4 mb-6 flex items-start gap-3"
            style={{ borderLeft: '3px solid #FCA944' }}
          >
            <span>⚠️</span>
            <div>
              <p className="text-sm mb-2" style={{ color: '#4a6858' }}>{dopeError}</p>
              <button
                onClick={() => setShowQuiz(true)}
                className="pill-btn px-4 py-1.5 text-xs"
                style={{ background: '#edf1e4', border: '1px solid #c0ceac', color: '#4a6858' }}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* DOPE Sheet display */}
        {dopeSheet && (
          <DopeSheetDisplay sheet={dopeSheet} trailName={trail.name} />
        )}
      </div>

      <ActionBar trail={trail} onDopeSheetClick={() => setShowQuiz(true)} />

      {showQuiz && (
        <DopeSheetQuiz
          trail={trail}
          onSubmit={handleDopeSheetSubmit}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </main>
  )
}
