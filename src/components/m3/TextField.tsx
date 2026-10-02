import React from 'react';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function TextField({ label, className = '', ...props }: TextFieldProps) {
  return (
    <div className={`relative h-[56px] w-full bg-inherit ${className}`}>
      <input
        className="
          peer w-full h-full px-4 rounded-[12px] bg-transparent
          border border-md-outline text-md-on font-readex text-base
          focus:outline-none focus:border-2 focus:border-md-primary
          placeholder-transparent transition-all
        "
        placeholder={label}
        {...props}
      />
      <label
        className="
          absolute start-3 px-1 text-md-on-sv pointer-events-none transition-all
          bg-inherit font-readex truncate max-w-[calc(100%-24px)]
          top-1/2 -translate-y-1/2 text-base
          peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-md-primary
          peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px]
        "
      >
        {label}
      </label>
    </div>
  );
}
