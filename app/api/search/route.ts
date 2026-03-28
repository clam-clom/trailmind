import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { SearchQuery, Trail } from '@/lib/types'

// ── Link resolution ──────────────────────────────────────────────────
// Claude hallucinates URLs. We NEVER use Claude's source_url.
// Instead:
//   1. NPS trails → query the official NPS API (free, public, legal)
//   2. Everything else → construct a Google search link the user clicks
// No DuckDuckGo scraping. No fetching random URLs. No hallucinated links.

const NPS_API_KEY = process.env.NPS_API_KEY || 'DEMO_KEY'

interface NpsResult {
  url: string
  title: string
}

// Search the NPS "things to do" endpoint for a specific trail/activity
async function searchNps(trailName: string, stateCode: string): Promise<NpsResult | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 6000)
  try {
    // Try "things to do" first — this has specific hikes/trails
    const ttdUrl = `https://developer.nps.gov/api/v1/thingstodo?q=${encodeURIComponent(trailName)}&stateCode=${stateCode.toLowerCase()}&limit=5&api_key=${NPS_API_KEY}`
    const res = await fetch(ttdUrl, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return null

    const json = await res.json()
    const nameLower = trailName.toLowerCase()

    // Look for a result whose title contains the trail name
    for (const item of json.data || []) {
      const title = (item.title || '').toLowerCase()
      if (title.includes(nameLower) || nameLower.includes(title)) {
        return { url: item.url, title: item.title }
      }
      // Try matching core name (before dashes/colons)
      const coreName = nameLower.split(/\s*[—–:\-]\s*/)[0].trim()
      if (coreName.length > 5 && title.includes(coreName)) {
        return { url: item.url, title: item.title }
      }
    }

    // Fallback: try parks endpoint for the broader area
    const ctrl2 = new AbortController()
    const timer2 = setTimeout(() => ctrl2.abort(), 5000)
    const parksUrl = `https://developer.nps.gov/api/v1/parks?q=${encodeURIComponent(trailName)}&stateCode=${stateCode.toLowerCase()}&limit=3&api_key=${NPS_API_KEY}`
    const res2 = await fetch(parksUrl, { signal: ctrl2.signal })
    clearTimeout(timer2)
    if (!res2.ok) return null

    const json2 = await res2.json()
    for (const park of json2.data || []) {
      const fullName = (park.fullName || '').toLowerCase()
      const coreName = nameLower.split(/\s*[—–:\-]\s*/)[0].trim()
      if (fullName.includes(coreName) || coreName.includes(fullName)) {
        return { url: park.url, title: park.fullName }
      }
    }

    return null
  } catch {
    clearTimeout(timer)
    return null
  }
}

