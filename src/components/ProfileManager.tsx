import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { UserRole, MusicianDetails } from '../types';
import { Save, Loader2, User, Mail, Shield, Check, Phone, MapPin, Globe, Video, Trash2, Settings, Music, Camera, Eye, Lock, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { formatPhoneNumber } from '../lib/phoneFormatter';
import { US_STATES, CA_PROVINCES, AddressParts, formatAddress, parseAddress, validatePostalCodeForState } from '../lib/geo';
import { handleSupabaseError, OperationType } from '../lib/error-handler';
import { updateUserEmail } from '../lib/authService';
import { getPriorityDefaultRole, cleanWebsiteUrl } from '../lib/utils';
import ImageUpload from './ImageUpload';
import { UploadedImageSet } from '../lib/imageUtils';
import ProfilePreviewModal from './ProfilePreviewModal';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { SearchableSelect } from './ui/SearchableSelect';

type Tab = 'account' | 'musician' | 'security';

export default function ProfileManager({ onDirtyChange, onSaveSuccess }: { onDirtyChange?: (dirty: boolean) => void, onSaveSuccess?: () => void }) {
  const { user, profile, personId, refreshProfile, managedBands, managedVenues, availableRoles } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [isMusician, setIsMusician] = useState(false);
  const [isSoloAct, setIsSoloAct] = useState(profile?.is_solo_act || false);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    if (availableRoles && availableRoles.length > 0 && selectedRoles.length === 0) {
      setSelectedRoles(availableRoles);
    }
  }, [availableRoles]);
  
  // Account State
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [accountPhone, setAccountPhone] = useState(profile?.phone || '');
  const [addressParts, setAddressParts] = useState<AddressParts>({
    address_line1: profile?.address_line1 || '',
    address_line2: profile?.address_line2 || '',
    city: profile?.city || '',
    state: profile?.state || '',
    postal_code: profile?.postal_code || '',
    country: (profile?.country as 'US' | 'CA') || 'US'
  });
  const [defaultRole, setDefaultRole] = useState<UserRole | undefined>(profile?.default_role);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  
  // Email Update State
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  
  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Role Request State
  const [roleRequests, setRoleRequests] = useState<Record<string, { active: boolean, details: string }>>({
    venue_manager: { active: false, details: '' },
    band_manager: { active: false, details: '' },
    promoter: { active: false, details: '' }
  });

  // Musician State
  const [musicianData, setMusicianData] = useState<Partial<MusicianDetails>>({
    instruments: [],
    looking_for_bands: false,
    open_for_gigs: false
  });
  const [initialMusicianData, setInitialMusicianData] = useState<Partial<MusicianDetails> | null>(null);
  const [loadingMusician, setLoadingMusician] = useState(false);

  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Section toggles for mobile progressive disclosure
  const [expandedSection, setExpandedSection] = useState<string>('basic');

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
        <div className="p-2 bg-neutral-800 rounded-xl text-red-500">
          <Icon size={20} />
        </div>
        <span className="font-bold text-white">{title}</span>
      </div>
      {expandedSection === id ? <ChevronUp size={20} className="text-neutral-500" /> : <ChevronDown size={20} className="text-neutral-500" />}
    </button>
  );

  async function logUpdate(changes: any) {
    try {
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        created_by_id: personId,
        table_name: 'profiles',
        record_id: user?.id,
        changes: changes
      });
    } catch (error) {
      console.error('Error logging update:', error);
    }
  }

  // Track if form is dirty
  useEffect(() => {
    if (!profile) return;
    
    const isAccountDirty = 
      firstName !== (profile.first_name || '') ||
      lastName !== (profile.last_name || '') ||
      accountPhone !== (profile.phone || '') ||
      avatarUrl !== (profile.avatar_url || '') ||
      addressParts.address_line1 !== (profile.address_line1 || '') ||
      addressParts.address_line2 !== (profile.address_line2 || '') ||
      addressParts.city !== (profile.city || '') ||
      addressParts.state !== (profile.state || '') ||
      addressParts.postal_code !== (profile.postal_code || '') ||
      defaultRole !== profile.default_role ||
      isSoloAct !== (profile.is_solo_act || false);
    
    let isMusicianDirty = false;
    if (initialMusicianData) {
      isMusicianDirty = 
        isMusician !== (!!initialMusicianData.id) ||
        musicianData.musician_bio !== initialMusicianData.musician_bio ||
        musicianData.looking_for_bands !== initialMusicianData.looking_for_bands ||
        musicianData.open_for_gigs !== initialMusicianData.open_for_gigs ||
        JSON.stringify(musicianData.instruments?.sort()) !== JSON.stringify((initialMusicianData.instruments || []).sort());
    } else {
      isMusicianDirty = isMusician;
    }
    
    onDirtyChange?.(isAccountDirty || isMusicianDirty);
  }, [firstName, lastName, accountPhone, addressParts, profile, musicianData, initialMusicianData, isMusician, isSoloAct, onDirtyChange]);

  useEffect(() => {
    console.log('ProfileManager: Profile updated:', profile);
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setAccountPhone(profile.phone || '');
      setAddressParts({
        address_line1: profile.address_line1 || '',
        address_line2: profile.address_line2 || '',
        city: profile.city || '',
        state: profile.state || '',
        postal_code: profile.postal_code || '',
        country: (profile.country as 'US' | 'CA') || 'US'
      });
      setDefaultRole(profile.default_role);
      setAvatarUrl(profile.avatar_url || '');
      
      // If profile is missing basic info, try to fetch from people table as fallback
      if (!profile.first_name || !profile.last_name || !profile.phone) {
        console.log('ProfileManager: Missing info, fetching fallback from people table...');
        const fetchPeopleFallback = async () => {
          try {
            const { data: personData } = await supabase
              .from('people')
              .select('*')
              .eq('user_id', user?.id)
              .maybeSingle();
            
            console.log('ProfileManager: Fallback result:', personData);
            if (personData) {
              if (!profile.first_name && personData.first_name) setFirstName(personData.first_name);
              if (!profile.last_name && personData.last_name) setLastName(personData.last_name);
              if (!profile.phone && personData.phone) setAccountPhone(personData.phone);
            }
          } catch (error) {
            console.error('Error fetching people fallback:', error);
          }
        };
        fetchPeopleFallback();
      }

      fetchMusicianProfile();
    }
  }, [profile, personId]);

  async function fetchMusicianProfile() {
    setLoadingMusician(true);
    try {
      const { data, error } = await supabase
        .from('musician_details')
        .select('*')
        .eq('id', personId)
        .maybeSingle();

      if (error) throw error;
      
      const defaultMusician = {
        instruments: [],
        looking_for_bands: false,
        open_for_gigs: false,
        musician_bio: ''
      };

      if (data) {
        setIsMusician(true);
        const cleanedData = {
          ...defaultMusician,
          ...data
        };
        setMusicianData(cleanedData);
        setInitialMusicianData(cleanedData);
      } else {
        setIsMusician(false);
        setMusicianData(defaultMusician);
        setInitialMusicianData(defaultMusician);
      }
    } catch (error) {
      console.error('Error fetching musician profile:', error);
    } finally {
      setLoadingMusician(false);
    }
  }

  const validatePhone = (phoneStr: string) => {
    if (!phoneStr) return true;
    const digits = phoneStr.replace(/\D/g, '');
    return digits.length >= 10;
  };

  const handleCreateSoloAct = async () => {
    if (!user?.id) return;
    setSaving(true);
    setMessage(null);

    try {
      // 2. Create the band profile
      const bandName = `${firstName} ${lastName}`.trim() || 'Solo Act';
      
      const { data: newBand, error: bandError } = await supabase
        .from('bands')
        .insert({
          name: bandName,
          manager_id: user.id,
          description: musicianData.musician_bio || '',
          phone: accountPhone || '',
          logo_url: avatarUrl || '',
          city: addressParts.city || '',
          state: addressParts.state || '',
          country: addressParts.country || 'US',
          is_published: false,
          created_by_id: personId,
          updated_at: new Date().toISOString(),
          updated_by_id: personId
        })
        .select()
        .single();

      if (bandError) throw bandError;

      // We don't need to select from bands_ordered here as we just inserted and got the data back,
      // but if we were to fetch it again, we'd use bands_ordered.
      // The insert already returns the data in the order it was inserted or the table default.
      // However, to be consistent with "prefer selecting from bands_ordered", 
      // if we needed to refresh the local state with the canonical order:
      const { data: orderedBand } = await supabase
        .from('bands_ordered')
        .select('*')
        .eq('id', newBand.id)
        .single();
      
      // Use orderedBand if available, otherwise newBand
      const finalBand = orderedBand || newBand;

      setMessage({ type: 'success', text: 'Solo Act created successfully! You can now manage it from the Admin Dashboard or My Band tab.' });
    } catch (error: any) {
      console.error('Error creating solo act:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create solo act.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Validate Account Phone
    if (!validatePhone(accountPhone)) {
      setMessage({ type: 'error', text: 'Please enter a valid account phone number (10 digits).' });
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
      if (!user?.id) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const changes: any = {};
      if (firstName !== (profile?.first_name || '')) changes.first_name = firstName;
      if (lastName !== (profile?.last_name || '')) changes.last_name = lastName;
      if (accountPhone !== (profile?.phone || '')) changes.phone = accountPhone;
      if (avatarUrl !== (profile?.avatar_url || '')) changes.avatar_url = avatarUrl;
      if (defaultRole !== profile?.default_role) changes.default_role = defaultRole;
      if (addressParts.address_line1 !== (profile?.address_line1 || '')) changes.address_line1 = addressParts.address_line1;
      if (addressParts.address_line2 !== (profile?.address_line2 || '')) changes.address_line2 = addressParts.address_line2;
      if (addressParts.city !== (profile?.city || '')) changes.city = addressParts.city;
      if (addressParts.state !== (profile?.state || '')) changes.state = addressParts.state;
      if (addressParts.postal_code !== (profile?.postal_code || '')) changes.postal_code = addressParts.postal_code;
      if (addressParts.country !== (profile?.country || 'US')) changes.country = addressParts.country;
      if (JSON.stringify(selectedRoles.sort()) !== JSON.stringify((availableRoles || []).sort())) changes.roles = selectedRoles;

      // 1. Save Profile
      const profileData: any = {
        id: user.id,
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        phone: accountPhone,
        address_line1: addressParts.address_line1,
        address_line2: addressParts.address_line2,
        city: addressParts.city,
        state: addressParts.state,
        postal_code: addressParts.postal_code,
        country: addressParts.country,
        default_role: defaultRole,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
        updated_by_id: personId
      };

      let { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData);

      // If avatar_url column is missing, retry without it
      if (profileError && profileError.message?.includes('avatar_url')) {
        console.warn('avatar_url column missing in profiles table, retrying without it');
        const { avatar_url, ...safeProfileData } = profileData;
        const { error: retryError } = await supabase
          .from('profiles')
          .upsert(safeProfileData);
        profileError = retryError;
      }

      if (profileError) {
        await handleSupabaseError(profileError, OperationType.UPDATE, 'profiles');
      }

      // 2. Sync with People table
      const peopleData: any = {
        user_id: user.id,
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        phone: accountPhone,
        default_role: defaultRole,
        updated_at: new Date().toISOString(),
        updated_by_id: personId,
        avatar_url: avatarUrl
      };

      let { error: peopleError } = await supabase
        .from('people')
        .upsert(peopleData, { onConflict: 'email' });

      // If avatar_url column is missing in people table, retry without it
      if (peopleError && peopleError.message?.includes('avatar_url')) {
        console.warn('avatar_url column missing in people table, retrying without it');
        const { avatar_url, ...safePeopleData } = peopleData;
        const { error: retryPeopleError } = await supabase
          .from('people')
          .upsert(safePeopleData, { onConflict: 'email' });
        peopleError = retryPeopleError;
      }

      if (peopleError) {
        console.warn('Failed to sync with people table:', peopleError);
      }

      // 3. Save Musician Details
      if (selectedRoles.includes('musician')) {
        const { error: musicianError } = await supabase
          .from('musician_details')
          .upsert({
            id: personId,
            ...musicianData,
            updated_at: new Date().toISOString(),
            updated_by_id: personId
          }, { 
            onConflict: 'id' 
          });

        if (musicianError) {
          await handleSupabaseError(musicianError, OperationType.UPDATE, 'musician_details');
        }
        
        setInitialMusicianData(musicianData);
      } else if (initialMusicianData) {
        // If they unchecked musician, delete the record to remove the role
        const { error: deleteError } = await supabase
          .from('musician_details')
          .delete()
          .eq('id', personId);
          
        if (deleteError) {
          console.error('Error deleting musician details:', deleteError);
        }
        setInitialMusicianData(null);
      }

      // 4. Save Role Requests
      for (const [role, request] of Object.entries(roleRequests)) {
        if (request.active) {
          const { error: requestError } = await supabase
            .from('role_requests')
            .insert({
              user_id: user.id,
              role_type: role,
              request_details: request.details
            });
          if (requestError) throw requestError;
        }
      }

      if (Object.keys(changes).length > 0) {
        await logUpdate(changes);
      }

      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      setTimeout(() => {
        onSaveSuccess?.();
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setChangingPassword(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === user?.email) {
      setMessage({ type: 'error', text: 'Please enter a new email address.' });
      return;
    }

    setUpdatingEmail(true);
    setMessage(null);

    try {
      await updateUserEmail(newEmail, user?.email || '', user?.id || '');
      setMessage({ type: 'success', text: 'Email update initiated! Please check your new email for a confirmation link.' });
      setIsEditingEmail(false);
      setNewEmail('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUpdatingEmail(false);
    }
  };

  const publicRoles: { id: UserRole, label: string, description: string }[] = [
    { id: 'musician', label: 'Musician', description: 'Showcase your talent, find bands, and list yourself for gigs.' },
    { id: 'registered_guest', label: 'Registered Guest', description: 'Follow your favorite bands and venues, and save event preferences.' },
  ];

  const toggleRole = (roleId: UserRole) => {
    let nextRoles: UserRole[];
    if (selectedRoles.includes(roleId)) {
      // Don't allow removing the last public role if not an admin
      const currentPublicRoles = selectedRoles.filter(r => publicRoles.some(pr => pr.id === r));
      if (currentPublicRoles.length <= 1 && !profile?.is_super_admin) {
        return;
      }
      nextRoles = selectedRoles.filter(r => r !== roleId);
      setSelectedRoles(nextRoles);
    } else {
      nextRoles = [...selectedRoles, roleId];
      setSelectedRoles(nextRoles);
      // If re-selecting musician, try to fetch existing data if we don't have it
      if (roleId === 'musician' && !musicianData.id) {
        fetchMusicianProfile();
      }
    }
    setDefaultRole(getPriorityDefaultRole(nextRoles));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-white">My Profile</h2>
        <p className="text-neutral-400">Manage your personal information and musician details in one place.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-neutral-900 p-1 rounded-2xl border border-neutral-800 w-fit">
        <Button
          variant={activeTab === 'account' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('account')}
          className="flex items-center gap-2"
        >
          <Settings size={18} />
          Account Settings
        </Button>
        {selectedRoles.includes('musician') && (
          <Button
            variant={activeTab === 'musician' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('musician')}
            className="flex items-center gap-2"
          >
            <Music size={18} />
            Musician Details
          </Button>
        )}
        <Button
          variant={activeTab === 'security' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('security')}
          className="flex items-center gap-2"
        >
          <Shield size={18} />
          Security
        </Button>
      </div>

      {activeTab === 'security' ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 md:p-10 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-red-500" size={24} />
            <h3 className="text-xl font-bold text-white">Change Password</h3>
          </div>
          <p className="text-neutral-400 text-sm">Update your account password. We recommend using a strong, unique password.</p>
          
          <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-2xl text-sm font-medium ${
                message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {message.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={changingPassword}
            >
              {changingPassword ? <Loader2 className="animate-spin" size={20} /> : <Shield size={20} className="text-neutral-400" />}
              Update Password
            </Button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          {activeTab === 'account' ? (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <SectionHeader id="basic" title="Basic Info" icon={User} />
              {expandedSection === 'basic' && (
                <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-32 h-32 rounded-full bg-neutral-800 border-2 border-neutral-700 overflow-hidden relative group">
                        {avatarUrl ? (
                          <>
                            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => setAvatarUrl('')}
                              className="absolute top-2 right-2 p-1.5 shadow-lg z-10 opacity-0 group-hover:opacity-100"
                              title="Delete Profile Photo"
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </Button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600">
                            <User size={48} className="text-neutral-400" />
                          </div>
                        )}
                        <ImageUpload 
                          type="logo"
                          onUploadComplete={(urlSet) => {
                            if (typeof urlSet !== 'string') {
                              // Use the logo (400x400) image for the avatar
                              setAvatarUrl(urlSet.logo || urlSet.original);
                            }
                          }}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Camera size={24} className="text-white" />
                        </ImageUpload>
                      </div>
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Profile Photo</span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      <div className="space-y-2">
                        <Input
                          label="First Name"
                          type="text"
                          value={firstName || ''}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          icon={<User size={18} className="text-neutral-500" />}
                        />
                      </div>
                      <div className="space-y-2">
                        <Input
                          label="Last Name"
                          type="text"
                          value={lastName || ''}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          icon={<User size={18} className="text-neutral-500" />}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                          <input
                            type="email"
                            value={isEditingEmail ? newEmail : (user?.email || '')}
                            onChange={(e) => setNewEmail(e.target.value)}
                            disabled={!isEditingEmail || updatingEmail}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl py-3 pl-12 pr-24 text-white focus:ring-2 focus:ring-red-600 outline-none transition-all disabled:bg-neutral-800/50 disabled:text-neutral-400 disabled:cursor-not-allowed"
                            placeholder="new-email@example.com"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {isEditingEmail ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleEmailChange}
                                  disabled={updatingEmail || !newEmail || newEmail === user?.email}
                                  className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-all disabled:opacity-50"
                                >
                                  {updatingEmail ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setIsEditingEmail(false); setNewEmail(''); }}
                                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setIsEditingEmail(true); setNewEmail(user?.email || ''); }}
                                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-all"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Input
                          label="Phone Number"
                          type="tel"
                          value={accountPhone || ''}
                          onChange={(e) => setAccountPhone(formatPhoneNumber(e.target.value))}
                          placeholder="(555) 000-0000"
                          icon={<Phone size={18} className={accountPhone && !validatePhone(accountPhone) ? 'text-red-500' : 'text-neutral-500'} />}
                          className={accountPhone && !validatePhone(accountPhone) ? 'border-red-500/50' : ''}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
              
            {/* Address Section */}
            <div className="space-y-4">
              <SectionHeader id="address" title="Address Information" icon={MapPin} />
              {expandedSection === 'address' && (
                <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Country</label>
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
              )}
            </div>

            {/* Current System Roles Section */}
            <div className="space-y-4">
              <SectionHeader id="roles" title="Current System Roles" icon={Shield} />
              {expandedSection === 'roles' && (
                <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {managedBands.length > 0 && (
                      <div className="p-4 bg-neutral-800/50 rounded-2xl border border-neutral-700">
                        <p className="text-sm font-bold text-white">Manager of {managedBands.length} band{managedBands.length > 1 ? 's' : ''}</p>
                        <p className="text-xs text-neutral-400">{managedBands.map(b => b.name).join(', ')}</p>
                      </div>
                    )}
                    {managedVenues.length > 0 && (
                      <div className="p-4 bg-neutral-800/50 rounded-2xl border border-neutral-700">
                        <p className="text-sm font-bold text-white">Manager of {managedVenues.length} venue{managedVenues.length > 1 ? 's' : ''}</p>
                        <p className="text-xs text-neutral-400">{managedVenues.map(v => v.name).join(', ')}</p>
                      </div>
                    )}
                    {managedBands.length === 0 && managedVenues.length === 0 && (
                      <p className="text-sm text-neutral-400">No system roles currently assigned.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Role Request Section */}
            <div className="space-y-4">
              <SectionHeader id="request" title="Request Business Access" icon={Shield} />
              {expandedSection === 'request' && (
                <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6 animate-in fade-in slide-in-from-top-2">
                  <p className="text-neutral-400 text-sm">Select the roles you would like to request access for. An admin will review your request.</p>

                  {/* Self-assignment is now handled via publicRoles mapping above */}
                  {(['venue_manager', 'band_manager', 'promoter'] as const).map((role) => (
                    <div key={role} className="space-y-4 p-6 bg-neutral-800/30 border border-neutral-700/50 rounded-3xl">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-white uppercase tracking-widest">Request {role === 'promoter' ? 'Promoter' : role.replace('_', ' ')} Access</label>
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            variant={roleRequests[role].active ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setRoleRequests(prev => ({ ...prev, [role]: { ...prev[role], active: true } }))}
                          >
                            Y
                          </Button>
                          <Button
                            type="button"
                            variant={!roleRequests[role].active ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setRoleRequests(prev => ({ ...prev, [role]: { ...prev[role], active: false } }))}
                          >
                            N
                          </Button>
                        </div>
                      </div>
                      {roleRequests[role].active && (
                        <Textarea
                          value={roleRequests[role].details}
                          onChange={(e) => setRoleRequests(prev => ({ ...prev, [role]: { ...prev[role], details: e.target.value } }))}
                          placeholder={`Tell us more about why you need ${role === 'promoter' ? 'Promoter' : role.replace('_', ' ')} access...`}
                          rows={3}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Roles Section */}
            <div className="space-y-4">
              <SectionHeader id="account_roles" title="Account Roles" icon={Settings} />
              {expandedSection === 'account_roles' && (
                <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-4">
                    <div className="p-6 bg-neutral-800/30 border border-neutral-700/50 rounded-3xl">
                      <p className="text-xs text-neutral-400 leading-relaxed italic">
                        <span className="text-white font-bold">Registered Guest</span> is your baseline role. 
                        <span className="text-white font-bold ml-1">Musician</span> can be self-assigned below. 
                        <span className="text-white font-bold ml-1">Promoter</span>, <span className="text-white font-bold">Venue Manager</span>, and <span className="text-white font-bold">Band Manager</span> roles require admin assignment.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {publicRoles.map((role) => (
                        <div 
                          key={role.id}
                          onClick={() => toggleRole(role.id)}
                          className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                            selectedRoles.includes(role.id)
                              ? 'bg-red-600/10 border-red-600/50'
                              : 'bg-neutral-800/30 border-neutral-700/50 hover:border-neutral-600'
                          }`}
                        >
                          <div className="space-y-1">
                            <h4 className={`font-bold uppercase tracking-widest text-sm ${
                              selectedRoles.includes(role.id) ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-300'
                            }`}>
                              {role.label}
                            </h4>
                            <p className="text-xs text-neutral-500 leading-relaxed max-w-md">
                              {role.description}
                            </p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedRoles.includes(role.id)
                              ? 'bg-red-600 border-red-600'
                              : 'border-neutral-700'
                          }`}>
                            {selectedRoles.includes(role.id) && <Check size={14} className="text-white" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Show assigned business partner roles that are not self-assignable */}
                    {selectedRoles.some(r => ['promoter', 'venue_manager', 'band_manager'].includes(r)) && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 px-2">Assigned Business Partner Roles</label>
                        <div className="flex flex-wrap gap-2 px-2">
                          {selectedRoles.filter(r => ['promoter', 'venue_manager', 'band_manager'].includes(r)).map(role => (
                            <div key={role} className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-[10px] font-bold uppercase tracking-widest text-neutral-300 flex items-center gap-2">
                              <Shield size={12} className="text-red-500" />
                              {role === 'promoter' ? 'Promoter' : role.replace('_', ' ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedRoles.length > 1 && (
                    <div className="p-6 bg-neutral-800/50 border border-neutral-700 rounded-3xl space-y-4">
                      <div className="flex items-center gap-3">
                        <Settings className="text-red-500" size={20} />
                        <h4 className="font-bold text-white">Default Session Role</h4>
                      </div>
                      <p className="text-xs text-neutral-400">Choose which role should be active by default when you log in. You can always switch roles using the switcher in the navigation bar.</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedRoles.map((roleId) => {
                          const roleInfo = publicRoles.find(pr => pr.id === roleId) || (roleId === 'super_admin' ? { label: 'Super Admin' } : { label: roleId.replace('_', ' ') });
                          return (
                            <Button
                              key={roleId}
                              type="button"
                              variant={defaultRole === roleId ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => setDefaultRole(roleId)}
                            >
                              {roleInfo.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Musician Details Section */}
            <div className="space-y-4">
              <SectionHeader id="musician_details" title="Musician Details" icon={Music} />
              {expandedSection === 'musician_details' && (
                <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 bg-neutral-800/50 rounded-2xl border border-neutral-700 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="looking_for_bands"
                        checked={musicianData.looking_for_bands}
                        onChange={(e) => setMusicianData({ ...musicianData, looking_for_bands: e.target.checked })}
                        className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-red-500 focus:ring-red-600"
                      />
                      <label htmlFor="looking_for_bands" className="text-sm font-medium text-neutral-200 cursor-pointer">
                        I am currently looking for bands or events to join
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="open_for_gigs"
                        checked={musicianData.open_for_gigs}
                        onChange={(e) => setMusicianData({ ...musicianData, open_for_gigs: e.target.checked })}
                        className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-red-500 focus:ring-red-600"
                      />
                      <label htmlFor="open_for_gigs" className="text-sm font-medium text-neutral-200 cursor-pointer">
                        I am open for gigs
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-600/10 border border-red-600/20 p-6 rounded-2xl">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">Book Gigs as a Solo Act?</h3>
                      <p className="text-sm text-neutral-400">Generate a Band profile from your musician details so venues can book you.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleCreateSoloAct}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="animate-spin" size={18} /> : <Music size={18} />}
                      Create Solo Act
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Bio / Description</label>
                      <Textarea
                        rows={4}
                        value={musicianData.musician_bio || ''}
                        onChange={(e) => setMusicianData({ ...musicianData, musician_bio: e.target.value })}
                        placeholder="Tell us about your musical journey..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Instruments Section */}
            <div className="space-y-4">
              <SectionHeader id="musician_media" title="Instruments" icon={Music} />
              {expandedSection === 'musician_media' && (
                <div className="p-4 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Instruments</label>
                    <div className="flex flex-wrap gap-2">
                      {['Guitar', 'Bass', 'Drums', 'Vocals', 'Keyboard', 'Saxophone', 'Trumpet', 'Violin'].map((inst) => (
                        <button
                          key={inst}
                          type="button"
                          onClick={() => {
                            const current = musicianData.instruments || [];
                            if (current.includes(inst)) {
                              setMusicianData({ ...musicianData, instruments: current.filter(i => i !== inst) });
                            } else {
                              setMusicianData({ ...musicianData, instruments: [...current, inst] });
                            }
                          }}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            (musicianData.instruments || []).includes(inst)
                              ? 'bg-red-600 text-white'
                              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                          }`}
                        >
                          {inst}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-2xl text-sm font-medium ${
            message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all"
          >
            <Eye size={20} />
            Preview Profile
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save All Changes
          </button>
        </div>
      </form>
    )}

    <ProfilePreviewModal 
        isOpen={showPreview} 
        onClose={() => setShowPreview(false)} 
        type="profile" 
        data={{ 
          first_name: firstName, 
          last_name: lastName, 
          email: user?.email, 
          phone: accountPhone,
          avatar_url: avatarUrl,
          roles: selectedRoles,
          musicianData: musicianData
        }} 
      />
    </div>
  );
}
