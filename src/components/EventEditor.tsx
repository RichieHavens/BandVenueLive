import React, { useState } from 'react';
import { AppEvent } from '../types';
import { BandConfirmationPanel } from './ui/BandConfirmationPanel';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export default function EventEditor({ event, isCopying, onClose, onSave }: { event?: AppEvent, isCopying?: boolean, onClose: () => void, onSave: () => void }) {
  const [currentEvent, setCurrentEvent] = useState(event || { title: 'New Event', start_time: new Date().toISOString() } as AppEvent);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl p-8 space-y-6">
        <h2 className="text-2xl font-bold">{currentEvent.title}</h2>
        
        {event && <BandConfirmationPanel event={currentEvent} onUpdate={onSave} />}

        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </Card>
    </div>
  );
}
