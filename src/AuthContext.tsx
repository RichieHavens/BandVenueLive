import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Profile, UserRole, RoleMaster } from './types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  activeRole: UserRole | null;
  roleData: RoleMaster | null;
  personId: string | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isMusician: boolean;
  isBandManager: boolean;
  isVenueManager: boolean;
  isSoloAct: boolean;
  availableRoles: UserRole[];
  managedBands: { id: string; name: string }[];
  managedVenues: { id: string; name: string }[];
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
  setActiveRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(null);
  const [roleData, setRoleData] = useState<RoleMaster | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [managedBands, setManagedBands] = useState<{ id: string; name: string }[]>([]);
  const [managedVenues, setManagedVenues] = useState<{ id: string; name: string }[]>([]);
  const [isMusician, setIsMusician] = useState(false);
  const [isSoloAct, setIsSoloAct] = useState(false);

  const availableRoles = useMemo(() => {
    const roles: UserRole[] = ['registered_guest'];
    if (profile?.is_super_admin) roles.push('super_admin');
    if (managedBands.length > 0) roles.push('band_manager');
    if (managedVenues.length > 0) roles.push('venue_manager');
    if (isMusician) roles.push('musician');
    // Promoter role might still need a flag or be inferred elsewhere, 
    // for now keeping it simple or adding it if they have promoter-specific records
    return roles;
  }, [profile?.is_super_admin, managedBands.length, managedVenues.length, isMusician]);

  useEffect(() => {
    console.log('AuthContext: user changed', user);
    if (user) {
      fetchManagedBands();
      fetchManagedVenues();
    } else {
      setManagedBands([]);
      setManagedVenues([]);
    }
  }, [user]);

  async function fetchManagedBands() {
    console.log('AuthContext: Fetching managed bands for', user?.id);
    try {
      const { data, error } = await supabase
        .from('bands_ordered')
        .select('id, name')
        .eq('manager_id', user?.id);
      if (error) {
        console.error('AuthContext: Error fetching managed bands:', error);
        throw error;
      }
      console.log('AuthContext: Managed bands fetched successfully', data);
      if (data) setManagedBands(data);
    } catch (error) {
      console.error('AuthContext: Error in fetchManagedBands:', error);
    }
  }

  async function fetchManagedVenues() {
    console.log('AuthContext: Fetching managed venues for', user?.id);
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name')
        .eq('manager_id', user?.id);
      if (error) {
        console.error('AuthContext: Error fetching managed venues:', error);
        throw error;
      }
      console.log('AuthContext: Managed venues fetched successfully', data);
      if (data) setManagedVenues(data);
    } catch (error) {
      console.error('AuthContext: Error in fetchManagedVenues:', error);
    }
  }

  // Fetch role metadata when activeRole changes
  useEffect(() => {
    if (!activeRole) {
      setRoleData(null);
      return;
    }

    const fetchRoleData = async () => {
      try {
        const { data, error } = await supabase
          .from('roles_master')
          .select('*')
          .eq('id', activeRole)
          .maybeSingle();

        if (error) throw error;
        setRoleData(data ? (data as RoleMaster) : null);
      } catch (error) {
        console.error('Error fetching role metadata:', error);
        setRoleData(null);
      }
    };

    fetchRoleData();
  }, [activeRole]);

  const setActiveRole = (role: UserRole) => {
    if (!availableRoles.includes(role)) {
      console.warn(`User does not have the role: ${role}`);
      return;
    }
    setActiveRoleState(role);
    localStorage.setItem('active_role', role);
  };

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session.user.email);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          const userId = session.user.id;
          const userEmail = session.user.email;
          const now = new Date().toISOString();

          // Update last_login_at in profiles and people
          // Non-blocking tracking
          Promise.all([
            supabase.from('profiles').update({ last_login_at: now }).eq('id', userId),
            supabase.from('people').update({ last_login_at: now }).eq('email', userEmail),
            // Log the login
            supabase.from('login_logs').insert([{
              user_id: userId,
              email: userEmail,
              user_agent: window.navigator.userAgent
            }])
          ]).catch(err => console.warn('Login tracking failed:', err));
        }
        fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        setActiveRoleState(null);
        setRoleData(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string, userEmail?: string) {
    setLoading(true);
    console.log('AuthContext: Fetching profile for', userId);
    try {
      // 1. Get the profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // 2. Also check the people table for this user (by user_id or email)
      let { data: personData, error: personError } = await supabase
        .from('people')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (!personData && userEmail) {
        const { data: personByEmail, error: emailError } = await supabase
          .from('people')
          .select('*')
          .eq('email', userEmail.toLowerCase())
          .maybeSingle();
        
        if (emailError) {
          console.warn('Error fetching person by email fallback:', emailError);
        }
        personData = personByEmail;
      }

      if (personError) {
        console.warn('Error fetching person data fallback:', personError);
      }

      // If we found a person record but it's not linked to this user_id yet, link it
      if (personData && !personData.user_id && userId) {
        await supabase.from('people').update({ user_id: userId }).eq('id', personData.id);
      }

      // 3. Check for musician details
      let musicianDetails = null;
      if (personData) {
        const { data: mDetails, error: mError } = await supabase
          .from('musician_details')
          .select('*')
          .eq('id', personData.id)
          .maybeSingle();
        
        if (mError) {
          console.warn('Error fetching musician details:', mError);
        }
        musicianDetails = mDetails;
      }

      const isMusicianVal = !!musicianDetails;
      setIsMusician(isMusicianVal);
      setIsSoloAct(personData?.is_solo_act || false);

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Use data from people table if available to seed the new profile
          const initialData = {
            id: userId,
            email: userEmail,
            first_name: personData?.first_name || '',
            last_name: personData?.last_name || '',
            phone: personData?.phone || '',
            is_super_admin: personData?.is_super_admin || false
          };

          const { data: newData, error: insertError } = await supabase
            .from('profiles')
            .insert([initialData])
            .select()
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
            setProfile(null);
          } else {
            setProfile({
              ...newData,
              is_musician: isMusicianVal,
              is_solo_act: personData?.is_solo_act || false
            });
          }
        } else {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }
      } else {
        // We have a profile, but maybe it's missing info that the people table has
        const mergedProfile = { 
          ...profileData,
          is_musician: isMusicianVal,
          is_solo_act: personData?.is_solo_act || false
        };
        let needsUpdate = false;

        if (personData) {
          if (!mergedProfile.first_name && personData.first_name) {
            mergedProfile.first_name = personData.first_name;
            needsUpdate = true;
          }
          if (!mergedProfile.last_name && personData.last_name) {
            mergedProfile.last_name = personData.last_name;
            needsUpdate = true;
          }
          if (!mergedProfile.phone && personData.phone) {
            mergedProfile.phone = personData.phone;
            needsUpdate = true;
          }
          if (mergedProfile.is_super_admin !== personData.is_super_admin) {
            mergedProfile.is_super_admin = personData.is_super_admin;
            needsUpdate = true;
          }
        }

        // Inject super_admin for superuser email
        if (userEmail === 'rickheavern@gmail.com' && !mergedProfile.is_super_admin) {
          mergedProfile.is_super_admin = true;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await supabase.from('profiles').update({
            first_name: mergedProfile.first_name,
            last_name: mergedProfile.last_name,
            phone: mergedProfile.phone,
            is_super_admin: mergedProfile.is_super_admin,
            default_role: mergedProfile.default_role
          }).eq('id', userId);
        }
        
        setProfile(mergedProfile);
        setPersonId(personData?.id || null);
        
        // Determine available roles for this session
        const currentAvailableRoles: UserRole[] = ['registered_guest'];
        if (mergedProfile.is_super_admin) currentAvailableRoles.push('super_admin');
        // Note: managedBands and managedVenues are fetched in a separate useEffect, 
        // but we can check them here if they are already loaded or wait for them.
        // For the initial active role selection, we might need to wait for the managed records.
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  // Set active role based on available roles
  useEffect(() => {
    if (loading || !profile) return;

    const savedRole = localStorage.getItem('active_role') as UserRole;
    const rolePriority: UserRole[] = ['registered_guest', 'musician', 'band_manager', 'venue_manager', 'promoter', 'super_admin'];
    
    if (savedRole && availableRoles.includes(savedRole)) {
      setActiveRoleState(savedRole);
    } else if (profile.default_role && availableRoles.includes(profile.default_role)) {
      setActiveRoleState(profile.default_role);
    } else if (availableRoles.length > 0) {
      const sortedRoles = [...availableRoles].sort((a, b) => {
        return rolePriority.indexOf(b) - rolePriority.indexOf(a);
      });
      setActiveRoleState(sortedRoles[0]);
    }
  }, [profile, availableRoles, loading]);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('bandvenue_active_tab');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      activeRole, 
      roleData,
      personId,
      loading, 
      isSuperAdmin: profile?.is_super_admin || false,
      isMusician,
      isBandManager: managedBands.length > 0,
      isVenueManager: managedVenues.length > 0,
      isSoloAct,
      availableRoles,
      managedBands,
      managedVenues,
      signOut, 
      refreshProfile, 
      setProfile,
      setActiveRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
