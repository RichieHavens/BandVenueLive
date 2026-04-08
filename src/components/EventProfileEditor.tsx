import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { AppEvent } from '../types';
import { Save, Loader2, Eye, Image as ImageIcon, Trash2, MapPin } from 'lucide-react';
import ProfilePreviewModal from './ProfilePreviewModal';
import { getDateFromDate, getTimeFromDate } from '../lib/utils';
import ImageUpload from './ImageUpload';
import { checkOverlap } from '../lib/eventUtils';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { useEventValidation } from '../lib/hooks/useEventValidation';

export default function EventProfileEditor({ eventId, onDirtyChange, onSaveSuccess }: { eventId: string, onDirtyChange?: (dirty: boolean) => void, onSaveSuccess?: () => void }) {
  const { user, profile } = useAuth();
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
      
      // Fetch all events for the venue to check for overlaps
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
    
    // Check if the event has already passed
    if (isPast) {
      setMessage({ type: 'error', text: 'Cannot edit an event that has already passed.' });
      return;
    }

    // Check if the new date is in the past
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
        title: event.title,
        description: event.description,
        venue_id: event.venue_id,
        end_time: event.end_time,
        doors_open_time: event.doors_open_time,
        ticket_price_low: event.ticket_price_low,
        ticket_price_high: event.ticket_price_high,
        ticket_disclaimer: event.ticket_disclaimer,
        venue_confirmed: event.venue_confirmed,
        band_confirmed: event.band_confirmed,
        has_multiple_acts: event.has_multiple_acts,
        is_public: event.is_public,
        is_published: event.is_published,
        hero_url: event.hero_url,
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

      // Update act start_time if it changed
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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-500" /></div>;

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-8 bg-neutral-900 p-8 rounded-3xl border border-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Event Profile</h2>
          {isPast && !isAdmin && <span className="text-red-500 font-bold">Past event - not editable</span>}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all"
            >
              <Eye size={20} />
              <span className="hidden sm:inline">Preview</span>
            </button>
            {(!isPast || isAdmin) && (
              <button
                type="submit"
                disabled={saving || !!dateError}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Save Changes
              </button>
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

        <ProfilePreviewModal 
          isOpen={showPreview} 
          onClose={() => setShowPreview(false)} 
          type="event" 
          data={event} 
        />

        <div className="mb-2">
          <h3 className="text-2xl font-bold text-white">{event?.title}</h3>
          <p className="text-neutral-400 text-lg">{event?.venues?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 md:col-span-2">
            <label className="text-sm font-medium text-neutral-400">Event Image (Wide - 1920x1080 preferred)</label>
            <div className="flex items-center gap-6">
              <div className="w-full h-32 bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 relative group">
                {event?.hero_url ? (
                  <>
                    <img src={event.hero_url} alt="Event" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {(!isPast || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => setEvent({ ...event, hero_url: '' })}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-10"
                        title="Delete Image"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>
              {(!isPast || isAdmin) && (
                <div className="flex flex-col gap-2 shrink-0">
                  <ImageUpload 
                    type="hero"
                    onUploadComplete={(result) => {
                      const pcUrl = typeof result === 'string' ? result : (result.hero_pc || result.original);
                      setEvent(prev => ({ ...prev, hero_url: pcUrl }));
                    }}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border border-neutral-700 text-center"
                  >
                    Upload Image
                  </ImageUpload>
                  {event?.venue_hero_url && (
                    <button
                      type="button"
                      onClick={() => setEvent(prev => ({ ...prev, hero_url: prev?.venue_hero_url }))}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-neutral-700 flex items-center justify-center gap-2"
                    >
                      <MapPin size={16} />
                      Use Venue Image
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-400">Event Title</label>
            <input
              type="text"
              required
              disabled={isPast && !isAdmin}
              value={event?.title || ''}
              onChange={(e) => setEvent({ ...event, title: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-600 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Event Date</label>
            <input
              type="date"
              required
              disabled={isPast && !isAdmin}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={`w-full bg-neutral-800 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-600 outline-none transition-all ${
                dateError ? 'border-red-500 ring-1 ring-red-500' : 'border-neutral-700'
              }`}
            />
            {dateError && (
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider ml-1">{dateError}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Start Time</label>
            <input
              type="time"
              required
              disabled={isPast && !isAdmin}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-600 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Ticket Price Low</label>
            <input
              type="number"
              disabled={isPast && !isAdmin}
              value={event?.ticket_price_low || ''}
              onChange={(e) => setEvent({ ...event, ticket_price_low: parseFloat(e.target.value) })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-600 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Ticket Price High</label>
            <input
              type="number"
              disabled={isPast && !isAdmin}
              value={event?.ticket_price_high || ''}
              onChange={(e) => setEvent({ ...event, ticket_price_high: parseFloat(e.target.value) })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-600 outline-none transition-all"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-400">Description</label>
            <textarea
              rows={4}
              disabled={isPast && !isAdmin}
              value={event?.description || ''}
              onChange={(e) => setEvent({ ...event, description: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-600 outline-none transition-all resize-none"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-400">Bag Policy (Override)</label>
            <textarea
              rows={4}
              disabled={isPast && !isAdmin}
              value={event?.bag_policy || ''}
              onChange={(e) => setEvent({ ...event, bag_policy: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-600 outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-4 md:col-span-2 bg-neutral-800/50 p-6 rounded-2xl border border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4">Event Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl border border-neutral-700 cursor-pointer hover:border-neutral-600 transition-all">
                <input
                  type="checkbox"
                  disabled={isPast && !isAdmin}
                  checked={event?.has_multiple_acts || false}
                  onChange={(e) => setEvent({ ...event, has_multiple_acts: e.target.checked })}
                  className="w-5 h-5 rounded border-neutral-600 text-red-500 focus:ring-red-600 bg-neutral-900"
                />
                <div>
                  <div className="font-medium text-white">Has Multiple Acts?</div>
                  <div className="text-xs text-neutral-400">Does this event have more than one act?</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl border border-neutral-700 cursor-pointer hover:border-neutral-600 transition-all">
                <input
                  type="checkbox"
                  disabled={isPast && !isAdmin}
                  checked={event?.is_public || false}
                  onChange={(e) => setEvent({ ...event, is_public: e.target.checked })}
                  className="w-5 h-5 rounded border-neutral-600 text-red-500 focus:ring-red-600 bg-neutral-900"
                />
                <div>
                  <div className="font-medium text-white">Public Event</div>
                  <div className="text-xs text-neutral-400">Visible to everyone</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl border border-neutral-700 cursor-pointer hover:border-neutral-600 transition-all">
                <input
                  type="checkbox"
                  disabled={isPast && !isAdmin}
                  checked={event?.is_published || false}
                  onChange={(e) => setEvent({ ...event, is_published: e.target.checked })}
                  className="w-5 h-5 rounded border-neutral-600 text-red-500 focus:ring-red-600 bg-neutral-900"
                />
                <div>
                  <div className="font-medium text-white">Published</div>
                  <div className="text-xs text-neutral-400">Live on the platform</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl border border-neutral-700 cursor-pointer hover:border-neutral-600 transition-all">
                <input
                  type="checkbox"
                  disabled={isPast && !isAdmin}
                  checked={event?.venue_confirmed || false}
                  onChange={(e) => setEvent({ ...event, venue_confirmed: e.target.checked })}
                  className="w-5 h-5 rounded border-neutral-600 text-red-500 focus:ring-red-600 bg-neutral-900"
                />
                <div>
                  <div className="font-medium text-white">Venue Confirmed</div>
                  <div className="text-xs text-neutral-400">Venue has approved</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl border border-neutral-700 cursor-pointer hover:border-neutral-600 transition-all">
                <input
                  type="checkbox"
                  disabled={isPast && !isAdmin}
                  checked={event?.band_confirmed || false}
                  onChange={(e) => setEvent({ ...event, band_confirmed: e.target.checked })}
                  className="w-5 h-5 rounded border-neutral-600 text-red-500 focus:ring-red-600 bg-neutral-900"
                />
                <div>
                  <div className="font-medium text-white">Band Confirmed</div>
                  <div className="text-xs text-neutral-400">Band has approved</div>
                </div>
              </label>
            </div>
          </div>
        </div>
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
      </form>
    </div>
  );
}
