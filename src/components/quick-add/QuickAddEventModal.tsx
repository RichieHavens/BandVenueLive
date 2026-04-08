import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Loader2, X, Search, Calendar, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Scratchpad } from './Scratchpad';
import { useNavigationContext } from '../../context/NavigationContext';
import { checkOverlap } from '../../lib/eventUtils';
import { AppEvent, Venue } from '../../types';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { EVENT_DEFAULTS } from '../../lib/eventDefaults';
import { useEventValidation } from '../../lib/hooks/useEventValidation';

interface QuickAddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickAddEventModal({ isOpen, onClose, onSuccess }: QuickAddEventModalProps) {
  const { setActiveTab, setSelectedEventId } = useNavigationContext();
  const [title, setTitle] = useState('');
  const [venueId, setVenueId] = useState('');
  const [venues, setVenues] = useState<Pick<Venue, 'id' | 'name'>[]>([]);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState(EVENT_DEFAULTS.start_time);
  const [endTime, setEndTime] = useState(EVENT_DEFAULTS.end_time);
  const [isPublic, setIsPublic] = useState(EVENT_DEFAULTS.is_public);
  const [hasMultipleActs, setHasMultipleActs] = useState(EVENT_DEFAULTS.has_multiple_acts);
  const [saving, setSaving] = useState(false);
  const [allEvents, setAllEvents] = useState<AppEvent[]>([]);
  const { overlapEvent, showOverlapModal, setShowOverlapModal, validateDate, triggerOverlapCheck } = useEventValidation(allEvents);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    const { data: venuesData } = await supabase.from('venues').select('id, name');
    if (venuesData) setVenues(venuesData);
    
    const { data: eventsData } = await supabase.from('events').select('*');
    if (eventsData) setAllEvents(eventsData);
  };

  const handleSave = async (e: React.FormEvent | null, action: 'close' | 'another' | 'open', skipOverlapCheck = false) => {
    if (e) e.preventDefault();
    
    const dateError = validateDate(date);
    if (dateError) {
      toast.error(dateError);
      return;
    }
    
    const start = new Date(`${date}T${startTime}:00`).toISOString();
    const end = new Date(`${date}T${endTime}:00`).toISOString();
    
    if (!skipOverlapCheck && triggerOverlapCheck(venueId, start, end)) {
      return;
    }

    setSaving(true);
    
    try {
      const { error, data } = await supabase.from('events').insert({
        title,
        venue_id: venueId,
        start_time: start,
        end_time: end,
        is_public: isPublic,
        has_multiple_acts: hasMultipleActs,
        overall_status: 'draft',
      }).select().single();

      if (error) throw error;
      
      toast.success('Event created successfully!');
      if (action === 'close') {
        onSuccess();
        onClose();
      } else if (action === 'another') {
        setTitle('');
        setVenueId('');
        setDate('');
        setStartTime('20:00');
        setEndTime('23:00');
      } else if (action === 'open') {
        setSelectedEventId(data.id);
        setActiveTab('my-event');
        onClose();
      }
    } catch (err: any) {
      toast.error('Failed to create event: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Quick Add Event</h3>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-red-400 rounded-full">
            <X size={20} />
          </button>
        </div>
        <form className="space-y-4">
          <Input label="Event Name" required value={title} onChange={(e) => setTitle(e.target.value)} />
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Venue</label>
            <select className="w-full bg-neutral-800 p-3 rounded-xl" value={venueId} onChange={(e) => setVenueId(e.target.value)} required>
              <option value="">Select a venue</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Start" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <Input label="End" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl border border-neutral-700 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-5 h-5 rounded border-neutral-600 text-red-500 bg-neutral-900" />
            <span className="font-medium">Public Event</span>
          </label>

          <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl border border-neutral-700 cursor-pointer">
            <input type="checkbox" checked={hasMultipleActs} onChange={(e) => setHasMultipleActs(e.target.checked)} className="w-5 h-5 rounded border-neutral-600 text-red-500 bg-neutral-900" />
            <span className="font-medium">Has Multiple Acts?</span>
          </label>

          <Scratchpad />
          
          <div className="pt-6 flex flex-wrap gap-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={(e) => handleSave(e, 'close')} disabled={saving}>Save & Close</Button>
            <Button type="button" onClick={(e) => handleSave(e, 'another')} disabled={saving}>Save & Add Another</Button>
            <Button type="button" onClick={(e) => handleSave(e, 'open')} disabled={saving}>Save & Open</Button>
          </div>
        </form>
        <ConfirmationModal
          isOpen={showOverlapModal}
          onClose={() => setShowOverlapModal(false)}
          onConfirm={() => {
            setShowOverlapModal(false);
            handleSave(null, 'close', true);
          }}
          title="Event Overlap Detected"
          message={`This event overlaps with "${overlapEvent?.title}" at ${overlapEvent?.start_time ? new Date(overlapEvent.start_time).toLocaleDateString() : 'unknown date'}. Are you sure you want to continue?`}
          confirmText="Save Anyway"
        />
      </Card>
    </div>
  );
}
