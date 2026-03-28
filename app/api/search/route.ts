import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { SearchQuery } from '@/lib/types'

const SYSTEM_PROMPT = `You are TrailMind, an expert outdoor activity guide for the Northeast US (NY, NJ, CT, PA).
You know trails, paddling routes, and backpacking destinations in this region deeply.

You will receive a STRUCTURED search query with specific parameters. Use these parameters to find matching trails. Return a JSON array of 8 trail/activity suggestions. Each suggestion must be a REAL place that exists in the Northeast US.

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
    "source_url": "https://..."
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
    // Day hike — use hours directly to set expected trail length
    const pace = q.activity === 'kayak' ? 2.5 : 1.5
    const expectedMiles = Math.round(hours * pace)
    mileageNote = `\nThis is a ${hours}-hour day trip. Trails should take roughly ${hours} hours of active time (~${expectedMiles} miles at ${pace} mph). Do NOT return trails significantly shorter or longer than this.`
  } else if (days > 1) {
    // Multi-day — use hour ranges scaled from 5-day benchmarks
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
      // New structured search
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
          const data = { trails: JSON.parse(jsonText), query: queryLabel }
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
