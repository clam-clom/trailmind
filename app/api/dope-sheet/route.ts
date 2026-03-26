import { NextRequest, NextResponse } from 'next/server'
// NextResponse kept for error returns; streaming success uses raw Response
import { anthropic } from '@/lib/anthropic'
import { Trail, DopeSheetQuizAnswers } from '@/lib/types'

// ── Link discovery via web search ─────────────────────────────────
// Claude hallucinates URLs. Instead of trusting them, we throw them
// out entirely and search the web for REAL pages about this specific
// trail. Uses DuckDuckGo HTML search to find actual URLs, then
// verifies each one contains content about this trail.

interface VerifiedLinks {
  trail: string[]
  maps: string[]
  trip_reports: string[]
  river_data?: string[]
}

// Search DuckDuckGo HTML and extract result URLs
async function webSearch(query: string, max = 5): Promise<string[]> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(searchUrl, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return []
    const html = await res.text()

    // Extract result URLs from DuckDuckGo HTML results
    const urls: string[] = []
    // DuckDuckGo uses redirect links: //duckduckgo.com/l/?uddg=ENCODED_URL
    const uddgRegex = /uddg=([^&"]+)/g
    let match
    while ((match = uddgRegex.exec(html)) !== null && urls.length < max) {
      try {
        const decoded = decodeURIComponent(match[1])
        if (decoded.startsWith('http') && !decoded.includes('duckduckgo.com')) {
          urls.push(decoded)
        }
      } catch {}
    }

    // Fallback: try direct href extraction
    if (urls.length === 0) {
      const hrefRegex = /class="result__a"\s+href="(https?[^"]+)"/g
      while ((match = hrefRegex.exec(html)) !== null && urls.length < max) {
        urls.push(match[1])
      }
    }

    return urls
  } catch {
    clearTimeout(timer)
    return []
  }
}

// Fetch a URL and read the first chunk to check it's real + relevant
async function fetchAndCheck(url: string, trail: Trail, timeoutMs = 6000): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return false

    // Read first ~15KB
    const reader = res.body?.getReader()
    if (!reader) return false
    const decoder = new TextDecoder()
    let text = ''
    while (text.length < 15000) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
    }
    reader.cancel()

    const lower = text.toLowerCase()

    // Must have substantial content (not empty/error page)
    const textOnly = lower.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    if (textOnly.length < 300) return false

    // Check the page title or body for the trail name
    // Use the full trail name as a phrase match first (strongest signal)
    const fullName = trail.name.toLowerCase()
    if (lower.includes(fullName)) return true

    // Try significant sub-phrases (e.g. "Lehigh River Gorge" from
    // "Lehigh River Gorge — White Haven to Jim Thorpe Expedition")
    const nameParts = trail.name.split(/[\s—–\-:]+/).filter(w => w.length > 2)
    // Build 3-word sliding windows from the trail name
    for (let i = 0; i <= nameParts.length - 3; i++) {
      const phrase = nameParts.slice(i, i + 3).join(' ').toLowerCase()
      if (lower.includes(phrase)) return true
    }

    return false
  } catch {
    clearTimeout(timer)
    return false
  }
}

