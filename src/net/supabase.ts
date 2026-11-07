import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { PlayerProfile } from '../game/game'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null

/**
 * Establishes the anonymous identity before cloud-backed actions are enabled.
 * Returns false when Supabase is not configured or authentication is unavailable,
 * allowing the local game to remain playable.
 */
export async function ensureAnonymousSession(): Promise<boolean> {
  if (!supabase) return false

  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) return false
    if (data.session?.user.id) return true

    const result = await supabase.auth.signInAnonymously()
    return !result.error && Boolean(result.data.session?.user.id)
  } catch {
    return false
  }
}

export async function savePlayerProfile(profile: PlayerProfile): Promise<boolean> {
  if (!supabase) return false

  try {
    const { data, error: sessionError } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    if (sessionError || !userId) return false

    const { error } = await supabase.from('burrito_profiles').upsert({
      user_id: userId,
      display_name: profile.name,
      color: profile.color,
      accessory: profile.accessory,
    })
    return !error
  } catch {
    return false
  }
}

export async function saveMissionProgress(
  missionId: string,
  progress: Record<string, unknown>,
): Promise<boolean> {
  if (!supabase || !missionId.trim() || missionId.length > 64) return false

  try {
    const { data, error: sessionError } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    if (sessionError || !userId) return false

    const { error } = await supabase.from('burrito_campaign_progress').upsert({
      user_id: userId,
      mission_id: missionId,
      progress,
    })
    return !error
  } catch {
    return false
  }
}
