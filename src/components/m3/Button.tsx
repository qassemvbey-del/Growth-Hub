"use client";
import React from 'react';
import Icon from './Icon';

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';
type ButtonHeight = 40 | 48 | 56;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  height?: ButtonHeight;
  icon?: string;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  filled: 'bg-md-primary text-md-on-primary border border-transparent disabled:border-transparent',
  tonal: 'bg-md-sec-c text-md-on-sec-c border border-transparent disabled:border-transparent',
  outlined: 'border border-md-outline text-md-on disabled:border-md-outline-v',
  text: 'text-md-primary border border-transparent disabled:border-transparent',
};

const heightClasses: Record<number, string> = {
  40: 'h-10 px-6 relative after:absolute after:-inset-1 after:content-[""]',
  48: 'h-12 px-6',
  56: 'h-14 px-8',
};

export default function Button({ 
  variant = 'filled', 
  height = 48, 
  icon, 
  disabled, 
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-full font-readex font-semibold text-sm transition-all
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-md-primary
        active:scale-[0.97]
        disabled:opacity-100 disabled:pointer-events-none disabled:bg-md-sc-high disabled:text-md-outline
        ${variantClasses[variant]}
        ${heightClasses[height]}
        ${className}
      `}
      {...props}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  );
}
