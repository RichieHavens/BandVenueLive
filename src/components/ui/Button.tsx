import React from 'react';
import { cn } from '../../lib/utils';
import { theme } from '../../lib/theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  ...props 
}: ButtonProps) {
  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm'
  };

  return (
    <button 
      className={cn(
        "rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900",
        theme.button[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
