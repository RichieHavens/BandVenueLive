import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, UserCircle, ChevronDown, Info, LayoutDashboard, ShieldCheck, CheckCircle, HardHat, Music
} from 'lucide-react';
import { useNavigationContext } from '../context/NavigationContext';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';

export default function Navigation() {
  const { user, profile, activeRole, setActiveRole, signOut, managedBands } = useAuth();
  const { 
    activeTab, 
    managementTabs, 
    discoveryTabs, 
    handleTabChange, 
    setActiveTab,
    setSelectedBandId
  } = useNavigationContext();

  const [isDashboardOpen, setIsDashboardOpen] = React.useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = React.useState(false);
  const [isAboutOpen, setIsAboutOpen] = React.useState(false);

  const roleLabels: Record<string, string> = {
    admin: 'Super Admin',
    venue_manager: 'Venue Manager',
    band_manager: 'Band Manager',
    musician: 'Musician',
    guest: 'Guest',
    syndication_manager: 'Syndicator'
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900/90 backdrop-blur-xl border-t border-neutral-800 px-6 py-3 md:top-0 md:bottom-auto md:border-t-0 md:border-b z-[100] flex items-center h-[72px] md:h-[80px]">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-start gap-4">
        <div className="flex items-center shrink-0">
          <button 
            onClick={() => handleTabChange('events')}
            className="h-12 md:h-14 w-auto flex items-center cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img 
              src="/bandvenue_navbar_micro_final.png" 
              alt="BandVenue Logo" 
              className="h-full w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </button>
        </div>
        
        <div className="flex flex-1 justify-around md:justify-center gap-1 md:gap-4">
          {discoveryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "group relative flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                activeTab === tab.id 
                  ? 'text-white bg-neutral-800' 
                  : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800/50'
              )}
            >
              <tab.icon size={18} className={cn("transition-colors duration-200", activeTab === tab.id ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-cyan-400 group-focus:text-cyan-400')} />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider whitespace-nowrap">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -bottom-[13px] md:-bottom-[21px] left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                />
              )}
            </button>
          ))}
          {managedBands.length > 0 && (
            <button
              onClick={() => {
                if (managedBands.length === 1) {
                  setSelectedBandId(managedBands[0].id);
                  handleTabChange('my-band');
                } else {
                  handleTabChange('my-bands');
                }
              }}
              className={cn(
                "group relative flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 px-3 py-2 rounded-xl transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                (activeTab === 'my-bands' || activeTab === 'my-band')
                  ? 'text-white bg-neutral-800'
                  : 'text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800/50'
              )}
            >
              <Music size={18} className={cn("transition-colors duration-200", (activeTab === 'my-bands' || activeTab === 'my-band') ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-cyan-400 group-focus:text-cyan-400')} />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                {managedBands.length === 1 ? 'Manage Band' : 'My Bands'}
              </span>
            </button>
          )}
          
          <button
            onClick={user ? () => handleTabChange('logout') : () => handleTabChange('login')}
            className="flex flex-col md:hidden items-center gap-0.5 px-3 py-2 text-neutral-400 hover:text-cyan-400 transition-colors shrink-0"
          >
            {user ? <LogOut size={18} className="text-neutral-400 hover:text-cyan-400" /> : <UserCircle size={18} className="text-neutral-400 hover:text-cyan-400" />}
            <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{user ? 'Logout' : 'Login'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user && profile && profile.roles.length > 1 && (
            <div className="relative">
              <button 
                onClick={() => setIsRoleSwitcherOpen(!isRoleSwitcherOpen)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all",
                  isRoleSwitcherOpen
                    ? 'bg-neutral-800 border-cyan-400 text-white'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-cyan-400/50'
                )}
                title="What hat are you wearing now?"
              >
                <HardHat size={18} className={cn("transition-colors duration-200", isRoleSwitcherOpen ? 'text-cyan-400' : 'text-neutral-400')} />
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
                        {profile.roles.map((role) => (
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
                              <HardHat size={14} className={cn("transition-colors duration-200", activeRole === role ? 'text-cyan-400' : 'text-neutral-400')} />
                              <span className="text-xs font-bold uppercase tracking-wider">{roleLabels[role] || role}</span>
                            </div>
                            {activeRole === role && <CheckCircle size={14} className="text-cyan-400" />}
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
            className="p-2 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 rounded-lg transition-all"
            title="About BandVenue"
          >
            <Info size={20} />
          </button>
          
          {user ? (
            <button 
              onClick={() => handleTabChange('logout')}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 rounded-xl transition-all border border-transparent"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="text-[11px] font-bold uppercase tracking-widest">Logout</span>
            </button>
          ) : (
            <button 
              onClick={() => handleTabChange('login')}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 rounded-xl transition-all border border-transparent"
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
