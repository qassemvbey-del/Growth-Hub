'use client'

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
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Only show if the user hasn't dismissed it this session
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed')
      if (!dismissed) {
        // Trigger small delayed entrance for visual breathing room
        setTimeout(() => {
          setShowPrompt(true)
          playNeuralLink()
        }, 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for successful install to hide prompt
    const handleAppInstalled = () => {
      console.log('App successfully installed')
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
    
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [playNeuralLink])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    playBlip()
    
    // Trigger browser prompt
    await deferredPrompt.prompt()
    
    // Await decision
    const choiceResult = await deferredPrompt.userChoice
    if (choiceResult.outcome === 'accepted') {
      console.log('Operator accepted the PWA install')
    } else {
      console.log('Operator dismissed the PWA install')
    }
    
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  const handleDismissClick = () => {
    playBlip()
    sessionStorage.setItem('pwa_prompt_dismissed', 'true')
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
            className="w-full bg-[#050505]/95 backdrop-blur-2xl border p-5 md:p-6 rounded-sm shadow-[0_15px_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
            style={{ 
              borderColor: currentTheme.color,
              boxShadow: `0 0 30px ${currentTheme.color}15, inset 0 0 15px ${currentTheme.color}05`
            }}
          >
            {/* Corner Decorative Lights */}
            <div 
              className="absolute top-0 right-0 w-1.5 h-1.5 rounded-bl-[1px]" 
              style={{ backgroundColor: currentTheme.color }} 
            />
            <div 
              className="absolute bottom-0 left-0 w-1.5 h-1.5 rounded-tr-[1px]" 
              style={{ backgroundColor: currentTheme.color }} 
            />

            {/* Glowing Accent Ring Background */}
            <div 
              className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl pointer-events-none opacity-20"
              style={{ backgroundColor: currentTheme.color }}
            />

            {/* Main Header & Branding */}
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0 border"
                style={{ 
                  backgroundColor: `${currentTheme.color}10`,
                  borderColor: `${currentTheme.color}30` 
                }}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ 
                    color: currentTheme.color, 
                    textShadow: `0 0 8px ${currentTheme.color}` 
                  }}
                >
                  cell_tower
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-sm font-black font-space uppercase italic tracking-wider leading-none"
                  style={{ color: currentTheme.color }}
                >
                  {isRTL ? 'مزامنة الواجهة المحلية' : 'UPLINK_SYNC_REQUEST'}
                </h3>
                <p className="text-[8px] font-space text-white/20 tracking-[0.4em] uppercase font-black mt-1">
                  {isRTL ? 'إعدادات PWA النشطة' : 'PWA_LAUNCHER // LOCAL_HUD'}
                </p>
              </div>
            </div>

            {/* Prompt Body Description */}
            <p className="text-[11px] md:text-[12px] font-space text-white/60 leading-relaxed mt-4">
              {isRTL 
                ? 'قم بتثبيت التطبيق على شاشتك الرئيسية للحصول على تجربة سريعة وتصفح خالي من التأخير.' 
                : 'Install the tactical Growth Hub wrapper on your home screen for zero-latency operations and complete offline status updates.'}
            </p>

            {/* Strategic Action Row */}
            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-white/5">
              <button
                onClick={handleDismissClick}
                className="text-[10px] font-space font-black tracking-widest uppercase text-white/40 hover:text-white/80 transition-colors py-2 px-3"
              >
                {isRTL ? 'تجاهل' : 'DISMISS'}
              </button>
              
              <button
                onClick={handleInstallClick}
                className="pwa-install-btn px-5 py-2 font-space font-black text-[10px] tracking-widest uppercase transition-all rounded-[3px] border hover:scale-[1.03] active:scale-[0.97]"
                style={{ 
                  color: currentTheme.color,
                  borderColor: currentTheme.color,
                  backgroundColor: currentTheme.color + '20',
                  boxShadow: `0 0 15px ${currentTheme.color}33`
                }}
              >
                {isRTL ? 'تثبيت' : 'INSTALL APP'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
