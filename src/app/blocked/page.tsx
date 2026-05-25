'use client'

import { HelpCircle } from 'lucide-react'
import React from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BlockedPage() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4 font-space overflow-hidden relative">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none z-[100] scanlines opacity-[0.03]" />
      <div className="fixed inset-0 pointer-events-none z-0 cyber-grid opacity-[0.1]" />
      <div className="fixed inset-0 bg-gradient-to-t from-red-950/20 to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-red-500/30 p-8 rounded-sm relative z-10 shadow-[0_0_50px_rgba(255,0,0,0.1)]"
      >
        {/* Neon Corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500/50" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500/50" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-500/50" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500/50" />

        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 mb-4">
            <HelpCircle />
          </div>

          <h1 className="text-3xl font-black text-red-500 tracking-tighter uppercase">
            ACCESS_DENIED
          </h1>
          
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              <span className="text-red-500 font-bold tracking-widest block mb-2">ACCOUNT_SUSPENDED</span>
              Your access to the Growth Hub has been terminated by system administration. 
              Violation of core terms detected.
            </p>
            
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-sm text-left">
              <p className="text-[10px] font-black text-red-400/50 tracking-widest uppercase mb-1">CONTACT SUPPORT:</p>
              <p className="text-xs text-white/40 font-mono">admin@growthhub.sys</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black tracking-[0.3em] uppercase text-xs transition-all shadow-[0_0_20px_rgba(220,20,60,0.3)] hover:shadow-[0_0_30px_rgba(220,20,60,0.5)] active:scale-95"
          >
            LOGOUT
          </button>
        </div>
      </motion.div>

      {/* Decorative Glitch Elements */}
      <div className="fixed top-10 left-10 text-[10px] text-red-500/20 font-mono hidden lg:block">
        ERROR_CODE: 0x8004100E<br />
        SEC_LEVEL: BLACK<br />
        STATUS: RESTRICTED
      </div>
    </div>
  )
}
