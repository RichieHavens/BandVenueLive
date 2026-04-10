import React from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Calendar, Music, Clock, MapPin, Loader2, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RolePersonalizedHeader from '../components/RolePersonalizedHeader';
import EventDetailsModal from '../components/EventDetailsModal';
import { AppEvent } from '../types';
import { isSimilar, formatFullDate, formatTime, cn } from '../lib/utils';
import { getEventReadiness } from '../components/VenueManagerDashboard';
import { useAuth } from '../AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { Badge } from "../components/ui/badge";

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
    <div className="space-y-6 md:space-y-8 md:pb-20">
      <section className="relative h-[25vh] md:h-[40vh] -mt-6 md:-mt-4 -mx-4 md:-mx-8 lg:-mx-12 mb-6 md:mb-8 overflow-hidden flex items-end p-6 md:p-16 rounded-b-[2rem] md:rounded-b-[3rem]">
        <img 
          src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2070" 
          className="absolute inset-0 w-full h-full object-cover brightness-50"
          alt="Hero"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
        
        <div className="relative z-10 max-w-4xl flex flex-col items-start w-full">
          <p className="text-2xl md:text-5xl font-black uppercase tracking-tighter text-white drop-shadow-2xl leading-none">
            Connecting local fans with <span className="text-blue-500">local bands.</span>
          </p>
        </div>
      </section>

      <RolePersonalizedHeader pageId="events" />

      {/* Filter Bar */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-xl -mx-4 px-4 py-3 border-b border-neutral-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Filters */}
            <div className="flex md:hidden items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={() => setFilter({...filter, date: filter.date === new Date().toISOString().split('T')[0] ? '' : new Date().toISOString().split('T')[0]})}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  filter.date === new Date().toISOString().split('T')[0]
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-neutral-900 text-neutral-400 border border-neutral-800"
                )}
              >
                Today
              </button>
              
              <Sheet>
                <SheetTrigger render={
                  <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap">
                    <SlidersHorizontal size={14} />
                    Filters {(filter.genre || filter.venue || (filter.date && filter.date !== new Date().toISOString().split('T')[0])) && "•"}
                  </button>
                } />
                <SheetContent side="bottom" className="bg-neutral-950 border-neutral-800 rounded-t-3xl h-[85vh] flex flex-col">
                  <SheetHeader className="pb-4 border-b border-neutral-800 shrink-0">
                    <SheetTitle className="text-white text-lg font-black uppercase tracking-widest">Filters</SheetTitle>
                  </SheetHeader>
                  <div className="py-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                        <Input 
                          placeholder="Venue or band..."
                          className="pl-10 h-12 bg-neutral-900 border-neutral-800 rounded-xl"
                          value={filter.venue}
                          onChange={(e) => setFilter({...filter, venue: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Genre</label>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => setFilter({...filter, genre: ''})}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                            !filter.genre ? "bg-blue-600 text-white" : "bg-neutral-900 text-neutral-400 border border-neutral-800"
                          )}
                        >
                          All
                        </button>
                        {availableGenres.map(g => (
                          <button 
                            key={g as string}
                            onClick={() => setFilter({...filter, genre: g as string})}
                            className={cn(
                              "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                              filter.genre === g ? "bg-blue-600 text-white" : "bg-neutral-900 text-neutral-400 border border-neutral-800"
                            )}
                          >
                            {g as string}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                        <input 
                          type="date" 
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 h-12 text-white outline-none focus:ring-2 focus:ring-blue-600"
                          value={filter.date}
                          onChange={(e) => setFilter({...filter, date: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 pb-8 border-t border-neutral-800 flex gap-3 shrink-0 bg-neutral-950">
                    <Button 
                      className="flex-1 h-12 bg-neutral-900 text-white hover:bg-neutral-800"
                      onClick={() => {
                        setFilter({ genre: '', date: '', venue: '' });
                      }}
                      variant="secondary"
                    >
                      Reset
                    </Button>
                    <SheetTrigger render={
                      <Button className="flex-1 h-12">Apply</Button>
                    } />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex flex-wrap gap-4 items-center">
              <Button 
                variant={filter.date === new Date().toISOString().split('T')[0] ? 'primary' : 'secondary'}
                onClick={() => setFilter({...filter, date: new Date().toISOString().split('T')[0]})}
                size="sm"
              >
                Today
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <Input 
                  placeholder="Search venue or band..."
                  className="pl-10 w-64 h-10 bg-neutral-900 border-neutral-800"
                  value={filter.venue}
                  onChange={(e) => setFilter({...filter, venue: e.target.value})}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                />
                {isSearchFocused && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50">
                    {searchSuggestions.map(suggestion => (
                      <button
                        key={suggestion}
                        className="w-full text-left px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors border-b border-neutral-800/50 last:border-0"
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
              <div className="w-px h-6 bg-neutral-800 mx-2" />
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <select 
                  className="bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 h-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-white"
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
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={14} />
                <input 
                  type="date" 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  value={filter.date}
                  onChange={(e) => setFilter({...filter, date: e.target.value})}
                  onClick={(e) => (e.target as any).showPicker?.()}
                />
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 h-10 text-sm text-neutral-300 min-w-[140px] flex items-center">
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
                  className="text-[10px] font-black uppercase tracking-widest h-10"
                >
                  Show All Upcoming
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest hidden lg:block">{filteredEvents.length} Events</p>
            </div>
          </div>

          {/* Active Filters Row (Mobile & Desktop) */}
          <AnimatePresence>
            {(filter.genre || filter.venue || filter.date) && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center pt-2 border-t border-neutral-800/50"
              >
                <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 shrink-0 mr-1">Active:</span>
                  {filter.date && (
                    <Badge variant="secondary" className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700 shrink-0 cursor-pointer py-1" onClick={() => setFilter({...filter, date: ''})}>
                      {filter.date} <X size={10} className="ml-1 opacity-50" />
                    </Badge>
                  )}
                  {filter.genre && (
                    <Badge variant="secondary" className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700 shrink-0 cursor-pointer py-1" onClick={() => setFilter({...filter, genre: ''})}>
                      {filter.genre} <X size={10} className="ml-1 opacity-50" />
                    </Badge>
                  )}
                  {filter.venue && (
                    <Badge variant="secondary" className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700 shrink-0 cursor-pointer py-1" onClick={() => setFilter({...filter, venue: ''})}>
                      "{filter.venue}" <X size={10} className="ml-1 opacity-50" />
                    </Badge>
                  )}
                </div>
                <button onClick={() => setFilter({genre: '', venue: '', date: ''})} className="text-[10px] font-bold text-blue-600 hover:text-blue-500 shrink-0 pl-3 border-l border-neutral-800 h-6 flex items-center">Clear All</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">No events found for the selected filters.</div>
      ) : (
        <div className="space-y-6 md:space-y-10">
          {Object.entries(groupedEvents).map(([date, dateEvents]: [string, any]) => (
            <div key={date} className="space-y-3 md:space-y-4">
              <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-800/50 pb-2 px-1">{date}</h2>
              <div className="grid grid-cols-1 gap-2 md:gap-3">
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedEvent(event)}
                      className="flex items-center gap-3 p-2.5 md:p-3 rounded-xl bg-neutral-900/20 border border-neutral-800/30 active:bg-neutral-800/40 md:hover:bg-neutral-800/40 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800 border border-neutral-700/30 flex items-center justify-center">
                        {event.hero_url ? (
                          <img 
                            src={event.hero_url} 
                            alt={event.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Music size={16} className="text-neutral-600" />
                        )}
                      </div>
                      <div className="flex-grow min-w-0 flex flex-col justify-center">
                        <h3 className="text-[15px] md:text-base font-bold truncate text-neutral-100 leading-snug">{displayTitle}</h3>
                        {showBandSubtitle && (
                          <p className="text-[13px] text-neutral-400 truncate leading-snug">
                            {bandNames}
                          </p>
                        )}
                        <p className="text-[11px] text-neutral-500 truncate leading-snug mt-0.5">
                          {venueName} <span className="mx-1 opacity-50">•</span> {formatTime(event.start_time)}
                        </p>
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
