import React, { useState } from 'react';
import { Plus, Loader2, Save, X, Calendar, Clock, MapPin, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { VenueEventProfile } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';

export default function VenueEventAdminTool({ venueId }: { venueId: string }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<VenueEventProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [formData, setFormData] = useState<Partial<VenueEventProfile>>({
    title: '',
    description: '',
    start_time: new Date().toISOString().split('T')[0] + 'T20:00',
    doors_open_time: '19:00',
    cover_charge: 0,
    overall_status: 'draft',
    has_multiple_acts: false,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('venue_event_profiles')
      .insert({
        ...formData,
        venue_id: venueId,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving event:', error);
    } else {
      setEvents([...events, data]);
      setShowEditor(false);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Venue Event Admin Tool</h2>
        <Button 
          onClick={() => setShowEditor(true)}
          size="sm"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">New Event</span>
        </Button>
      </div>
      
      {showEditor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSave} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl w-full max-w-lg space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">New Event</h3>
              <button type="button" onClick={() => setShowEditor(false)} className="p-2 text-neutral-400 hover:text-white rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <Input 
                label="Event Title"
                type="text" 
                placeholder="e.g. Friday Night Live" 
                value={formData.title || ''}
                onChange={e => setFormData({...formData, title: e.target.value})}
                required
              />
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Description</label>
                <Textarea 
                  placeholder="Tell us about the event..." 
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="Start Time"
                  type="datetime-local" 
                  value={formData.start_time || ''}
                  onChange={e => setFormData({...formData, start_time: e.target.value})}
                  required
                />
                <Input 
                  label="Doors Open"
                  type="time" 
                  value={formData.doors_open_time || ''}
                  onChange={e => setFormData({...formData, doors_open_time: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
              <Button type="button" variant="secondary" onClick={() => setShowEditor(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Save Event
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
