"use client"

import React from 'react'
import { Check, Clock, Sparkles } from 'lucide-react'
import { useGrowth, Profile } from '@/context/GrowthContext'

// Commented out per rule "Never delete code, only comment it out"
// import { CreditCard, RefreshCw } from 'lucide-react'
// import { usePricing } from '@/hooks/usePricing'

interface ExtendedProfile extends Profile {
  user_tier?: 'free' | 'pro' | 'elite'
}

const pricingContent = {
  en: {
    title: "Pricing Plans",
    subtitle: "Invest in your personal growth and team collaboration",
    comingSoon: "Coming Soon",
    comingSoonDesc: "Payments are being configured. Check back shortly.",
    free: {
      name: "Free Plan",
      price: "0 EGP",
      period: "Month",
      desc: "The perfect starting point to organize your individual life.",
      btnCurrent: "Current Plan",
      features: [
        "Max 5 active individual goals",
        "Unlimited tasks tracking",
        "20 MB Storage capacity",
        "Access to 1 Squad only",
        "AI Quota: 3 requests / 12 hours"
      ]
    },
    pro: {
      name: "Pro Plan",
      price: "60 EGP",
      period: "Month",
      desc: "Uncapped productivity and specialized AI for professionals.",
      btnAction: "Upgrade to Pro",
      features: [
        "Unlimited goals & tasks",
        "1 GB Storage capacity",
        "Lifetime analytics history",
        "Up to 3 Squads",
        "AI Quota: 50 requests / 12 hours",
        "Full access to Programmer, Network, Accountant, & Learner AI Boxes"
      ]
    },
    elite: {
      name: "Elite Plan",
      price: "115 EGP",
      period: "Month",
      desc: "The ultimate powerhouse for teams and intensive users.",
      btnAction: "Upgrade to Elite",
      features: [
        "Includes all Pro features",
        "5 GB Enterprise Storage",
        "Unlimited Squads creation",
        "Squad Leaderboard access",
        "Massive AI Quota: 150 requests / 12 hours"
      ]
    },
    refill: {
      title: "Instant AI Refill Pack",
      price: "15 EGP",
      period: "One-time",
      desc: "Exhausted your quota? Bypass the 12-hour cooldown and instantly reset your AI request counter to 0 right now.",
      btnAction: "Refill AI Quota"
    }
  },
  ar: {
    title: "خطط الأسعار",
    subtitle: "استثمر في تطوير ذاتك وتسهيل العمل الجماعي مع فريقك",
    comingSoon: "قريباً",
    comingSoonDesc: "جاري إعداد نظام الدفع. تابعنا قريباً.",
    free: {
      name: "الخطة المجانية",
      price: "0 ج.م",
      period: "شهرياً",
      desc: "نقطة البداية لتنظيم حياتك الفردية.",
      btnCurrent: "الخطة الحالية",
      features: [
        "5 أهداف فردية كحد أقصى",
        "تتبع مهام غير محدود",
        "سعة تخزين 20 ميجابايت",
        "مجموعة/سكواد واحد فقط",
        "كوتة AI: 3 استعلامات كل 12 ساعة"
      ]
    },
    pro: {
      name: "خطة المحترفين",
      price: "60 ج.م",
      period: "شهرياً",
      desc: "إنتاجية بلا حدود وذكاء اصطناعي للمحترفين.",
      btnAction: "الترقية إلى خطة المحترفين",
      features: [
        "أهداف ومهام غير محدودة",
        "سعة تخزين 1 جيجابايت",
        "تاريخ وإحصائيات مدى الحياة",
        "حتى 3 مجموعات",
        "كوتة AI: 50 استعلام كل 12 ساعة",
        "وصول كامل لصناديق الخبراء (المبرمج، الشبكات، المحاسب، والتعليم)"
      ]
    },
    elite: {
      name: "خطة الأساطير",
      price: "115 ج.م",
      period: "شهرياً",
      desc: "القوة الضاربة لفرق العمل والاستخدام المكثف.",
      btnAction: "الترقية إلى خطة الأساطير",
      features: [
        "شامل ميزات البرو",
        "سعة تخزين 5 جيجابايت",
        "مجموعات غير محدودة",
        "لوحة شرف جماعية للترتيب",
        "كوتة AI: 150 استعلام كل 12 ساعة"
      ]
    },
    refill: {
      title: "الشحن الفوري لكوتة الذكاء الاصطناعي",
      price: "15 ج.م",
      period: "دفعة واحدة",
      desc: "نفدت كوتة الاستعلامات؟ تخطى وقت الانتظار وصفر عداد الذكاء الاصطناعي الخاص بك فوراً.",
      btnAction: "شحن عداد الذكاء الاصطناعي"
    }
  }
}

