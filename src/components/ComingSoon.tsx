import React from 'react';
import { Lock } from 'lucide-react';

export default function ComingSoon({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-white p-6">
      <img 
        src="/bandvenue_transparent.png" 
        alt="BandVenue Logo" 
        className="h-24 w-auto mb-8 max-w-full object-contain"
        referrerPolicy="no-referrer"
      />
      <h1 className="text-4xl font-bold mb-2">Coming Soon</h1>
      <p className="text-neutral-400 mb-8">We are working hard to bring you the best experience.</p>
      
      <button 
        onClick={onUnlock}
        className="absolute top-6 right-6 p-6 text-neutral-600 hover:text-neutral-400 transition-colors opacity-0"
        title="Unlock"
      >
        <Lock size={48} />
      </button>
    </div>
  );
}
