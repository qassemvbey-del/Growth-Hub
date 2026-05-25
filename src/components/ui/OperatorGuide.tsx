'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'
import { X, HelpCircle } from 'lucide-react'

const GUIDE_CONTENT_EN: Record<string, { title: string; tips: string[] }> = {
  '/': {
    title: 'DASHBOARD_TACTICS',
    tips: [
      'Focus Capacity is limited to 9 units. Prioritize big wins.',
      'Goals in RED_ZONE need immediate intervention.',
      'The EnergyCell shows real-time progress for your active goals.'
    ]
  },
  '/missions': {
    title: 'GOAL_CONTROL',
    tips: [
      'Break large goals into smaller, manageable tasks.',
      'Use the Calendar icon to sync targets with your Google Calendar.',
      'Archive completed goals to declutter your focus capacity.'
    ]
  },
  '/notes': {
    title: 'NOTES',
    tips: [
      'Capture ideas instantly before they vanish into the void.',
      'Use tags like #Task or #Idea to filter your mental archive.',
      'Search memory bar retrieves any log entry in milliseconds.'
    ]
  },
  '/vault': {
    title: 'RANKING_PROTOCOL',
    tips: [
      'Higher ranks unlock premium interface themes and AI behaviors.',
      'XP is earned by completing goal tasks and hitting milestones.',
      'Reach CONQUEROR rank to unlock the full SAVAGE coach protocol.'
    ]
  },
  '/achievements': {
    title: 'HONOR_LOG',
    tips: [
      'Medals are proof of your consistent high-performance execution.',
      'Complete unique streaks to unlock rare tactical badges.',
      'Every milestone recorded here boosts your overall rank progression.'
    ]
  }
}

const GUIDE_CONTENT_AR: Record<string, { title: string; tips: string[] }> = {
  '/': {
    title: 'دليل لوحة التحكم',
    tips: [
      'سعة التركيز محدودة بـ 9 وحدات. ركّز على الأهداف ذات الأولوية العالية.',
      'الأهداف المعرضة للتأخر تتطلب مراجعة عاجلة.',
      'مؤشر الطاقة يعرض مستوى التقدم الفعلي لأهدافك النشطة.'
    ]
  },
  '/missions': {
    title: 'إدارة الأهداف',
    tips: [
      'قسّم الأهداف الكبيرة إلى مهام صغيرة يسهل إنجازها.',
      'استخدم أيقونة التقويم لمزامنة أهدافك مع تقويم جوجل.',
      'قم بأرشفة الأهداف المكتملة لتفريغ سعة التركيز المتوفرة.'
    ]
  },
  '/notes': {
    title: 'الملاحظات والأفكار',
    tips: [
      'سجّل أفكارك فوراً قبل أن تتلاشى في الفراغ.',
      'استخدم وسوماً مثل #مهمة أو #فكرة لتصفية أرشيفك العقلي.',
      'البحث في شريط الذاكرة يسترجع أي سجل في أجزاء من الثانية.'
    ]
  },
  '/vault': {
    title: 'مستويات التصنيف',
    tips: [
      'المستويات المتقدمة تتيح سمات واجهة فريدة وتوجيهات أكثر دقة من المساعد الذكي.',
      'تكتسب نقاط الخبرة (XP) بإنجاز مهام الأهداف وتحقيق النتائج.',
      'صل إلى رتبة التميز الفائقة (CONQUEROR) لتفعيل كافة توجيهات المساعد الذكي.'
    ]
  },
  '/achievements': {
    title: 'سجل الإنجازات',
    tips: [
      'الميداليات توثق استمرارية أدائك المتميز في الإنجاز.',
      'أكمل الأهداف المتتالية لفتح شارات تقديرية مميزة.',
      'كل إنجاز تسجله هنا يدعم تقدم رتبتك العامة.'
    ]
  }
}

export default function OperatorGuide() {
  const pathname = usePathname()
  const { isRTL, currentTheme } = useGrowth()
  const [isOpen, setIsOpen] = useState(false)

  const GUIDE_CONTENT = isRTL ? GUIDE_CONTENT_AR : GUIDE_CONTENT_EN
  const content = GUIDE_CONTENT[pathname] || {
    title: isRTL ? 'النظام جاهز' : 'SYSTEM_READY',
    tips: isRTL
      ? ['ابدأ العمل على أهدافك اليوم. حافظ على تركيزك لتحقيق أفضل النتائج.']
      : ['Execute your objectives. Maintain high-fidelity focus. No excuses.']
  }

  return (
    <>
      {/* Floating Button */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border shadow-2xl backdrop-blur-xl transition-all"
          style={{ 
            backgroundColor: `${currentTheme.color}22`, 
            borderColor: `${currentTheme.color}44`,
            color: currentTheme.color,
            boxShadow: isOpen ? `0 0 20px ${currentTheme.color}44` : 'none'
          }}
        >
          {isOpen ? <X className="w-5 h-5 md:w-6 md:h-6" /> : <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />}
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={cn(
                "absolute bottom-16 md:bottom-20 w-72 md:w-80 glass-panel p-6 border shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[200]",
                isRTL ? "left-0 origin-bottom-left" : "right-0 origin-bottom-right"
              )}
              style={{ borderColor: `${currentTheme.color}33` }}
            >
              <div className="space-y-4">
                <header className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-3">
                  <span className="text-[10px] font-space tracking-[0.3em] font-black uppercase opacity-60" style={{ color: currentTheme.color }}>
                    {isRTL ? 'دليل المشغل' : 'MEMBER_GUIDE'} // {content.title}
                  </span>
                </header>

                <div className="space-y-4">
                  {content.tips.map((tip, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-[10px] font-black mt-1 opacity-40" style={{ color: currentTheme.color }}>0{i+1}</span>
                      <p className="text-xs md:text-sm font-bold text-black/80 dark:text-white/80 leading-relaxed">
                        {tip}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-black/10 dark:border-white/10">
                  <p className="text-[9px] font-space tracking-widest uppercase opacity-30">
                    {isRTL ? 'حافظ على التركيز' : 'STAY_FOCUSED // EXECUTE'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
