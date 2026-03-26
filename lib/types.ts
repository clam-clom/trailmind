export interface Trail {
  id: string
  name: string
  region: string
  state: string
  activity: 'hike' | 'backpack' | 'kayak'
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
}

export interface SearchResponse {
  trails: Trail[]
  query: string
}

// ── Structured Search ─────────────────────────────────────────────────────────

export interface SearchQuery {
  activity: 'hike' | 'backpack' | 'kayak'
  duration: 'day' | '1_night' | '2-3_nights' | '4-7_nights' | '7-14_nights'
  difficulty: 'easy' | 'moderate' | 'hard' | 'strenuous' | 'surprise'
  distance_from_nyc: 'under_1hr' | '1-2hrs' | '2-3hrs' | '3plus' | 'any'
  features: string[]
  notes: string // max 200 chars
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
  group_size: 'solo' | '2' | '3-4' | '5+'
  duration: 'day' | '1_night' | '2-3_nights' | '4+_nights'
  season: 'spring' | 'summer' | 'fall' | 'winter'
  experience: 'first_timer' | 'some_experience' | 'comfortable' | 'very_experienced'
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

export interface DopeSheetLinks {
  trail: string[]
  maps: string[]
  trip_reports: string[]
  river_data?: string[]
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
  water_and_snacks?: string
  evac_plan: EvacPlan
  rapids?: Rapid[]
  links: DopeSheetLinks
  safety_callouts: string[]
}
