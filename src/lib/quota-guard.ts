import { createAdminClient } from '@/lib/supabase-admin'

export interface QuotaCheckResult {
  allowed: boolean
  message_en?: string
  message_ar?: string
}

export async function checkAndUpdateAiQuota(userId: string): Promise<QuotaCheckResult> {
  try {
    const supabase = createAdminClient()

    // Call stored procedure atomically
    const { data, error } = await supabase.rpc('check_and_increment_quota', {
      p_user_id: userId
    })

    if (error) {
      console.error('Database error in checkAndUpdateAiQuota RPC:', error)
      return {
        allowed: false,
        message_en: 'System validation failed. Please try again later.',
        message_ar: 'فشل التحقق من كوتة الاستخدام. يرجى المحاولة مرة أخرى لاحقاً.'
      }
    }

    // const result = data as { allowed: boolean; lang: string } | null
    const result = typeof data === 'string'
      ? JSON.parse(data) as { allowed: boolean; lang: string }
      : data as { allowed: boolean; lang: string } | null

    if (!result || !result.allowed) {
      return {
        allowed: false,
        message_en: 'Your 12-hour AI request limit has been reached. Please wait for the automatic cooldown or unlock instantly with an AI Refill Pack for only 15 EGP.',
        message_ar: 'لقد نفدت كوتة استعلامات الذكاء الاصطناعي الخاصة بك لهذه الـ 12 ساعة. يرجى الانتظار حتى التجديد التلقائي أو الشحن الفوري لباقة التصفير بـ 15 ج.م فقط.'
      }
    }

    return { allowed: true }
  } catch (err) {
    console.error('System error in checkAndUpdateAiQuota:', err)
    return {
      allowed: false,
      message_en: 'An unexpected error occurred during quota validation.',
      message_ar: 'حدث خطأ غير متوقع أثناء التحقق من كوتة الاستخدام.'
    }
  }
}
