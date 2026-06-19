'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ParticleWave from '@/components/ui/ParticleWave'
// import { useMousePosition } from '@/hooks/useMousePosition'
// import NeuralMesh from '@/components/ui/NeuralMesh'
import { Target, Shield, Trophy, Globe, Zap } from 'lucide-react'

interface TypewriterTextProps {
  text: string
  className?: string
}

// Staggered boot-up typewriter effect
function TypewriterText({ text, className = '' }: TypewriterTextProps) {
  const characters = Array.from(text)
  
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.03 },
    },
  }

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 15,
        stiffness: 250,
      },
    },
    hidden: {
      opacity: 0,
      y: 5,
      transition: {
        type: 'spring' as const,
        damping: 15,
        stiffness: 250,
      },
    },
  }

  return (
    <motion.span
      style={{ display: 'inline-block' }}
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {characters.map((char, index) => (
        <motion.span
          key={index}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
          variants={child}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  )
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState<'ar' | 'en'>('ar') // Default to Arabic to match system focus
  const supabase = createClient()
  const router = useRouter()
  
  // Commented out per rule "Never delete code, only comment it out":
  // const mouse = useMousePosition()

  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as 'ar' | 'en'
      if (savedLang === 'ar' || savedLang === 'en') {
        setLang(savedLang)
      } else {
        localStorage.setItem('language', 'ar')
      }
      
      const msg = localStorage.getItem('pendingJoinMessage')
      if (msg) {
        setPendingMessage(msg)
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

  const handleGuestMode = () => {
    localStorage.setItem('entry_path_selected', 'true')
    router.push('/')
  }

  // Simplified Translation Dictionaries with Gamified Gaming wording
  const t = {
    ar: {
      title: 'مساحتك للتطور',
      subtitle: 'GROWTH HUB',
      welcome: 'أهلاً بك من جديد',
      desc: 'سجّل دخولك للوصول للوحة التحكم والتحدث مع مساعدك الذكي لتحقيق أهدافك',
      button: 'الدخول بـ Google',
      guestButton: 'المتابعة كزائر',
      signingIn: 'بندخلك دلوقتي...',
      tagline: 'مكان متكامل لإدارة أهدافك ومهامك بإنتاجية عالية.',
      feature1Title: 'Focus Goals',
      feature1Desc: 'تابع أهدافك اليومية بسهولة',
      feature2Title: 'Smart AI Coach',
      feature2Desc: 'احصل على توجيه ذكي يساعدك تفضل مركّز',
      feature3Title: 'Level Up',
      feature3Desc: 'ارفع رتبتك، أنجز مهامك، واكسب XP',
      footer: 'منصة تطوير شخصي احترافية · كل الحقوق محفوظة',
    },
    en: {
      title: 'Your Gamified Productivity Workspace',
      subtitle: 'GROWTH HUB',
      welcome: 'Welcome Back',
      desc: 'Sign in to instantly access your workspace & smart AI coach to achieve your goals.',
      button: 'Sign in with Google',
      guestButton: 'Continue as Guest',
      signingIn: 'Signing in...',
      tagline: 'Growth Hub - Workspace Productivity & Goal Tracking',
      feature1Title: 'Focus Goals',
      feature1Desc: 'Track your daily targets effortlessly.',
      feature2Title: 'Smart AI Coach',
      feature2Desc: 'Get instant insights to stay disciplined.',
      feature3Title: 'Level Up',
      feature3Desc: 'Earn XP, rank up, and crush your tasks.',
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

  // STEP 2: UNIVERSAL PREMIUM TEXT HOVER EFFECTS
  const hoverTextClass = "cursor-default transition-all duration-300 hover:text-teal-400 hover:scale-[1.02] hover:drop-shadow-[0_0_12px_rgba(20,184,166,0.9)]"

  return (
    <div className="min-h-screen bg-[#0D0D0D] md:bg-transparent flex flex-col md:flex-row relative overflow-hidden font-space">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
      `}} />
      
      {/* PROCEDURAL 3D PARTICLE WAVE CANVAS BACKGROUND (Sits beautifully at z-0) */}
      <ParticleWave />

      {/* Floating Scanlines Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] scanlines z-20" />

      {/* MOBILE LAYOUT (md and below) */}
      <div 
        className="flex md:hidden flex-col h-[100dvh] w-full justify-between relative z-10 px-6 overflow-hidden select-none bg-[#0D0D0D]"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
          fontFamily: lang === 'ar' ? "'Tajawal', sans-serif" : "'Inter', sans-serif"
        }}
      >
        {/* Aurora Glow Effects on Mobile */}
        <div className="absolute top-0 left-0 w-[300px] h-[300px] rounded-full bg-[#f97316] opacity-[0.08] blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#14b8a6] opacity-[0.06] blur-[100px] pointer-events-none" />

        {/* Mobile Language Selector */}
        <div className="absolute top-4 end-4 z-50">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs text-white/80 font-medium"
            style={{ fontFamily: lang === 'ar' ? "'Tajawal', sans-serif" : "'Inter', sans-serif" }}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>

        {/* UPPER SECTION (60%) */}
        <div className="h-[60%] flex flex-col items-center justify-center text-center space-y-4 pt-8">
          <h1 
            className="text-[2.5rem] font-black tracking-widest text-white leading-none"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            GROWTH<span className="text-[#f97316]">HUB</span>
          </h1>
          
          <p 
            className="text-[0.875rem] text-white/60 font-normal animate-pulse"
            style={{ fontFamily: lang === 'ar' ? "'Tajawal', sans-serif" : "'Inter', sans-serif" }}
          >
            {lang === 'ar' ? 'ارتقِ بمستوى حياتك.' : 'Level up your life.'}
          </p>

          <div className="flex flex-row items-center gap-2 max-w-full overflow-x-auto py-1 px-1 no-scrollbar justify-center">
            <span 
              className="shrink-0 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[0.75rem] font-medium text-white/70 flex items-center gap-1.5"
              style={{ fontFamily: lang === 'ar' ? "'Tajawal', sans-serif" : "'Inter', sans-serif" }}
            >
              <span>⚡</span> {lang === 'ar' ? 'XP System' : 'XP System'}
            </span>
            <span 
              className="shrink-0 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[0.75rem] font-medium text-white/70 flex items-center gap-1.5"
              style={{ fontFamily: lang === 'ar' ? "'Tajawal', sans-serif" : "'Inter', sans-serif" }}
            >
              <span>🎯</span> {lang === 'ar' ? 'Goal Tracking' : 'Goal Tracking'}
            </span>
            <span 
              className="shrink-0 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[0.75rem] font-medium text-white/70 flex items-center gap-1.5"
              style={{ fontFamily: lang === 'ar' ? "'Tajawal', sans-serif" : "'Inter', sans-serif" }}
            >
              <span>🤖</span> {lang === 'ar' ? 'AI Coach' : 'AI Coach'}
            </span>
          </div>
        </div>

        {/* LOWER SECTION (40%) */}
        <div className="h-[40%] flex flex-col justify-end w-full pb-2 space-y-4">
          {pendingMessage && (
            <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs text-center font-medium">
              {pendingMessage}
            </div>
          )}

          <div className="space-y-3 w-full">
            {/* Google Sign In */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 w-full h-[52px] rounded-[14px] bg-white text-black font-medium hover:bg-zinc-100 transition-all active:scale-95 text-sm"
              style={{ fontFamily: lang === 'ar' ? "'Tajawal', sans-serif" : "'Inter', sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
                <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.9c1.69-1.55 2.69-3.85 2.69-6.58z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.22l-2.9-2.25c-.8.54-1.83.87-3.06.87-2.35 0-4.35-1.59-5.06-3.73H.95v2.3C2.43 15.89 5.47 18 9 18z"/>
                <path fill="#FBBC05" d="M3.94 10.67A5.4 5.4 0 0 1 3.6 9c0-.58.1-1.14.28-1.67V5.03H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.03l2.99-2.36z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2A8.99 8.99 0 0 0 0 9l2.99 2.36C3.7 5.17 5.7 3.58 9 3.58z"/>
              </svg>
              <span>{loading ? t[lang].signingIn : (lang === 'ar' ? 'الدخول بواسطة Google' : 'Sign in with Google')}</span>
            </button>

            {/* Continue as Guest */}
            <button
              type="button"
              onClick={handleGuestMode}
              className="flex items-center justify-center w-full h-[52px] rounded-[14px] bg-transparent text-white/60 font-normal border border-white/15 hover:bg-white/5 active:scale-95 transition-all text-xs"
              style={{ fontFamily: lang === 'ar' ? "'Tajawal', sans-serif" : "'Inter', sans-serif" }}
            >
              <span>{lang === 'ar' ? 'المتابعة كزائر' : 'Continue as Guest'}</span>
            </button>
          </div>

          {/* Secure & Protected telemetry indicator */}
          <div 
            className="flex items-center justify-center gap-1.5 pt-2 text-[0.7rem] text-white/30"
            style={{ fontFamily: lang === 'ar' ? "'Tajawal', sans-serif" : "'Inter', sans-serif" }}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-500/40" />
            <span>{lang === 'ar' ? 'آمن ومحمي' : 'Secure & Protected'}</span>
          </div>
        </div>

      </div>

      {/* DESKTOP LAYOUT (md and above) */}
      <div className="hidden md:grid relative z-10 w-full min-h-screen grid-cols-2 items-center bg-transparent">
        
        {/* LEFT COLUMN: PURELY INVISIBLE LAYOUT SKELETON (No borders or backgrounds) */}
        <motion.div 
          variants={leftColumnVariants}
          initial="hidden"
          animate="visible"
          className="w-full flex flex-col justify-between p-8 md:p-20 relative bg-transparent select-none min-h-[70vh] md:min-h-[80vh]"
        >
          
          {/* Brand Header */}
          <motion.div variants={childVariants} className="space-y-4">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-200/20 dark:bg-white/5 border border-zinc-300/30 dark:border-white/10 text-[9px] uppercase tracking-[0.25em] font-black text-zinc-800 dark:text-zinc-300 ${hoverTextClass}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              {t[lang].title}
            </div>
            <h1 
              className={`text-4xl md:text-6xl font-black font-space tracking-wider uppercase text-zinc-900 dark:text-white leading-none drop-shadow-[0_0_15px_rgba(20,184,166,0.5)] ${hoverTextClass}`}
            >
              <TypewriterText key={lang} text={t[lang].subtitle} />
            </h1>
            <p className={`text-sm text-zinc-600 dark:text-white/50 max-w-sm tracking-wide leading-relaxed ${hoverTextClass}`}>
              {t[lang].tagline}
            </p>
          </motion.div>

          {/* Feature Highlights Grid */}
          <div className="my-12 md:my-0 space-y-8 max-w-md flex flex-col gap-6">
            {/* Feature 1 */}
            <motion.div variants={childVariants} className="group hover:bg-zinc-200/10 dark:hover:bg-white/5 transition-all rounded-xl p-2 -ms-2 flex gap-4 duration-300 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-zinc-200/20 dark:bg-white/5 border border-zinc-300/30 dark:border-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-white/75">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className={`text-sm font-black tracking-wide text-zinc-900 dark:text-white uppercase ${hoverTextClass}`}>
                  <TypewriterText key={`f1-${lang}`} text={t[lang].feature1Title} />
                </h4>
                <p className={`text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed ${hoverTextClass}`}>{t[lang].feature1Desc}</p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={childVariants} className="group hover:bg-zinc-200/10 dark:hover:bg-white/5 transition-all rounded-xl p-2 -ms-2 flex gap-4 duration-300 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-zinc-200/20 dark:bg-white/5 border border-zinc-300/30 dark:border-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-white/75">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className={`text-sm font-black tracking-wide text-zinc-900 dark:text-white uppercase ${hoverTextClass}`}>
                  <TypewriterText key={`f2-${lang}`} text={t[lang].feature2Title} />
                </h4>
                <p className={`text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed ${hoverTextClass}`}>{t[lang].feature2Desc}</p>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={childVariants} className="group hover:bg-zinc-200/10 dark:hover:bg-white/5 transition-all rounded-xl p-2 -ms-2 flex gap-4 duration-300 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-zinc-200/20 dark:bg-white/5 border border-zinc-300/30 dark:border-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-white/75">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className={`text-sm font-black tracking-wide text-zinc-900 dark:text-white uppercase ${hoverTextClass}`}>
                  <TypewriterText key={`f3-${lang}`} text={t[lang].feature3Title} />
                </h4>
                <p className={`text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed ${hoverTextClass}`}>{t[lang].feature3Desc}</p>
              </div>
            </motion.div>
          </div>

          {/* Brand Footer */}
          <motion.div variants={childVariants} className={`text-[10px] tracking-[0.3em] font-monospace text-zinc-400/50 dark:text-white/30 uppercase ${hoverTextClass}`}>
            {t[lang].footer}
          </motion.div>
        </motion.div>

        {/* RIGHT COLUMN: PURELY INVISIBLE LAYOUT SKELETON (No solid backgrounds or splits) */}
        <div className="w-full flex items-center justify-center p-8 md:p-20 relative bg-transparent">
          
          {/* GLASSMORPHISM LOGIN GATEWAY */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' as const }}
            className="w-full max-w-md bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl relative overflow-hidden p-8 md:p-12 space-y-8"
          >
            {/* Subtle top border glow */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

            {pendingMessage && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm text-center font-medium">
                {pendingMessage}
              </div>
            )}

            {/* Card Header */}
            <div className="space-y-3 text-center md:text-left">
              <h2 className={`text-3xl font-black font-space tracking-tight text-zinc-900 dark:text-white uppercase ${hoverTextClass}`}>
                {t[lang].welcome}
              </h2>
              <p className={`text-xs text-zinc-600 dark:text-white/40 leading-relaxed max-w-sm ${hoverTextClass}`}>
                {t[lang].desc}
              </p>
            </div>

            {/* Secure Google OAuth Action Area with Premium Dark Google Button & Secondary Guest Button */}
            <div className="space-y-4">
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-3 w-full py-3.5 bg-zinc-900 text-white font-bold rounded-lg border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 transition-all duration-300 group"
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 18 18" 
                  className="shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                >
                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.9c1.69-1.55 2.69-3.85 2.69-6.58z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.22l-2.9-2.25c-.8.54-1.83.87-3.06.87-2.35 0-4.35-1.59-5.06-3.73H.95v2.3C2.43 15.89 5.47 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.94 10.67A5.4 5.4 0 0 1 3.6 9c0-.58.1-1.14.28-1.67V5.03H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.03l2.99-2.36z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2A8.99 8.99 0 0 0 0 9l2.99 2.36C3.7 5.17 5.7 3.58 9 3.58z"/>
                </svg>

                {/* Restored Google Button Text (Guaranteed visible with explicit text-white) */}
                <span className="font-space text-xs font-black tracking-[0.15em] uppercase text-white">
                  {loading ? t[lang].signingIn : t[lang].button}
                </span>
              </button>

              {/* Continue as Guest Button */}
              <button
                type="button"
                onClick={handleGuestMode}
                className="flex items-center justify-center w-full py-3.5 bg-transparent text-zinc-400 font-bold rounded-lg border border-zinc-800 hover:text-white hover:border-zinc-500 hover:bg-zinc-900 active:scale-95 transition-all duration-300 font-space text-xs tracking-[0.15em] uppercase"
              >
                <span>{t[lang].guestButton}</span>
              </button>
            </div>

            {/* Secure lock telemetry indicator */}
            <div className="flex items-center justify-center gap-2 text-[9px] font-monospace text-zinc-500 dark:text-white/30 uppercase tracking-widest pt-4 border-t border-zinc-200/50 dark:border-white/5">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500/60" />
              <span className={`animate-pulse ${hoverTextClass}`}>{lang === 'ar' ? 'بيئة آمنة ومحمية' : 'SECURE & PROTECTED WORKSPACE'}</span>
            </div>

          </motion.div>
        </div>
      </div>

    </div>
  )
}

/* COMMENTED OUT ORIGINAL CODE FOR HISTORICAL REFERENCE:
export function LoginPageBackup() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row relative overflow-hidden font-space">
      <ParticleWave />
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] scanlines z-20" />
      ...
    </div>
  )
}
*/
