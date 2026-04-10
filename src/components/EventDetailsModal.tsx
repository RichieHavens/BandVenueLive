import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, MapPin, Music, Clock, Info, Heart, Share, Navigation as NavigationIcon, Ticket } from 'lucide-react';
import { displayAddress } from '../lib/geo';
import { formatFullDate, formatTime } from '../lib/utils';
import { Button } from './ui/shadcn-button';
import { Badge } from './ui/badge';

interface EventDetailsModalProps {
  event: any | null;
  onClose: () => void;
}

export default function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = React.useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      setIsAtTop(scrollRef.current.scrollTop === 0);
    }
  };

  // Prevent body scroll when open
  useEffect(() => {
    if (event) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [event]);

  if (!event) return null;

  const venueName = event.venues?.name || '';
  const venueAddress = displayAddress(event.venues?.address);
  const bandNames = event.acts?.map((act: any) => act.bands?.name).filter(Boolean).join(' & ');
  
  const genericTitles = ['live music', 'event', 'show', 'concert', 'performance'];
  const titleLower = event.title?.toLowerCase().trim() || '';
  const isGeneric = !event.title || genericTitles.includes(titleLower);
  const displayTitle = isGeneric && bandNames ? bandNames : (event.title || 'Live Music');

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Sheet Content */}
      <motion.div 
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        drag={isAtTop ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.y > 150 || velocity.y > 500) {
            onClose();
          }
        }}
        className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-xl bg-neutral-950 sm:rounded-[2rem] sm:border sm:border-neutral-800 overflow-hidden shadow-2xl relative flex flex-col"
      >
        {/* Mobile Drag Handle Indicator */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-neutral-800 rounded-full z-20 sm:hidden" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div ref={scrollRef} onScroll={handleScroll} className="overflow-y-auto custom-scrollbar flex-1 pb-24 sm:pb-32">
          {/* Hero Area */}
          <div className="w-full h-48 sm:h-64 relative bg-neutral-900 shrink-0">
            {event.hero_url ? (
              <img 
                src={event.hero_url} 
                alt={displayTitle}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-20">
                <Music size={64} className="text-neutral-500" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
          </div>

          {/* Content Body */}
          <div className="px-5 sm:px-8 -mt-12 relative z-10 space-y-8">
            
            {/* Primary Info Block */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {event.event_genres?.map((g: string) => (
                  <Badge key={g} variant="secondary" className="bg-blue-600/10 text-blue-500 border-blue-600/20">
                    {g}
                  </Badge>
                ))}
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{displayTitle}</h2>
              
              {bandNames && displayTitle !== bandNames && (
                <p className="text-lg text-neutral-300 font-medium flex items-center gap-2">
                  <Music size={16} className="text-blue-500 shrink-0" />
                  {bandNames}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-3 text-neutral-300">
                  <Calendar size={16} className="text-blue-500 shrink-0" />
                  <span className="font-medium">{formatFullDate(event.start_time)}</span>
                  <span className="text-neutral-500">•</span>
                  <span>{formatTime(event.start_time)}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-300">
                  <MapPin size={16} className="text-blue-500 shrink-0" />
                  <span className="font-medium">{venueName}</span>
                </div>
              </div>
            </div>

            {/* Actions Row */}
            <div className="flex items-center gap-3 py-4 border-y border-neutral-800/50">
              <Button variant="secondary" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-800">
                <Heart size={16} className="mr-2" /> Save
              </Button>
              <Button variant="secondary" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-800">
                <Share size={16} className="mr-2" /> Share
              </Button>
              <Button variant="secondary" className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-800">
                <NavigationIcon size={16} className="mr-2" /> Map
              </Button>
            </div>

            {/* Secondary Info Block */}
            <div className="space-y-6">
              {event.description && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">About</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}
              
              {(event.bag_policy || event.venues?.bag_policy) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Bag Policy</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {event.bag_policy || event.venues?.bag_policy}
                  </p>
                </div>
              )}
              
              {event.acts && event.acts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Lineup</h3>
                  <div className="space-y-2">
                    {event.acts.map((act: any, index: number) => (
                      <div key={act.id || index} className="flex items-center justify-between py-2 border-b border-neutral-800/50 last:border-0">
                        <div className="font-medium text-neutral-200 text-sm">{act.bands?.name || 'Unknown Band'}</div>
                        <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                          <Clock size={12} />
                          {formatTime(act.start_time)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Bottom Action (Tickets/External) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent pt-12">
          <Button className="w-full h-12 text-base font-bold shadow-lg shadow-blue-600/20">
            <Ticket size={18} className="mr-2" /> Get Tickets
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
