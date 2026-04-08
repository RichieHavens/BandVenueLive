import React from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function MusiciansView() {
  const [musicians, setMusicians] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchMusicians();
  }, []);

  async function fetchMusicians() {
    const { data } = await supabase
      .from('profiles')
      .select('*, musicians(*)')
      .contains('roles', ['musician']);
    
    if (data) setMusicians(data);
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold tracking-tight">Musicians</h2>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-500" size={48} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {musicians.map((m) => (
            <div key={m.id} className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex items-center gap-4 hover:border-neutral-700 transition-all">
              <div className="w-16 h-16 rounded-full bg-neutral-800 overflow-hidden shrink-0">
                <img 
                  src={`https://picsum.photos/seed/musician${m.id}/200/200`} 
                  alt="Musician" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h4 className="font-bold">{m.first_name} {m.last_name}</h4>
                <p className="text-neutral-400 text-xs">
                  {m.musicians?.[0]?.instruments?.join(' • ') || 'Musician'}
                  {m.musicians?.[0]?.looking_for_bands && ' • Looking for Band'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
