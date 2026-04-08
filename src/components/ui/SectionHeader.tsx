import React from 'react';
import { cn } from '../../lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, icon, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3 mb-6", className)}>
      {icon && <div className="text-red-600">{icon}</div>}
      <div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        {subtitle && <p className="text-neutral-400 text-sm">{subtitle}</p>}
      </div>
    </div>
  );
}
