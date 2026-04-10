import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export function BookingTeaser() {
  return (
    <Card className="p-6 mt-8 border-blue-900/30 bg-blue-950/10">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-900/20 rounded-2xl">
          <Sparkles className="text-blue-500" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">Book More Music</h3>
          <p className="text-neutral-400 text-sm mt-1 mb-4">
            BandVenue will soon help you identify and fill open music slots faster.
          </p>
          <Button variant="secondary" size="sm" disabled className="opacity-50">
            Coming Soon
          </Button>
        </div>
      </div>
    </Card>
  );
}
