import React from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Calendar, Music, Clock, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RolePersonalizedHeader from '../components/RolePersonalizedHeader';
import EventDetailsModal from '../components/EventDetailsModal';
import { AppEvent } from '../types';
import { isSimilar, formatFullDate, formatTime } from '../lib/utils';
import { getEventReadiness } from '../components/VenueManagerDashboard';
import { useAuth } from '../AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function EventsView() {
  const { activeRole } = useAuth();
  const [events, setEvents] = React.useState<AppEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedEvent, setSelectedEvent] = React.useState<AppEvent | null>(null);
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [filter, setFilter] = React.useState({ 
    genre: '', 
    date: '', // Default to showing all upcoming events
    venue: '' 
  });

  React.useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const { data } = await supabase
        .from('events')
        .select('*, venues(name, address), acts(*, bands(name)), event_genres(genres(name))')
        .eq('is_published', true);
      
      if (data) {
        // Flatten acts to get start_time if needed, and flatten genres
        const processedEvents = data.map(event => ({
          ...event,
          start_time: event.start_time || event.acts?.[0]?.start_time || event.created_at,
          event_genres: (event as any).event_genres?.map((eg: any) => eg.genres?.name).filter(Boolean) || []
        })).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        
        setEvents(processedEvents);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }

  const eventsMatchingSearchAndDate = events.filter(event => {
    // Hide past events by default unless a specific past date is selected
    const todayStr = new Date().toISOString().split('T')[0];
    const eventDateStr = event.start_time ? new Date(event.start_time).toISOString().split('T')[0] : '';
    
    if (!filter.date && eventDateStr && eventDateStr < todayStr) {
      return false;
    }

    const searchTerm = filter.venue.toLowerCase();
    const bandNames = event.acts?.map((act: any) => act.bands?.name).filter(Boolean).join(' ').toLowerCase() || '';
    const matchesSearch = !filter.venue || 
      event.venues?.name.toLowerCase().includes(searchTerm) || 
      bandNames.includes(searchTerm) ||
      event.title?.toLowerCase().includes(searchTerm);
    
    // Robust date comparison using YYYY-MM-DD strings
    const eventDate = new Date(event.start_time).toISOString().split('T')[0];
    const matchesDate = !filter.date || eventDate === filter.date;
    
    return matchesSearch && matchesDate;
  });

  const allSearchableNames = React.useMemo(() => {
    const names = new Set<string>();
    events.forEach(e => {
      if (e.venues?.name) names.add(e.venues.name);
      e.acts?.forEach((act: any) => {
        if (act.bands?.name) names.add(act.bands.name);
      });
    });
    return Array.from(names);
  }, [events]);

  const searchSuggestions = React.useMemo(() => {
    if (!filter.venue.trim()) return [];
    const lowerQuery = filter.venue.toLowerCase();
    return allSearchableNames
      .filter(name => name.toLowerCase().includes(lowerQuery) && name.toLowerCase() !== lowerQuery)
      .slice(0, 5);
  }, [filter.venue, allSearchableNames]);

  const availableGenres = Array.from(new Set(eventsMatchingSearchAndDate.flatMap(e => e.event_genres || []))).sort();

  const filteredEvents = eventsMatchingSearchAndDate.filter(event => {
    return !filter.genre || event.event_genres?.includes(filter.genre);
  });

  const groupedEvents = filteredEvents.reduce((groups: any, event) => {
    const date = formatFullDate(event.start_time);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {});

  return (
    <div className="space-y-12 pb-20">
      <section className="relative h-[60vh] -mt-6 md:-mt-4 -mx-4 md:-mx-8 lg:-mx-12 mb-12 overflow-hidden flex items-end p-8 md:p-16 rounded-b-[3rem]">
        <img 
          src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2070" 
          className="absolute inset-0 w-full h-full object-cover brightness-50"
          alt="Hero"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        
        <div className="relative z-10 max-w-4xl flex flex-col items-start w-full">
          <p className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white drop-shadow-2xl">
            Connecting local fans with <span className="text-cyan-400">local bands.</span>
          </p>
        </div>
      </section>

      <RolePersonalizedHeader pageId="events" />

      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl -mx-4 px-4 py-4 border-b border-neutral-800 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <Button 
            variant={filter.date === new Date().toISOString().split('T')[0] ? 'primary' : 'secondary'}
            onClick={() => setFilter({...filter, date: new Date().toISOString().split('T')[0]})}
          >
            Today
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <Input 
              placeholder="Search venue or band..."
              className="pl-10 w-full md:w-64"
              value={filter.venue}
              onChange={(e) => setFilter({...filter, venue: e.target.value})}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
            {isSearchFocused && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden z-50">
                {searchSuggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                    onClick={() => {
                      setFilter({...filter, venue: suggestion});
                      setIsSearchFocused(false);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-6 bg-neutral-800 mx-2 hidden md:block" />
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <select 
              className="bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400 appearance-none text-white"
              value={filter.genre}
              onChange={(e) => setFilter({...filter, genre: e.target.value})}
            >
              <option value="">All Genres</option>
              {availableGenres.map(g => (
                <option key={g as string} value={g as string}>{g as string}</option>
              ))}
            </select>
          </div>
          <div className="relative group">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none" size={14} />
            <input 
              type="date" 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              value={filter.date}
              onChange={(e) => setFilter({...filter, date: e.target.value})}
              onClick={(e) => (e.target as any).showPicker?.()}
            />
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-300 min-w-[140px] h-[38px] flex items-center">
              {filter.date ? (() => {
                const [y, m, d] = filter.date.split('-');
                return `${m}/${d}/${y}`;
              })() : 'mm/dd/yyyy'}
            </div>
          </div>
          {filter.date && (
            <Button 
              variant="ghost"
              onClick={() => setFilter({...filter, date: ''})}
              className="text-xs font-bold uppercase tracking-widest"
            >
              Show All Upcoming
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <p className="text-neutral-400 text-sm font-medium hidden sm:block">{filteredEvents.length} Events Found</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-400" size={48} /></div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">No events found for the selected filters.</div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedEvents).map(([date, dateEvents]: [string, any]) => (
            <div key={date} className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-widest text-cyan-400 border-b border-neutral-800 pb-2">{date}</h2>
              <div className="space-y-4">
                {dateEvents.map((event: any) => {
                  const genericTitles = ['live music', 'event', 'show', 'concert', 'performance'];
                  const titleLower = event.title?.toLowerCase().trim() || '';
                  const venueName = event.venues?.name || '';
                  const isGeneric = !event.title || genericTitles.includes(titleLower) || isSimilar(event.title || '', venueName);
                  const bandNames = event.acts?.map((act: any) => act.bands?.name).filter(Boolean).join(' & ');
                  const displayTitle = isGeneric && bandNames ? bandNames : (event.title || 'Live Music');
                  const showBandSubtitle = bandNames && displayTitle !== bandNames;

                  return (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-6 p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 transition-all group"
                    >
                      <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                        <img 
                          src={event.hero_url || `https://picsum.photos/seed/event${event.id}/200/200`} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {event.event_genres?.map((g: string) => (
                            <span key={g} className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/70">{g}</span>
                          ))}
                          {(activeRole === 'venue_manager' || activeRole === 'admin') && (
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${getEventReadiness(event).bgClass} ${getEventReadiness(event).colorClass}`}>
                              {getEventReadiness(event).status}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold truncate text-white">{displayTitle}</h3>
                        {showBandSubtitle && (
                          <p className="text-sm text-neutral-400 truncate flex items-center gap-1">
                            <Music size={12} className="text-cyan-400" />
                            {bandNames}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-400">
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="text-cyan-400" />
                            {formatTime(event.start_time)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-cyan-400" />
                            {venueName}
                          </div>
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <Button 
                          variant="secondary"
                          onClick={() => setSelectedEvent(event)}
                          className="text-xs"
                        >
                          Details
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
          <AnimatePresence>
            {selectedEvent && (
              <EventDetailsModal 
                event={selectedEvent} 
                onClose={() => setSelectedEvent(null)} 
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
