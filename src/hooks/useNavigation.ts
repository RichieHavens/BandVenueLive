import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  ShieldCheck, UserCircle, Calendar, LayoutDashboard, MapPin, Music, Heart, Globe 
} from 'lucide-react';

export function useNavigation() {
  const { user, profile, loading } = useAuth();

  const managementTabs = React.useMemo(() => {
    const tabs: { id: string; label: string; icon: React.ElementType }[] = [];
    
    // Guard: Only compute if profile and roles are fully loaded
    if (loading || !user || !profile || !profile.roles) {
      return tabs;
    }

    if (profile.roles.includes('admin')) {
      tabs.push({ id: 'admin', label: 'Data Admin', icon: ShieldCheck });
    }

    tabs.push({ id: 'my-profile', label: 'My Profile', icon: UserCircle });
    tabs.push({ id: 'my-reports', label: 'My Reports', icon: Calendar });

    if (profile.roles.includes('venue_manager') || profile.roles.includes('band_manager')) {
      tabs.push({ id: 'manage-events', label: 'Manage Events', icon: Calendar });
    }
    if (profile.roles.includes('venue_manager')) {
      tabs.push({ id: 'venue-manager', label: 'Venue Manager', icon: LayoutDashboard });
      tabs.push({ id: 'my-venue', label: 'My Venue', icon: MapPin });
    }
    if (profile.roles.includes('band_manager')) {
      tabs.push({ id: 'my-band', label: 'My Band', icon: Music });
    }
    if (profile.roles.includes('guest')) {
      tabs.push({ id: 'favorites', label: 'My Favorites', icon: Heart });
    }
    if (profile.roles.includes('syndication_manager')) {
      tabs.push({ id: 'syndication', label: 'Syndication', icon: Globe });
    }
    return tabs;
  }, [user, profile, loading]);

  return { managementTabs, loading };
}
