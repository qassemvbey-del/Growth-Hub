'use client'

import { motion } from 'framer-motion'

export default function GlitchOverlay({ active }: { active: boolean }) {
  if (!active) return null

  return (
    <>
      {/* SVG Displacement Filter for dynamic visual distortion */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id="glitch-displacement">
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.95" numOctaves="1" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 -0.5" in="noise" result="colormatrix" />
            <feDisplacementMap in="SourceGraphic" in2="colormatrix" scale="15" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0, 0.9, 0.2, 0.8, 0],
          x: [-6, 6, -3, 3, 0],
          y: [2, -2, 1, -1, 0],
          skewX: [-15, 15, -7, 7, 0],
          backgroundImage: [
            'linear-gradient(rgba(176,196,222,0.1), rgba(176,196,222,0.1))',
            'linear-gradient(rgba(0,206,209,0.35), rgba(0,206,209,0.35))'
          ]
        }}
        transition={{ duration: 0.9, times: [0, 0.2, 0.4, 0.7, 1], ease: "easeInOut" }}
        className="fixed inset-0 z-50 pointer-events-none mix-blend-overlay w-screen h-screen"
        style={{
          backgroundSize: '100% 4px',
          backgroundRepeat: 'repeat',
          filter: 'url(#glitch-displacement)',
        }}
      />
    </>
  )
}
