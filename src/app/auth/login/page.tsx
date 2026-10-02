'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getURL } from '@/lib/utils'
import Shape from '@/components/m3/Shape'
import Icon from '@/components/m3/Icon'
import Button from '@/components/m3/Button'

// import ParticleWave from '@/components/ui/ParticleWave'
// import NeuralMesh from '@/components/ui/NeuralMesh'

const GoogleG = () => (
  <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.9c1.69-1.55 2.69-3.85 2.69-6.58z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.22l-2.9-2.25c-.8.54-1.83.87-3.06.87-2.35 0-4.35-1.59-5.06-3.73H.95v2.3C2.43 15.89 5.47 18 9 18z"/>
      <path fill="#FBBC05" d="M3.94 10.67A5.4 5.4 0 0 1 3.6 9c0-.58.1-1.14.28-1.67V5.03H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.03l2.99-2.36z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2A8.99 8.99 0 0 0 0 9l2.99 2.36C3.7 5.17 5.7 3.58 9 3.58z"/>
    </svg>
  </span>
)

const Spinner = () => (
  <svg className="motion-safe:animate-[gh-spin_1s_linear_infinite] w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="40 100" />
  </svg>
)

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as 'ar' | 'en'
      if (savedLang === 'ar' || savedLang === 'en') {
        setLang(savedLang)
        document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr'
      } else {
        localStorage.setItem('language', 'ar')
      }
      const msg = localStorage.getItem('pendingJoinMessage')
      if (msg) setPendingMessage(msg)
    }
  }, [])

  const toggleLanguage = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar'
    setLang(newLang)
    localStorage.setItem('language', newLang)
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const pendingUrl = sessionStorage.getItem('auth_redirect_url')
    if (!pendingUrl) {
      const ref = document.referrer
      if (ref && !ref.includes('/auth/')) {
        sessionStorage.setItem('auth_redirect_url', ref)
      }
    }
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${getURL()}auth/callback` },
    })
    if (authError) {
      console.error(authError.message)
      setError(authError.message)
      setLoading(false)
    }
  }

  const handleGuestMode = () => {
    if (loading) return
    localStorage.setItem('entry_path_selected', 'true')
    router.push('/')
  }

  const t = {
    ar: {
      welcome: 'أهلاً بيك',
      desc: 'ادخل وكمّل من مكان ما وقفت. أهدافك وسلسلتك وكاساتك مستنياك.',
      googleBtn: 'ادخل بحساب جوجل',
      guestBtn: 'جرّب كضيف',
      guestNote: 'الضيف يقدر يعمل لحد 4 أهداف، ومتحفظين على الجهاز ده بس.',
      privacyNote1: 'محدش يشوف أهدافك غير اللي بتشاركهم',
      privacyNote2: 'لما تدخل، إنت موافق على ',
      terms: 'الشروط',
      and: ' و',
      privacy: 'سياسة الخصوصية',
      signingIn: 'بندخّلك…',
      error: 'الدخول ما نجحش. اتأكد من النت وجرّب تاني.',
      retry: 'جرّب تاني',
      featuresTitle: 'أي هدف، خطوات صغيرة.',
      feature1: 'كورسات يوتيوب بتتقسم دروس وبتخلص',
      feature2: 'الـ AI يقسم هدفك، ويشرحلك اللي مش فاهمه',
      feature3: 'اشتغل مع صحابك، وكل واحد ياخد مهامه',
      lang: 'English',
    },
    en: {
      welcome: 'Welcome',
      desc: 'Sign in and pick up where you left off. Your goals, streak and cups are waiting.',
      googleBtn: 'Continue with Google',
      guestBtn: 'Try as a guest',
      guestNote: 'A guest can make up to 4 goals, saved on this device only.',
      privacyNote1: 'Only people you share with can see your goals',
      privacyNote2: 'By signing in, you agree to the ',
      terms: 'Terms',
      and: ' and ',
      privacy: 'Privacy Policy',
      signingIn: 'Signing in...',
      error: 'Sign in failed. Check your connection and try again.',
      retry: 'Try again',
      featuresTitle: 'Any goal, small steps.',
      feature1: 'YouTube courses split into lessons and get done',
      feature2: 'AI breaks down your goal and explains what you miss',
      feature3: 'Work with friends, everyone takes their tasks',
      lang: 'العربية',
    }
  }

  const l = t[lang]
  const isAr = lang === 'ar'

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-md-bg text-md-on overflow-hidden relative">
      <style>{`
        @keyframes gh-spin { to { transform: rotate(360deg); } }
        @keyframes gh-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes gh-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
      
      {/* LEFT SECTION (Web) / MAIN CONTENT (Mobile) */}
      <section className="flex flex-col w-full md:w-[560px] md:shrink-0 px-4 md:py-8 md:px-16 lg:px-20 z-10 h-full relative overflow-y-auto">
        <header className="flex items-center justify-between h-16 shrink-0 pt-2 mb-4 md:mb-auto">
          {/* Mobile Back / Web Brand */}
          <div className="md:hidden">
            <button className="w-12 h-12 rounded-full flex items-center justify-center text-md-on hover:bg-md-on-sv/10 transition-colors">
              <Icon name={isAr ? 'arrow_forward' : 'arrow_back'} />
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2.5 text-md-on">
            <div className="w-8 h-8 relative">
              <Shape type="sunny" size={32} colorToken="md-primary" />
            </div>
            <span className="font-readex text-lg font-semibold">Growth Hub</span>
          </div>

          <button 
            onClick={toggleLanguage}
            className="h-10 px-3 rounded-[20px] flex items-center gap-1.5 text-md-primary text-sm font-semibold hover:bg-md-primary/10 transition-colors"
          >
            <Icon name="translate" size={20} />
            {l.lang}
          </button>
        </header>

        {/* Mobile ONLY: The Shapes Animation Header */}
        <div className="md:hidden relative h-[250px] shrink-0 mx-4" aria-hidden="true">
          <div className="absolute top-[30px] start-[89px]">
            <Shape type="cookie" size={180} colorToken="md-pc" spin>
              <Icon name="flag" size={72} filled className="text-md-on-pc" />
            </Shape>
          </div>

          <div className="absolute top-2 end-2 motion-safe:animate-[gh-float_7s_ease-in-out_infinite]">
            <Shape type="sunny" size={92} colorToken="md-xp-c" spin>
              <Icon name="local_fire_department" size={36} filled className="text-md-xp" />
            </Shape>
          </div>

          <div className="absolute top-6 start-3 motion-safe:animate-[gh-float_7s_ease-in-out_infinite] [animation-delay:-2.3s]">
            <Shape type="clover" size={76} colorToken="md-tc">
              <Icon name="smart_display" size={30} filled className="text-md-on-tc" />
            </Shape>
          </div>

          <div className="absolute bottom-0 start-10 motion-safe:animate-[gh-float_7s_ease-in-out_infinite] [animation-delay:-4.6s]">
            <Shape type="flower" size={72} colorToken="md-xp" spin>
              <Icon name="trophy" size={30} filled className="text-md-on-cup-gold" />
            </Shape>
          </div>

          <div className="absolute bottom-4 end-6 h-9 px-3 rounded-full bg-md-sc-high flex items-center font-readex text-sm font-semibold text-md-xp motion-safe:animate-[gh-float_7s_ease-in-out_infinite] [animation-delay:-2.3s]">
            <span dir="ltr">+20 XP</span>
          </div>
        </div>

        {/* MAIN TEXT */}
        <div className="flex flex-col gap-2 mt-4 md:my-auto md:gap-4">
          <h1 className="m-0 font-readex text-[28px] md:text-[36px] leading-tight font-semibold">
            {l.welcome}
          </h1>
          <p className="m-0 text-base leading-relaxed text-md-on-sv">
            {l.desc}
          </p>

          {pendingMessage && (
            <div role="status" className="mt-2 md:mt-6 p-4 rounded-[20px] bg-md-tc text-md-on-tc flex items-start gap-3">
              <Icon name="group_add" filled className="mt-0.5 shrink-0" />
              <span className="flex-1 text-[15px] leading-snug font-medium">
                {pendingMessage}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-6 md:mt-8">
            <Button height={56} onClick={handleGoogleLogin} disabled={loading} className="w-full text-base" aria-busy={loading}>
              {loading ? <Spinner /> : <GoogleG />}
              {loading ? l.signingIn : l.googleBtn}
            </Button>
            
            <Button variant="outlined" height={56} onClick={handleGuestMode} disabled={loading} className="w-full text-base bg-transparent border-md-outline-v text-md-on">
              <Icon name="person" size={22} />
              {l.guestBtn}
            </Button>
            
            <p className="m-0 text-[13px] leading-snug text-md-on-sv text-center">
              {l.guestNote}
            </p>
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="mt-auto pt-4 md:pt-8 pb-6 flex flex-col gap-3 items-center">
          <span className="flex items-center gap-2 text-[13px] text-md-on-sv">
            <Icon name="lock" size={18} className="text-md-primary shrink-0" />
            {l.privacyNote1}
          </span>
          <span className="text-xs text-md-on-sv text-center leading-relaxed">
            {l.privacyNote2}
            <a href="#" className="text-md-primary no-underline font-medium hover:underline">{l.terms}</a>
            {l.and}
            <a href="#" className="text-md-primary no-underline font-medium hover:underline">{l.privacy}</a>.
          </span>
        </div>
      </section>

      {/* RIGHT SECTION (Web Only) */}
      <section className="hidden md:flex flex-1 my-4 me-4 ms-0 rounded-[28px] bg-md-pc relative overflow-hidden p-12 flex-col justify-end gap-1">
        <div className="absolute -top-[140px] -end-[80px] opacity-15" aria-hidden="true">
          <Shape type="sunny" size={420} colorToken="md-on-pc" spin />
        </div>
        
        {/* Floating Animation Graph Container */}
        <div className="absolute top-0 start-0 w-full h-[470px]" aria-hidden="true">
          <div className="absolute top-[110px] start-[210px]">
             <Shape type="cookie" size={240} colorToken="md-bg" spin>
               <div className="flex flex-col items-center justify-center">
                 <span dir="ltr" className="font-readex text-[56px] leading-[64px] font-semibold text-md-primary">40%</span>
                 <span className="text-[15px] text-md-on-sv">13 من 32 درس</span>
               </div>
             </Shape>
          </div>

          <div className="absolute top-[60px] start-[470px] motion-safe:animate-[gh-float_7s_ease-in-out_infinite]">
            <Shape type="sunny" size={120} colorToken="md-xp-c" spin>
              <div className="flex flex-col items-center justify-center">
                <Icon name="local_fire_department" size={26} filled className="text-md-xp mb-1" />
                <span className="font-readex text-[28px] font-semibold text-md-on-xp-c leading-none">12</span>
              </div>
            </Shape>
          </div>

          <div className="absolute top-[70px] start-[80px] motion-safe:animate-[gh-float_7s_ease-in-out_infinite] [animation-delay:-2.3s]">
            <Shape type="clover" size={104} colorToken="md-tc">
              <Icon name="smart_display" size={40} filled className="text-md-on-tc" />
            </Shape>
          </div>

          <div className="absolute top-[300px] start-[110px] motion-safe:animate-[gh-float_7s_ease-in-out_infinite] [animation-delay:-4.6s]">
            <Shape type="flower" size={108} colorToken="md-xp" spin>
              <Icon name="trophy" size={44} filled className="text-md-on-cup-gold" />
            </Shape>
          </div>

          <div className="absolute top-[380px] start-[290px] py-2.5 px-3.5 rounded-xl bg-md-inverse text-md-on-inverse flex items-center gap-2 text-sm motion-safe:animate-[gh-float_7s_ease-in-out_infinite] [animation-delay:-2.3s]">
            <Icon name="check_circle" filled size={20} className="text-md-inverse-primary" />
            خلّصت الدرس 14
            <span dir="ltr" className="font-readex font-semibold text-md-inverse-primary">+24 XP</span>
          </div>
        </div>

        <h2 className="relative m-0 mb-4 font-readex text-[32px] leading-tight font-semibold text-md-on-pc">
          {l.featuresTitle}
        </h2>
        <ul className="relative m-0 p-0 list-none flex flex-col gap-3 text-md-on-pc text-base">
          <li className="flex items-center gap-3">
            <Icon name="smart_display" filled size={22} className="text-md-on-pc" />
            {l.feature1}
          </li>
          <li className="flex items-center gap-3">
            <Icon name="auto_awesome" filled size={22} className="text-md-on-pc" />
            {l.feature2}
          </li>
          <li className="flex items-center gap-3">
            <Icon name="group" filled size={22} className="text-md-on-pc" />
            {l.feature3}
          </li>
        </ul>
      </section>

      {/* ERROR SNACKBAR */}
      {error && (
        <div role="alert" className="absolute md:fixed bottom-6 start-4 end-4 md:start-auto md:end-6 md:w-[400px] min-h-[56px] p-2 ps-4 rounded-[12px] bg-md-inverse text-md-on-inverse flex items-center gap-3 text-sm z-50">
          <Icon name="error" filled size={20} className="text-md-err-c shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" className="h-10 px-3 rounded-full text-md-inverse-primary font-semibold shrink-0 hover:bg-md-inverse-primary/10 transition-colors" onClick={() => setError(null)}>
            {l.retry}
          </button>
        </div>
      )}
    </div>
  )
}
