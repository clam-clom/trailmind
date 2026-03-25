import { NextRequest, NextResponse } from 'next/server'
// NextResponse kept for error returns; streaming success uses raw Response
import { anthropic } from '@/lib/anthropic'
import { Trail, DopeSheetQuizAnswers } from '@/lib/types'

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

    const systemPrompt = `You are TrailMind's DOPE Sheet generator. You create NOLS-style trip planning documents for Northeast US outdoor trips. You follow a strict format derived from field-tested expedition planning.

HARD RULES — never break these:
1. Every trail, campsite, rapid, and landmark must be real and verifiable. If you cannot confidently name a real feature, write "[verify]" rather than inventing one.
2. Mileage, elevation, and time estimates must come from the trail data provided — never invent them. If a field is missing, write "[verify]".
3. Rapids must be sourced from American Whitewater, state river guides, or NPS. Do not invent rapid names or class ratings.
4. Legal campsites only. Only list designated or primitive FCFS sites on government sources. Never suggest "just camp anywhere."
5. Links must be real URLs from the trail data provided. Do not generate URLs from memory.

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
          let accumulated = ''
          const announced = new Set<string>()

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text
              accumulated += text
              controller.enqueue(encoder.encode(text))

              // Check if Claude has started a new section
              for (const [marker, msg] of SECTION_MARKERS) {
                if (!announced.has(marker) && accumulated.includes(marker)) {
                  announced.add(marker)
                  s(msg)
                }
              }
            }
          }

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
