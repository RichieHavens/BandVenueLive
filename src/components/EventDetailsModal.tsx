import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, MapPin, Music, Clock, Info } from 'lucide-react';
import { displayAddress } from '../lib/geo';
import { formatFullDate, formatTime } from '../lib/utils';

interface EventDetailsModalProps {
  event: any | null;
  onClose: () => void;
}

export default function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  if (!event) return null;

  const venueName = event.venues?.name || '';
  const venueAddress = displayAddress(event.venues?.address);
  const bandNames = event.acts?.map((act: any) => act.bands?.name).filter(Boolean).join(' & ');
  
  const genericTitles = ['live music', 'event', 'show', 'concert', 'performance'];
  const titleLower = event.title?.toLowerCase().trim() || '';
  const isGeneric = !event.title || genericTitles.includes(titleLower);
  const displayTitle = isGeneric && bandNames ? bandNames : (event.title || 'Live Music');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-[2rem] overflow-hidden shadow-2xl relative my-auto"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-full h-64 sm:h-80 relative">
          <img 
            src={event.hero_url || `https://picsum.photos/seed/event${event.id}/800/600`} 
            alt={displayTitle}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {event.event_genres?.map((g: string) => (
                <span key={g} className="px-3 py-1 bg-cyan-400/20 text-cyan-400 text-xs font-bold uppercase tracking-widest rounded-full backdrop-blur-md border border-cyan-400/20">
                  {g}
                </span>
              ))}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2">{displayTitle}</h2>
            {bandNames && displayTitle !== bandNames && (
              <p className="text-xl text-neutral-300 font-medium flex items-center gap-2">
                <Music size={20} className="text-cyan-400" />
                {bandNames}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center shrink-0">
                <Calendar className="text-cyan-400" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1">Date & Time</p>
                <p className="text-white font-medium">
                  {formatFullDate(event.start_time)}
                </p>
                <p className="text-neutral-400 text-sm mt-0.5">
                  {formatTime(event.start_time)}
                  {event.end_time && ` - ${formatTime(event.end_time)}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center shrink-0">
                <MapPin className="text-cyan-400" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-1">Venue</p>
                <p className="text-white font-medium">{venueName}</p>
                {venueAddress && (
                  <p className="text-neutral-400 text-sm mt-0.5">{venueAddress}</p>
                )}
              </div>
            </div>
          </div>

          {event.description && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Info className="text-cyan-400" size={20} />
                <h3 className="text-lg font-bold text-white">About this event</h3>
              </div>
              <div className="text-neutral-300 leading-relaxed whitespace-pre-wrap bg-neutral-800/50 p-6 rounded-2xl border border-neutral-800">
                {event.description}
              </div>
            </div>
          )}
          
          {(event.bag_policy || event.venues?.bag_policy) && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Info className="text-cyan-400" size={20} />
                <h3 className="text-lg font-bold text-white">Bag Policy</h3>
              </div>
              <div className="text-neutral-300 leading-relaxed whitespace-pre-wrap bg-neutral-800/50 p-6 rounded-2xl border border-neutral-800">
                {event.bag_policy || event.venues?.bag_policy}
              </div>
            </div>
          )}
          
          {event.acts && event.acts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Music className="text-cyan-400" size={20} />
                <h3 className="text-lg font-bold text-white">Lineup</h3>
              </div>
              <div className="space-y-3">
                {event.acts.map((act: any, index: number) => (
                  <div key={act.id || index} className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-2xl border border-neutral-800">
                    <div className="font-medium text-white">{act.bands?.name || 'Unknown Band'}</div>
                    <div className="text-sm text-neutral-400 flex items-center gap-2">
                      <Clock size={14} />
                      {formatTime(act.start_time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
