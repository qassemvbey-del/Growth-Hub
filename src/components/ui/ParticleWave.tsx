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

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)

    // Generate fixed 3D grid points (X & Y indices)
    const points: Point[] = []
    const spacingX = 40
    const spacingY = 40
    const cols = Math.floor(width / spacingX) + 6
    const rows = Math.floor(height / spacingY) + 6

    for (let c = -3; c < cols; c++) {
      for (let r = -3; r < rows; r++) {
        points.push({
          x3d: c * spacingX - width / 2,
          y3d: r * spacingY - height / 2,
          z3d: 0,
        })
      }
    }

    let time = 0
    const fov = 350 // Perspective FOV
    const angleX = 1.1 // Camera tilt angle

    const render = () => {
      time += 0.03
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)

      const cosX = Math.cos(angleX)
      const sinX = Math.sin(angleX)

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      points.forEach((p) => {
        // Calculate procedural undulating height wave (Z-axis)
        // Combine sine/cosine waves across spatial axes
        const waveX = p.x3d * 0.004
        const waveY = p.y3d * 0.004
        let z = Math.sin(waveX + time) * Math.cos(waveY + time) * 45
        z += Math.sin(waveX * 2 - time * 0.5) * 15 // Adding layer of complexity for 3D realism

        // Apply dynamic mouse displacement/ripple
        // Check distance to cursor in 2D space
        // Project baseline position to screen to compute distance to mouse pointer
        const tempY = p.y3d * cosX - z * sinX
        const tempZ = p.y3d * sinX + z * cosX + fov
        const screenX = (p.x3d * fov) / tempZ + width / 2
        const screenY = (tempY * fov) / tempZ + height / 2

        const dx = screenX - mx
        const dy = screenY - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        let mouseDisplacement = 0

        if (dist < 250) {
          // Push particles up when mouse is near
          const strength = (250 - dist) / 250
          mouseDisplacement = Math.sin(strength * Math.PI) * 40
          z += mouseDisplacement
        }

        // Re-calculate projection with displaced Z-value
        const rotatedY = p.y3d * cosX - z * sinX
        const rotatedZ = p.y3d * sinX + z * cosX + fov

        // Calculate 2D coordinates projected onto screen
        const finalX = (p.x3d * fov) / rotatedZ + width / 2
        const finalY = (rotatedY * fov) / rotatedZ + height / 2

        // Keep rendering within window bounds
        if (finalX >= 0 && finalX <= width && finalY >= 0 && finalY <= height) {
          // Vignette/fade opacity based on distance from screen center
          const centerX = width / 2
          const centerY = height / 2
          const distToCenter = Math.sqrt(
            (finalX - centerX) * (finalX - centerX) +
              (finalY - centerY) * (finalY - centerY)
          )
          const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)
          const vignette = Math.max(0, 1 - distToCenter / (maxDist * 0.85))

          // Enhanced mouse proximity glow
          let opacity = vignette * 0.15
          let radius = 1.2
          let color = 'rgba(20, 184, 166, ' // Teal accent

          if (dist < 220) {
            const glowFactor = (220 - dist) / 220
            opacity += glowFactor * 0.5
            radius += glowFactor * 1.5
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
      className="fixed inset-0 z-0 w-full h-full bg-black pointer-events-none"
    />
  )
}
