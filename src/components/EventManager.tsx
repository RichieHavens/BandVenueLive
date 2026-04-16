import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNavigationContext } from '../context/NavigationContext';
import { AppEvent, Act, Band, Venue } from '../types';
import { Plus, Calendar, Clock, MapPin, Music, Trash2, Check, X, Loader2, AlertCircle, Edit2, Copy, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EventEditor from './EventEditor';
import { formatDate, formatTime } from '../lib/utils';
import { EventCard } from './ui/EventCard';
import { Button } from './ui/Button';
import { isActionRequired, isUnconfirmedAct, isOpenSlot, isConfirmedEvent } from '../lib/eventFilters';

interface EventManagerProps {
  bandId?: string;
  venueId?: string;
  initialAttentionFilter?: string;
  initialEntityFilter?: string;
}

export default function EventManager({ bandId, venueId, initialAttentionFilter = 'all', initialEntityFilter = 'all' }: EventManagerProps = {}) {
  const { user, profile } = useAuth();
  const { setEventFilter } = useNavigationContext();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | undefined>(undefined);
  const [editorIntent, setEditorIntent] = useState<string | undefined>(undefined);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [attentionFilter, setAttentionFilter] = useState<string>(initialAttentionFilter);
  const [entityFilter, setEntityFilter] = useState<string>(initialEntityFilter);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    setEventFilter(null);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchEvents();
    }
  }, [user?.id, bandId, venueId]);

  async function fetchEvents() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (bandId) {
        query = query.eq('acts.band_id', bandId);
      }

      if (venueId) {
        query = query.eq('venue_id', venueId);
      }

      // If no specific filter, check if user is venue manager
      if (!bandId && !venueId) {
        const { data: myVenues } = await supabase.from('venues').select('id').eq('manager_id', user?.id);
        if (myVenues && myVenues.length > 0) {
          query = query.in('venue_id', myVenues.map(v => v.id));
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const processedEvents = (data || []).map((event: any) => ({
        ...event,
        event_genres: Array.from(new Set(event.event_genres?.map((eg: any) => eg.genres?.name).filter(Boolean))) || []
      })) as AppEvent[];
      
      setEvents(processedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = events.filter(event => {
    // Past events filter
    if (!showPastEvents && event.start_time && new Date(event.start_time) < new Date(new Date().setHours(0, 0, 0, 0))) {
      return false;
    }

    // Attention filter
    if (attentionFilter !== 'all') {
      if (attentionFilter === 'needs_attention' && !isActionRequired(event)) return false;
      if (attentionFilter === 'open_slots' && !isOpenSlot(event)) return false;
      if (attentionFilter === 'unconfirmed_acts' && !isUnconfirmedAct(event)) return false;
      if (attentionFilter === 'confirmed_events' && !isConfirmedEvent(event)) return false;
      if (attentionFilter === 'unpublished' && event.is_published) return false;
      if (attentionFilter === 'unconfirmed_venue' && event.venue_confirmed) return false;
      if (attentionFilter === 'missing_date' && event.start_time) return false;
    }

    // Entity filter (Venue or Band)
    if (entityFilter !== 'all') {
      const [type, id] = entityFilter.split(':');
      if (type === 'venue') {
        if (event.venue_id !== id) return false;
      } else if (type === 'band') {
        const hasBand = (event as any).acts?.some((act: any) => act.band_id === id);
        if (!hasBand) return false;
      }
    }

    return true;
  });

  // Extract unique venues and bands for filters
  const uniqueVenues = (Array.from(new Map(
    events.map(e => e.venues).filter(Boolean).map(v => [v!.id, v!])
  ).values()) as any[]).sort((a, b) => a.name.localeCompare(b.name));

  const uniqueBands = (Array.from(new Map(
    events.flatMap(e => (e as any).acts || []).filter(a => a.bands).map(a => [a.band_id, { id: a.band_id, name: a.bands.name }])
  ).values()) as any[]).sort((a, b) => a.name.localeCompare(b.name));

  const handleCopyAsNew = (event: AppEvent) => {
    const { id, created_at, updated_at, updated_by_id, ...rest } = event as any;
    const copiedEvent = {
      ...rest,
      start_time: undefined,
      end_time: undefined,
      is_published: false,
      venue_confirmed: false,
      band_confirmed: false
    } as any;
    
    setSelectedEvent(copiedEvent);
    setIsCopying(true);
    setShowEditor(true);
  };

  const getFilterLabel = () => {
    if (attentionFilter === 'needs_attention') return 'Attention Required';
    if (attentionFilter === 'open_slots') return 'Open Slots';
    if (attentionFilter === 'unconfirmed_acts') return 'Unconfirmed Acts';
    if (attentionFilter === 'confirmed_events') return 'Confirmed Events';
    if (attentionFilter === 'unpublished') return 'Unpublished';
    if (attentionFilter === 'unconfirmed_venue') return 'Unconfirmed Venue';
    if (attentionFilter === 'missing_date') return 'Missing Date';
    if (entityFilter !== 'all') return 'Filtered by Entity';
    return 'Filtered View';
  };

  const clearFilters = () => {
    setAttentionFilter('all');
    setEntityFilter('all');
  };

  return (
    <div className="space-y-8">
      {(attentionFilter !== 'all' || entityFilter !== 'all') && (
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-neutral-400">
          <span>Showing: <span className="font-bold text-white">{getFilterLabel()}</span></span>
          <button onClick={clearFilters} className="text-primary hover:text-primary/80 font-bold ml-2">Clear</button>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-4xl font-bold tracking-tight">Event Management</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Attention Filter */}
          <select
            value={attentionFilter}
            onChange={(e) => setAttentionFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest text-foreground outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Events</option>
            <option value="needs_attention">Needs Attention</option>
            <option value="open_slots">Open Slots</option>
            <option value="unconfirmed_acts">Unconfirmed Acts</option>
            <option value="confirmed_events">Confirmed Events</option>
            <option value="unpublished">Unpublished</option>
            <option value="unconfirmed_venue">Unconfirmed Venue</option>
            <option value="missing_date">Missing Date</option>
          </select>

          {/* Venue/Band Filter */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest text-foreground outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Entities</option>
            {uniqueVenues.length > 0 && (
              <optgroup label="Venues">
                {uniqueVenues.map((v, index) => (
                  <option key={`venue-${v.id || index}`} value={`venue:${v.id}`}>{v.name}</option>
                ))}
              </optgroup>
            )}
            {uniqueBands.length > 0 && (
              <optgroup label="Bands">
                {uniqueBands.map((b, index) => (
                  <option key={`band-${b.id || index}`} value={`band:${b.id}`}>{b.name}</option>
                ))}
              </optgroup>
            )}
          </select>

          <Button 
            variant={showPastEvents ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowPastEvents(!showPastEvents)}
          >
            {showPastEvents ? 'Showing Past' : 'Hide Past'}
          </Button>
        </div>
        <Button 
          variant="primary"
          onClick={() => {
            setSelectedEvent(undefined);
            setIsCopying(false);
            setShowEditor(true);
          }}
        >
          <Plus size={20} className="mr-2" />
          New Event
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-neutral-400" size={48} /></div>
      ) : (
        <div className="space-y-px">
          {filteredEvents.map((event, index) => {
            return (
              <EventCard 
                key={`event-${event.id || index}`}
                event={event}
                onCopy={() => handleCopyAsNew(event)}
                onEdit={(intent) => {
                  setSelectedEvent(event);
                  setIsCopying(false);
                  setEditorIntent(intent);
                  setShowEditor(true);
                }}
              />
            );
          })}
          {filteredEvents.length === 0 && (
            <div className="text-center py-20 bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-800">
              <Calendar className="mx-auto text-neutral-500 mb-4" size={48} />
              <p className="text-neutral-400">No events found matching your criteria.</p>
            </div>
          )}
        </div>
      )}

      {showEditor && (
        <EventEditor 
          event={selectedEvent} 
          isCopying={isCopying}
          intent={editorIntent}
          onClose={() => setShowEditor(false)} 
          onSave={fetchEvents} 
        />
      )}
    </div>
  );
}
