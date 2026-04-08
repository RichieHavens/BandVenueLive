import React from 'react';
import { MapPin, Calendar, Clock, Copy, Edit2 } from 'lucide-react';
import { StatusBadge, EventStatus } from './StatusBadge';
import { formatDate, formatTime } from '../../lib/utils';

interface EventRowProps {
  event: any;
  needsAttention: boolean;
  onCopy: () => void;
  onEdit: () => void;
}

export function EventRow({ event, needsAttention, onCopy, onEdit }: EventRowProps) {
  return (
    <div className="bg-neutral-900/40 border-b border-neutral-800/50 flex items-center gap-3 px-3 py-1.5 group hover:bg-neutral-800/60 transition-all relative overflow-hidden first:rounded-t-xl last:rounded-b-xl last:border-b-0">
      {needsAttention && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500/60" />
      )}
      
      {/* Status Dot */}
      <div className="shrink-0 w-2 h-2 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center relative">
        {needsAttention && (
          <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse" />
        )}
        {!needsAttention && event.is_published && (
          <div className="absolute inset-0 bg-green-500 rounded-full opacity-40" />
        )}
      </div>

      {/* Thumbnail - Tiny */}
      <div className="hidden sm:block w-8 h-8 rounded bg-neutral-800 shrink-0 border border-neutral-700/30 overflow-hidden">
        <img 
          src={event.hero_url || `https://picsum.photos/seed/event${event.id}/64/64`} 
          alt="" 
          className="w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity"
          referrerPolicy="no-referrer"
        />
      </div>
      
      {/* Title & Genres */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <h3 className={`text-sm font-bold truncate ${!event.is_published ? 'text-neutral-500' : 'text-neutral-200'}`}>
          {event.title}
        </h3>
        <div className="hidden lg:flex gap-1 shrink-0">
          {(event as any).event_genres?.slice(0, 2).map((genre: string, index: number) => (
            <span key={`${event.id}-${genre}-${index}`} className="text-[8px] px-1.5 py-0 bg-red-600/5 text-red-600/60 rounded-full border border-red-600/10 uppercase font-bold tracking-tighter">
              {genre}
            </span>
          ))}
          {!event.is_published && (
            <StatusBadge status="Draft" className="text-[8px] px-1.5 py-0" />
          )}
        </div>
      </div>

      {/* Metadata Columns */}
      <div className="hidden md:flex items-center gap-6 text-[10px] font-mono shrink-0">
        <div className={`flex items-center gap-1.5 w-32 ${!event.venue_confirmed ? "text-red-500/60" : "text-neutral-500"}`}>
          <MapPin size={10} className="opacity-40" />
          <span className="truncate">{(event as any).venues?.name || '---'}</span>
        </div>
        <div className={`flex items-center gap-1.5 w-24 ${!event.start_time ? "text-red-500/60" : "text-neutral-500"}`}>
          <Calendar size={10} className="opacity-40" />
          <span>{event.start_time ? formatDate(event.start_time) : 'No Date'}</span>
        </div>
        <div className="flex items-center gap-1.5 w-16 text-neutral-500">
          <Clock size={10} className="opacity-40" />
          <span>{event.start_time ? formatTime(event.start_time) : '--:--'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 ml-auto">
        <button
          onClick={onCopy}
          title="Copy"
          className="p-1.5 text-neutral-600 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
        >
          <Copy size={16} />
        </button>
        <button
          onClick={onEdit}
          title="Edit"
          className="p-1.5 text-neutral-600 hover:text-red-600 hover:bg-red-600/10 rounded-lg transition-all"
        >
          <Edit2 size={16} />
        </button>
      </div>
    </div>
  );
}
