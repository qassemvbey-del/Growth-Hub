'use client'

import { Lock } from 'lucide-react'
import React from 'react'
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion'
// import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'

interface RankData {
  id: string
  name: string
  threshold: number
  themeId: string
  color: string
  neonClass: string
  perk: string
  unlocks: string
  vessel: string
}

interface RankCardProps {
  rank: RankData
  status: 'EQUIPPED' | 'AVAILABLE' | 'LOCKED'
  xp: number
  isRTL: boolean
  currentTheme: {
    id: string
    name: string
    color: string
  }
  changeTheme: (themeId: string) => void
}

function RankCard({ rank, status, xp, isRTL, currentTheme, changeTheme }: RankCardProps) {
  const { getRankNeonClass } = useGrowth()
  const isLocked = status === 'LOCKED'
  const [isHovered, setIsHovered] = React.useState(false)

  // Motion values for smooth trail coordinates (prevents top-level component re-renders!)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Physics springs for buttery trailing cursors
  const springX = useSpring(mouseX, { stiffness: 280, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 280, damping: 25 })

  // Radial dynamic gradient background highlight - using active global theme's color
  const radialBg = useMotionTemplate`radial-gradient(280px circle at ${springX}px ${springY}px, ${currentTheme.color}15, transparent 80%)`

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex flex-col min-w-[320px] md:min-w-[350px] flex-shrink-0 snap-center h-[550px] justify-center transition-all duration-300"
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        animate={isHovered ? { scale: 1.015, y: -4 } : { scale: 1.0, y: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 180, 
          damping: 24,
          bounce: 0,
          layout: { duration: 0.3 }
        }}
        className={cn(
          "relative flex flex-col items-center cursor-none overflow-hidden group select-none w-full h-full",
          "bg-white/80 dark:bg-black/40 backdrop-blur-xl border rounded-2xl p-6 md:p-8",
          status === 'EQUIPPED'
            ? "z-10 shadow-2xl"
            : "border-zinc-200 dark:border-white/10"
        )}
        style={{
          borderColor: status === 'EQUIPPED' ? `${currentTheme.color}60` : undefined,
          boxShadow: status === 'EQUIPPED' 
            ? `0 0 30px ${currentTheme.color}20, 0 12px 40px rgba(0,0,0,0.6)` 
            : '0 8px 32px rgba(0,0,0,0.3)'
        }}
      >
        {/* Tier Inner Border Accent */}
        <div className={cn(
          "absolute inset-1 rounded-[14px] border pointer-events-none",
          rank.id === 'SILVER' ? 'border-slate-500/10' :
          rank.id === 'GOLD' ? 'border-yellow-500/10' :
          rank.id === 'PLATINUM' ? 'border-sky-500/10' :
          rank.id === 'DIAMOND' ? 'border-purple-500/10' :
          rank.id === 'CROWN' ? 'border-orange-500/10' :
          rank.id === 'ACE' ? 'border-red-500/10' : 'border-yellow-500/20'
        )} />

        {/* 1. Radial Spot Light Tracking Pointer */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: radialBg }}
        />

        {/* Rank Title */}
        <h2 className={cn(
          "text-4xl md:text-5xl font-black font-space mb-2 uppercase tracking-wider transition-transform duration-300 group-hover:scale-105",
          getRankNeonClass(rank.id)
        )}>
          {isRTL ? (
            rank.id === 'SILVER' ? 'سيلفر' :
            rank.id === 'GOLD' ? 'جولد' :
            rank.id === 'PLATINUM' ? 'بلاتينوم' :
            rank.id === 'DIAMOND' ? 'دايموند' :
            rank.id === 'CROWN' ? 'كراون' :
            rank.id === 'ACE' ? 'ايس' : 'كونكر'
          ) : rank.name}
        </h2>
        
        {/* Status Badge */}
        <div
          className="px-5 py-1.5 rounded-full font-space text-[10px] font-black tracking-widest mb-6 border transition-all duration-300"
          style={status === 'EQUIPPED'
            ? { backgroundColor: `${currentTheme.color}20`, borderColor: `${currentTheme.color}60`, color: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` }
            : { borderColor: `${rank.color}30`, color: `${rank.color}70` }
          }
        >
          {isRTL ? (
            status === 'EQUIPPED' ? 'نشط' :
            status === 'AVAILABLE' ? 'متاح' : 'غير متاح'
          ) : status}
        </div>

        {/* EnergyCell Visualization */}
        <div className="w-32 h-32 md:w-36 md:h-36 mb-4 relative flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.05]">
          <EnergyCell 
            percentage={75}
            color={rank.color}
            size="md"
          />
        </div>

        {/* 3. HOVER REVEAL DETAILS AND ACTIONS (Smooth Opacity Sync) */}
        <div className="w-full flex-grow flex flex-col justify-end">
          <motion.div
            animate={{ opacity: isHovered ? 1.0 : 0.0, height: isHovered ? 'auto' : 0 }}
            transition={{ duration: 0.3 }}
            className="w-full text-center overflow-hidden"
          >
            <div className="w-full space-y-4 text-center border-t border-zinc-200 dark:border-white/10 pt-4 mt-2">
              
              {/* XP Stagger */}
              <motion.div 
                animate={{ y: isHovered ? 0 : 3 }}
                transition={{ duration: 0.3 }}
                className="space-y-0.5"
              >
                {/* Commented out per safety rules:
                <p className="font-space text-[9px] text-zinc-500 dark:text-white/40 uppercase tracking-[0.25em] font-black">
                  {isRTL ? 'الخبرة المطلوبة' : 'XP REQUIRED'}
                </p>
                */}
                <p className="font-space text-[9px] text-zinc-500 dark:text-white/40 uppercase tracking-[0.25em] font-black">
                  {isRTL ? 'الخبرة المطلوبة' : 'XP Required'}
                </p>
                <p className="text-xl font-black font-space tracking-tight text-zinc-900 dark:text-white">
                  {rank.id === 'CONQUEROR' ? (
                    // Commented out per safety rules:
                    // isRTL ? 'المتصدر #1' : 'TOP #1 LEAD'
                    isRTL ? 'المتصدر #1' : 'Top #1 Leader'
                  ) : (
                    `${rank.threshold.toLocaleString()} XP`
                  )}
                </p>
              </motion.div>

              {/* Perk Stagger */}
              <motion.div 
                animate={{ y: isHovered ? 0 : 3 }}
                transition={{ duration: 0.3 }}
                className="space-y-0.5"
              >
                {/* Commented out per safety rules:
                <p className="font-space text-[9px] uppercase tracking-[0.25em] font-black" style={{ color: rank.color }}>
                  {isRTL ? 'الميزة النشطة' : 'ACTIVE PERK'}
                </p>
                */}
                <p className="font-space text-[9px] uppercase tracking-[0.25em] font-black" style={{ color: rank.color }}>
                  {isRTL ? 'الميزة النشطة' : 'Active Perk'}
                </p>
                <p className="text-[11px] font-bold font-space uppercase tracking-widest text-zinc-800 dark:text-white/80">
                  {isRTL ? (
                    rank.id === 'SILVER' ? 'الميزات القياسية مفتوحة' :
                    rank.id === 'GOLD' ? 'لقب تحت الاسم (hasTitle)' :
                    rank.id === 'PLATINUM' ? 'إطار حول الصورة (hasAvatarBorder)' :
                    rank.id === 'DIAMOND' ? 'تفاعلات شات حصرية (hasExclusiveEmojis)' :
                    rank.id === 'CROWN' ? 'توهج الاسم بالكامل (hasNameGlow)' :
                    rank.id === 'ACE' ? 'بطاقة هوية بالهوفر (hasCallingCard)' : 'اللقب المتصدر الأول + كافة الميزات الحصرية'
                  ) : rank.perk}
                </p>
              </motion.div>

              {/* Unlocks Stagger */}
              <motion.div 
                animate={{ y: isHovered ? 0 : 3 }}
                transition={{ duration: 0.3 }}
                className="space-y-0.5"
              >
                {/* Commented out per safety rules:
                <p className="font-space text-[9px] text-zinc-500 dark:text-white/40 uppercase tracking-[0.25em] font-black">
                  {isRTL ? 'ميزات الرتبة' : 'RANK UNLOCKS'}
                </p>
                */}
                <p className="font-space text-[9px] text-zinc-500 dark:text-white/40 uppercase tracking-[0.25em] font-black">
                  {isRTL ? 'ميزات الرتبة' : 'Rank Unlocks'}
                </p>
                <p className="text-[10px] font-space text-zinc-600 dark:text-white/60 tracking-wider">
                  {isRTL ? (
                    rank.id === 'SILVER' ? 'الوصول لصفحة الملاحظات والإعدادات' :
                    rank.id === 'GOLD' ? 'لقب خاص يظهر أسفل اسمك كعضو مميز' :
                    rank.id === 'PLATINUM' ? 'إطار نيون مضيء يحيط بصورتك الشخصية' :
                    rank.id === 'DIAMOND' ? 'صلاحية استخدام تفاعلات حصرية وملصقات نيون في الشات' :
                    rank.id === 'CROWN' ? 'تأثير توهج لوني مضيء لاسمك أينما يظهر' :
                    rank.id === 'ACE' ? 'بطاقة تعريفية مخصصة تظهر عند تمرير الماوس على صورتك' : 'الحصول على لقب بطل المنصة باللون المتدرج المتحرك وكامل الصلاحيات'
                  ) : rank.unlocks}
                </p>
              </motion.div>

              {/* Equip Button Stagger */}
              {status === 'AVAILABLE' && (
                <motion.button
                  animate={{ scale: isHovered ? 1.0 : 0.96, opacity: isHovered ? 1.0 : 0.7 }}
                  transition={{ duration: 0.3 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    changeTheme(rank.themeId)
                  }}
                  className="w-full py-2.5 font-space font-black text-[10px] uppercase tracking-widest transition-all duration-300 rounded-xl mt-3 border cursor-none"
                  style={{ borderColor: `${currentTheme.color}60`, color: currentTheme.color }}
                  onMouseEnter={e => { 
                    const el = e.currentTarget; 
                    el.style.backgroundColor = currentTheme.color; 
                    el.style.color = '#000';
                    el.style.boxShadow = `0 0 12px ${currentTheme.color}55`;
                  }}
                  onMouseLeave={e => { 
                    const el = e.currentTarget; 
                    el.style.backgroundColor = 'transparent'; 
                    el.style.color = currentTheme.color;
                    el.style.boxShadow = 'none';
                  }}
                >
                  {/* Commented out per safety rules:
                  {isRTL ? 'تفعيل المظهر' : 'EQUIP THEME'}
                  */}
                  {isRTL ? 'تفعيل المظهر' : 'Equip Theme'}
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Locked Overlay with Premium Hover Specs - No dynamic expansion */}
        {isLocked && (
          <div className="absolute inset-0 z-50 bg-white/90 dark:bg-black/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-zinc-200 dark:border-white/5 transition-opacity duration-300 group-hover:opacity-95">
            <Lock className="text-zinc-400 dark:text-white/30 text-5xl mb-3 group-hover:scale-110 group-hover:text-zinc-600 dark:group-hover:text-white/55 transition-all duration-300 w-12 h-12" />
            {/* Commented out per safety rules:
            <p className="text-zinc-500 dark:text-white/40 font-black font-space text-2xl tracking-widest uppercase">{isRTL ? 'غير متاح' : 'LOCKED'}</p>
            */}
            <p className="text-zinc-500 dark:text-white/40 font-black font-space text-2xl tracking-widest uppercase">{isRTL ? 'غير متاح' : 'Locked'}</p>
            
            <motion.div
              animate={{ opacity: isHovered ? 1.0 : 0.3 }}
              transition={{ duration: 0.3 }}
              className="w-full mt-4 space-y-1"
            >
              <p className="font-space text-[11px] tracking-[0.2em] font-black uppercase text-center" style={{ color: rank.color }}>
                {rank.id === 'CONQUEROR' ? (
                  // Commented out per safety rules:
                  // isRTL ? 'يتطلب الصدارة #1 في المنصة' : 'REQUIRES TOP #1 IN THE PLATFORM'
                  isRTL ? 'يتطلب الصدارة #1 في المنصة' : 'Requires Top #1 in the Platform'
                ) : (
                  // Commented out per safety rules:
                  // `${rank.threshold - xp} ${isRTL ? 'نقطة خبرة مطلوبة للتفعيل' : 'XP REQUIRED TO UNLOCK'}`
                  `${rank.threshold - xp} ${isRTL ? 'نقطة خبرة مطلوبة للتفعيل' : 'XP required to unlock'}`
                )}
              </p>
              <p className="text-[9px] font-space text-zinc-500 dark:text-white/40 tracking-wider uppercase text-center">
                {/* Commented out per safety rules:
                {isRTL ? 'استمر في إنجاز أهدافك' : 'CONTINUE ACHIEVING GOALS'}
                */}
                {isRTL ? 'استمر في إنجاز أهدافك' : 'Continue achieving goals'}
              </p>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export function VaultContent() {
  const { isRTL, profile, currentTheme, changeTheme } = useGrowth()
  const xp = profile?.xp || 0
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      // Only hijack vertical scroll if there's no horizontal scroll (e.g. standard mouse wheel)
      if (e.deltaY !== 0 && Math.abs(e.deltaX) === 0) {
        e.preventDefault()
        container.scrollBy({ left: e.deltaY > 0 ? 300 : -300, behavior: 'smooth' })
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Helper to determine rank status
  const getRankStatus = (threshold: number, themeId: string, rankId: string) => {
    if (rankId === 'CONQUEROR') {
      if (profile?.rank === 'CONQUEROR') {
        return profile?.active_theme === 'CONQUEROR' ? 'EQUIPPED' : 'AVAILABLE'
      }
      return 'LOCKED'
    }
    if (profile?.active_theme === themeId) return 'EQUIPPED'
    if (xp >= threshold) return 'AVAILABLE'
    return 'LOCKED'
  }

  const RANKS_DATA: RankData[] = [
    {
      id: 'SILVER',
      // Commented out per safety rules:
      // name: 'SILVER',
      name: 'Silver',
      threshold: 0,
      themeId: 'SILVER',
      color: '#94a3b8',
      neonClass: 'neon-silver',
      perk: 'Standard Features Unlocked',
      unlocks: 'Access to Notes and Settings pages',
      vessel: 'Cylinder'
    },
    {
      id: 'GOLD',
      // Commented out per safety rules:
      // name: 'GOLD',
      name: 'Gold',
      threshold: 400,
      themeId: 'GOLD',
      color: '#FACC15',
      neonClass: 'neon-gold',
      perk: 'Exclusive Title Badge',
      unlocks: 'Special title showing below username',
      vessel: 'Cylinder'
    },
    {
      id: 'PLATINUM',
      // Commented out per safety rules:
      // name: 'PLATINUM',
      name: 'Platinum',
      threshold: 1000,
      themeId: 'PLATINUM',
      color: '#38bdf8',
      neonClass: 'neon-platinum',
      perk: 'Premium Avatar Border',
      unlocks: 'Glow border framing profile picture',
      vessel: 'Hex'
    },
    {
      id: 'DIAMOND',
      // Commented out per safety rules:
      // name: 'DIAMOND',
      name: 'Diamond',
      threshold: 2000,
      themeId: 'DIAMOND',
      color: '#d500f9',
      neonClass: 'neon-diamond',
      perk: 'Exclusive Chat Emojis',
      unlocks: 'Special reactive emojis in squad threads',
      vessel: 'Crystal'
    },
    {
      id: 'CROWN',
      // Commented out per safety rules:
      // name: 'CROWN',
      name: 'Crown',
      threshold: 4000,
      themeId: 'CROWN',
      color: '#F97316',
      neonClass: 'neon-crown',
      perk: 'Name Neon Glow effect',
      unlocks: 'Vibrant custom neon glow around username',
      vessel: 'Crystal'
    },
    {
      id: 'ACE',
      // Commented out per safety rules:
      // name: 'ACE',
      name: 'Ace',
      threshold: 7000,
      themeId: 'ACE',
      color: '#EF4444',
      neonClass: 'neon-ace',
      perk: 'Player Calling Card',
      unlocks: 'Interactive profile card on user hover',
      vessel: 'Shard'
    },
    {
      id: 'CONQUEROR',
      // Commented out per safety rules:
      // name: 'CONQUEROR',
      name: 'Conqueror',
      threshold: 12000,
      themeId: 'CONQUEROR',
      color: '#FACC15',
      neonClass: 'neon-conqueror',
      perk: 'Top #1 Champion Dominance',
      unlocks: 'Exclusive animated dynamic gradient badge (Top XP Leader)',
      vessel: 'Sphere'
    }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-12">
      
      {/* Scrollbar hide utility styling */}
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none !important;
        }
        .scrollbar-none {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-black/10 dark:border-white/10 pb-4 md:pb-6 w-full max-w-full">
        <h1 className="text-2xl md:text-6xl font-black font-space tracking-wider text-black dark:text-white uppercase leading-none">
          {/* Commented out per safety rules:
          {isRTL ? 'الرتب والترقيات' : 'RANKS & SYSTEMS'}
          */}
          {isRTL ? 'الرتب والترقيات' : 'Ranks & Systems'}
        </h1>
        <p className="text-[10px] md:text-xs font-space text-black/40 dark:text-white/30 tracking-[0.4em] md:tracking-[0.6em] uppercase font-black mt-2">
          {isRTL ? 'مستوى تقدمك الحالي' : 'Your Progress Status'} &nbsp;·&nbsp; {xp.toLocaleString()} XP
        </p>
      </header>

      {/* Premium Gaming Echelon Slider Container */}
      <div 
        ref={containerRef} 
        className="flex flex-row overflow-x-auto snap-x snap-mandatory scrollbar-none pb-8 gap-6 w-full px-6"
      >
        {RANKS_DATA.map((rank) => {
          const status = getRankStatus(rank.threshold, rank.themeId, rank.id)

          return (
            <RankCard
              key={rank.id}
              rank={rank}
              status={status}
              xp={xp}
              isRTL={isRTL}
              currentTheme={currentTheme}
              changeTheme={changeTheme}
            />
          )
        })}
      </div>

    </div>
  )
}

export default function VaultPage() {
  return (
    <>
      <main className="p-4 md:p-12 min-h-screen">
        <VaultContent />
      </main>
    </>
  )
}
