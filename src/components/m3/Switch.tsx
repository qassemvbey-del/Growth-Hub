import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label': string;
  className?: string;
}

export default function Switch({ checked, onChange, 'aria-label': ariaLabel, className = '' }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`
        relative flex items-center w-[52px] h-[32px] rounded-full transition-colors flex-shrink-0 min-h-[44px]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-md-primary
        ${checked ? 'bg-md-primary' : 'bg-md-sc-highest border-2 border-md-outline'}
        ${className}
      `}
    >
      <span
        className={`
          absolute rounded-full transition-all
          ${checked 
            ? 'w-[24px] h-[24px] bg-md-on-primary start-[24px]' 
            : 'w-[16px] h-[16px] bg-md-outline start-[6px]'}
        `}
      />
    </button>
  );
}
