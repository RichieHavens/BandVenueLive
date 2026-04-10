import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNavigationContext } from '../context/NavigationContext';
import { AppEvent } from '../types';
import { Save, Loader2, Eye, Image as ImageIcon, Trash2, MapPin, Calendar, Clock, DollarSign, FileText, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import ProfilePreviewModal from './ProfilePreviewModal';
import { getDateFromDate, getTimeFromDate } from '../lib/utils';
import ImageUpload from './ImageUpload';
import { checkOverlap } from '../lib/eventUtils';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { useEventValidation } from '../lib/hooks/useEventValidation';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export default function EventProfileEditor({ eventId, onDirtyChange, onSaveSuccess }: { eventId: string, onDirtyChange?: (dirty: boolean) => void, onSaveSuccess?: () => void }) {
  const { user, profile } = useAuth();
  const { addRecentRecord } = useNavigationContext();
  const isAdmin = profile?.roles.includes('admin');
  const [event, setEvent] = useState<Partial<AppEvent> | null>(null);
  const [initialEvent, setInitialEvent] = useState<Partial<AppEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isPast, setIsPast] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('20:00');
  const [allEvents, setAllEvents] = useState<AppEvent[]>([]);
  const { overlapEvent, showOverlapModal, setShowOverlapModal, validateDate, triggerOverlapCheck } = useEventValidation(allEvents);

  // Section toggles for mobile progressive disclosure
  const [expandedSection, setExpandedSection] = useState<string>('basic');

  useEffect(() => {
    if (eventDate) {
      const [year, month, day] = eventDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        setDateError('Cannot set an event date to the past.');
      } else {
        setDateError(null);
      }
    }
  }, [eventDate, startTime]);

  useEffect(() => {
    if (event && initialEvent && eventDate && startTime) {
      const time = startTime.length === 5 ? `${startTime}:00` : startTime;
      const dateObj = new Date(`${eventDate}T${time}`);
      
      if (!isNaN(dateObj.getTime())) {
        const currentStartTime = dateObj.toISOString();
        const isDirty = JSON.stringify({ ...event, start_time: currentStartTime }) !== JSON.stringify(initialEvent);
        onDirtyChange?.(isDirty);
      }
    }
  }, [event, initialEvent, eventDate, startTime, onDirtyChange]);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  async function fetchEvent() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, acts(id, start_time), venues(name, hero_url)')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      
      const eventWithDate = {
        ...data,
        start_time: data.start_time || data.acts?.[0]?.start_time || '',
        venue_hero_url: data.venues?.hero_url
      };
      
      setEvent(eventWithDate);
      setInitialEvent(eventWithDate);
      addRecentRecord({
        id: eventWithDate.id,
        type: 'event',
        name: eventWithDate.name,
        timestamp: Date.now()
      });
      
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('venue_id', data.venue_id);
      if (events) setAllEvents(events);

      if (eventWithDate.start_time) {
        const dateStr = getDateFromDate(eventWithDate.start_time);
        setEventDate(dateStr);
        setStartTime(getTimeFromDate(eventWithDate.start_time));
        
        const [year, month, day] = dateStr.split('-').map(Number);
        const startTimeObj = new Date(year, month - 1, day);
        const today = new Date();
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        setIsPast(startTimeObj < todayDateOnly);
      } else {
        setIsPast(false);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  }

  async function logUpdate(eventId: string, changes: any) {
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      table_name: 'events',
      record_id: eventId,
      changes: changes
    });
  }

  async function handleSave(e: React.FormEvent, skipOverlapCheck = false) {
    if (e) e.preventDefault();
    
    if (!skipOverlapCheck) {
      const time = startTime || '00:00';
      const start = new Date(`${eventDate}T${time}:00`).toISOString();
      const end = event?.end_time || new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
      if (triggerOverlapCheck(event?.venue_id || '', start, end, eventId)) {
        return;
      }
    }
    
    if (isPast) {
      setMessage({ type: 'error', text: 'Cannot edit an event that has already passed.' });
      return;
    }

    const dateError = validateDate(eventDate);
    if (dateError) {
      setMessage({ type: 'error', text: dateError });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (!eventDate) {
        throw new Error('Event date is required.');
      }
      const time = startTime || '00:00';
      const currentStartTime = new Date(`${eventDate}T${time}:00`).toISOString();
      const eventToUpdate: any = {
        title: event?.title,
        description: event?.description,
        venue_id: event?.venue_id,
        end_time: event?.end_time,
        doors_open_time: event?.doors_open_time,
        ticket_price_low: event?.ticket_price_low,
        ticket_price_high: event?.ticket_price_high,
        ticket_disclaimer: event?.ticket_disclaimer,
        venue_confirmed: event?.venue_confirmed,
        band_confirmed: event?.band_confirmed,
        has_multiple_acts: event?.has_multiple_acts,
        is_public: event?.is_public,
        is_published: event?.is_published,
        hero_url: event?.hero_url,
        bag_policy: event?.bag_policy,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };

      const changes: any = {};
      Object.keys(eventToUpdate).forEach(key => {
        if (eventToUpdate[key] !== (initialEvent as any)[key]) {
          changes[key] = eventToUpdate[key];
        }
      });

      const { error, data } = await supabase
        .from('events')
        .update(eventToUpdate)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      if (currentStartTime !== (initialEvent as any).start_time) {
        const actId = (initialEvent as any).acts?.[0]?.id;
        if (actId) {
          await supabase.from('acts').update({ start_time: currentStartTime }).eq('id', actId);
          changes.start_time = currentStartTime;
        }
      }

      if (Object.keys(changes).length > 0) {
        await logUpdate(data.id, changes);
      }

      setMessage({ type: 'success', text: 'Event updated successfully!' });
      setInitialEvent(event);
      
      setTimeout(() => {
        onSaveSuccess?.();
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Error saving event: ' + error.message });
    } finally {
      setSaving(false);
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  const SectionHeader = ({ id, title, icon: Icon }: { id: string, title: string, icon: any }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-2xl hover:bg-neutral-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-neutral-800 rounded-xl text-blue-500">
          <Icon size={20} />
        </div>
        <span className="font-bold text-white">{title}</span>
      </div>
      {expandedSection === id ? <ChevronUp size={20} className="text-neutral-500" /> : <ChevronDown size={20} className="text-neutral-500" />}
    </button>
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-neutral-950/80 backdrop-blur-xl py-4 border-b border-neutral-900">
        <div>
          <h2 className="text-2xl font-bold text-white">Edit Event</h2>
          {isPast && !isAdmin && <span className="text-red-500 text-xs font-bold uppercase tracking-wider">Past event - not editable</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowPreview(true)}
            className="hidden sm:flex"
          >
            <Eye size={18} />
            Preview
          </Button>
          {(!isPast || isAdmin) && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !!dateError}
              size="sm"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-sm font-medium ${
          message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 max-w-3xl mx-auto">
        
        {/* Basic Info Section */}
        <div className="space-y-4">
          <SectionHeader id="basic" title="Basic Info" icon={Calendar} />
          {expandedSection === 'basic' && (
            <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <Input
                label="Event Title"
                type="text"
                required
                disabled={isPast && !isAdmin}
                value={event?.title || ''}
                onChange={(e) => setEvent({ ...event, title: e.target.value })}
                placeholder="e.g. Summer Rock Fest"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    label="Event Date"
                    type="date"
                    required
                    disabled={isPast && !isAdmin}
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className={dateError ? 'border-red-500 ring-1 ring-red-500' : ''}
                  />
                  {dateError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider ml-1">{dateError}</p>}
                </div>
                <Input
                  label="Start Time"
                  type="time"
                  required
                  disabled={isPast && !isAdmin}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Media Section */}
        <div className="space-y-4">
          <SectionHeader id="media" title="Event Image" icon={ImageIcon} />
          {expandedSection === 'media' && (
            <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="w-full aspect-video sm:h-48 bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 relative group">
                {event?.hero_url ? (
                  <>
                    <img src={event.hero_url} alt="Event" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {(!isPast || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => setEvent({ ...event, hero_url: '' })}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-10"
                        title="Delete Image"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
                    <ImageIcon size={32} />
                    <span className="text-xs font-medium">1920x1080 preferred</span>
                  </div>
                )}
              </div>
              {(!isPast || isAdmin) && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <ImageUpload 
                    type="hero"
                    onUploadComplete={(result) => {
                      const pcUrl = typeof result === 'string' ? result : (result.hero_pc || result.original);
                      setEvent(prev => ({ ...prev, hero_url: pcUrl }));
                    }}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer border border-neutral-700 text-center"
                  >
                    Upload Custom Image
                  </ImageUpload>
                  {event?.venue_hero_url && (
                    <button
                      type="button"
                      onClick={() => setEvent(prev => ({ ...prev, hero_url: prev?.venue_hero_url }))}
                      className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all border border-neutral-700 flex items-center justify-center gap-2"
                    >
                      <MapPin size={18} />
                      Use Venue Image
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="space-y-4">
          <SectionHeader id="details" title="Details & Pricing" icon={FileText} />
          {expandedSection === 'details' && (
            <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Description</label>
                <Textarea
                  rows={4}
                  disabled={isPast && !isAdmin}
                  value={event?.description || ''}
                  onChange={(e) => setEvent({ ...event, description: e.target.value })}
                  placeholder="Tell people about this event..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price Low ($)"
                  type="number"
                  disabled={isPast && !isAdmin}
                  value={event?.ticket_price_low || ''}
                  onChange={(e) => setEvent({ ...event, ticket_price_low: parseFloat(e.target.value) })}
                  icon={<DollarSign size={16} className="text-neutral-500" />}
                />
                <Input
                  label="Price High ($)"
                  type="number"
                  disabled={isPast && !isAdmin}
                  value={event?.ticket_price_high || ''}
                  onChange={(e) => setEvent({ ...event, ticket_price_high: parseFloat(e.target.value) })}
                  icon={<DollarSign size={16} className="text-neutral-500" />}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Bag Policy (Override)</label>
                <Textarea
                  rows={2}
                  disabled={isPast && !isAdmin}
                  value={event?.bag_policy || ''}
                  onChange={(e) => setEvent({ ...event, bag_policy: e.target.value })}
                  placeholder="Leave blank to use venue default"
                />
              </div>
            </div>
          )}
        </div>

        {/* Status Section */}
        <div className="space-y-4">
          <SectionHeader id="status" title="Status & Visibility" icon={Settings} />
          {expandedSection === 'status' && (
            <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
              {[
                { id: 'is_published', label: 'Published', desc: 'Live on the platform' },
                { id: 'is_public', label: 'Public Event', desc: 'Visible to everyone' },
                { id: 'has_multiple_acts', label: 'Multiple Acts', desc: 'More than one performer' },
                { id: 'venue_confirmed', label: 'Venue Confirmed', desc: 'Venue has approved' },
                { id: 'band_confirmed', label: 'Band Confirmed', desc: 'Band has approved' },
              ].map((toggle) => (
                <label key={toggle.id} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-all">
                  <div>
                    <div className="font-bold text-white text-sm">{toggle.label}</div>
                    <div className="text-xs text-neutral-500">{toggle.desc}</div>
                  </div>
                  <div className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    (event as any)?.[toggle.id] ? "bg-blue-600" : "bg-neutral-800"
                  )}>
                    <div className={cn(
                      "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform",
                      (event as any)?.[toggle.id] ? "translate-x-6" : "translate-x-0"
                    )} />
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    disabled={isPast && !isAdmin}
                    checked={(event as any)?.[toggle.id] || false}
                    onChange={(e) => setEvent({ ...event, [toggle.id]: e.target.checked })}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

      </form>

      <ProfilePreviewModal 
        isOpen={showPreview} 
        onClose={() => setShowPreview(false)} 
        type="event" 
        data={event} 
      />

      <ConfirmationModal
        isOpen={showOverlapModal}
        onClose={() => setShowOverlapModal(false)}
        onConfirm={() => {
          setShowOverlapModal(false);
          handleSave(null as any, true);
        }}
        title="Event Overlap Detected"
        message={`This event overlaps with "${overlapEvent?.title}" at ${overlapEvent?.start_time ? new Date(overlapEvent.start_time).toLocaleDateString() : 'unknown date'}. Are you sure you want to continue?`}
        confirmText="Save Anyway"
      />
    </div>
  );
}
