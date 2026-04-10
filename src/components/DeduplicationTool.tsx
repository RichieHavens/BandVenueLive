import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { AppEvent, Venue, Band } from '../types';
import { Loader2, Trash2, Merge, AlertCircle, CheckCircle, ChevronRight, Info, History, Clock } from 'lucide-react';
import { formatDate, formatTime } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface DuplicateGroup {
  key: string;
  events: AppEvent[];
}

interface MergeLog {
  id: string;
  created_at: string;
  changes: {
    type: 'merge';
    master_id: string;
    master_title: string;
    duplicate_ids: string[];
    details: {
      acts_moved: number;
      genres_moved: number;
      sponsors_moved: number;
    };
  };
}

export default function DeduplicationTool() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [venues, setVenues] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [recentMerges, setRecentMerges] = useState<MergeLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchPotentialDuplicates();
    fetchVenues();
    fetchRecentMerges();
  }, []);

  async function fetchRecentMerges() {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'events_merge')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setRecentMerges(data as any);
    }
  }

  async function fetchVenues() {
    const { data } = await supabase.from('venues').select('id, name');
    if (data) {
      const venueMap: Record<string, string> = {};
      data.forEach(v => venueMap[v.id] = v.name);
      setVenues(venueMap);
    }
  }

  async function fetchPotentialDuplicates() {
    setLoading(true);
    try {
      // Fetch all events
      const { data: allEvents, error } = await supabase
        .from('events')
        .select('*, acts(start_time)');

      if (error) throw error;
      if (!allEvents) return;

      // Group events by title, venue, and date
      const groupsMap: Record<string, AppEvent[]> = {};
      
      allEvents.forEach(event => {
        const eventStartTime = event.start_time || event.acts?.[0]?.start_time || event.created_at;
        const date = eventStartTime ? new Date(eventStartTime).toISOString().split('T')[0] : 'no-date';
        const key = `${event.title.toLowerCase().trim()}|${event.venue_id}|${date}`;
        
        if (!groupsMap[key]) {
          groupsMap[key] = [];
        }
        groupsMap[key].push({
          ...event,
          start_time: eventStartTime
        });
      });

      // Filter groups with more than one event
      const duplicateGroups: DuplicateGroup[] = Object.entries(groupsMap)
        .filter(([_, events]) => events.length > 1)
        .map(([key, events]) => ({ key, events }));

      setGroups(duplicateGroups);
    } catch (error) {
      console.error('Error fetching duplicates:', error);
      setMessage({ type: 'error', text: 'Failed to fetch potential duplicates.' });
    } finally {
      setLoading(false);
    }
  }

  async function mergeEvents(masterEvent: AppEvent, duplicates: AppEvent[]) {
    setMerging(masterEvent.id);
    setMessage(null);
    
    const stats = {
      acts_moved: 0,
      genres_moved: 0,
      sponsors_moved: 0
    };

    try {
      const duplicateIds: string[] = [];
      for (const duplicate of duplicates) {
        if (duplicate.id === masterEvent.id) continue;
        duplicateIds.push(duplicate.id);

        // 1. Move acts
        const { data: acts } = await supabase.from('acts').select('*').eq('event_id', duplicate.id);
        if (acts && acts.length > 0) {
          for (const act of acts) {
            const { data: existingAct } = await supabase
              .from('acts')
              .select('id')
              .eq('event_id', masterEvent.id)
              .eq('band_id', act.band_id)
              .maybeSingle();

            if (!existingAct) {
              const { error: moveError } = await supabase.from('acts').update({ event_id: masterEvent.id }).eq('id', act.id);
              if (moveError) throw moveError;
              stats.acts_moved++;
            } else {
              const { error: deleteError } = await supabase.from('acts').delete().eq('id', act.id);
              if (deleteError) throw deleteError;
            }
          }
        }

        // 2. Move genres
        const { data: genres } = await supabase.from('event_genres').select('*').eq('event_id', duplicate.id);
        if (genres && genres.length > 0) {
          for (const genre of genres) {
            const { data: existingGenre } = await supabase
              .from('event_genres')
              .select('event_id, genre_id')
              .eq('event_id', masterEvent.id)
              .eq('genre_id', genre.genre_id)
              .maybeSingle();

            if (!existingGenre) {
              const { error: moveError } = await supabase.from('event_genres').update({ event_id: masterEvent.id }).eq('event_id', duplicate.id).eq('genre_id', genre.genre_id);
              if (moveError) throw moveError;
              stats.genres_moved++;
            } else {
              const { error: deleteError } = await supabase.from('event_genres').delete().eq('event_id', duplicate.id).eq('genre_id', genre.genre_id);
              if (deleteError) throw deleteError;
            }
          }
        }

        // 3. Move sponsors
        const { data: sponsors } = await supabase.from('event_sponsors').select('*').eq('event_id', duplicate.id);
        if (sponsors && sponsors.length > 0) {
          for (const sponsor of sponsors) {
            const { data: existingSponsor } = await supabase
              .from('event_sponsors')
              .select('event_id, sponsor_id')
              .eq('event_id', masterEvent.id)
              .eq('sponsor_id', sponsor.sponsor_id)
              .maybeSingle();

            if (!existingSponsor) {
              const { error: moveError } = await supabase.from('event_sponsors').update({ event_id: masterEvent.id }).eq('event_id', duplicate.id).eq('sponsor_id', sponsor.sponsor_id);
              if (moveError) throw moveError;
              stats.sponsors_moved++;
            } else {
              const { error: deleteError } = await supabase.from('event_sponsors').delete().eq('event_id', duplicate.id).eq('sponsor_id', sponsor.sponsor_id);
              if (deleteError) throw deleteError;
            }
          }
        }

        // 4. Delete duplicate event
        const { error: deleteError } = await supabase.from('events').delete().eq('id', duplicate.id);
        if (deleteError) throw deleteError;
      }

      // Log the merge
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        table_name: 'events_merge',
        record_id: masterEvent.id,
        changes: {
          type: 'merge',
          master_id: masterEvent.id,
          master_title: masterEvent.title,
          duplicate_ids: duplicateIds,
          details: stats
        }
      });

      setMessage({ 
        type: 'success', 
        text: `Successfully merged ${duplicateIds.length} events! Moved ${stats.acts_moved} acts, ${stats.genres_moved} genres, and ${stats.sponsors_moved} sponsors.` 
      });
      fetchPotentialDuplicates();
      fetchRecentMerges();
    } catch (error) {
      console.error('Error merging events:', error);
      setMessage({ type: 'error', text: 'Failed to merge events. Some data might have been partially moved.' });
    } finally {
      setMerging(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">Event Deduplication</h3>
          <p className="text-neutral-400 text-sm mt-1">Identify and merge duplicate events based on title, venue, and date.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={showHistory ? 'primary' : 'secondary'}
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2"
          >
            <History size={16} />
            History
          </Button>
          <Button 
            onClick={fetchPotentialDuplicates}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Merge size={16} />}
            Refresh
          </Button>
        </div>
      </div>

      {showHistory && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-neutral-400 font-bold uppercase tracking-widest text-xs">
            <Clock size={14} />
            Recent Merge History
          </div>
          <div className="space-y-2">
            {recentMerges.length === 0 ? (
              <p className="text-neutral-400 text-sm italic">No recent merges found.</p>
            ) : (
              recentMerges.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-neutral-200">
                      Merged into: <span className="text-blue-500">{log.changes.master_title}</span>
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      {log.changes.duplicate_ids.length} duplicates removed • {log.changes.details.acts_moved} acts moved
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-400">{formatDate(log.created_at)} at {formatTime(log.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={48} />
        </div>
      ) : groups.length === 0 ? (
        <Card className="text-center py-20">
          <Info className="mx-auto text-neutral-600 mb-4" size={48} />
          <h4 className="text-lg font-bold text-neutral-400">No duplicates found</h4>
          <p className="text-neutral-400 text-sm">Everything looks clean!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group, idx) => (
            <Card key={group.key} className="overflow-hidden">
              <div className="p-6 border-b border-neutral-700 bg-neutral-900/50 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-lg text-white">{group.events[0].title}</h4>
                  <p className="text-neutral-400 text-sm">
                    {venues[group.events[0].venue_id] || 'Unknown Venue'} • {formatDate(group.events[0].start_time)}
                  </p>
                </div>
                <div className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-bold uppercase tracking-widest">
                  {group.events.length} Duplicates
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-neutral-400 italic mb-4">Select the "Master" record to keep. All other records will be merged into it and then deleted.</p>
                <div className="grid gap-3">
                  {group.events.map(event => (
                    <div 
                      key={event.id} 
                      className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${merging === event.id ? 'opacity-50 pointer-events-none' : ''} border-neutral-700 bg-neutral-900/50`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <span>{venues[event.venue_id] || 'Unknown Venue'}</span>
                          <span className="text-neutral-600">•</span>
                          <span>{event.start_time ? formatDate(event.start_time) : 'No Date'}</span>
                          <span className="text-neutral-600">•</span>
                          <span>{event.start_time ? formatTime(event.start_time) : 'No Time'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                          <span>Created: {formatDate(event.created_at)} at {formatTime(event.created_at)}</span>
                          {event.is_published && <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-[10px] font-bold uppercase">Published</span>}
                        </div>
                      </div>
                      <Button
                        onClick={() => mergeEvents(event, group.events)}
                        disabled={!!merging}
                        className="w-40"
                      >
                        {merging === event.id ? <Loader2 className="animate-spin" size={14} /> : <Merge size={14} />}
                        Keep as Master
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
