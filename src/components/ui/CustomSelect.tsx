'use client'

import { Check, HelpCircle, ChevronDown } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGrowth } from '@/context/GrowthContext'

interface CustomSelectProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  compact?: boolean
  minimal?: boolean
}

/* Commented out original non-compact signature
export default function CustomSelect({ options, value, onChange, placeholder = 'SELECT', className }: CustomSelectProps) {
*/
export default function CustomSelect({ options, value, onChange, placeholder = 'SELECT', className, compact = false, minimal = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { currentTheme } = useGrowth()
  
  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEsc)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen])

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {/* Commented out original button code
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-black/5 dark:bg-black border px-4 py-3 rounded-md flex items-center justify-between text-zinc-900 dark:text-white font-space uppercase tracking-widest text-sm transition-all",
          isOpen ? "border-transparent" : "border-zinc-200 dark:border-white/10"
        )}
        style={{
          borderColor: isOpen ? currentTheme.color : undefined,
          boxShadow: isOpen ? `0 0 10px ${currentTheme.color}30` : undefined
        }}
      >
        <span className={cn(!selectedOption && "opacity-40")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <HelpCircle />
      </button>
      */}
      {/* Commented out standard compact button for safety
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-black/5 dark:bg-black border rounded-md flex items-center justify-between text-zinc-900 dark:text-white font-space uppercase tracking-widest transition-all",
          compact ? "px-2 py-1 text-[10px]" : "px-4 py-3 text-sm",
          isOpen ? "border-transparent" : "border-zinc-200 dark:border-white/10"
        )}
        style={{
          borderColor: isOpen ? currentTheme.color : undefined,
          boxShadow: isOpen ? `0 0 10px ${currentTheme.color}30` : undefined
        }}
      >
        <span className={cn(!selectedOption && "opacity-40")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <HelpCircle className={compact ? "w-3 h-3 ml-1" : "w-4 h-4 ml-2"} />
      </button>
      */}
      {minimal ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-auto bg-transparent border-none p-0 flex items-center gap-1 text-zinc-400 hover:text-white font-space uppercase tracking-wider text-xs transition-all outline-none focus:outline-none cursor-pointer",
            isOpen ? "text-white" : ""
          )}
        >
          <span className={cn(!selectedOption && "opacity-40")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-black/5 dark:bg-black border rounded-md flex items-center justify-between text-zinc-900 dark:text-white font-space uppercase tracking-widest transition-all",
            compact ? "px-2 py-1 text-[10px]" : "px-4 py-3 text-sm",
            isOpen ? "border-transparent" : "border-zinc-200 dark:border-white/10"
          )}
          style={{
            borderColor: isOpen ? currentTheme.color : undefined,
            boxShadow: isOpen ? `0 0 10px ${currentTheme.color}30` : undefined
          }}
        >
          <span className={cn(!selectedOption && "opacity-40")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <HelpCircle className={compact ? "w-3 h-3 ml-1" : "w-4 h-4 ml-2"} />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 mt-1 bg-white dark:bg-[#0a0a0a] border rounded-md z-[9999] overflow-hidden min-w-[200px] w-full"
            style={{
              borderColor: `${currentTheme.color}50`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 15px ${currentTheme.color}15`
            }}
          >
            <div className="max-h-60 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm md:text-base font-space uppercase tracking-widest transition-all flex items-center justify-between text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  )}
                  style={option.value === value ? {
                    color: currentTheme.color,
                    backgroundColor: `${currentTheme.color}15`
                  } : {}}
                  onMouseEnter={e => {
                    if (option.value !== value) {
                      e.currentTarget.style.backgroundColor = `${currentTheme.color}08`;
                      e.currentTarget.style.color = currentTheme.color;
                    }
                  }}
                  onMouseLeave={e => {
                    if (option.value !== value) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check className="text-sm w-3.5 h-3.5" style={{ color: currentTheme.color }} />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
