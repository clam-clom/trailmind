'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import TrailCard from '@/components/TrailCard'
import SearchInput from '@/components/SearchInput'
import { Trail } from '@/lib/types'

function ResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''

  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query) {
      router.replace('/')
      return
    }

    const cachedQuery = sessionStorage.getItem('trailmind_query')
    const cachedResults = sessionStorage.getItem('trailmind_results')

    if (cachedQuery === query && cachedResults) {
      try {
        const data = JSON.parse(cachedResults)
        setTrails(data.trails || [])
        setLoading(false)
        return
      } catch {}
    }

    setLoading(true)
    fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        sessionStorage.setItem('trailmind_results', JSON.stringify(data))
        sessionStorage.setItem('trailmind_query', query)
        setTrails(data.trails || [])
      })
      .catch(() => setError('Something went wrong. Try searching again.'))
      .finally(() => setLoading(false))
  }, [query, router])

  return (
    <main className="relative min-h-screen">
      {/* Background blobs */}
      <div
        className="bg-blob"
        style={{
          width: 340,
          height: 340,
          top: '-80px',
          right: '-80px',
          background: 'rgba(255,224,40,0.28)',
        }}
      />
      <div
        className="bg-blob"
        style={{
          width: 280,
          height: 280,
          bottom: 100,
          left: '-60px',
          background: 'rgba(148,204,48,0.22)',
        }}
      />

      {/* Sticky header */}
      <header
        className="sticky top-0 z-20 px-6 py-4"
        style={{
          background: 'rgba(220,235,100,0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(80,120,20,0.18)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-3">
            <Link href="/" className="flex items-center gap-0.5 no-underline">
              <span style={{ fontFamily: 'Comfortaa, sans-serif', fontWeight: 700, fontSize: '16px', color: '#243808' }}>
                trail
              </span>
              <span style={{ fontFamily: 'Comfortaa, sans-serif', fontWeight: 700, fontSize: '16px', color: '#a06800' }}>
                mind
              </span>
            </Link>
          </div>
          <SearchInput initialValue={query} />
        </div>
      </header>

      {/* Results */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex flex-col items-center py-20 gap-4">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#285010', borderTopColor: 'transparent' }}
            />
            <p style={{ color: '#547a20', fontFamily: 'Comfortaa, sans-serif', fontSize: '13px' }}>
              Finding trails...
            </p>
          </div>
        )}

        {error && (
          <div className="frost-card p-6 text-center" style={{ color: '#4a6a18' }}>
            <p className="mb-4">{error}</p>
            <Link href="/" className="pill-btn btn-green px-6 py-2.5 text-sm inline-flex">
              Try again
            </Link>
          </div>
        )}

        {!loading && !error && trails.length > 0 && (
          <>
            <p
              className="mb-4 text-sm"
              style={{ color: '#547a20', fontFamily: 'Comfortaa, sans-serif', fontSize: '11px', fontWeight: 400 }}
            >
              {trails.length} trails found for:{' '}
              <span style={{ color: '#4a6a18', fontStyle: 'italic' }}>&ldquo;{query}&rdquo;</span>
            </p>

            <div className="flex flex-col gap-3">
              {trails.map((trail, i) => (
                <TrailCard key={trail.id} trail={trail} index={i} />
              ))}
            </div>
          </>
        )}

        {!loading && !error && trails.length === 0 && (
          <div className="frost-card p-8 text-center">
            <p style={{ color: '#4a6a18' }}>No trails found. Try a different search.</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  )
}
