import React from 'react';

interface IconProps {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

export default function Icon({ name, filled, size = 24, className = '' }: IconProps) {
  return (
    <span 
      className={`material-symbols-rounded select-none ${filled ? '[font-variation-settings:\'FILL\'_1]' : '[font-variation-settings:\'FILL\'_0]'} ${className}`}
      style={{ 
        fontFamily: "'Material Symbols Rounded'", 
        fontWeight: 'normal', 
        fontSize: size, 
        lineHeight: 1,
        direction: 'ltr',
        wordWrap: 'normal',
        whiteSpace: 'nowrap'
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
