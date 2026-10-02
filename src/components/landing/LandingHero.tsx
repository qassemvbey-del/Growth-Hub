'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Shape from '@/components/m3/Shape'
import Icon from '@/components/m3/Icon'

interface Props {
  lang: 'ar' | 'en'
  isRTL: boolean
}

export default function LandingHero({ lang, isRTL }: Props) {
  const router = useRouter()

  const handleGuestMode = (e: React.MouseEvent) => {
    e.preventDefault()
    localStorage.setItem('entry_path_selected', 'true')
    window.location.reload()
  }

  return (
    <section className="shrink-0 flex flex-col md:flex-row md:items-center gap-4 md:gap-12 px-4 md:px-16 pt-2 md:pt-10 pb-6 md:pb-16 min-h-auto md:h-[640px]">
      
      {/* Text & CTA block */}
      <div className="flex-1 flex flex-col gap-4 md:gap-6 pt-2 md:pt-0">
        <span className="self-start h-8 px-3 rounded-lg border border-md-outline-v flex items-center gap-2 text-[13px] md:text-sm text-md-on-sv">
          <span className="text-md-xp"><Icon name="featured_seasonal_and_gifts" size={18} filled /></span>
          {isRTL ? 'مجاني بالكامل السنة دي' : 'Completely free this year'}
        </span>
        
        <h1 className="m-0 font-readex text-[36px] leading-[46px] md:text-[60px] md:leading-[72px] font-semibold text-md-on">
          {isRTL ? (
            <>حط لينك الكورس،<br className="hidden md:block"/> واحنا نخليك تخلّصه.</>
          ) : (
            <>Paste the course link,<br className="hidden md:block"/> and we'll help you finish it.</>
          )}
        </h1>
        
        <p className="m-0 md:max-w-[520px] text-base md:text-lg leading-[26px] md:leading-[30px] text-md-on-sv">
          {isRTL
            ? 'Growth Hub بيقسم أي هدف لخطوات صغيرة، ويديك XP وسلسلة أيام وكاس على كل حاجة بتخلّصها. للكورسات، والمذاكرة، ومشروع شغلك، والشغل مع صحابك.'
            : 'Growth Hub breaks any goal into small steps, rewarding you with XP, streaks, and a cup for everything you finish. For courses, studying, work projects, and teamwork.'}
        </p>

        {/* Desktop CTA (hidden on mobile) */}
        <Link 
          href="/auth/login"
          className="hidden md:flex w-[560px] h-16 rounded-[32px] bg-md-sc-high items-center justify-between ps-6 pe-2 text-none hover:opacity-90 transition-opacity no-underline"
        >
          <span className="flex items-center gap-3 text-md-outline text-base">
            <span className="text-md-on-sv"><Icon name="link" /></span>
            {isRTL ? 'الصق لينك بلاي ليست يوتيوب، أو اكتب هدفك' : 'Paste YouTube playlist link, or type your goal'}
          </span>
          <span className="w-12 h-12 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center">
            <Icon name={isRTL ? 'arrow_back' : 'arrow_forward'} />
          </span>
        </Link>
        <p className="hidden md:block m-0 text-sm text-md-on-sv">
          {isRTL ? 'مش لازم حساب علشان تجرّب. ' : 'No account needed to try. '}
          <button onClick={handleGuestMode} className="text-md-primary font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">
            {isRTL ? 'جرّب كضيف' : 'Try as a guest'}
          </button>
        </p>
      </div>

      {/* Decorative Shapes Group */}
      <div className="w-[190px] h-[240px] md:w-[560px] md:h-[520px] relative shrink-0 mx-auto md:mx-0 mt-2 md:mt-0 select-none pointer-events-none">
        
        {/* Main cookie */}
        <div className="absolute start-[84px] top-[26px] md:start-[120px] md:top-[100px] w-[190px] h-[190px] md:w-[320px] md:h-[320px] flex flex-col items-center justify-center">
          <Shape type="cookie" colorToken="md-pc" spin />
          <span dir="ltr" className="font-readex text-[52px] leading-[60px] md:text-[72px] md:leading-[80px] font-semibold text-md-on-pc z-10">40%</span>
          <span className="text-sm md:text-base text-md-on-pc z-10">{isRTL ? '13 من 32 درس' : '13 of 32 lessons'}</span>
        </div>

        {/* Sunny */}
        <div className="absolute end-0 top-0 md:top-[12px] w-[104px] h-[104px] md:w-[150px] md:h-[150px] animate-[gh-float_7s_ease-in-out_infinite]">
          <Shape type="sunny" colorToken="md-xp-c" spin />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-md-xp"><Icon name="local_fire_department" filled className="text-[22px] md:text-[28px]" /></span>
            <span className="font-readex text-[24px] md:text-[32px] font-semibold text-md-on-xp-c">12</span>
            <span className="hidden md:block text-xs text-md-on-xp-c">{isRTL ? 'يوم ورا يوم' : 'day streak'}</span>
          </div>
        </div>

        {/* Clover */}
        <div className="absolute start-0 top-[16px] md:start-[8px] md:top-[40px] w-[84px] h-[84px] md:w-[120px] md:h-[120px] animate-[gh-float_7s_ease-in-out_infinite_-2.3s]">
          <Shape type="clover" colorToken="md-tc" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-md-on-tc"><Icon name="smart_display" filled className="text-[34px] md:text-[44px]" /></span>
          </div>
        </div>

        {/* Flower */}
        <div className="absolute start-[8px] bottom-[16px] md:start-[24px] md:bottom-[24px] w-[92px] h-[92px] md:w-[128px] md:h-[128px] animate-[gh-float_7s_ease-in-out_infinite_-4.6s]">
          <Shape type="flower" colorToken="md-xp" spin />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-md-on-cup-gold"><Icon name="trophy" filled className="text-[38px] md:text-[52px]" /></span>
          </div>
        </div>

        {/* Burst (Desktop only) */}
        <div className="hidden md:block absolute end-[64px] bottom-[112px] w-[72px] h-[72px]">
          <Shape type="burst" colorToken="md-primary" spin />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-md-on-primary"><Icon name="check" className="text-[32px]" /></span>
          </div>
        </div>

        {/* Task Box (Desktop only) */}
        <div className="hidden md:flex absolute end-[120px] bottom-[8px] w-[280px] p-[14px_16px] rounded-[20px] bg-md-sc border border-md-outline-v items-center gap-3 animate-[gh-float_7s_ease-in-out_infinite_-2.3s]">
          <span className="w-6 h-6 rounded-full border-2 border-md-outline shrink-0"></span>
          <span className="flex-1 flex flex-col">
            <span className="text-[15px] font-medium text-md-on">{isRTL ? 'الدرس 15: useEffect' : 'Lesson 15: useEffect'}</span>
            <span className="text-[13px] text-md-on-sv">{isRTL ? '22 دقيقة' : '22 min'}</span>
          </span>
          <span dir="ltr" className="font-readex text-sm font-semibold text-md-xp">+20 XP</span>
        </div>

        {/* Toast Toast (Both) */}
        <div className="absolute end-0 bottom-0 md:start-[150px] md:end-auto md:top-0 p-[10px_12px] md:p-[10px_14px] rounded-xl bg-md-inverse text-md-on-inverse flex items-center gap-1.5 md:gap-2 text-[13px] md:text-sm animate-[gh-float_7s_ease-in-out_infinite_-4.6s]">
          <span className="text-md-inverse-primary"><Icon name="check_circle" filled className="text-[18px] md:text-[20px]" /></span>
          {isRTL ? 'خلّصت الدرس 14' : 'Finished lesson 14'}
          <span dir="ltr" className="font-readex font-semibold text-md-xp-c">+24 XP</span>
        </div>

        {/* Squad Box (Desktop only) */}
        <div className="hidden md:flex absolute end-[8px] top-[230px] h-10 pe-3 ps-1.5 rounded-full bg-md-sc-high items-center gap-2 text-[13px] text-md-on-sv animate-[gh-float_7s_ease-in-out_infinite]">
          <span className="flex">
            <span className="w-7 h-7 rounded-full bg-md-tc text-md-on-tc flex items-center justify-center text-xs border-2 border-md-sc-high z-30">A</span>
            <span className="w-7 h-7 rounded-full bg-md-sec-c text-md-on-sec-c flex items-center justify-center text-xs border-2 border-md-sc-high -ms-2 z-20">M</span>
            <span className="w-7 h-7 rounded-full bg-md-xp-c text-md-on-xp-c flex items-center justify-center text-xs border-2 border-md-sc-high -ms-2 z-10">O</span>
          </span>
          {isRTL ? 'مع 3' : 'with 3'}
        </div>
      </div>

      {/* Mobile CTA (hidden on desktop) */}
      <div className="md:hidden flex flex-col gap-3 pt-4 w-full">
        <Link 
          href="/auth/login"
          className="h-14 rounded-full bg-md-sc-high flex items-center justify-between pe-2 ps-5 text-none hover:opacity-90 transition-opacity no-underline"
        >
          <span className="flex items-center gap-2.5 text-md-outline text-[15px]">
            <span className="text-md-on-sv"><Icon name="link" /></span>
            {isRTL ? 'الصق لينك يوتيوب أو اكتب هدفك' : 'Paste YouTube link or type goal'}
          </span>
          <span className="w-11 h-11 rounded-full bg-md-primary text-md-on-primary flex items-center justify-center">
            <Icon name={isRTL ? 'arrow_back' : 'arrow_forward'} />
          </span>
        </Link>
        <p className="m-0 text-sm text-md-on-sv text-center">
          {isRTL ? 'مش لازم حساب علشان تجرّب. ' : 'No account needed to try. '}
          <button onClick={handleGuestMode} className="text-md-primary font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">
            {isRTL ? 'جرّب كضيف' : 'Try as a guest'}
          </button>
        </p>
      </div>

    </section>
  )
}
