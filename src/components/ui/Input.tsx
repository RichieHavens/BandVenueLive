import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">{icon}</div>}
        <input
          className={cn(
            "w-full bg-neutral-950 border border-neutral-700 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-neutral-600",
            icon && "pl-12",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
