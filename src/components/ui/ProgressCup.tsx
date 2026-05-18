'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressCupProps {
  percentage: number // 0 to 100
  onComplete?: () => void
  isInRedZone?: boolean
}

export default function ProgressCup({ percentage, onComplete, isInRedZone }: ProgressCupProps) {
  const [prevPercentage, setPrevPercentage] = useState(0)
  const [isDark, setIsDark] = useState(true)
  const progress = percentage || 0

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (progress >= 100 && prevPercentage < 100) {
      onComplete?.()
    }
    setPrevPercentage(progress)
  }, [progress, prevPercentage, onComplete])

  const strokeColor = isDark ? '#ffffff' : '#333333'

  const safePercentage = isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress))
  const color = isInRedZone ? '#FF0055' : '#39FF14'
  const fillLevel = (72 - (safePercentage / 100) * 70) || 0

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative w-48 h-64 flex items-center justify-center">
        <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-[0_0_15px_rgba(57,255,20,0.2)]">
          <defs>
            <clipPath id="crystalPathBig">
              <polygon points="30,2 8,25 5,55 30,72 55,55 52,25" />
            </clipPath>
            <linearGradient id="crystalGlowBig" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="50%" stopColor={color} stopOpacity="0.05" />
              <stop offset="100%" stopColor={color} stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Liquid Fill */}
          <g clipPath="url(#crystalPathBig)">
            <motion.rect
              x="0"
              initial={{ y: 72 }}
              animate={{ y: fillLevel || 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              width="60"
              height="80"
              fill={color || '#39FF14'}
              className="opacity-30"
            />
            
            {/* Liquid Surface Ripple */}
            <motion.path
              initial={{ x: -10, y: 72 }}
              animate={{ 
                x: [0, -20, 0],
                y: fillLevel || 0
              }}
              transition={{ 
                x: { duration: 3, repeat: Infinity, ease: "linear" },
                y: { duration: 1.5, ease: "easeOut" }
              }}
              d="M0,0 Q15,-3 30,0 T60,0 V10 H0 Z"
              fill={color || '#39FF14'}
              className="opacity-50"
            />
          </g>

          {/* Crystal Body */}
          <polygon 
            points="30,2 8,25 5,55 30,72 55,55 52,25"
            fill="url(#crystalGlowBig)"
            stroke={strokeColor}
            strokeWidth="1.5"
            className={cn(
              "transition-all duration-500",
              progress === 100 ? "stroke-[2]" : "opacity-60"
            )}
            style={{ filter: `drop-shadow(0 0 10px ${color}44)` }}
          />

          {/* Facet Lines */}
          <g className="opacity-30" stroke={strokeColor} strokeWidth="0.8">
            <line x1="30" y1="2" x2="15" y2="40" />
            <line x1="30" y1="2" x2="45" y2="40" />
            <line x1="8" y1="25" x2="52" y2="25" />
            <line x1="15" y1="40" x2="45" y2="40" />
            <line x1="15" y1="40" x2="5" y2="55" />
            <line x1="45" y1="40" x2="55" y2="55" />
          </g>

          {/* Core Pulse */}
          <motion.circle
            cx="30"
            cy="40"
            r="8"
            fill={color}
            initial={{ opacity: 0.1, scale: 0.8 }}
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>

        {/* Completion Particles */}
        <AnimatePresence>
          {progress === 100 && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: "50%", y: "50%", opacity: 1, scale: 1 }}
                  animate={{ 
                    x: `${50 + (Math.random() - 0.5) * 150}%`,
                    y: `${50 + (Math.random() - 0.5) * 150}%`,
                    opacity: 0,
                    scale: 0
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  className="absolute w-1.5 h-1.5 rotate-45"
                  style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 text-center relative">
        <div 
          className="font-space text-5xl font-black tracking-tighter transition-colors duration-500"
          style={{ color }}
        >
          {Math.round(safePercentage)}<span className="text-sm opacity-40 ml-1">%</span>
        </div>
        <p className="text-[10px] font-space text-foreground/40 uppercase tracking-[0.5em] mt-3 font-bold">
          XP_LOAD_STATUS
        </p>
      </div>
    </div>
  )
}
