'use client'

import { Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { useSound } from '@/context/SoundContext'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWARegistration() {
  const { currentTheme, isRTL } = useGrowth()
  const { playBlip, playNeuralLink } = useSound()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('SW registered'))
        .catch(err => console.log('SW failed:', err))
    }

    // Capture standard install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const ev = e as BeforeInstallPromptEvent
      setDeferredPrompt(ev)
      
      // Save globally on window so SettingsPage can access it
      if (typeof window !== 'undefined') {
        (window as any).deferredPWAInstallPrompt = ev
        window.dispatchEvent(new CustomEvent('pwa-prompt-available'))
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for successful install to hide prompt
    const handleAppInstalled = () => {
      console.log('App successfully installed')
      localStorage.setItem('pwa_prompt_dismissed', 'true')
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
    
    window.addEventListener('appinstalled', handleAppInstalled)

    // Listen for manual settings trigger to open the modal
    const handleOpenModal = () => {
      // Check if prompt is available on window if local state hasn't registered it yet
      if (typeof window !== 'undefined' && (window as any).deferredPWAInstallPrompt) {
        setDeferredPrompt((window as any).deferredPWAInstallPrompt)
      }
      setShowPrompt(true)
      playNeuralLink()
    }
    window.addEventListener('open-pwa-install-modal', handleOpenModal)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('open-pwa-install-modal', handleOpenModal)
    }
  }, [playNeuralLink])

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || (typeof window !== 'undefined' ? (window as any).deferredPWAInstallPrompt : null)
    if (!promptToUse) return
    playBlip()
    
    // Trigger browser prompt
    await promptToUse.prompt()
    
    // Await decision
    const choiceResult = await promptToUse.userChoice
    if (choiceResult.outcome === 'accepted') {
      console.log('Operator accepted the PWA install')
      localStorage.setItem('pwa_prompt_dismissed', 'true')
    } else {
      console.log('Operator dismissed the PWA install')
    }
    
    setShowPrompt(false)
    setDeferredPrompt(null)
    if (typeof window !== 'undefined') {
      (window as any).deferredPWAInstallPrompt = null
    }
  }

  const handleDismissClick = () => {
    playBlip()
    setShowPrompt(false)
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-[9999]"
        >
          {/* Glassmorphic Cyberpunk Card Container */}
          <div
            className="w-full bg-zinc-950/90 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-md shadow-2xl relative overflow-hidden"
          >
            {/* Main Header & Branding */}
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 border border-teal-500/30 bg-teal-500/10 text-teal-400 drop-shadow-[0_0_10px_rgba(20,184,166,0.5)]"
              >
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-sm font-black font-space uppercase tracking-wider leading-relaxed text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]"
                >
                  {/* {isRTL ? 'تثبيت التطبيق الأصلي' : 'INSTALL NATIVE APP'} */}
                  {isRTL ? 'تثبيت التطبيق الأصلي' : 'Install Native App'}
                </h3>
                <p className="text-[8px] font-space text-zinc-400 dark:text-white/20 tracking-[0.4em] uppercase font-black mt-1">
                  {/* {isRTL ? 'منصة التطوير والنمو' : 'GROWTH HUB // SYSTEM INT'} */}
                  {isRTL ? 'منصة التطوير والنمو' : 'Growth Hub'}
                </p>
              </div>
            </div>

            {/* Prompt Body Description (Unclipped with clean leading-normal) */}
            <p className="text-xs font-space text-zinc-300 leading-normal mt-4">
              {isRTL 
                ? 'قم بتثبيت Growth Hub على شاشتك الرئيسية للحصول على تجربة تشغيل فائقة السرعة وخالية من المشتتات.' 
                : 'Install Growth Hub on your home screen for a lightning-fast, distraction-free native experience.'}
            </p>

            {/* Strategic Action Row */}
            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-white/5">
              <button
                onClick={handleDismissClick}
                className="bg-transparent text-zinc-400 border border-zinc-700 hover:text-white hover:bg-zinc-800 px-5 py-2 font-space font-black text-[10px] tracking-widest uppercase transition-all rounded-[3px]"
              >
                {/* {isRTL ? 'إلغاء' : 'CANCEL'} */}
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              
              <button
                onClick={handleInstallClick}
                className="bg-teal-500 hover:bg-teal-400 text-black px-5 py-2 font-space font-black text-[10px] tracking-widest uppercase transition-all rounded-[3px] border border-transparent hover:drop-shadow-[0_0_12px_rgba(20,184,166,0.8)] shadow-[0_0_15px_rgba(20,184,166,0.3)]"
              >
                {/* {isRTL ? 'تثبيت التطبيق' : 'INSTALL APP'} */}
                {isRTL ? 'تثبيت التطبيق' : 'Install App'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
