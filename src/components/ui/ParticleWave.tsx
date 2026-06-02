'use client'

import React, { useEffect, useRef } from 'react'

interface Point {
  x3d: number
  y3d: number
  z3d: number
  currentX: number
  currentY: number
  currentRadius: number
  currentOpacity: number
}

export default function ParticleWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    let points: Point[] = []

    // GENERATE DENSE UNIFIED 2D GRID
    const generateGrid = (w: number, h: number) => {
      const tempPoints: Point[] = []
      const spacing = 24
      const cols = Math.ceil(w / spacing) + 4
      const rows = Math.ceil(h / spacing) + 4

      for (let c = -2; c < cols; c++) {
        for (let r = -2; r < rows; r++) {
          const x = c * spacing - w / 2
          const y = r * spacing - h / 2
          tempPoints.push({
            x3d: x,
            y3d: y,
            z3d: 0,
            currentX: x + w / 2,
            currentY: y + h / 2,
            currentRadius: 1.3,
            currentOpacity: 0.35,
          })
        }
      }
      points = tempPoints
    }

    generateGrid(width, height)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      generateGrid(width, height)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)

    let time = 0

    const render = () => {
      time += 0.008

      // Detect theme dynamically
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      
      // Trailing clear effect for smooth motion trails
      ctx.fillStyle = isDark ? 'rgba(9, 9, 11, 0.25)' : 'rgba(255, 255, 255, 0.25)'
      ctx.fillRect(0, 0, width, height)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      points.forEach((p) => {
        // Continuous 2D grid fabric wave math
        const waveX = p.x3d * 0.005
        const waveY = p.y3d * 0.005
        let yDisplacement = Math.sin(waveX + time) * Math.cos(waveY + time) * 16
        yDisplacement += Math.sin(waveX * 2 - time * 0.5) * 5

        // Base coordinate positions
        const baseX = p.x3d + width / 2
        const baseY = p.y3d + height / 2 + yDisplacement

        // Calculate distance from target position to mouse cursor
        const dx = baseX - mx
        const dy = baseY - my
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Target state properties for displacement LERPing
        let targetX = baseX
        let targetY = baseY
        let targetRadius = 1.3

        const isDarkTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
        let color = isDarkTheme ? 'rgba(20, 184, 166, ' : 'rgba(13, 148, 136, '

        const centerX = width / 2
        const centerY = height / 2
        const distToCenter = Math.sqrt(
          (baseX - centerX) * (baseX - centerX) +
            (baseY - centerY) * (baseY - centerY)
        )
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)
        const vignette = Math.max(0, 1 - distToCenter / (maxDist * 0.85))
        
        let targetOpacity = vignette * 0.45

        // Mouse displacement settings: 150px radius with high-force repulsion
        const activeRadius = 150
        if (dist < activeRadius) {
          const strength = (activeRadius - dist) / activeRadius
          const angle = Math.atan2(dy, dx)
          
          // High-force quadratic repulsion formula
          const pushForce = Math.pow(strength, 2) * 55
          targetX = baseX + Math.cos(angle) * pushForce
          targetY = baseY + Math.sin(angle) * pushForce

          targetOpacity += strength * 0.55
          targetRadius += strength * 1.6
        }

        // STEP 3: SLOW DOWN MOUSE REPULSION USING LINEAR INTERPOLATION (LERP)
        p.currentX += (targetX - p.currentX) * 0.08
        p.currentY += (targetY - p.currentY) * 0.08
        p.currentRadius += (targetRadius - p.currentRadius) * 0.08
        p.currentOpacity += (targetOpacity - p.currentOpacity) * 0.08

        // Render point within screen bounds
        if (p.currentX >= 0 && p.currentX <= width && p.currentY >= 0 && p.currentY <= height) {
          ctx.beginPath()
          ctx.arc(p.currentX, p.currentY, p.currentRadius, 0, Math.PI * 2)
          ctx.fillStyle = `${color}${Math.max(0, Math.min(1, p.currentOpacity))})`
          ctx.fill()
        }
      })

      animationId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  )
}