async function findRealLinks(
  trail: Trail,
  isKayak: boolean,
  statusFn: (msg: string) => void,
): Promise<VerifiedLinks> {
  const result: VerifiedLinks = { trail: [], maps: [], trip_reports: [] }
  if (isKayak) result.river_data = []
  const seen = new Set<string>()

  const trailName = trail.name
  const region = trail.region
  const state = trail.state

  statusFn('Searching the web for real trail links...')

  // ── 1. Build targeted search queries ──
  type SearchJob = { query: string; cat: keyof VerifiedLinks }
  const jobs: SearchJob[] = [
    // Trail pages — search for the specific trail on known good sites
    { query: `"${trailName}" site:alltrails.com`, cat: 'trail' },
    { query: `"${trailName}" ${region} ${state} official trail page`, cat: 'trail' },
    // Maps
    { query: `"${trailName}" ${state} trail map pdf`, cat: 'maps' },
    // Trip reports
    { query: `"${trailName}" trip report`, cat: 'trip_reports' },
  ]

  if (isKayak) {
    jobs.push(
      { query: `"${trailName}" site:americanwhitewater.org`, cat: 'river_data' },
      { query: `"${trailName}" ${state} river gauge water level`, cat: 'river_data' },
      { query: `"${trailName}" paddle kayak put-in take-out`, cat: 'trail' },
    )
  }

  // Add source-specific searches
  const sourceMap: Record<string, string> = {
    NPS: `"${trailName}" site:nps.gov`,
    NYNJTC: `"${trailName}" site:nynjtc.org`,
    'NYS DEC': `"${trailName}" site:dec.ny.gov`,
    AW: `"${trailName}" site:americanwhitewater.org`,
  }
  if (sourceMap[trail.source]) {
    jobs.push({ query: sourceMap[trail.source], cat: 'trail' })
  }

  // ── 2. Run all web searches in parallel ──
  statusFn('Searching AllTrails, NPS, and other sources...')
  const searchResults = await Promise.allSettled(
    jobs.map(async (job) => {
      const urls = await webSearch(job.query, 3)
      return { urls, cat: job.cat }
    })
  )

  // Collect all candidate URLs from search results
  type Candidate = { url: string; cat: keyof VerifiedLinks }
  const candidates: Candidate[] = []

  // Always include the trail's source URL from search data (most reliable)
  if (trail.source_url && trail.source_url.startsWith('http')) {
    candidates.push({ url: trail.source_url, cat: 'trail' })
    seen.add(trail.source_url)
  }

  for (const r of searchResults) {
    if (r.status !== 'fulfilled') continue
    for (const url of r.value.urls) {
      if (!seen.has(url) && url.startsWith('http')) {
        seen.add(url)
        candidates.push({ url, cat: r.value.cat })
      }
    }
  }

  // ── 3. Verify each URL actually contains content about THIS trail ──
  statusFn(`Checking ${candidates.length} links for relevance...`)
  const checks = await Promise.allSettled(
    candidates.map(async ({ url, cat }) => {
      const relevant = await fetchAndCheck(url, trail)
      return { url, cat, relevant }
    })
  )

  for (const r of checks) {
    if (r.status !== 'fulfilled') continue
    const { url, cat, relevant } = r.value
    if (relevant && result[cat]) {
      result[cat]!.push(url)
    }
  }

  // ── 4. Dedupe and cap per category ──
  const cap = (arr: string[], max: number) => [...new Set(arr)].slice(0, max)
  result.trail = cap(result.trail, 5)
  result.maps = cap(result.maps, 3)
  result.trip_reports = cap(result.trip_reports, 4)
  if (result.river_data) result.river_data = cap(result.river_data, 4)

  const total = result.trail.length + result.maps.length +
    result.trip_reports.length + (result.river_data?.length || 0)
  statusFn(`Found ${total} verified links`)

  return result
}

