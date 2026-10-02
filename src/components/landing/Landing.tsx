'use client'

import { useState, useEffect } from 'react'
import LandingHeader from './LandingHeader'
import LandingHero from './LandingHero'
import LandingGoalTypes from './LandingGoalTypes'
import LandingSteps from './LandingSteps'
import LandingRewards from './LandingRewards'
import LandingCTA from './LandingCTA'
import LandingFooter from './LandingFooter'

export default function Landing() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as 'ar' | 'en'
      if (savedLang === 'ar' || savedLang === 'en') {
        setLang(savedLang)
        document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr'
      } else {
        localStorage.setItem('language', 'ar')
      }
    }
  }, [])

  const toggleLanguage = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar'
    setLang(newLang)
    localStorage.setItem('language', newLang)
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
  }

  const isRTL = lang === 'ar'

  return (
    <div 
      className="bg-md-bg text-md-on font-ibm-arabic min-h-[100dvh] flex flex-col overflow-x-hidden relative"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <LandingHeader lang={lang} onToggleLang={toggleLanguage} isRTL={isRTL} />
      
      <main className="flex-1 flex flex-col w-full max-w-[1280px] mx-auto">
        <LandingHero lang={lang} isRTL={isRTL} />
        <LandingGoalTypes lang={lang} isRTL={isRTL} />
        <LandingSteps lang={lang} isRTL={isRTL} />
        <LandingRewards lang={lang} isRTL={isRTL} />
        <LandingCTA lang={lang} isRTL={isRTL} />
      </main>

      <LandingFooter lang={lang} isRTL={isRTL} onToggleLang={toggleLanguage} />
    </div>
  )
}
