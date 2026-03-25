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

  // Throttled status: each message stays visible for at least 5s
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
        body: JSON.stringify({ query: query.trim() }),
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
      sessionStorage.setItem('trailmind_results', JSON.stringify(data))
      sessionStorage.setItem('trailmind_query', query.trim())
      router.push(`/results?q=${encodeURIComponent(query.trim())}`)
    } catch {
      setLoading(false)
      setStatusMsg('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Search section */}
      <div
        className="pb-4 mb-4"
        style={{ borderBottom: '1px solid #bfcaac' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="tm-search-input"
          style={{
            fontFamily: 'var(--font-playfair), Playfair Display, serif',
          }}
        />
        <p className="tm-search-hint">
          e.g. &ldquo;easy waterfall hike near NYC&rdquo; or &ldquo;3-day kayak expedition&rdquo;
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="pill-btn btn-green px-8 py-3 text-sm disabled:opacity-50"
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
            color: '#5a7860',
            letterSpacing: '0.3px',
            transition: 'opacity 0.2s',
            opacity: loading && statusMsg ? 1 : 0,
          }}
        >
          {statusMsg}
        </p>
      </div>
    </form>
  )
}
