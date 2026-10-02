import React from 'react';
import Icon from './Icon';

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
    <div className={`flex gap-[2px] h-10 ${className}`}>
      {items.map((item, index) => {
        const isSelected = item.id === selectedId;
        
        let radiusClass = 'rounded-[8px]';
        if (isSelected) {
          radiusClass = 'rounded-[20px]';
        } else if (items.length === 1) {
          radiusClass = 'rounded-[20px]';
        } else if (index === 0) {
          radiusClass = 'rounded-s-[20px] rounded-e-[8px]';
        } else if (index === items.length - 1) {
          radiusClass = 'rounded-s-[8px] rounded-e-[20px]';
        }

        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-3 font-readex font-medium text-sm transition-all
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-md-primary
              active:scale-[0.98]
              ${radiusClass}
              ${isSelected ? 'bg-md-primary text-md-on-primary' : 'bg-md-sc-high text-md-on-sv hover:bg-md-on-sv/10'}
            `}
          >
            {isSelected ? (
              <Icon name="check" size={18} />
            ) : item.icon ? (
              <Icon name={item.icon} size={18} />
            ) : null}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
