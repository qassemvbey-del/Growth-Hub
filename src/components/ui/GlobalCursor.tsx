'use client'

import React, { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'

export default function GlobalCursor() {
  const { currentTheme, mounted } = useGrowth()
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)
  const cursorOpacity = useMotionValue(0)
  
  // High-performance spring physics for custom trailing (speed increased by 20%)
  const springX = useSpring(mouseX, { stiffness: 456, damping: 31 })
  const springY = useSpring(mouseY, { stiffness: 456, damping: 31 })
  
  // Site-wide soft background spotlight opacity transform (reduced opacity)
  const glowOpacity = useTransform(cursorOpacity, [0, 1], [0, 0.04])

  useEffect(() => {
    // Detect mobile touchscreens (coarse pointers) to prevent anomalies
    const checkPointerType = () => {
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches)
    }
    checkPointerType()

    const handleMouseMove = (e: MouseEvent) => {
      // Don't trace if it's touch
      if (window.matchMedia('(pointer: coarse)').matches) return
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      cursorOpacity.set(1)
    }

    const handleMouseLeave = () => {
      cursorOpacity.set(0)
    }

    const handleMouseEnter = () => {
      cursorOpacity.set(1)
    }

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)
    window.addEventListener('resize', checkPointerType)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      window.removeEventListener('resize', checkPointerType)
    }
  }, [])

  // Complete exclusion for touch screens or before mount
  if (!mounted || isTouchDevice) return null

  return (
    <>
      {/* Dynamic Global Background Spotlight */}
      <motion.div
        style={{
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
          width: '350px',
          height: '350px',
          borderRadius: '9999px',
          backgroundColor: currentTheme.color,
          opacity: glowOpacity,
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 1, // Under UI cards (z-10) but above pure black base (z-0)
          filter: 'blur(120px)',
        }}
      />

      {/* Custom Kinetic SVG Cursor */}
      <motion.div
        style={{
          x: springX,
          y: springY,
          translateX: '-20%',
          translateY: '-20%',
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 99999,
          opacity: cursorOpacity,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-15deg)', filter: `drop-shadow(0px 0px 8px ${currentTheme.color})` }}>
          <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill={currentTheme.color} fillOpacity="0.8" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </motion.div>
    </>
  )
}
