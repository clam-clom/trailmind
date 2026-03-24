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
