'use client'

import React, { useEffect, useRef } from 'react'

interface Point {
  x3d: number
  y3d: number
  z3d: number
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

    // STEP 1: GENERATE DENSE UNIFIED 2D GRID
    const generateGrid = (w: number, h: number) => {
      const tempPoints: Point[] = []
      const spacing = 24 // Increased density
      const cols = Math.ceil(w / spacing) + 4
      const rows = Math.ceil(h / spacing) + 4

      for (let c = -2; c < cols; c++) {
        for (let r = -2; r < rows; r++) {
          tempPoints.push({
            x3d: c * spacing - w / 2,
            y3d: r * spacing - h / 2,
            z3d: 0,
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
      // Slow, elegant wave movement
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

        // Initial projected 2D coordinates on screen (Centered grid mapping)
        let finalX = p.x3d + width / 2
        let finalY = p.y3d + height / 2 + yDisplacement

        // Calculate distance to mouse cursor
        const dx = finalX - mx
        const dy = finalY - my
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Mouse displacement settings: tight 150px radius with high-force repulsion
        const activeRadius = 150
        let radius = 1.3
        const isDarkTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
        let opacity = 0.35 // Crisp baseline visibility
        let color = isDarkTheme ? 'rgba(20, 184, 166, ' : 'rgba(13, 148, 136, '

        if (dist < activeRadius) {
          const strength = (activeRadius - dist) / activeRadius
          const angle = Math.atan2(dy, dx)
          
          // Violent/high-impact quadratic repulsion force
          const pushForce = Math.pow(strength, 2) * 55
          finalX += Math.cos(angle) * pushForce
          finalY += Math.sin(angle) * pushForce

          // Enlarge and glow particles in close proximity
          opacity += strength * 0.55
          radius += strength * 1.6
        }

        // Render point within screen bounds
        if (finalX >= 0 && finalX <= width && finalY >= 0 && finalY <= height) {
          ctx.beginPath()
          ctx.arc(finalX, finalY, radius, 0, Math.PI * 2)
          ctx.fillStyle = `${color}${opacity})`
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
