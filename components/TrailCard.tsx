'use client'

import Link from 'next/link'
import { Trail } from '@/lib/types'

interface TrailCardProps {
  trail: Trail
  index: number
}

const BANNER_CLASS: Record<string, string> = {
  hike: 'tm-card-banner-hike',
  backpack: 'tm-card-banner-backpack',
  kayak: 'tm-card-banner-kayak',
}

const DIFFICULTY_CLASS: Record<string, string> = {
  easy: 'tag-base tag-easy',
  moderate: 'tag-base tag-moderate',
  hard: 'tag-base tag-hard',
  strenuous: 'tag-base tag-strenuous',
}

export default function TrailCard({ trail }: TrailCardProps) {
  const bannerClass = BANNER_CLASS[trail.activity] || 'tm-card-banner-hike'
  const diffClass = DIFFICULTY_CLASS[trail.difficulty] || 'tag-base'

  return (
    <Link href={`/trail/${trail.id}`} className="block no-underline">
      <div className="tm-card hover:shadow-md transition-shadow cursor-pointer">
        {/* Activity banner strip */}
        <div className={bannerClass} />

        {/* Card body */}
        <div style={{ padding: '13px 16px 14px' }}>
          {/* Trail name */}
          <h3
            className="leading-snug mb-0.5"
            style={{
              fontFamily: 'var(--font-playfair), Playfair Display, serif',
              fontWeight: 700,
              fontSize: '15px',
              color: '#0D3323',
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
              fontSize: '10px',
              color: '#4a6858',
            }}
          >
            {trail.region}, {trail.state}
          </p>

          {/* Stat tiles grid */}
          <div
            className="mb-3"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '5px',
            }}
          >
            <div className="stat-tile">
              <div className="stat-value">{trail.distance_miles} mi</div>
              <div className="stat-label">dist</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">~{trail.estimated_hours}h</div>
              <div className="stat-label">time</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{trail.distance_from_nyc_miles} mi</div>
              <div className="stat-label">from nyc</div>
            </div>
            <div className="stat-tile flex flex-col items-center justify-center">
              <span className={diffClass}>{trail.difficulty}</span>
            </div>
          </div>

          {/* Feature tags */}
          <div className="flex flex-wrap gap-1.5">
            {trail.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="tag-base tag-feature">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}
