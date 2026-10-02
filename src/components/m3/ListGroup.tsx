import React from 'react';

interface ListGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ListGroup({ children, className = '' }: ListGroupProps) {
  return (
    <div className={`flex flex-col gap-[2px] rounded-[20px] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ListItem({ children, className = '', ...props }: ListItemProps) {
  return (
    <div className={`rounded-[4px] bg-md-sc-low p-4 flex items-center min-h-[44px] ${className}`} {...props}>
      {children}
    </div>
  );
}
