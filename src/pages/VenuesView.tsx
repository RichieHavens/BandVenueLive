import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Venue } from '../types';
import { Search, Loader2, MapPin } from 'lucide-react';
import { displayAddress } from '../lib/geo';
import { formatDate } from '../lib/utils';
import ProfilePreviewModal from '../components/ProfilePreviewModal';

export function VenuesView() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  React.useEffect(() => {
    fetchVenues();
  }, []);

  async function fetchVenues() {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*, venue_genres(genres(name)), profiles!updated_by(first_name, last_name)')
        .or('is_archived.is.null,is_archived.eq.false')
        .order('name');
      if (error) {
        console.error('Supabase error fetching venues:', error);
        alert(`Error fetching venues: ${error.message}`);
        throw error;
      }
      if (data) {
        const processed = data.map(v => ({
          ...v,
          genres: (v as any).venue_genres?.map((vg: any) => vg.genres?.name).filter(Boolean) || []
        }));
        setVenues(processed);
      }
    } catch (err: any) {
      console.error('Error fetching venues:', err.message || err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = venues.filter(v => (v.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-4xl font-bold tracking-tight">Venues</h2>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder="Search venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-12 pr-4 text-sm focus:ring-2 focus:ring-red-600 outline-none transition-all"
          />
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-500" size={48} /></div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filtered.map((venue) => {
            const defaultVenueLogo = `https://picsum.photos/seed/venue-logo-${venue.id}/200/200`;
            return (
              <div 
                key={venue.id} 
                className="flex gap-6 p-6 bg-neutral-900 border border-neutral-800 rounded-3xl hover:border-neutral-700 transition-all group cursor-pointer"
                onClick={() => {
                  setSelectedVenue(venue);
                  setIsPreviewOpen(true);
                }}
              >
                <div className="w-32 h-32 rounded-2xl bg-neutral-800 overflow-hidden shrink-0">
                  <img 
                    src={venue.logo_url || venue.images?.[0] || defaultVenueLogo} 
                    alt={venue.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(venue as any).genres?.map((g: string) => (
                      <span key={g} className="text-[10px] font-bold uppercase tracking-widest text-red-500/70">{g}</span>
                    ))}
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{venue.name}</h3>
                  <p className="text-neutral-400 text-sm mb-3">{displayAddress(venue.address)}</p>
                  <p className="text-neutral-400 line-clamp-2 text-sm">{venue.description}</p>
                  {(venue as any).updated_at && (
                    <p className="text-[10px] text-neutral-600 mt-2">
                      Updated: {formatDate((venue as any).updated_at)} 
                      {(venue as any).profiles?.first_name ? ` by ${(venue as any).profiles.first_name} ${(venue as any).profiles.last_name}` : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
          <MapPin className="mx-auto text-neutral-700 mb-4" size={48} />
          <p className="text-neutral-400">No venues found.</p>
        </div>
      )}

      <ProfilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        type="venue"
        data={selectedVenue}
      />
    </div>
  );
}
