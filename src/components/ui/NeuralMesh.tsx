'use client'

import { useEffect, useRef } from 'react'
import { useGrowth } from '@/context/GrowthContext'

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 16, g: 185, b: 129 }
}

export default function NeuralMesh({ overrideColor }: { overrideColor?: string } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const { currentTheme, mounted } = useGrowth()
  const activeColor = overrideColor || currentTheme.color
  const colorRef = useRef(activeColor)

  useEffect(() => {
    colorRef.current = activeColor
  }, [activeColor])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const spacing = 35 // Grid spacing
    const mouse = { x: -1000, y: -1000, radius: 150 }
    
    interface Dot {
      baseX: number
      baseY: number
      x: number
      y: number
      vx: number
      vy: number
      randomOffset: number
    }

    let dots: Dot[] = []

    const initGrid = () => {
      dots = []
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const cols = Math.floor(canvas.width / spacing) + 2
      const rows = Math.floor(canvas.height / spacing) + 2

      for (let i = -1; i < cols; i++) {
        for (let j = -1; j < rows; j++) {
          dots.push({
            baseX: i * spacing,
            baseY: j * spacing,
            x: i * spacing,
            y: j * spacing,
            vx: 0,
            vy: 0,
            randomOffset: Math.random() * Math.PI * 2
          })
        }
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      
      if (glowRef.current) {
        glowRef.current.style.opacity = '1'
        requestAnimationFrame(() => {
          if (glowRef.current) {
            glowRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
          }
        })
      }
    }
    
    const handleMouseLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
      if (glowRef.current) {
        glowRef.current.style.opacity = '0'
      }
    }

    window.addEventListener('resize', initGrid)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    initGrid()

    let time = 0

    const draw = () => {
      time += 0.015
      
      // Pitch black background
      // ctx.fillStyle = '#000000'
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Calculate physics first
      for (let i = 0; i < dots.length; i++) {
        const p = dots[i]

        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Mouse repulsion (Push away)
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius
          p.vx -= (dx / dist) * force * 3 // Repel force
          p.vy -= (dy / dist) * force * 3
        }

        // Idle living terrain wave (Sine wave)
        const waveX = Math.sin(time + p.randomOffset + p.baseX * 0.01) * 2
        const waveY = Math.cos(time + p.randomOffset + p.baseY * 0.01) * 2
        
        const targetX = p.baseX + waveX
        const targetY = p.baseY + waveY

        // Spring mechanics returning to base
        p.vx += (targetX - p.x) * 0.03 // Spring tension
        p.vy += (targetY - p.y) * 0.03

        // Damping (Friction)
        p.vx *= 0.88
        p.vy *= 0.88

        p.x += p.vx
        p.y += p.vy
      }

      // Draw lines for particles near mouse
      ctx.lineWidth = 0.5
      const rgb = hexToRgb(colorRef.current)

      for (let i = 0; i < dots.length; i++) {
        const p1 = dots[i]
        const dxMouse = mouse.x - p1.x
        const dyMouse = mouse.y - p1.y
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse)

        // Only connect lines if the particle is near the mouse distortion field
        if (distMouse < mouse.radius * 1.5) {
          for (let j = i + 1; j < dots.length; j++) {
            const p2 = dots[j]
            const dx = p1.x - p2.x
            const dy = p1.y - p2.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            // Connect nearby displaced particles
            if (dist < spacing * 1.5) {
              const lineAlpha = Math.max(0, 1 - (distMouse / (mouse.radius * 1.5))) * 0.4
              if (lineAlpha > 0.01) {
                ctx.beginPath()
                ctx.moveTo(p1.x, p1.y)
                ctx.lineTo(p2.x, p2.y)
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineAlpha})`
                ctx.stroke()
              }
            }
          }
        }
      }

      // Draw dots
      ctx.fillStyle = colorRef.current
      for (let i = 0; i < dots.length; i++) {
        const p = dots[i]
        const dxMouse = mouse.x - p.x
        const dyMouse = mouse.y - p.y
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse)

        // Illumination logic: particles glow brighter when inside the spotlight radius
        if (distMouse < mouse.radius * 1.5) {
          const glowRatio = Math.max(0, 1 - (distMouse / (mouse.radius * 1.5)))
          ctx.globalAlpha = 0.35 + (glowRatio * 0.65) // Range: 0.35 to 1.0
        } else {
          ctx.globalAlpha = 0.35 // Default dim opacity
        }

        ctx.fillRect(p.x - 0.75, p.y - 0.75, 1.5, 1.5)
      }

      ctx.globalAlpha = 1
      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', initGrid)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  const rgbGlow = hexToRgb(activeColor)

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[-2]"
        style={{ width: '100vw', height: '100vh' }}
      />
      {/* Soft Glow Spotlight */}
      {mounted && (
        <div 
          ref={glowRef}
          className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none z-[-1] will-change-transform opacity-0"
          style={{
            background: `radial-gradient(circle, rgba(${rgbGlow.r}, ${rgbGlow.g}, ${rgbGlow.b}, 0.25) 0%, transparent 60%)`,
            filter: 'blur(100px)',
            marginLeft: '-300px',
            marginTop: '-300px',
            transition: 'opacity 0.5s ease'
          }}
        />
      )}
    </>
  )
}
