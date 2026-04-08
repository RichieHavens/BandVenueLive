import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AppEvent } from '../../types';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../lib/utils';

interface BandConfirmationPanelProps {
  event: AppEvent;
  onUpdate: () => void;
}

export function BandConfirmationPanel({ event, onUpdate }: BandConfirmationPanelProps) {
  const [loading, setLoading] = useState(false);

  const sendRequest = async (isReminder: boolean) => {
    setLoading(true);
    
    const now = new Date().toISOString();
    const updateData: any = {
      band_confirmation_status: 'sent',
      confirmation_last_sent_at: now,
      confirmation_sent_count: (event.confirmation_sent_count || 0) + 1
    };

    if (!isReminder) {
      updateData.confirmation_requested_at = now;
    }

    try {
      // Update DB
      const { error: dbError } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', event.id);

      if (dbError) throw dbError;

      // Send Email
      const response = await fetch('/api/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandEmail: (event as any).acts?.[0]?.bands?.email || 'band@example.com', // Assuming band email is available
          bandName: (event as any).acts?.[0]?.bands?.name || 'Band',
          eventName: event.title,
          venueName: (event as any).venues?.name || 'Venue',
          eventDate: formatDate(event.start_time || ''),
          link: `${window.location.origin}/confirm-event/${event.id}`,
          isReminder
        })
      });

      if (!response.ok) throw new Error('Failed to send email');

      toast.success(isReminder ? 'Reminder sent!' : 'Confirmation request sent!');
      onUpdate();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send request');
    }
    setLoading(false);
  };

  return (
    <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Band Confirmation</h3>
        <StatusBadge status={event.band_confirmed ? 'Ready' : (event.band_confirmation_status === 'sent' ? 'Published' : 'Needs Band Confirmation')} />
      </div>

      <div className="text-sm text-neutral-400 space-y-1">
        <p>Status: {event.band_confirmation_status || 'Pending'}</p>
        {event.confirmation_last_sent_at && <p>Last sent: {formatDate(event.confirmation_last_sent_at)}</p>}
        {event.confirmation_sent_count && <p>Sent count: {event.confirmation_sent_count}</p>}
        {event.band_confirmed_at && <p>Confirmed: {formatDate(event.band_confirmed_at)}</p>}
      </div>

      {!event.band_confirmed && (
        <div className="flex gap-2">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => sendRequest(!!event.confirmation_requested_at)}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : (event.confirmation_requested_at ? <RefreshCw size={16} /> : <Mail size={16} />)}
            {event.confirmation_requested_at ? 'Resend Reminder' : 'Send Request'}
          </Button>
        </div>
      )}
    </div>
  );
}
