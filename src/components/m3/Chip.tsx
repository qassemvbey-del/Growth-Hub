import React from 'react';
import Icon from './Icon';

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: string;
  children: React.ReactNode;
}

export default function Chip({ selected, icon, children, className = '', ...props }: ChipProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 h-8 px-4 rounded-chip text-sm transition-all font-readex min-h-[44px]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-md-primary
        active:scale-[0.97]
        ${selected 
          ? 'bg-md-sec-c text-md-on-sec-c' 
          : 'border border-md-outline text-md-on-sv'}
        ${className}
      `}
      {...props}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}
