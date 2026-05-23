'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useSound } from '@/context/SoundContext'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  missions?: any[]
}

export default function CommandPalette({ isOpen, onClose, missions = [] }: CommandPaletteProps) {
  const { currentTheme, isRTL } = useGrowth()
  const { showToast } = useToast()
  const { playSuccess, playError, playBlip } = useSound()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'task' | 'note'>('task')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
    }
  }, [isOpen])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const text = query.trim()
    if (!text) return

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      showToast(isRTL ? 'يجب تسجيل الدخول أولاً' : 'Must be logged in', 'warning')
      setLoading(false)
      playError()
      return
    }

    try {
      if (mode === 'task') {
        const activeMission = missions.length > 0 ? missions[0] : null
        
        if (!activeMission) {
          showToast(isRTL ? 'لا توجد مهمة نشطة لإضافة الهدف إليها' : 'No active goal to append task to', 'warning')
          setLoading(false)
          playError()
          return
        }

        const payload = {
          cup_id: activeMission.id,
          title: text,
          original_title: text,
          weight: 1, // default weight
          is_completed: false,
          type: 'standard',
          created_at: new Date().toISOString()
        }
        const { error } = await supabase.from('tasks').insert(payload)
        
        if (error) throw error
        showToast(isRTL ? 'تم إضافة الهدف للمهمة النشطة' : 'Task added to active goal', 'success')
      } else {
        const newNote = {
          user_id: user.id,
          title: 'Quick Note',
          content: text,
          color: currentTheme.color,
          is_locked: false,
          is_on_home: false,
          pos_x: 0,
          pos_y: 0,
          font_settings: { family: 'space', weight: 'normal', style: 'normal' }
        }
        const { error } = await supabase.from('notes').insert(newNote)
        
        if (error) throw error
        showToast(isRTL ? 'تم حفظ الملاحظة السريعة' : 'Quick note saved', 'success')
      }
      playSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      showToast(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving entry', 'warning')
      playError()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-2xl bg-[#09090b] border-2 rounded-2xl shadow-2xl overflow-hidden relative",
              isRTL ? "text-right" : "text-left"
            )}
            style={{ 
              borderColor: currentTheme.color,
              boxShadow: `0 0 40px ${currentTheme.color}33`
            }}
          >
            {/* Ambient Top Glow */}
            <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: currentTheme.color, filter: 'blur(2px)' }} />

            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="p-4 md:p-6 pb-4">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    mode === 'task' 
                      ? (isRTL ? 'أضف هدفاً سريعاً...' : 'Add a quick task...')
                      : (isRTL ? 'اكتب ملاحظة سريعة...' : 'Write a quick note...')
                  }
                  disabled={loading}
                  className="w-full bg-transparent border-none text-2xl md:text-3xl text-[#FFFFFF] placeholder-[#FFFFFF]/20 outline-none font-space font-black tracking-tight"
                />
              </div>

              <div className="px-4 md:px-6 py-3 border-t border-white/5 bg-white/[0.02] flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => { playBlip(); setMode('task'); inputRef.current?.focus(); }}
                  className={cn(
                    "px-4 py-1.5 rounded-md font-space text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2",
                    mode === 'task' 
                      ? "text-black shadow-lg" 
                      : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                  style={mode === 'task' ? { backgroundColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}66` } : {}}
                >
                  <span className="material-symbols-outlined text-sm">checklist</span>
                  {isRTL ? 'مهمة' : 'Task'}
                </button>

                <button
                  type="button"
                  onClick={() => { playBlip(); setMode('note'); inputRef.current?.focus(); }}
                  className={cn(
                    "px-4 py-1.5 rounded-md font-space text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2",
                    mode === 'note' 
                      ? "text-black shadow-lg" 
                      : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                  style={mode === 'note' ? { backgroundColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}66` } : {}}
                >
                  <span className="material-symbols-outlined text-sm">notes</span>
                  {isRTL ? 'ملاحظة' : 'Note'}
                </button>

                <div className="flex-1" />

                <div className="text-[10px] font-space text-white/30 tracking-widest uppercase flex items-center gap-2">
                  <kbd className="bg-white/10 px-2 py-0.5 rounded border border-white/20">ENTER</kbd>
                  {isRTL ? 'للتأكيد' : 'TO SUBMIT'}
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
