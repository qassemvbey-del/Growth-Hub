'use client'

import Link from 'next/link'
import Shape from '@/components/m3/Shape'
import Icon from '@/components/m3/Icon'

interface Props {
  lang: 'ar' | 'en'
  isRTL: boolean
  onToggleLang: () => void
}

export default function LandingHeader({ lang, isRTL, onToggleLang }: Props) {
  return (
    <header className="shrink-0 flex items-center justify-between px-4 md:px-16 h-[72px] md:h-[88px] max-w-[1280px] w-full mx-auto">
      <Link href="/" className="flex items-center gap-2 md:gap-2.5 text-md-on no-underline">
        <div className="hidden md:block">
          <Shape type="sunny" size={32} colorToken="md-primary" />
        </div>
        <div className="md:hidden">
          <Shape type="sunny" size={32} colorToken="md-primary" />
        </div>
        <span className="font-readex text-lg md:text-[20px] font-semibold">Growth Hub</span>
      </Link>
      
      <nav className="flex items-center gap-1 md:gap-2">
        <button
          onClick={onToggleLang}
          aria-label="Toggle Language"
          className="md:hidden w-11 h-11 rounded-full flex items-center justify-center text-md-on-sv"
        >
          <Icon name="translate" />
        </button>
        <button
          onClick={onToggleLang}
          className="hidden md:flex h-10 px-4 rounded-full items-center gap-2 text-md-primary text-sm font-semibold transition-colors hover:bg-md-primary/10"
        >
          <Icon name="translate" size={20} />
          {isRTL ? 'English' : 'عربي'}
        </button>

        <Link
          href="/auth/login"
          className="h-10 px-4 md:px-5 rounded-full border border-md-outline flex items-center text-md-on text-sm font-semibold transition-colors hover:bg-md-on-sv/10"
        >
          {isRTL ? 'ادخل' : 'Log in'}
        </Link>
        <Link
          href="/auth/login"
          className="hidden md:flex h-10 px-6 rounded-full bg-md-primary text-md-on-primary items-center text-sm font-semibold transition-colors hover:opacity-90"
        >
          {isRTL ? 'ابدأ ببلاش' : 'Start for free'}
        </Link>
      </nav>
    </header>
  )
}
