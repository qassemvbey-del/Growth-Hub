'use client'

import Shape from '@/components/m3/Shape'
import Icon from '@/components/m3/Icon'

interface Props {
  lang: 'ar' | 'en'
  isRTL: boolean
}

export default function LandingRewards({ lang, isRTL }: Props) {
  return (
    <section className="shrink-0 mx-4 md:mx-16 p-6 md:p-12 rounded-[28px] md:rounded-[40px] bg-md-sc flex flex-col md:flex-row gap-4 md:gap-12 md:items-center">
      
      <div className="flex-1 flex flex-col gap-4">
        <h2 className="m-0 font-readex text-[26px] leading-[34px] md:text-[36px] md:leading-[44px] font-semibold text-md-on">
          {isRTL ? 'بنكافئ، ومابنعاقبش' : 'We reward, we never punish'}
        </h2>
        <p className="m-0 text-[15px] md:text-[18px] leading-6 md:leading-[30px] text-md-on-sv">
          {isRTL
            ? 'لو غبت يوم، معاك يومين حماية بيشتغلوا لوحدهم. ولو السلسلة اتكسرت، خلّص مهمتين في يوم وترجعلك. والمتأخر بياخد XP كامل.'
            : 'If you miss a day, you have 2 auto-protect days. Break a streak? Finish 2 tasks in one day to fix it. Late tasks still give full XP.'}
        </p>

        {/* Desktop List Features (hidden on mobile) */}
        <div className="hidden md:flex flex-col gap-0.5 mt-2">
          <div className="p-[16px_20px] rounded-[20px_20px_4px_4px] bg-md-sc-high flex items-center gap-3">
            <span className="text-md-xp"><Icon name="local_fire_department" filled /></span>
            <span className="flex-1 text-[15px] text-md-on">{isRTL ? 'سلسلة يومية بتوقيت القاهرة' : 'Daily streak (Cairo time)'}</span>
            <span className="text-sm text-md-on-sv">{isRTL ? 'يومين حماية' : '2 days protection'}</span>
          </div>
          <div className="p-[16px_20px] rounded-[4px] bg-md-sc-high flex items-center gap-3">
            <span className="text-md-primary"><Icon name="bolt" filled /></span>
            <span className="flex-1 text-[15px] text-md-on">{isRTL ? 'XP على كل مهمة على قد صعوبتها' : 'XP based on task difficulty'}</span>
            <span className="text-sm text-md-xp font-semibold">{isRTL ? 'من 10 لـ 60' : '10 to 60'}</span>
          </div>
          <div className="p-[16px_20px] rounded-[4px_4px_20px_20px] bg-md-sc-high flex items-center gap-3">
            <span className="text-md-tc"><Icon name="palette" filled /></span>
            <span className="flex-1 text-[15px] text-md-on">{isRTL ? '7 رانكات، كل واحد بيفتحلك لون للتطبيق' : '7 ranks, each unlocking an app color'}</span>
            <span className="text-sm text-md-on-sv">{isRTL ? 'شكلي بس' : 'Cosmetic only'}</span>
          </div>
        </div>
      </div>

      {/* Visuals */}
      <div className="md:w-[440px] flex flex-col gap-2 md:gap-6 items-center shrink-0" aria-hidden="true">
        
        {/* Trophies */}
        <div className="flex gap-3 md:gap-4 items-end justify-center py-2 md:py-0">
          <span className="w-16 h-16 md:w-[96px] md:h-[96px] relative">
            <Shape type="flower" colorToken="md-cup-bronze" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="text-md-on-cup-bronze"><Icon name="trophy" filled className="text-[28px] md:text-[40px]" /></span>
            </span>
          </span>
          <span className="w-[80px] h-[80px] md:w-[120px] md:h-[120px] relative">
            <Shape type="flower" colorToken="md-cup-silver" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="text-md-on-cup-silver"><Icon name="trophy" filled className="text-[34px] md:text-[48px]" /></span>
            </span>
          </span>
          <span className="w-24 h-24 md:w-[144px] md:h-[144px] relative">
            <Shape type="flower" colorToken="md-cup-gold" spin />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="text-md-on-cup-gold"><Icon name="trophy" filled className="text-[40px] md:text-[60px]" /></span>
            </span>
          </span>
        </div>

        {/* Color Palette */}
        <div className="flex gap-2 md:gap-2.5 justify-center">
          <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-md-primary"></span>
          <span className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-md-tc"></span>
          <span className="w-7 h-7 md:w-8 md:h-8 rounded-[9px] md:rounded-[10px] bg-md-sec-c"></span>
          <span className="w-7 h-7 md:w-8 md:h-8 rounded-[9px] md:rounded-[10px] bg-md-error"></span>
          <span className="w-7 h-7 md:w-8 md:h-8 rounded-[9px] md:rounded-[10px] bg-md-xp-c"></span>
          <span className="w-7 h-7 md:w-8 md:h-8 rounded-[9px] md:rounded-[10px] bg-md-pc"></span>
          <span className="w-7 h-7 md:w-8 md:h-8 rounded-[9px] md:rounded-[10px] bg-md-outline-v"></span>
          <span className="w-7 h-7 md:w-8 md:h-8 rounded-[9px] md:rounded-[10px] bg-md-xp"></span>
        </div>
        
        <span className="md:hidden text-[13px] text-md-on-sv text-center mt-2">
          {isRTL ? '7 رانكات، كل واحد بيفتحلك لون للتطبيق' : '7 ranks, each unlocking an app color'}
        </span>
      </div>

    </section>
  )
}
