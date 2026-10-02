import React from 'react';

export interface SegmentItem {
  id: string;
  label: string;
  icon?: string;
}

interface SegmentedButtonsProps {
  items: SegmentItem[];
  selectedId: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function SegmentedButtons({ items, selectedId, onChange, className = '' }: SegmentedButtonsProps) {
  return (
    <div className={`flex border border-md-outline rounded-full overflow-hidden h-10 min-h-[44px] ${className}`}>
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 font-readex text-sm transition-colors border-e last:border-e-0 border-md-outline
              focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-md-primary
              ${isSelected ? 'bg-md-sec-c text-md-on-sec-c' : 'bg-transparent text-md-on-sv hover:bg-md-on-sv/10'}
            `}
          >
            {item.icon && (
              <span className="material-symbols-rounded text-[18px]">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
