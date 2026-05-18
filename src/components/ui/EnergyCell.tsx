'use client'

import { motion } from 'framer-motion'
import { useId } from 'react'

interface EnergyCellProps {
  percentage: number
  color: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isInRedZone?: boolean
}

/**
 * CRYSTAL SHARD ENERGY CELL — V8.0
 * Irregular crystal shard design with angular facets,
 * liquid fill animation, and 100% overflow effects.
 */
const DIMS = {
  sm: { w: 40, h: 55 },    // Create Mission Modal
  md: { w: 60, h: 80 },    // Mission Card
  lg: { w: 80, h: 100 },   // Dashboard Card
  xl: { w: 100, h: 130 },  // Legacy Vault
} as const

export default function EnergyCell({
  percentage,
  color,
  size = 'md',
  isInRedZone,
}: EnergyCellProps) {
  const primary = isInRedZone ? '#FF0055' : (color?.startsWith('#') ? color : '#39FF14')
  const { w, h } = DIMS[size ?? 'md']
  const pct = Math.round(Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage)))
  const uid = useId().replace(/:/g, '')

  // Fill calculation: path height is roughly 2 to 72 in 60x80 viewBox
  const topY = 2
  const bottomY = 72
  const fillHeight = bottomY - topY
  const fillLevelY = bottomY - (pct / 100) * fillHeight


  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative flex items-center justify-center"
        style={{ width: w, height: h }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 60 80"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* STATIC Crystal Shard shape for masking animated fills */}
            <clipPath id={`crystal-path-${uid}`}>
              <polygon points="30,2 8,25 5,55 30,72 55,55 52,25" />
            </clipPath>

            {/* Standard compliant SVG filter for premium glow */}
            <filter id={`glow-${uid}`}>
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Ultra-High-Performance GPU-Accelerated Particles Style */}
            <style>{`
              @keyframes float-particle-1-${uid} {
                0% { transform: translateY(0px) scale(0); opacity: 0; }
                20% { opacity: 0.8; }
                80% { opacity: 0.8; }
                100% { transform: translateY(-35px) scale(1.4); opacity: 0; }
              }
              @keyframes float-particle-2-${uid} {
                0% { transform: translateY(0px) scale(0); opacity: 0; }
                30% { opacity: 0.7; }
                70% { opacity: 0.7; }
                100% { transform: translateY(-40px) scale(1.1); opacity: 0; }
              }
              @keyframes float-particle-3-${uid} {
                0% { transform: translateY(0px) scale(0); opacity: 0; }
                15% { opacity: 0.9; }
                75% { opacity: 0.9; }
                100% { transform: translateY(-45px) scale(1.5); opacity: 0; }
              }
              .animate-p1-${uid} {
                animation: float-particle-1-${uid} 2.4s infinite ease-out;
                transform-origin: center;
                transform-box: fill-box;
              }
              .animate-p2-${uid} {
                animation: float-particle-2-${uid} 3.2s infinite ease-out 0.6s;
                transform-origin: center;
                transform-box: fill-box;
              }
              .animate-p3-${uid} {
                animation: float-particle-3-${uid} 2.8s infinite ease-out 1.2s;
                transform-origin: center;
                transform-box: fill-box;
              }
            `}</style>
          </defs>

          {/* 1. Liquid Fill (Clipped by static crystal path) */}
          <motion.rect 
            x="0" 
            width="60"
            initial={{ y: 80, height: 0 }}
            animate={{ y: fillLevelY, height: 80 - fillLevelY }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            fill={primary}
            opacity="0.5"
            clipPath={`url(#crystal-path-${uid})`}
          />

          {/* 2. Liquid ripple animation (Clipped by static crystal path) */}
          <motion.path
            d={`M 5 ${fillLevelY} Q 30 ${fillLevelY - 4}, 55 ${fillLevelY} L 55 80 L 5 80 Z`}
            fill={primary}
            opacity="0.25"
            animate={{
              d: [
                `M 5 ${fillLevelY} Q 30 ${fillLevelY - 4}, 55 ${fillLevelY} L 55 80 L 5 80 Z`,
                `M 5 ${fillLevelY} Q 30 ${fillLevelY + 4}, 55 ${fillLevelY} L 55 80 L 5 80 Z`,
                `M 5 ${fillLevelY} Q 30 ${fillLevelY - 4}, 55 ${fillLevelY} L 55 80 L 5 80 Z`
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            clipPath={`url(#crystal-path-${uid})`}
          />

          {/* 3. Main Crystal Body Outline (Standard glow and styling) */}
          <motion.polygon 
            points="30,2 8,25 5,55 30,72 55,55 52,25"
            fill="none" 
            stroke={primary} 
            strokeWidth="1.5"
            animate={{
              strokeOpacity: [0.6, 1, 0.6]
            }}
            filter={`url(#glow-${uid})`}
            style={{
              filter: `drop-shadow(0 0 4px ${primary}88)`
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* 4. Internal Facet Lines */}
          <g stroke={primary} strokeOpacity="0.6" strokeWidth="0.8">
            <line x1="30" y1="2" x2="15" y2="40" />
            <line x1="30" y1="2" x2="45" y2="40" />
            <line x1="8" y1="25" x2="52" y2="25" />
            <line x1="15" y1="40" x2="45" y2="40" strokeOpacity="0.4" />
            <line x1="15" y1="40" x2="8" y2="25" strokeOpacity="0.5" />
            <line x1="45" y1="40" x2="52" y2="25" strokeOpacity="0.5" />
            <line x1="30" y1="72" x2="15" y2="40" strokeOpacity="0.5" />
            <line x1="30" y1="72" x2="45" y2="40" strokeOpacity="0.5" />
          </g>

          {/* 5. Surface highlight line */}
          <motion.line
            x1="5" y1={fillLevelY} x2="55" y2={fillLevelY}
            stroke={primary}
            strokeWidth="1.5"
            opacity="0.8"
            clipPath={`url(#crystal-path-${uid})`}
            filter={`url(#glow-${uid})`}
          />

          {/* 6. Base Glow */}
          <ellipse 
            cx="30" cy="72" rx="20" ry="4"
            fill={primary} 
            opacity="0.3"
          />

          {/* 7. Overflow Particles at 100% (CSS-only for massive performance boost) */}
          {pct >= 100 && (
            <g style={{ pointerEvents: 'none' }}>
              <circle cx="22" cy="45" r="1.5" fill={primary} className={`animate-p1-${uid}`} />
              <circle cx="38" cy="48" r="1.2" fill={primary} className={`animate-p2-${uid}`} />
              <circle cx="30" cy="38" r="1.8" fill={primary} className={`animate-p3-${uid}`} />
            </g>
          )}
        </svg>

        {/* % Readout overlay */}
        <div 
          className="absolute inset-0 flex items-center justify-center font-space font-black tracking-tighter text-white pointer-events-none"
          style={{ 
            fontSize: size === 'sm' ? '8px' : size === 'md' ? '12px' : '16px',
            textShadow: `0 0 10px ${primary}`
          }}
        >
          {pct}%
        </div>
      </div>
    </div>
  )
}
