import React from 'react';
import { Heart } from 'lucide-react';

export function FavoritesView() {
  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold tracking-tight">My Favorites</h2>
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
        <Heart className="mx-auto text-neutral-700 mb-4" size={48} />
        <p className="text-neutral-400">You haven't added any favorites yet.</p>
      </div>
    </div>
  );
}
