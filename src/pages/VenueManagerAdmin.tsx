import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import EventManager from '../components/EventManager';
import VenueProfileEditor from '../components/VenueProfileEditor';
import RolePersonalizedHeader from '../components/RolePersonalizedHeader';
import VenueManagerDashboard from '../components/VenueManagerDashboard';
import { LayoutDashboard, Calendar, MapPin, Loader2, ChevronRight, Building2, UserCircle, Search, ShieldCheck } from 'lucide-react';
import { Venue } from '../types';
import { displayAddress } from '../lib/geo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function VenueManagerAdmin() {
  const { profile, activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchVenues() {
      if (profile?.id) {
        setLoading(true);
        try {
          // Fetch venues where the user is the manager_id
          const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('manager_id', profile.id)
            .order('name');
          
          if (error) throw error;
          
          if (data) {
            setVenues(data);
            // If only one venue, auto-select it
            if (data.length === 1 && !venueId) {
              setVenueId(data[0].id);
            }
          }
        } catch (err) {
          console.error('Error fetching managed venues:', err);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchVenues();
  }, [profile?.id]);

  const selectedVenue = venues.find(v => v.id === venueId);
  const filteredVenues = venues.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  if (activeRole !== 'venue_manager' && activeRole !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="bg-red-600/10 p-6 rounded-3xl mb-6">
          <ShieldCheck className="text-red-500" size={48} />
        </div>
        <h2 className="text-3xl font-bold mb-4 text-white">Access Denied</h2>
        <p className="text-neutral-400 max-w-md mx-auto leading-relaxed">
          You do not have the required permissions to access the Venue Manager dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <RolePersonalizedHeader pageId="venue-manager" />

      <nav className="flex gap-4 border-b border-neutral-700 pb-4 overflow-x-auto no-scrollbar">
        <Button
          variant={activeTab === 'dashboard' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2"
        >
          <LayoutDashboard size={18} />
          Dashboard
        </Button>
        <Button
          variant={activeTab === 'venues' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('venues')}
          className="flex items-center gap-2"
        >
          <Building2 size={18} />
          My Venues
        </Button>
        <Button
          variant={activeTab === 'events' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('events')}
          className="flex items-center gap-2"
        >
          <Calendar size={18} />
          Events
        </Button>
        <Button
          variant={activeTab === 'profile' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('profile')}
          className="flex items-center gap-2"
        >
          <UserCircle size={18} />
          Venue Profile
        </Button>
      </nav>

      <main>
        {activeTab === 'dashboard' && (
          <VenueManagerDashboard 
            venues={venues} 
            onNavigate={(tab, id) => {
              if (id) setVenueId(id);
              setActiveTab(tab);
            }} 
          />
        )}

        {activeTab === 'venues' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-white">My Managed Venues</h2>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <Input
                  placeholder="Search your venues..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-cyan-400" size={48} />
              </div>
            ) : filteredVenues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredVenues.map((venue) => (
                  <Card 
                    key={venue.id}
                    className={`flex gap-6 p-6 transition-all group ${
                      venueId === venue.id ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <div className="w-24 h-24 rounded-2xl bg-neutral-900 overflow-hidden shrink-0">
                      <img 
                        src={venue.logo_url || `https://picsum.photos/seed/venue${venue.id}/200/200`} 
                        alt={venue.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold mb-1 truncate text-white">{venue.name}</h3>
                      <p className="text-neutral-400 text-sm mb-4 truncate">{displayAddress(venue.address)}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setVenueId(venue.id);
                            setActiveTab('events');
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Manage
                        </Button>
                        <span className="text-neutral-700">|</span>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setVenueId(venue.id);
                            setActiveTab('profile');
                          }}
                          className="text-xs text-neutral-400 hover:text-white"
                        >
                          Profile
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Building2 className="mx-auto text-neutral-600 mb-4" size={48} />
                <p className="text-neutral-400">No venues found matching your search.</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          venueId ? (
            <EventManager venueId={venueId} />
          ) : (
            <Card className="p-12 text-center text-neutral-400">
              <Calendar className="mx-auto mb-4 opacity-20" size={48} />
              <p>Please select a venue from the "My Venues" tab first.</p>
            </Card>
          )
        )}

        {activeTab === 'profile' && (
          venueId ? (
            <VenueProfileEditor venueId={venueId} hideDropdown={true} />
          ) : (
            <Card className="p-12 text-center text-neutral-400">
              <UserCircle className="mx-auto mb-4 opacity-20" size={48} />
              <p>Please select a venue from the "My Venues" tab first.</p>
            </Card>
          )
        )}
      </main>
    </div>
  );
}
