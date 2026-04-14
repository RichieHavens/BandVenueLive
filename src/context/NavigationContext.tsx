import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { 
  ShieldCheck, UserCircle, Calendar, LayoutDashboard, MapPin, Music, Heart, Globe, Users
} from 'lucide-react';

export interface RecentRecord {
  id: string;
  type: 'band' | 'venue' | 'person' | 'event';
  name: string;
  timestamp: number;
}

interface NavigationContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  managementTabs: { id: string; label: string; icon: React.ElementType }[];
  discoveryTabs: { id: string; label: string; icon: React.ElementType }[];
  handleTabChange: (tabId: string) => void;
  unsavedChanges: boolean;
  setUnsavedChanges: (dirty: boolean) => void;
  selectedBandId: string | null;
  setSelectedBandId: (id: string | null) => void;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  selectedVenueId: string | null;
  setSelectedVenueId: (id: string | null) => void;
  selectedPersonId: string | null;
  setSelectedPersonId: (id: string | null) => void;
  eventFilter: { attention: string; entity: string } | null;
  setEventFilter: (filter: { attention: string; entity: string } | null) => void;
  recentRecords: RecentRecord[];
  addRecentRecord: (record: RecentRecord) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut, activeRole, isSuperAdmin, isBandManager, isVenueManager, isMusician } = useAuth();
  const [activeTab, setActiveTabState] = React.useState(() => {
    const saved = localStorage.getItem('bandvenue_active_tab');
    if (saved) return saved;
    return 'events';
  });
  const [selectedBandId, setSelectedBandIdState] = React.useState<string | null>(() => localStorage.getItem('bandvenue_selected_band_id'));
  const [selectedEventId, setSelectedEventIdState] = React.useState<string | null>(() => localStorage.getItem('bandvenue_selected_event_id'));
  const [selectedVenueId, setSelectedVenueIdState] = React.useState<string | null>(() => localStorage.getItem('bandvenue_selected_venue_id'));
  const [selectedPersonId, setSelectedPersonIdState] = React.useState<string | null>(() => localStorage.getItem('bandvenue_selected_person_id'));
  const [eventFilter, setEventFilter] = React.useState<{ attention: string; entity: string } | null>(null);
  const [recentRecords, setRecentRecords] = React.useState<RecentRecord[]>(() => {
    const saved = localStorage.getItem('bandvenue_recent_records');
    return saved ? JSON.parse(saved) : [];
  });

  const addRecentRecord = (record: RecentRecord) => {
    setRecentRecords(prev => {
      const filtered = prev.filter(r => r.id !== record.id);
      const updated = [record, ...filtered].slice(0, 25);
      localStorage.setItem('bandvenue_recent_records', JSON.stringify(updated));
      return updated;
    });
  };

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    localStorage.setItem('bandvenue_active_tab', tab);
  };

  const setSelectedBandId = (id: string | null) => {
    setSelectedBandIdState(id);
    if (id) localStorage.setItem('bandvenue_selected_band_id', id);
    else localStorage.removeItem('bandvenue_selected_band_id');
  };

  const setSelectedEventId = (id: string | null) => {
    setSelectedEventIdState(id);
    if (id) localStorage.setItem('bandvenue_selected_event_id', id);
    else localStorage.removeItem('bandvenue_selected_event_id');
  };

  const setSelectedVenueId = (id: string | null) => {
    setSelectedVenueIdState(id);
    if (id) localStorage.setItem('bandvenue_selected_venue_id', id);
    else localStorage.removeItem('bandvenue_selected_venue_id');
  };

  const setSelectedPersonId = (id: string | null) => {
    setSelectedPersonIdState(id);
    if (id) localStorage.setItem('bandvenue_selected_person_id', id);
    else localStorage.removeItem('bandvenue_selected_person_id');
  };

  // Sync active tab with login state if no tab is saved
  React.useEffect(() => {
    if (!loading && user && activeRole) {
      const savedTab = localStorage.getItem('bandvenue_active_tab');
      
      // Force role-based tab if we are on the placeholder dashboard or default events tab
      if (!savedTab || activeTab === 'events' || activeTab === 'dashboard' || savedTab === 'dashboard') {
        if (activeRole === 'venue_manager' && isVenueManager) {
          setActiveTab('venue-manager');
        } else if (activeRole === 'band_manager' && isBandManager) {
          setActiveTab('band-manager');
        } else if (profile?.is_super_admin === true) {
          setActiveTab('super_admin');
        } else {
          setActiveTab('dashboard');
        }
      }
    }
  }, [user, loading, activeRole, activeTab, isVenueManager, isBandManager, isSuperAdmin]);
  const [unsavedChanges, setUnsavedChanges] = React.useState(false);
  
  console.log('NavigationProvider initialized', { user: !!user, profile: !!profile, loading });

  const discoveryTabs = [
    { id: 'venues', label: 'Venues', icon: MapPin },
    { id: 'bands', label: 'Bands', icon: Music },
    { id: 'musicians', label: 'Musicians', icon: Users },
  ];

  const managementTabs = useMemo(() => {
    const tabs: { id: string; label: string; icon: React.ElementType }[] = [];
    
    if (loading || !user || !profile || !activeRole) {
      return tabs;
    }

    // Role-specific dashboard
    if (profile?.is_super_admin === true) {
      tabs.push({ id: 'super_admin', label: 'Admin Dashboard', icon: ShieldCheck });
      tabs.push({ id: 'role-requests', label: 'Role Requests', icon: Users });
      tabs.push({ id: 'syndication', label: 'Syndication', icon: Globe });
      tabs.push({ id: 'venue-manager', label: 'Venue Manager', icon: LayoutDashboard });
      tabs.push({ id: 'band-manager', label: 'Band Manager', icon: Music });
      tabs.push({ id: 'super-admin', label: 'Super Admin', icon: ShieldCheck });
    } else if (activeRole === 'venue_manager' && isVenueManager) {
      tabs.push({ id: 'venue-manager', label: 'Venue Manager', icon: LayoutDashboard });
    } else if (activeRole === 'band_manager' && isBandManager) {
      tabs.push({ id: 'band-manager', label: 'Dashboard', icon: LayoutDashboard });
    } else {
      tabs.push({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard });
    }

    // Always show these for any authenticated user
    tabs.push({ id: 'my-profile', label: 'My Profile', icon: UserCircle });
    tabs.push({ id: 'my-reports', label: 'My Reports', icon: Calendar });

    if (activeRole === 'registered_guest') {
      tabs.push({ id: 'favorites', label: 'My Favorites', icon: Heart });
    }

    // Promoter role might need its own flag later
    if (activeRole === 'promoter') {
      tabs.push({ id: 'syndication', label: 'Syndication', icon: Globe });
    }

    return tabs;
  }, [user, profile, loading, activeRole, isSuperAdmin, isBandManager, isVenueManager]);

  const handleTabChange = async (tabId: string) => {
    if (unsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        setUnsavedChanges(false);
        if (tabId === 'logout') {
          localStorage.removeItem('bandvenue_active_tab');
          localStorage.removeItem('active_role');
          await signOut();
          setActiveTab('events');
        } else {
          setActiveTab(tabId);
        }
      }
    } else if (tabId === 'logout') {
      localStorage.removeItem('bandvenue_active_tab');
      localStorage.removeItem('active_role');
      await signOut();
      setActiveTab('events');
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <NavigationContext.Provider value={{ 
      activeTab, 
      setActiveTab, 
      managementTabs, 
      discoveryTabs, 
      handleTabChange,
      unsavedChanges,
      setUnsavedChanges,
      selectedBandId,
      setSelectedBandId,
      selectedEventId,
      setSelectedEventId,
      selectedVenueId,
      setSelectedVenueId,
      selectedPersonId,
      setSelectedPersonId,
      eventFilter,
      setEventFilter,
      recentRecords,
      addRecentRecord
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
}
