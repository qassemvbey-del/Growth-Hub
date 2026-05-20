'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, createContext, useContext } from 'react'

import { useGrowth } from '@/context/GrowthContext'

interface Toast {
  id: string
  message: string
  type: 'success' | 'warning' | 'info'
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'warning' | 'info') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const { currentTheme, isRTL, mounted } = useGrowth()

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && (
        <div 
          className={`fixed top-4 z-[99999] flex flex-col gap-2 w-full px-4 pointer-events-none left-1/2 -translate-x-1/2 md:top-6 md:left-auto md:translate-x-0 ${isRTL ? 'md:left-6' : 'md:right-6'} max-w-[310px] md:max-w-[350px]`}
        >
          <AnimatePresence>
            {toasts.map(toast => {
              // Dynamic themes based on type
              let color = currentTheme.color
              let icon = 'cognition'
              let label = isRTL ? 'إشعار النظام' : 'AI_FEEDBACK'
              
              if (toast.type === 'success') {
                color = currentTheme.color
                icon = 'check_circle'
                label = isRTL ? 'اكتملت العملية' : 'SYSTEM_SUCCESS'
              } else if (toast.type === 'warning') {
                color = '#ef4444' // alert red-orange
                icon = 'warning'
                label = isRTL ? 'تنبيه النظام' : 'SYSTEM_WARNING'
              }

              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: -25, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="pointer-events-auto"
                >
                  <div 
                    className="relative bg-zinc-950/80 dark:bg-black/85 backdrop-blur-xl border border-white/5 rounded-xl py-2.5 px-3.5 shadow-2xl flex items-center gap-3 overflow-hidden group select-none"
                    style={{ 
                      boxShadow: `0 8px 30px -10px rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 12px -3px ${color}20`
                    }}
                  >
                    {/* Symmetrical glowing accent strip */}
                    <div 
                      className={`absolute top-0 bottom-0 w-[2.5px] ${isRTL ? 'right-0' : 'left-0'}`}
                      style={{ backgroundColor: color }}
                    />

                    {/* Premium back glow */}
                    <div 
                      className="absolute w-28 h-28 rounded-full pointer-events-none opacity-10 transition-opacity duration-500 group-hover:opacity-15"
                      style={{
                        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                        top: '-20px',
                        [isRTL ? 'left' : 'right']: '-20px'
                      }}
                    />

                    {/* Tech icon circle frame */}
                    <div 
                      className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 border border-white/5 bg-white/[0.02]"
                      style={{ color }}
                    >
                      <span className="material-symbols-outlined text-base font-bold">{icon}</span>
                    </div>

                    {/* Main content body */}
                    <div className="flex-1 min-w-0 text-start space-y-0.5">
                      <p 
                        className="text-[8px] font-mono tracking-[0.2em] uppercase font-black opacity-60"
                        style={{ color }}
                      >
                        {label}
                      </p>
                      <p className="text-xs md:text-[13px] font-space font-semibold text-zinc-100 leading-snug break-words">
                        {toast.message}
                      </p>
                    </div>

                    {/* Symmetrical dismiss button */}
                    <button 
                      onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                      className="w-[26px] h-[26px] rounded-md flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white/80 transition-all cursor-pointer shrink-0 opacity-40 hover:opacity-100"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>

                    {/* Symmetrical animated progress timer bar */}
                    <motion.div 
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 4, ease: 'linear' }}
                      className={`absolute bottom-0 h-[1.5px] opacity-70 ${isRTL ? 'right-0' : 'left-0'}`}
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
