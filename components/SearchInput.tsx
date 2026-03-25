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
  const [statusMsg, setStatusMsg] = useState('')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const placeholderIdx = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  // Abort any in-flight search when this component unmounts (e.g. navigating away)
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

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
    // Abort any previous in-flight search
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setLoading(true)
    setStatusMsg('')
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
        signal: abort.signal,
      })
      if (!res.ok) throw new Error('Search failed')

      // Read stream — s: lines are status updates, everything else is JSON data
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let lineBuffer = ''
      let dataBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        lineBuffer += chunk

        // Process complete lines for live status updates
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('s:')) {
            setStatusMsg(line.slice(2))
          } else {
            dataBuffer += line + '\n'
          }
        }
      }
      // Flush remaining
      if (lineBuffer && !lineBuffer.startsWith('s:')) dataBuffer += lineBuffer

      const data = JSON.parse(dataBuffer.trim())
      sessionStorage.setItem('trailmind_results', JSON.stringify(data))
      sessionStorage.setItem('trailmind_query', query.trim())
      router.push(`/results?q=${encodeURIComponent(query.trim())}`)
    } catch {
      setLoading(false)
      setStatusMsg('')
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
        className="w-full outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.52)',
          border: '1.5px solid rgba(255,255,255,0.82)',
          borderRadius: '40px',
          padding: '12px 20px',
          fontSize: '13px',
          fontFamily: 'Comfortaa, sans-serif',
          color: '#1a2808',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 2px 16px rgba(40,80,16,0.08)',
        }}
      />
      <button
        type="submit"
        disabled={!query.trim() || loading}
        className="pill-btn btn-green self-center px-8 py-3 text-sm disabled:opacity-50"
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

      {/* Single overwriting status line */}
      <p
        style={{
          minHeight: '18px',
          textAlign: 'center',
          fontSize: '11px',
          fontFamily: 'Comfortaa, sans-serif',
          color: 'rgba(30,58,8,0.52)',
          letterSpacing: '0.3px',
          transition: 'opacity 0.2s',
          opacity: loading && statusMsg ? 1 : 0,
        }}
      >
        {statusMsg}
      </p>
    </form>
  )
}
