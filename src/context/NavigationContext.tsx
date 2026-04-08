import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { 
  ShieldCheck, UserCircle, Calendar, LayoutDashboard, MapPin, Music, Heart, Globe, Users
} from 'lucide-react';

interface NavigationContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  managementTabs: { id: string; label: string; icon: React.ElementType }[];
  discoveryTabs: { id: string; label: string; icon: React.ElementType }[];
  handleTabChange: (tabId: string) => void;
  unsavedChanges: boolean;
  setUnsavedChanges: (dirty: boolean) => void;
  pendingTab: string | null;
  setPendingTab: (tab: string | null) => void;
  confirmNavigation: () => Promise<void>;
  selectedBandId: string | null;
  setSelectedBandId: (id: string | null) => void;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut, activeRole } = useAuth();
  const [activeTab, setActiveTabState] = React.useState(() => {
    const saved = localStorage.getItem('bandvenue_active_tab');
    if (saved) return saved;
    return 'events';
  });
  const [selectedBandId, setSelectedBandId] = React.useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    localStorage.setItem('bandvenue_active_tab', tab);
  };

  // Sync active tab with login state if no tab is saved
  React.useEffect(() => {
    if (!loading && user && activeRole) {
      const savedTab = localStorage.getItem('bandvenue_active_tab');
      
      // Only force a role-based tab if we don't have a saved tab
      if (!savedTab) {
        if (activeRole === 'venue_manager') {
          setActiveTab('venue-manager');
        } else if (activeRole === 'band_manager') {
          setActiveTab('band-manager');
        } else if (activeRole === 'admin') {
          setActiveTab('admin');
        } else {
          setActiveTab('dashboard');
        }
      }
    }
  }, [user, loading, activeRole]);
  const [unsavedChanges, setUnsavedChanges] = React.useState(false);
  const [pendingTab, setPendingTab] = React.useState<string | null>(null);
  
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
    if (activeRole === 'admin') {
      tabs.push({ id: 'admin', label: 'Admin Dashboard', icon: ShieldCheck });
      tabs.push({ id: 'role-requests', label: 'Role Requests', icon: Users });
      tabs.push({ id: 'syndication', label: 'Syndication', icon: Globe });
      tabs.push({ id: 'venue-manager', label: 'Venue Manager', icon: LayoutDashboard });
      tabs.push({ id: 'band-manager', label: 'Band Manager', icon: Music });
      tabs.push({ id: 'super-admin', label: 'Super Admin', icon: ShieldCheck });
    } else if (activeRole === 'venue_manager') {
      tabs.push({ id: 'venue-manager', label: 'Dashboard', icon: LayoutDashboard });
    } else if (activeRole === 'band_manager') {
      tabs.push({ id: 'band-manager', label: 'Dashboard', icon: LayoutDashboard });
    } else {
      tabs.push({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard });
    }

    // Always show these for any authenticated user
    tabs.push({ id: 'my-profile', label: 'My Profile', icon: UserCircle });
    tabs.push({ id: 'my-reports', label: 'My Reports', icon: Calendar });

    if (activeRole === 'guest') {
      tabs.push({ id: 'favorites', label: 'My Favorites', icon: Heart });
    }

    if (activeRole === 'syndication_manager') {
      tabs.push({ id: 'syndication', label: 'Syndication', icon: Globe });
    }

    return tabs;
  }, [user, profile, loading, activeRole]);

  const handleTabChange = async (tabId: string) => {
    if (unsavedChanges) {
      setPendingTab(tabId);
    } else if (tabId === 'logout') {
      localStorage.removeItem('bandvenue_active_tab');
      localStorage.removeItem('active_role');
      await signOut();
      setActiveTab('events');
    } else {
      setActiveTab(tabId);
    }
  };

  const confirmNavigation = async () => {
    if (pendingTab) {
      const target = pendingTab;
      setUnsavedChanges(false);
      setPendingTab(null);
      if (target === 'logout') {
        localStorage.removeItem('bandvenue_active_tab');
        localStorage.removeItem('active_role');
        await signOut();
        setActiveTab('events');
      } else {
        setActiveTab(target);
      }
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
      pendingTab,
      setPendingTab,
      confirmNavigation,
      selectedBandId,
      setSelectedBandId,
      selectedEventId,
      setSelectedEventId
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
