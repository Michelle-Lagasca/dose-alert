import { createClient } from '@/lib/supabase/browser'

/**
 * Single source of truth for translating raw stock numbers (and expiry) into
 * a status label. Used by the Medications page (manual edits) AND the
 * Reminders page (automatic stock deduction when a dose is marked taken/missed),
 * so the threshold below only ever needs to change in one place.
 *
 * `adherenceRate` (0–1) is optional and only matters once the end date has
 * passed: if the course was taken consistently (>= COMPLETION_THRESHOLD),
 * it's labeled 'completed' instead of 'expired'.
 */
const COMPLETION_THRESHOLD = 0.8 // 80% of logged doses taken

export function deriveStatus(
  stock: number,
  totalStock: number,
  endDate: string | null,
  adherenceRate?: number | null,
): string {
  if (endDate && new Date(endDate) < new Date()) {
    if (adherenceRate != null && adherenceRate >= COMPLETION_THRESHOLD) return 'completed'
    return 'expired'
  }
  if (totalStock > 0 && stock / totalStock <= 0.25) return 'low-stock'
  return 'active'
}

/**
 * Adherence rate (0–1) for a medication, based on its logged dose_logs
 * ('taken' vs 'missed'). Returns null if there's nothing logged yet.
 *
 * Caveat: this only counts doses the user explicitly marked taken/missed.
 * Reminders that were never acted on (left as 'upcoming') aren't counted
 * either way, so this can overstate adherence if doses were silently skipped.
 */
export async function getAdherenceRate(medicationId: string): Promise<number | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('dose_logs')
    .select('status')
    .eq('medication_id', medicationId)
    .in('status', ['taken', 'missed'])

  if (error || !data || data.length === 0) return null

  const taken = data.filter((d) => d.status === 'taken').length
  return taken / data.length
}