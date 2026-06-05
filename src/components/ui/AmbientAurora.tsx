import React from 'react'

interface AmbientAuroraProps {
  themeColor: string
}

export default function AmbientAurora({ themeColor }: AmbientAuroraProps) {
  return (
    /* <div className="fixed inset-0 z-[-1] overflow-hidden bg-transparent hidden dark:block pointer-events-none select-none"> */
    <div className="fixed inset-0 z-0 overflow-hidden bg-transparent dark:bg-[#050505] hidden dark:block pointer-events-none select-none">
      {/* Orb 1: Dynamic Theme Color */}
      {/* <div 
        className="absolute w-[45vw] h-[45vw] rounded-full mix-blend-screen filter blur-[120px] opacity-45 -top-20 -left-20 animate-aurora-blob"
        style={{ backgroundColor: themeColor }}
      /> */}
      {/* <div 
        className="absolute w-[45vw] h-[45vw] rounded-full mix-blend-screen filter blur-[120px] md:blur-[150px] opacity-60 -top-20 -left-20 animate-aurora-blob"
        style={{ backgroundColor: themeColor }}
      /> */}
      <div 
        className="absolute w-[25vw] h-[25vw] rounded-full mix-blend-screen filter blur-[120px] md:blur-[150px] opacity-20 -top-20 -left-20 animate-aurora-blob"
        style={{ backgroundColor: themeColor }}
      />

      {/* Orb 2: Fuchsia/Pink (Legacy Deep Purple commented out) */}
      {/* <div 
        className="absolute w-[40vw] h-[40vw] rounded-full mix-blend-screen filter blur-[130px] opacity-55 -bottom-10 -right-10 bg-indigo-600/50 animate-aurora-blob [animation-delay:4s]"
      /> */}
      {/*
      <div 
        className="absolute w-[40vw] h-[40vw] rounded-full mix-blend-screen filter blur-[120px] md:blur-[150px] opacity-55 -bottom-10 -right-10 bg-fuchsia-500/40 animate-aurora-blob [animation-delay:4s]"
      />
      */}
      <div 
        className="absolute w-[40vw] h-[40vw] rounded-full mix-blend-screen filter blur-[120px] md:blur-[150px] opacity-30 -bottom-10 -right-10 animate-aurora-blob [animation-delay:4s]"
        style={{ backgroundColor: `${themeColor}30` }}
      />

      {/* Orb 3: Deep Blue (Legacy Teal/Cyan commented out) */}
      {/* <div 
        className="absolute w-[35vw] h-[35vw] rounded-full mix-blend-screen filter blur-[110px] opacity-40 top-1/2 left-1/3 bg-cyan-700/40 animate-aurora-blob [animation-delay:8s]"
      /> */}
      {/*
      <div 
        className="absolute w-[35vw] h-[35vw] rounded-full mix-blend-screen filter blur-[120px] md:blur-[150px] opacity-50 top-1/3 left-1/3 bg-blue-600/40 animate-aurora-blob [animation-delay:8s]"
      />
      */}
      <div 
        className="absolute w-[35vw] h-[35vw] rounded-full mix-blend-screen filter blur-[120px] md:blur-[150px] opacity-25 top-1/3 left-1/3 animate-aurora-blob [animation-delay:8s]"
        style={{ backgroundColor: `${themeColor}25` }}
      />

      {/* Orb 4: Teal/Emerald (New Addition) */}
      {/*
      <div 
        className="absolute w-[38vw] h-[38vw] rounded-full mix-blend-screen filter blur-[120px] md:blur-[150px] opacity-35 bottom-10 left-10 bg-emerald-500/35 animate-aurora-blob [animation-delay:12s]"
      />
      */}
      <div 
        className="absolute w-[38vw] h-[38vw] rounded-full mix-blend-screen filter blur-[120px] md:blur-[150px] opacity-20 bottom-10 left-10 animate-aurora-blob [animation-delay:12s]"
        style={{ backgroundColor: `${themeColor}20` }}
      />
    </div>
  )
}
