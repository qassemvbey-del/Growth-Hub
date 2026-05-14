'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface EnergyCellProps {
  percentage: number
  color: string
  size?: 'sm' | 'md' | 'lg'
  isInRedZone?: boolean
  cupStyle?: string
}

/**
 * LIQUID CRYSTAL TROPHY — V7.4
 * A 3D crystal chalice silhouette with smoked-glass material,
 * neon liquid fill, SVG wave animation, and rising glow bubbles.
 *
 * STRICT SIZE ENFORCEMENT:
 *   SMALL  → 45px
 *   MEDIUM → 90px
 *   LARGE  → 170px
 */
const DIMS = {
  sm: { w: 36, h: 45 },
  md: { w: 68, h: 90 },
  lg: { w: 120, h: 170 },
} as const

// Unique ID counter for SVG defs
let _cellIdCounter = 0

export default function EnergyCell({
  percentage,
  color,
  size = 'md',
  isInRedZone,
}: EnergyCellProps) {
  const primary = isInRedZone ? '#FF0055' : (color?.startsWith('#') ? color : '#39FF14')
  const { w, h } = DIMS[size ?? 'sm']
  const pct = Math.round(Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage)))

  // Unique IDs for SVG clip paths
  const uid = useMemo(() => `ec${++_cellIdCounter}`, [])

  // === Crystal Trophy SVG Path (chalice silhouette) ===
  // Normalized to 100x100 viewBox, then scaled
  const chalicePath = `
    M 30 5 
    Q 30 0, 50 0 
    Q 70 0, 70 5
    L 72 8
    Q 73 10, 70 12
    L 65 14
    Q 52 18, 50 20
    Q 48 18, 35 14
    L 30 12
    Q 27 10, 28 8
    Z
    M 35 14
    Q 30 20, 28 35
    Q 26 55, 32 70
    Q 35 78, 40 82
    L 42 85
    Q 44 86, 44 88
    L 44 92
    Q 44 94, 38 95
    L 32 96
    Q 28 97, 28 100
    L 72 100
    Q 72 97, 68 96
    L 62 95
    Q 56 94, 56 92
    L 56 88
    Q 56 86, 58 85
    L 60 82
    Q 65 78, 68 70
    Q 74 55, 72 35
    Q 70 20, 65 14
    Z
  `

  // Glow configs per size
  const glowSpread = size === 'lg' ? 30 : size === 'md' ? 16 : 8
  const borderGlow = size === 'lg' ? 20 : size === 'md' ? 10 : 5
  const fontSize = size === 'sm' ? 9 : size === 'md' ? 14 : 24
  const fontWeight = 900

  // Bubble config
  const bubbleCount = size === 'sm' ? 3 : size === 'md' ? 5 : 8
  const bubbles = useMemo(() => {
    return Array.from({ length: bubbleCount }, (_, i) => ({
      x: 35 + Math.random() * 30,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2,
      r: size === 'sm' ? 1 : size === 'md' ? 1.5 : 2 + Math.random(),
    }))
  }, [bubbleCount, size])

  // Fill level: map pct to Y within the chalice body (14 to 100 in SVG coords)
  const bodyTop = 14
  const bodyBottom = 100
  const bodyHeight = bodyBottom - bodyTop
  const fillY = bodyBottom - (pct / 100) * bodyHeight
  const waveY = fillY

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Orbit rings — LARGE ONLY */}
        {size === 'lg' && [1, 2].map(i => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: w * (1 + i * 0.35),
              height: h * (1 + i * 0.1),
              borderRadius: '50%',
              border: `1px solid ${primary}${i === 1 ? '30' : '18'}`,
              pointerEvents: 'none',
            }}
            animate={{ rotate: 360 * (i % 2 === 0 ? 1 : -1) }}
            transition={{ duration: 8 + i * 6, repeat: Infinity, ease: 'linear' }}
          />
        ))}

        {/* === THE CRYSTAL CHALICE === */}
        <svg
          width={w}
          height={h}
          viewBox="0 0 100 100"
          style={{ overflow: 'visible', filter: `drop-shadow(0 0 ${glowSpread}px ${primary}88)` }}
        >
          <defs>
            {/* Clip to the chalice shape */}
            <clipPath id={`${uid}-clip`}>
              <path d={chalicePath} />
            </clipPath>

            {/* Smoked glass gradient */}
            <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(30,30,35,0.85)" />
              <stop offset="40%" stopColor="rgba(15,15,20,0.92)" />
              <stop offset="100%" stopColor="rgba(5,5,8,0.95)" />
            </linearGradient>

            {/* Liquid fill gradient */}
            <linearGradient id={`${uid}-liquid`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={primary} stopOpacity="0.9" />
              <stop offset="40%" stopColor={primary} stopOpacity="0.6" />
              <stop offset="70%" stopColor={primary} stopOpacity="0.3" />
              <stop offset="100%" stopColor={primary} stopOpacity="0.05" />
            </linearGradient>

            {/* Top glass highlight */}
            <linearGradient id={`${uid}-highlight`} x1="0.3" y1="0" x2="0.7" y2="0.5">
              <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* Glow filter for liquid surface */}
            <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={size === 'lg' ? 3 : 2} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Chalice body — smoked glass */}
          <path
            d={chalicePath}
            fill={`url(#${uid}-glass)`}
            stroke={`${primary}55`}
            strokeWidth={size === 'lg' ? 0.8 : 0.6}
          />

          {/* Content clipped to chalice shape */}
          <g clipPath={`url(#${uid}-clip)`}>

            {/* Tick marks */}
            {size !== 'sm' && [25, 50, 75].map(tick => {
              const yPos = bodyBottom - (tick / 100) * bodyHeight
              return (
                <line
                  key={tick}
                  x1="25" y1={yPos} x2="75" y2={yPos}
                  stroke={`${primary}22`}
                  strokeWidth="0.5"
                />
              )
            })}

            {/* NEON LIQUID FILL */}
            <motion.rect
              x="0" width="100"
              initial={{ y: 100, height: 0 }}
              animate={{ y: fillY, height: bodyBottom - fillY }}
              transition={{ duration: size === 'lg' ? 2.8 : 2, ease: 'easeInOut' }}
              fill={`url(#${uid}-liquid)`}
            />

            {/* SVG WAVE at liquid surface */}
            <motion.g
              initial={{ y: 100 - bodyTop }}
              animate={{ y: waveY - bodyTop }}
              transition={{ duration: size === 'lg' ? 2.8 : 2, ease: 'easeInOut' }}
            >
              <motion.path
                d={`M 20 0 Q 30 -3, 40 0 Q 50 3, 60 0 Q 70 -3, 80 0 L 80 4 L 20 4 Z`}
                fill={primary}
                opacity={0.7}
                filter={`url(#${uid}-glow)`}
                animate={{
                  d: [
                    `M 20 0 Q 30 -3, 40 0 Q 50 3, 60 0 Q 70 -3, 80 0 L 80 4 L 20 4 Z`,
                    `M 20 0 Q 30 3, 40 0 Q 50 -3, 60 0 Q 70 3, 80 0 L 80 4 L 20 4 Z`,
                    `M 20 0 Q 30 -3, 40 0 Q 50 3, 60 0 Q 70 -3, 80 0 L 80 4 L 20 4 Z`,
                  ]
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Bright surface line */}
              <line
                x1="25" y1="0" x2="75" y2="0"
                stroke={primary}
                strokeWidth={size === 'lg' ? 1.2 : 0.8}
                filter={`url(#${uid}-glow)`}
              />
            </motion.g>

            {/* RISING BUBBLES */}
            {bubbles.map((b, i) => (
              <motion.circle
                key={i}
                cx={b.x}
                r={b.r}
                fill={primary}
                opacity={0.6}
                initial={{ cy: 95, opacity: 0 }}
                animate={{
                  cy: [95, fillY + 5, fillY - 2],
                  opacity: [0, 0.7, 0],
                }}
                transition={{
                  duration: b.duration,
                  delay: b.delay,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            ))}

            {/* Inner shimmer (medium + large) */}
            {size !== 'sm' && (
              <motion.ellipse
                cx="50" cy="50" rx="18" ry="30"
                fill={`${primary}11`}
                animate={{ opacity: [0.05, 0.2, 0.05] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Glass highlight overlay */}
            <path
              d={chalicePath}
              fill={`url(#${uid}-highlight)`}
            />
          </g>

          {/* Crystal edge highlight (inner border glow) */}
          <path
            d={chalicePath}
            fill="none"
            stroke={`${primary}44`}
            strokeWidth={0.5}
            style={{ filter: `drop-shadow(0 0 ${size === 'lg' ? 4 : 2}px ${primary}44)` }}
          />

          {/* % Readout */}
          <text
            x="50"
            y={size === 'sm' ? 62 : 58}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: "'Space Grotesk', monospace",
              fontWeight,
              fontSize: size === 'sm' ? '12px' : size === 'md' ? '14px' : '18px',
              fill: '#ffffff',
              filter: `drop-shadow(0 0 6px ${primary}) drop-shadow(0 0 12px ${primary}66)`,
            }}
          >
            {pct}%
          </text>
        </svg>
      </div>
    </div>
  )
}
