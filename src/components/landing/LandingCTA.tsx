'use client'

import Link from 'next/link'
import Shape from '@/components/m3/Shape'
import Icon from '@/components/m3/Icon'

interface Props {
  lang: 'ar' | 'en'
  isRTL: boolean
}

export default function LandingCTA({ lang, isRTL }: Props) {
  return (
    <section className="shrink-0 mx-4 md:mx-16 mt-8 md:mt-20 p-8 md:p-0 md:h-[320px] rounded-[40px] md:rounded-[44px] bg-md-pc relative overflow-hidden flex flex-col items-center justify-center gap-5 md:gap-6">
      
      <div className="absolute start-[-80px] top-[-90px] md:start-[-90px] md:top-[-120px] w-[220px] h-[220px] md:w-[360px] md:h-[360px]">
        <Shape type="sunny" colorToken="md-chip-line-on-pc" spin />
      </div>
      <div className="hidden md:block absolute end-[-60px] bottom-[-110px] w-[260px] h-[260px]">
        <Shape type="cookie" colorToken="md-chip-line-on-pc" spin />
      </div>

      <h2 className="relative z-10 m-0 font-readex text-[28px] leading-[36px] md:text-[44px] md:leading-[52px] font-semibold text-md-on-pc text-center">
        {isRTL ? (
          <>أول كورس<br className="md:hidden" /> هيخلص المرة دي.</>
        ) : (
          <>The first course<br className="md:hidden" /> you'll actually finish.</>
        )}
      </h2>
      
      <Link 
        href="/auth/login"
        className="relative z-10 self-stretch md:self-auto h-14 md:px-8 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center gap-2 no-underline font-semibold text-base transition-transform hover:scale-105 active:scale-95"
      >
        {isRTL ? 'ابدأ ببلاش' : 'Start for free'}
        <Icon name={isRTL ? 'arrow_back' : 'arrow_forward'} />
      </Link>
    </section>
  )
}
