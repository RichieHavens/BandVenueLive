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
import { cn } from '../../lib/utils';
import { SearchableSelect } from '../ui/SearchableSelect';

interface QuickAddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

import { useAuth } from '../../AuthContext';

export default function QuickAddEventModal({ isOpen, onClose, onSuccess }: QuickAddEventModalProps) {
  const { personId } = useAuth();
  const { setActiveTab, setSelectedEventId } = useNavigationContext();
  const [title, setTitle] = useState('');
  const [venueId, setVenueId] = useState('');
  const [venues, setVenues] = useState<Pick<Venue, 'id' | 'name'>[]>([]);
  
  // Smart Default: Date is today
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  
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
      // Reset defaults on open
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime(EVENT_DEFAULTS.start_time);
      setEndTime(EVENT_DEFAULTS.end_time);
      setTitle('');
      setVenueId('');
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
        created_by_id: personId,
        updated_at: new Date().toISOString(),
        updated_by_id: personId
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
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-neutral-900 z-10 pb-2 border-b border-neutral-800">
          <h3 className="text-2xl font-bold text-white">Quick Add Event</h3>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form className="space-y-6">
          <Input label="Event Name" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friday Night Live" />
          
          <SearchableSelect
            label="Venue"
            required
            value={venueId}
            onChange={setVenueId}
            options={venues}
            placeholder="Select a venue..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Start" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <Input label="End" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex-1 flex items-center gap-3 p-4 bg-neutral-800 rounded-xl border border-neutral-700 cursor-pointer group hover:border-neutral-600 transition-colors">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="sr-only" />
              <div className={cn(
                "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                isPublic ? "bg-blue-600 border-blue-600" : "bg-neutral-900 border-neutral-600 group-hover:border-neutral-500"
              )}>
                {isPublic && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
              </div>
              <span className="font-semibold text-white">Public Event</span>
            </label>

            <label className="flex-1 flex items-center gap-3 p-4 bg-neutral-800 rounded-xl border border-neutral-700 cursor-pointer group hover:border-neutral-600 transition-colors">
              <input type="checkbox" checked={hasMultipleActs} onChange={(e) => setHasMultipleActs(e.target.checked)} className="sr-only" />
              <div className={cn(
                "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                hasMultipleActs ? "bg-blue-600 border-blue-600" : "bg-neutral-900 border-neutral-600 group-hover:border-neutral-500"
              )}>
                {hasMultipleActs && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
              </div>
              <span className="font-semibold text-white">Multiple Acts</span>
            </label>
          </div>

          <Scratchpad />
          
          <div className="pt-6 border-t border-neutral-800 flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="sm:w-auto w-full">Cancel</Button>
            <div className="flex-1 flex flex-col sm:flex-row gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={(e) => handleSave(e, 'another')} disabled={saving} className="w-full sm:w-auto">Save & Add Another</Button>
              <Button type="button" variant="secondary" onClick={(e) => handleSave(e, 'open')} disabled={saving} className="w-full sm:w-auto">Save & Open</Button>
              <Button type="button" onClick={(e) => handleSave(e, 'close')} disabled={saving} className="w-full sm:w-auto">Save & Close</Button>
            </div>
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
      </div>
    </div>
  );
}