// ── Main route ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { trail, quiz }: { trail: Trail; quiz: DopeSheetQuizAnswers } = await req.json()

    const groupNum =
      quiz.group_size === 'solo' ? 1
      : quiz.group_size === '2' ? 2
      : quiz.group_size === '3-4' ? 3
      : 5

    const isOvernight = quiz.duration !== 'day'
    const isKayak = quiz.trip_type === 'kayak_day' || quiz.trip_type === 'kayak_expedition'

    // Estimate trip duration in days
    const durationDays =
      quiz.duration === 'day' ? 1
      : quiz.duration === '1_night' ? 2
      : quiz.duration === '2-3_nights' ? 3
      : Math.max(5, Math.ceil(trail.estimated_hours / 8))

    // For very long trips (>14 days), cap the daily breakdown to keep
    // the output useful. Nobody plans day 47 from a single AI prompt.
    const isLongTrip = durationDays > 14
    const DAILY_CAP = 14

    const systemPrompt = `You are TrailMind's DOPE Sheet generator. You create NOLS-style trip planning documents for Northeast US outdoor trips. You follow a strict format derived from field-tested expedition planning.

HARD RULES — never break these:
1. Every trail, campsite, rapid, and landmark must be real and verifiable. If you cannot confidently name a real feature, write "[verify]" rather than inventing one.
2. Mileage, elevation, and time estimates must come from the trail data provided — never invent them. If a field is missing, write "[verify]".
3. Rapids must be sourced from American Whitewater, state river guides, or NPS. Do not invent rapid names or class ratings.
4. Legal campsites only. Only list designated or primitive FCFS sites on government sources. Never suggest "just camp anywhere."
5. For the "links" field, return empty arrays — links are handled separately via web search. Do not generate URLs from memory.

PACE & TIME FORMULAS:
- Hiking base pace: 2.0 mph flat/moderate, 1.5 mph strenuous
- Add 1 hour per 500 ft elevation gain to hiking time
- Water breaks: 5 min every 30 min of hiking
- Snack breaks: 10–15 min every 1 hour of hiking
- Allotted time = expected time + 30 min buffer
- Kayak pace: 2.5 mph flatwater/Class I, 2.0 mph Class II, 1.5 mph or "scout + portage" Class III+

FOOD WEIGHT (NOLS standard):
- Mild/short (summer, easy): ~1.5 lbs/person/day
- Moderate (longer, cooler): ~1.75 lbs/person/day
- Strenuous/cold (heavy packs, fall/winter): ~2.0–2.5 lbs/person/day
- Always add 1 emergency ration per person (extra lunch or dinner)
- Suggest meal NAMES only — no recipes, no ingredient lists, no calorie counts
- Scale quantities for the group size

${isLongTrip ? `
LONG TRIP RULES (this trip is ${durationDays} days):
- DAILY BREAKDOWN: Only generate detailed day-by-day entries for the FIRST 7 days and the LAST 2 days. For the middle section (Days 8 through ${durationDays - 2}), generate ONE summary entry with day=0, label="Days 8–${durationDays - 2} — Middle Section (summary)", total miles, general terrain description, key waypoints, and a note that this section should be planned in detail closer to the trip.
- FOOD PLAN: Do NOT list per-day meals. Instead provide a food_plan with an empty "days" array, totals showing the full trip counts, weight_guideline, and a "summary" field with 5-6 sample meal ideas and the total food weight estimate.
- EVAC PLAN: Only generate evac sections for the first 3 days and last 2 days. Add one general middle-section evac note.
- Keep gear list, safety callouts, and links the same as normal.
` : ''}
Return ONLY valid JSON. No markdown, no code fences, no explanation text.`

    const userPrompt = `Generate a DOPE Sheet for this trip.

Trail data:
${JSON.stringify(trail, null, 2)}

Quiz answers:
- Trip type: ${quiz.trip_type}
- Group size: ${quiz.group_size} (${groupNum} ${groupNum === 1 ? 'person' : 'people'})
- Duration: ${quiz.duration}
- Season: ${quiz.season}
- Experience level: ${quiz.experience}

Return JSON matching this exact structure:

{
  "type": "${quiz.trip_type}",
  "header": {
    "trail_name": string,
    "total_distance": string,
    "elevation_or_class": string,
    "duration": string,
    "participants": string,
    "start": string,
    "end": string
  },
  "days": [
    {
      "day": number,
      "label": "Day N — Start → End",
      "total_distance_miles": number,
      "elevation_gain_ft": number,
      "expected_pace_mph": number,
      "expected_time": string,
      "allotted_time": string,
      "start_position": string,
      "end_position": string,
      "campsite": string or omit if day trip,
      "bailout_marker": string,
      "breaks": ["2 × 5 min water @ 30 min, 1 hr", "1 × 10 min snack @ 1 hr"],
      "class_rating": string or omit if hiking,
      "put_in": string or omit if hiking,
      "take_out": string or omit if hiking
    }
  ],
  ${isOvernight ? `"food_plan": {
    "days": [
      {
        "day": number,
        "breakfast": string,
        "lunch": string,
        "dinner": string,
        "snacks": string
      }
    ],
    "totals": ["Breakfasts: N", "Lunches: N + 1 emergency", "Dinners: N + 1 extra", "Snacks: N × 2 slots"],
    "weight_guideline": string
  },` : ''}
  "gear_list": {
    "personal": [list of personal gear items as strings, scaled for season ${quiz.season} and type ${quiz.trip_type}],
    "shared": [list of shared group gear items as strings, scaled for ${groupNum} ${groupNum === 1 ? 'person' : 'people'}]
  },
  ${!isOvernight ? `"water_and_snacks": string describing how much water to carry and where to source it,` : ''}
  "evac_plan": {
    "general": [
      "Life-threatening emergency: Call 911 / press SOS on satellite communicator. Stay put.",
      "Uncertain situation: Assess, communicate, move toward safety before escalating."
    ],
    "sections": [
      {
        "day": number,
        "before_marker": string,
        "before_action": "Turn back the way you came",
        "after_marker": string,
        "after_action": string,
        "nearest_exit": string,
        "cell_service": "Good" | "Patchy" | "None"
      }
    ]
  },
  ${isKayak ? `"rapids": [
    {
      "name": string,
      "mile": string,
      "class": "I" | "II" | "III" | "IV" | "V",
      "description": string,
      "portage": string,
      "source": string
    }
  ],` : ''}
  "links": {
    "trail": ["${trail.source_url}"],
    "maps": [list of real map URLs for this trail],
    "trip_reports": [list of real trip report URLs],
    ${isKayak ? `"river_data": [list of real USGS/AW river data URLs]` : ''}
  },
  "safety_callouts": [list of safety notes for ${quiz.experience} experience level in ${quiz.season}]
}`

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const s = (msg: string) => controller.enqueue(encoder.encode(`s:${msg}\n`))
        try {
          // Fire first status immediately, then start Claude streaming right away.
          // Additional status messages are sent on a timer in parallel so the user
          // sees something meaningful while the model generates.
          s('Analyzing trail data...')

          const stream = anthropic.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 128000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          })

          // Real section detection — status fires when Claude actually reaches that section
          const SECTION_MARKERS: [string, string][] = [
            ['"type":',            'Starting DOPE sheet...'],
            ['"header":',          'Writing trip header...'],
            ['"trail_name":',      'Setting up trail overview...'],
            ['"duration":',        'Calculating duration...'],
            ['"days":',            'Mapping out your daily breakdown...'],
            ['"breaks":',          'Building break schedule...'],
            ['"gear_list":',       'Compiling gear list...'],
            ['"personal":',        'Listing personal gear...'],
            ['"shared":',          'Listing shared group gear...'],
            ['"food_plan":',       'Planning meals...'],
            ['"water_and_snacks":', 'Planning water & snacks...'],
            ['"evac_plan":',       'Drafting evacuation plan...'],
            ['"rapids":',          'Cataloging rapids & portages...'],
            ['"links":',           'Gathering source links...'],
            ['"safety_callouts":', 'Adding safety notes...'],
          ]
          // Accumulate server-side — only send s: status lines during generation.
          // JSON is sent as one clean chunk at the end so status lines never
          // get concatenated into JSON content mid-stream.
          let accumulated = ''
          const announced = new Set<string>()

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              accumulated += chunk.delta.text

              // Check if Claude has started a new section
              for (const [marker, msg] of SECTION_MARKERS) {
                if (!announced.has(marker) && accumulated.includes(marker)) {
                  announced.add(marker)
                  s(msg)
                }
              }
            }
          }

          // Strip markdown fences, validate JSON
          let json = accumulated.trim()
          json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
          const sheet = JSON.parse(json)

          // Throw out Claude's hallucinated links entirely.
          // Search the web for REAL pages about this specific trail,
          // verify each one contains content about THIS trail.
          const realLinks = await findRealLinks(trail, isKayak, s)
          sheet.links = realLinks

          controller.enqueue(encoder.encode(JSON.stringify({ sheet })))
          controller.close()
        } catch (err) {
          console.error('DOPE sheet stream error:', err)
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('DOPE sheet error:', err)
    return NextResponse.json({ error: 'Failed to generate DOPE sheet' }, { status: 500 })
  }
}
