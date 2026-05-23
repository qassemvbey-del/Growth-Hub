import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase-admin'
import fs from 'fs'
import path from 'path'

// Helper to convert avatar path/URL to base64, avoiding localhost network requests in Satori
async function getAvatarDataUrl(avatarUrl: string, origin: string): Promise<string | null> {
  try {
    if (!avatarUrl) return null

    // 1. If it's a local avatar path in public/
    if (avatarUrl.startsWith('/')) {
      const cleanPath = avatarUrl.split('?')[0] // remove query params
      const filePath = path.join(process.cwd(), 'public', cleanPath)
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath)
        const ext = path.extname(cleanPath).replace('.', '')
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`
        return `data:${mime};base64,${fileBuffer.toString('base64')}`
      }
    }

    // 2. If it's an absolute URL
    const absoluteUrl = avatarUrl.startsWith('http') ? avatarUrl : `${origin}${avatarUrl}`
    // On localhost, we want to try to fetch it, but wrap it in a safe try/catch
    const res = await fetch(absoluteUrl, { next: { revalidate: 60 } })
    if (res.ok) {
      const buffer = await res.arrayBuffer()
      const contentType = res.headers.get('content-type') || 'image/png'
      const base64 = Buffer.from(buffer).toString('base64')
      return `data:${contentType};base64,${base64}`
    }
  } catch (err) {
    console.error('Failed to resolve avatar data URL:', err)
  }
  return null
}



const RANK_THEMES: Record<string, { name: string; color: string; glow: string }> = {
  SILVER: { name: 'SILVER', color: '#94a3b8', glow: 'rgba(148, 163, 184, 0.4)' },
  GOLD: { name: 'GOLD', color: '#ffcc00', glow: 'rgba(255, 204, 0, 0.4)' },
  PLATINUM: { name: 'PLATINUM', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' },
  DIAMOND: { name: 'DIAMOND', color: '#d500f9', glow: 'rgba(213, 0, 249, 0.4)' },
  CROWN: { name: 'CROWN', color: '#FACC15', glow: 'rgba(250, 204, 21, 0.4)' },
  ACE: { name: 'ACE', color: '#F97316', glow: 'rgba(249, 115, 22, 0.4)' },
  CONQUEROR: { name: 'CONQUEROR', color: '#EF4444', glow: 'rgba(239, 68, 68, 0.5)' }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { origin } = new URL(request.url)

  try {
    const supabase = createAdminClient()
    const { data: mission, error } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('id', id)
      .single()

    if (error || !mission) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000000',
              fontFamily: 'monospace, sans-serif',
              border: '2px solid rgba(255, 0, 0, 0.2)',
              padding: '40px',
            }}
          >
            <div style={{ display: 'flex', color: '#EF4444', fontSize: '36px', fontWeight: 'bold', marginBottom: '20px' }}>
              خطأ // ERROR 404
            </div>
            <div style={{ display: 'flex', color: '#FFFFFF', fontSize: '56px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic' }}>
              المهمة غير موجودة // GOAL NOT FOUND
            </div>
          </div>
        ),
        { width: 1200, height: 630 }
      )
    }

    // Fetch the operator profile to extract true rank and color schemes
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', mission.user_id)
      .single()

    // Get squad members count if squad goal
    let squadMemberCount = 0
    if (mission.metadata?.type === 'squad') {
      const { count } = await supabase
        .from('goal_members')
        .select('*', { count: 'exact', head: true })
        .eq('goal_id', id)
      squadMemberCount = count || 0
    }

    const xp = profile?.xp || 0
    let userRank = 'SILVER'
    if (xp >= 10000) userRank = 'CONQUEROR'
    else if (xp >= 6000) userRank = 'ACE'
    else if (xp >= 3500) userRank = 'CROWN'
    else if (xp >= 1800) userRank = 'DIAMOND'
    else if (xp >= 800) userRank = 'PLATINUM'

    const activeTheme = profile?.active_theme || userRank
    let cleanTheme = activeTheme
    if (cleanTheme === 'INIT_GREEN') cleanTheme = 'SILVER'
    else if (cleanTheme === 'GOLD_BURST') cleanTheme = 'GOLD'
    else if (cleanTheme === 'PLATINUM_PULSE') cleanTheme = 'PLATINUM'
    else if (cleanTheme === 'DIAMOND_GLOW') cleanTheme = 'DIAMOND'
    else if (cleanTheme === 'CROWN_SHADOW') cleanTheme = 'CROWN'
    else if (cleanTheme === 'ACE_STRIKE') cleanTheme = 'ACE'
    else if (cleanTheme === 'CONQUEROR_SUPREME') cleanTheme = 'CONQUEROR'

    const rankTheme = RANK_THEMES[cleanTheme] || RANK_THEMES[userRank] || RANK_THEMES.SILVER
    const rankColor = rankTheme.color
    const rankName = rankTheme.name

    const tasks = mission.tasks || []
    const totalWeight = tasks.reduce((acc: number, t: any) => acc + (Number(t.weight) || 1), 0)
    const completedWeight = tasks.reduce((acc: number, t: any) => acc + (t.is_completed ? (Number(t.weight) || 1) : 0), 0)
    const progress = totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100)

    const completedCount = tasks.filter((t: any) => t.is_completed).length
    const totalCount = tasks.length

    // -------------------------------------------------------------------------
    // V18.3 NEW ACHIEVEMENT CARD FOR 100% COMPLETION
    // -------------------------------------------------------------------------
    if (progress >= 100) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000000',
              color: '#FFFFFF',
              fontFamily: 'sans-serif',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Special Golden Aura Background */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '800px',
                height: '800px',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${rankColor}55 0%, transparent 70%)`,
                opacity: 0.8,
              }}
            />

            {/* Glowing Golden Crystal Trophy */}
            <div style={{ display: 'flex', position: 'relative', marginBottom: '40px', filter: `drop-shadow(0 0 40px ${rankColor})` }}>
              <svg width="200" height="260" viewBox="0 0 60 80">
                <defs>
                  <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="50%" stopColor={rankColor} />
                    <stop offset="100%" stopColor="#000000" />
                  </linearGradient>
                </defs>
                <polygon points="30,2 8,25 5,55 30,72 55,55 52,25" fill="url(#gold-grad)" />
                <g stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="1">
                  <line x1="30" y1="2" x2="15" y2="40" />
                  <line x1="30" y1="2" x2="45" y2="40" />
                  <line x1="8" y1="25" x2="52" y2="25" />
                  <line x1="15" y1="40" x2="45" y2="40" />
                  <line x1="15" y1="40" x2="8" y2="25" />
                  <line x1="45" y1="40" x2="52" y2="25" />
                  <line x1="30" y1="72" x2="15" y2="40" />
                  <line x1="30" y1="72" x2="45" y2="40" />
                </g>
              </svg>
            </div>

            {/* Achievement Text */}
            <div
              style={{
                display: 'flex',
                fontSize: '28px',
                fontWeight: 'bold',
                letterSpacing: '0.4em',
                color: rankColor,
                textTransform: 'uppercase',
                marginBottom: '16px',
                fontFamily: 'monospace',
                textShadow: `0 0 20px ${rankColor}`,
              }}
            >
              اكتملت المهمة // GOAL COMPLETED
            </div>
            <h1
              style={{
                display: 'flex',
                fontSize: '72px',
                fontWeight: 900,
                fontStyle: 'italic',
                textTransform: 'uppercase',
                margin: 0,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                textAlign: 'center',
                maxWidth: '1000px',
                wordBreak: 'break-word',
                textShadow: '0 4px 10px rgba(0,0,0,0.8)',
              }}
            >
              {mission.title}
            </h1>
          </div>
        ),
        {
          width: 1200,
          height: 630,
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        }
      )
    }

    // Fetch time stats for focus
    const { data: timeLogs } = await supabase.from('time_logs').select('duration_minutes').eq('cup_id', id)
    const totalTimeInvested = (timeLogs || []).reduce((acc: number, row: any) => acc + (row.duration_minutes || 0), 0)
    const hours = Math.floor(totalTimeInvested / 60)
    const mins = totalTimeInvested % 60
    
    const isRTL = /[\u0600-\u06FF]/.test(mission.title || '')
    const userFullName = profile?.full_name || 'OPERATOR'
    const customAvatar = profile?.custom_avatar || (profile?.avatar_url?.startsWith('/avatars/') ? profile.avatar_url : null)
    const googleAvatar = profile?.avatar_url?.startsWith('http') ? profile.avatar_url : null
    const defaultAvatar = (profile?.gender === 'female' || profile?.gender === 'أنثى' || profile?.gender === 'Female') ? '/avatars/menna.svg' : '/avatars/omar.svg'
    const resolvedAvatarUrl = customAvatar || googleAvatar || defaultAvatar
    const avatarDataUrl = await getAvatarDataUrl(resolvedAvatarUrl, origin)


    // -------------------------------------------------------------------------
    // V18.4 CYBERPUNK PLAYER ID CARD (NEON BORDER)
    // -------------------------------------------------------------------------
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            backgroundColor: '#000000',
            fontFamily: 'sans-serif',
            padding: '40px',
            boxSizing: 'border-box',
          }}
        >
          {/* THE CONTAINER (NEON GLOW BORDER) */}
          <div
            style={{
              display: 'flex',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              width: '100%',
              height: '100%',
              backgroundColor: '#050507',
              border: `4px solid ${rankColor}`,
              borderRadius: '24px',
              boxShadow: `0 0 60px ${rankColor}88, inset 0 0 40px ${rankColor}33`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background Grid & Matrix inside the card */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexWrap: 'wrap', opacity: 0.15 }}>
              {Array.from({ length: 32 }).map((_, i) => (
                <div key={i} style={{ width: '138px', height: '135px', borderRight: `1px solid ${rankColor}`, borderBottom: `1px solid ${rankColor}` }} />
              ))}
            </div>

            {/* Central Glow Aura */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%', transform: 'translate(-50%, -50%)', background: `radial-gradient(circle, ${rankColor}15 0%, transparent 70%)`, pointerEvents: 'none' }} />

            {/* THE PROFILE & STATS BLOCK */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '50px',
                zIndex: 10,
                alignItems: isRTL ? 'flex-end' : 'flex-start',
                textAlign: isRTL ? 'right' : 'left',
                borderRight: !isRTL ? `2px solid ${rankColor}33` : 'none',
                borderLeft: isRTL ? `2px solid ${rankColor}33` : 'none',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              }}
            >
              {/* User Header */}
              <div style={{ display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
                {avatarDataUrl ? (
                  <img src={avatarDataUrl} style={{ width: '90px', height: '90px', borderRadius: '50%', border: `3px solid ${rankColor}`, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: `3px solid ${rankColor}`, backgroundColor: `${rankColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '36px', fontWeight: 'bold' }}>
                    {userFullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                    {mission.metadata?.type === 'squad' 
                      ? `SQUAD OF ${squadMemberCount} // MISSION IN PROGRESS` 
                      : 'MISSION IN PROGRESS // GROWTH HUB'}
                  </span>
                  <span style={{ color: '#FFFFFF', fontSize: '42px', fontWeight: '900', textTransform: 'uppercase', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>{userFullName}</span>
                </div>
              </div>

              {/* Stats Array */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '24px', fontFamily: 'monospace' }}>Rank:</span>
                  <span style={{ color: rankColor, fontSize: '28px', fontWeight: '900', textTransform: 'uppercase', textShadow: `0 0 15px ${rankColor}` }}>{rankName}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '24px', fontFamily: 'monospace' }}>Goal Title:</span>
                  <span style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: 'bold', maxWidth: '350px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: isRTL ? 'left' : 'right' }}>{mission.title}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '24px', fontFamily: 'monospace' }}>Total Tasks:</span>
                  <span style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace' }}>{totalCount}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '24px', fontFamily: 'monospace' }}>Done Tasks:</span>
                  <span style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace' }}>{completedCount}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%', paddingBottom: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '24px', fontFamily: 'monospace' }}>Total Focus:</span>
                  <span style={{ color: rankColor, fontSize: '28px', fontWeight: '900', fontFamily: 'monospace', textShadow: `0 0 10px ${rankColor}88` }}>{hours}h {mins}m</span>
                </div>
              </div>
            </div>

            {/* THE HERO VISUAL (THE POWER CRYSTAL) */}
            <div style={{ display: 'flex', flex: 0.8, alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'flex', width: '280px', height: '360px', position: 'relative', justifyContent: 'center', alignItems: 'center', filter: `drop-shadow(0 0 40px ${rankColor}55)` }}>
                <svg width="280" height="360" viewBox="0 0 60 80" style={{ overflow: 'visible' }}>
                  <defs>
                    <clipPath id="crystal-clip">
                      <polygon points="30,2 8,25 5,55 30,72 55,55 52,25" />
                    </clipPath>
                    <linearGradient id="liquid-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor={rankColor} stopOpacity="0.3" />
                      <stop offset="70%" stopColor={rankColor} stopOpacity="0.8" />
                      <stop offset="100%" stopColor={rankColor} stopOpacity="1" />
                    </linearGradient>
                  </defs>

                  {/* Dynamic Liquid Fill clipped inside the crystal shape */}
                  {progress > 0 && (
                    <rect 
                      x="0" 
                      y={72 - 70 * (progress / 100)} 
                      width="60" 
                      height={70 * (progress / 100)} 
                      fill="url(#liquid-grad)" 
                      clipPath="url(#crystal-clip)"
                    />
                  )}

                  {/* Highlight line at top of liquid for pure fluid emission */}
                  {progress > 0 && progress < 100 && (
                    <line 
                      x1="0" 
                      y1={72 - 70 * (progress / 100)} 
                      x2="60" 
                      y2={72 - 70 * (progress / 100)} 
                      stroke="#FFFFFF" 
                      strokeWidth="2" 
                      clipPath="url(#crystal-clip)"
                      style={{ filter: `drop-shadow(0 0 10px #FFFFFF)` }}
                    />
                  )}

                  {/* Outer crystal border wireframe */}
                  <polygon points="30,2 8,25 5,55 30,72 55,55 52,25" fill="none" stroke={rankColor} strokeWidth="2.5" />
                  
                  {/* Inner facet lines */}
                  <g stroke={rankColor} strokeOpacity="0.5" strokeWidth="1">
                    <line x1="30" y1="2" x2="15" y2="40" />
                    <line x1="30" y1="2" x2="45" y2="40" />
                    <line x1="8" y1="25" x2="52" y2="25" />
                    <line x1="15" y1="40" x2="45" y2="40" />
                    <line x1="15" y1="40" x2="8" y2="25" />
                    <line x1="45" y1="40" x2="52" y2="25" />
                    <line x1="30" y1="72" x2="15" y2="40" />
                    <line x1="30" y1="72" x2="45" y2="40" />
                  </g>
                  <ellipse cx="30" cy="72" rx="15" ry="3" fill={rankColor} opacity="0.4" />
                </svg>

                {/* Glowing Percentage text inside the crystal */}
                <div
                  style={{
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '48px',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    textShadow: `0 0 20px ${rankColor}, 0 0 40px ${rankColor}`,
                  }}
                >
                  {progress}%
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (err) {
    console.error('OG_GENERATION_FAILED:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
