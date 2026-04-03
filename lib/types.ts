export interface Trail {
  id: string
  name: string
  region: string
  state: string
  activity: 'hike' | 'backpack' | 'kayak_flatwater' | 'kayak_whitewater'
  difficulty: 'easy' | 'moderate' | 'hard' | 'strenuous'
  distance_miles: number
  elevation_gain_ft: number | null
  estimated_hours: number
  distance_from_nyc_miles: number
  tags: string[]
  description: string
  transit_accessible: boolean
  permit_required: boolean
  source: 'NYNJTC' | 'NPS' | 'AllTrails' | 'AW' | 'NYS DEC'
  source_url: string
  _linkLabel?: string // "Find on Google" or undefined (means direct link)
}

export interface SearchResponse {
  trails: Trail[]
  query: string
}

// ── Structured Search ─────────────────────────────────────────────────────────

export interface SearchQuery {
  activity: 'hike' | 'backpack' | 'kayak_flatwater' | 'kayak_whitewater'
  duration_days: number // 1-30
  duration_hours?: number // 1-16, used for day hikes instead of days
  difficulty: 'easy' | 'moderate' | 'hard' | 'strenuous' | 'surprise'
  distance_from_nyc: 'under_1hr' | '1-2hrs' | '2-3hrs' | '3plus' | 'any'
  season: 'spring' | 'summer' | 'fall' | 'winter'
  features: string[]
  notes: string // max 200 chars
  critique?: string // from "Not quite" re-search, max 300 chars
}

export type InteractionStatus = 'saved' | 'completed' | 'passed' | 'critiqued'

export interface Interaction {
  trail_id: string
  trail_name: string
  activity_type: string
  status: InteractionStatus
  critique_text?: string
  review_difficulty?: number
  review_loved?: string
  review_disliked?: string
  would_repeat?: boolean
  rating?: number
}

// ── DOPE Sheet ────────────────────────────────────────────────────────────────

export interface DopeSheetQuizAnswers {
  trip_type: 'hike' | 'backpack' | 'kayak_day' | 'kayak_expedition'
  group_size: 'solo' | '2' | '3-4' | string // '5+' reveals numeric input (5-12)
  duration_days: number // 1-30
  duration_hours?: number // 1-16, for day trips (hike / kayak_day)
  season: 'spring' | 'summer' | 'fall' | 'winter'
  experience: 'first_timer' | 'some_experience' | 'comfortable' | 'very_experienced'
  pack_category?: 'ultralight' | 'standard' | 'heavy' | 'unknown' // overnight only
}

export interface DopeSheetDay {
  day: number
  label: string
  total_distance_miles: number
  elevation_gain_ft: number
  expected_pace_mph: number
  expected_time: string
  allotted_time: string
  start_position: string
  end_position: string
  campsite?: string
  bailout_marker: string
  turnaround_time?: string // day hikes only — "If not at [midpoint] by [time], turn back"
  breaks: string[]
  // kayak-specific
  class_rating?: string
  put_in?: string
  take_out?: string
}

export interface FoodDay {
  day: number
  breakfast: string
  lunch: string
  dinner: string
  snacks: string
}

export interface FoodPlan {
  days: FoodDay[]
  totals: string[]
  weight_guideline: string
  summary?: string // For long trips (>14 days) — replaces per-day breakdown
}

export interface GearList {
  personal: string[]
  shared: string[]
}

export interface PackWeightEstimate {
  base_gear_lbs: string   // range from user category, e.g. "18–22 lbs"
  food_lbs: number        // calculated from phased rates × carry days
  water_lbs: number       // from water carry calc, first segment
  estimated_total: string // range like "35–42 lbs"
  warning?: string        // populated if dangerous weight
}

export interface ResupplyPlan {
  required: boolean
  max_carry_days: number
  resupply_intervals: { after_day: number; method_suggestion: string }[]
  total_food_weight_lbs: number
  disclaimer: string
}

export interface EvacSection {
  day: number
  before_marker: string
  before_action: string
  after_marker: string
  after_action: string
  nearest_exit: string
  cell_service: string
}

export interface EvacPlan {
  general: string[]
  sections: EvacSection[]
}

export interface Rapid {
  name: string
  mile: string
  class: string
  description: string
  portage: string
  source: string
}

export type LinkItem = string | { url: string; label: string }

export interface DopeSheetLinks {
  trail: LinkItem[]
  maps: LinkItem[]
  trip_reports: LinkItem[]
  river_data?: LinkItem[]
}

export interface DopeSheet {
  type: 'hike' | 'backpack' | 'kayak_day' | 'kayak_expedition'
  header: {
    trail_name: string
    total_distance: string
    elevation_or_class: string
    duration: string
    participants: string
    start: string
    end: string
  }
  days: DopeSheetDay[]
  food_plan?: FoodPlan
  gear_list: GearList
  pack_weight_estimate?: PackWeightEstimate
  resupply_plan?: ResupplyPlan
  water_and_snacks?: string
  evac_plan: EvacPlan
  rapids?: Rapid[]
  links: DopeSheetLinks
  safety_callouts: string[]
}
