'use client'

import React, { useState, useEffect } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { useToast } from '@/components/ui/Toast'
import { useSound } from '@/context/SoundContext'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Plus, Users, LayoutGrid, Trophy, Bot, Sun, Moon, CornerDownLeft, Sparkles } from 'lucide-react'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onOpenCoach?: () => void
}

export default function CommandPalette({ isOpen, onClose, onOpenCoach }: CommandPaletteProps) {
  const { currentTheme, isRTL } = useGrowth()
  const { showToast } = useToast()
  const { playBlip, playSuccess } = useSound()
  const router = useRouter()
  const [search, setSearch] = useState('')

  // Toggle Dark/Light Mode logic
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    showToast(
      isRTL 
        ? `تم تفعيل المظهر ${isDark ? 'الداكن' : 'المضيء'}` 
        : `Switched to ${isDark ? 'Dark' : 'Light'} Mode`, 
      'success'
    )
    playSuccess()
    onClose()
  }

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const runCommand = (action: () => void) => {
    playBlip()
    action()
  }

  return (
    <>
      {/* Dynamic Style Injection for CMDK selected elements */}
      <style jsx global>{`
        [data-selected="true"] {
          border-left: 2px solid var(--selected-border-color) !important;
          background-color: rgba(255, 255, 255, 0.05) !important;
          color: #ffffff !important;
        }
      `}</style>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -20, opacity: 0 }}
              className={cn(
                "w-full max-w-2xl bg-[#09090b]/95 border-2 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative z-50",
                isRTL ? "text-right" : "text-left"
              )}
              style={{ 
                borderColor: currentTheme.color,
                boxShadow: `0 0 30px ${currentTheme.color}25`
              }}
            >
              {/* Glowing accent top line */}
              <div 
                className="absolute top-0 inset-x-0 h-[2px]" 
                style={{ backgroundColor: currentTheme.color, filter: 'blur(1px)' }} 
              />

              <Command 
                label="Cyberpunk Command Palette" 
                className="flex flex-col h-full text-white font-space"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onClose()
                }}
              >
                {/* Input wrapper */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.08]">
                  <Sparkles className="w-5 h-5 shrink-0" style={{ color: currentTheme.color }} />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder={isRTL ? "ابحث عن أمر أو وجهة..." : "Type a command or search..."}
                    className="flex-1 bg-transparent border-none text-[#FFFFFF] placeholder-[#FFFFFF]/30 outline-none font-space font-medium text-lg"
                    autoFocus
                  />
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono tracking-widest border border-zinc-800 rounded px-1.5 py-0.5 bg-black/40 uppercase">
                    ESC
                  </div>
                </div>

                {/* List */}
                <Command.List className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-850">
                  <Command.Empty className="py-6 text-center text-sm text-zinc-500 font-space tracking-wider uppercase">
                    {isRTL ? "لا توجد نتائج مطابقة" : "No active modules matched"}
                  </Command.Empty>

                  {/* Actions Group */}
                  <Command.Group 
                    heading={isRTL ? "الإجراءات البرمجية" : "ACTIONS // COMMAND_LIST"}
                    className="px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-space"
                  >
                    <Command.Item
                      value="create new goal"
                      onSelect={() => runCommand(() => { router.push('/missions?create=true'); onClose(); })}
                      className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-zinc-300 hover:text-white cursor-pointer transition-all gap-3"
                      style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                          <Plus className="w-4 h-4" style={{ color: currentTheme.color }} />
                        </div>
                        <span className="font-semibold tracking-wide">{isRTL ? "إنشاء هدف جديد" : "Create New Goal"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                        <span>{isRTL ? "إجراء" : "ACTION"}</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    </Command.Item>

                    <Command.Item
                      value="create team workspace"
                      onSelect={() => runCommand(() => { router.push('/goals/squad?create=true'); onClose(); })}
                      className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-zinc-300 hover:text-white cursor-pointer transition-all gap-3 mt-1"
                      style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                          <Users className="w-4 h-4" style={{ color: currentTheme.color }} />
                        </div>
                        <span className="font-semibold tracking-wide">{isRTL ? "إنشاء مساحة عمل جماعية" : "Create Team Workspace"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                        <span>{isRTL ? "إجراء" : "ACTION"}</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    </Command.Item>
                  </Command.Group>

                  <div className="h-[1px] bg-white/[0.04] my-2 mx-2" />

                  {/* Navigation Group */}
                  <Command.Group 
                    heading={isRTL ? "الملاحة والتوجيه" : "NAVIGATION // MATRIX"}
                    className="px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-space"
                  >
                    <Command.Item
                      value="go to dashboard"
                      onSelect={() => runCommand(() => { router.push('/'); onClose(); })}
                      className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-zinc-300 hover:text-white cursor-pointer transition-all gap-3 mt-1"
                      style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                          <LayoutGrid className="w-4 h-4" style={{ color: currentTheme.color }} />
                        </div>
                        <span className="font-semibold tracking-wide">{isRTL ? "الذهاب للوحة التحكم" : "Go to Dashboard"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                        <span>{isRTL ? "ملاحة" : "NAV"}</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    </Command.Item>

                    <Command.Item
                      value="go to vault ranks"
                      onSelect={() => runCommand(() => { router.push('/vault'); onClose(); })}
                      className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-zinc-300 hover:text-white cursor-pointer transition-all gap-3 mt-1"
                      style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                          <Trophy className="w-4 h-4" style={{ color: currentTheme.color }} />
                        </div>
                        <span className="font-semibold tracking-wide">{isRTL ? "الذهاب إلى الخزنة (الرتب)" : "Go to Vault (Ranks)"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                        <span>{isRTL ? "ملاحة" : "NAV"}</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    </Command.Item>

                    <Command.Item
                      value="go to coach"
                      onSelect={() => runCommand(() => { if (onOpenCoach) onOpenCoach(); onClose(); })}
                      className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-zinc-300 hover:text-white cursor-pointer transition-all gap-3 mt-1"
                      style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                          <Bot className="w-4 h-4" style={{ color: currentTheme.color }} />
                        </div>
                        <span className="font-semibold tracking-wide">{isRTL ? "الذهاب إلى المدرب الشخصي" : "Go to Coach"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                        <span>{isRTL ? "ملاحة" : "NAV"}</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    </Command.Item>
                  </Command.Group>

                  <div className="h-[1px] bg-white/[0.04] my-2 mx-2" />

                  {/* Theme Group */}
                  <Command.Group 
                    heading={isRTL ? "إعدادات المنظومة" : "SYSTEM // STYLES"}
                    className="px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-space"
                  >
                    <Command.Item
                      value="toggle dark light mode"
                      onSelect={() => runCommand(toggleTheme)}
                      className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-zinc-300 hover:text-white cursor-pointer transition-all gap-3 mt-1"
                      style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded flex items-center justify-center">
                          <Sun className="w-4.5 h-4.5 text-amber-400 dark:hidden" />
                          <Moon className="w-4.5 h-4.5 text-cyan-400 hidden dark:block" />
                        </div>
                        <span className="font-semibold tracking-wide">{isRTL ? "تبديل المظهر الداكن / المضيء" : "Toggle Dark/Light Mode"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                        <span>{isRTL ? "إعداد" : "SYS"}</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    </Command.Item>
                  </Command.Group>
                </Command.List>

                {/* Footer details */}
                <div className="px-4 py-3 border-t border-white/[0.08] bg-black/60 flex items-center justify-between text-[10px] font-space text-zinc-500 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 font-black">◆</span>
                    <span>{isRTL ? "لوحة التوجيه السيبرانية" : "CYBERPUNK NAVIGATION CORE v2"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <kbd className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-400">↑↓</kbd>
                      <span>{isRTL ? "للتنقل" : "NAVIGATE"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-400">ENTER</kbd>
                      <span>{isRTL ? "للتأكيد" : "SELECT"}</span>
                    </div>
                  </div>
                </div>
              </Command>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
