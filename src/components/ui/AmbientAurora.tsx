'use client'
import React from 'react'

interface AmbientAuroraProps {
  themeColor: string
}

export default function AmbientAurora({ themeColor }: AmbientAuroraProps) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-transparent dark:bg-[#050505] hidden dark:block pointer-events-none select-none">
      
      {/* Primary theme orb - top left */}
      <div 
        className="absolute rounded-full mix-blend-screen pointer-events-none"
        style={{
          width: 'min(70vw, 600px)',
          height: 'min(70vw, 600px)',
          top: '-15%',
          left: '-10%',
          backgroundColor: themeColor,
          opacity: 0.12,
          filter: 'blur(100px)',
          animation: 'aurora-drift-1 18s ease-in-out infinite alternate',
        }}
      />

      {/* Purple/violet orb - bottom right */}
      <div 
        className="absolute rounded-full mix-blend-screen pointer-events-none"
        style={{
          width: 'min(80vw, 700px)',
          height: 'min(80vw, 700px)',
          bottom: '-20%',
          right: '-15%',
          backgroundColor: '#7c3aed',
          opacity: 0.10,
          filter: 'blur(120px)',
          animation: 'aurora-drift-2 22s ease-in-out infinite alternate',
        }}
      />

      {/* Cyan/teal orb - center */}
      <div 
        className="absolute rounded-full mix-blend-screen pointer-events-none"
        style={{
          width: 'min(60vw, 500px)',
          height: 'min(60vw, 500px)',
          top: '30%',
          left: '25%',
          backgroundColor: '#0891b2',
          opacity: 0.08,
          filter: 'blur(110px)',
          animation: 'aurora-drift-3 26s ease-in-out infinite alternate',
        }}
      />

      {/* Rose orb - top right */}
      <div 
        className="absolute rounded-full mix-blend-screen pointer-events-none"
        style={{
          width: 'min(50vw, 400px)',
          height: 'min(50vw, 400px)',
          top: '-5%',
          right: '-5%',
          backgroundColor: '#be185d',
          opacity: 0.07,
          filter: 'blur(90px)',
          animation: 'aurora-drift-4 20s ease-in-out infinite alternate',
        }}
      />

      <style>{`
        @keyframes aurora-drift-1 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(40px, 30px) scale(1.05); }
          100% { transform: translate(-20px, 50px) scale(0.97); }
        }
        @keyframes aurora-drift-2 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(-50px, -30px) scale(1.08); }
          100% { transform: translate(30px, -50px) scale(0.95); }
        }
        @keyframes aurora-drift-3 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(30px, -40px) scale(1.06); }
          100% { transform: translate(-40px, 20px) scale(1.02); }
        }
        @keyframes aurora-drift-4 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(-20px, 40px) scale(0.96); }
          100% { transform: translate(50px, -20px) scale(1.04); }
        }
      `}</style>
    </div>
  )
}

/*
// PREVIOUS IMPLEMENTATION:
import React from 'react'

interface AmbientAuroraProps {
  themeColor: string
}

export default function AmbientAurora({ themeColor }: AmbientAuroraProps) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-transparent dark:bg-[#050505] hidden dark:block pointer-events-none select-none">
      <div 
        className="absolute w-[80vw] h-[80vw] md:w-[25vw] md:h-[25vw] rounded-full mix-blend-screen filter blur-[80px] md:blur-[150px] opacity-20 -top-20 -left-20 animate-aurora-blob"
        style={{ backgroundColor: themeColor }}
      />
      <div 
        className="absolute w-[90vw] h-[90vw] md:w-[40vw] md:h-[40vw] rounded-full mix-blend-screen filter blur-[80px] md:blur-[150px] opacity-20 -bottom-10 -right-10 animate-aurora-blob [animation-delay:4s]"
        style={{ backgroundColor: `${themeColor}30` }}
      />
      <div 
        className="absolute w-[70vw] h-[70vw] md:w-[35vw] md:h-[35vw] rounded-full mix-blend-screen filter blur-[80px] md:blur-[150px] opacity-15 top-1/3 left-1/3 animate-aurora-blob [animation-delay:8s]"
        style={{ backgroundColor: `${themeColor}25` }}
      />
      <div 
        className="absolute w-[75vw] h-[75vw] md:w-[38vw] md:h-[38vw] rounded-full mix-blend-screen filter blur-[80px] md:blur-[150px] opacity-15 bottom-10 left-10 animate-aurora-blob [animation-delay:12s]"
        style={{ backgroundColor: `${themeColor}20` }}
      />
    </div>
  )
}
*/
