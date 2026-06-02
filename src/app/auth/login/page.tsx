'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useMousePosition } from '@/hooks/useMousePosition'
// import NeuralMesh from '@/components/ui/NeuralMesh'
import { Target, Shield, Trophy, Globe, Zap } from 'lucide-react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState<'ar' | 'en'>('ar') // Default to Arabic to match system focus
  const supabase = createClient()
  const mouse = useMousePosition()

  // COMMENTED OUT FOR COMPLIANCE:
  // const staticThemeColor = '#B0C4DE' // Elegant Steel Silver

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as 'ar' | 'en'
      if (savedLang === 'ar' || savedLang === 'en') {
        setLang(savedLang)
      } else {
        localStorage.setItem('language', 'ar')
      }
    }
  }, [])

  const toggleLanguage = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar'
    setLang(newLang)
    localStorage.setItem('language', newLang)
    if (typeof document !== 'undefined') {
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    const pendingUrl = sessionStorage.getItem('auth_redirect_url')
    if (!pendingUrl) {
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

  // Translation Dictionaries
  const t = {
    ar: {
      title: 'منصة الإنتاجية وتطوير نفسك',
      subtitle: 'GROWTH HUB',
      welcome: 'أهلاً بيك من تاني',
      desc: 'سجل دخولك دلوقتي عشان تدخل على الـ Dashboard بتاعتك وتتكلم مع مساعد الـ AI عشان تحقق الـ Goals بتاعتك.',
      button: 'ادخل بـ Google',
      signingIn: 'بندخلك دلوقتي...',
      tagline: 'مكان شغل متكامل عشان تدير الـ Goals والـ Tasks بتاعتك بإنتاجية عالية.',
      feature1Title: 'محرك الـ Goals الذكي',
      feature1Desc: 'تخطيط الـ Goals الشخصية والـ Squad بدقة ووضوح.',
      feature2Title: 'التوجيه بمساعدة الـ AI',
      feature2Desc: 'الـ Coach الشخصي بتاعك بالـ AI اللي معاك 24 ساعة عشان يحمسك.',
      feature3Title: 'نظام النقاط ومستويات الـ Rank',
      feature3Desc: 'هات مستويات عالية و XP على طول مع كل إنجاز تخلصه.',
      footer: 'منصة تطوير شخصي احترافية · كل الحقوق محفوظة',
    },
    en: {
      title: 'Productivity & Growth Platform',
      subtitle: 'GROWTH HUB',
      welcome: 'Welcome Back',
      desc: 'Sign in to instantly access your workspace & smart AI coach to achieve your goals.',
      button: 'Sign in with Google',
      signingIn: 'Signing in...',
      tagline: 'Growth Hub - Workspace Productivity & Goal Tracking',
      feature1Title: 'Focus Objectives',
      feature1Desc: 'Map out personal and team goals with sub-task precision.',
      feature2Title: 'AI Personal Coach',
      feature2Desc: 'A hyper-direct AI mentor that challenges you to remain disciplined.',
      feature3Title: 'Interactive Growth Levels',
      feature3Desc: 'Gain XP and level up through interactive growth stages from Recruits to Leaders.',
      footer: 'Professional Growth Platform · All Rights Reserved',
    }
  }

  // Staggered boot-up animation variants
  const leftColumnVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' as const }
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row relative overflow-hidden text-white font-space">
      
      {/* STEP 1: INTERACTIVE MOUSE-TRACKING CYBERPUNK GRID (BACKGROUND) */}
      <div className="fixed inset-0 z-0 bg-black pointer-events-none" />
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-300"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(20, 184, 166, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(20, 184, 166, 0.15) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          WebkitMaskImage: `radial-gradient(350px circle at ${mouse.x}px ${mouse.y}px, black 20%, transparent 100%)`,
          maskImage: `radial-gradient(350px circle at ${mouse.x}px ${mouse.y}px, black 20%, transparent 100%)`
        }}
      />

      {/* Floating Scanlines Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] scanlines z-20" />

      {/* LANGUAGE SELECTOR TOP BAR */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold font-space uppercase"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </div>

      {/* LEFT COLUMN: VISUAL BRANDING PANELS WITH SYSTEM BOOT-UP ANIMATIONS */}
      <motion.div 
        variants={leftColumnVariants}
        initial="hidden"
        animate="visible"
        className="w-full md:w-1/2 flex flex-col justify-between p-8 md:p-20 relative z-10 border-b md:border-b-0 md:border-r border-white/5 bg-black/20 backdrop-blur-sm select-none"
      >
        
        {/* Brand Header */}
        <motion.div variants={childVariants} className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] uppercase tracking-[0.25em] font-black">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            {t[lang].title}
          </div>
          <h1 
            className="text-4xl md:text-6xl font-black font-space tracking-wider uppercase text-white leading-none drop-shadow-[0_0_15px_rgba(20,184,166,0.5)]"
          >
            {t[lang].subtitle}
          </h1>
          <p className="text-sm text-white/50 max-w-sm tracking-wide leading-relaxed">
            {t[lang].tagline}
          </p>
        </motion.div>

        {/* Feature Highlights Grid */}
        <div className="my-12 md:my-0 space-y-8 max-w-md">
          {/* Feature 1 */}
          <motion.div variants={childVariants} className="group hover:bg-white/5 transition-all rounded-xl p-2 -ml-2 flex gap-4 duration-300 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-white/75" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black tracking-wide text-white uppercase">{t[lang].feature1Title}</h4>
              <p className="text-xs text-white/40 leading-relaxed">{t[lang].feature1Desc}</p>
            </div>
          </motion.div>

          {/* Feature 2 */}
          <motion.div variants={childVariants} className="group hover:bg-white/5 transition-all rounded-xl p-2 -ml-2 flex gap-4 duration-300 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white/75" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black tracking-wide text-white uppercase">{t[lang].feature2Title}</h4>
              <p className="text-xs text-white/40 leading-relaxed">{t[lang].feature2Desc}</p>
            </div>
          </motion.div>

          {/* Feature 3 */}
          <motion.div variants={childVariants} className="group hover:bg-white/5 transition-all rounded-xl p-2 -ml-2 flex gap-4 duration-300 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-white/75" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black tracking-wide text-white uppercase">{t[lang].feature3Title}</h4>
              <p className="text-xs text-white/40 leading-relaxed">{t[lang].feature3Desc}</p>
            </div>
          </motion.div>
        </div>

        {/* Brand Footer */}
        <motion.div variants={childVariants} className="text-[10px] tracking-[0.3em] font-monospace text-white/30 uppercase">
          {t[lang].footer}
        </motion.div>
      </motion.div>

      {/* RIGHT COLUMN: LOGIN FORM PANEL WITH GLASSMORPHISM */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-20 relative z-10 bg-black/40">
        
        {/* STEP 3: GLASSMORPHISM LOGIN GATEWAY */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md bg-zinc-950/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl relative overflow-hidden p-8 md:p-12 space-y-8"
        >
          {/* Subtle top border glow */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

          {/* Card Header */}
          <div className="space-y-3 text-center md:text-left">
            <h2 className="text-3xl font-black font-space tracking-tight text-white uppercase">
              {t[lang].welcome}
            </h2>
            <p className="text-xs text-white/40 leading-relaxed max-w-sm">
              {t[lang].desc}
            </p>
          </div>

          {/* Secure Google OAuth Action Area with Upgraded Button */}
          <div className="space-y-4">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="group relative h-13 rounded-2xl w-full flex items-center justify-center gap-4 font-bold tracking-wider transition-all duration-300 bg-white text-black hover:bg-white/95 disabled:opacity-40 shadow-xl overflow-hidden py-3.5 px-6 hover:-translate-y-0.5 active:scale-95 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              {/* Animated Glow Highlight on Hover */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/[0.05] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              
              <svg width="20" height="20" viewBox="0 0 18 18" className="shrink-0">
                <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.9c1.69-1.55 2.69-3.85 2.69-6.58z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.22l-2.9-2.25c-.8.54-1.83.87-3.06.87-2.35 0-4.35-1.59-5.06-3.73H.95v2.3C2.43 15.89 5.47 18 9 18z"/>
                <path fill="#FBBC05" d="M3.94 10.67A5.4 5.4 0 0 1 3.6 9c0-.58.1-1.14.28-1.67V5.03H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.03l2.99-2.36z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2A8.99 8.99 0 0 0 0 9l2.99 2.36C3.7 5.17 5.7 3.58 9 3.58z"/>
              </svg>

              <span className="font-space text-xs font-black tracking-[0.15em] uppercase text-black">
                {loading ? t[lang].signingIn : t[lang].button}
              </span>
            </button>
          </div>

          {/* Secure lock telemetry indicator */}
          <div className="flex items-center justify-center gap-2 text-[9px] font-monospace text-white/30 uppercase tracking-widest pt-4 border-t border-white/5">
            <Shield className="w-3.5 h-3.5 text-emerald-500/60" />
            <span className="animate-pulse">{lang === 'ar' ? 'مكان شغل آمن ومحمي' : 'SECURE & PROTECTED WORKSPACE'}</span>
          </div>

        </motion.div>
      </div>

    </div>
  )
}

/* COMMENTED OUT ORIGINAL RETURN STATEMENT FOR SAFETY AND HISTORICAL REFERENCE:
export function LoginPageBackup() {
  return (
    <div className="min-h-screen bg-[#030303] flex flex-col md:flex-row relative overflow-hidden text-white font-space">
      
      <NeuralMesh overrideColor={staticThemeColor} />

      <div 
        className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none z-0 opacity-15"
        style={{
          background: `radial-gradient(circle, rgba(176, 196, 222, 0.15) 0%, transparent 70%)`,
          filter: 'blur(120px)',
        }}
      />
      ...
    </div>
  )
}
*/
