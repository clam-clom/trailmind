'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ActionBar from '@/components/ActionBar'
import { Trail } from '@/lib/types'

const DIFFICULTY_STYLE: Record<string, React.CSSProperties> = {
  easy: { background: 'rgba(148,199,180,0.25)', color: '#3d6858' },
  moderate: { background: 'rgba(232,160,32,0.15)', color: '#b07010' },
  hard: { background: 'rgba(217,106,16,0.15)', color: '#a05010' },
  strenuous: { background: 'rgba(217,106,16,0.2)', color: '#903010' },
}

const ACTIVITY_ICONS: Record<string, string> = {
  hike: '🥾',
  backpack: '⛺',
  kayak: '🛶',
}

export default function TrailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [trail, setTrail] = useState<Trail | null>(null)
  const [notFound, setNotFound] = useState(false)

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
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'var(--cream)' }}
      >
        <div className="frost-card p-8 text-center max-w-sm">
          <p className="mb-4" style={{ color: 'var(--text2)' }}>
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
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--cream)' }}
      >
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }}
        />
      </main>
    )
  }

  const diffStyle = DIFFICULTY_STYLE[trail.difficulty] || {}
  const driveHours = Math.round((trail.distance_from_nyc_miles / 55) * 10) / 10

  return (
    <main
      className="relative min-h-screen pb-28"
      style={{ background: 'var(--cream)' }}
    >
      {/* Background blobs */}
      <div
        className="bg-blob"
        style={{
          width: 500,
          height: 500,
          top: '-80px',
          right: '-100px',
          background: 'radial-gradient(circle, rgba(148,199,180,0.2) 0%, transparent 70%)',
        }}
      />

      {/* Back button */}
      <div className="relative z-10 px-6 pt-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm"
          style={{ color: 'var(--text3)', fontFamily: 'var(--font-outfit), sans-serif' }}
        >
          ← Back to results
        </button>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-6">
        {/* Activity + name */}
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl mt-1">{ACTIVITY_ICONS[trail.activity]}</span>
          <div>
            <h1
              className="leading-tight mb-1"
              style={{
                fontFamily: 'var(--font-nunito), sans-serif',
                fontWeight: 400,
                fontSize: 'clamp(26px, 4vw, 38px)',
                color: 'var(--text)',
              }}
            >
              {trail.name}
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: '14px' }}>
              {trail.region}, {trail.state}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="frost-card p-4 mb-5 flex flex-wrap gap-4">
          <div className="flex flex-col items-center gap-0.5">
            <span className="label-caps">Distance</span>
            <span className="text-lg font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-nunito), sans-serif' }}>
              {trail.distance_miles} mi
            </span>
          </div>
          {trail.elevation_gain_ft !== null && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="label-caps">Elevation</span>
              <span className="text-lg font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-nunito), sans-serif' }}>
                {trail.elevation_gain_ft.toLocaleString()} ft
              </span>
            </div>
          )}
          <div className="flex flex-col items-center gap-0.5">
            <span className="label-caps">Time</span>
            <span className="text-lg font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-nunito), sans-serif' }}>
              ~{trail.estimated_hours}h
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="label-caps">Difficulty</span>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
              style={diffStyle}
            >
              {trail.difficulty}
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="label-caps">From NYC</span>
            <span className="text-lg font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-nunito), sans-serif' }}>
              {trail.distance_from_nyc_miles} mi
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="frost-card p-5 mb-4">
          <p style={{ color: 'var(--text2)', lineHeight: 1.7 }}>{trail.description}</p>
        </div>

        {/* Tags */}
        {trail.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {trail.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-sm capitalize"
                style={{ background: 'var(--teal-light)', color: 'var(--green-dark)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Getting there */}
        <div className="frost-card p-5 mb-4">
          <h2
            className="text-sm font-semibold mb-3 label-caps"
            style={{ color: 'var(--text2)' }}
          >
            Getting there
          </h2>
          <p className="text-sm mb-2" style={{ color: 'var(--text2)' }}>
            ~{driveHours}h drive from NYC ({trail.distance_from_nyc_miles} miles)
          </p>
          {trail.transit_accessible && (
            <p className="text-sm" style={{ color: 'var(--green-dark)' }}>
              ✓ Transit accessible from NYC
            </p>
          )}
          {!trail.transit_accessible && (
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Car or carpool recommended
            </p>
          )}
        </div>

        {/* Permits */}
        {trail.permit_required && (
          <div
            className="frost-card p-4 mb-4 flex items-start gap-3"
            style={{ borderLeft: '3px solid var(--amber)' }}
          >
            <span>⚠️</span>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              Permit required — check before you go.
            </p>
          </div>
        )}

        {/* Source */}
        <div className="mb-6">
          <a
            href={trail.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
            style={{ color: 'var(--green-dark)' }}
          >
            View on {trail.source} →
          </a>
        </div>
      </div>

      <ActionBar trail={trail} />
    </main>
  )
}
