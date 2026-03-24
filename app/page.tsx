import SearchInput from '@/components/SearchInput'

export default function Home() {
  return (
    <main
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--cream)' }}
    >
      {/* Background blobs */}
      <div
        className="bg-blob"
        style={{
          width: 600,
          height: 600,
          top: '-100px',
          right: '-150px',
          background: 'radial-gradient(circle, rgba(148,199,180,0.22) 0%, transparent 70%)',
        }}
      />
      <div
        className="bg-blob"
        style={{
          width: 500,
          height: 500,
          bottom: '50px',
          left: '-100px',
          background: 'radial-gradient(circle, rgba(232,160,32,0.1) 0%, transparent 70%)',
        }}
      />
      <div
        className="bg-blob"
        style={{
          width: 400,
          height: 400,
          top: '40%',
          left: '30%',
          background: 'radial-gradient(circle, rgba(148,199,180,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center px-8 pt-8 pb-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧭</span>
          <span
            className="text-xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-nunito), sans-serif', color: 'var(--text)' }}
          >
            TrailMind
          </span>
        </div>
      </header>

      {/* Center content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl text-center mb-10">
          <h1
            className="mb-3 leading-tight"
            style={{
              fontFamily: 'var(--font-nunito), sans-serif',
              fontWeight: 300,
              fontSize: 'clamp(32px, 5vw, 48px)',
              color: 'var(--text)',
            }}
          >
            Tell me what you&apos;re looking for.
          </h1>
          <p
            className="text-base"
            style={{ color: 'var(--text2)', fontFamily: 'var(--font-outfit), sans-serif' }}
          >
            Hiking, backpacking &amp; kayaking across NY, NJ, CT &amp; PA
          </p>
        </div>

        <div className="w-full max-w-xl">
          <SearchInput autoFocus />
        </div>

        <p
          className="mt-8 text-xs"
          style={{ color: 'var(--text3)', fontFamily: 'var(--font-outfit), sans-serif' }}
        >
          Real trails. Honest suggestions. No account required.
        </p>
      </div>
    </main>
  )
}
