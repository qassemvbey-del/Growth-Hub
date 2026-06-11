'use client'

const TWELVE_HOURS = 12 * 60 * 60 * 1000

export interface QuotaInfo {
  used: number
  limit: number
  nextResetMs: number
}

export const QUOTA_LIMITS: Record<string, number> = {
  fix_errors: 20,
  explain_topic: 15,
  generate_checklist: 10
}

export function getFeatureUsage(key: string): QuotaInfo {
  if (typeof window === 'undefined') {
    return { used: 0, limit: QUOTA_LIMITS[key] || 10, nextResetMs: 0 }
  }
  const limit = QUOTA_LIMITS[key] || 10
  const now = Date.now()
  const history = JSON.parse(localStorage.getItem(`ai_quota_${key}`) || '[]') as number[]
  const validHistory = history.filter(ts => now - ts < TWELVE_HOURS)
  
  if (validHistory.length !== history.length) {
    localStorage.setItem(`ai_quota_${key}`, JSON.stringify(validHistory))
  }

  let nextResetMs = 0
  if (validHistory.length > 0) {
    const oldest = Math.min(...validHistory)
    nextResetMs = oldest + TWELVE_HOURS
  }

  return {
    used: validHistory.length,
    limit,
    nextResetMs
  }
}

export function incrementFeatureUsage(key: string): { allowed: boolean; nextResetMs?: number } {
  if (typeof window === 'undefined') {
    return { allowed: true }
  }
  const { used, limit, nextResetMs } = getFeatureUsage(key)
  if (used >= limit) {
    return { allowed: false, nextResetMs }
  }
  const now = Date.now()
  const history = JSON.parse(localStorage.getItem(`ai_quota_${key}`) || '[]') as number[]
  const validHistory = history.filter(ts => now - ts < TWELVE_HOURS)
  validHistory.push(now)
  localStorage.setItem(`ai_quota_${key}`, JSON.stringify(validHistory))
  return { allowed: true }
}
