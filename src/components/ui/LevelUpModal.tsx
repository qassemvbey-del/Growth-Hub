'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import EnergyCell from './EnergyCell'

export default function LevelUpModal() {
  const { isRankUpModalOpen, setIsRankUpModalOpen, oldRank, newRank, currentTheme, isRTL } = useGrowth()

  return (
    <AnimatePresence>
      {isRankUpModalOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-black/95 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Cyber scanlines overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_95%,rgba(0,206,209,0.03)_95%)] bg-[size:100%_18px] pointer-events-none" />

          {/* Central celebratory card */}
          <div className="relative flex flex-col items-center w-[calc(100%-2rem)] mx-auto md:max-w-lg p-5 md:p-8 border border-cyan-500/20 bg-white/90 dark:bg-[#050505]/80 backdrop-blur-md text-center rounded-2xl shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            {/* Top flashing system indicator */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-[#00CED1] to-transparent animate-pulse" />
            
            {/* Ambient circular neon sweep */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-12 w-80 h-80 border border-dashed border-[#00CED1]/15 rounded-full pointer-events-none"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-12 w-[340px] h-[340px] border border-dashed border-[#00CED1]/5 rounded-full pointer-events-none"
            />

            {/* Glowing active backdrop spot */}
            <div 
              className="absolute w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 -z-10"
              style={{ backgroundColor: currentTheme.color }}
            />

            {/* Expanding and levitating EnergyCell */}
            <motion.div
              initial={{ scale: 0.3, y: 50, opacity: 0 }}
              animate={{ 
                scale: 1, 
                y: [0, -10, 0],
                opacity: 1,
                filter: [
                  `drop-shadow(0 0 8px ${currentTheme.color}88)`,
                  `drop-shadow(0 0 25px ${currentTheme.color}ff)`,
                  `drop-shadow(0 0 8px ${currentTheme.color}88)`
                ]
              }}
              transition={{ 
                scale: { duration: 0.8, ease: "easeOut" },
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                filter: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
              className="mb-10 mt-4 flex items-center justify-center"
            >
              <EnergyCell percentage={100} size="xl" color={currentTheme.color} />
            </motion.div>

            {/* Typography Celebrations */}
            <motion.h2 
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
              className="text-4xl md:text-5xl font-black italic tracking-tighter text-[#00CED1] uppercase font-space"
              style={{
                textShadow: `0 0 15px ${currentTheme.color}88`
              }}
            >
              {isRTL ? 'ترقية الرتبة' : 'RANK UPED'}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 inline-flex items-center gap-3 py-2.5 px-4 rounded-xl bg-cyan-500/10 dark:bg-cyan-950/40 border border-cyan-800/30 text-[10px] md:text-xs font-space font-black tracking-widest text-zinc-700 dark:text-[#B0C4DE]"
            >
              <span>{oldRank}</span>
              <span className="material-symbols-outlined text-sm text-[#00CED1]">double_arrow</span>
              <span className="text-zinc-900 dark:text-white font-bold">{newRank}</span>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 text-[10px] md:text-xs leading-relaxed text-black/50 dark:text-white/50 tracking-widest font-space max-w-sm uppercase"
            >
              {isRTL 
                ? 'تم بنجاح تحديث ترخيص العضو. تم تفعيل ميزات النظام الإضافية للمستوى التالي.' 
                : 'MEMBER STATUS MODIFIED. ACTIVE SYSTEM PERKS EXPANDED TO THE NEXT TIER.'}
            </motion.p>

            <motion.button
              whileHover={{ scale: 1.03, boxShadow: `0 0 20px ${currentTheme.color}` }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              onClick={() => setIsRankUpModalOpen(false)}
              className="mt-8 w-full py-2.5 px-4 text-xs font-black tracking-widest text-black bg-[#00CED1] rounded-xl font-space uppercase transition-all hover:brightness-110 active:brightness-90 shadow-lg"
            >
              {isRTL ? 'تحديث واجهة التحكم' : 'UPDATE DASHBOARD'}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
