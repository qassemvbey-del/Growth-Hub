"use client";
import React from 'react';
import Icon from './Icon';

interface CheckCircleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label': string;
  className?: string;
}

export default function CheckCircle({ checked, onChange, 'aria-label': ariaLabel, className = '' }: CheckCircleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`
        relative flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-full transition-all flex-shrink-0
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-md-primary
        active:scale-[0.97]
        ${className}
      `}
    >
      {checked ? (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-md-primary text-md-on-primary">
          <Icon name="check" size={18} />
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full border-2 border-md-outline" />
      )}
    </button>
  );
}
