import React from 'react';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function TextField({ label, className = '', ...props }: TextFieldProps) {
  return (
    <div className={`relative h-14 min-h-[56px] ${className}`}>
      <input
        className="
          peer w-full h-full px-4 pt-4 pb-1 rounded-md bg-transparent
          border border-md-outline text-md-on text-base
          focus:outline-none focus:border-2 focus:border-md-primary
          placeholder-transparent
        "
        placeholder={label}
        {...props}
      />
      <label
        className="
          absolute inset-inline-start-4 top-1.5 text-xs text-md-on-sv pointer-events-none transition-all
          peer-placeholder-shown:text-base peer-placeholder-shown:top-4
          peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-md-primary
        "
      >
        {label}
      </label>
    </div>
  );
}
