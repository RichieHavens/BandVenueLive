import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Venue } from '../types';
import { Building2, Loader2, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { VenueEventsList } from './VenueEventsList';
import VenueProfileEditor from './VenueProfileEditor';
import { VenueDashboardSummary } from './VenueDashboardSummary';
import { BookingTeaser } from './BookingTeaser';

interface VenueWorkspaceLayoutProps {
  venues: Venue[];
  loading: boolean;
  eventCounts: Record<string, number>;
}

export default function VenueWorkspaceLayout({ venues, loading, eventCounts }: VenueWorkspaceLayoutProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(venues.length > 0 ? venues[0].id : null);
  const [selectedAction, setSelectedAction] = useState<'view-profile' | 'edit-profile' | 'view-events'>('view-events');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!selectedVenueId && venues.length > 0) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId]);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  const selectedVenue = venues.find(v => v.id === selectedVenueId);

  const actionLabels = {
    'view-profile': 'Profile',
    'edit-profile': 'Edit',
    'view-events': 'Events'
  };

  const VenueList = () => (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 px-2">My Venues</h2>
      {venues.map(venue => (
        <div key={venue.id} className={cn("p-3 rounded-2xl border transition-all", selectedVenueId === venue.id ? "bg-neutral-900 border-blue-600 ring-1 ring-blue-600" : "bg-neutral-950 border-neutral-800 hover:border-neutral-700")}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center">
              <Building2 size={16} className="text-neutral-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{venue.name}</h3>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button 
              onClick={() => { setSelectedVenueId(venue.id); setSelectedAction('view-profile'); setIsDrawerOpen(false); }} 
              className={cn("text-[10px] py-1 px-1 rounded", selectedAction === 'view-profile' && selectedVenueId === venue.id ? "bg-blue-900 text-blue-100" : "bg-neutral-800 hover:bg-neutral-700")}
            >
              Profile
            </button>
            <button 
              onClick={() => { setSelectedVenueId(venue.id); setSelectedAction('edit-profile'); setIsDrawerOpen(false); }} 
              className={cn("text-[10px] py-1 px-1 rounded", selectedAction === 'edit-profile' && selectedVenueId === venue.id ? "bg-blue-900 text-blue-100" : "bg-neutral-800 hover:bg-neutral-700")}
            >
              Edit
            </button>
            <button 
              onClick={() => { setSelectedVenueId(venue.id); setSelectedAction('view-events'); setIsDrawerOpen(false); }} 
              className={cn("text-[10px] py-1 px-1 rounded", selectedAction === 'view-events' && selectedVenueId === venue.id ? "bg-blue-900 text-blue-100" : "bg-neutral-800 hover:bg-neutral-700")}
            >
              Events ({eventCounts[venue.id] || 0})
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row gap-6">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-neutral-900 rounded-2xl mb-4">
        <div className="truncate">
          <h3 className="font-bold text-white truncate">{selectedVenue?.name || 'Select Venue'}</h3>
          <p className="text-xs text-neutral-400">{selectedAction ? actionLabels[selectedAction] : ''}</p>
        </div>
        <button onClick={() => setIsDrawerOpen(!isDrawerOpen)} className="p-2 bg-neutral-800 rounded-lg">
          {isDrawerOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-neutral-950 p-6 overflow-y-auto">
          <div className="flex justify-end mb-6">
            <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-neutral-800 rounded-lg"><X size={20} /></button>
          </div>
          <VenueList />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0 overflow-y-auto pr-2">
        <VenueList />
      </div>

      {/* Right Workspace */}
      <div className="flex-1 bg-neutral-950 rounded-3xl border border-neutral-800 p-8">
        {selectedVenue ? (
          <>
            {selectedAction === 'view-events' && (
              <>
                <VenueDashboardSummary />
                <VenueEventsList venueId={selectedVenue.id} venueIds={venues.map(v => v.id)} />
                <BookingTeaser />
              </>
            )}
            {selectedAction === 'edit-profile' && <VenueProfileEditor venueId={selectedVenue.id} onSaveSuccess={() => {}} onDirtyChange={() => {}} />}
            {selectedAction === 'view-profile' && <div className="text-neutral-400">Venue Profile View (Not implemented yet)</div>}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-500">Select a venue to manage</div>
        )}
      </div>
    </div>
  );
}
