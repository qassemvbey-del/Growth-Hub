'use client';

import { motion } from 'framer-motion';
import { useState, useRef } from 'react';

// const text = "GROWTH_HUB";
const text = "Growth Hub";

export default function AnimatedLogo({ className = "" }: { className?: string }) {
  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchAnim, setGlitchAnim] = useState({ x: [0], y: [0] });
  const timeoutRef = useRef<any>(null);

  const startGlitch = () => {
    const steps = 12; // 0.6s / 0.05s = 12 steps
    const newX = [0];
    const newY = [0];
    
    for (let i = 0; i < steps; i++) {
      newX.push(Math.random() * 6 - 3); // between -3px and +3px
      newY.push(Math.random() * 4 - 2); // between -2px and +2px
    }
    newX.push(0);
    newY.push(0);
    
    setGlitchAnim({ x: newX, y: newY });
    setIsGlitching(true);

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsGlitching(false);
    }, 600);
  };

  const stopGlitch = () => {
    setIsGlitching(false);
    clearTimeout(timeoutRef.current);
  };

  const getLetterColor = (char: string, index: number) => {
    if (index === 7) return 'text-[#FFCC00]'; // H
    if (index === 8) return 'text-[#F97316]'; // U
    if (index === 9) return 'text-[#EF4444]'; // B
    
    // G R O W T H _
    return 'text-[#3F3F46] dark:text-[#E4E4E7]';
  }

  return (
    <motion.div 
      className={`flex items-center font-exo relative ${className}`} 
      dir="ltr"
      onHoverStart={startGlitch}
      onHoverEnd={stopGlitch}
      animate={{ 
        x: isGlitching ? glitchAnim.x : 0, 
        y: isGlitching ? glitchAnim.y : 0 
      }}
      transition={{ 
        duration: isGlitching ? 0.6 : 0, 
        ease: "linear" 
      }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          /* Commented out per rule "Never delete code, only comment it out"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: i * 0.05,
            ease: "easeOut"
          }}
          */
          className={`font-black uppercase inline-block cursor-default relative ${getLetterColor(char, i)}`}
        >
          {/* Main Letter */}
          <span className="relative z-10">{char}</span>
          
          {/* RGB Split Copies (only visible during glitch) */}
          {isGlitching && (
            <>
              <span 
                className="absolute left-0 top-0 text-[#FF0000] opacity-50 z-0 pointer-events-none" 
                style={{ transform: 'translateX(2px)' }}
              >
                {char}
              </span>
              <span 
                className="absolute left-0 top-0 text-[#00FFFF] opacity-50 z-0 pointer-events-none" 
                style={{ transform: 'translateX(-2px)' }}
              >
                {char}
              </span>
            </>
          )}
        </motion.span>
      ))}
    </motion.div>
  );
}
