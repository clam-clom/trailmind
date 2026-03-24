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
  easy: { background: 'rgba(148,199,180,0.25)', color: '#3d6858' },
  moderate: { background: 'rgba(232,160,32,0.15)', color: '#b07010' },
  hard: { background: 'rgba(217,106,16,0.15)', color: '#a05010' },
  strenuous: { background: 'rgba(217,106,16,0.2)', color: '#903010' },
}

const ACTIVITY_ACCENT: Record<string, string> = {
  hike: '#638872',
  backpack: '#3d6858',
  kayak: '#94c7b4',
}

export default function TrailCard({ trail, index }: TrailCardProps) {
  const accentColor = ACTIVITY_ACCENT[trail.activity] || '#638872'
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
          <span className="label-caps mt-2" style={{ fontSize: '9px' }}>
            {trail.activity}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className="text-base font-semibold leading-snug"
              style={{ fontFamily: 'var(--font-nunito), sans-serif', color: 'var(--text)' }}
            >
              {trail.name}
            </h3>
          </div>

          <p className="text-sm mb-3" style={{ color: 'var(--text3)', fontSize: '13px' }}>
            {trail.region}, {trail.state}
          </p>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={diffStyle}
            >
              {trail.difficulty}
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: 'var(--cream2)', color: 'var(--text2)' }}
            >
              {trail.distance_miles} mi
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: 'var(--cream2)', color: 'var(--text2)' }}
            >
              ~{trail.estimated_hours}h
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs"
              style={{ background: 'var(--cream2)', color: 'var(--text2)' }}
            >
              {trail.distance_from_nyc_miles} mi from NYC
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {trail.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  background: 'var(--teal-light)',
                  color: 'var(--green-dark)',
                  fontSize: '11px',
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
              style={{ background: 'var(--cream2)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(60, 100 - index * 8)}%`,
                  background: `linear-gradient(90deg, var(--green), var(--teal))`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
