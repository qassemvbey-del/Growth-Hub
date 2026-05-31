import React from 'react'

interface AmbientAuroraProps {
  themeColor: string
}

export default function AmbientAurora({ themeColor }: AmbientAuroraProps) {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-transparent hidden dark:block pointer-events-none select-none">
      {/* Orb 1: Dynamic Theme Color */}
      <div 
        className="absolute w-[45vw] h-[45vw] rounded-full mix-blend-screen filter blur-[120px] opacity-20 -top-20 -left-20 animate-aurora-blob"
        style={{ backgroundColor: themeColor }}
      />
      {/* Orb 2: Deep Purple */}
      <div 
        className="absolute w-[40vw] h-[40vw] rounded-full mix-blend-screen filter blur-[130px] opacity-25 -bottom-10 -right-10 bg-purple-900/60 animate-aurora-blob [animation-delay:4s]"
      />
      {/* Orb 3: Teal/Cyan */}
      <div 
        className="absolute w-[35vw] h-[35vw] rounded-full mix-blend-screen filter blur-[110px] opacity-20 top-1/2 left-1/3 bg-teal-900/45 animate-aurora-blob [animation-delay:8s]"
      />
    </div>
  )
}
