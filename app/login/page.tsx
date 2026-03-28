'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Wrong password')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#e8edda' }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs text-center"
      >
        <p
          style={{
            fontFamily: 'var(--font-comfortaa), Comfortaa, sans-serif',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            color: '#5a7860',
            marginBottom: '6px',
          }}
        >
          OUTDOOR PLANNER
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-playfair), Playfair Display, serif',
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: '36px',
            color: '#0D3323',
            marginBottom: '32px',
          }}
        >
          TrailMind
        </h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm text-center outline-none mb-3"
          style={{
            background: '#ffffff',
            border: '1.5px solid #c0ceac',
            color: '#0D3323',
            fontFamily: 'Comfortaa, sans-serif',
          }}
        />

        {error && (
          <p className="text-xs mb-3" style={{ color: '#FCA944' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="pill-btn btn-green w-full py-3 justify-center text-sm disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
