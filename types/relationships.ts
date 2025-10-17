export type RelationshipWithCharacters = {
  id: string
  project_id: string
  character_a_id: string
  character_b_id: string
  relationship_type: string
  description?: string
  strength: number
  is_positive: boolean
  status: string
  starts_at?: string | null
  ends_at?: string | null
  key_moments?: string[] | null
  character_a?: { id: string; name: string; role: string }
  character_b?: { id: string; name: string; role: string }
}
