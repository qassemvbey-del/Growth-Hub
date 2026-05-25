'use client'

import { HelpCircle, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, currentTheme, isRTL } = useGrowth()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setLoading(true)
    // Save current URL so we can restore after auth
    sessionStorage.setItem('auth_redirect_url', window.location.href)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) {
      alert(error.message)
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {showAuthModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[calc(100%-2rem)] mx-auto md:max-w-md bg-[#09090b] border border-white/10 p-6 md:p-8 space-y-8 rounded-2xl shadow-2xl relative text-center max-h-[90vh] overflow-y-auto my-auto"
            style={{ borderTop: `2px solid ${currentTheme.color}` }}
          >
            {/* Header / Brand */}
            <div className="space-y-2">
              <HelpCircle />
              <h2 className="text-2xl font-black font-space text-white tracking-widest uppercase">
                {isRTL ? 'مزامنة حسابك' : 'Sync Your Account'}
              </h2>
            </div>

            {/* Calm Copy Description */}
            <div className="text-sm font-space leading-relaxed text-zinc-400 font-bold border-r-2 border-zinc-800 pr-4" style={isRTL ? { borderRight: '2px solid #27272a', paddingRight: '1rem', borderLeft: 'none', paddingLeft: '0' } : { borderLeft: '2px solid #27272a', paddingLeft: '1rem', borderRight: 'none', paddingRight: '0' }}>
              {isRTL 
                ? 'تم حفظ مهمتك الأولى محلياً بنجاح. لمزامنة تقدمك، وتثبيت الـ Streak، وحفظ بياناتك بشكل دائم على السيرفر، يرجى تسجيل الدخول باستخدام حساب جوجل.'
                : 'Your first mission has been saved locally. To sync your progress, secure your streak, and save your data permanently to the server, please sign in with a Google account.'}
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="h-12 rounded-xl w-full flex items-center justify-center gap-3 font-space font-black tracking-widest transition-all duration-300 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 uppercase mt-4"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.9c1.69-1.55 2.69-3.85 2.69-6.58z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.22l-2.9-2.25c-.8.54-1.83.87-3.06.87-2.35 0-4.35-1.59-5.06-3.73H.95v2.3C2.43 15.89 5.47 18 9 18z"/>
                <path fill="#FBBC05" d="M3.94 10.67A5.4 5.4 0 0 1 3.6 9c0-.58.1-1.14.28-1.67V5.03H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.03l2.99-2.36z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2A8.99 8.99 0 0 0 0 9l2.99 2.36C3.7 5.17 5.7 3.58 9 3.58z"/>
              </svg>
              <span>
                {loading 
                  ? (isRTL ? 'جاري الاتصال...' : 'Connecting...') 
                  : (isRTL ? 'تسجيل الدخول باستخدام جوجل' : 'Sign in with Google')}
              </span>
            </button>
            
            {/* Close Button (Dismissible fallback) */}
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 rtl:left-4 rtl:right-auto opacity-30 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X className="text-white" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
