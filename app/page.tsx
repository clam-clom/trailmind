import SearchInput from '@/components/SearchInput'

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden">
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
          bottom: '-60px',
          left: '-60px',
          background: 'rgba(148,204,48,0.22)',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center px-8 pt-8 pb-0">
        <div>
          <span style={{ fontFamily: 'Comfortaa, sans-serif', fontWeight: 700, fontSize: '19px', color: '#243808' }}>
            trail
          </span>
          <span style={{ fontFamily: 'Comfortaa, sans-serif', fontWeight: 700, fontSize: '19px', color: '#a06800' }}>
            mind
          </span>
        </div>
      </header>

      {/* Center content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl text-center mb-10">
          <h1
            className="mb-3 leading-tight"
            style={{
              fontFamily: 'Comfortaa, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(26px, 5vw, 38px)',
              color: '#182408',
            }}
          >
            Tell me what you&apos;re looking for.
          </h1>
          <p
            className="text-sm"
            style={{ color: '#4a6a18', fontFamily: 'Comfortaa, sans-serif', fontWeight: 300 }}
          >
            Hiking, backpacking &amp; kayaking across NY, NJ, CT &amp; PA
          </p>
        </div>

        <div className="w-full max-w-xl">
          <SearchInput autoFocus />
        </div>

        <p
          className="mt-8 text-xs"
          style={{ color: '#547a20', fontFamily: 'Comfortaa, sans-serif', fontWeight: 300 }}
        >
          Real trails. Honest suggestions. No account required.
        </p>
      </div>
    </main>
  )
}
