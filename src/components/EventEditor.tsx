import React, { useState } from 'react';
import { AppEvent } from '../types';
import { BandConfirmationPanel } from './ui/BandConfirmationPanel';
import EventProfileEditor from './EventProfileEditor';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export default function EventEditor({ event, isCopying, intent, onClose, onSave }: { event?: AppEvent, isCopying?: boolean, intent?: string, onClose: () => void, onSave: () => void }) {
  const [currentEvent, setCurrentEvent] = useState(event || { title: 'New Event', start_time: new Date().toISOString() } as AppEvent);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
    onClose();
  };

  const getContextLabel = (intent?: string) => {
    switch (intent) {
      case 'reviewVenue': return 'Reviewing Venue Details';
      case 'reviewBand': return 'Reviewing Band Confirmation';
      case 'editDetails': return 'Editing Event Details';
      case 'editPromo': return 'Editing Promo Assets';
      default: return 'Edit Event';
    }
  };

  const isReady = event?.is_published || (event?.venue_confirmed && event?.band_confirmed && event?.start_time && event?.hero_url);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">{currentEvent.title}</h2>
            <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${isReady ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
              {isReady ? 'Ready' : 'Needs Attention'}
            </span>
          </div>
          {intent && intent !== 'editEvent' && (
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
              {getContextLabel(intent)}
            </span>
          )}
        </div>
        
        {intent === 'reviewBand' ? (
          currentEvent && <BandConfirmationPanel event={currentEvent} intent={intent} onUpdate={onSave} />
        ) : (
          <EventProfileEditor eventId={currentEvent.id || ''} onSaveSuccess={onSave} />
        )}

        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Close</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save & Close'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
