'use client'
import React from 'react'

interface AmbientAuroraProps {
  themeColor: string
}

export default function AmbientAurora({ themeColor }: AmbientAuroraProps) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#050505] hidden dark:block pointer-events-none select-none">
      
      <div style={{
        position: 'absolute',
        width: 'min(90vw, 800px)',
        height: 'min(90vw, 800px)',
        top: '-30%', left: '-20%',
        backgroundColor: themeColor,
        opacity: 0.35,
        filter: 'blur(130px)',
        borderRadius: '50%',
        animation: 'drift1 20s ease-in-out infinite alternate',
      }} />

      <div style={{
        position: 'absolute',
        width: 'min(80vw, 700px)',
        height: 'min(80vw, 700px)',
        bottom: '-25%', right: '-15%',
        backgroundColor: '#7c3aed',
        opacity: 0.40,
        filter: 'blur(120px)',
        borderRadius: '50%',
        animation: 'drift2 25s ease-in-out infinite alternate',
      }} />

      <div style={{
        position: 'absolute',
        width: 'min(70vw, 600px)',
        height: 'min(70vw, 600px)',
        top: '20%', right: '10%',
        backgroundColor: '#0e7490',
        opacity: 0.30,
        filter: 'blur(110px)',
        borderRadius: '50%',
        animation: 'drift3 30s ease-in-out infinite alternate',
      }} />

      <div style={{
        position: 'absolute',
        width: 'min(60vw, 500px)',
        height: 'min(60vw, 500px)',
        bottom: '10%', left: '15%',
        backgroundColor: '#be185d',
        opacity: 0.25,
        filter: 'blur(100px)',
        borderRadius: '50%',
        animation: 'drift4 22s ease-in-out infinite alternate',
      }} />

      <style>{`
        @keyframes drift1 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(60px, 40px) scale(1.1); }
          100% { transform: translate(-30px, 70px) scale(0.95); }
        }
        @keyframes drift2 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(-70px, -40px) scale(1.12); }
          100% { transform: translate(40px, -60px) scale(0.93); }
        }
        @keyframes drift3 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(40px, -50px) scale(1.08); }
          100% { transform: translate(-50px, 30px) scale(1.05); }
        }
        @keyframes drift4 {
          0%   { transform: translate(0px, 0px) scale(1); }
          50%  { transform: translate(-30px, 50px) scale(0.95); }
          100% { transform: translate(60px, -30px) scale(1.07); }
        }
      `}</style>
    </div>
  )
}

// PREVIOUS IMPLEMENTATION:
// 'use client'
// import React from 'react'
// 
// interface AmbientAuroraProps {
//   themeColor: string
// }
// 
// export default function AmbientAurora({ themeColor }: AmbientAuroraProps) {
//   return (
//     <div className="fixed inset-0 z-0 overflow-hidden bg-transparent dark:bg-[#050505] hidden dark:block pointer-events-none select-none">
//       
//       {/* Primary theme orb - top left */}
//       <div 
//         className="absolute rounded-full mix-blend-screen pointer-events-none"
//         style={{
//           width: 'min(70vw, 600px)',
//           height: 'min(70vw, 600px)',
//           top: '-15%',
//           left: '-10%',
//           backgroundColor: themeColor,
//           opacity: 0.12,
//           filter: 'blur(100px)',
//           animation: 'aurora-drift-1 18s ease-in-out infinite alternate',
//         }}
//       />
// 
//       {/* Purple/violet orb - bottom right */}
//       <div 
//         className="absolute rounded-full mix-blend-screen pointer-events-none"
//         style={{
//           width: 'min(80vw, 700px)',
//           height: 'min(80vw, 700px)',
//           bottom: '-20%',
//           right: '-15%',
//           backgroundColor: '#7c3aed',
//           opacity: 0.10,
//           filter: 'blur(120px)',
//           animation: 'aurora-drift-2 22s ease-in-out infinite alternate',
//         }}
//       />
// 
//       {/* Cyan/teal orb - center */}
//       <div 
//         className="absolute rounded-full mix-blend-screen pointer-events-none"
//         style={{
//           width: 'min(60vw, 500px)',
//           height: 'min(60vw, 500px)',
//           top: '30%',
//           left: '25%',
//           backgroundColor: '#0891b2',
//           opacity: 0.08,
//           filter: 'blur(110px)',
//           animation: 'aurora-drift-3 26s ease-in-out infinite alternate',
//         }}
//       />
// 
//       {/* Rose orb - top right */}
//       <div 
//         className="absolute rounded-full mix-blend-screen pointer-events-none"
//         style={{
//           width: 'min(50vw, 400px)',
//           height: 'min(50vw, 400px)',
//           top: '-5%',
//           right: '-5%',
//           backgroundColor: '#be185d',
//           opacity: 0.07,
//           filter: 'blur(90px)',
//           animation: 'aurora-drift-4 20s ease-in-out infinite alternate',
//         }}
//       />
// 
//       <style>{`
//         @keyframes aurora-drift-1 {
//           0%   { transform: translate(0px, 0px) scale(1); }
//           50%  { transform: translate(40px, 30px) scale(1.05); }
//           100% { transform: translate(-20px, 50px) scale(0.97); }
//         }
//         @keyframes aurora-drift-2 {
//           0%   { transform: translate(0px, 0px) scale(1); }
//           50%  { transform: translate(-50px, -30px) scale(1.08); }
//           100% { transform: translate(30px, -50px) scale(0.95); }
//         }
//         @keyframes aurora-drift-3 {
//           0%   { transform: translate(0px, 0px) scale(1); }
//           50%  { transform: translate(30px, -40px) scale(1.06); }
//           100% { transform: translate(-40px, 20px) scale(1.02); }
//         }
//         @keyframes aurora-drift-4 {
//           0%   { transform: translate(0px, 0px) scale(1); }
//           50%  { transform: translate(-20px, 40px) scale(0.96); }
//           100% { transform: translate(50px, -20px) scale(1.04); }
//         }
//       `}</style>
//     </div>
//   )
// }
