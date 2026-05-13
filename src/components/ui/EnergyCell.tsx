'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface EnergyCellProps {
  percentage: number
  label?: string
  subLabel?: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  isInRedZone?: boolean
  cupStyle?: 'cylinder' | 'hex' | 'crystal' | 'shard' | 'sphere'
}

const COLORS = {
  green: {
    primary: '#39FF14',
    glow: 'rgba(57, 255, 20, 0.35)',
    glowSoft: 'rgba(57, 255, 20, 0.08)',
    text: 'text-green-700 dark:text-[#39FF14]',
    border: '#39FF14',
  },
  blue: {
    primary: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.35)',
    glowSoft: 'rgba(0, 240, 255, 0.08)',
    text: 'text-cyan-700 dark:text-[#00F0FF]',
    border: '#00F0FF',
  },
  purple: {
    primary: '#b600f8',
    glow: 'rgba(182, 0, 248, 0.35)',
    glowSoft: 'rgba(182, 0, 248, 0.08)',
    text: 'text-purple-700 dark:text-[#b600f8]',
    border: '#b600f8',
  },
  red: {
    primary: '#FF0000',
    glow: 'rgba(255, 0, 0, 0.35)',
    glowSoft: 'rgba(255, 0, 0, 0.08)',
    text: 'text-red-700 dark:text-[#FF0000]',
    border: '#FF0000',
  },
}

const SIZES = {
  sm: { w: 80, h: 120 },
  md: { w: 100, h: 152 },
  lg: { w: 128, h: 192 },
}

