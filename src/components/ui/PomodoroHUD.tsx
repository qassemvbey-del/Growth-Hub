'use client'

import { AlertTriangle, Settings, Minimize2 } from 'lucide-react'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePomodoro } from '@/context/PomodoroContext'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'

export default function PomodoroHUD() {
  const { currentTheme } = useGrowth()
  const { 
    timeRemaining, isActive, isPaused, isInitialized, sessionType, taskName, isMinimized,
    focusDuration, breakDuration,
    startTimer, pause, resume, stop, toggleMinimize, updateConfig,
    showSwitchWarning, pendingSwitchTask, confirmSwitch, cancelSwitch
  } = usePomodoro()

  const isRTL = typeof document !== 'undefined' && (document.dir === 'rtl' || document.documentElement.lang === 'ar');

  const [showSettings, setShowSettings] = React.useState(false)
  const [localFocus, setLocalFocus] = React.useState(focusDuration)
  const [localBreak, setLocalBreak] = React.useState(breakDuration)

  if (!isInitialized && !showSwitchWarning) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSave = () => {
    updateConfig(localFocus, localBreak)
    setShowSettings(false)
  }

  return (
    <>
      <AnimatePresence>
        {isInitialized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              x: 0,
              boxShadow: isActive && !isPaused
                ? [
                    "0 0 15px rgba(249, 115, 22, 0.15)",
                    "0 0 25px rgba(249, 115, 22, 0.35)",
                    "0 0 15px rgba(249, 115, 22, 0.15)"
                  ]
                : "0 0 30px rgba(0,0,0,0.5)"
            }}
            exit={{ opacity: 0, scale: 0.8, x: 50 }}
            transition={{
              boxShadow: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              },
              duration: 0.3
            }}
            className={cn(
              "fixed bottom-6 right-6 z-[400] font-space border rounded-xl bg-zinc-950/90 backdrop-blur-md border-orange-500/30 text-white transition-all duration-300",
              isMinimized 
                ? "w-auto px-4 py-2 cursor-pointer group" 
                : "w-64 overflow-hidden"
            )}
            onClick={() => isMinimized && toggleMinimize()}
          >
            {isMinimized ? (
              /* FLOATING PILL VIEW */
              <div className="flex items-center gap-3">
                 <motion.span 
                   animate={isActive && !isPaused ? { opacity: [0.4, 1, 0.4] } : {}}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="text-[10px] font-black text-orange-500" 
                 >
                   {sessionType === 'FOCUS' ? '⚡' : '☕'}
                 </motion.span>
                 <span className="text-sm font-black text-orange-500 transition-colors">
                   {formatTime(timeRemaining)}
                 </span>
              </div>
            ) : (
              /* FULL HUD VIEW */
              <>
                {/* Header */}
                <div className={cn(
                  "px-3 py-1.5 flex justify-between items-center border-b border-orange-500/20 bg-orange-500/5"
                )}>
                  <div className="flex items-center gap-2">
                    <motion.div 
                      animate={isActive && !isPaused ? { opacity: [0.3, 1, 0.3] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: sessionType === 'FOCUS' ? '#F97316' : '#00E5FF' }}
                    />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: sessionType === 'FOCUS' ? '#F97316' : '#00E5FF' }}>
                      {sessionType === 'FOCUS' ? (isRTL ? '⚡ وضع التركيز نشط' : '⚡ FOCUS_ACTIVE') : (isRTL ? '☕ فترة الاستراحة' : '☕ RECOVERY')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    {!isMinimized && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} 
                        className={cn("transition-colors hover:text-orange-400 pomodoro-btn cursor-pointer")}
                        style={{ color: showSettings ? '#F97316' : 'var(--text-secondary)' }}
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleMinimize(); }} 
                      className="hover:text-orange-400 pomodoro-btn cursor-pointer"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {showSettings ? (
                    <div className="space-y-4 py-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-black text-white tracking-widest uppercase">{isRTL ? 'إعدادات التايمر' : 'TIMER_CONFIG'}</span>
                      </div>
                      <div className="space-y-3">
                         <div className="space-y-1">
                            <label className={cn("font-black uppercase tracking-widest block text-[8px] text-zinc-400")}>{isRTL ? 'مدة التركيز (دقيقة)' : 'FOCUS_DURATION (MIN)'}</label>
                            <input 
                              type="number"
                              min="1"
                              max="120"
                              value={localFocus}
                              onChange={e => setLocalFocus(parseInt(e.target.value) || 1)}
                              className="w-full bg-zinc-900 border border-orange-500/20 focus:border-orange-500 p-2 text-xs font-space font-black text-orange-500 outline-none rounded"
                            />
                         </div>
                         <div className="space-y-1">
                            <label className={cn("font-black uppercase tracking-widest block text-[8px] text-zinc-400")}>{isRTL ? 'مدة الراحة (دقيقة)' : 'BREAK_DURATION (MIN)'}</label>
                            <input 
                              type="number"
                              min="1"
                              max="120"
                              value={localBreak}
                              onChange={e => setLocalBreak(parseInt(e.target.value) || 1)}
                              className="w-full bg-zinc-900 border border-cyan-500/20 focus:border-cyan-500 p-2 text-xs font-space font-black text-cyan-400 outline-none rounded"
                            />
                         </div>
                      </div>
                      <button 
                        onClick={handleSave}
                        className="w-full py-2 font-space font-black text-[11px] uppercase tracking-widest text-zinc-900 rounded transition-all hover:brightness-110 cursor-pointer"
                        style={{ backgroundColor: '#F97316' }}
                      >
                        {isRTL ? 'حفظ الإعدادات' : 'SAVE_CONFIG'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <p className={cn("font-black uppercase tracking-widest block text-[8px] text-zinc-400")}>{isRTL ? 'المهمة الحالية:' : 'CURRENT_OBJECTIVE:'}</p>
                        <p className="text-[11px] font-bold text-white uppercase truncate">{taskName || (isRTL ? 'بدون عنوان' : 'UNTITLED_PROTOCOL')}</p>
                      </div>

                      <div className="flex flex-col items-center justify-center py-2">
                        <motion.p 
                          animate={isActive && !isPaused ? { 
                            opacity: [0.9, 1, 0.9],
                            scale: [1, 1.03, 1],
                            textShadow: [
                              "0 0 4px rgba(249, 115, 22, 0.2)",
                              "0 0 16px rgba(249, 115, 22, 0.6)",
                              "0 0 4px rgba(249, 115, 22, 0.2)"
                            ]
                          } : {}}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          className={cn(
                            "text-4xl font-black tracking-widest text-orange-500 font-mono transition-all",
                            !isActive && "opacity-40"
                          )}
                        >
                          {formatTime(timeRemaining)}
                        </motion.p>
                      </div>

                      <div className="flex gap-2 pt-1">
                        {!isActive ? (
                          <button 
                            onClick={startTimer}
                            className="flex-1 py-2 text-zinc-900 font-space font-black text-[12px] uppercase tracking-[0.2em] rounded transition-all hover:brightness-110 cursor-pointer"
                            style={{ backgroundColor: '#F97316', boxShadow: `0 0 15px rgba(249, 115, 22, 0.4)` }}
                          >
                            {isRTL ? 'ابدأ التركيز' : 'START'}
                          </button>
                        ) : isPaused ? (
                          <button 
                            onClick={resume}
                            className="flex-1 py-1.5 text-zinc-900 font-space font-black text-[9px] uppercase tracking-widest rounded transition-all hover:brightness-110 cursor-pointer"
                            style={{ backgroundColor: '#F97316' }}
                          >
                            RESUME
                          </button>
                        ) : (
                          <button 
                            onClick={pause}
                            className="flex-1 py-1.5 bg-zinc-900 border border-orange-500/20 text-white font-space font-black text-[9px] uppercase tracking-widest rounded transition-all hover:bg-zinc-800 cursor-pointer"
                          >
                            PAUSE
                          </button>
                        )}
                        <button 
                          onClick={stop}
                          className="px-3 py-1.5 bg-[#FF0055]/10 text-[#FF0055] border border-[#FF0055]/30 font-space font-black text-[11px] uppercase tracking-widest hover:bg-[#FF0055]/20 rounded transition-all cursor-pointer"
                        >
                          {isActive ? (isRTL ? 'إيقاف' : 'STOP') : (isRTL ? 'إغلاق' : 'CLOSE')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTEXT SWITCHING WARNING OVERLAY */}
      <AnimatePresence>
        {showSwitchWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-white/80 dark:bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md border bg-[var(--card-bg)] p-6 rounded-sm shadow-[0_0_50px_rgba(255,0,85,0.3)] relative overflow-hidden"
              style={{ borderColor: '#FF0055' }}
            >
              {/* Neon alert top line */}
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-[#FF0055]" />
              
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-[#FF0055]">
                  <AlertTriangle className="text-3xl animate-pulse w-8 h-8" />
                  <h3 className="text-lg font-black tracking-widest uppercase font-space">
                    {isRTL ? 'تحذير: تشتيت التركيز' : 'WARNING: CONTEXT SWITCHING'}
                  </h3>
                </div>

                <div className="space-y-4 font-space text-xs leading-relaxed text-[var(--text-primary)]">
                  <p className="font-bold border-l-2 border-[#FF0055] pl-3 py-1 bg-[#FF0055]/5">
                    {isRTL 
                      ? '🚧 تنبيه: التنقل المتكرر بين المهام يقلل الأداء الذهني بنسبة تصل إلى 40%.' 
                      : '🚧 WARNING: Context Switching degrades cognitive performance by up to 40%.'}
                  </p>
                  <p className="text-[var(--text-secondary)]">
                    {isRTL
                      ? 'التركيز هو الركيزة الأساسية للإنتاجية. الانتقال المتكرر بين المهام وتشتيت الانتباه يؤثر سلباً على سرعة وجودة إنجاز أهدافك الحالية.'
                      : 'Multi-tasking is a cognitive drain. Sticking to a single task until completion is the optimal path for operational success.'}
                  </p>
                  {pendingSwitchTask && (
                    <div className="p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-sm space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)]">
                        {isRTL ? 'المهمة البديلة المقترحة:' : 'TARGET OBJECTIVE:'}
                      </p>
                      <p className="font-black text-sm uppercase text-[var(--text-primary)]">
                        {pendingSwitchTask.name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={confirmSwitch}
                    className="flex-1 py-2.5 bg-[#FF0055]/10 text-[#FF0055] border border-[#FF0055]/30 hover:bg-[#FF0055]/20 font-space font-black text-xs uppercase tracking-widest transition-all pomodoro-btn"
                  >
                    {isRTL ? 'استبدال المهمة' : 'FORCE SWAP'}
                  </button>
                  <button
                    onClick={cancelSwitch}
                    className="flex-1 py-2.5 text-zinc-900 font-space font-black text-xs uppercase tracking-widest transition-all pomodoro-btn"
                    style={{ backgroundColor: currentTheme.color }}
                  >
                    {isRTL ? 'الاستمرار بالتركيز' : 'KEEP FOCUSING'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
