'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import NeuralMesh from '@/components/ui/NeuralMesh'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const staticThemeColor = '#B0C4DE' // Static Silver / Steel Grey

  const handleGoogleLogin = async () => {
    setLoading(true)
    // Preserve the page user came from (if any) so we can restore it after auth
    const pendingUrl = sessionStorage.getItem('auth_redirect_url')
    if (!pendingUrl) {
      // Only store if nothing is already queued (e.g. invite link)
      const ref = document.referrer
      if (ref && !ref.includes('/auth/')) {
        sessionStorage.setItem('auth_redirect_url', ref)
      }
    }
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
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Immersion Neural Mesh forced to Silver */}
      <NeuralMesh overrideColor={staticThemeColor} />

      {/* Subtle Central Silver Glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none z-[-1] opacity-30 animate-pulse"
        style={{
          background: `radial-gradient(circle, rgba(176, 196, 222, 0.12) 0%, transparent 70%)`,
          filter: 'blur(100px)',
        }}
      />

      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] scanlines z-20" />

      {/* Login Content Wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10 space-y-6 flex flex-col items-center"
      >
        {/* Core Logo & Branding Header */}
        <div className="text-center space-y-2">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-black font-space tracking-wider uppercase text-white leading-none"
            style={{ textShadow: '0 0 30px rgba(176, 196, 222, 0.2)' }}
          >
            GROWTH HUB
          </motion.h1>
        </div>

        {/* Minimal Glassmorphic Card */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 w-full shadow-2xl space-y-6 flex flex-col items-center text-center">
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-space text-white tracking-wide">
              Welcome Back
            </h2>
            <p className="text-xs font-space text-white/50 tracking-wider">
              Sign in to access your workspace.
            </p>
          </div>

          {/* Premium Google OAuth Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="h-11 rounded-xl w-full flex items-center justify-center gap-3 font-bold tracking-wider transition-all duration-300 bg-white text-black hover:bg-white/90 disabled:opacity-40 shadow-lg"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.9c1.69-1.55 2.69-3.85 2.69-6.58z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.22l-2.9-2.25c-.8.54-1.83.87-3.06.87-2.35 0-4.35-1.59-5.06-3.73H.95v2.3C2.43 15.89 5.47 18 9 18z"/>
              <path fill="#FBBC05" d="M3.94 10.67A5.4 5.4 0 0 1 3.6 9c0-.58.1-1.14.28-1.67V5.03H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.03l2.99-2.36z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2A8.99 8.99 0 0 0 0 9l2.99 2.36C3.7 5.17 5.7 3.58 9 3.58z"/>
            </svg>
            <span className="font-space text-xs font-black tracking-widest uppercase">
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
