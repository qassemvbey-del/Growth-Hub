'use client'

import { Check, X, Code2, Network, BarChartBig, GraduationCap, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

const CLASSES = [
  {
    id: 'programmer',
    title: 'Programmer',
    description: 'Software development, websites, and building smart systems.',
    image: '/champions/programmer.png',
    themeColor: '#0ea5e9',
    WatermarkIcon: Code2,
    skills: [
      { name: 'Fix Errors', rank: 'Silver' },
      { name: 'Code Review', rank: 'Gold' },
      { name: 'Refactor Assistant', rank: 'Platinum' }
    ]
  },
  {
    id: 'network',
    title: 'Network Engineer',
    description: 'Infrastructure management, networks, and server security.',
    image: '/champions/network.png',
    themeColor: '#22c55e',
    WatermarkIcon: Network,
    skills: [
      { name: 'Fix Errors', rank: 'Silver' },
      { name: 'Log Analyzer', rank: 'Gold' },
      { name: 'Packet Troubleshooter', rank: 'Platinum' }
    ]
  },
  {
    id: 'accountant',
    title: 'Accountant',
    description: 'Financial planning, asset management, and account analysis.',
    image: '/champions/accountant.png',
    themeColor: '#eab308',
    WatermarkIcon: BarChartBig,
    skills: [
      { name: 'Formula Builder', rank: 'Silver' },
      { name: 'Financial Analyzer', rank: 'Gold' },
      { name: 'Audit Assistant', rank: 'Platinum' }
    ]
  },
  {
    id: 'learner',
    title: 'Learner',
    description: 'General studies, skill development, and personal growth tracking.',
    image: '/champions/learner.png',
    themeColor: '#a855f7',
    WatermarkIcon: GraduationCap,
    skills: [
      { name: 'Concept Simplifier', rank: 'Silver' },
      { name: 'Study Assistant', rank: 'Gold' },
      { name: 'Deep Explainer', rank: 'Platinum' }
    ]
  }
]

interface Props {
  onClose: () => void
  onSaved?: (url: string) => void
}

export default function AvatarSelector({ onClose, onSaved }: Props) {
  const { profile, setProfile, showToast } = useGrowth() as any // fallback if not in typing context
  const toast = useToast()
  
  const [chosenClass, setChosenClass] = useState<string>(() => {
    const rawClass = profile?.champion_class || CLASSES[0].id
    if (rawClass === 'network_engineer') return 'network'
    return rawClass
  })
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!profile?.id || !chosenClass) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          champion_class: chosenClass,
          onboarded: true
        })
        .eq('id', profile.id)

      if (error) throw error

      const updatedProfile = {
        ...profile,
        champion_class: chosenClass as any,
        onboarded: true
      }
      setProfile(updatedProfile)

      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('cached_profile')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            parsed.champion_class = chosenClass
            parsed.onboarded = true
            localStorage.setItem('cached_profile', JSON.stringify(parsed))
          } catch (e) {}
        } else {
          localStorage.setItem('cached_profile', JSON.stringify(updatedProfile))
        }
      }

      toast.showToast('Class updated successfully!', 'success')
      onSaved?.(profile.avatar_url || '')
      onClose()
    } catch (err) {
      console.error('Save class error:', err)
      toast.showToast('Update failed', 'warning')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedClassObj = CLASSES.find(c => c.id === chosenClass) || CLASSES[0]

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        />

        <motion.div
          className="relative z-10 w-full max-w-[1000px] bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row select-none"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
        >
          
          {/* Roster Column (Left side in LTR) */}
          <div className="w-full md:w-1/3 p-6 border-r border-white/5 flex flex-col gap-4 bg-[#07070b]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-lg font-space font-black text-white tracking-tight">
                Choose Your Champion
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/5 md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px] md:max-h-[500px] pr-1">
              {CLASSES.map((cls) => {
                const isSelected = chosenClass === cls.id
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setChosenClass(cls.id)}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer border border-transparent text-left w-full",
                      isSelected 
                        ? "bg-white/10 scale-[1.02] opacity-100" 
                        : "bg-transparent opacity-60 grayscale hover:grayscale-0 hover:bg-white/5"
                    )}
                    style={isSelected ? { 
                      borderColor: cls.themeColor, 
                      boxShadow: `0 0 12px ${cls.themeColor}33` 
                    } : {}}
                  >
                    <img 
                      src={cls.image} 
                      className="w-14 h-14 rounded-lg object-cover shadow-md shrink-0" 
                      alt={cls.title} 
                    />
                    <span className="text-lg font-bold text-white leading-tight">
                      {cls.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Details Column (Right side in LTR) */}
          <div 
            className="w-full md:w-2/3 p-6 md:p-8 relative bg-black/30 flex flex-col justify-between overflow-hidden"
            style={{
              background: `radial-gradient(circle at bottom right, ${selectedClassObj.themeColor}0f, transparent 70%)`
            }}
          >
            {/* Close Button (Desktop only) */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/5 hidden md:flex items-center justify-center text-zinc-400 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/5 z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Massive Faint Watermark Sticker */}
            <selectedClassObj.WatermarkIcon 
              className="text-white/5 opacity-10 absolute -bottom-10 -left-10 pointer-events-none" 
              size={250} 
            />

            <div className="relative z-10 flex-1 flex flex-col justify-start">
              {/* Header Preview */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 border-b border-white/5 pb-6">
                <img 
                  src={selectedClassObj.image} 
                  className="w-32 h-32 rounded-2xl object-cover shadow-2xl border-2 shrink-0" 
                  style={{ borderColor: selectedClassObj.themeColor }}
                  alt={selectedClassObj.title}
                />
                <div className="space-y-3 text-center sm:text-left pt-2">
                  <h3 className="text-3xl font-black text-white leading-none">
                    {selectedClassObj.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
                    {selectedClassObj.description}
                  </p>
                </div>
              </div>

              {/* Abilities List */}
              <div className="flex flex-col gap-3 mt-6">
                {selectedClassObj.skills.map((skill, index) => {
                  const isGold = skill.rank === 'Gold'
                  const isPlatinum = skill.rank === 'Platinum'
                  const badgeColor = isGold 
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                    : isPlatinum 
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-slate-400/20 text-slate-300 border border-slate-400/30'
                  
                  return (
                    <div 
                      key={index}
                      className="flex flex-row items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5"
                    >
                      <span className="text-sm font-medium text-white">
                        {skill.name}
                      </span>
                      <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded", badgeColor)}>
                        {skill.rank}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Lock-in Button */}
            <div className="mt-8 relative z-10">
              <motion.button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 rounded-xl font-space font-black text-sm tracking-wider transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer text-black hover:brightness-110 active:scale-[0.99]"
                style={{
                  backgroundColor: selectedClassObj.themeColor,
                  boxShadow: `0 4px 25px ${selectedClassObj.themeColor}40`,
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isSaving ? (
                  <span>Locking in...</span>
                ) : (
                  <span>Confirm Champion</span>
                )}
              </motion.button>
            </div>

          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
