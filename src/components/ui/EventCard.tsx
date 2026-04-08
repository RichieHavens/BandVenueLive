import React from 'react';
import { MapPin, Calendar, Clock, Copy, Edit2, AlertCircle, User, Music } from 'lucide-react';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { formatDate, formatTime } from '../../lib/utils';
import { AppEvent } from '../../types';

interface EventCardProps {
  event: AppEvent;
  onCopy: () => void;
  onEdit: () => void;
}

export function EventCard({ event, onCopy, onEdit }: EventCardProps) {
  // Logic to determine status, blocker, ownership
  const isPublished = event.is_published;
  const isVenueConfirmed = event.venue_confirmed;
  const isBandConfirmed = event.band_confirmed;
  const confirmationStatus = event.band_confirmation_status;
  const hasDate = !!event.start_time;

  let status: 'Draft' | 'Needs Band Confirmation' | 'Needs Promo Assets' | 'Almost Ready' | 'Ready' | 'Published' | 'Canceled' | 'Archived' = 'Draft';
  if (isPublished) status = 'Published';
  else if (isVenueConfirmed && isBandConfirmed && hasDate) status = 'Ready';
  else if (isVenueConfirmed && isBandConfirmed) status = 'Almost Ready';
  else if (!isBandConfirmed) status = 'Needs Band Confirmation';
  else status = 'Draft';

  let blocker = '';
  let owner = '';

  if (!isVenueConfirmed) {
    blocker = 'Venue Confirmation';
    owner = 'Venue';
  } else if (!isBandConfirmed) {
    blocker = 'Band Confirmation';
    owner = 'Band';
  } else if (!hasDate) {
    blocker = 'Date/Time';
    owner = 'You';
  }

  const daysUntil = event.start_time ? Math.ceil((new Date(event.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <Card className="flex items-center gap-4 p-4 hover:border-primary transition-all">
      {/* Readiness Indicator */}
      <div className="shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
        <span className="text-xs font-bold text-muted-foreground">
          {daysUntil !== null ? `${daysUntil}d` : '--'}
        </span>
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-bold text-foreground truncate">{event.title}</h3>
          <StatusBadge status={status} />
          {confirmationStatus && (
            <span className={`text-xs px-2 py-1 rounded-full ${confirmationStatus === 'confirmed' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
              {confirmationStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin size={14} />
            <span>{(event as any).venues?.name || '---'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>{event.start_time ? formatDate(event.start_time) : 'No Date'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span>{event.start_time ? formatTime(event.start_time) : '--:--'}</span>
          </div>
        </div>
      </div>

      {/* Blocker/Owner */}
      {blocker && (
        <div className="hidden md:flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle size={12} />
            <span className="font-semibold">{blocker}</span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <User size={12} />
            <span>Waiting on {owner}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onCopy}><Copy size={16} className="mr-2" />Copy</Button>
        <Button variant="ghost" size="sm" onClick={onEdit}><Edit2 size={16} className="mr-2" />Edit</Button>
      </div>
    </Card>
  );
}
