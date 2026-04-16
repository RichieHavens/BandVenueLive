import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigationContext } from '../context/NavigationContext';
import { Person, Venue, Band, UserRole, MusicianDetails } from '../types';
import { Loader2, Plus, Search, User, Mail, Phone, Building2, Music, Trash2, X, ShieldCheck, Clock, Eye, EyeOff, AlertCircle, Check, RefreshCcw, Star } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Switch } from './ui/Switch';
import { theme } from '../lib/theme';
import { cn } from '../lib/utils';
import { formatPhoneNumber } from '../lib/phoneFormatter';
import { formatDate, formatTime, getPriorityDefaultRole } from '../lib/utils';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

import { useAuth } from '../AuthContext';

export default function PeopleManager() {
  const { personId } = useAuth();
  const { addRecentRecord } = useNavigationContext();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const logUpdate = async (tableName: string, recordId: string, changes: any) => {
    try {
      await supabase.from('audit_logs').insert({
        table_name: tableName,
        record_id: recordId,
        changes,
        user_id: personId,
        created_by_id: personId
      });
    } catch (err) {
      console.error('Error logging audit:', err);
    }
  };
  const [isAdding, setIsAdding] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'musician'>('all');
  // TODO: role logic removed
  // const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  // TODO: role logic removed
  // const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(['registered_guest']);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isSoloAct, setIsSoloAct] = useState(false);
  const [isMusician, setIsMusician] = useState(false);
  // TODO: role logic removed
  // const [selectedRoleForAssociation, setSelectedRoleForAssociation] = useState<UserRole>('venue_manager');
  const [musicianData, setMusicianData] = useState<Partial<MusicianDetails>>({
    instruments: [],
    looking_for_bands: false,
    open_for_gigs: false
  });
  
  // Venue/Band selection state
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [entitySearch, setEntitySearch] = useState('');
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [existingVenueIds, setExistingVenueIds] = useState<string[]>([]);
  const [existingBandIds, setExistingBandIds] = useState<string[]>([]);
  // TODO: role logic removed
  // const [defaultRole, setDefaultRole] = useState<UserRole>('registered_guest');
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<{ id: string, name: string, isNew: boolean } | null>(null);

  // TODO: role logic removed
  // const ALL_ROLES: UserRole[] = ['venue_manager', 'band_manager', 'musician', 'registered_guest', 'promoter', 'super_admin'];

  useEffect(() => {
    fetchPeople();
    fetchEntities();
  }, []);

  useEffect(() => {
    setEntitySearch('');
    setSelectedEntityId('');
  }, [/* selectedRoleForAssociation */]);

  useEffect(() => {
    if (editingPerson) {
      addRecentRecord({
        id: editingPerson.id,
        type: 'person',
        name: `${editingPerson.first_name} ${editingPerson.last_name}`,
        timestamp: Date.now()
      });
      setFirstName(editingPerson.first_name);
      setLastName(editingPerson.last_name);
      setEmail(editingPerson.email || '');
      setPhone(editingPerson.phone || '');
      setIsSuperAdmin(editingPerson.is_super_admin || false);
      setIsSoloAct(editingPerson.is_solo_act || false);
      // TODO: role logic removed
      // setDefaultRole(editingPerson.default_role || 'registered_guest');
      setExistingVenueIds(editingPerson.venue_ids || []);
      setExistingBandIds(editingPerson.band_ids || []);
      
      if (editingPerson.musician_details) {
        setIsMusician(true);
        setMusicianData(editingPerson.musician_details);
      } else {
        setIsMusician(false);
        setMusicianData({
          instruments: [],
          looking_for_bands: false,
          open_for_gigs: false
        });
      }
      setCreateAccount(false);
      setPassword('');
      setConfirmPassword('');
      setSelectedEntityId('');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');
      setCreateAccount(false);
      setIsSuperAdmin(false);
      setIsSoloAct(false);
      setIsMusician(false);
      // TODO: role logic removed
      // setDefaultRole('registered_guest');
      setExistingVenueIds([]);
      setExistingBandIds([]);
      setNewEntityName('');
      setSelectedEntityId('');
    }
  }, [editingPerson]);

  async function fetchPeople() {
    if (people.length === 0) setLoading(true);
    const { data, error } = await supabase
      .from('people')
      .select(`
        *,
        musician_details:musician_details(*)
      `)
      .order('created_at', { ascending: false });
    if (data) setPeople(data as any);
    if (error) console.error('Error fetching people:', error);
    setLoading(false);
  }

  async function fetchEntities() {
    const { data: vData } = await supabase.from('venues').select('id, name, manager_id').order('name');
    const { data: bData } = await supabase.from('bands_ordered').select('id, name, manager_id').order('name');
    if (vData) setVenues(vData as any);
    if (bData) setBands(bData as any);
  }

  // TODO: role logic removed
  /*
  const toggleRole = (role: UserRole) => {
    setSelectedRoles(prev => {
      const nextRoles = prev.includes(role) 
        ? prev.filter(r => r !== role) 
        : [...prev, role];
      setDefaultRole(getPriorityDefaultRole(nextRoles));
      return nextRoles;
    });
  };
  */

  async function handleSavePerson(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    
    setSaving(true);
    setErrorMessage(null);
    try {
      console.log('Saving person:', { firstName, lastName, email, createAccount });
      
      // Validation
      if (createAccount && password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (createAccount && password && password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (email && !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (!firstName.trim() || !lastName.trim()) {
        throw new Error('First and last name are required');
      }

      const emailToSave = email.trim().toLowerCase() || null;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      let newUserId: string | null = null;

      // 1. Handle Auth Account Creation/Linking
      if (createAccount) {
        if (!emailToSave) {
          throw new Error('Email is required to assign login privileges.');
        }

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', emailToSave)
          .maybeSingle();
        
        if (existingProfile) {
          newUserId = existingProfile.id;
        } else if (password) {
          if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase configuration missing. Cannot create auth account.');
          }

          const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false }
          });

          const { data: signUpData, error: signUpError } = await tempSupabase.auth.signUp({
            email: emailToSave,
            password,
            options: {
              data: {
                first_name: firstName.trim(),
                last_name: lastName.trim()
              }
            }
          });
          
          if (signUpError) {
            if (signUpError.message.includes('User already registered')) {
              throw new Error(`The email ${emailToSave} is already registered in Auth but has no profile. Try linking it manually.`);
            }
            throw signUpError;
          }
          
          newUserId = signUpData.user?.id || null;
        }
      }

      // 2. Check for duplicate person record
      if (emailToSave) {
        const { data: personWithEmail } = await supabase
          .from('people')
          .select('id, first_name, last_name')
          .eq('email', emailToSave)
          .maybeSingle();
        
        if (personWithEmail && (!editingPerson || personWithEmail.id !== editingPerson.id)) {
          throw new Error(`The email ${emailToSave} is already assigned to ${personWithEmail.first_name} ${personWithEmail.last_name}.`);
        }
      }

      // 3. Handle Entity Creation
      let entityId = selectedEntityId;
      const venueIds = [...existingVenueIds];
      const bandIds = [...existingBandIds];
      // TODO: role logic removed
      // let finalRoles = [...selectedRoles];

      if (selectedEntityId === 'new' && newEntityName.trim()) {
        // TODO: role logic removed
        // const table = selectedRoleForAssociation === 'venue_manager' ? 'venues' : 'bands';
        const table = 'venues'; // Temporary fallback
        const { data: newEntity, error: entityError } = await supabase
          .from(table)
          .insert({ 
            name: newEntityName.trim(),
            created_by_id: personId,
            updated_at: new Date().toISOString(),
            updated_by_id: personId
          })
          .select()
          .single();
        
        if (entityError) throw entityError;
        entityId = newEntity.id;
      }

      // TODO: role logic removed
      // let finalDefaultRole = defaultRole;
      if (entityId && entityId !== 'new') {
        /* TODO: role logic removed
        if (selectedRoleForAssociation === 'venue_manager' && !venueIds.includes(entityId)) {
          venueIds.push(entityId);
          if (!finalRoles.includes('venue_manager')) finalRoles.push('venue_manager');
          if (!editingPerson) finalDefaultRole = 'venue_manager';
        }
        if (selectedRoleForAssociation === 'band_manager' && !bandIds.includes(entityId)) {
          bandIds.push(entityId);
          if (!finalRoles.includes('band_manager')) finalRoles.push('band_manager');
          if (!editingPerson) finalDefaultRole = 'band_manager';
        }
        */
      }

      const targetUserId = newUserId || editingPerson?.user_id;

      // 4. Save Person Record
      const personData: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: emailToSave,
        phone: phone.trim(),
        user_id: targetUserId,
        is_super_admin: isSuperAdmin,
        is_solo_act: isSoloAct,
        // TODO: role logic removed
        // default_role: finalDefaultRole,
        // venue_ids: venueIds,
        // band_ids: bandIds,
        updated_at: new Date().toISOString(),
        updated_by_id: personId
      };

      let savedPersonId = editingPerson?.id;

      if (editingPerson) {
        const { error } = await supabase
          .from('people')
          .update(personData)
          .eq('id', editingPerson.id);
        if (error) throw error;
        await logUpdate('people', editingPerson.id, personData);
      } else {
        const { data: newPerson, error: personError } = await supabase
          .from('people')
          .upsert({
            ...personData,
            created_by_id: personId
          }, { onConflict: 'email' })
          .select()
          .single();
        
        if (personError) throw personError;
        savedPersonId = newPerson.id;
        await logUpdate('people', savedPersonId, personData);
      }

      // 5. Sync Profile and Musician Details
      if (targetUserId) {
        const profileData = {
          id: targetUserId,
          email: emailToSave,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          is_super_admin: isSuperAdmin,
          // TODO: role logic removed
          // default_role: finalDefaultRole,
          updated_at: new Date().toISOString(),
          updated_by_id: personId
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData);
        
        if (profileError) console.warn('Profile sync warning:', profileError);
      }

      // Handle Musician Details (tied to personId, not userId)
      if (savedPersonId) {
        if (isMusician) {
          const { error: musicianError } = await supabase
            .from('musician_details')
            .upsert({
              id: savedPersonId,
              ...musicianData,
              updated_at: new Date().toISOString(),
              updated_by_id: personId
            });
          if (musicianError) console.warn('Musician details sync warning:', musicianError);
        } else {
          const { error: deleteError } = await supabase
            .from('musician_details')
            .delete()
            .eq('id', savedPersonId);
          if (deleteError) console.warn('Musician details delete warning:', deleteError);
        }
      }

      // 6. Link Entity Back
      if (entityId && entityId !== 'new' && savedPersonId) {
        // TODO: role logic removed
        // const table = selectedRoleForAssociation === 'venue_manager' ? 'venues' : 'bands';
        const table = 'venues'; // Temporary fallback
        const updateData: any = { 
          updated_at: new Date().toISOString(),
          updated_by_id: personId
        };
        
        if (targetUserId) {
          updateData.manager_id = targetUserId;
        }

        const { error: linkError } = await supabase
          .from(table)
          .update(updateData)
          .eq('id', entityId);
        
        if (linkError) console.error(`Error linking ${table}:`, linkError);
      }

      await fetchPeople();
      await fetchEntities();
      setSaveSuccess({ 
        id: savedPersonId as string, 
        name: `${firstName.trim()} ${lastName.trim()}`, 
        isNew: !editingPerson 
      });
    } catch (error: any) {
      console.error('Error saving person:', error);
      if (error.status === 429) {
        setErrorMessage('Rate limit exceeded. Please wait a while before adding more login accounts.');
      } else {
        setErrorMessage(error.message || 'Error saving person');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePerson(id: string) {
    try {
      // Check if person is linked to any bands
      const { data: linkedBands, error: checkError } = await supabase
        .from('bands_ordered')
        .select('id, name')
        .eq('created_by_id', id);
        
      if (checkError) throw checkError;
      
      if (linkedBands && linkedBands.length > 0) {
        setErrorMessage(`Cannot delete this person because they are linked to a Solo Act band profile (${linkedBands[0].name}). Please delete the band profile first.`);
        return;
      }

      setConfirmDialog({
        message: 'Are you sure you want to permanently delete this person?',
        onConfirm: async () => {
          try {
            const { error } = await supabase.from('people').delete().eq('id', id);
            if (error) throw error;
            fetchPeople();
          } catch (err: any) {
            console.error('Error deleting person:', err);
            setErrorMessage(err.message || 'Failed to delete person');
          } finally {
            setConfirmDialog(null);
          }
        }
      });
    } catch (err: any) {
      console.error('Error checking person links:', err);
      setErrorMessage(err.message || 'Failed to check if person can be deleted');
    }
  }

  async function handleCreateSoloActAdmin(person: Person) {
    setConfirmDialog({
      message: `Create a Solo Act Band Profile for ${person.first_name} ${person.last_name}?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const bandName = `${person.first_name} ${person.last_name}`.trim();
          
          // Fetch musician details if they exist in the profiles table
          let phone = person.phone || '';
          let description = '';
          
          if (person.user_id) {
            const { data: musicianDetails } = await supabase
              .from('musician_details')
              .select('*')
              .eq('id', person.id)
              .maybeSingle();
              
            if (musicianDetails) {
              phone = musicianDetails.phone || phone;
              description = musicianDetails.description || '';
            }
          }

          const { data: newBand, error: bandError } = await supabase
            .from('bands')
            .insert({
              name: bandName,
              manager_id: person.user_id || null,
              created_by_id: person.id,
              phone: phone,
              description: description,
              is_published: false
            })
            .select()
            .single();

          if (bandError) throw bandError;

          // Update the person's band_ids array to include the new band
          // const updatedBandIds = [...(person.band_ids || []), newBand.id];
          // const { error: personUpdateError } = await supabase
          //   .from('people')
          //   .update({ band_ids: updatedBandIds })
          //   .eq('id', person.id);
            
          // if (personUpdateError) throw personUpdateError;

          alert(`Successfully created Solo Act: ${bandName}`);
          fetchPeople();
        } catch (error: any) {
          console.error('Error creating solo act:', error);
          alert(error.message || 'Failed to create solo act.');
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  }

  // TODO: role logic removed
  // const filteredEntities = (selectedRoleForAssociation === 'venue_manager' ? venues : bands)
  //   .filter(e => e.name.toLowerCase().includes(entitySearch.toLowerCase()));
  const filteredEntities = venues.filter(e => e.name.toLowerCase().includes(entitySearch.toLowerCase())); // Temporary fallback

  const filteredPeople = people.filter(p => {
    const matchesSearch = `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase()));
    
    if (typeFilter === 'musician') return matchesSearch && !!p.musician_details;
    
    // TODO: role logic removed
    /*
    if (roleFilter === 'all') return matchesSearch;
    
    if (roleFilter === 'super_admin') return matchesSearch && p.is_super_admin;
    */
    
    return matchesSearch;
  });

  async function handleLookupUser() {
    if (!email.trim()) return;
    setLookupLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      
      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhone(data.phone || '');
        // TODO: role logic removed
        // setSelectedRoles(data.roles || ['registered_guest']);
        setCreateAccount(true);
        setSuccessMessage('Existing account found and linked!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage('No existing user found with this email.');
      }
    } catch (err: any) {
      console.error('Lookup error:', err);
      setErrorMessage(err.message);
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-24 md:pb-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 w-full max-w-md relative">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Action</h3>
            <p className="text-neutral-400 mb-8">{confirmDialog.message}</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-neutral-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex justify-between items-start mb-6">
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-400 ml-4 mt-1">
            <X size={20} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">People</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchPeople} className="text-neutral-400 hover:text-white">
            <RefreshCcw size={16} />
          </Button>
          <Button 
            onClick={() => setIsAdding(true)}
          >
            <Plus size={16} /> Add Person
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <Input
            type="text"
            placeholder="Search people by name or email..."
            className="pl-12"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className={cn(theme.input, "min-w-[160px]")}
        >
          <option value="all">All People</option>
          <option value="musician">Musicians</option>
        </select>
        {/* TODO: role logic removed
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className={cn(theme.input, "min-w-[160px]")}
        >
          <option value="all">All Roles</option>
          {ALL_ROLES.map(role => (
            <option key={role} value={role}>{role.replace('_', ' ')}</option>
          ))}
        </select>
        */}
      </div>

      {(isAdding || editingPerson || saveSuccess) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-24 md:pb-4">
            <Card className="p-6 md:p-8 w-full max-w-lg relative max-h-[70vh] md:max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setEditingPerson(null);
                  setEntitySearch('');
                  setSaveSuccess(null);
                }}
                className="absolute top-6 right-6 text-neutral-400 hover:text-white"
              >
                <X size={24} />
              </button>

              {saveSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck size={32} />
                  </div>
                  <h4 className="text-2xl font-bold mb-2 text-white">Success!</h4>
                  <p className="text-neutral-400 mb-8">
                    {saveSuccess.name} has been successfully {saveSuccess.isNew ? 'added' : 'updated'}.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingPerson(null);
                        setSaveSuccess(null);
                      }}
                    >
                      Back to List
                    </Button>
                    <Button
                      onClick={() => {
                        setSaveSuccess(null);
                        setEditingPerson(null);
                        setIsAdding(true);
                        // Reset form fields
                        setFirstName('');
                        setLastName('');
                        setEmail('');
                        setPhone('');
                        // TODO: role logic removed
                        // setSelectedRoles(['registered_guest']);
                        // setDefaultRole('registered_guest');
                        setExistingVenueIds([]);
                        setExistingBandIds([]);
                        setCreateAccount(false);
                        setPassword('');
                        setConfirmPassword('');
                        setSelectedEntityId('');
                      }}
                    >
                      Add Another Person
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (saveSuccess.isNew) {
                          const newPerson = people.find(p => p.id === saveSuccess.id);
                          if (newPerson) {
                            setEditingPerson(newPerson);
                            setIsAdding(false);
                          }
                        }
                        setSaveSuccess(null);
                      }}
                    >
                      Edit More Details
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h4 className="text-2xl font-bold mb-6">{editingPerson ? 'Edit Person' : 'Add New Person'}</h4>
                  
                  {errorMessage && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500">
                      <AlertCircle size={20} />
                      <p className="text-sm font-medium">{errorMessage}</p>
                    </div>
                  )}

                  <form onSubmit={handleSavePerson} className="space-y-4">
                    {/* Section 1: Personal Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-red-600/10 rounded-lg flex items-center justify-center text-red-500">
                          <User size={14} />
                        </div>
                        <h5 className="text-sm font-bold uppercase tracking-widest text-white">Personal Information</h5>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">First Name</label>
                          <Input
                            required
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="bg-neutral-800 border-neutral-700 focus:ring-red-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Last Name</label>
                          <Input
                            required
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="bg-neutral-800 border-neutral-700 focus:ring-red-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                            Email Address {createAccount && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex gap-2">
                            <Input
                              required={createAccount}
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="user@example.com"
                              className="bg-neutral-800 border-neutral-700 focus:ring-red-600"
                            />
                            {!editingPerson && (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={handleLookupUser}
                                disabled={lookupLoading || !email}
                                className="shrink-0"
                              >
                                {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Phone Number</label>
                          <Input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(555) 000-0000"
                            className="bg-neutral-800 border-neutral-700 focus:ring-red-600"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Phone Number</label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                        className="bg-neutral-800"
                      />
                    </div>

                    {/* Section 2: Login & Account */}
                    <div className="space-y-4 pt-4 border-t border-neutral-800">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-red-600/10 rounded-lg flex items-center justify-center text-red-500">
                          <ShieldCheck size={14} />
                        </div>
                        <h5 className="text-sm font-bold uppercase tracking-widest text-white">Login & Account</h5>
                      </div>

                      {(!editingPerson || !editingPerson.user_id) ? (
                        <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-white">Assign Login Privileges</p>
                              <p className="text-[10px] text-neutral-400">Allow this person to log in with their email.</p>
                            </div>
                            <Switch
                              checked={createAccount}
                              onCheckedChange={setCreateAccount}
                            />
                          </div>

                          {createAccount && (
                            <div className="space-y-4 pt-4 border-t border-neutral-700">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Password</label>
                                  <div className="relative">
                                    <Input
                                      required={createAccount}
                                      type={showPassword ? "text" : "password"}
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      placeholder="Min 6 chars..."
                                      className="pr-10 bg-neutral-800 border-neutral-700 focus:ring-red-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                    >
                                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Confirm Password</label>
                                  <div className="relative">
                                    <Input
                                      required={createAccount}
                                      type={showPassword ? "text" : "password"}
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                      placeholder="Repeat password..."
                                      className="pr-10 bg-neutral-800 border-neutral-700 focus:ring-red-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                    >
                                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <p className="text-[10px] text-neutral-500 italic">
                                Note: This will create a new authentication account for the user.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                              <ShieldCheck size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Account Active</p>
                              <p className="text-[10px] text-neutral-400">This person has a registered login account.</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
                                  if (error) throw error;
                                  setSuccessMessage('Password reset email sent!');
                                  setTimeout(() => setSuccessMessage(null), 3000);
                                } catch (err: any) {
                                  setErrorMessage(err.message);
                                }
                              }}
                              className="flex-1"
                            >
                              Reset Password
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase.auth.resend({
                                    type: 'signup',
                                    email: email.trim().toLowerCase(),
                                    options: { emailRedirectTo: window.location.origin }
                                  });
                                  if (error) throw error;
                                  setSuccessMessage('Confirmation email resent!');
                                  setTimeout(() => setSuccessMessage(null), 3000);
                                } catch (err: any) {
                                  setErrorMessage(err.message);
                                }
                              }}
                              className="flex-1"
                            >
                              Resend Confirmation
                            </Button>
                          </div>
                          {successMessage && <p className="text-[10px] text-green-500 mt-2 font-bold">{successMessage}</p>}
                        </div>
                      )}
                    </div>

              {isMusician && (
                <div className="pt-4 border-t border-neutral-800 space-y-4">
                  <h5 className="text-sm font-bold text-white">Musician Details</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Low Res Image URL</label>
                      <input type="text" value={musicianData.low_res_image_url || ''} onChange={(e) => setMusicianData({...musicianData, low_res_image_url: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">High Res Image URL</label>
                      <input type="text" value={musicianData.high_res_image_url || ''} onChange={(e) => setMusicianData({...musicianData, high_res_image_url: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Hero Image URL</label>
                      <input type="text" value={musicianData.hero_image_url || ''} onChange={(e) => setMusicianData({...musicianData, hero_image_url: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Instruments Played</label>
                    <input type="text" value={musicianData.instruments?.join(', ') || ''} onChange={(e) => setMusicianData({...musicianData, instruments: e.target.value.split(',').map(i => i.trim())})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600" placeholder="Guitar, Vocals..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Music Description</label>
                    <textarea value={musicianData.music_description || ''} onChange={(e) => setMusicianData({...musicianData, music_description: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">About Me / Career</label>
                    <textarea value={musicianData.about_description || ''} onChange={(e) => setMusicianData({...musicianData, about_description: e.target.value})} className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600" rows={3} />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="lookingForBand" checked={musicianData.looking_for_bands || false} onChange={(e) => setMusicianData({...musicianData, looking_for_bands: e.target.checked})} className="rounded border-neutral-700 bg-neutral-800 text-red-500 focus:ring-red-600" />
                      <label htmlFor="lookingForBand" className="text-xs font-bold uppercase tracking-widest text-neutral-400">Looking for Band</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="openForGigs" checked={musicianData.open_for_gigs || false} onChange={(e) => setMusicianData({...musicianData, open_for_gigs: e.target.checked})} className="rounded border-neutral-700 bg-neutral-800 text-red-500 focus:ring-red-600" />
                      <label htmlFor="openForGigs" className="text-xs font-bold uppercase tracking-widest text-neutral-400">Open for Gigs</label>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 block mb-2">Status & Permissions</label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={isSuperAdmin} onCheckedChange={setIsSuperAdmin} />
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Super Admin</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={isMusician} onCheckedChange={setIsMusician} />
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Musician</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={isSoloAct} onCheckedChange={setIsSoloAct} />
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Solo Act</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* TODO: role logic removed
              {selectedRoles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 block">Default Role</label>
                  <select
                    value={defaultRole}
                    onChange={(e) => setDefaultRole(e.target.value as UserRole)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
                  >
                    {selectedRoles.map(role => (
                      <option key={role} value={role}>
                        {role === 'super_admin' ? 'Super Admin' : 
                         role === 'promoter' ? 'Promoter' : 
                         role.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-neutral-400 italic">
                    This is the role the user will see by default when they log in.
                  </p>
                </div>
              )}
              */}

              <div className="pt-4 border-t border-neutral-800">
                <h5 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-4">Associations</h5>
                
                {/* Existing Associations */}
                {(existingVenueIds.length > 0 || existingBandIds.length > 0) && (
                  <div className="space-y-2 mb-6">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 block">Current Links</label>
                    <div className="space-y-2">
                      {existingVenueIds.map(id => {
                        const venue = venues.find(v => v.id === id);
                        return (
                          <div key={id} className="flex items-center justify-between bg-neutral-800 p-2 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <Building2 size={14} className="text-neutral-400" />
                              <span>{venue?.name || 'Venue'}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setExistingVenueIds(prev => prev.filter(vId => vId !== id))}
                              className="text-red-500 hover:text-red-400 text-xs font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                      {existingBandIds.map(id => {
                        const band = bands.find(b => b.id === id);
                        return (
                          <div key={id} className="flex items-center justify-between bg-neutral-800 p-2 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <Music size={14} className="text-neutral-400" />
                              <span>{band?.name || 'Band'}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setExistingBandIds(prev => prev.filter(bId => bId !== id))}
                              className="text-red-500 hover:text-red-400 text-xs font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* TODO: role logic removed
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Add New Association</label>
                    <select
                      value={selectedRoleForAssociation}
                      onChange={(e) => {
                        setSelectedRoleForAssociation(e.target.value as UserRole);
                        setSelectedEntityId('');
                      }}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <option value="venue_manager">Venue Manager</option>
                      <option value="band_manager">Band Manager</option>
                    </select>
                  </div>
                  */}

                  <div className="space-y-2 relative">
                    <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                      {/* TODO: role logic removed
                      {selectedRoleForAssociation === 'venue_manager' ? 'Search Venue' : 'Search Band'}
                      */}
                      Search Venue
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                      <input
                        type="text"
                        value={entitySearch}
                        onChange={(e) => {
                          setEntitySearch(e.target.value);
                          setShowEntityDropdown(true);
                        }}
                        onFocus={() => setShowEntityDropdown(true)}
                        placeholder={`Type to search venues...`}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    {showEntityDropdown && (
                      <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEntityId('new');
                            setEntitySearch('');
                            setShowEntityDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-800 text-red-500 font-bold border-b border-neutral-800"
                        >
                          {/* TODO: role logic removed
                          + Add New {selectedRoleForAssociation === 'venue_manager' ? 'Venue' : 'Band'}
                          */}
                          + Add New Venue
                        </button>
                        {filteredEntities.length > 0 ? (
                          filteredEntities.map(entity => (
                            <button
                              key={entity.id}
                              type="button"
                              onClick={() => {
                                setSelectedEntityId(entity.id);
                                setEntitySearch(entity.name);
                                setShowEntityDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-800 text-white"
                            >
                              {entity.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-xs text-neutral-400 italic">No results found</div>
                        )}
                      </div>
                    )}
                    {showEntityDropdown && (
                      <div 
                        className="fixed inset-0 z-[55]" 
                        onClick={() => setShowEntityDropdown(false)}
                      />
                    )}
                  </div>

                  {selectedEntityId === 'new' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                        {/* TODO: role logic removed
                        New {selectedRoleForAssociation === 'venue_manager' ? 'Venue' : 'Band'} Name
                        */}
                        New Venue Name
                      </label>
                      <input
                        required={selectedEntityId === 'new'}
                        type="text"
                        value={newEntityName}
                        onChange={(e) => setNewEntityName(e.target.value)}
                        placeholder="Enter name..."
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all mt-4 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingPerson ? 'Update Person' : 'Create Person'}</span>
                )}
              </button>
            </form>
            </>
            )}
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-red-500" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPeople.map((person) => {
            const isSoloAct = person.is_solo_act || false;
            return (
            <div key={person.id} className="p-4 bg-neutral-800 rounded-2xl border border-neutral-700/50 hover:border-red-600/30 transition-all group flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-red-500 relative shrink-0">
                    <User size={20} />
                    {person.user_id && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border border-neutral-800" title="Registered User">
                        <ShieldCheck size={8} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base">{person.first_name} {person.last_name}</h4>
                      {isSoloAct && (
                        <span className="px-1.5 py-0.5 bg-purple-600/20 text-purple-400 text-[9px] font-bold uppercase tracking-widest rounded flex items-center gap-1">
                          <Music size={10} /> Solo Act
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      {person.email ? (
                        <>
                          <Mail size={12} /> {person.email}
                        </>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1 font-bold" title="Email required for login and full features">
                          <AlertCircle size={12} /> No Email Provided
                        </span>
                      )}
                      {person.phone && (
                        <>
                          <span className="text-neutral-700">•</span>
                          <Phone size={12} /> {formatPhoneNumber(person.phone)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {person.musician_details && !isSoloAct && (
                    <button
                      onClick={() => handleCreateSoloActAdmin(person)}
                      className="text-red-500 hover:text-red-400 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mr-2 bg-red-500/10 px-2 py-1 rounded-lg"
                      title="Generate a Band profile for this musician"
                    >
                      <Music size={12} /> Create Solo Act
                    </button>
                  )}
                  <button 
                    onClick={() => setEditingPerson(person)}
                    className="text-neutral-400 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest bg-neutral-900/50 px-2 py-1 rounded-lg flex items-center gap-1"
                    title="Edit Person & Associations"
                  >
                    <User size={12} /> Edit
                  </button>
                  <button 
                    onClick={() => {
                      setEditingPerson(person);
                      // We could potentially auto-scroll to associations here if we had a ref
                    }}
                    className="text-red-500 hover:text-red-400 transition-all text-[10px] font-bold uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-lg flex items-center gap-1"
                    title="Manage Links"
                  >
                    <Plus size={12} /> Link
                  </button>
                  <button 
                    onClick={() => handleDeletePerson(person.id)}
                    className="text-neutral-400 hover:text-red-500 transition-all bg-neutral-900/50 p-1.5 rounded-lg"
                    title="Delete Person"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {person.is_super_admin && (
                  <span className="px-1.5 py-0.5 bg-red-600/10 text-red-500 text-[9px] font-bold uppercase tracking-widest rounded flex items-center gap-1">
                    <ShieldCheck size={10} /> Super Admin
                  </span>
                )}
                {person.musician_details && (
                  <span className="px-1.5 py-0.5 bg-blue-600/10 text-blue-500 text-[9px] font-bold uppercase tracking-widest rounded flex items-center gap-1">
                    <Music size={10} /> Musician
                  </span>
                )}
                {person.is_solo_act && (
                  <span className="px-1.5 py-0.5 bg-purple-600/10 text-purple-400 text-[9px] font-bold uppercase tracking-widest rounded flex items-center gap-1">
                    <Star size={10} /> Solo Act
                  </span>
                )}
                {person.user_id && (
                  <span className="px-1.5 py-0.5 bg-green-600/10 text-green-500 text-[9px] font-bold uppercase tracking-widest rounded flex items-center gap-1">
                    <ShieldCheck size={10} /> Login Enabled
                  </span>
                )}
              </div>

              {(venues.some(v => v.manager_id === person.id) || bands.some(b => b.manager_id === person.id)) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-700/50">
                  {venues
                    .filter(v => v.manager_id === person.id)
                    .map(venue => {
                    return (
                      <div key={venue.id} className="flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-900/50 px-2 py-1 rounded-md">
                        <Building2 size={10} className="text-neutral-400" />
                        <span>{venue.name || `Venue ID: ${venue.id.slice(0, 8)}...`}</span>
                      </div>
                    );
                  })}
                  {bands
                    .filter(b => b.manager_id === person.id)
                    .map(band => {
                    return (
                      <div key={band.id} className="flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-900/50 px-2 py-1 rounded-md">
                        <Music size={10} className="text-neutral-400" />
                        <span>{band.name || `Band ID: ${band.id.slice(0, 8)}...`}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {(person.created_at || person.updated_at) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-neutral-600 font-medium uppercase tracking-wider pt-1">
                  {person.created_at && (
                    <span>Created: {formatDate(person.created_at)}</span>
                  )}
                  {person.updated_at && (
                    <div className="flex items-center gap-1 border-l border-neutral-800 pl-3">
                      <span>Edited: {formatDate(person.updated_at)}</span>
                    </div>
                  )}
                  {person.last_login_at && (
                    <div className="flex items-center gap-1 border-l border-neutral-800 pl-3">
                      <span className="text-green-600/70">Login: {formatDate(person.last_login_at)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
          {filteredPeople.length === 0 && (
            <div className="col-span-full text-center py-12 text-neutral-400">No records found.</div>
          )}
        </div>
      )}
    </div>
  );
}
