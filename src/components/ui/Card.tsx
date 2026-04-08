import React from 'react';
import { cn } from '../../lib/utils';
import { theme } from '../../lib/theme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
}

export function Card({ 
  children, 
  className, 
  interactive = false, 
  padding = 'md',
  header,
  footer,
  onClick
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={cn(
      theme.card,
      interactive && "hover:border-neutral-700 transition-colors cursor-pointer",
      className
    )} onClick={onClick}>
      {header && <div className="px-8 pt-8 pb-4">{header}</div>}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
      {footer && <div className="px-8 pb-8 pt-4">{footer}</div>}
    </div>
  );
}
