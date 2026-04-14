import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, UserCircle, ChevronDown, Info, LayoutDashboard, ShieldCheck, CheckCircle, HardHat, Music, MoreHorizontal, Menu, Calendar, MapPin, Users
} from 'lucide-react';
import { useNavigationContext } from '../context/NavigationContext';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export default function Navigation() {
  const { user, profile, activeRole, setActiveRole, signOut, availableRoles } = useAuth();
  const { 
    activeTab, 
    managementTabs, 
    discoveryTabs, 
    handleTabChange, 
  } = useNavigationContext();

  const [isDashboardOpen, setIsDashboardOpen] = React.useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = React.useState(false);
  const [isAboutOpen, setIsAboutOpen] = React.useState(false);

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    venue_manager: 'Venue Manager',
    band_manager: 'Band Manager',
    musician: 'Musician',
    registered_guest: 'Registered Guest',
    promoter: 'Promoter'
  };

  // Determine which tabs to show in the bottom nav based on auth state
  const primaryNavItems = React.useMemo(() => {
    if (!user) {
      // Public Mode: Show all discovery tabs
      return [
        { id: 'events', label: 'Events', icon: Calendar },
        ...discoveryTabs
      ].slice(0, 4); // Max 4 items before "More"
    } else {
      // Private Mode: Show core discovery + primary dashboard
      const items = [
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'venues', label: 'Venues', icon: MapPin },
      ];
      
      // Find the primary dashboard tab for their role
      const dashboardTab = managementTabs.find(t => t.id === 'venue-manager' || t.id === 'band-manager' || t.id === 'super_admin' || t.id === 'dashboard');
      
      if (dashboardTab) {
        items.push({ id: dashboardTab.id, label: 'Manage', icon: LayoutDashboard });
      } else {
        items.push({ id: 'bands', label: 'Bands', icon: Music });
      }
      
      return items;
    }
  }, [user, discoveryTabs, managementTabs]);

  // Items that go into the "More" menu
  const overflowDiscoveryTabs = discoveryTabs.filter(tab => !primaryNavItems.find(p => p.id === tab.id));
  const overflowManagementTabs = managementTabs.filter(tab => !primaryNavItems.find(p => p.id === tab.id));

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-950/90 backdrop-blur-xl border-t border-neutral-900 px-2 sm:px-6 pt-2 md:top-0 md:bottom-auto md:border-t-0 md:border-b z-[90] flex items-center min-h-[64px] md:min-h-[80px] pb-safe md:pb-2">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between md:justify-start gap-4">
        
        {/* Desktop Logo */}
        <div className="hidden md:flex items-center shrink-0 mr-4">
          <button 
            onClick={() => handleTabChange('events')}
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img 
              src="/bandvenue_nav_logo_transparent.png" 
              alt="BandVenue Logo" 
              className="h-10 w-auto object-contain"
            />
          </button>
        </div>
        
        {/* Primary Navigation Items */}
        <div className="flex flex-1 justify-around md:justify-center items-center h-full">
          {primaryNavItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "group relative flex flex-col items-center justify-center w-16 h-full transition-all shrink-0 focus-visible:outline-none",
                  isActive 
                    ? 'text-blue-500' 
                    : 'text-neutral-500 hover:text-neutral-300'
                )}
              >
                <div className="flex flex-col items-center gap-1 relative">
                  <tab.icon size={22} className={cn("transition-all duration-200", isActive ? 'scale-110' : 'group-hover:scale-110')} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={cn("text-[10px] font-bold tracking-wide transition-colors", isActive ? 'text-blue-500' : 'text-neutral-500')}>{tab.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavTab"
                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)]"
                    />
                  )}
                </div>
              </button>
            );
          })}
          
          {/* Mobile "More" Menu */}
          <div className="flex items-center justify-center w-16 h-full">
            <Sheet>
              <SheetTrigger render={
                <button className={cn(
                  "group relative flex flex-col items-center justify-center w-full h-full gap-1 rounded-xl transition-all shrink-0 focus-visible:outline-none",
                  (overflowManagementTabs.some(t => t.id === activeTab) || overflowDiscoveryTabs.some(t => t.id === activeTab)) ? 'text-blue-500' : 'text-neutral-500 hover:text-neutral-300'
                )}>
                  <Menu size={22} className="transition-all duration-200 group-hover:scale-110" strokeWidth={2} />
                  <span className="text-[10px] font-bold tracking-wide">Menu</span>
                </button>
              } />
              <SheetContent side="bottom" className="bg-neutral-950 border-neutral-800 rounded-t-3xl h-auto max-h-[90vh] pb-8 px-4">
                <div className="w-12 h-1.5 bg-neutral-800 rounded-full mx-auto mt-3 mb-6" />
                
                <div className="space-y-8 overflow-y-auto custom-scrollbar pb-12">
                  
                  {/* Role Switcher in Menu (Only if multiple roles) */}
                  {user && profile && availableRoles.length > 1 && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 px-2">Active Role</label>
                      <div className="grid grid-cols-1 gap-2">
                        {availableRoles.map((role) => (
                          <button
                            key={role}
                            onClick={() => {
                              setActiveRole(role);
                              handleTabChange('dashboard');
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all",
                              activeRole === role 
                                ? 'bg-blue-600/10 border-blue-600/30 text-white' 
                                : 'bg-neutral-900/50 border-neutral-800/50 text-neutral-400 hover:bg-neutral-800'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <HardHat size={18} className={activeRole === role ? 'text-blue-500' : 'text-neutral-500'} />
                              <span className="text-sm font-bold tracking-wide">{roleLabels[role] || role}</span>
                            </div>
                            {activeRole === role && <CheckCircle size={18} className="text-blue-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overflow Discovery Tabs */}
                  {overflowDiscoveryTabs.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 px-2">Explore</label>
                      <div className="grid grid-cols-2 gap-2">
                        {overflowDiscoveryTabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                              "flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all",
                              activeTab === tab.id 
                                ? 'bg-neutral-800 border-neutral-700 text-white' 
                                : 'bg-neutral-900/50 border-neutral-800/50 text-neutral-400 hover:bg-neutral-800'
                            )}
                          >
                            <tab.icon size={20} className={activeTab === tab.id ? 'text-blue-500' : 'text-neutral-500'} />
                            <span className="text-sm font-bold tracking-wide">{tab.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Management Tools in Menu */}
                  {overflowManagementTabs.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 px-2">Management</label>
                      <div className="grid grid-cols-2 gap-2">
                        {overflowManagementTabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                              "flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all",
                              activeTab === tab.id 
                                ? 'bg-neutral-800 border-neutral-700 text-white' 
                                : 'bg-neutral-900/50 border-neutral-800/50 text-neutral-400 hover:bg-neutral-800'
                            )}
                          >
                            <tab.icon size={20} className={activeTab === tab.id ? 'text-blue-500' : 'text-neutral-500'} />
                            <span className="text-sm font-bold tracking-wide">{tab.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Account Actions */}
                  <div className="space-y-2 pt-2">
                    <button 
                      onClick={() => setIsAboutOpen(true)}
                      className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800/50 text-neutral-300 transition-colors"
                    >
                      <Info size={20} className="text-neutral-500" />
                      <span className="text-sm font-bold tracking-wide">About BandVenue</span>
                    </button>
                    
                    {user ? (
                      <button 
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
                      >
                        <LogOut size={20} />
                        <span className="text-sm font-bold tracking-wide">Logout</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleTabChange('login')}
                        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-600/20"
                      >
                        <UserCircle size={20} />
                        <span className="text-sm font-bold tracking-wide">Login / Sign Up</span>
                      </button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop Right Side Actions (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {user && profile && availableRoles.length > 1 && (
            <div className="relative">
              <button 
                onClick={() => setIsRoleSwitcherOpen(!isRoleSwitcherOpen)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all",
                  isRoleSwitcherOpen
                    ? 'bg-neutral-800 border-blue-600 text-white'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-blue-600/50'
                )}
                title="What hat are you wearing now?"
              >
                <HardHat size={18} className={cn("transition-colors duration-200", isRoleSwitcherOpen ? 'text-blue-500' : 'text-neutral-400')} />
                <div className="flex flex-col items-start leading-none hidden md:flex">
                  <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">Active Role</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest">
                    {activeRole ? roleLabels[activeRole] : 'Select'}
                  </span>
                </div>
                <ChevronDown size={14} className={cn("transition-transform duration-300", isRoleSwitcherOpen ? 'rotate-180' : '')} />
              </button>

              <AnimatePresence>
                {isRoleSwitcherOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsRoleSwitcherOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 bottom-full mb-3 md:bottom-auto md:top-full md:mt-3 w-56 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden p-2"
                    >
                      <div className="px-4 py-2 mb-1 border-b border-neutral-800">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Switch Your Hat</p>
                      </div>
                      <div className="space-y-1">
                        {availableRoles.map((role) => (
                          <button
                            key={role}
                            onClick={() => {
                              setActiveRole(role);
                              setIsRoleSwitcherOpen(false);
                              handleTabChange('dashboard');
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all",
                              activeRole === role 
                                ? 'bg-neutral-800 text-white' 
                                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <HardHat size={14} className={cn("transition-colors duration-200", activeRole === role ? 'text-blue-500' : 'text-neutral-400')} />
                              <span className="text-xs font-bold uppercase tracking-wider">{roleLabels[role] || role}</span>
                            </div>
                            {activeRole === role && <CheckCircle size={14} className="text-blue-500" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {managementTabs.length > 0 && (
            <div className="relative">
              <button 
                onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all",
                  managementTabs.some(t => t.id === activeTab) || isDashboardOpen
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                )}
              >
                <LayoutDashboard size={18} className="text-neutral-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest hidden md:inline">Admin</span>
                <ChevronDown size={12} className={cn("transition-transform duration-300", isDashboardOpen ? 'rotate-180' : '')} />
              </button>

              <AnimatePresence>
                {isDashboardOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDashboardOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 bottom-full mb-2 md:bottom-auto md:top-full md:mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden p-2"
                    >
                      <div className="px-3 py-2 mb-1 border-b border-neutral-800">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Management Tools</p>
                      </div>
                      {managementTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            handleTabChange(tab.id);
                            setIsDashboardOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                            activeTab === tab.id 
                              ? 'bg-neutral-800 text-white' 
                              : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                          )}
                        >
                          <tab.icon size={16} className="text-neutral-400" />
                          <span className="text-sm font-medium">{tab.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          <button 
            onClick={() => setIsAboutOpen(true)}
            className="p-2 text-neutral-400 hover:text-blue-500 hover:bg-neutral-800 rounded-lg transition-all"
            title="About BandVenue"
          >
            <Info size={20} />
          </button>
          
          {user ? (
            <button 
              onClick={() => handleTabChange('logout')}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-neutral-400 hover:text-blue-500 hover:bg-neutral-800 rounded-xl transition-all border border-transparent"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="text-[11px] font-bold uppercase tracking-widest">Logout</span>
            </button>
          ) : (
            <button 
              onClick={() => handleTabChange('login')}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-neutral-400 hover:text-blue-500 hover:bg-neutral-800 rounded-xl transition-all border border-transparent"
              title="Login"
            >
              <UserCircle size={18} />
              <span className="text-[11px] font-bold uppercase tracking-widest">Login</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
