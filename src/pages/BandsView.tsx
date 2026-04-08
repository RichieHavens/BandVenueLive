import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Band } from '../types';
import { Search, Loader2, Music, Filter, Star } from 'lucide-react';
import { formatDate } from '../lib/utils';
import ProfilePreviewModal from '../components/ProfilePreviewModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function BandsView() {
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedBand, setSelectedBand] = useState<Band | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  React.useEffect(() => {
    fetchBands();
  }, []);

  async function fetchBands() {
    try {
      const { data, error } = await supabase
        .from('bands')
        .select('*, band_genres(genres(name)), profiles!updated_by(first_name, last_name)')
        .eq('is_published', true)
        .or('is_archived.is.null,is_archived.eq.false')
        .order('name');
      if (error) throw error;
      if (data) {
        const processed = data.map(b => ({
          ...b,
          genres: (b as any).band_genres?.map((bg: any) => bg.genres?.name).filter(Boolean) || []
        }));
        setBands(processed);
      }
    } catch (err: any) {
      console.error('Error fetching bands:', err.message || err);
    } finally {
      setLoading(false);
    }
  }

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    bands.forEach(b => (b as any).genres?.forEach((g: string) => genres.add(g)));
    return ['All', ...Array.from(genres).sort()];
  }, [bands]);

  const filtered = bands.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || (b as any).genres?.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-4xl font-bold tracking-tight text-white">Local Bands</h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <Input
              type="text"
              placeholder="Enter Band Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-neutral-400" />
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-cyan-400 outline-none text-white"
            >
              {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <Button
            variant={showFavorites ? 'primary' : 'secondary'}
            onClick={() => setShowFavorites(!showFavorites)}
            className="flex items-center gap-2"
          >
            <Star size={18} fill={showFavorites ? 'currentColor' : 'none'} />
            <span className="text-sm font-medium">Favorites</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-400" size={48} /></div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filtered.map((band) => {
            const defaultBandLogo = `https://picsum.photos/seed/band-logo-${band.id}/200/200`;
            return (
              <div 
                key={band.id} 
                className="flex gap-6 p-6 bg-neutral-800/50 border border-neutral-700 rounded-3xl hover:border-neutral-600 transition-all group cursor-pointer"
                onClick={() => {
                  setSelectedBand(band);
                  setIsPreviewOpen(true);
                }}
              >
                <div className="w-32 h-32 rounded-2xl bg-neutral-900 overflow-hidden shrink-0">
                  <img 
                    src={band.logo_url || band.images?.[0] || defaultBandLogo} 
                    alt={band.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(band as any).genres?.map((g: string) => (
                      <span key={g} className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/70">{g}</span>
                    ))}
                  </div>
                  <h3 className="text-2xl font-bold mb-1 text-white">{band.name}</h3>
                  {(band.city || band.state) && (
                    <p className="text-neutral-400 text-sm mb-3">
                      {[band.city, band.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p className="text-neutral-400 line-clamp-2 text-sm">{band.description}</p>
                  {(band as any).updated_at && (
                    <p className="text-[10px] text-neutral-600 mt-2">
                      Updated: {formatDate((band as any).updated_at)} 
                      {(band as any).profiles?.first_name ? ` by ${(band as any).profiles.first_name} ${(band as any).profiles.last_name}` : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-3xl p-12 text-center">
          <Music className="mx-auto text-neutral-600 mb-4" size={48} />
          <p className="text-neutral-400">No bands found.</p>
        </div>
      )}

      <ProfilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        type="band"
        data={selectedBand}
      />
    </div>
  );
}
