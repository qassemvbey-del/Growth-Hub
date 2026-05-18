'use client'

import React from 'react'
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import { useGrowth, THEME_PACKAGES } from '@/context/GrowthContext'
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
  const isLocked = status === 'LOCKED'
  const [isHovered, setIsHovered] = React.useState(false)

  // Motion values for smooth trail coordinates (prevents top-level component re-renders!)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Physics springs for buttery trailing cursors
  const springX = useSpring(mouseX, { stiffness: 280, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 280, damping: 25 })

  // Radial dynamic gradient background highlight
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
      className="relative flex flex-col flex-shrink-0 w-[85vw] sm:w-[380px] snap-center h-[560px] justify-center"
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
          "relative flex flex-col items-center cursor-none overflow-hidden group select-none w-full",
          "bg-black/40 backdrop-blur-xl border rounded-2xl p-6 md:p-8",
          status === 'EQUIPPED'
            ? "z-10 shadow-2xl"
            : "border-white/10"
        )}
        style={{
          borderColor: status === 'EQUIPPED' ? `${rank.color}50` : 'rgba(255, 255, 255, 0.1)',
          boxShadow: status === 'EQUIPPED' 
            ? `0 0 30px ${rank.color}15, 0 12px 40px rgba(0,0,0,0.6)` 
            : '0 8px 32px rgba(0,0,0,0.3)'
        }}
      >
        {/* 1. Radial Spot Light Tracking Pointer */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: radialBg }}
        />

        {/* Rank Title */}
        <h2 className="text-4xl md:text-5xl font-black font-space mb-2 uppercase tracking-wider transition-transform duration-300 group-hover:scale-105" style={{ color: rank.color }}>
          {isRTL ? (
            rank.id === 'SILVER' ? 'سيلفر' :
            rank.id === 'PLATINUM' ? 'بلاتينوم' :
            rank.id === 'CROWN' ? 'كراون' :
            rank.id === 'ACE' ? 'ايس' : 'كونكر'
          ) : rank.name}
        </h2>
        
        {/* Status Badge */}
        <div
          className="px-5 py-1.5 rounded-full font-space text-[10px] font-black tracking-widest mb-6 border transition-all duration-300"
          style={status === 'EQUIPPED'
            ? { backgroundColor: `${rank.color}20`, borderColor: `${rank.color}60`, color: rank.color, boxShadow: `0 0 15px ${rank.color}33` }
            : { borderColor: `${rank.color}30`, color: `${rank.color}70` }
          }
        >
          {isRTL ? (
            status === 'EQUIPPED' ? 'متفعّل' :
            status === 'AVAILABLE' ? 'متاح' : 'مقفول'
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

        {/* 3. HOVER REVEAL DETAILS AND ACTIONS (Smooth Opacity Sync - Zero Layout Shift) */}
        <div className="w-full flex-grow flex flex-col justify-end">
          <motion.div
            animate={{ opacity: isHovered ? 1.0 : 0.0, height: isHovered ? 'auto' : 0 }}
            transition={{ duration: 0.3 }}
            className="w-full text-center overflow-hidden"
          >
            <div className="w-full space-y-4 text-center border-t border-white/10 pt-4 mt-2">
              
              {/* XP Stagger */}
              <motion.div 
                animate={{ y: isHovered ? 0 : 3 }}
                transition={{ duration: 0.3 }}
                className="space-y-0.5"
              >
                <p className="font-space text-[9px] text-white/40 uppercase tracking-[0.25em] font-black">
                  {isRTL ? 'الخبرة المطلوبة' : 'XP REQUIRED'}
                </p>
                <p className="text-xl font-black font-space tracking-tight">
                  {rank.threshold.toLocaleString()} <span className="text-xs opacity-50 font-bold">XP</span>
                </p>
              </motion.div>

              {/* Perk Stagger */}
              <motion.div 
                animate={{ y: isHovered ? 0 : 3 }}
                transition={{ duration: 0.3 }}
                className="space-y-0.5"
              >
                <p className="font-space text-[9px] uppercase tracking-[0.25em] font-black" style={{ color: rank.color }}>
                  {isRTL ? 'الميزة النشطة' : 'ACTIVE SYSTEM PERK'}
                </p>
                <p className="text-[11px] font-bold font-space uppercase tracking-widest text-white/80">
                  {rank.perk}
                </p>
              </motion.div>

              {/* Unlocks Stagger */}
              <motion.div 
                animate={{ y: isHovered ? 0 : 3 }}
                transition={{ duration: 0.3 }}
                className="space-y-0.5"
              >
                <p className="font-space text-[9px] text-white/40 uppercase tracking-[0.25em] font-black">
                  {isRTL ? 'مكافأة فتح القفل' : 'INTELLIGENCE UNLOCKS'}
                </p>
                <p className="text-[10px] font-space text-white/60 tracking-wider">
                  {rank.unlocks}
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
                  style={{ borderColor: `${rank.color}60`, color: rank.color }}
                  onMouseEnter={e => { 
                    const el = e.currentTarget; 
                    el.style.backgroundColor = rank.color; 
                    el.style.color = '#000';
                    el.style.boxShadow = `0 0 12px ${rank.color}55`;
                  }}
                  onMouseLeave={e => { 
                    const el = e.currentTarget; 
                    el.style.backgroundColor = 'transparent'; 
                    el.style.color = rank.color;
                    el.style.boxShadow = 'none';
                  }}
                >
                  {isRTL ? 'استخدم البروتوكول' : 'EQUIP SYSTEM THEME'}
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Locked Overlay with Premium Hover Specs - No dynamic expansion */}
        {isLocked && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-white/5 transition-opacity duration-300 group-hover:opacity-95">
            <span className="material-symbols-outlined text-white/30 text-5xl mb-3 group-hover:scale-110 group-hover:text-white/55 transition-all duration-300">lock</span>
            <p className="text-white/40 font-black font-space text-2xl tracking-widest uppercase">{isRTL ? 'مقفول' : 'LOCKED'}</p>
            
            <motion.div
              animate={{ opacity: isHovered ? 1.0 : 0.3 }}
              transition={{ duration: 0.3 }}
              className="w-full mt-4 space-y-1"
            >
              <p className="text-white/80 font-space text-[11px] tracking-[0.2em] font-black uppercase" style={{ color: rank.color }}>
                {rank.threshold - xp} {isRTL ? 'خبرة مطلوبة للفتح' : 'XP REQUIRED TO UNLOCK'}
              </p>
              <p className="text-[9px] font-space text-white/40 tracking-wider uppercase">
                {isRTL ? 'استمر في إنهاء المهمات اليومية' : 'CONTINUE COMPLETING ACTIVE MISSIONS'}
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
      if (e.deltaY !== 0) {
        e.preventDefault()
        container.scrollLeft += e.deltaY
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Helper to determine rank status
  const getRankStatus = (threshold: number, themeId: string) => {
    if (profile?.active_theme === themeId) return 'EQUIPPED'
    if (xp >= threshold) return 'AVAILABLE'
    return 'LOCKED'
  }

  const RANKS_DATA: RankData[] = [
    {
      id: 'SILVER',
      name: 'SILVER',
      threshold: 0,
      themeId: 'SILVER',
      color: '#B0C4DE',
      neonClass: 'neon-silver',
      perk: 'Standard Operator Kit',
      unlocks: 'Access to Personal Notes Canvas & System Configs',
      vessel: 'Cylinder'
    },
    {
      id: 'PLATINUM',
      name: 'PLATINUM',
      threshold: 500,
      themeId: 'PLATINUM',
      color: '#00CED1',
      neonClass: 'neon-platinum',
      perk: 'Advanced HUD Uplink',
      unlocks: 'Dynamic Platform Interface Color Customization',
      vessel: 'Hex'
    },
    {
      id: 'CROWN',
      name: 'CROWN',
      threshold: 1500,
      themeId: 'CROWN',
      color: '#9370DB',
      neonClass: 'neon-crown',
      perk: 'Empathetic AI Persona Sync',
      unlocks: 'Real-time System Calibration & Settings Controls',
      vessel: 'Shard'
    },
    {
      id: 'ACE',
      name: 'ACE',
      threshold: 4000,
      themeId: 'ACE',
      color: '#DC143C',
      neonClass: 'neon-ace',
      perk: 'Tactical HUD Analytics',
      unlocks: 'Advanced Mission Priorities & Capacity Expansion',
      vessel: 'Shard'
    },
    {
      id: 'CONQUEROR',
      name: 'CONQUEROR',
      threshold: 10000,
      themeId: 'CONQUEROR',
      color: '#FFD700',
      neonClass: 'neon-conqueror',
      perk: 'Ultimate Glitch FX Theme Override',
      unlocks: 'Full System Autonomy & Prestige Calibrators',
      vessel: 'Sphere'
    }
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-16">
      
      {/* Hide Scrollbars Local CSS Style Block */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .hide-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
      
      {/* Header */}
      <header className="border-b border-black/10 dark:border-white/10 pb-4 md:pb-6 w-full max-w-full">
        <h1 className="text-2xl md:text-6xl font-black font-space tracking-wider text-black dark:text-white uppercase leading-none">
          {isRTL ? 'الرتب' : 'RANKS'}
        </h1>
        <p className="text-[10px] md:text-xs font-space text-black/40 dark:text-white/30 tracking-[0.4em] md:tracking-[0.6em] uppercase font-black mt-2">
          {isRTL ? 'مستوى تقدمك الحالي' : 'Your Progress Status'} &nbsp;·&nbsp; {xp.toLocaleString()} XP
        </p>
      </header>

      {/* Swipeable Horizontal Slider Carousel Layout */}
      <div ref={containerRef} className="flex flex-row gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 w-full scroll-smooth hide-scrollbar">
        {RANKS_DATA.map((rank) => {
          const status = getRankStatus(rank.threshold, rank.themeId)

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
    <Shell>
      <main className="p-4 md:p-12 min-h-screen">
        <VaultContent />
      </main>
    </Shell>
  )
}
