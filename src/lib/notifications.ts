import { createClient } from '@/lib/supabase/browser'

export type NotificationType = 'warning' | 'reminder' | 'success' | 'info'

/**
 * Inserts a row into the `notifications` table for the given user.
 * Errors are logged but swallowed — a failed notification insert
 * should never block the primary action (saving a med, marking a dose, etc).
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, message, read: false })

  if (error) {
    console.error('Failed to create notification:', error.message)
  }
}