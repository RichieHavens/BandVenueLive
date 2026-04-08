import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AppEvent, Band } from '../types';
import { Save, AlertCircle, Loader2, Music, Check, X, Calendar, Clock, MapPin } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { StatusBadge } from './ui/StatusBadge';
import { formatDate, getTimeFromDate } from '../lib/utils';

interface BandConfirmationPageProps {
  eventId: string;
}

export default function BandConfirmationPage({ eventId }: BandConfirmationPageProps) {
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  async function fetchEvent() {
    const { data, error } = await supabase
      .from('events')
      .select('*, venues(*)')
      .eq('id', eventId)
      .single();

    if (data) setEvent(data);
    setLoading(false);
  }

  async function handleConfirm() {
    setSaving(true);
    const { error } = await supabase
      .from('events')
      .update({ 
        band_confirmed: true,
        band_confirmation_status: 'confirmed',
        band_confirmed_at: new Date().toISOString()
      })
      .eq('id', eventId);
    
    if (!error) setConfirmed(true);
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-500" /></div>;
  if (!event) return <div className="p-12 text-center">Event not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Event Summary */}
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
        <div className="space-y-2 text-neutral-400">
          <div className="flex items-center gap-2"><MapPin size={18} className="text-neutral-400" /> {event.venues?.name}</div>
          <div className="flex items-center gap-2"><Calendar size={18} className="text-neutral-400" /> {formatDate(event.start_time)}</div>
          <div className="flex items-center gap-2"><Clock size={18} className="text-neutral-400" /> {getTimeFromDate(event.start_time)}</div>
        </div>
      </Card>

      {/* Confirmation Status */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Confirmation Status</h2>
        <StatusBadge status={confirmed || event.band_confirmed ? 'Ready' : 'Needs Band Confirmation'} />
      </Card>

      {/* Action */}
      {!confirmed && !event.band_confirmed && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Confirm Your Participation</h2>
          <p className="text-neutral-400 mb-6">Please review the event details and confirm your act's participation.</p>
          <div className="flex gap-4">
            <Button variant="primary" onClick={handleConfirm} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} className="text-white" />}
              Confirm Event
            </Button>
            <Button variant="secondary" className="flex-1">Decline</Button>
          </div>
        </Card>
      )}
      
      {confirmed && (
        <Card className="p-6 bg-green-900/20 border-green-500/50">
          <div className="flex items-center gap-2 text-green-500 font-bold">
            <Check size={24} />
            Event Confirmed!
          </div>
        </Card>
      )}
    </div>
  );
}
