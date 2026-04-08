import React from 'react';
import { Globe } from 'lucide-react';

export function SyndicationManagerView() {
  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold tracking-tight">Syndication Management</h2>
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
        <Globe className="mx-auto text-neutral-700 mb-4" size={48} />
        <h3 className="text-xl font-bold mb-2">Manage Your Syndication Feeds</h3>
        <p className="text-neutral-400 max-w-md mx-auto mb-8">Configure how and where your event data is displayed on external partner sites.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="p-6 bg-neutral-800 rounded-2xl">
            <h4 className="font-bold mb-2">Feed URL</h4>
            <code className="text-xs text-red-500 bg-black/50 p-2 rounded block">https://api.bandvenue.com/v1/feed/your-id</code>
          </div>
          <div className="p-6 bg-neutral-800 rounded-2xl">
            <h4 className="font-bold mb-2">Active Locations</h4>
            <p className="text-sm text-neutral-400">3 external sites currently displaying your feed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
