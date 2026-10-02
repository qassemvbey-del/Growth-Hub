'use client'

import Link from 'next/link'
import Shape from '@/components/m3/Shape'

interface Props {
  lang: 'ar' | 'en'
  isRTL: boolean
  onToggleLang: () => void
}

export default function LandingFooter({ lang, isRTL, onToggleLang }: Props) {
  return (
    <footer className="shrink-0 mt-auto px-4 py-6 pb-8 md:px-16 md:py-8 flex flex-col md:flex-row md:items-center justify-between gap-4 text-md-on-sv text-sm max-w-[1280px] w-full mx-auto">
      
      <div className="flex items-center justify-center md:justify-start gap-2 order-2 md:order-1">
        <Shape type="sunny" size={20} colorToken="md-primary" />
        <span className="font-readex font-semibold">Growth Hub</span>
      </div>

      <nav className="flex justify-center gap-5 md:gap-6 order-1 md:order-2">
        <Link href="/" className="text-md-on-sv hover:text-md-on transition-colors">
          {isRTL ? 'الخصوصية' : 'Privacy'}
        </Link>
        <Link href="/" className="text-md-on-sv hover:text-md-on transition-colors">
          {isRTL ? 'الشروط' : 'Terms'}
        </Link>
        <Link href="/" className="text-md-on-sv hover:text-md-on transition-colors">
          {isRTL ? 'كلّمنا' : 'Contact'}
        </Link>
        <button 
          onClick={onToggleLang} 
          className="text-md-primary font-semibold bg-transparent border-none p-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {isRTL ? 'English' : 'عربي'}
        </button>
      </nav>

    </footer>
  )
}
