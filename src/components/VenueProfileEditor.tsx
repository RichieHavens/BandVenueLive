import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { Venue, AppEvent } from '../types';
import { Save, Image as ImageIcon, Loader2, Plus, Trash2, MapPin, Calendar, Clock, Eye } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Card } from './ui/Card';
import { US_STATES, CA_PROVINCES, AddressParts, formatAddress, parseAddress, validateZipForState } from '../lib/geo';
import { formatDate, formatTimeString } from '../lib/utils';
import ImageUpload from './ImageUpload';
import { formatPhoneNumber } from '../lib/phoneFormatter';
import ProfilePreviewModal from './ProfilePreviewModal';
import { handleSupabaseError, OperationType } from '../lib/error-handler';

export default function VenueProfileEditor({ venueId, hideDropdown, onDirtyChange, onSaveSuccess }: { venueId?: string, hideDropdown?: boolean, onDirtyChange?: (dirty: boolean) => void, onSaveSuccess?: () => void }) {
  const { user, profile } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(venueId || null);
  const [venue, setVenue] = useState<Partial<Venue>>({
    name: '',
    description: '',
    address: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: '',
    email: '',
    website: '',
    linkedin_url: '',
    pinterest_url: '',
    youtube_url: '',
    instagram_url: '',
    apple_music_url: '',
    spotify_url: '',
    facebook_url: '',
    twitter_url: '',
    food_description: '',
    logo_url: '',
    hero_url: '',
    images: []
  });
  const [initialVenue, setInitialVenue] = useState<Partial<Venue> | null>(null);
  const [futureEvents, setFutureEvents] = useState<AppEvent[]>([]);
  const [addressParts, setAddressParts] = useState<AddressParts>(parseAddress(''));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Track if form is dirty
  useEffect(() => {
    if (!initialVenue) return;
    const isDirty = 
      venue.name !== initialVenue.name ||
      venue.description !== initialVenue.description ||
      venue.phone !== initialVenue.phone ||
      venue.email !== initialVenue.email ||
      venue.website !== initialVenue.website ||
      venue.linkedin_url !== initialVenue.linkedin_url ||
      venue.pinterest_url !== initialVenue.pinterest_url ||
      venue.youtube_url !== initialVenue.youtube_url ||
      venue.instagram_url !== initialVenue.instagram_url ||
      venue.apple_music_url !== initialVenue.apple_music_url ||
      venue.spotify_url !== initialVenue.spotify_url ||
      venue.facebook_url !== initialVenue.facebook_url ||
      venue.twitter_url !== initialVenue.twitter_url ||
      venue.food_description !== initialVenue.food_description ||
      venue.logo_url !== initialVenue.logo_url ||
      venue.hero_url !== initialVenue.hero_url ||
      formatAddress(addressParts) !== (initialVenue.address || '') ||
      JSON.stringify(venue.images) !== JSON.stringify(initialVenue.images);
    
    onDirtyChange?.(isDirty);
  }, [venue, addressParts, initialVenue, onDirtyChange]);

  useEffect(() => {
    fetchVenues();
  }, [user?.id]);

  useEffect(() => {
    if (selectedVenueId) {
      loadVenue(selectedVenueId);
    }
  }, [selectedVenueId]);

  async function fetchVenues() {
    try {
      if (venueId === 'new') {
        const defaultVenue = {
          name: '',
          description: '',
          address: '',
          phone: '',
          email: '',
          website: '',
          linkedin_url: '',
          pinterest_url: '',
          youtube_url: '',
          instagram_url: '',
          apple_music_url: '',
          spotify_url: '',
          facebook_url: '',
          twitter_url: '',
          food_description: '',
          logo_url: '',
          hero_url: '',
          images: []
        };
        setVenue(defaultVenue);
        setInitialVenue(defaultVenue);
        setAddressParts(parseAddress(''));
        setSelectedVenueId('');
        setLoading(false);
        return;
      }

      let query = supabase.from('venues').select('*');
      
      if (venueId) {
        query = query.eq('id', venueId);
      } else {
        query = query.eq('manager_id', user?.id);
      }
      
      const { data, error } = await query.order('name');

      if (error) throw error;
      
      if (data && data.length > 0) {
        setVenues(data);
        if (!selectedVenueId) {
          setSelectedVenueId(data[0].id);
        }
      } else {
        setVenues([]);
        setLoading(false);
        // Handle case with no venues
        const defaultVenue = {
          name: '',
          description: '',
          address: '',
          phone: '',
          email: '',
          website: '',
          linkedin_url: '',
          pinterest_url: '',
          youtube_url: '',
          instagram_url: '',
          apple_music_url: '',
          spotify_url: '',
          facebook_url: '',
          twitter_url: '',
          food_description: '',
          logo_url: '',
          hero_url: '',
          images: []
        };
        setVenue(defaultVenue);
        setInitialVenue(defaultVenue);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
      setLoading(false);
    }
  }

  async function loadVenue(id: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('venues').select('*').eq('id', id).single();
      if (error) throw error;

      const defaultVenue = {
        name: '',
        description: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
        phone: '',
        email: '',
        website: '',
        linkedin_url: '',
        pinterest_url: '',
        youtube_url: '',
        instagram_url: '',
        apple_music_url: '',
        spotify_url: '',
        facebook_url: '',
        twitter_url: '',
        food_description: '',
        tech_specs: '',
        logo_url: '',
        hero_url: '',
        images: []
      };

      if (data) {
        const cleanedData = {
          ...defaultVenue,
          ...data,
          phone: data.phone || profile?.phone || '',
          email: data.email || profile?.email || '',
          website: cleanWebsite(data.website || ''),
          logo_url: data.logo_url || '',
          hero_url: data.hero_url || '',
          images: data.images || []
        };
        setVenue(cleanedData);
        setInitialVenue(cleanedData);
        setAddressParts({
          street: data.street || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          country: data.country || 'US'
        });
        fetchFutureEvents(data.id);
      }
    } catch (error) {
      console.error('Error loading venue:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFutureEvents(venueId: string) {
    const todayStr = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('events')
      .select('*, acts(*, bands(name))')
      .eq('venue_id', venueId);
    
    if (data) {
      const futureEvents = data.filter(event => {
        const eventStartTime = event.start_time || event.acts?.[0]?.start_time || event.created_at;
        const eventDateStr = eventStartTime ? new Date(eventStartTime).toISOString().split('T')[0] : '';
        return eventDateStr && eventDateStr >= todayStr;
      }).sort((a, b) => {
        const timeA = new Date(a.start_time || a.acts?.[0]?.start_time || a.created_at).getTime();
        const timeB = new Date(b.start_time || b.acts?.[0]?.start_time || b.created_at).getTime();
        return timeA - timeB;
      });
      setFutureEvents(futureEvents);
    }
  }

  const validatePhone = (phoneStr: string) => {
    if (!phoneStr) return true;
    const digits = phoneStr.replace(/\D/g, '');
    return digits.length >= 10;
  };

  const cleanWebsite = (url: string) => {
    if (!url) return '';
    return url.replace(/^(https?:\/\/)?(www\.)?/, '');
  };

  async function logUpdate(venueId: string, changes: any) {
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      table_name: 'venues',
      record_id: venueId,
      changes: changes
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!validatePhone(venue.phone || '')) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number including the area code (at least 10 digits).' });
      setSaving(false);
      return;
    }

    const zipValidation = validateZipForState(addressParts.zip, addressParts.state, addressParts.country);
    if (!zipValidation.isValid) {
      setMessage({ type: 'error', text: zipValidation.message || 'Invalid Zip/Postal Code for the selected state/province.' });
      setSaving(false);
      return;
    }

    try {
      const finalWebsite = venue.website ? `https://${cleanWebsite(venue.website)}` : '';
      
      // Sanitize venue data to remove joined data that doesn't belong in the venues table
      const { 
        profiles, 
        venue_genres, 
        events, 
        venue_sponsors,
        ...cleanVenue 
      } = venue as any;

      const changes: any = {};
      Object.keys(cleanVenue).forEach(key => {
        if (cleanVenue[key] !== (initialVenue as any)[key]) {
          changes[key] = cleanVenue[key];
        }
      });
      ['street', 'city', 'state', 'zip', 'country'].forEach(key => {
        if (addressParts[key as keyof typeof addressParts] !== (initialVenue as any)[key]) {
          changes[key] = addressParts[key as keyof typeof addressParts];
        }
      });

      const { error, data } = await supabase
        .from('venues')
        .upsert({
          ...cleanVenue,
          ...addressParts,
          address: formatAddress(addressParts),
          id: selectedVenueId || undefined,
          website: finalWebsite,
          manager_id: venue.manager_id || user?.id, // Preserve existing manager or set to current
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .select()
        .single();

      if (error) {
        await handleSupabaseError(error, OperationType.UPDATE, 'venues');
      }

      if (Object.keys(changes).length > 0) {
        await logUpdate(data.id, changes);
      }

      setMessage({ type: 'success', text: 'Venue profile updated successfully!' });
      const updatedVenue = { ...venue, id: data.id, website: cleanWebsite(finalWebsite), address: formatAddress(addressParts) };
      setVenue(updatedVenue);
      setInitialVenue(updatedVenue);
      setSelectedVenueId(data.id);
      
      setTimeout(() => {
        onSaveSuccess?.();
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Error saving venue: ' + error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-neutral-400" /></div>;

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-8 bg-neutral-900 p-8 rounded-3xl border border-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Venue Profile</h2>
          {venues.length > 1 && !hideDropdown && (
            <select
              value={selectedVenueId || ''}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-red-600 outline-none"
            >
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreview(true)}
            >
              <Eye size={20} />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Save Changes
            </Button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-sm font-medium ${
            message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            {message.text}
          </div>
        )}

        <ProfilePreviewModal 
          isOpen={showPreview} 
          onClose={() => setShowPreview(false)} 
          type="venue" 
          data={{ ...venue, address: formatAddress(addressParts) }} 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Venue Name</label>
            <Input
              type="text"
              required
              value={venue.name || ''}
              onChange={(e) => setVenue({ ...venue, name: e.target.value })}
            />
          </div>
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Address Information</label>
              <div className="flex bg-neutral-800 p-1 rounded-xl border border-neutral-700">
                <button
                  type="button"
                  onClick={() => setAddressParts({ ...addressParts, country: 'US', state: '' })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    addressParts.country === 'US' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-neutral-300'
                  }`}
                >
                  USA
                </button>
                <button
                  type="button"
                  onClick={() => setAddressParts({ ...addressParts, country: 'CA', state: '' })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    addressParts.country === 'CA' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-neutral-300'
                  }`}
                >
                  CANADA
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">Street Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <Input
                    type="text"
                    value={addressParts.street || ''}
                    onChange={(e) => setAddressParts({ ...addressParts, street: e.target.value })}
                    className="pl-12"
                    placeholder="123 Music Ave"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">City</label>
                <Input
                  type="text"
                  value={addressParts.city || ''}
                  onChange={(e) => setAddressParts({ ...addressParts, city: e.target.value })}
                  placeholder="Nashville"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                    {addressParts.country === 'US' ? 'State' : 'Province'}
                  </label>
                  <select
                    value={addressParts.state || ''}
                    onChange={(e) => setAddressParts({ ...addressParts, state: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl py-3 px-4 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all appearance-none"
                  >
                    <option value="">Select...</option>
                    {(addressParts.country === 'US' ? US_STATES : CA_PROVINCES).map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                    {addressParts.country === 'US' ? 'Zip Code' : 'Postal Code'}
                  </label>
                  <Input
                    type="text"
                    value={addressParts.zip || ''}
                    onChange={(e) => setAddressParts({ ...addressParts, zip: e.target.value })}
                    placeholder={addressParts.country === 'US' ? '37201' : 'M5V 2T6'}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">Phone</label>
              <Input
                type="tel"
                value={venue.phone || ''}
                onChange={(e) => setVenue({ ...venue, phone: formatPhoneNumber(e.target.value) })}
                placeholder="(555) 000-0000"
                className={venue.phone && !validatePhone(venue.phone) ? 'border-red-500/50 focus:ring-red-500' : ''}
              />
              {venue.phone && !validatePhone(venue.phone) && (
                <p className="text-[10px] text-red-500 mt-1 ml-1 font-medium">Area code required (10 digits)</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">Email</label>
              <Input
                type="email"
                value={venue.email || ''}
                onChange={(e) => setVenue({ ...venue, email: e.target.value })}
                placeholder="venue@email.com"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-neutral-400">Venue Logo (Square - 400x400 preferred)</label>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 relative group">
                {venue.logo_url ? (
                  <>
                    <img src={venue.logo_url} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setVenue({ ...venue, logo_url: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-10"
                      title="Delete Logo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>
              <ImageUpload 
                type="logo"
                onUploadComplete={(result) => {
                  const url = typeof result === 'string' ? result : (result.logo || result.original);
                  setVenue(prev => ({ ...prev, logo_url: url }));
                }}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border border-neutral-700"
              >
                Upload Logo
              </ImageUpload>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-neutral-400">Hero Banner (Wide - 1920x1080 preferred)</label>
            <div className="space-y-4">
              <div className="w-full h-32 bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 relative group">
                {venue.hero_url ? (
                  <>
                    <img src={venue.hero_url} alt="Hero" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setVenue({ ...venue, hero_url: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-10"
                      title="Delete Hero Banner"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>
              <ImageUpload 
                type="hero"
                onUploadComplete={(result) => {
                  const pcUrl = typeof result === 'string' ? result : (result.hero_pc || result.original);
                  setVenue(prev => ({ ...prev, hero_url: pcUrl }));
                }}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border border-neutral-700 inline-block"
              >
                Upload Hero Banner
              </ImageUpload>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-400">Description</label>
            <Textarea
              rows={4}
              value={venue.description || ''}
              onChange={(e) => setVenue({ ...venue, description: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-400">Bag Policy</label>
            <Textarea
              rows={2}
              value={venue.bag_policy || ''}
              onChange={(e) => setVenue({ ...venue, bag_policy: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Website</label>
            <Input
              type="text"
              value={venue.website || ''}
              onChange={(e) => setVenue({ ...venue, website: e.target.value })}
              placeholder="www.venue.com"
              className="pl-[4.5rem]"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium pointer-events-none group-focus-within:text-red-500 transition-colors">
              https://
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">LinkedIn URL</label>
            <Input
              type="text"
              value={venue.linkedin_url || ''}
              onChange={(e) => setVenue({ ...venue, linkedin_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Pinterest URL</label>
            <Input
              type="text"
              value={venue.pinterest_url || ''}
              onChange={(e) => setVenue({ ...venue, pinterest_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">YouTube Channel URL</label>
            <Input
              type="text"
              value={venue.youtube_url || ''}
              onChange={(e) => setVenue({ ...venue, youtube_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Instagram URL</label>
            <Input
              type="text"
              value={venue.instagram_url || ''}
              onChange={(e) => setVenue({ ...venue, instagram_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Apple Music URL</label>
            <Input
              type="text"
              value={venue.apple_music_url || ''}
              onChange={(e) => setVenue({ ...venue, apple_music_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Spotify URL</label>
            <Input
              type="text"
              value={venue.spotify_url || ''}
              onChange={(e) => setVenue({ ...venue, spotify_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Facebook URL</label>
            <Input
              type="text"
              value={venue.facebook_url || ''}
              onChange={(e) => setVenue({ ...venue, facebook_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Twitter (X) URL</label>
            <Input
              type="text"
              value={venue.twitter_url || ''}
              onChange={(e) => setVenue({ ...venue, twitter_url: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-400">Food Description</label>
            <Textarea
              rows={2}
              value={venue.food_description || ''}
              onChange={(e) => setVenue({ ...venue, food_description: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-neutral-400">Tech Specs (PA, Lighting, Stage)</label>
            <Textarea
              rows={4}
              value={venue.tech_specs || ''}
              onChange={(e) => setVenue({ ...venue, tech_specs: e.target.value })}
              placeholder="List your PA system, lighting rig, stage dimensions, etc..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-400">Images (Up to 5)</label>
            <span className="text-xs text-neutral-400">{venue.images?.length || 0} / 5</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {venue.images?.map((img, idx) => (
              <div key={idx} className="aspect-square bg-neutral-800 rounded-2xl relative group overflow-hidden">
                <img src={img} alt="Venue" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setVenue(prev => ({ ...prev, images: prev.images?.filter((_, i) => i !== idx) }))}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-10"
                  title="Delete Image"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {(venue.images?.length || 0) < 5 && (
              <ImageUpload 
                type="gallery"
                onUploadComplete={(url) => {
                  if (typeof url === 'string') {
                    setVenue(prev => ({ ...prev, images: [...(prev.images || []), url] }));
                  }
                }}
                className="aspect-square border-2 border-dashed border-neutral-700 rounded-2xl flex flex-col items-center justify-center text-neutral-400 hover:border-cyan-400 hover:text-cyan-400 transition-all cursor-pointer"
              />
            )}
          </div>
        </div>
      </form>

      {futureEvents.length > 0 && (
        <ProfilePreviewModal 
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          type="venue"
          data={venue}
        />
      )}
    </div>
  );
}

