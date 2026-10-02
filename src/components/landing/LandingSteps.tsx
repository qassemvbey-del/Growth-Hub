'use client'

import Shape from '@/components/m3/Shape'

interface Props {
  lang: 'ar' | 'en'
  isRTL: boolean
}

export default function LandingSteps({ lang, isRTL }: Props) {
  return (
    <section className="shrink-0 py-8 px-4 md:py-20 md:px-16 flex flex-col gap-5 md:gap-10">
      <h2 className="m-0 font-readex text-[26px] leading-[34px] md:text-[36px] md:leading-[44px] font-semibold">
        {isRTL ? 'من اللينك للكاس في 3 خطوات' : 'From link to cup in 3 steps'}
      </h2>
      
      <ol className="m-0 p-0 list-none flex flex-col md:flex-row gap-5 md:gap-6">
        
        {/* Step 1 */}
        <li className="flex md:flex-1 md:flex-col gap-4 md:gap-4 items-start">
          <span className="w-14 h-14 md:w-[88px] md:h-[88px] relative shrink-0">
            <Shape type="cookie" colorToken="md-sec-c" />
            <span className="absolute inset-0 flex items-center justify-center font-readex text-[22px] md:text-[32px] font-semibold text-md-on-sec-c">1</span>
          </span>
          <span className="flex flex-col gap-1 md:gap-4">
            <span className="font-readex text-lg md:text-[22px] font-semibold text-md-on">
              {isRTL ? 'الصق لينك، أو اكتب هدفك' : 'Paste link, or type goal'}
            </span>
            <span className="text-[15px] md:text-base leading-6 md:leading-[26px] text-md-on-sv">
              {isRTL
                ? 'البلاي ليست بتبقى كورس، وأي هدف تكتبه الـ AI يقسمه لخطوات.'
                : 'Playlists become courses, and any written goal is broken down by AI.'}
            </span>
          </span>
        </li>

        {/* Step 2 */}
        <li className="flex md:flex-1 md:flex-col gap-4 md:gap-4 items-start">
          <span className="w-14 h-14 md:w-[88px] md:h-[88px] relative shrink-0">
            <Shape type="clover" colorToken="md-tc" />
            <span className="absolute inset-0 flex items-center justify-center font-readex text-[22px] md:text-[32px] font-semibold text-md-on-tc">2</span>
          </span>
          <span className="flex flex-col gap-1 md:gap-4">
            <span className="font-readex text-lg md:text-[22px] font-semibold text-md-on">
              {isRTL ? 'خلّص خطوة خطوة' : 'Finish step by step'}
            </span>
            <span className="text-[15px] md:text-base leading-6 md:leading-[26px] text-md-on-sv">
              {isRTL
                ? 'كل مهمة بتديك XP على قد صعوبتها، و20% زيادة لو في ميعادها.'
                : 'Each task gives you XP based on its difficulty, plus 20% if done on time.'}
            </span>
          </span>
        </li>

        {/* Step 3 */}
        <li className="flex md:flex-1 md:flex-col gap-4 md:gap-4 items-start">
          <span className="w-14 h-14 md:w-[88px] md:h-[88px] relative shrink-0">
            <Shape type="flower" colorToken="md-xp" />
            <span className="absolute inset-0 flex items-center justify-center font-readex text-[22px] md:text-[32px] font-semibold text-md-on-cup-gold">3</span>
          </span>
          <span className="flex flex-col gap-1 md:gap-4">
            <span className="font-readex text-lg md:text-[22px] font-semibold text-md-on">
              {isRTL ? 'خد الكاس' : 'Get the cup'}
            </span>
            <span className="text-[15px] md:text-base leading-6 md:leading-[26px] text-md-on-sv">
              {isRTL
                ? 'كل هدف بتخلّصه بيبقى كاس، ومعاه 100 XP وكارت تشاركه.'
                : 'Every finished goal becomes a cup, awarding 100 XP and a shareable card.'}
            </span>
          </span>
        </li>

      </ol>
    </section>
  )
}
