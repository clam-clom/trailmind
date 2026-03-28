import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { SearchQuery } from '@/lib/types'

const SYSTEM_PROMPT = `You are TrailMind, an expert outdoor activity guide for the Northeast US (NY, NJ, CT, PA).
You know trails, paddling routes, and backpacking destinations in this region deeply.

You will receive a STRUCTURED search query with specific parameters. Use these parameters to find matching trails. Return a JSON array of 8 trail/activity suggestions. Each suggestion must be a REAL place that exists in the Northeast US.

DIFFICULTY RANKING — use these exact criteria:

EASY:
- Max 4 hours of active hiking per day
- Less than 1,000 ft elevation gain per day
- No rock scrambles
- Lots of places to get water
- Designated campsites available (if overnight)
- No rapids above Class I, no portages
- Under 4 hours of active paddling per day

MODERATE:
- Up to 6 hours of active hiking per day
- 500–1,000 ft elevation gain per day
- Easy rock scrambles only
- Lots of water sources, or slightly limited but manageable
- Designated campsites + backcountry campsites available
- Rapids max Class II½, OR over 4 hours of active paddling per day

HARD / STRENUOUS:
- Up to 7 hours of active hiking per day
- 1,000–2,500 ft elevation gain per day
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
  const duration = days === 1
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

  const parts = [
    `Find me 8 ${activity} options.`,
    `Duration: ${duration}.`,
    `Difficulty: ${difficulty}.`,
    `Distance: ${distance}.`,
  ]

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
      queryLabel = `${sq.activity} · ${sq.duration_days === 1 ? 'day trip' : sq.duration_days + ' days'} · ${sq.difficulty}`
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
