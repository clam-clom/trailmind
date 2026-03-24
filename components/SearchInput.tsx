'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const PLACEHOLDERS = [
  'a day hike near NYC this Saturday, something with views',
  'a multi-day backpacking trip in the Catskills',
  'flatwater kayaking close to the city, a few hours',
  'something hard, I want to suffer',
]

interface SearchInputProps {
  initialValue?: string
  autoFocus?: boolean
}

export default function SearchInput({ initialValue = '', autoFocus = false }: SearchInputProps) {
  const [query, setQuery] = useState(initialValue)
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const placeholderIdx = useRef(0)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const interval = setInterval(() => {
      placeholderIdx.current = (placeholderIdx.current + 1) % PLACEHOLDERS.length
      setPlaceholder(PLACEHOLDERS[placeholderIdx.current])
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      sessionStorage.setItem('trailmind_results', JSON.stringify(data))
      sessionStorage.setItem('trailmind_query', query.trim())
      router.push(`/results?q=${encodeURIComponent(query.trim())}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full px-6 py-4 text-base rounded-2xl outline-none transition-all"
        style={{
          background: 'var(--frost)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1.5px solid var(--frost-border)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          color: 'var(--text)',
          fontFamily: 'var(--font-outfit), sans-serif',
          fontSize: '15px',
        }}
      />
      <button
        type="submit"
        disabled={!query.trim() || loading}
        className="pill-btn btn-green self-center px-8 py-3 text-base font-medium disabled:opacity-50"
        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
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
    </form>
  )
}
