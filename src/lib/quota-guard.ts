import { User } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { AI_DAILY_LIMIT } from '@/lib/features'

export type QuotaGuardResult =
  | {
      ok: true
      user: User
      remaining: number
    }
  | {
      ok: false
      status: 401
      error: string
      message_en: string
      message_ar: string
    }
  | {
      ok: false
      status: 429
      error: string
      message_ar: string
      message_en: string
    }
  | {
      ok: false
      status: 500
      error: string
      message_en: string
      message_ar: string
    }

export async function requireUserAndQuota(): Promise<QuotaGuardResult> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        ok: false,
        status: 401,
        error: 'Unauthorized',
        message_en: 'Unauthorized',
        message_ar: 'غير مصرح'
      }
    }

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.rpc('check_and_increment_quota', {
      p_user_id: user.id,
      p_limit: AI_DAILY_LIMIT
    })

    if (error) {
      console.error('Database error in check_and_increment_quota RPC:', error)
      return {
        ok: false,
        status: 500,
        error: 'Server error',
        message_en: 'Server error. Please try again later.',
        message_ar: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.'
      }
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data

    if (!result || !result.allowed) {
      return {
        ok: false,
        status: 429,
        error: 'Daily AI limit reached',
        message_ar: 'وصلت للحد اليومي (20 طلب). بيتجدد بكرة.',
        message_en: 'You have reached the daily limit (20 requests). It resets tomorrow.'
      }
    }

    return {
      ok: true,
      user,
      remaining: typeof result.remaining === 'number' ? result.remaining : 0
    }
  } catch (err) {
    console.error('System error in requireUserAndQuota:', err)
    return {
      ok: false,
      status: 500,
      error: 'Server error',
      message_en: 'Server error. Please try again later.',
      message_ar: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.'
    }
  }
}
