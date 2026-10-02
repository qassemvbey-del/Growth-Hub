"use client";
import React, { useId } from 'react';

interface WavyProgressProps {
  value: number; // 0 to 1
  className?: string;
}

export default function WavyProgress({ value, className = '' }: WavyProgressProps) {
  const safeValue = Math.max(0, Math.min(1, value));
  const patternId = useId();
  
  return (
    <div 
      className={`relative h-4 w-full flex items-center ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(safeValue * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="absolute inset-x-0 h-1 bg-md-track rounded-full top-[6px]" />
      
      <div 
        className="absolute inset-y-0 start-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ width: `${safeValue * 100}%` }}
      >
        <svg height="16" width="2000" className="max-w-none">
          <pattern id={patternId} x="0" y="0" width="22" height="16" patternUnits="userSpaceOnUse">
            <path d="M 22 8 q -5.5 -6 -11 0 t -11 0" fill="none" stroke="var(--md-primary)" strokeWidth="4" strokeLinecap="round" />
          </pattern>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </div>
    </div>
  );
}
