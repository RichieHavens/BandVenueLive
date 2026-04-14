import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNavigationContext } from '../context/NavigationContext';
import { Band } from '../types';
import { Save, Loader2, Trash2, Plus, Video, Eye, Image as ImageIcon, MapPin, User, Mail, Phone, Globe, Linkedin, Youtube, Instagram, Facebook, Twitter, Music, Info, Share2, ChevronDown, ChevronUp, Users, Shield } from 'lucide-react';
import { US_STATES, CA_PROVINCES, AddressParts, formatAddress, parseAddress, validatePostalCodeForState } from '../lib/geo';
import { cleanWebsiteUrl } from '../lib/utils';
import ImageUpload from './ImageUpload';
import { formatPhoneNumber } from '../lib/phoneFormatter';
import ProfilePreviewModal from './ProfilePreviewModal';
import { handleSupabaseError, OperationType } from '../lib/error-handler';
import BandMembersManager from './BandMembersManager';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Card } from './ui/Card';
import { theme } from '../lib/theme';
import { cn } from '../lib/utils';
import { SearchableSelect } from './ui/SearchableSelect';

interface BandProfileEditorProps {
  bandId?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onSaveSuccess?: () => void;
}

export const BandProfileEditor: React.FC<BandProfileEditorProps> = ({ bandId, onDirtyChange, onSaveSuccess }) => {
  const { user, profile, personId, isSuperAdmin } = useAuth();
  const { addRecentRecord } = useNavigationContext();
  const [managers, setManagers] = useState<{id: string, display_name: string, login_email: string}[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [band, setBand] = useState<Partial<Band>>({
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
    x_url: '',
    logo_url: '',
    hero_url: '',
    images: [],
    video_links: [],
    travel_region: 'Local',
    is_confirmed: false,
    is_published: false
  });
  const [initialBand, setInitialBand] = useState<Partial<Band> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Section toggles for mobile progressive disclosure
  const [expandedSection, setExpandedSection] = useState<string>('basic');

  useEffect(() => {
    if (!initialBand) return;
    const isDirty = 
      band.name !== initialBand.name ||
      band.description !== initialBand.description ||
      band.phone !== initialBand.phone ||
      band.email !== initialBand.email ||
      band.website_url !== initialBand.website_url ||
      band.linkedin_url !== initialBand.linkedin_url ||
      band.pinterest_url !== initialBand.pinterest_url ||
      band.youtube_url !== initialBand.youtube_url ||
      band.instagram_url !== initialBand.instagram_url ||
      band.apple_music_url !== initialBand.apple_music_url ||
      band.spotify_url !== initialBand.spotify_url ||
      band.facebook_url !== initialBand.facebook_url ||
      band.x_url !== initialBand.x_url ||
      band.logo_url !== initialBand.logo_url ||
      band.hero_url !== initialBand.hero_url ||
      JSON.stringify(band.images) !== JSON.stringify(initialBand.images) ||
      JSON.stringify(band.video_links) !== JSON.stringify(initialBand.video_links) ||
      band.travel_region !== initialBand.travel_region;
    
    onDirtyChange?.(isDirty);
  }, [band, initialBand, onDirtyChange]);

  useEffect(() => {
    fetchBand();
  }, [bandId, user?.id]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchManagers();
    }
  }, [isSuperAdmin]);

  async function fetchManagers() {
    setLoadingManagers(true);
    try {
      const bandsRes = await supabase.from('bands').select('manager_id').not('manager_id', 'is', null);
      const managerIds = Array.from(new Set(bandsRes.data?.map(b => b.manager_id) || []));

      if (managerIds.length === 0) {
        // fallback: allow all profiles so first manager can be assigned
        const [profilesRes, peopleRes] = await Promise.all([
          supabase.from('profiles').select('id, email, first_name, last_name'),
          supabase.from('people').select('id, user_id, first_name, last_name')
        ]);

        if (profilesRes.data && peopleRes.data) {
          const managers = profilesRes.data.map(p => {
            const person = peopleRes.data.find(pe => pe.user_id === p.id);
            const display_name = (person?.first_name || person?.last_name)
              ? `${person.first_name || ''} ${person.last_name || ''}`.trim()
              : (p.first_name || p.last_name)
              ? `${p.first_name || ''} ${p.last_name || ''}`.trim()
              : p.email;
            return { id: p.id, display_name, login_email: p.email };
          });
          setManagers(managers);
        }

        return;
      }

      const [profilesRes, peopleRes] = await Promise.all([
        supabase.from('profiles').select('id, email, first_name, last_name').in('id', managerIds),
        supabase.from('people').select('id, user_id, first_name, last_name').in('user_id', managerIds)
      ]);

      if (profilesRes.data && peopleRes.data) {
        const managers = profilesRes.data.map(p => {
          const person = peopleRes.data.find(pe => pe.user_id === p.id);
          const display_name = (person?.first_name || person?.last_name)
            ? `${person.first_name || ''} ${person.last_name || ''}`.trim()
            : (p.first_name || p.last_name)
            ? `${p.first_name || ''} ${p.last_name || ''}`.trim()
            : p.email;
          return { id: p.id, display_name, login_email: p.email };
        });
        setManagers(managers);
      }
    } catch (e) {
      console.error('Error fetching managers:', e);
    } finally {
      setLoadingManagers(false);
    }
  }

  async function fetchBand() {
    try {
      // 1. Get the person record for this user if it exists
      const { data: personData } = await supabase
        .from('people')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (bandId === 'new') {
        const defaultBand = {
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
          x_url: '',
          logo_url: '',
          hero_url: '',
          images: [],
          video_links: [],
          travel_region: 'Local' as 'Local' | 'Regional' | 'National',
          is_confirmed: false,
          is_published: false
        };
        setBand(defaultBand);
        setInitialBand(defaultBand);
        setLoading(false);
        return;
      }

      let query = supabase.from('bands_ordered').select('*');
      
      if (bandId) {
        query = query.eq('id', bandId);
      } else if (personData) {
        // If they have a person record, check both manager_id and created_by_id
        query = query.or(`manager_id.eq.${user?.id},created_by_id.eq.${personData.id}`);
      } else {
        query = query.eq('manager_id', user?.id);
      }
      
      const { data, error } = await query.limit(1).maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      const defaultBand = {
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
        x_url: '',
        logo_url: '',
        hero_url: '',
        images: [],
        video_links: [],
        travel_region: 'Local' as 'Local' | 'Regional' | 'National',
        is_confirmed: false,
        is_published: false
      };

      if (data) {
        const cleanedData = {
          ...defaultBand,
          ...data,
          phone: data.phone || '',
          email: data.email || '',
          website_url: data.website_url ? data.website_url.replace(/^(https?:\/\/)?(www\.)?/, '') : '',
          logo_url: data.logo_url || '',
          hero_url: data.hero_url || '',
          images: data.images || [],
          video_links: data.video_links || [],
          travel_region: data.travel_region || 'Local'
        };
        setBand(cleanedData);
        setInitialBand(cleanedData);
        addRecentRecord({
          id: cleanedData.id,
          type: 'band',
          name: cleanedData.name,
          timestamp: Date.now()
        });
      } else {
        setBand(defaultBand);
        setInitialBand(defaultBand);
      }
    } catch (error) {
      console.error('Error fetching band:', error);
    } finally {
      setLoading(false);
    }
  }

  async function logUpdate(bandId: string, changes: any) {
    try {
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        created_by_id: personId,
        table_name: 'bands',
        record_id: bandId,
        changes: changes
      });
    } catch (error) {
      console.error('Error logging update:', error);
    }
  }

  const validatePhone = (phoneStr: string) => {
    if (!phoneStr) return true; // Optional field
    const digits = phoneStr.replace(/\D/g, '');
    return digits.length === 10;
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Sanitize band data to remove joined data that doesn't belong in the bands table
      const { 
        profiles, 
        band_genres, 
        acts, 
        ...cleanBand 
      } = band as any;

      const changes: any = {};
      Object.keys(cleanBand).forEach(key => {
        if (cleanBand[key] !== (initialBand as any)[key]) {
          changes[key] = cleanBand[key];
        }
      });

      // 1. Get the person record for this user if it exists
      const { data: personData } = await supabase
        .from('people')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const finalWebsite = cleanWebsiteUrl(band.website_url);
      const isNew = !band.id || bandId === 'new';

      const { error, data } = await supabase
        .from('bands')
        .upsert({
          ...cleanBand,
          manager_id: band.manager_id || null, // Preserve existing manager or leave null
          website_url: finalWebsite,
          updated_at: new Date().toISOString(),
          updated_by_id: personData?.id,
          ...(isNew ? { created_by_id: personData?.id } : {})
        })
        .select()
        .single();

      if (error) {
        await handleSupabaseError(error, OperationType.UPDATE, 'bands');
      }

      if (Object.keys(changes).length > 0) {
        await logUpdate(data.id, changes);
      }

      setMessage({ type: 'success', text: 'Band profile updated successfully!' });
      setBand(prev => ({ ...prev, id: data.id, website_url: finalWebsite ? finalWebsite.replace(/^(https?:\/\/)?(www\.)?/, '') : '' }));
      setInitialBand({ ...band, id: data.id, website_url: finalWebsite ? finalWebsite.replace(/^(https?:\/\/)?(www\.)?/, '') : '' });
      
      setTimeout(() => {
        onSaveSuccess?.();
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Error saving band: ' + error.message });
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
        <h2 className="text-2xl font-bold text-white truncate pr-4">Edit Band</h2>
        <div className="flex items-center gap-2 shrink-0">
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
                  <p className="text-xs text-neutral-500">Band is verified and confirmed</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBand({ ...band, is_confirmed: !band.is_confirmed })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    band.is_confirmed ? 'bg-blue-600' : 'bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      band.is_confirmed ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
                <div className="space-y-0.5">
                  <label className="text-sm font-bold text-white">Published</label>
                  <p className="text-xs text-neutral-500">Band is visible to the public</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBand({ ...band, is_published: !band.is_published })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    band.is_published ? 'bg-green-600' : 'bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      band.is_published ? 'translate-x-6' : 'translate-x-1'
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
                label="Band Name"
                type="text"
                required
                value={band.name || ''}
                onChange={(e) => setBand({ ...band, name: e.target.value })}
                placeholder="e.g. The Rockers"
              />

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Band Travel Region</label>
                <select
                  value={band.travel_region || 'Local'}
                  onChange={(e) => setBand({ ...band, travel_region: e.target.value as 'Local' | 'Regional' | 'National' })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all appearance-none"
                >
                  <option value="Local">Local</option>
                  <option value="Regional">Regional</option>
                  <option value="National">National</option>
                </select>
              </div>

              {isSuperAdmin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Band Manager</label>
                  <select
                    value={band.manager_id || 'unassigned'}
                    onChange={(e) => setBand({ ...band, manager_id: e.target.value === 'unassigned' ? null : e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all appearance-none"
                  >
                    <option value="unassigned">Unassigned</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.display_name} ({m.login_email})</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Description</label>
                <Textarea
                  rows={4}
                  value={band.description || ''}
                  onChange={(e) => setBand({ ...band, description: e.target.value })}
                  placeholder="Tell people about your band..."
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
              
              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    label="Phone"
                    type="tel"
                    value={band.phone || ''}
                    onChange={(e) => setBand({ ...band, phone: formatPhoneNumber(e.target.value) })}
                    placeholder="(555) 000-0000"
                    className={band.phone && !validatePhone(band.phone) ? 'border-red-500/50 focus:ring-red-500' : ''}
                  />
                  {band.phone && !validatePhone(band.phone) && (
                    <p className="text-[10px] text-red-500 mt-1 ml-1 font-medium">Area code required (10 digits)</p>
                  )}
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={band.email || ''}
                  onChange={(e) => setBand({ ...band, email: e.target.value })}
                  placeholder="band@email.com"
                />
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Website</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium pointer-events-none group-focus-within:text-blue-600 transition-colors">
                      https://
                    </div>
                    <input
                      type="text"
                      value={band.website_url || ''}
                      onChange={(e) => setBand({ ...band, website_url: e.target.value })}
                      placeholder="www.band.com"
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
                <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Band Logo (Square)</label>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700 relative group shrink-0">
                    {band.logo_url ? (
                      <>
                        <img src={band.logo_url} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setBand({ ...band, logo_url: '' })}
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
                      setBand(prev => ({ ...prev, logo_url: url }));
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
                    {band.hero_url ? (
                      <>
                        <img src={band.hero_url} alt="Hero" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setBand({ ...band, hero_url: '' })}
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
                      setBand(prev => ({ ...prev, hero_url: pcUrl }));
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
                  <span className="text-xs text-neutral-400">{band.images?.length || 0} / 5</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {band.images?.map((img, idx) => (
                    <div key={idx} className="aspect-square bg-neutral-800 rounded-2xl relative group overflow-hidden">
                      <img src={img} alt="Band" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setBand(prev => ({ ...prev, images: prev.images?.filter((_, i) => i !== idx) }))}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-10"
                        title="Delete Image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(band.images?.length || 0) < 5 && (
                    <ImageUpload 
                      type="gallery"
                      onUploadComplete={(url) => {
                        if (typeof url === 'string') {
                          setBand(prev => ({ ...prev, images: [...(prev.images || []), url] }));
                        }
                      }}
                      className="aspect-square border-2 border-dashed border-neutral-700 rounded-2xl flex flex-col items-center justify-center text-neutral-400 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer"
                    >
                      <Plus size={24} />
                    </ImageUpload>
                  )}
                </div>
              </div>

              <div className="h-px bg-neutral-800 w-full" />

              {/* Videos */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Video Links</label>
                {band.video_links?.map((link, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      type="text"
                      value={link || ''}
                      onChange={(e) => {
                        const newLinks = [...(band.video_links || [])];
                        newLinks[idx] = e.target.value;
                        setBand({ ...band, video_links: newLinks });
                      }}
                      placeholder="https://youtube.com/..."
                    />
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setBand({ ...band, video_links: band.video_links?.filter((_, i) => i !== idx) })}
                      className="shrink-0"
                    >
                      <Trash2 size={20} />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setBand({ ...band, video_links: [...(band.video_links || []), ''] })}
                >
                  <Plus size={18} className="mr-2" /> Add Video Link
                </Button>
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
                <Input label="Instagram URL" type="url" value={band.instagram_url || ''} onChange={(e) => setBand({ ...band, instagram_url: e.target.value })} placeholder="https://instagram.com/..." />
                <Input label="Facebook URL" type="url" value={band.facebook_url || ''} onChange={(e) => setBand({ ...band, facebook_url: e.target.value })} placeholder="https://facebook.com/..." />
                <Input label="X (Twitter) URL" type="url" value={band.x_url || ''} onChange={(e) => setBand({ ...band, x_url: e.target.value })} placeholder="https://x.com/..." />
                <Input label="YouTube Channel URL" type="url" value={band.youtube_url || ''} onChange={(e) => setBand({ ...band, youtube_url: e.target.value })} placeholder="https://youtube.com/..." />
                <Input label="Spotify URL" type="url" value={band.spotify_url || ''} onChange={(e) => setBand({ ...band, spotify_url: e.target.value })} placeholder="https://open.spotify.com/..." />
                <Input label="Apple Music URL" type="url" value={band.apple_music_url || ''} onChange={(e) => setBand({ ...band, apple_music_url: e.target.value })} placeholder="https://music.apple.com/..." />
                <Input label="LinkedIn URL" type="url" value={band.linkedin_url || ''} onChange={(e) => setBand({ ...band, linkedin_url: e.target.value })} placeholder="https://linkedin.com/..." />
                <Input label="Pinterest URL" type="url" value={band.pinterest_url || ''} onChange={(e) => setBand({ ...band, pinterest_url: e.target.value })} placeholder="https://pinterest.com/..." />
              </div>
            </div>
          )}
        </div>

        {/* Status & Visibility */}
        <div className="space-y-4">
          <SectionHeader id="status" title="Status & Visibility" icon={Eye} />
          {expandedSection === 'status' && (
            <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={band.is_published || false}
                    onChange={(e) => setBand({ ...band, is_published: e.target.checked })}
                  />
                  <div className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    band.is_published ? "bg-blue-600" : "bg-neutral-700"
                  )}>
                    <div className={cn(
                      "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform",
                      band.is_published ? "translate-x-6" : "translate-x-0"
                    )} />
                  </div>
                  <span className="font-semibold text-neutral-300 group-hover:text-white transition-colors">Published</span>
                </label>
              </div>
              <p className="text-sm text-neutral-400">
                When published, this band profile will be visible on the public band listing page.
              </p>
            </div>
          )}
        </div>

      </form>

      {band.id && (
        <div className="max-w-3xl mx-auto mt-8">
          <BandMembersManager bandId={band.id} />
        </div>
      )}

      {showPreview && (
        <ProfilePreviewModal 
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          type="band"
          data={band}
        />
      )}
    </div>
  );
}