// Build a Google search link for a trail — user clicks this to find the real page
function buildSearchLink(trailName: string, state: string): string {
  const query = `"${trailName}" ${state} trail alltrails OR nps.gov OR dec.ny.gov`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

// Resolve a real link for each trail
async function resolveLink(trail: Trail): Promise<{ url: string; label: string }> {
  const stateMap: Record<string, string> = { NY: 'ny', NJ: 'nj', CT: 'ct', PA: 'pa' }
  const stateCode = stateMap[trail.state] || trail.state.toLowerCase()

  // For NPS-sourced trails, try the official API first
  if (trail.source === 'NPS') {
    const npsResult = await searchNps(trail.name, stateCode)
    if (npsResult) {
      return { url: npsResult.url, label: 'View on NPS' }
    }
  }

  // For all other sources (or if NPS lookup failed), use a Google search link
  return {
    url: buildSearchLink(trail.name, trail.state),
    label: 'Find on Google',
  }
}

// ── System prompt ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are TrailMind, an expert outdoor activity guide for the Northeast US (NY, NJ, CT, PA).
You know trails, paddling routes, and backpacking destinations in this region deeply.

You will receive a STRUCTURED search query with specific parameters. Use these parameters to find matching trails. Return a JSON array of 8 trail/activity suggestions. Each suggestion must be a REAL place that exists in the Northeast US.

IMPORTANT — URLs:
- Set source_url to an EMPTY STRING for every trail. Do NOT generate URLs. Links are handled separately.
- Still set "source" to the correct data source name (e.g. "NPS", "AllTrails", "NYS DEC").

PACE CALCULATIONS:
- Average hiker: 1.5 mph + add 1 hour for every 1,000 ft of elevation gained or lost
- Average paddler: 2 mph in flat water / lakes / ponds, 3 mph in rivers / running water

DIFFICULTY RANKING — use these exact criteria:

EASY:
- 4 hours of active hiking per day
- Less than 1,000 ft elevation per day
- No rock scrambles
- Lots of places to get water
- Designated campsites (if overnight)
- No rapids above Class I, no portages
- Under 4 hours of active paddling per day

MODERATE:
- 6 hours of active hiking per day
- 500–1,000 ft elevation per day
- Easy rock scrambles only
- Lots of water sources, or slightly limited but manageable
- Designated campsites + backcountry campsites
- Rapids max Class II½, OR over 4 hours of active paddling per day

HARD / STRENUOUS:
- 7 hours of active hiking per day
- 1,000–2,500 ft elevation per day
- Rock scrambles present
- Limited or no water sources
- Very few campsites
- Rapids Class II½ and above
- Portages required
- 6+ hours of active paddling per day

DAY LIMITS — never exceed these:
- Hiking: max 7–8 hours of active hiking per day
- Paddling: max 6 hours of active paddling per day
- The "estimated_hours" field must reflect ACTUAL active time, not drive time

MULTI-DAY TRIP HOUR RANGES — use these to size trails correctly:
Hiking (per 5 days, scale proportionally):
- 5-day easy = 10–20 hrs active hiking total
- 5-day moderate = 20–30 hrs active hiking total
- 5-day strenuous = 25–35 hrs active hiking total
Paddling (per 5 days, scale proportionally):
- 5-day easy = 5–20 hrs active paddling total
- 5-day moderate = 15–25 hrs active paddling total
- 5-day strenuous = 30–35 hrs active paddling total

LAYOVER DAYS: max 1 layover day per trip. Most days the group should be moving/hiking/paddling to their next campsite.

CRITICAL — TRAIL LENGTH MUST MATCH DURATION:
- Use the pace calculations and hour ranges above to determine minimum trail distance.
- If the user requests a multi-day trip (2+ days), ONLY return trails/routes long enough to fill that many days. A 4-mile trail CANNOT be a 12-day hike.
- Multi-day hiking trips (2+ days) must be thru-hikes, long loops, or point-to-point routes — NOT short day-hike loops.
- Use the length of trail and its topography to determine actual time. Do not guess.

Return ONLY valid JSON, no other text. Format:
[
  {
    "id": "unique-slug",
    "name": "Trail or route name",
    "region": "Park or area name",
    "state": "NY",
    "activity": "hike" | "backpack" | "kayak",
    "difficulty": "easy" | "moderate" | "hard" | "strenuous",
    "distance_miles": number,
    "elevation_gain_ft": number | null,
    "estimated_hours": number,
    "distance_from_nyc_miles": number,
    "tags": ["summit", "views", "waterfall", "forest", "solitude", "wildlife", "history"],
    "description": "2-3 sentence description of what makes this trail special",
    "transit_accessible": boolean,
    "permit_required": boolean,
    "source": "NYNJTC" | "NPS" | "AllTrails" | "AW" | "NYS DEC",
    "source_url": ""
  }
]

Data sources (ONLY suggest trails from these):
- AllTrails (alltrails.com) — largest trail database
- NY-NJ Trail Conference / NYNJTC (nynjtc.org) — NY/NJ trails
- NPS (nps.gov) — national parks, Appalachian Trail, Delaware Water Gap
- NYS DEC (dec.ny.gov) — Catskills, Adirondacks, state lands
- American Whitewater / AW (americanwhitewater.org) — kayaking/paddling routes
- PA DCNR (dcnr.pa.gov) — Pennsylvania state forests and parks
- CT DEEP (portal.ct.gov/DEEP) — Connecticut state parks
- AMC / Appalachian Mountain Club (outdoors.org) — Northeast trails

Prioritize lesser-known trails over the obvious ones. Do not always recommend Breakneck Ridge.
Rank results by how well they match ALL of the specified parameters — best match first.`

// Build a controlled natural-language prompt from the structured query
function buildUserPrompt(q: SearchQuery): string {
  const activity = { hike: 'day hike', backpack: 'backpacking trip', kayak: 'kayaking trip' }[q.activity]

  const days = q.duration_days
  const hours = q.duration_hours
  const duration = hours && days === 1
    ? `day hike, about ${hours} hour${hours === 1 ? '' : 's'} of active hiking (back same day)`
    : days === 1
      ? 'day trip (back same day)'
      : `${days}-day / ${days - 1}-night trip`

  const difficulty = q.difficulty === 'surprise'
    ? 'any difficulty level'
    : `${q.difficulty} difficulty`

  const distance = {
    under_1hr: 'under 1 hour drive from NYC (under 60 miles)',
    '1-2hrs': '1-2 hour drive from NYC (60-120 miles)',
    '2-3hrs': '2-3 hour drive from NYC (120-180 miles)',
    '3plus': '3+ hour drive from NYC (180+ miles)',
    any: 'any distance from NYC',
  }[q.distance_from_nyc]

  // Calculate minimum hours and miles so Claude can't return short trails for long trips
  let mileageNote = ''
  if (hours && days === 1) {
    const pace = q.activity === 'kayak' ? 2.5 : 1.5
    const expectedMiles = Math.round(hours * pace)
    mileageNote = `\nThis is a ${hours}-hour day trip. Trails should take roughly ${hours} hours of active time (~${expectedMiles} miles at ${pace} mph). Do NOT return trails significantly shorter or longer than this.`
  } else if (days > 1) {
    const isKayak = q.activity === 'kayak'
    const hoursPerFiveDays = isKayak
      ? { easy: 5, moderate: 15, hard: 30, strenuous: 30, surprise: 5 }[q.difficulty]
      : { easy: 10, moderate: 20, hard: 25, strenuous: 25, surprise: 10 }[q.difficulty]
    const minHours = Math.round(hoursPerFiveDays * (days / 5))
    const pace = isKayak ? 2.5 : 1.5
    const minMiles = Math.round(minHours * pace)
    mileageNote = `\nThis is a ${days}-day trip. MINIMUM active hours: ~${minHours}h. MINIMUM total distance: ~${minMiles} miles (at ${pace} mph avg pace). Do NOT return any trail shorter than this. Use trail length and topography to verify.`
  }

  const parts = [
    `Find me 8 ${activity} options.`,
    `Duration: ${duration}.`,
    `Difficulty: ${difficulty}.`,
    `Distance: ${distance}.`,
    mileageNote,
  ].filter(Boolean)

  if (q.features.length > 0) {
    parts.push(`I want: ${q.features.join(', ')}.`)
  }

  if (q.notes.trim()) {
    const notes = q.notes.trim().slice(0, 200)
    parts.push(`Additional notes: ${notes}`)
  }

  return parts.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let userPrompt: string
    let queryLabel: string

    if (body.structured) {
      const sq: SearchQuery = body.structured
      userPrompt = buildUserPrompt(sq)
      queryLabel = sq.duration_hours && sq.duration_days === 1
        ? `${sq.activity} · ${sq.duration_hours}h · ${sq.difficulty}`
        : `${sq.activity} · ${sq.duration_days === 1 ? 'day trip' : sq.duration_days + ' days'} · ${sq.difficulty}`
    } else if (body.query && typeof body.query === 'string') {
      // Legacy free-text (critique re-search from ActionBar still uses this)
      userPrompt = body.query
      queryLabel = body.query
    } else {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const s = (msg: string) => controller.enqueue(encoder.encode(`s:${msg}\n`))
        try {
          s('Searching...')

          const stream = anthropic.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          })

          let accumulated = ''
          let trailCount = 0
          const NAME_RE = /"name":\s*"([^"]+)"/g

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              accumulated += chunk.delta.text

              const names = [...accumulated.matchAll(NAME_RE)]
              if (names.length > trailCount) {
                const latest = names[names.length - 1][1]
                trailCount = names.length
                s(`Found: ${latest}`)
              }
            }
          }

          s(`Done — ${trailCount} trails found`)

          let jsonText = accumulated.trim()
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
          }
          const trails: Trail[] = JSON.parse(jsonText)

          // Resolve real links for every trail
          s('Finding real links...')
          const linkResults = await Promise.allSettled(
            trails.map((t) => resolveLink(t))
          )
          for (let i = 0; i < trails.length; i++) {
            const r = linkResults[i]
            if (r.status === 'fulfilled') {
              trails[i].source_url = r.value.url
              // Store the label so the UI knows what to show
              // We piggyback on the source field for display:
              // "NPS" stays "NPS" if we got a direct link,
              // otherwise we change source display to indicate it's a search link
              if (r.value.label === 'Find on Google') {
                trails[i]._linkLabel = 'Find on Google'
              }
            } else {
              // Promise rejected — use Google search fallback
              trails[i].source_url = buildSearchLink(trails[i].name, trails[i].state)
              trails[i]._linkLabel = 'Find on Google'
            }
          }

          s(`${trails.length} trails ready`)
          const data = { trails, query: queryLabel }
          controller.enqueue(encoder.encode(JSON.stringify(data)))
        } catch (err) {
          console.error('Search error:', err)
          controller.enqueue(encoder.encode(`s:Something went wrong\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
