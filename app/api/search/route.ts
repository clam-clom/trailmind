import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

const SYSTEM_PROMPT = `You are TrailMind, an expert outdoor activity guide for the Northeast US (NY, NJ, CT, PA).
You know trails, paddling routes, and backpacking destinations in this region deeply.
When given a natural language search query, return a JSON array of 8 trail/activity suggestions. Each suggestion must be a REAL place that exists in the Northeast US.

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

Draw from these data sources when suggesting trails:
- NY-NJ Trail Conference (NYNJTC) — best source for NY/NJ trails
- NPS — national parks (Delaware Water Gap, Appalachian Trail, Gateway)
- NYS DEC — Catskills, Adirondacks state lands
- American Whitewater — kayaking/paddling routes
- PA DCNR — Pennsylvania state forests and parks
- CT DEEP — Connecticut state parks

Prioritize lesser-known trails over the obvious ones. Do not always recommend Breakneck Ridge.
Rank results by how well they match the query — best match first.`

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const s = (msg: string) => controller.enqueue(encoder.encode(`s:${msg}\n`))
        try {
          s('Searching...')

          // Stream from Claude so we can detect trail names as they're written
          const stream = anthropic.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: query }],
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

              // Each time Claude finishes writing a trail name, fire a real status
              const names = [...accumulated.matchAll(NAME_RE)]
              if (names.length > trailCount) {
                const latest = names[names.length - 1][1]
                trailCount = names.length
                s(`Found: ${latest}`)
              }
            }
          }

          s(`Done — ${trailCount} trails found`)

          // Strip markdown fences if present, parse, wrap, send
          let jsonText = accumulated.trim()
          if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
          }
          const data = { trails: JSON.parse(jsonText), query }
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
