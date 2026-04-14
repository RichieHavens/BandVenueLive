import React from 'react';
import { useAuth } from '../AuthContext';
import { 
  ShieldCheck, UserCircle, Calendar, LayoutDashboard, MapPin, Music, Heart, Globe 
} from 'lucide-react';

export function useNavigation() {
  const { user, profile, loading, isSuperAdmin, isBandManager, isVenueManager, isMusician } = useAuth();

  const managementTabs = React.useMemo(() => {
    const tabs: { id: string; label: string; icon: React.ElementType }[] = [];
    
    // Guard: Only compute if profile is fully loaded
    if (loading || !user || !profile) {
      return tabs;
    }

    if (isSuperAdmin) {
      tabs.push({ id: 'super_admin', label: 'Data Admin', icon: ShieldCheck });
    }

    tabs.push({ id: 'my-profile', label: 'My Profile', icon: UserCircle });
    tabs.push({ id: 'my-reports', label: 'My Reports', icon: Calendar });

    if (isVenueManager || isBandManager) {
      tabs.push({ id: 'manage-events', label: 'Manage Events', icon: Calendar });
    }
    if (isVenueManager) {
      tabs.push({ id: 'venue-manager', label: 'Venue Manager', icon: LayoutDashboard });
      tabs.push({ id: 'my-venue', label: 'My Venue', icon: MapPin });
    }
    if (isBandManager) {
      tabs.push({ id: 'my-band', label: 'My Band', icon: Music });
    }
    
    // Everyone can have favorites
    tabs.push({ id: 'favorites', label: 'My Favorites', icon: Heart });

    return tabs;
  }, [user, profile, loading, isSuperAdmin, isBandManager, isVenueManager, isMusician]);

  return { managementTabs, loading };
}
