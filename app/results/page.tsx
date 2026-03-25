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
    const abort = new AbortController()

    ;(async () => {
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
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
            if (!line.startsWith('s:')) dataBuffer += line + '\n'
          }
        }
        if (lineBuffer && !lineBuffer.startsWith('s:')) dataBuffer += lineBuffer

        const data = JSON.parse(dataBuffer.trim())
        if (data.error) throw new Error(data.error)
        sessionStorage.setItem('trailmind_results', JSON.stringify(data))
        sessionStorage.setItem('trailmind_query', query)
        setTrails(data.trails || [])
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError('Something went wrong. Try searching again.')
      } finally {
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [query, router])

  return (
    <main className="min-h-screen" style={{ background: '#e8edda' }}>
      {/* Nav bar */}
      <nav className="tm-nav">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="no-underline">
            <p className="logo-eyebrow mb-0.5">outdoor planner</p>
            <span className="logo-text">TrailMind</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="tm-nav-link active">Search</Link>
          </div>
        </div>
      </nav>

      {/* Results band */}
      <div className="results-band">
        <span>{trails.length} results</span>
        <div className="dot" />
        <span>{query}</span>
      </div>

      {/* Search section */}
      <div
        className="px-6 py-5"
        style={{ background: '#e8edda', borderBottom: '1px solid #bfcaac' }}
      >
        <div className="max-w-2xl mx-auto">
          <SearchInput initialValue={query} />
        </div>
      </div>

      {/* Results */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex flex-col items-center py-20 gap-4">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#0D3323', borderTopColor: 'transparent' }}
            />
            <p style={{ color: '#5a7860', fontFamily: 'Comfortaa, sans-serif', fontSize: '13px' }}>
              Finding trails...
            </p>
          </div>
        )}

        {error && (
          <div className="tm-card p-6 text-center" style={{ color: '#4a6858' }}>
            <p className="mb-4">{error}</p>
            <Link href="/" className="pill-btn btn-green px-6 py-2.5 text-sm inline-flex">
              Try again
            </Link>
          </div>
        )}

        {!loading && !error && trails.length > 0 && (
          <div className="flex flex-col gap-0">
            {trails.map((trail, i) => (
              <div
                key={trail.id}
                className="flex gap-3 py-3 items-start"
                style={{ borderBottom: i < trails.length - 1 ? '1px solid #bfcaac' : 'none' }}
              >
                {/* Numbered entry */}
                <span
                  className="entry-number flex-shrink-0"
                  style={{
                    fontFamily: 'var(--font-playfair), Playfair Display, serif',
                    fontSize: '30px',
                    fontWeight: 700,
                    color: '#b0c4a8',
                    width: '40px',
                    textAlign: 'right',
                    lineHeight: 1,
                    paddingTop: '8px',
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <TrailCard trail={trail} index={i} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && trails.length === 0 && (
          <div className="tm-card p-8 text-center">
            <p style={{ color: '#4a6858' }}>No trails found. Try a different search.</p>
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
