'use client'

import Icon from '@/components/m3/Icon'

interface Props {
  lang: 'ar' | 'en'
  isRTL: boolean
}

export default function LandingGoalTypes({ lang, isRTL }: Props) {
  return (
    <section className="shrink-0 py-6 md:py-16 md:px-16 bg-md-sc-low flex flex-col gap-4 md:gap-10 mt-6 md:mt-0">
      
      <div className="flex flex-col gap-2 md:gap-2 px-4 md:px-0">
        <h2 className="m-0 font-readex text-[26px] leading-[34px] md:text-[36px] md:leading-[44px] font-semibold text-md-on">
          {isRTL ? 'كل هدف ليه شكله' : 'Every goal has its shape'}
        </h2>
        <p className="m-0 text-base md:text-[18px] md:leading-[28px] text-md-on-sv">
          {isRTL ? 'الموقع بيفهم إنت حاطط إيه، ويعرضه بالشكل اللي يناسبه.' : 'The app understands what you pasted and displays it perfectly.'}
        </p>
      </div>

      {/* Cards Container */}
      <div 
        className="flex gap-3 md:gap-6 px-4 md:px-0 overflow-x-auto pb-4 md:pb-0 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        
        {/* Card 1: YouTube */}
        <div className="w-[288px] md:w-auto md:flex-1 shrink-0 snap-center rounded-[28px] bg-md-tc text-md-on-tc p-5 md:p-6 flex flex-col justify-between min-h-[240px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="h-7 px-2.5 rounded-lg bg-md-yt-chip text-md-on-yt-chip flex items-center gap-1.5 text-[13px] font-semibold">
                <Icon name="smart_display" filled size={18} />
                {isRTL ? 'يوتيوب' : 'YouTube'}
              </span>
              <span dir="ltr" className="font-readex text-lg md:text-[20px] font-semibold">40%</span>
            </div>
            
            <div className="flex flex-col gap-2 mt-2 md:mt-4">
              <span className="font-readex text-[20px] md:text-[24px] font-semibold text-md-on">
                {isRTL ? 'كورس React كامل' : 'Full React Course'}
              </span>
              <span className="text-sm">
                {isRTL ? '13 من 32 درس خلصوا' : '13 of 32 lessons done'}
              </span>
              <span className="h-1.5 rounded-full bg-md-track-on-tc flex justify-start mt-1">
                <span className="w-[40%] rounded-full bg-md-on-tc"></span>
              </span>
              <span className="hidden md:flex text-sm items-center gap-1.5 mt-2">
                <Icon name="play_circle" filled size={18} />
                {isRTL ? 'الجاي: الدرس 14: الـ Hooks' : 'Next: Lesson 14: Hooks'}
              </span>
            </div>
          </div>
          <p className="m-0 text-[14px] md:text-[15px] leading-5 md:leading-6 mt-4 md:mt-0 text-md-on-tc">
            <span className="text-md-on font-semibold">{isRTL ? 'كورس من يوتيوب. ' : 'YouTube Course. '}</span>
            {isRTL ? 'بيعدّ الدروس، ويفتحلك من الثانية اللي وقفت عندها.' : 'Counts lessons and resumes exactly where you left off.'}
          </p>
        </div>

        {/* Card 2: Normal Goal */}
        <div className="w-[288px] md:w-auto md:flex-1 shrink-0 snap-center rounded-[28px] bg-md-sc border border-md-outline-v p-5 md:p-6 flex flex-col justify-between min-h-[240px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="w-10 h-10 rounded-xl bg-md-sec-c text-md-on-sec-c flex items-center justify-center">
                <Icon name="school" />
              </span>
              <span className="hidden md:flex h-7 px-2.5 rounded-lg border border-md-outline-v items-center gap-1.5 text-[13px] text-md-on-sv">
                <Icon name="event" size={18} />
                {isRTL ? 'الامتحان 15 أكتوبر' : 'Exam Oct 15'}
              </span>
              <span className="md:hidden text-[13px] text-md-on-sv">
                {isRTL ? 'الامتحان 15 أكتوبر' : 'Exam Oct 15'}
              </span>
            </div>
            
            <div className="flex flex-col gap-2 mt-2 md:mt-4">
              <span className="font-readex text-[20px] md:text-[24px] font-semibold text-md-on">
                {isRTL ? 'مذاكرة الإحصاء' : 'Study Statistics'}
              </span>
              <span className="text-sm text-md-on-sv">
                {isRTL ? '12 مهمة' : '12 tasks'}
              </span>
              <span className="hidden md:flex text-sm items-center gap-1.5 text-md-on mt-2">
                <span className="w-[18px] h-[18px] rounded-full border-2 border-md-outline shrink-0"></span>
                {isRTL ? 'الجاي: اكتب ملخص الفصل التالت' : 'Next: Write Chapter 3 summary'}
              </span>
            </div>
          </div>
          <p className="m-0 text-[14px] md:text-[15px] leading-5 md:leading-6 mt-4 md:mt-0 text-md-on-sv">
            <span className="hidden md:inline text-md-on font-semibold">{isRTL ? 'هدف عادي. ' : 'Normal goal. '}</span>
            {isRTL ? 'اكتب "عايز أذاكر للامتحان"، والـ AI يقسمه لخطوات تراجعها.' : 'Type "I want to study for the exam" and AI splits it into steps.'}
          </p>
        </div>

        {/* Card 3: Work Project */}
        <div className="w-[288px] md:w-auto md:flex-1 shrink-0 snap-center rounded-[28px] bg-md-sec-c text-md-on-sec-c p-5 md:p-6 flex flex-col justify-between min-h-[240px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="w-10 h-10 rounded-xl bg-md-bg text-md-primary flex items-center justify-center">
                <Icon name="work" />
              </span>
              <span className="hidden md:flex h-7 px-2.5 rounded-lg border border-md-outline-v items-center gap-1.5 text-[13px]">
                <Icon name="event" size={18} />
                {isRTL ? 'التسليم 20 أكتوبر' : 'Due Oct 20'}
              </span>
              <span className="md:hidden text-[13px]">
                {isRTL ? 'التسليم 20 أكتوبر' : 'Due Oct 20'}
              </span>
            </div>
            
            <div className="flex flex-col gap-2 mt-2 md:mt-4">
              <span className="font-readex text-[20px] md:text-[24px] font-semibold text-md-on">
                {isRTL ? 'تسليم موقع العميل' : 'Deliver Client Site'}
              </span>
              <span className="text-sm">
                {isRTL ? '9 مهام' : '9 tasks'}
              </span>
              <span className="hidden md:flex text-sm items-center gap-1.5 mt-2">
                <span className="w-[18px] h-[18px] rounded-full border-2 border-md-on-sec-c shrink-0"></span>
                {isRTL ? 'الجاي: اربط صفحة الدفع' : 'Next: Connect payment page'}
              </span>
            </div>
          </div>
          <p className="m-0 text-[14px] md:text-[15px] leading-5 md:leading-6 mt-4 md:mt-0 text-md-on-sec-c">
            <span className="hidden md:inline text-md-on font-semibold">{isRTL ? 'مشروع شغلك. ' : 'Work project. '}</span>
            {isRTL ? 'لوحدك، بقايمة أو بورد، ووقت تركيز لكل مهمة.' : 'Solo, in list or board view, with focus timers per task.'}
          </p>
        </div>

        {/* Card 4: Squad Project */}
        <div className="w-[288px] md:w-auto md:flex-1 shrink-0 snap-center rounded-[28px] bg-md-xp-c text-md-on-xp-c p-5 md:p-6 flex flex-col justify-between min-h-[240px]">
          <div>
            <div className="flex justify-between items-center">
              <span className="flex">
                <span className="w-8 h-8 rounded-full bg-md-tc text-md-on-tc flex items-center justify-center text-[13px] border-2 border-md-xp-c z-30">A</span>
                <span className="w-8 h-8 rounded-full bg-md-sec-c text-md-on-sec-c flex items-center justify-center text-[13px] border-2 border-md-xp-c -ms-2.5 z-20">M</span>
                <span className="w-8 h-8 rounded-full bg-md-bg text-md-on flex items-center justify-center text-[13px] border-2 border-md-xp-c -ms-2.5 z-10">O</span>
              </span>
              <span dir="ltr" className="font-readex text-[18px] md:text-[20px] font-semibold">72%</span>
            </div>
            
            <div className="flex flex-col gap-2 mt-2 md:mt-4">
              <span className="font-readex text-[20px] md:text-[24px] font-semibold text-md-on">
                {isRTL ? 'مشروع التخرج' : 'Graduation Project'}
              </span>
              <span className="text-sm">
                {isRTL ? 'مع سارة وعمر ونور' : 'With Sarah, Omar, and Nour'}
              </span>
              <span className="hidden md:flex h-1.5 rounded-full bg-black/20 justify-start mt-1">
                <span className="w-[72%] rounded-full bg-md-on-xp-c"></span>
              </span>
              <span className="hidden md:flex text-sm items-center gap-1.5 mt-2">
                <Icon name="leaderboard" size={18} />
                {isRTL ? 'ترتيب الأسبوع جوه الفريق' : 'Weekly squad leaderboard'}
              </span>
            </div>
          </div>
          <p className="m-0 text-[14px] md:text-[15px] leading-5 md:leading-6 mt-4 md:mt-0 text-md-on-xp-c">
            <span className="hidden md:inline text-md-on font-semibold">{isRTL ? 'مع صحابك. ' : 'With friends. '}</span>
            {isRTL ? 'وزّعوا المهام، وكل حاجة تخلص بتتعلّم عند الكل. وفيه ترتيب أسبوعي جوه الفريق.' : 'Assign tasks, sync progress, and compete on the weekly leaderboard.'}
          </p>
        </div>

      </div>

      {/* Mobile Pagination Dots */}
      <div className="md:hidden flex gap-1.5 justify-center" aria-hidden="true">
        <span className="w-5 h-1.5 rounded-full bg-md-primary"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-md-outline-v"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-md-outline-v"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-md-outline-v"></span>
      </div>

    </section>
  )
}
