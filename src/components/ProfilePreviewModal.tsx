import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Phone, Globe, Mail, Info, Music, Calendar, Video, Clock, Ticket, Linkedin, Youtube, Link as LinkIcon, Instagram, Headphones, Facebook, Twitter, ChevronLeft, ChevronRight } from 'lucide-react';
import { displayAddress } from '../lib/geo';
import { formatDate, formatTimeString, getDateFromDate } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Venue, Band, AppEvent } from '../types';

interface ProfilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'venue' | 'band' | 'event' | 'profile';
  data: any;
}

export default function ProfilePreviewModal({ isOpen, onClose, type, data }: ProfilePreviewModalProps) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [stackedVenue, setStackedVenue] = useState<any | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [bandMembers, setBandMembers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && data?.id && (type === 'venue' || type === 'band')) {
      fetchFutureEvents();
      if (type === 'band') {
        fetchBandMembers();
      }
    }
    if (!isOpen) {
      setSelectedEvent(null);
      setStackedVenue(null);
      setLightboxIndex(null);
      setBandMembers([]);
    }
  }, [isOpen, data?.id, type]);

  async function fetchBandMembers() {
    try {
      const { data: membersData, error } = await supabase
        .from('band_members')
        .select('*')
        .eq('band_id', data.id)
        .eq('is_active', true)
        .order('first_name');
        
      if (error) throw error;
      if (membersData) {
        setBandMembers(membersData);
      }
    } catch (err) {
      console.error('Error fetching band members:', err);
    }
  }

  async function fetchFutureEvents() {
    setLoadingEvents(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let query = supabase
        .from('events')
        .select('*, venues(name, address), acts(*, bands(name))')
        .eq('is_published', true);

      if (type === 'venue') {
        query = query.eq('venue_id', data.id);
      } else if (type === 'band') {
        // Need to use a different query approach for bands to filter by act
        const { data: actData } = await supabase
          .from('acts')
          .select('event_id')
          .eq('band_id', data.id);
          
        if (actData && actData.length > 0) {
          query = query.in('id', actData.map(a => a.event_id));
        } else {
          setEvents([]);
          setLoadingEvents(false);
          return;
        }
      }

      const { data: eventData, error } = await query;
      if (error) throw error;

      // Deduplicate events by ID and process
      const uniqueEventsMap = new Map();
      (eventData || []).forEach(event => {
        const eventStartTime = event.start_time || event.acts?.[0]?.start_time || event.created_at;
        
        let isFuture = false;
        if (eventStartTime) {
          const dateStr = getDateFromDate(eventStartTime);
          const [year, month, day] = dateStr.split('-').map(Number);
          const eventDateObj = new Date(year, month - 1, day);
          if (eventDateObj >= today) {
            isFuture = true;
          }
        }
        
        // Filter out past events
        if (isFuture) {
          if (!uniqueEventsMap.has(event.id)) {
            uniqueEventsMap.set(event.id, {
              ...event,
              start_time: eventStartTime
            });
          }
        }
      });

      // Sort by start_time and limit to 10
      const sortedEvents = Array.from(uniqueEventsMap.values())
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 10);

      setEvents(sortedEvents);
    } catch (err) {
      console.error('Error fetching future events:', err);
    } finally {
      setLoadingEvents(false);
    }
  }

  if (!isOpen || !data) return null;

  const renderImageGallery = (images: string[]) => {
    if (!images || images.length === 0) return null;
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Gallery</h3>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
          {images.map((img, idx) => (
            <div 
              key={idx} 
              className="w-48 h-32 shrink-0 rounded-xl overflow-hidden cursor-pointer snap-start border border-neutral-800 hover:border-red-600 transition-colors"
              onClick={() => setLightboxIndex(idx)}
            >
              <img src={img} alt={`Gallery image ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLightbox = (images: string[]) => {
    if (lightboxIndex === null || !images || images.length === 0) return null;
    
    const handlePrev = (e: React.MouseEvent) => {
      e.stopPropagation();
      setLightboxIndex(prev => prev !== null ? (prev === 0 ? images.length - 1 : prev - 1) : null);
    };
    
    const handleNext = (e: React.MouseEvent) => {
      e.stopPropagation();
      setLightboxIndex(prev => prev !== null ? (prev === images.length - 1 ? 0 : prev + 1) : null);
    };

    return createPortal(
      <div 
        className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
        onClick={() => setLightboxIndex(null)}
      >
        <button 
          className="absolute top-6 right-6 text-white/70 hover:text-white bg-neutral-900/50 hover:bg-neutral-800 p-2 rounded-full transition-all"
          onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
        >
          <X size={24} />
        </button>
        
        {images.length > 1 && (
          <button 
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-neutral-900/50 hover:bg-neutral-800 p-3 rounded-full transition-all"
            onClick={handlePrev}
          >
            <ChevronLeft size={32} />
          </button>
        )}
        
        <img 
          src={images[lightboxIndex]} 
          alt={`Gallery image ${lightboxIndex + 1}`} 
          className="max-w-full max-h-[90vh] object-contain" 
          referrerPolicy="no-referrer"
          onClick={(e) => e.stopPropagation()}
        />
        
        {images.length > 1 && (
          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-neutral-900/50 hover:bg-neutral-800 p-3 rounded-full transition-all"
            onClick={handleNext}
          >
            <ChevronRight size={32} />
          </button>
        )}
        
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 bg-neutral-900/80 px-4 py-2 rounded-full text-sm font-medium">
          {lightboxIndex + 1} / {images.length}
        </div>
      </div>,
      document.body
    );
  };

  const renderEventsSection = () => {
    if (loadingEvents) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <div className="text-center py-8 bg-neutral-800/50 rounded-2xl border border-neutral-800">
          <Calendar className="mx-auto text-neutral-600 mb-2" size={32} />
          <p className="text-neutral-400 text-sm">No upcoming events scheduled.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4">
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-4 p-4 bg-neutral-800/50 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all group">
            <div className="w-16 h-16 rounded-xl bg-neutral-800 overflow-hidden shrink-0">
              <img 
                src={event.hero_url || `https://picsum.photos/seed/event${event.id}/200/200`} 
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white truncate">{event.title}</h4>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-neutral-400">
                <span className="flex items-center gap-1"><Calendar size={12} className="text-red-500" /> {formatDate(event.start_time)}</span>
                {event.doors_open_time && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-red-500" /> 
                    {formatTimeString(event.doors_open_time)}
                  </span>
                )}
                {type === 'band' && event.venues && <span className="flex items-center gap-1"><MapPin size={12} className="text-red-500" /> {event.venues.name}</span>}
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {(event.ticket_price_low !== undefined) && (
                <div className="text-right">
                  <div className="text-red-500 font-bold text-sm">${event.ticket_price_low}</div>
                  <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">Tickets</div>
                </div>
              )}
              <button
                onClick={() => setSelectedEvent(event)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    const currentType = stackedVenue ? 'venue' : (selectedEvent ? 'event' : type);
    const currentData = stackedVenue || selectedEvent || data;

    switch (currentType) {
      case 'venue':
        const defaultVenueHero = `https://picsum.photos/seed/venue-hero-${currentData.id}/1200/600`;
        const defaultVenueLogo = `https://picsum.photos/seed/venue-logo-${currentData.id}/200/200`;

        return (
          <>
          <div className="space-y-6">
            <div className="w-full h-64 sm:h-80 relative rounded-t-[2rem] overflow-hidden">
              <img 
                src={currentData.hero_url || defaultVenueHero} 
                alt={currentData.name || 'Venue Preview'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
              
              {(currentData.logo_url || defaultVenueLogo) && (
                <div className="absolute top-6 left-6 w-20 h-20 rounded-2xl bg-neutral-900 border border-neutral-800 p-2 shadow-xl overflow-hidden z-10">
                  <img src={currentData.logo_url || defaultVenueLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              )}
              
              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-4xl font-bold text-white mb-2">{currentData.name || 'Venue Name'}</h2>
                {currentData.address && (
                  <p className="text-neutral-300 flex items-center gap-2">
                    <MapPin size={16} className="text-red-500" /> {displayAddress(currentData.address)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">About</h3>
                  <div className="max-h-[320px] overflow-y-auto pr-4 custom-scrollbar">
                    <p className="text-neutral-400 leading-relaxed whitespace-pre-wrap">
                      {currentData.description || 'No description provided.'}
                    </p>
                  </div>
                  {currentData.bag_policy && (
                    <div className="pt-4">
                      <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2 mb-2">Bag Policy</h3>
                      <p className="text-neutral-400 leading-relaxed whitespace-pre-wrap">
                        {currentData.bag_policy}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Contact & Info</h3>
                  <div className="space-y-3">
                    {currentData.phone && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Phone size={14} />
                        </div>
                        {currentData.phone}
                      </div>
                    )}
                    {currentData.email && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Mail size={14} />
                        </div>
                        <a href={`mailto:${currentData.email}`} className="hover:text-red-500 transition-colors">
                          {currentData.email}
                        </a>
                      </div>
                    )}
                    {currentData.website && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Globe size={14} />
                        </div>
                        <a 
                          href={currentData.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                    {currentData.linkedin_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Linkedin size={14} />
                        </div>
                        <a 
                          href={currentData.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          LinkedIn
                        </a>
                      </div>
                    )}
                    {currentData.pinterest_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <LinkIcon size={14} />
                        </div>
                        <a 
                          href={currentData.pinterest_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Pinterest
                        </a>
                      </div>
                    )}
                    {currentData.youtube_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Youtube size={14} />
                        </div>
                        <a 
                          href={currentData.youtube_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          YouTube
                        </a>
                      </div>
                    )}
                    {currentData.instagram_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Instagram size={14} />
                        </div>
                        <a 
                          href={currentData.instagram_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Instagram
                        </a>
                      </div>
                    )}
                    {currentData.apple_music_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Music size={14} />
                        </div>
                        <a 
                          href={currentData.apple_music_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Apple Music
                        </a>
                      </div>
                    )}
                    {currentData.spotify_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Headphones size={14} />
                        </div>
                        <a 
                          href={currentData.spotify_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Spotify
                        </a>
                      </div>
                    )}
                    {currentData.facebook_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Facebook size={14} />
                        </div>
                        <a 
                          href={currentData.facebook_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Facebook
                        </a>
                      </div>
                    )}
                    {currentData.twitter_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Twitter size={14} />
                        </div>
                        <a 
                          href={currentData.twitter_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Twitter (X)
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {currentData.food_description && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Food & Drink</h3>
                  <p className="text-neutral-400 leading-relaxed whitespace-pre-wrap">
                    {currentData.food_description}
                  </p>
                </div>
              )}

              {renderImageGallery(currentData.images)}

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Scheduled Events</h3>
                {renderEventsSection()}
              </div>
            </div>
          </div>
          {renderLightbox(currentData.images)}
          </>
        );

      case 'band':
        const defaultBandHero = `https://picsum.photos/seed/band-hero-${data.id}/1200/600`;
        const defaultBandLogo = `https://picsum.photos/seed/band-logo-${data.id}/200/200`;
        
        return (
          <>
          <div className="space-y-6">
            <div className="w-full h-64 sm:h-80 relative rounded-t-[2rem] overflow-hidden">
              <img 
                src={data.hero_url || defaultBandHero} 
                alt={data.name || 'Band Preview'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-4xl font-bold text-white mb-2">{data.name || 'Band Name'}</h2>
                {(data.city || data.state) && (
                  <p className="text-neutral-300 flex items-center gap-2">
                    <MapPin size={16} className="text-red-500" /> 
                    {[data.city, data.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">About</h3>
                  <div className="max-h-[320px] overflow-y-auto pr-4 custom-scrollbar">
                    <p className="text-neutral-400 leading-relaxed whitespace-pre-wrap">
                      {data.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {(data.logo_url || defaultBandLogo) && (
                    <div className="w-24 h-24 rounded-2xl bg-neutral-900 border border-neutral-800 p-2 shadow-xl overflow-hidden mb-6">
                      <img src={data.logo_url || defaultBandLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Contact & Info</h3>
                  <div className="space-y-3">
                    {data.phone && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Phone size={14} />
                        </div>
                        {data.phone}
                      </div>
                    )}
                    {data.email && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Mail size={14} />
                        </div>
                        <a href={`mailto:${data.email}`} className="hover:text-red-500 transition-colors">
                          {data.email}
                        </a>
                      </div>
                    )}
                    {data.website && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Globe size={14} />
                        </div>
                        <a 
                          href={data.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                    {data.linkedin_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Linkedin size={14} />
                        </div>
                        <a 
                          href={data.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          LinkedIn
                        </a>
                      </div>
                    )}
                    {data.pinterest_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <LinkIcon size={14} />
                        </div>
                        <a 
                          href={data.pinterest_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Pinterest
                        </a>
                      </div>
                    )}
                    {data.youtube_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Youtube size={14} />
                        </div>
                        <a 
                          href={data.youtube_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          YouTube
                        </a>
                      </div>
                    )}
                    {data.instagram_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Instagram size={14} />
                        </div>
                        <a 
                          href={data.instagram_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Instagram
                        </a>
                      </div>
                    )}
                    {data.apple_music_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Music size={14} />
                        </div>
                        <a 
                          href={data.apple_music_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Apple Music
                        </a>
                      </div>
                    )}
                    {data.spotify_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Headphones size={14} />
                        </div>
                        <a 
                          href={data.spotify_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Spotify
                        </a>
                      </div>
                    )}
                    {data.facebook_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Facebook size={14} />
                        </div>
                        <a 
                          href={data.facebook_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Facebook
                        </a>
                      </div>
                    )}
                    {data.twitter_url && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Twitter size={14} />
                        </div>
                        <a 
                          href={data.twitter_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          Twitter (X)
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {data.genres && data.genres.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.genres.map((genre: string) => (
                      <span key={genre} className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full text-sm">
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {type === 'band' && bandMembers.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Band Members</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {bandMembers.map((member) => (
                      <div key={member.id} className="bg-neutral-800 p-4 rounded-xl border border-neutral-700">
                        <div className="font-bold text-white text-lg">{member.first_name} {member.last_name}</div>
                        {member.instrument_description && (
                          <div className="text-red-500 text-sm font-medium mt-1">{member.instrument_description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.video_links && data.video_links.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Videos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.video_links.map((link: string, i: number) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="block p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-colors text-red-500 truncate">
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {renderImageGallery(data.images)}

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Scheduled Events</h3>
                {renderEventsSection()}
              </div>
            </div>
          </div>
          {renderLightbox(data.images)}
          </>
        );

      case 'event':
        return (
          <div className="space-y-6">
            <div className="w-full h-64 sm:h-80 relative rounded-t-[2rem] overflow-hidden">
              <img 
                src={currentData.hero_url || `https://picsum.photos/seed/event${currentData.id || 'preview'}/800/600`} 
                alt={currentData.title || 'Event Preview'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-4xl font-bold text-white mb-2">{currentData.title || 'Event Title'}</h2>
              </div>
            </div>
            
            <div className="p-6 space-y-8">
              {type !== 'venue' && currentData.venues && (
                <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-1">Venue</h3>
                    <p className="text-xl font-bold text-white">{currentData.venues.name}</p>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!currentData.venue_id) return;
                      const { data: venueData } = await supabase.from('venues').select('*').eq('id', currentData.venue_id).single();
                      if (venueData) setStackedVenue(venueData);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors"
                  >
                    View Venue
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">About</h3>
                  <p className="text-neutral-400 leading-relaxed whitespace-pre-wrap">
                    {currentData.description || 'No description provided.'}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Details</h3>
                  <div className="space-y-3">
                    {currentData.doors_open_time && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Calendar size={14} />
                        </div>
                        Doors Open: {formatTimeString(currentData.doors_open_time)}
                      </div>
                    )}
                    {(currentData.ticket_price_low !== undefined || currentData.ticket_price_high !== undefined) && (
                      <div className="flex items-center gap-3 text-neutral-300">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-red-500 shrink-0">
                          <Ticket size={14} />
                        </div>
                        Tickets: {(() => {
                          const low = currentData.ticket_price_low || 0;
                          const high = currentData.ticket_price_high || 0;
                          if (low === 0 && high === 0) return "Free";
                          if (low === high) return `$${low}`;
                          return `$${low} - $${high}`;
                        })()}
                      </div>
                    )}
                    </div>
                  </div>
                </div>
                
                {/* Venue Details Section (Only when spawned from venue profile) */}
                {type === 'venue' && currentData.venues && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white border-b border-neutral-800 pb-2">Venue Details</h3>
                    <div className="space-y-3 text-neutral-300">
                      <p className="font-bold text-white">{currentData.venues.name}</p>
                      {currentData.venues.address && <p className="flex items-center gap-2"><MapPin size={14} /> {displayAddress(currentData.venues.address)}</p>}
                      {currentData.venues.phone && <p className="flex items-center gap-2"><Phone size={14} /> {currentData.venues.phone}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div className="w-full h-48 relative rounded-t-[2rem] bg-neutral-800 flex items-center justify-center overflow-hidden">
              {data.avatar_url ? (
                <img src={data.avatar_url} alt="Profile" className="w-full h-full object-cover opacity-50 blur-sm" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
              <div className="w-32 h-32 rounded-full bg-red-600 flex items-center justify-center text-5xl font-bold text-white shadow-xl z-10 border-4 border-neutral-900 overflow-hidden">
                {data.avatar_url ? (
                  <img src={data.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  `${data.first_name?.[0] || ''}${data.last_name?.[0] || ''}`
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">{data.first_name} {data.last_name}</h2>
                <div className="flex items-center justify-center gap-4 text-neutral-400">
                  {data.email && <span className="flex items-center gap-1"><Mail size={14} /> {data.email}</span>}
                  {data.phone && <span className="flex items-center gap-1"><Phone size={14} /> {data.phone}</span>}
                </div>
              </div>

              {data.roles?.includes('musician') && data.musicianData && (
                <div className="border-t border-neutral-800 pt-8 space-y-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Music className="text-red-500" /> Musician Profile
                  </h3>
                  
                  {data.musicianData.description && (
                    <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">
                      {data.musicianData.description}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {data.musicianData.instruments && data.musicianData.instruments.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Instruments</h4>
                        <div className="flex flex-wrap gap-2">
                          {data.musicianData.instruments.map((inst: string) => (
                            <span key={inst} className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full text-sm">
                              {inst}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Status</h4>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${data.musicianData.looking_for_bands ? 'bg-green-500' : 'bg-neutral-500'}`} />
                        <span className="text-neutral-300">
                          {data.musicianData.looking_for_bands ? 'Looking for bands' : 'Not looking for bands'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {data.musicianData.video_links && data.musicianData.video_links.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Videos</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {data.musicianData.video_links.map((link: string, i: number) => (
                          <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-colors text-red-500 truncate text-sm">
                            <Video size={16} className="shrink-0" />
                            <span className="truncate">{link}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-[2rem] overflow-hidden shadow-2xl relative my-auto"
        >
          {(selectedEvent || stackedVenue) && (
            <button 
              onClick={() => {
                if (stackedVenue) setStackedVenue(null);
                else setSelectedEvent(null);
              }}
              className="absolute top-4 left-4 z-10 px-4 h-10 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white text-sm font-bold uppercase tracking-widest transition-colors"
            >
              ← Back
            </button>
          )}
          <button 
            onClick={() => {
              if (selectedEvent) setSelectedEvent(null);
              else if (stackedVenue) setStackedVenue(null);
              else onClose();
            }}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X size={20} />
          </button>
          
          {renderContent()}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
