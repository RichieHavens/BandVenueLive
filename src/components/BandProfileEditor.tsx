import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { Band } from '../types';
import { Save, Loader2, Trash2, Plus, Video, Eye, Image as ImageIcon, MapPin, User, Mail, Phone, Globe, Linkedin, Youtube, Instagram, Facebook, Twitter, Music } from 'lucide-react';
import { US_STATES, CA_PROVINCES, AddressParts, formatAddress, parseAddress, validateZipForState } from '../lib/geo';
import ImageUpload from './ImageUpload';
import { formatPhoneNumber } from '../lib/phoneFormatter';
import ProfilePreviewModal from './ProfilePreviewModal';
import { handleSupabaseError, OperationType } from '../lib/error-handler';
import BandMembersManager from './BandMembersManager';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { theme } from '../lib/theme';
import { cn } from '../lib/utils';

interface BandProfileEditorProps {
  bandId?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onSaveSuccess?: () => void;
}

export const BandProfileEditor: React.FC<BandProfileEditorProps> = ({ bandId, onDirtyChange, onSaveSuccess }) => {
  const { user, profile } = useAuth();
  const [band, setBand] = useState<Partial<Band>>({
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
    logo_url: '',
    hero_url: '',
    images: [],
    video_links: []
  });
  const [initialBand, setInitialBand] = useState<Partial<Band> | null>(null);
  const [addressParts, setAddressParts] = useState<AddressParts>(parseAddress(''));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!initialBand) return;
    const isDirty = 
      band.name !== initialBand.name ||
      band.description !== initialBand.description ||
      band.phone !== initialBand.phone ||
      band.email !== initialBand.email ||
      band.website !== initialBand.website ||
      band.linkedin_url !== initialBand.linkedin_url ||
      band.pinterest_url !== initialBand.pinterest_url ||
      band.youtube_url !== initialBand.youtube_url ||
      band.instagram_url !== initialBand.instagram_url ||
      band.apple_music_url !== initialBand.apple_music_url ||
      band.spotify_url !== initialBand.spotify_url ||
      band.facebook_url !== initialBand.facebook_url ||
      band.twitter_url !== initialBand.twitter_url ||
      band.logo_url !== initialBand.logo_url ||
      band.hero_url !== initialBand.hero_url ||
      JSON.stringify(band.images) !== JSON.stringify(initialBand.images) ||
      JSON.stringify(band.video_links) !== JSON.stringify(initialBand.video_links);
    
    onDirtyChange?.(isDirty);
  }, [band, initialBand, onDirtyChange]);

  useEffect(() => {
    fetchBand();
  }, [bandId, user?.id]);

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
          website: '',
          linkedin_url: '',
          pinterest_url: '',
          youtube_url: '',
          instagram_url: '',
          apple_music_url: '',
          spotify_url: '',
          facebook_url: '',
          twitter_url: '',
          logo_url: '',
          hero_url: '',
          images: [],
          video_links: []
        };
        setBand(defaultBand);
        setInitialBand(defaultBand);
        setAddressParts(parseAddress(''));
        setLoading(false);
        return;
      }

      let query = supabase.from('bands').select('*');
      
      if (bandId) {
        query = query.eq('id', bandId);
      } else if (personData) {
        // If they have a person record, check both manager_id and person_id
        query = query.or(`manager_id.eq.${user?.id},person_id.eq.${personData.id}`);
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
        website: '',
        linkedin_url: '',
        pinterest_url: '',
        youtube_url: '',
        instagram_url: '',
        apple_music_url: '',
        spotify_url: '',
        facebook_url: '',
        twitter_url: '',
        logo_url: '',
        hero_url: '',
        images: [],
        video_links: []
      };

      if (data) {
        const cleanedData = {
          ...defaultBand,
          ...data,
          phone: data.phone || '',
          email: data.email || '',
          logo_url: data.logo_url || '',
          hero_url: data.hero_url || '',
          images: data.images || [],
          video_links: data.video_links || []
        };
        setBand(cleanedData);
        setInitialBand(cleanedData);
        setAddressParts({
          street: data.street || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          country: data.country || 'US'
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
        table_name: 'bands',
        record_id: bandId,
        changes: changes
      });
    } catch (error) {
      console.error('Error logging update:', error);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const zipValidation = validateZipForState(addressParts.zip, addressParts.state, addressParts.country);
    if (!zipValidation.isValid) {
      setMessage({ type: 'error', text: zipValidation.message || 'Invalid Zip/Postal Code for the selected state/province.' });
      setSaving(false);
      return;
    }

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

      const { error, data } = await supabase
        .from('bands')
        .upsert({
          ...cleanBand,
          ...addressParts,
          address: formatAddress(addressParts),
          manager_id: band.manager_id || user?.id, // Preserve existing manager or set to current
          person_id: band.person_id || personData?.id, // Link to person record if available
          updated_at: new Date().toISOString(),
          updated_by: user?.id
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
      setBand(prev => ({ ...prev, id: data.id }));
      setInitialBand({ ...band, id: data.id });
      
      setTimeout(() => {
        onSaveSuccess?.();
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Error saving band: ' + error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-500" /></div>;

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className={cn("max-w-4xl mx-auto space-y-8", theme.card)}>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Band Profile{band.name ? `: ${band.name}` : ''}</h2>
          <div className="flex items-center gap-4">
            {band.id && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => document.getElementById('band-members-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Manage Members
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreview(true)}
              className="group"
            >
              <Eye size={20} className="text-neutral-400 group-hover:text-cyan-400 transition-colors" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="group"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="text-neutral-400 group-hover:text-cyan-400 transition-colors" />}
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
          type="band" 
          data={band} 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Band Name"
            type="text"
            required
            value={band.name || ''}
            onChange={(e) => setBand({ ...band, name: e.target.value })}
          />
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Address Information</label>
              <div className="flex bg-neutral-800 p-1 rounded-xl border border-neutral-700">
                <Button
                  type="button"
                  variant={addressParts.country === 'US' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setAddressParts({ ...addressParts, country: 'US', state: '' })}
                >
                  USA
                </Button>
                <Button
                  type="button"
                  variant={addressParts.country === 'CA' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setAddressParts({ ...addressParts, country: 'CA', state: '' })}
                >
                  CANADA
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Street Address"
                type="text"
                value={addressParts.street || ''}
                onChange={(e) => setAddressParts({ ...addressParts, street: e.target.value })}
                placeholder="123 Music Ave"
                className="md:col-span-2"
              />
              <Input
                label="City"
                type="text"
                value={addressParts.city || ''}
                onChange={(e) => setAddressParts({ ...addressParts, city: e.target.value })}
                placeholder="Nashville"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                    {addressParts.country === 'US' ? 'State' : 'Province'}
                  </label>
                  <select
                    value={addressParts.state || ''}
                    onChange={(e) => setAddressParts({ ...addressParts, state: e.target.value })}
                    className={theme.input}
                  >
                    <option value="">Select...</option>
                    {(addressParts.country === 'US' ? US_STATES : CA_PROVINCES).map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label={addressParts.country === 'US' ? 'Zip Code' : 'Postal Code'}
                  type="text"
                  value={addressParts.zip || ''}
                  onChange={(e) => setAddressParts({ ...addressParts, zip: e.target.value })}
                  placeholder={addressParts.country === 'US' ? '37201' : 'M5V 2T6'}
                />
              </div>
            </div>
          </div>
          <Input
            label="Phone"
            type="tel"
            value={band.phone || ''}
            onChange={(e) => setBand({ ...band, phone: formatPhoneNumber(e.target.value) })}
            placeholder="(555) 000-0000"
            icon={<Phone size={18} className="text-neutral-400" />}
          />
          <Input
            label="Email"
            type="email"
            value={band.email || ''}
            onChange={(e) => setBand({ ...band, email: e.target.value })}
            placeholder="band@email.com"
            icon={<Mail size={18} className="text-neutral-400" />}
          />
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Description</label>
            <textarea
              rows={4}
              value={band.description || ''}
              onChange={(e) => setBand({ ...band, description: e.target.value })}
              className={theme.input}
            />
          </div>
          <div className="space-y-4 md:col-span-2">
            <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Band Logo (Square - 400x400 preferred)</label>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-700 relative group">
                {band.logo_url ? (
                  <>
                    <img src={band.logo_url} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setBand({ ...band, logo_url: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-10"
                      title="Delete Logo"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <ImageIcon size={32} className="text-neutral-400" />
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

          <div className="space-y-4 md:col-span-2">
            <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Hero Banner (Wide - 1920x1080 preferred)</label>
            <div className="space-y-4">
              <div className="w-full h-32 bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-700 relative group">
                {band.hero_url ? (
                  <>
                    <img src={band.hero_url} alt="Hero" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setBand({ ...band, hero_url: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all z-10"
                      title="Delete Hero Banner"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <ImageIcon size={32} className="text-neutral-400" />
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
          <Input
            label="Website"
            type="text"
            value={band.website || ''}
            onChange={(e) => setBand({ ...band, website: e.target.value })}
            icon={<Globe size={18} className="text-neutral-400" />}
          />
          <Input
            label="LinkedIn URL"
            type="text"
            value={band.linkedin_url || ''}
            onChange={(e) => setBand({ ...band, linkedin_url: e.target.value })}
            icon={<Linkedin size={18} className="text-neutral-400" />}
          />
          <Input
            label="Pinterest URL"
            type="text"
            value={band.pinterest_url || ''}
            onChange={(e) => setBand({ ...band, pinterest_url: e.target.value })}
          />
          <Input
            label="YouTube Channel URL"
            type="text"
            value={band.youtube_url || ''}
            onChange={(e) => setBand({ ...band, youtube_url: e.target.value })}
            icon={<Youtube size={18} className="text-neutral-400" />}
          />
          <Input
            label="Instagram URL"
            type="text"
            value={band.instagram_url || ''}
            onChange={(e) => setBand({ ...band, instagram_url: e.target.value })}
            icon={<Instagram size={18} className="text-neutral-400" />}
          />
          <Input
            label="Apple Music URL"
            type="text"
            value={band.apple_music_url || ''}
            onChange={(e) => setBand({ ...band, apple_music_url: e.target.value })}
            icon={<Music size={18} className="text-neutral-400" />}
          />
          <Input
            label="Spotify URL"
            type="text"
            value={band.spotify_url || ''}
            onChange={(e) => setBand({ ...band, spotify_url: e.target.value })}
            icon={<Music size={18} className="text-neutral-400" />}
          />
          <Input
            label="Facebook URL"
            type="text"
            value={band.facebook_url || ''}
            onChange={(e) => setBand({ ...band, facebook_url: e.target.value })}
            icon={<Facebook size={18} className="text-neutral-400" />}
          />
          <Input
            label="Twitter (X) URL"
            type="text"
            value={band.twitter_url || ''}
            onChange={(e) => setBand({ ...band, twitter_url: e.target.value })}
            icon={<Twitter size={18} className="text-neutral-400" />}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Images (Up to 5)</label>
            <span className="text-xs text-neutral-400">{band.images?.length || 0} / 5</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {band.images?.map((img, idx) => (
              <div key={idx} className="aspect-square bg-neutral-950 rounded-2xl relative group overflow-hidden border border-neutral-700">
                <img src={img} alt="Band" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setBand(prev => ({ ...prev, images: prev.images?.filter((_, i) => i !== idx) }))}
                  className="absolute top-2 right-2 p-1.5 group"
                  title="Delete Image"
                >
                  <Trash2 size={14} className="text-red-500 group-hover:text-white" />
                </Button>
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
                className="aspect-square border-2 border-dashed border-neutral-700 rounded-2xl flex flex-col items-center justify-center text-neutral-400 hover:border-red-600 hover:text-red-500 transition-all cursor-pointer"
              />
            )}
          </div>
        </div>

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
              />
              <Button
                type="button"
                variant="danger"
                onClick={() => setBand({ ...band, video_links: band.video_links?.filter((_, i) => i !== idx) })}
                className="group"
              >
                <Trash2 size={20} className="text-red-500 group-hover:text-white" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setBand({ ...band, video_links: [...(band.video_links || []), ''] })}
          >
            <Plus size={20} className="text-neutral-400" /> Add Video Link
          </Button>
        </div>

        {/* Status & Visibility */}
        <div className="space-y-4 pt-6 border-t border-neutral-800">
          <h3 className="text-xl font-bold flex items-center gap-2">
            Status & Visibility
          </h3>
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
      </form>

      <BandMembersManager bandId={band.id || 'new'} />

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
