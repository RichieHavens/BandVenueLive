import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Star, User, Heart } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

export function MusiciansView() {
  const { user } = useAuth();
  const [musicians, setMusicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMusicians();
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
        .eq('target_type', 'musician');
      if (data) {
        setFavorites(new Set(data.map(f => f.target_id)));
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  }

  async function fetchMusicians() {
    try {
      const { data } = await supabase
        .from('musician_details')
        .select(`
          *,
          people (
            id,
            first_name,
            last_name,
            profiles (
              avatar_url
            )
          )
        `);
      
      if (data) {
        // Map to a flatter structure for the UI
        const mapped = data.map(m => ({
          id: m.id,
          first_name: m.people?.first_name,
          last_name: m.people?.last_name,
          avatar_url: m.people?.profiles?.avatar_url,
          musician_details: [m]
        }));
        setMusicians(mapped);
      }
    } catch (err) {
      console.error('Error fetching musicians:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite(musicianId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      alert('Please sign in to favorite');
      return;
    }

    const isFav = favorites.has(musicianId);
    try {
      if (isFav) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', musicianId)
          .eq('target_type', 'musician');
        const newFavs = new Set(favorites);
        newFavs.delete(musicianId);
        setFavorites(newFavs);
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            target_id: musicianId,
            target_type: 'musician'
          });
        const newFavs = new Set(favorites);
        newFavs.add(musicianId);
        setFavorites(newFavs);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  }

  const filtered = musicians.filter(m => !showFavorites || favorites.has(m.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-4xl font-bold tracking-tight">Musicians</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((m) => (
            <div key={m.id} className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex items-center gap-4 hover:border-neutral-700 transition-all group relative">
              <div className="w-16 h-16 rounded-full bg-neutral-800 overflow-hidden shrink-0">
                <img 
                  src={m.avatar_url || `https://picsum.photos/seed/musician${m.id}/200/200`} 
                  alt={`${m.first_name} ${m.last_name}`} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white">{m.first_name} {m.last_name}</h4>
                <p className="text-neutral-400 text-xs">
                  {m.musician_details?.[0]?.instruments?.join(' • ') || 'Musician'}
                  {m.musician_details?.[0]?.looking_for_bands && ' • Looking for Band'}
                </p>
              </div>
              <button
                onClick={(e) => toggleFavorite(m.id, e)}
                className={`p-2 rounded-full hover:bg-neutral-800 transition-colors ${favorites.has(m.id) ? 'text-blue-500' : 'text-neutral-600'}`}
              >
                <Heart size={18} fill={favorites.has(m.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-3xl p-12 text-center">
          <User className="mx-auto text-neutral-800 mb-4" size={48} />
          <p className="text-neutral-500 text-sm font-medium">
            {showFavorites ? "No favorites yet." : "No musicians found."}
          </p>
        </div>
      )}
    </div>
  );
}
