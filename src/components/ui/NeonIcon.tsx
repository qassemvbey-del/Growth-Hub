import React from 'react'
import { LucideIcon } from 'lucide-react'

interface NeonIconProps extends React.SVGProps<SVGSVGElement> {
  icon: LucideIcon | React.ComponentType<any>
  size?: number | string
  color?: string
  intent?: 'primary' | 'danger' | 'success' | 'warning' | 'info' | 'custom' | 'none'
  glow?: boolean
  interactive?: boolean
  className?: string
}

export const NeonIcon: React.FC<NeonIconProps> = ({
  icon: IconComponent,
  size = 18,
  color,
  intent = 'none',
  glow = true,
  interactive = false,
  className = '',
  ...props
}) => {
  // Determine tailwind color classes based on intent
  let intentClass = ''
  let glowColorClass = 'drop-shadow-[0_0_5px_currentColor]'

  switch (intent) {
    case 'primary':
      intentClass = 'text-cyan-400'
      break
    case 'danger':
      intentClass = 'text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.6)]'
      glowColorClass = ''
      break
    case 'success':
      intentClass = 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.6)]'
      glowColorClass = ''
      break
    case 'warning':
      intentClass = 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.6)]'
      glowColorClass = ''
      break
    case 'info':
      intentClass = 'text-sky-400 drop-shadow-[0_0_5px_rgba(56,189,248,0.6)]'
      glowColorClass = ''
      break
    default:
      intentClass = ''
  }

  // Tactical styling with robust micro-animations
  const baseClasses = `
    inline-block
    shrink-0
    stroke-[2.5]
    ${glow && intent === 'none' ? glowColorClass : ''}
    ${intentClass}
    ${interactive ? 'transition-all duration-150 cubic-bezier(0.16, 1, 0.3, 1) hover:scale-110 active:scale-90 hover:brightness-125 cursor-pointer select-none' : 'transition-transform duration-200'}
    ${className}
  `.trim().replace(/\s+/g, ' ')

  // If a custom raw color is specified (e.g. style={{ color: currentTheme.color }}),
  // Tailwind drop-shadow-[0_0_5px_currentColor] will automatically pick it up.
  const style = color ? { color, ...props.style } : props.style

  return (
    <IconComponent
      size={size}
      className={baseClasses}
      style={style}
      {...props}
    />
  )
}
