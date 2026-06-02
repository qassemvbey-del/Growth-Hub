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

    // STEP 1: GENERATE UNIFIED GRID DYNAMICALLY
    const generateGrid = (w: number, h: number) => {
      const tempPoints: Point[] = []
      const spacingX = 40
      const spacingY = 40
      const cols = Math.floor(w / spacingX) + 6
      const rows = Math.floor(h / spacingY) + 6

      for (let c = -3; c < cols; c++) {
        for (let r = -3; r < rows; r++) {
          tempPoints.push({
            x3d: c * spacingX - w / 2,
            y3d: r * spacingY - h / 2,
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
    const fov = 350 // Perspective FOV
    const angleX = 1.1 // Camera tilt angle

    const render = () => {
      // REDUCE SPEED: Lower the increment for calm, elegant wave movement
      time += 0.007

      // DETECT THEME DYNAMICALLY
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      
      // Use trailing clear effect for smooth motion trails
      ctx.fillStyle = isDark ? 'rgba(9, 9, 11, 0.25)' : 'rgba(255, 255, 255, 0.25)'
      ctx.fillRect(0, 0, width, height)

      const cosX = Math.cos(angleX)
      const sinX = Math.sin(angleX)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      points.forEach((p) => {
        // GENTLE WAVE: Apply a smoother, flatter sine wave displacement to prevent vertical lines
        const waveX = p.x3d * 0.003
        const waveY = p.y3d * 0.003
        let z = Math.sin(waveX + time) * Math.cos(waveY + time) * 22
        z += Math.sin(waveX * 2 - time * 0.4) * 6

        // Project baseline position to compute distance to mouse pointer
        const tempY = p.y3d * cosX - z * sinX
        const tempZ = p.y3d * sinX + z * cosX + fov
        const screenX = (p.x3d * fov) / tempZ + width / 2
        const screenY = (tempY * fov) / tempZ + height / 2

        const dx = screenX - mx
        const dy = screenY - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        let mouseDisplacement = 0

        // BOOST MOUSE EFFECT: Expand interaction radius to 400px
        const activeRadius = 400
        if (dist < activeRadius) {
          const strength = (activeRadius - dist) / activeRadius
          // Smooth cosine curves for displacement repelling
          mouseDisplacement = Math.sin(strength * Math.PI) * 35
          z += mouseDisplacement
        }

        // Re-calculate projection with displaced Z-value
        const rotatedY = p.y3d * cosX - z * sinX
        const rotatedZ = p.y3d * sinX + z * cosX + fov

        const finalX = (p.x3d * fov) / rotatedZ + width / 2
        const finalY = (rotatedY * fov) / rotatedZ + height / 2

        if (finalX >= 0 && finalX <= width && finalY >= 0 && finalY <= height) {
          const centerX = width / 2
          const centerY = height / 2
          const distToCenter = Math.sqrt(
            (finalX - centerX) * (finalX - centerX) +
              (finalY - centerY) * (finalY - centerY)
          )
          const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)
          const vignette = Math.max(0, 1 - distToCenter / (maxDist * 0.85))

          // Draw highly visible contrasting teal dots
          let opacity = vignette * 0.45 
          let radius = 1.3 
          let color = isDark ? 'rgba(20, 184, 166, ' : 'rgba(13, 148, 136, '

          if (dist < activeRadius) {
            const glowFactor = (activeRadius - dist) / activeRadius
            opacity += glowFactor * 0.55
            radius += glowFactor * 1.8
          }

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
