import React from 'react';
import { cn } from '../../lib/utils';
import { statusColors } from '../../lib/theme';

export type EventStatus = 
  | 'Draft' 
  | 'Needs Band Confirmation' 
  | 'Needs Promo Assets' 
  | 'Almost Ready'
  | 'Ready' 
  | 'Published' 
  | 'Canceled' 
  | 'Archived' 
  | 'Waiting on You' 
  | 'Waiting on Band' 
  | 'Waiting on Others';

interface StatusBadgeProps {
  status: EventStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
      statusColors[status],
      className
    )}>
      {status}
    </span>
  );
}