export default function EnergyCell({ percentage, label, subLabel, color, size = 'md', isInRedZone, cupStyle = 'cylinder' }: EnergyCellProps) {
  const isHex = color?.startsWith('#')
  const config = isInRedZone 
    ? COLORS.red 
    : isHex 
      ? {
          primary: color,
          glow: `${color}59`,
          glowSoft: `${color}14`,
          text: '', // Managed via style
          border: color,
        }
      : (COLORS[color as keyof typeof COLORS] || COLORS.green)
  
  const { w, h } = SIZES[size]
  const clampedPct = Math.round(Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage)))
  const fillHeight = (clampedPct / 100) * h

  return (
    <div className="flex flex-col items-center gap-6 group">
      <div className="relative">
        
        {/* CONQUEROR: Orbiting Rings */}
        {cupStyle === 'sphere' && (
           <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute border border-white/10"
                  style={{ 
                    width: w * (1 + i * 0.15), 
                    height: w * (1 + i * 0.15), 
                    borderRadius: '50%',
                    borderColor: `${config.primary}${i === 1 ? '44' : '22'}`,
                    rotateX: i * 30,
                    rotateY: i * 45
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10 / i, repeat: Infinity, ease: "linear" }}
                />
              ))}
           </div>
        )}

        {/* Cell Body */}
        <motion.div
          className="relative overflow-hidden group/cell z-10"
          style={{
            width: w,
            height: h,
            background: 'transparent',
            border: 'none',
            borderRadius: cupStyle === 'cylinder' ? '30px' :
                          cupStyle === 'hex' ? '12px' :
                          cupStyle === 'crystal' ? '4px' :
                          cupStyle === 'shard' ? '24px 4px 24px 4px' :
                          cupStyle === 'sphere' ? '50%' : '16px',
            background: cupStyle === 'cylinder' 
                          ? 'linear-gradient(135deg, rgba(176,196,222,0.1) 0%, rgba(112,128,144,0.4) 50%, rgba(47,79,79,0.8) 100%)'
                          : cupStyle === 'sphere' 
                          ? 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(218,165,32,0.5) 50%, rgba(184,134,11,0.8) 100%)'
                          : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%)',
          }}
          animate={isInRedZone ? {
            boxShadow: [
              `0 0 20px ${config.glow}, inset 0 0 30px ${config.glowSoft}`,
              `0 0 40px ${config.glow}, inset 0 0 50px ${config.glowSoft}`,
              `0 0 20px ${config.glow}, inset 0 0 30px ${config.glowSoft}`,
            ]
          } : {
            boxShadow: `0 0 15px ${config.glowSoft}, inset 0 8px 16px rgba(255,255,255,0.2), inset 0 -8px 16px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Glass & Material Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/60 dark:from-white/5 dark:to-black/80 backdrop-blur-md z-0" 
               style={{
                 boxShadow: `inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.7)`,
                 opacity: cupStyle === 'cylinder' || cupStyle === 'sphere' ? 0.3 : 1
               }}
          />

          {/* PLATINUM: Vertical Energy Streams */}
          {cupStyle === 'hex' && (
            <div className="absolute inset-0 z-0 flex justify-around opacity-30">
               {[1, 2, 3].map(i => (
                 <motion.div 
                   key={i}
                   className="w-[1px] h-full"
                   style={{ background: `linear-gradient(to bottom, transparent, ${config.primary}, transparent)` }}
                   animate={{ y: [-h, h] }}
                   transition={{ duration: 3 / i, repeat: Infinity, ease: "linear" }}
                 />
               ))}
            </div>
          )}

          {/* CROWN: Pulsing Inner Light */}
          {cupStyle === 'crystal' && (
            <motion.div 
              className="absolute inset-0 z-0 flex items-center justify-center"
              animate={{ opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-12 h-12 rounded-full blur-2xl" style={{ backgroundColor: config.primary }} />
            </motion.div>
          )}

          {/* ACE: Leakage Particles */}
          {cupStyle === 'shard' && (
            <div className="absolute inset-0 z-10 pointer-events-none">
               {[1, 2, 3, 4, 5].map(i => (
                 <motion.div 
                   key={i}
                   className="absolute w-1 h-1 rounded-full"
                   style={{ backgroundColor: config.primary, left: `${20 + i * 15}%`, top: `${10 + i * 15}%` }}
                   animate={{ 
                     y: [0, -20, 0], 
                     x: [0, 10, 0],
                     opacity: [0, 1, 0],
                     scale: [0.5, 1, 0.5]
                   }}
                   transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                 />
               ))}
            </div>
          )}

          {/* Liquid fill */}
          <motion.div
            className="absolute bottom-0 left-0 w-full"
            initial={{ height: 0 }}
            animate={{ height: fillHeight }}
            transition={{ duration: 2.2, ease: 'easeInOut' }}
            style={{
              background: `linear-gradient(to top, ${config.primary}60, ${config.primary}10)`,
              boxShadow: `0 0 15px ${config.primary}30`,
            }}
          >
            <div
              className="absolute top-0 left-0 w-full"
              style={{
                height: '1.5px',
                background: config.primary,
                boxShadow: `0 0 12px ${config.primary}`,
              }}
            />
          </motion.div>

          {/* SILVER: High-Tech Grid */}
          <div className="absolute inset-0 z-0 pointer-events-none">
             {[25, 50, 75].map((tick) => (
               <div
                 key={tick}
                 className="absolute left-0 w-full"
                 style={{
                   bottom: `${tick}%`,
                   height: '1px',
                   background: `${config.primary}${cupStyle === 'cylinder' ? '33' : '18'}`,
                   boxShadow: cupStyle === 'cylinder' ? `0 0 5px ${config.primary}22` : 'none'
                 }}
               />
             ))}
             {cupStyle === 'cylinder' && [20, 40, 60, 80].map(x => (
                <div key={x} className="absolute top-0 bottom-0 w-[1px]" style={{ left: `${x}%`, background: `${config.primary}11` }} />
             ))}
          </div>

          {/* Outer Border */}
          <div className="absolute inset-0 pointer-events-none z-20" 
               style={{ 
                 border: `1px solid ${config.border}60`,
                 borderRadius: 'inherit',
                 boxShadow: `inset 0 0 10px ${config.border}20, 0 4px 20px rgba(0,0,0,0.4)`
               }} 
          />

          {/* Percentage overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span
              className="font-space font-black text-lg md:text-xl tracking-tighter text-gray-900 dark:text-white"
              style={{
                textShadow: clampedPct > 0 ? `0 0 10px ${config.primary}60` : 'none',
              }}
            >
              {clampedPct}%
            </span>
          </div>
        </motion.div>
      </div>

      <div className="text-center space-y-1">
        {subLabel && (
          <p className="text-sm font-space text-black dark:text-white uppercase tracking-widest font-black max-w-[180px] truncate drop-shadow-sm">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  )
}