export default function PricingPage() {
  const { profile } = useGrowth()
  // Commented out per rule "Never delete code, only comment it out"
  // const { loadingTier, handleCheckout } = usePricing()

  const extProfile = profile as ExtendedProfile
  const currentTier = extProfile?.user_tier || 'free'
  const isAr = extProfile?.language === 'ar'
  const t = isAr ? pricingContent.ar : pricingContent.en

  return (
    <div className="min-h-screen py-12 px-4 md:px-8 max-w-7xl mx-auto space-y-16 font-sans tracking-normal select-none">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold text-zinc-100 flex items-center justify-center gap-2">
          {t.title}
        </h1>
        <p className="text-zinc-400 text-sm md:text-base">
          {t.subtitle}
        </p>
      </div>

      {/* Coming Soon Notice */}
      <div className="flex items-center justify-center gap-3 bg-zinc-900/60 border border-zinc-700/50 rounded-lg px-6 py-4 max-w-lg mx-auto">
        <Clock className="w-5 h-5 text-teal-400 shrink-0" />
        <div>
          <p className="text-zinc-200 font-semibold text-sm">{t.comingSoon}</p>
          <p className="text-zinc-500 text-xs">{t.comingSoonDesc}</p>
        </div>
      </div>

      {/* Pricing Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {/* Free Plan Card */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6 md:p-8 flex flex-col justify-between shadow-lg relative">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-200">
                {t.free.name}
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm">
                {t.free.desc}
              </p>
            </div>
            <div className="flex items-baseline gap-1.5 py-4 border-b border-zinc-800">
              <span className="text-3xl md:text-4xl font-bold text-zinc-100">
                {t.free.price}
              </span>
              <span className="text-zinc-500 text-sm">
                / {t.free.period}
              </span>
            </div>
            <ul className="space-y-4">
              {t.free.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-zinc-300 text-xs md:text-sm">
                  <Check className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-8">
            <button
              disabled
              className="w-full h-11 flex items-center justify-center rounded bg-zinc-800 text-zinc-500 font-semibold text-xs md:text-sm cursor-not-allowed border border-zinc-700/50"
            >
              {currentTier === 'free' ? t.free.btnCurrent : t.free.name}
            </button>
          </div>
        </div>

        {/* Pro Plan Card */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-6 md:p-8 flex flex-col justify-between shadow-lg relative">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-100 flex items-center gap-2">
                {t.pro.name}
                <Sparkles className="w-5 h-5 text-teal-400 shrink-0" />
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm">
                {t.pro.desc}
              </p>
            </div>
            <div className="flex items-baseline gap-1.5 py-4 border-b border-zinc-800">
              <span className="text-3xl md:text-4xl font-bold text-zinc-100">
                {t.pro.price}
              </span>
              <span className="text-zinc-500 text-sm">
                / {t.pro.period}
              </span>
            </div>
            <ul className="space-y-4">
              {t.pro.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-zinc-300 text-xs md:text-sm">
                  <Check className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-8">
            <button
              disabled
              className="w-full h-11 flex items-center justify-center gap-2 rounded bg-zinc-800 text-zinc-500 font-semibold text-xs md:text-sm cursor-not-allowed border border-zinc-700/50"
            >
              <Clock className="w-4 h-4" />
              {t.comingSoon}
            </button>
          </div>
        </div>

        {/* Elite Plan Card */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-6 md:p-8 flex flex-col justify-between shadow-lg relative">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-100 flex items-center gap-2">
                {t.elite.name}
                <Sparkles className="w-5 h-5 text-teal-400 shrink-0" />
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm">
                {t.elite.desc}
              </p>
            </div>
            <div className="flex items-baseline gap-1.5 py-4 border-b border-zinc-800">
              <span className="text-3xl md:text-4xl font-bold text-zinc-100">
                {t.elite.price}
              </span>
              <span className="text-zinc-500 text-sm">
                / {t.elite.period}
              </span>
            </div>
            <ul className="space-y-4">
              {t.elite.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-zinc-300 text-xs md:text-sm">
                  <Check className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-8">
            <button
              disabled
              className="w-full h-11 flex items-center justify-center gap-2 rounded bg-zinc-800 text-zinc-500 font-semibold text-xs md:text-sm cursor-not-allowed border border-zinc-700/50"
            >
              <Clock className="w-4 h-4" />
              {t.comingSoon}
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Instant AI Refill Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-teal-950 text-teal-400 text-xs px-2.5 py-1 rounded border border-teal-900/50 font-semibold">
                {t.refill.period}
              </span>
              <h3 className="text-lg md:text-xl font-bold text-zinc-100">
                {t.refill.title}
              </h3>
            </div>
            <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
              {t.refill.desc}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 shrink-0">
            <div className="text-left md:text-right">
              <span className="text-2xl md:text-3xl font-bold text-zinc-100 block">
                {t.refill.price}
              </span>
            </div>
            <button
              disabled
              className="h-11 px-6 flex items-center justify-center gap-2 rounded bg-zinc-800 text-zinc-500 font-semibold text-xs md:text-sm cursor-not-allowed border border-zinc-700/50 min-w-[160px]"
            >
              <Clock className="w-4 h-4" />
              {t.comingSoon}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
