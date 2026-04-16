import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Venue } from '../types';
import { Search, Loader2, MapPin, Star } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { Button } from '../components/ui/Button';
import { useAuth } from '../AuthContext';

export function VenuesView() {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  React.useEffect(() => {
    fetchVenues();
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  async function fetchFavorites() {
    try {
      const { data } = await supabase
        .from('favorites')
        .select('target_id')
        .eq('user_id', user?.id)
        .eq('target_type', 'venue');
      if (data) {
        setFavorites(new Set(data.map(f => f.target_id)));
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  }

  async function fetchVenues() {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
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

  const filtered = venues.filter(v => {
    const matchesSearch = (v.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesFavorites = !showFavorites || favorites.has(v.id);
    return matchesSearch && matchesFavorites;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-4xl font-bold tracking-tight">Venues</h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          <button
            onClick={() => setShowFavorites(false)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              !showFavorites 
                ? "bg-neutral-800 text-white shadow-sm" 
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            All
          </button>
          <button
            onClick={() => setShowFavorites(true)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              showFavorites 
                ? "bg-blue-600 text-white shadow-sm" 
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            <Star size={12} fill={showFavorites ? 'currentColor' : 'none'} />
            Favorites
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={48} /></div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((venue) => {
            const defaultVenueLogo = `https://picsum.photos/seed/venue-logo-${venue.id}/200/200`;
            return (
              <div 
                key={venue.id} 
                className="flex gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-neutral-700 transition-all group cursor-pointer"
                onClick={() => {
                  setSelectedVenue(venue);
                  setIsPreviewOpen(true);
                }}
              >
                <div className="w-24 h-24 rounded-xl bg-neutral-800 overflow-hidden shrink-0">
                  <img 
                    src={venue.logo_url || venue.images?.[0] || defaultVenueLogo} 
                    alt={venue.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(venue as any).genres?.map((g: string) => (
                      <span key={g} className="text-[9px] font-black uppercase tracking-widest text-blue-500/70">{g}</span>
                    ))}
                  </div>
                  <h3 className="text-xl font-bold mb-0.5 truncate">{venue.name}</h3>
                  <p className="text-neutral-400 text-xs mb-2 truncate">{[venue.address_line1, venue.city, venue.state].filter(Boolean).join(', ')}</p>
                  <p className="text-neutral-400 line-clamp-2 text-xs leading-relaxed">{venue.description}</p>
                  {(venue as any).updated_at && (
                    <p className="text-[9px] text-neutral-600 mt-2">
                      Updated: {formatDate((venue as any).updated_at)} 
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-3xl p-12 text-center">
          <MapPin className="mx-auto text-neutral-800 mb-4" size={48} />
          <p className="text-neutral-500 text-sm font-medium">
            {showFavorites ? "No favorites yet." : "No venues found."}
          </p>
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
