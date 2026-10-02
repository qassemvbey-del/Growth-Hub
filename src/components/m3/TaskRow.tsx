import React from 'react';
import CheckCircle from './CheckCircle';

interface TaskRowProps {
  checked: boolean;
  onCheck: (checked: boolean) => void;
  title: string;
  meta?: string;
  xp?: number;
  className?: string;
}

export default function TaskRow({ checked, onCheck, title, meta, xp, className = '' }: TaskRowProps) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-card bg-md-sc-low min-h-[44px] ${className}`}>
      <CheckCircle 
        checked={checked} 
        onChange={onCheck} 
        aria-label={`Toggle task: ${title}`} 
      />
      
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <span className={`font-readex font-semibold text-base truncate transition-all ${checked ? 'line-through opacity-60 text-md-on-sv' : 'text-md-on'}`}>
          {title}
        </span>
        {meta && (
          <span className="text-sm text-md-on-sv truncate">
            {meta}
          </span>
        )}
      </div>

      {xp !== undefined && (
        <div className="flex items-center justify-end px-2 whitespace-nowrap">
          <span className="text-md-xp font-readex font-bold text-sm" dir="ltr">
            +{xp} XP
          </span>
        </div>
      )}
    </div>
  );
}
