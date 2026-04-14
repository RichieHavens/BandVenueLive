import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNavigationContext } from '../context/NavigationContext';
import { Venue, AppEvent } from '../types';
import { Save, Image as ImageIcon, Loader2, Plus, Trash2, MapPin, Calendar, Clock, Eye, Info, Phone, Share2, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Card } from './ui/Card';
import { US_STATES, CA_PROVINCES, AddressParts, formatAddress, parseAddress, validatePostalCodeForState } from '../lib/geo';
import { formatDate, formatTimeString, cleanWebsiteUrl } from '../lib/utils';
import ImageUpload from './ImageUpload';
import { formatPhoneNumber } from '../lib/phoneFormatter';
import ProfilePreviewModal from './ProfilePreviewModal';
import { handleSupabaseError, OperationType } from '../lib/error-handler';
import { cn } from '../lib/utils';
import { SearchableSelect } from './ui/SearchableSelect';

export default function VenueProfileEditor({ venueId, hideDropdown, onDirtyChange, onSaveSuccess }: { venueId?: string, hideDropdown?: boolean, onDirtyChange?: (dirty: boolean) => void, onSaveSuccess?: () => void }) {
  const { user, profile, personId, isSuperAdmin } = useAuth();
  const { addRecentRecord } = useNavigationContext();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(venueId || null);
  const [venue, setVenue] = useState<Partial<Venue>>({
    name: '',
    description: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: '',
    email: '',
    website_url: '',
    linkedin_url: '',
    pinterest_url: '',
    youtube_url: '',
    instagram_url: '',
    apple_music_url: '',
    spotify_url: '',
    facebook_url: '',
    description_food: '',
    logo_url: '',
    hero_url: '',
    images: [],
    video_links: [],
    is_confirmed: false,
    is_published: false
  });
  const [initialVenue, setInitialVenue] = useState<Partial<Venue> | null>(null);
  const [futureEvents, setFutureEvents] = useState<AppEvent[]>([]);
  const [addressParts, setAddressParts] = useState<AddressParts>(parseAddress(''));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Section toggles for mobile progressive disclosure
  const [expandedSection, setExpandedSection] = useState<string>('basic');

  // Track if form is dirty
  useEffect(() => {
    if (!initialVenue) return;
    const isDirty = 
      venue.name !== initialVenue.name ||
      venue.description !== initialVenue.description ||
      venue.phone !== initialVenue.phone ||
      venue.email !== initialVenue.email ||
      venue.website_url !== initialVenue.website_url ||
      venue.linkedin_url !== initialVenue.linkedin_url ||
      venue.pinterest_url !== initialVenue.pinterest_url ||
      venue.youtube_url !== initialVenue.youtube_url ||
      venue.instagram_url !== initialVenue.instagram_url ||
      venue.apple_music_url !== initialVenue.apple_music_url ||
      venue.spotify_url !== initialVenue.spotify_url ||
      venue.facebook_url !== initialVenue.facebook_url ||
      venue.description_food !== initialVenue.description_food ||
      venue.logo_url !== initialVenue.logo_url ||
      venue.hero_url !== initialVenue.hero_url ||
      addressParts.address_line1 !== (initialVenue.address_line1 || '') ||
      addressParts.address_line2 !== (initialVenue.address_line2 || '') ||
      addressParts.city !== (initialVenue.city || '') ||
      addressParts.state !== (initialVenue.state || '') ||
      addressParts.postal_code !== (initialVenue.postal_code || '') ||
      JSON.stringify(venue.images) !== JSON.stringify(initialVenue.images) ||
      JSON.stringify(venue.video_links) !== JSON.stringify(initialVenue.video_links);
    
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
      // 1. Get the person record for this user if it exists
      const { data: personData } = await supabase
        .from('people')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (venueId === 'new') {
        const defaultVenue = {
          name: '',
          description: '',
          phone: '',
          email: '',
          website_url: '',
          linkedin_url: '',
          pinterest_url: '',
          youtube_url: '',
          instagram_url: '',
          apple_music_url: '',
          spotify_url: '',
          facebook_url: '',
          description_food: '',
          logo_url: '',
          hero_url: '',
          images: [],
          video_links: [],
          is_confirmed: false,
          is_published: false
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
      } else if (personData) {
        query = query.or(`manager_id.eq.${user?.id},manager_id.eq.${personData.id}`);
      } else {
        query = query.or(`manager_id.eq.${user?.id}`);
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
          phone: '',
          email: '',
          website_url: '',
          linkedin_url: '',
          pinterest_url: '',
          youtube_url: '',
          instagram_url: '',
          apple_music_url: '',
          spotify_url: '',
          facebook_url: '',
          description_food: '',
          logo_url: '',
          hero_url: '',
          images: [],
          video_links: [],
          is_confirmed: false,
          is_published: false
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
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US',
        phone: '',
        email: '',
        website_url: '',
        linkedin_url: '',
        pinterest_url: '',
        youtube_url: '',
        instagram_url: '',
        apple_music_url: '',
        spotify_url: '',
        facebook_url: '',
        description_food: '',
        tech_specs: '',
        logo_url: '',
        hero_url: '',
        images: [],
        video_links: []
      };

      if (data) {
        const cleanedData = {
          ...defaultVenue,
          ...data,
          phone: data.phone || profile?.phone || '',
          email: data.email || profile?.email || '',
          website_url: data.website_url ? data.website_url.replace(/^(https?:\/\/)?(www\.)?/, '') : '',
          logo_url: data.logo_url || '',
          hero_url: data.hero_url || '',
          images: data.images || [],
          video_links: data.video_links || [],
          description_food: data.description_food || ''
        };
        setVenue(cleanedData);
        setInitialVenue(cleanedData);
        addRecentRecord({
          id: cleanedData.id,
          type: 'venue',
          name: cleanedData.name,
          timestamp: Date.now()
        });
        setAddressParts({
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
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
      .select('*, acts(*, bands:bands_ordered(name))')
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

  async function logUpdate(venueId: string, changes: any) {
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      created_by_id: personId,
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

    const zipValidation = validatePostalCodeForState(addressParts.postal_code, addressParts.state, addressParts.country);
    if (!zipValidation.isValid) {
      setMessage({ type: 'error', text: zipValidation.message || 'Invalid Zip/Postal Code for the selected state/province.' });
      setSaving(false);
      return;
    }

    try {
      const finalWebsite = cleanWebsiteUrl(venue.website_url);
      const isNew = !selectedVenueId || selectedVenueId === 'new';
      
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
      ['address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'].forEach(key => {
        if (addressParts[key as keyof typeof addressParts] !== (initialVenue as any)[key]) {
          changes[key] = addressParts[key as keyof typeof addressParts];
        }
      });

      // 1. Get the person record for this user if it exists
      const { data: personData } = await supabase
        .from('people')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const { error, data } = await supabase
        .from('venues')
        .upsert({
          ...cleanVenue,
          ...addressParts,
          id: selectedVenueId || undefined,
          website_url: finalWebsite,
          manager_id: venue.manager_id || null, // Preserve existing manager or leave null
          updated_at: new Date().toISOString(),
          updated_by_id: personData?.id,
          ...(isNew ? { created_by_id: personData?.id } : {})
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
      const updatedVenue = { ...venue, id: data.id, website_url: finalWebsite ? finalWebsite.replace(/^(https?:\/\/)?(www\.)?/, '') : '' };
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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  const SectionHeader = ({ id, title, icon: Icon }: { id: string, title: string, icon: any }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-2xl hover:bg-neutral-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-neutral-800 rounded-xl text-blue-500">
          <Icon size={20} />
        </div>
        <span className="font-bold text-white">{title}</span>
      </div>
      {expandedSection === id ? <ChevronUp size={20} className="text-neutral-500" /> : <ChevronDown size={20} className="text-neutral-500" />}
    </button>
  );

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-neutral-950/80 backdrop-blur-xl py-4 border-b border-neutral-900">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Edit Venue</h2>
          {venues.length > 1 && !hideDropdown && (
            <select
              value={selectedVenueId || ''}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 outline-none text-white max-w-[150px] sm:max-w-xs"
            >
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowPreview(true)}
            className="hidden sm:flex"
          >
            <Eye size={18} />
            Preview
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            size="sm"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save
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

      <form onSubmit={handleSave} className="space-y-4 max-w-3xl mx-auto">
        
        {/* Super Admin Controls */}
        {isSuperAdmin && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="text-blue-500" size={18} />
              <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest">Super Admin Controls</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
                <div className="space-y-0.5">
                  <label className="text-sm font-bold text-white">Confirmed</label>
                  <p className="text-xs text-neutral-500">Venue is verified and confirmed</p>
                </div>
                <button
                  type="button"
                  onClick={() => setVenue({ ...venue, is_confirmed: !venue.is_confirmed })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    venue.is_confirmed ? 'bg-blue-600' : 'bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      venue.is_confirmed ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
                <div className="space-y-0.5">
                  <label className="text-sm font-bold text-white">Published</label>
                  <p className="text-xs text-neutral-500">Venue is visible to the public</p>
                </div>
                <button
                  type="button"
                  onClick={() => setVenue({ ...venue, is_published: !venue.is_published })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    venue.is_published ? 'bg-green-600' : 'bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      venue.is_published ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Basic Info Section */}
        <div className="space-y-4">
          <SectionHeader id="basic" title="Basic Info" icon={Info} />
          {expandedSection === 'basic' && (
            <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <Input
                label="Venue Name"
                type="text"
                required
                value={venue.name || ''}
                onChange={(e) => setVenue({ ...venue, name: e.target.value })}
                placeholder="e.g. The Bluebird Cafe"
              />
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Description</label>
                <Textarea
                  rows={4}
                  value={venue.description || ''}
                  onChange={(e) => setVenue({ ...venue, description: e.target.value })}
                  placeholder="Tell people about your venue..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Tech Specs (PA, Lighting, Stage)</label>
                <Textarea
                  rows={3}
                  value={venue.tech_specs || ''}
                  onChange={(e) => setVenue({ ...venue, tech_specs: e.target.value })}
                  placeholder="List your PA system, lighting rig, stage dimensions, etc..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Food Description</label>
                <Textarea
                  rows={2}
                  value={venue.description_food || ''}
                  onChange={(e) => setVenue({ ...venue, description_food: e.target.value })}
                  placeholder="What kind of food do you serve?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Bag Policy</label>
                <Textarea
                  rows={2}
                  value={venue.bag_policy || ''}
                  onChange={(e) => setVenue({ ...venue, bag_policy: e.target.value })}
                  placeholder="e.g. Clear bags only, no backpacks"
                />
              </div>
            </div>
          )}
        </div>

        {/* Location & Contact Section */}
        <div className="space-y-4">
          <SectionHeader id="contact" title="Location & Contact" icon={Phone} />
          {expandedSection === 'contact' && (
            <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6 animate-in fade-in slide-in-from-top-2">
              
              {/* Address */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Address</label>
                  <div className="flex bg-neutral-800 p-1 rounded-xl border border-neutral-700">
                    <button
                      type="button"
                      onClick={() => setAddressParts({ ...addressParts, country: 'US', state: '' })}
                      className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", addressParts.country === 'US' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-neutral-300')}
                    >
                      USA
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressParts({ ...addressParts, country: 'CA', state: '' })}
                      className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", addressParts.country === 'CA' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-neutral-300')}
                    >
                      CANADA
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      label="Street Address"
                      type="text"
                      icon={<MapPin size={18} className="text-neutral-400" />}
                      value={addressParts.address_line1 || ''}
                      onChange={(e) => setAddressParts({ ...addressParts, address_line1: e.target.value })}
                      placeholder="123 Music Ave"
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      label="Apt, Suite, etc. (Optional)"
                      type="text"
                      value={addressParts.address_line2 || ''}
                      onChange={(e) => setAddressParts({ ...addressParts, address_line2: e.target.value })}
                      placeholder="Suite 100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      label="City"
                      type="text"
                      value={addressParts.city || ''}
                      onChange={(e) => setAddressParts({ ...addressParts, city: e.target.value })}
                      placeholder="Nashville"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <SearchableSelect
                      label={addressParts.country === 'US' ? 'State' : 'Province'}
                      value={addressParts.state || ''}
                      onChange={(val) => setAddressParts({ ...addressParts, state: val })}
                      options={(addressParts.country === 'US' ? US_STATES : CA_PROVINCES).map(s => ({ id: s.code, name: s.name }))}
                      placeholder="Select..."
                    />

                    <div className="space-y-2">
                      <Input
                        label={addressParts.country === 'US' ? 'Zip Code' : 'Postal Code'}
                        type="text"
                        value={addressParts.postal_code || ''}
                        onChange={(e) => setAddressParts({ ...addressParts, postal_code: e.target.value })}
                        placeholder={addressParts.country === 'US' ? '37201' : 'M5V 2T6'}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-neutral-800 w-full" />

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    label="Phone"
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
                <Input
                  label="Email"
                  type="email"
                  value={venue.email || ''}
                  onChange={(e) => setVenue({ ...venue, email: e.target.value })}
                  placeholder="venue@email.com"
                />
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Website</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium pointer-events-none group-focus-within:text-blue-600 transition-colors">
                      https://
                    </div>
                    <input
                      type="text"
                      value={venue.website_url || ''}
                      onChange={(e) => setVenue({ ...venue, website_url: e.target.value })}
                      placeholder="www.venue.com"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-3 pl-[4.5rem] pr-4 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Media Section */}
        <div className="space-y-4">
          <SectionHeader id="media" title="Media & Images" icon={ImageIcon} />
          {expandedSection === 'media' && (
            <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-8 animate-in fade-in slide-in-from-top-2">
              
              {/* Logo */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Venue Logo (Square)</label>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 relative group shrink-0">
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

              <div className="h-px bg-neutral-800 w-full" />

              {/* Hero */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Hero Banner (Wide)</label>
                <div className="space-y-4">
                  <div className="w-full aspect-video sm:h-48 bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 relative group">
                    {venue.hero_url ? (
                      <>
                        <img src={venue.hero_url} alt="Hero" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setVenue({ ...venue, hero_url: '' })}
                          className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-10"
                          title="Delete Hero Banner"
                        >
                          <Trash2 size={16} />
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

              <div className="h-px bg-neutral-800 w-full" />

              {/* Gallery */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Gallery Images</label>
                  <span className="text-xs text-neutral-400">{venue.images?.length || 0} / 5</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
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
                      className="aspect-square border-2 border-dashed border-neutral-700 rounded-2xl flex flex-col items-center justify-center text-neutral-400 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer"
                    >
                      <Plus size={24} />
                    </ImageUpload>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Social Links Section */}
        <div className="space-y-4">
          <SectionHeader id="social" title="Social Links" icon={Share2} />
          {expandedSection === 'social' && (
            <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Instagram URL" type="url" value={venue.instagram_url || ''} onChange={(e) => setVenue({ ...venue, instagram_url: e.target.value })} placeholder="https://instagram.com/..." />
                <Input label="Facebook URL" type="url" value={venue.facebook_url || ''} onChange={(e) => setVenue({ ...venue, facebook_url: e.target.value })} placeholder="https://facebook.com/..." />
                <Input label="Twitter (X) URL" type="url" value={venue.twitter_url || ''} onChange={(e) => setVenue({ ...venue, twitter_url: e.target.value, x_url: e.target.value })} placeholder="https://twitter.com/..." />
                <Input label="YouTube Channel URL" type="url" value={venue.youtube_url || ''} onChange={(e) => setVenue({ ...venue, youtube_url: e.target.value })} placeholder="https://youtube.com/..." />
                <Input label="Spotify URL" type="url" value={venue.spotify_url || ''} onChange={(e) => setVenue({ ...venue, spotify_url: e.target.value })} placeholder="https://open.spotify.com/..." />
                <Input label="Apple Music URL" type="url" value={venue.apple_music_url || ''} onChange={(e) => setVenue({ ...venue, apple_music_url: e.target.value })} placeholder="https://music.apple.com/..." />
                <Input label="LinkedIn URL" type="url" value={venue.linkedin_url || ''} onChange={(e) => setVenue({ ...venue, linkedin_url: e.target.value })} placeholder="https://linkedin.com/..." />
                <Input label="Pinterest URL" type="url" value={venue.pinterest_url || ''} onChange={(e) => setVenue({ ...venue, pinterest_url: e.target.value })} placeholder="https://pinterest.com/..." />
              </div>
            </div>
          )}
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
