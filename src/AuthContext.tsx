import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Profile, UserRole, RoleMaster } from './types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  activeRole: UserRole | null;
  roleData: RoleMaster | null;
  loading: boolean;
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
  const [loading, setLoading] = useState(true);

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
    if (profile && !profile.roles.includes(role)) {
      console.warn(`User does not have the role: ${role}`);
      return;
    }
    setActiveRoleState(role);
    // Optionally persist this to local storage for the session
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
    try {
      // 1. Get the profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // 2. Also check the people table for this user (by user_id or email)
      // We do this separately to avoid issues with special characters (like +) in .or() strings
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

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          
          // Use data from people table if available to seed the new profile
          const initialData = {
            id: userId,
            email: userEmail,
            first_name: personData?.first_name || '',
            last_name: personData?.last_name || '',
            phone: personData?.phone || '',
            roles: personData?.roles || ['guest']
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
            setProfile(newData);
          }
        } else {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }
      } else {
        // We have a profile, but maybe it's missing info that the people table has
        const mergedProfile = { ...profileData };
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
          // Merge roles
          const combinedRoles = Array.from(new Set([...(mergedProfile.roles || []), ...(personData.roles || [])]));
          if (JSON.stringify(combinedRoles.sort()) !== JSON.stringify((mergedProfile.roles || []).sort())) {
            mergedProfile.roles = combinedRoles;
            needsUpdate = true;
          }
        }

        // Inject admin role for superuser
        const updatedRoles = [...(mergedProfile.roles || [])];
        if (userEmail === 'rickheavern@gmail.com' && !updatedRoles.includes('admin')) {
          updatedRoles.push('admin');
          needsUpdate = true;
        }
        
        // Default to guest if no roles
        if (updatedRoles.length === 0) {
          updatedRoles.push('guest');
          needsUpdate = true;
        }

        mergedProfile.roles = updatedRoles;

        if (needsUpdate) {
          await supabase.from('profiles').update({
            first_name: mergedProfile.first_name,
            last_name: mergedProfile.last_name,
            phone: mergedProfile.phone,
            roles: mergedProfile.roles,
            default_role: mergedProfile.default_role
          }).eq('id', userId);
        }
        
        setProfile(mergedProfile);
        
        // Set active role
        const savedRole = localStorage.getItem('active_role') as UserRole;
        
        // Define role priority (higher index = higher priority)
        const rolePriority: UserRole[] = ['guest', 'musician', 'band_manager', 'venue_manager', 'syndication_manager', 'admin'];
        
        if (savedRole && mergedProfile.roles.includes(savedRole)) {
          setActiveRoleState(savedRole);
        } else if (mergedProfile.default_role && mergedProfile.roles.includes(mergedProfile.default_role)) {
          setActiveRoleState(mergedProfile.default_role);
        } else if (mergedProfile.roles.length > 0) {
          // Sort roles by priority and pick the highest
          const sortedRoles = [...mergedProfile.roles].sort((a, b) => {
            return rolePriority.indexOf(b) - rolePriority.indexOf(a);
          });
          setActiveRoleState(sortedRoles[0]);
        }

        console.log('Profile successfully set in state:', mergedProfile);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      // Ensure profile is null if we failed to fetch/create it
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

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
      loading, 
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
