'use client'

import Link from 'next/link'
import { Trail } from '@/lib/types'

interface TrailCardProps {
  trail: Trail
  index: number
}

const ACTIVITY_ICONS: Record<string, string> = {
  hike: '🥾',
  backpack: '⛺',
  kayak: '🛶',
}

const DIFFICULTY_STYLE: Record<string, React.CSSProperties> = {
  easy: {
    background: 'rgba(88,190,110,0.32)',
    border: '1px solid rgba(100,198,124,0.42)',
    color: '#0e5030',
  },
  moderate: {
    background: 'rgba(148,204,48,0.35)',
    border: '1px solid rgba(160,212,60,0.48)',
    color: '#285010',
  },
  hard: {
    background: 'rgba(255,208,40,0.28)',
    border: '1px solid rgba(255,215,60,0.4)',
    color: '#7a4a00',
  },
  strenuous: {
    background: 'rgba(255,208,40,0.42)',
    border: '1px solid rgba(255,215,60,0.55)',
    color: '#6e3e00',
  },
}

const ACTIVITY_ACCENT: Record<string, string> = {
  hike: '#285010',
  backpack: '#1e3c0a',
  kayak: '#4a8a20',
}

export default function TrailCard({ trail, index }: TrailCardProps) {
  const accentColor = ACTIVITY_ACCENT[trail.activity] || '#285010'
  const diffStyle = DIFFICULTY_STYLE[trail.difficulty] || {}

  return (
    <Link href={`/trail/${trail.id}`} className="block no-underline">
      <div
        className="frost-card flex gap-4 p-5 hover:scale-[1.01] transition-transform cursor-pointer"
        style={{ borderLeft: `4px solid ${accentColor}` }}
      >
        {/* Activity icon */}
        <div className="flex-shrink-0 flex flex-col items-center pt-1">
          <span className="text-2xl">{ACTIVITY_ICONS[trail.activity]}</span>
          <span
            className="mt-2 uppercase"
            style={{
              fontSize: '9px',
              fontFamily: 'Comfortaa, sans-serif',
              fontWeight: 400,
              letterSpacing: '1px',
              color: '#547a20',
            }}
          >
            {trail.activity}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Trail name */}
          <h3
            className="leading-snug mb-1"
            style={{
              fontFamily: 'Comfortaa, sans-serif',
              fontWeight: 700,
              fontSize: '15px',
              color: '#182408',
            }}
          >
            {trail.name}
          </h3>

          {/* Region */}
          <p
            className="mb-3"
            style={{
              fontFamily: 'Comfortaa, sans-serif',
              fontWeight: 300,
              fontSize: '11px',
              color: '#4a6a18',
            }}
          >
            {trail.region}, {trail.state}
          </p>

          {/* Stats grid — 4 columns */}
          <div
            className="mb-3"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
            }}
          >
            {[
              { label: 'dist', value: `${trail.distance_miles} mi` },
              { label: 'time', value: `~${trail.estimated_hours}h` },
              { label: 'from nyc', value: `${trail.distance_from_nyc_miles} mi` },
              { label: 'difficulty', value: null },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex flex-col items-center py-1 px-1"
                style={{
                  borderRight: i < 3 ? '1px solid rgba(80,120,20,0.18)' : 'none',
                }}
              >
                <span
                  className="uppercase mb-0.5"
                  style={{
                    fontSize: '9px',
                    fontFamily: 'Comfortaa, sans-serif',
                    fontWeight: 400,
                    letterSpacing: '1px',
                    color: '#547a20',
                  }}
                >
                  {stat.label}
                </span>
                {stat.value ? (
                  <span
                    style={{
                      fontSize: '13px',
                      fontFamily: 'Comfortaa, sans-serif',
                      fontWeight: 700,
                      color: '#182408',
                    }}
                  >
                    {stat.value}
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full text-center"
                    style={{
                      ...diffStyle,
                      fontSize: '10px',
                      fontFamily: 'Comfortaa, sans-serif',
                      fontWeight: 600,
                    }}
                  >
                    {trail.difficulty}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Terrain tags */}
          <div className="flex flex-wrap gap-1.5">
            {trail.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.45)',
                  border: '1px solid rgba(255,255,255,0.72)',
                  color: '#243810',
                  fontSize: '10px',
                  fontFamily: 'Comfortaa, sans-serif',
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Relevance bar */}
          <div className="mt-3">
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(80,120,20,0.12)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(55, 100 - index * 8)}%`,
                  background: 'linear-gradient(90deg, #285010, #4a8a20)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
