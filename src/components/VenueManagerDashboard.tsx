import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Venue, AppEvent } from '../types';
import { 
  AlertCircle, Calendar, Music, CheckCircle, Image as ImageIcon, 
  Copy, Loader2, MapPin, ChevronRight, Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { displayAddress } from '../lib/geo';
import { Card } from './ui/Card';
import { StatusBadge, EventStatus } from './ui/StatusBadge';
import { Button } from './ui/Button';
import { SectionHeader } from './ui/SectionHeader';

export function getEventReadiness(event: AppEvent): { status: string, colorClass: string, bgClass: string } {
  if (event.is_canceled) return { status: 'Canceled', colorClass: 'text-red-500', bgClass: 'bg-red-500/10 border-red-500/20' };
  if (event.is_published) return { status: 'Published', colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10 border-blue-500/20' };

  const hasBand = event.acts && event.acts.length > 0 && event.acts.some((a: any) => a.band_id);
  
  let missingCount = 0;
  if (!hasBand) missingCount++;
  if (hasBand && !event.band_confirmed) missingCount++;
  if (!event.venue_confirmed) missingCount++;
  if (!event.hero_url) missingCount++;

  if (missingCount === 0) return { status: 'Ready', colorClass: 'text-green-500', bgClass: 'bg-green-500/10 border-green-500/20' };
  if (missingCount === 1) return { status: 'Almost Ready', colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10 border-amber-500/20' };
  if (!hasBand) return { status: 'Draft', colorClass: 'text-neutral-400', bgClass: 'bg-neutral-800 border-neutral-700' };
  if (!event.band_confirmed) return { status: 'Needs Band Confirmation', colorClass: 'text-orange-500', bgClass: 'bg-orange-500/10 border-orange-500/20' };
  if (!event.hero_url) return { status: 'Needs Promo Assets', colorClass: 'text-purple-500', bgClass: 'bg-purple-500/10 border-purple-500/20' };
  
  return { status: 'Draft', colorClass: 'text-neutral-400', bgClass: 'bg-neutral-800 border-neutral-700' };
}

interface VenueManagerDashboardProps {
  venues: Venue[];
  onNavigate: (tab: string, venueId?: string) => void;
}

export default function VenueManagerDashboard({ venues, onNavigate }: VenueManagerDashboardProps) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      if (venues.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const venueIds = venues.map(v => v.id);
        const { data, error } = await supabase
          .from('events')
          .select('*, acts(*, bands(name))')
          .in('venue_id', venueIds);

        if (error) throw error;
        
        if (data) {
          const processedEvents = data.map(event => ({
            ...event,
            start_time: event.start_time || event.acts?.[0]?.start_time || event.created_at,
          }));
          setEvents(processedEvents);
        }
      } catch (err) {
        console.error('Error fetching events for dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [venues]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
        <MapPin className="mx-auto text-neutral-700 mb-4" size={48} />
        <h3 className="text-xl font-bold mb-2">No Venues Found</h3>
        <p className="text-neutral-400 mb-6">You are not currently managing any venues.</p>
      </div>
    );
  }

  const now = new Date();

  // Metrics Logic
  const upcomingEvents = events.filter(e => new Date(e.start_time) >= now);
  const pastEvents = events.filter(e => new Date(e.start_time) < now);
  
  const confirmedEvents = upcomingEvents.filter(e => e.venue_confirmed && e.band_confirmed && e.hero_url);
  const openSlots = upcomingEvents.filter(e => !e.acts || e.acts.length === 0 || !e.acts.some((a: any) => a.band_id));
  
  const almostReadyEvents = upcomingEvents.filter(e => {
    const hasBand = e.acts && e.acts.length > 0 && e.acts.some((a: any) => a.band_id);
    let missingCount = 0;
    if (!hasBand) missingCount++;
    if (hasBand && !e.band_confirmed) missingCount++;
    if (!e.venue_confirmed) missingCount++;
    if (!e.hero_url) missingCount++;
    return missingCount === 1 && !e.is_published;
  });

  const actionRequiredYou = upcomingEvents.filter(e => {
    const hasBand = e.acts && e.acts.length > 0 && e.acts.some((a: any) => a.band_id);
    let missingCount = 0;
    if (!hasBand) missingCount++;
    if (hasBand && !e.band_confirmed) missingCount++;
    if (!e.venue_confirmed) missingCount++;
    if (!e.hero_url) missingCount++;
    
    // If it's almost ready, we don't count it as a general "Action Required" to avoid double counting in the top cards
    if (missingCount === 1 && !e.is_published) return false;
    
    const noBand = !hasBand;
    const missingPromo = !e.hero_url;
    const needsVenueConfirm = !e.venue_confirmed;
    return noBand || missingPromo || needsVenueConfirm;
  });

  const waitingOnOthers = upcomingEvents.filter(e => {
    const hasBand = e.acts && e.acts.length > 0 && e.acts.some((a: any) => a.band_id);
    let missingCount = 0;
    if (!hasBand) missingCount++;
    if (hasBand && !e.band_confirmed) missingCount++;
    if (!e.venue_confirmed) missingCount++;
    if (!e.hero_url) missingCount++;
    
    if (missingCount === 1 && !e.is_published) return false;

    return hasBand && !e.band_confirmed;
  });

  // Generate Priority Action Items
  type ActionItem = {
    id: string;
    eventId: string;
    venueId: string;
    eventTitle: string;
    eventDate: string;
    daysUntil: number;
    type: 'open_slot' | 'waiting_band' | 'missing_promo' | 'unconfirmed_venue';
    description: string;
    owner: string;
    actionText: string;
    urgency: number; // 3 = High, 2 = Medium, 1 = Low
    dateObj: Date;
    status: string;
  };

  const actionItems: ActionItem[] = [];

  upcomingEvents.forEach(e => {
    const dateObj = new Date(e.start_time);
    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const daysUntil = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const hasBand = e.acts && e.acts.length > 0 && e.acts.some((a: any) => a.band_id);
    const bandName = hasBand ? e.acts.find((a: any) => a.band_id)?.bands?.name : null;

    // Determine Readiness Status
    let status = 'Draft';
    let missingCount = 0;
    if (!hasBand) missingCount++;
    if (hasBand && !e.band_confirmed) missingCount++;
    if (!e.venue_confirmed) missingCount++;
    if (!e.hero_url) missingCount++;

    if (e.is_published) status = 'Published';
    else if (missingCount === 0) status = 'Ready';
    else if (missingCount === 1) status = 'Almost Ready';
    else if (!e.band_confirmed && hasBand) status = 'Needs Band Confirmation';
    else if (!e.hero_url) status = 'Needs Promo Assets';

    // Only push the MOST urgent blocker for an event to avoid duplicates in the inbox
    if (!hasBand) {
      actionItems.push({
        id: `${e.id}-open`,
        eventId: e.id,
        venueId: e.venue_id,
        eventTitle: e.title,
        eventDate: dateStr,
        daysUntil,
        type: 'open_slot',
        description: 'No band booked for this slot',
        owner: 'You',
        actionText: 'Assign Band',
        urgency: daysUntil < 14 ? 3 : 2,
        dateObj,
        status
      });
    } else if (!e.venue_confirmed) {
      actionItems.push({
        id: `${e.id}-venue`,
        eventId: e.id,
        venueId: e.venue_id,
        eventTitle: e.title,
        eventDate: dateStr,
        daysUntil,
        type: 'unconfirmed_venue',
        description: 'Venue confirmation required',
        owner: 'You',
        actionText: 'Confirm Event',
        urgency: daysUntil < 7 ? 3 : 2,
        dateObj,
        status
      });
    } else if (!e.band_confirmed) {
      actionItems.push({
        id: `${e.id}-band`,
        eventId: e.id,
        venueId: e.venue_id,
        eventTitle: e.title,
        eventDate: dateStr,
        daysUntil,
        type: 'waiting_band',
        description: 'Waiting for band to confirm',
        owner: bandName || 'Band',
        actionText: 'Remind Band',
        urgency: daysUntil < 7 ? 3 : 2,
        dateObj,
        status
      });
    } else if (!e.hero_url) {
      actionItems.push({
        id: `${e.id}-promo`,
        eventId: e.id,
        venueId: e.venue_id,
        eventTitle: e.title,
        eventDate: dateStr,
        daysUntil,
        type: 'missing_promo',
        description: 'Missing promotional image',
        owner: 'You',
        actionText: 'Upload Promo',
        urgency: daysUntil < 14 ? 2 : 1,
        dateObj,
        status
      });
    }
  });

  // Sort action items: Highest urgency first, then closest date
  actionItems.sort((a, b) => {
    if (a.urgency !== b.urgency) {
      return b.urgency - a.urgency;
    }
    return a.dateObj.getTime() - b.dateObj.getTime();
  });

  const isMultiVenue = venues.length > 1;

  const renderSummaryCard = (
    title: string, 
    count: number, 
    icon: React.ReactNode, 
    colorClass: string, 
    bgClass: string,
    onClick: () => void
  ) => (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${bgClass} border border-neutral-800 rounded-3xl p-6 cursor-pointer transition-all group relative overflow-hidden`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10`}>
          {icon}
        </div>
        <span className="text-3xl font-black">{count}</span>
      </div>
      <h3 className="font-bold text-neutral-200 group-hover:text-white transition-colors pr-6">{title}</h3>
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={20} className="text-neutral-400" />
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {renderSummaryCard(
          "Action Required (You)", 
          actionRequiredYou.length, 
          <AlertCircle size={24} className="text-red-500" />, 
          "text-red-500 bg-red-500", 
          "bg-red-950/20 hover:bg-red-900/30 border-red-900/50",
          () => onNavigate('events')
        )}
        {renderSummaryCard(
          "Almost Ready", 
          almostReadyEvents.length, 
          <CheckCircle size={24} className="text-amber-500" />, 
          "text-amber-500 bg-amber-500", 
          "bg-amber-950/20 hover:bg-amber-900/30 border-amber-900/50",
          () => onNavigate('events')
        )}
        {renderSummaryCard(
          "Waiting on Others", 
          waitingOnOthers.length, 
          <Clock size={24} className="text-orange-500" />, 
          "text-orange-500 bg-orange-500", 
          "bg-neutral-900 hover:bg-neutral-800",
          () => onNavigate('events')
        )}
        {renderSummaryCard(
          "Confirmed & Ready", 
          confirmedEvents.length, 
          <CheckCircle size={24} className="text-green-500" />, 
          "text-green-500 bg-green-500", 
          "bg-neutral-900 hover:bg-neutral-800",
          () => onNavigate('events')
        )}
        {renderSummaryCard(
          "Total Upcoming", 
          upcomingEvents.length, 
          <Calendar size={24} className="text-blue-500" />, 
          "text-blue-500 bg-blue-500", 
          "bg-neutral-900 hover:bg-neutral-800",
          () => onNavigate('events')
        )}
      </div>

      {/* Priority Action Center */}
      {actionItems.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <AlertCircle className="text-red-500" />
            Priority Action Center
          </h3>
          <div className="space-y-3">
            {actionItems.slice(0, 5).map(item => (
              <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-neutral-950 rounded-2xl border border-neutral-800/50 gap-4 group hover:border-neutral-700 transition-all">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-2 rounded-xl mt-1 shrink-0 ${
                    item.urgency === 3 ? 'bg-red-500/10 text-red-500' : 
                    item.urgency === 2 ? 'bg-orange-500/10 text-orange-500' : 
                    'bg-purple-500/10 text-purple-500'
                  }`}>
                    {item.type === 'open_slot' && <Music size={20} />}
                    {item.type === 'waiting_band' && <Clock size={20} />}
                    {item.type === 'unconfirmed_venue' && <CheckCircle size={20} />}
                    {item.type === 'missing_promo' && <ImageIcon size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-bold text-base truncate">{item.eventTitle}</h4>
                      <StatusBadge status={item.status as EventStatus} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {item.eventDate} ({item.daysUntil} days)</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1">
                        Blocker: <span className="text-neutral-200 font-medium">{item.description}</span>
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1">
                        Owner: <span className={item.owner === 'You' ? 'text-red-400 font-bold' : 'text-orange-400 font-bold'}>{item.owner}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate('events', item.venueId)}
                  className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                    item.owner === 'You' 
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20' 
                      : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                  }`}
                >
                  {item.actionText}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Venue Summary Section */}
      {isMultiVenue && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold px-2">Venue Health</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {venues.map(venue => {
              const venueEvents = upcomingEvents.filter(e => e.venue_id === venue.id);
              const venueActionYou = actionRequiredYou.filter(e => e.venue_id === venue.id);
              const venueWaiting = waitingOnOthers.filter(e => e.venue_id === venue.id);
              const venueOpen = openSlots.filter(e => e.venue_id === venue.id);
              const venueConfirmed = confirmedEvents.filter(e => e.venue_id === venue.id);
              
              // Sort to find next event
              const sortedVenueEvents = [...venueEvents].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
              const nextEvent = sortedVenueEvents[0];

              return (
                <Card key={venue.id} padding="md">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-bold text-lg">{venue.name}</h4>
                      <p className="text-neutral-400 text-sm flex items-center gap-1">
                        <MapPin size={12} />
                        {displayAddress(venue.address)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onNavigate('events', venue.id)}>
                      Manage <ChevronRight size={14} />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    <div className="text-center p-2 bg-neutral-950 rounded-xl">
                      <div className="text-xl font-bold text-red-500">{venueActionYou.length}</div>
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">Action</div>
                    </div>
                    <div className="text-center p-2 bg-neutral-950 rounded-xl">
                      <div className="text-xl font-bold text-amber-500">{almostReadyEvents.filter(e => e.venue_id === venue.id).length}</div>
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">Almost</div>
                    </div>
                    <div className="text-center p-2 bg-neutral-950 rounded-xl">
                      <div className="text-xl font-bold text-orange-500">{venueWaiting.length}</div>
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">Waiting</div>
                    </div>
                    <div className="text-center p-2 bg-neutral-950 rounded-xl">
                      <div className="text-xl font-bold text-yellow-500">{venueOpen.length}</div>
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">Open</div>
                    </div>
                    <div className="text-center p-2 bg-neutral-950 rounded-xl">
                      <div className="text-xl font-bold text-green-500">{venueConfirmed.length}</div>
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">Ready</div>
                    </div>
                  </div>

                  {nextEvent ? (
                    <div className="bg-neutral-950 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Next Event</div>
                        <div className="font-medium text-sm truncate max-w-[200px]">{nextEvent.title}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-neutral-400">
                          {new Date(nextEvent.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-neutral-950 p-3 rounded-xl text-center text-sm text-neutral-400">
                      No upcoming events
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Single Venue Quick Actions */}
      {!isMultiVenue && venues.length === 1 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
          <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => onNavigate('events', venues[0].id)}
              className="w-full flex items-center justify-between p-4 bg-neutral-950 hover:bg-neutral-800 rounded-2xl transition-all group border border-neutral-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                  <Calendar size={20} />
                </div>
                <span className="font-bold">Create New Event</span>
              </div>
              <ChevronRight size={18} className="text-neutral-400 group-hover:text-white transition-colors" />
            </button>
            <button 
              onClick={() => onNavigate('profile', venues[0].id)}
              className="w-full flex items-center justify-between p-4 bg-neutral-950 hover:bg-neutral-800 rounded-2xl transition-all group border border-neutral-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-800 text-neutral-400 rounded-xl">
                  <MapPin size={20} />
                </div>
                <span className="font-bold">Update Venue Profile</span>
              </div>
              <ChevronRight size={18} className="text-neutral-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* Past Events You Can Reuse */}
      {pastEvents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="text-xl font-bold">Past Events You Can Reuse</h3>
              <p className="text-sm text-neutral-400">Save time by copying details from previous successful events.</p>
            </div>
            <button 
              onClick={() => onNavigate('events')}
              className="text-sm font-bold text-neutral-400 hover:text-white transition-colors"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastEvents.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()).slice(0, 3).map(event => {
              const hasBand = event.acts && event.acts.length > 0 && event.acts.some((a: any) => a.band_id);
              const bandName = hasBand ? event.acts.find((a: any) => a.band_id)?.bands?.name : null;
              
              return (
                <div key={event.id} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 flex flex-col group hover:border-neutral-700 transition-all">
                  <div className="flex-1 mb-4">
                    <h4 className="font-bold text-lg mb-1 truncate">{event.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-neutral-400 mb-3">
                      <Calendar size={14} />
                      {new Date(event.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className="text-neutral-700">•</span>
                      <MapPin size={14} />
                      <span className="truncate">{venues.find(v => v.id === event.venue_id)?.name || 'Unknown Venue'}</span>
                    </div>
                    {bandName && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 text-xs text-neutral-400">
                        <Music size={12} />
                        {bandName}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => onNavigate('events')}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-neutral-800 hover:bg-neutral-700 hover:text-white text-neutral-300 rounded-xl text-sm font-bold transition-all border border-neutral-700 hover:border-neutral-600"
                  >
                    <Copy size={16} />
                    Copy as New Event
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
