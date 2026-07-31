'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface DiamondProgressProps {
  percentage: number
  color?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  textClassName?: string
}

const SIZES = {
  sm: { box: 36, font: 'text-[10px]', stroke: 1.5 },
  md: { box: 52, font: 'text-[13px]', stroke: 2 },
  lg: { box: 68, font: 'text-[15px]', stroke: 2 },
  xl: { box: 90, font: 'text-[18px]', stroke: 2.5 },
} as const

export default function DiamondProgress({
  percentage,
  color,
  size = 'md',
  className,
  textClassName,
}: DiamondProgressProps) {
  const safePct = Math.min(100, Math.max(0, Math.round(percentage || 0)))
  const hasProgress = safePct > 0
  const themeColor = color || 'var(--theme-color, #14b8a6)'
  const { box, font, stroke } = SIZES[size] || SIZES.md

  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none", className)}
      style={{ width: box, height: box }}
    >
      <svg
        width={box}
        height={box}
        viewBox="0 0 50 50"
        className="w-full h-full overflow-visible"
      >
        {/* Diamond outline & flat semi-transparent fill */}
        <polygon
          points="25,3 47,25 25,47 3,25"
          fill={hasProgress ? themeColor : 'none'}
          fillOpacity={hasProgress ? 0.25 : 0}
          stroke={themeColor}
          strokeWidth={stroke}
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
      </svg>

      {/* Centered percentage text */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-medium leading-none text-[var(--text-primary)]",
          font,
          textClassName
        )}
      >
        {safePct}%
      </span>
    </div>
  )
}
