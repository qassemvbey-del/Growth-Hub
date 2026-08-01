'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface DifficultyVisualizerProps {
  weight: number
  color: string
  interactive?: boolean
  onSelect?: (weight: number) => void
  isCompleted?: boolean
  isRTL?: boolean
  showLabel?: boolean
  showXp?: boolean
  className?: string
}

export function DifficultyVisualizer({
  weight,
  color,
  interactive = false,
  onSelect,
  isCompleted = false,
  isRTL = false,
  showLabel = true,
  showXp = true,
  className
}: DifficultyVisualizerProps) {
  const [hoveredWeight, setHoveredWeight] = useState<number | null>(null)
  const displayWeight = interactive && hoveredWeight !== null ? hoveredWeight : (weight || 1)
  const xpValue = displayWeight * 10

  const segments = [1, 2, 3, 4, 5, 6]

  return (
    <div className={cn("inline-flex items-center gap-2.5 font-space select-none", className)}>
      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] shrink-0">
          {interactive
            ? (isRTL ? 'حدد الصعوبة' : 'Set Difficulty')
            : (isRTL ? 'الصعوبة' : 'Difficulty')}
        </span>
      )}

      <div
        className="flex items-center gap-1"
        onMouseLeave={() => interactive && setHoveredWeight(null)}
      >
        {segments.map((level) => {
          const isFilled = level <= displayWeight
          return (
            <button
              key={level}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onSelect?.(level)}
              onMouseEnter={() => interactive && setHoveredWeight(level)}
              className={cn(
                "w-4 h-4 rounded-[4px] transition-all duration-150 flex items-center justify-center shrink-0",
                interactive ? "cursor-pointer active:scale-95" : "cursor-default"
              )}
              style={
                isFilled
                  ? {
                      backgroundColor: isCompleted ? 'var(--text-secondary)' : color,
                      boxShadow: isCompleted ? 'none' : `0 0 8px ${color}66`,
                      borderColor: 'transparent'
                    }
                  : {
                      backgroundColor: 'transparent',
                      border: '1.5px solid rgba(255, 255, 255, 0.12)'
                    }
              }
              title={`Level ${level}`}
            />
          )
        })}
      </div>

      {showXp && (
        <span
          className="text-xs font-mono font-bold shrink-0 transition-colors"
          style={{ color: isCompleted ? 'var(--text-secondary)' : color }}
        >
          = {xpValue} XP
        </span>
      )}
    </div>
  )
}
