import { NextRequest, NextResponse } from 'next/server'
// NextResponse kept for error returns; streaming success uses raw Response
import { anthropic } from '@/lib/anthropic'
import { Trail, DopeSheetQuizAnswers } from '@/lib/types'

// ── Link resolution for DOPE sheets ──────────────────────────────
// Claude hallucinates URLs. We NEVER use Claude's links.
// Instead:
//   1. NPS trails → query the official NPS API (free, public, legal)
//   2. Everything else → construct Google search links the user clicks
// No DuckDuckGo scraping. No fetching random URLs. Fully legal.

const NPS_API_KEY = process.env.NPS_API_KEY || 'DEMO_KEY'

interface ResolvedLinks {
  trail: { url: string; label: string }[]
  maps: { url: string; label: string }[]
  trip_reports: { url: string; label: string }[]
  river_data?: { url: string; label: string }[]
}

// Search the NPS API for a specific trail
async function searchNps(trailName: string, stateCode: string): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 6000)
  try {
    const url = `https://developer.nps.gov/api/v1/thingstodo?q=${encodeURIComponent(trailName)}&stateCode=${stateCode.toLowerCase()}&limit=5&api_key=${NPS_API_KEY}`
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const json = await res.json()
    const nameLower = trailName.toLowerCase()
    for (const item of json.data || []) {
      const title = (item.title || '').toLowerCase()
      if (title.includes(nameLower) || nameLower.includes(title)) return item.url
      const coreName = nameLower.split(/\s*[—–:\-]\s*/)[0].trim()
      if (coreName.length > 5 && title.includes(coreName)) return item.url
    }
    return null
  } catch {
    clearTimeout(timer)
    return null
  }
}

function googleSearch(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

async function buildDopeLinks(
  trail: Trail,
  isKayak: boolean,
  statusFn: (msg: string) => void,
): Promise<ResolvedLinks> {
  const name = trail.name
  const state = trail.state
  const stateMap: Record<string, string> = { NY: 'ny', NJ: 'nj', CT: 'ct', PA: 'pa' }
  const stateCode = stateMap[state] || state.toLowerCase()

  statusFn('Building resource links...')

  const result: ResolvedLinks = {
    trail: [],
    maps: [],
    trip_reports: [],
  }
  if (isKayak) result.river_data = []

  // 1. Try NPS API for NPS-sourced trails
  if (trail.source === 'NPS') {
    const npsUrl = await searchNps(name, stateCode)
    if (npsUrl) {
      result.trail.push({ url: npsUrl, label: `${name} on NPS.gov` })
    }
  }

  // 2. Google search links for each category — always work, never broken
  result.trail.push({
    url: googleSearch(`"${name}" ${state} trail alltrails OR nps.gov OR dec.ny.gov`),
    label: `Search for ${name}`,
  })
  result.maps.push({
    url: googleSearch(`"${name}" ${state} trail map`),
    label: `${name} trail maps`,
  })
  result.trip_reports.push({
    url: googleSearch(`"${name}" ${state} trip report hiking`),
    label: `${name} trip reports`,
  })

  if (isKayak && result.river_data) {
    result.river_data.push({
      url: googleSearch(`"${name}" ${state} river gauge water level`),
      label: `${name} water levels`,
    })
    result.river_data.push({
      url: googleSearch(`"${name}" americanwhitewater.org`),
      label: `${name} on American Whitewater`,
    })
  }

  const total = result.trail.length + result.maps.length +
    result.trip_reports.length + (result.river_data?.length || 0)
  statusFn(`${total} resource links ready`)

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

    const durationDays = quiz.duration_days
    const isOvernight = durationDays > 1
    const isKayak = quiz.trip_type === 'kayak_day' || quiz.trip_type === 'kayak_expedition'

    // For very long trips (>14 days), cap the daily breakdown to keep
    // the output useful. Nobody plans day 47 from a single AI prompt.
    const isLongTrip = durationDays > 20
    const DAILY_CAP = 20

    const systemPrompt = `You are TrailMind's DOPE Sheet generator. You create NOLS-style trip planning documents for Northeast US outdoor trips. You follow a strict format derived from field-tested expedition planning.

HARD RULES — never break these:
1. Every trail, campsite, rapid, and landmark must be real and verifiable. If you cannot confidently name a real feature, write "[verify]" rather than inventing one.
2. Mileage, elevation, and time estimates must come from the trail data provided — never invent them. If a field is missing, write "[verify]".
3. Rapids must be sourced from American Whitewater, state river guides, or NPS. Do not invent rapid names or class ratings.
4. Legal campsites only. Only list designated or primitive FCFS sites on government sources. Never suggest "just camp anywhere."
5. For the "links" field, return empty arrays — links are handled separately via web search. Do not generate URLs from memory.

PACE & TIME FORMULAS:
- Average hiker: 1.5 mph + add 1 hour for every 1,000 ft of elevation gained or lost
- Average paddler: 2 mph in flat water / lakes / ponds, 3 mph in rivers / running water
- Kayak by class: 2.5 mph flatwater/Class I, 2.0 mph Class II, 1.5 mph or "scout + portage" Class III+
- HARD CAP: Never exceed 7–8 hours of active hiking per day. If a day would exceed this, split it across multiple days.
- HARD CAP: Never exceed 6 hours of active paddling per day. If a section would exceed this, split it.
- Water breaks: 5 min every 30 min of hiking
- Snack breaks: 10–15 min every 1 hour of hiking
- Allotted time = expected time + 30 min buffer
- LAYOVER DAYS: max 1 layover day per trip. Most days the group should be moving to their next campsite.

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
- Duration: ${quiz.duration_hours ? `${quiz.duration_hours} hours (day trip)` : `${quiz.duration_days} ${quiz.duration_days === 1 ? 'day' : 'days'}`}
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
    "trail": [],
    "maps": [],
    "trip_reports": []${isKayak ? `,
    "river_data": []` : ''}
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

          // Replace Claude's hallucinated links with real ones:
          // NPS trails get verified NPS API links, everything else gets Google search links
          const realLinks = await buildDopeLinks(trail, isKayak, s)
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
