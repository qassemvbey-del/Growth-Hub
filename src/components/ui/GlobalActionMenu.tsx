'use client'

import { FileText, HelpCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'
import { useSound } from '@/context/SoundContext'

export default function GlobalActionMenu() {
  const { isRTL, currentTheme } = useGrowth()
  const router = useRouter()
  const { playBlip } = useSound()
  const [isOpen, setIsOpen] = useState(false)

  const handleAction = (path: string) => {
    playBlip()
    setIsOpen(false)
    router.push(path)
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "absolute bottom-16 md:bottom-16 w-48 glass-panel p-2 border shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[200] flex flex-col gap-2 rounded-xl",
              isRTL ? "left-0 origin-bottom-left" : "right-0 origin-bottom-right"
            )}
            style={{ borderColor: `${currentTheme.color}33` }}
          >
            {/* <button onClick={() => handleAction('/missions?create=true')} */}
            <button
              onClick={() => handleAction('/goals?create=true')}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-left transition-all hover:bg-black/5 dark:hover:bg-white/10 group"
            >
              <HelpCircle />
              <span className="text-xs font-black font-space tracking-widest uppercase group-hover:text-[var(--text-primary)] transition-colors text-[var(--text-secondary)]">
                {isRTL ? 'إضافة هدف' : 'CREATE GOAL'}
              </span>
            </button>
            <button
              onClick={() => handleAction('/notes?create=true')}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-left transition-all hover:bg-black/5 dark:hover:bg-white/10 group"
            >
              <FileText className="text-lg w-[18px] h-[18px]" style={{ color: currentTheme.color }} />
              <span className="text-xs font-black font-space tracking-widest uppercase group-hover:text-[var(--text-primary)] transition-colors text-[var(--text-secondary)]">
                {isRTL ? 'إضافة ملاحظة' : 'CREATE NOTE'}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          playBlip()
          setIsOpen(!isOpen)
        }}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border shadow-2xl backdrop-blur-xl transition-all"
        style={{ 
          backgroundColor: `${currentTheme.color}22`, 
          borderColor: `${currentTheme.color}44`,
          color: currentTheme.color,
          boxShadow: isOpen ? `0 0 20px ${currentTheme.color}44` : 'none'
        }}
      >
        <Plus className="text-3xl font-black transition-transform duration-300 w-8 h-8" style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }} />
      </motion.button>
    </div>
  )
}
