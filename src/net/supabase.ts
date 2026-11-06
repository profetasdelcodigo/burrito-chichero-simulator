import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { PlayerProfile } from '../game/game'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null

export async function ensureAnonymousSession(): Promise<boolean> {
  if (!supabase) return false
  const existing = await supabase.auth.getSession()
  if (existing.data.session) return true
  const result = await supabase.auth.signInAnonymously()
  return !result.error
}

export async function savePlayerProfile(profile: PlayerProfile): Promise<void> {
  if (!supabase) return
  const session = (await supabase.auth.getSession()).data.session
  if (!session?.user.id) return
  await supabase.from('burrito_profiles').upsert({ user_id: session.user.id, display_name: profile.name, color: profile.color, accessory: profile.accessory, updated_at: new Date().toISOString() })
}

export async function saveMissionProgress(missionId: string, progress: Record<string, unknown>): Promise<void> {
  if (!supabase) return
  const session = (await supabase.auth.getSession()).data.session
  if (!session?.user.id) return
  await supabase.from('burrito_campaign_progress').upsert({ user_id: session.user.id, mission_id: missionId, progress, updated_at: new Date().toISOString() })
}
