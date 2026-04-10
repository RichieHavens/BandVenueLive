import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { NavigationProvider, useNavigationContext } from './context/NavigationContext';
import AuthUI from './components/AuthUI';
import Navigation from './components/Navigation';
import VenueProfileEditor from './components/VenueProfileEditor';
import { BandProfileEditor } from './components/BandProfileEditor';
import EventProfileEditor from './components/EventProfileEditor';
import ProfileManager from './components/ProfileManager';
import EventManager from './components/EventManager';
import DisclaimerOverlay from './components/DisclaimerOverlay';
import ResetPasswordView from './components/ResetPasswordView';
import AboutModal from './components/AboutModal';
import EventDetailsModal from './components/EventDetailsModal';
import BandConfirmationPage from './components/BandConfirmationPage';
import ComingSoon from './components/ComingSoon';
import { Toaster } from 'sonner';
import SupabaseErrorBoundary from './components/SupabaseErrorBoundary';

// Pages
import { EventsView } from './pages/EventsView';
import { DashboardView } from './pages/DashboardView';
import { VenuesView } from './pages/VenuesView';
import { BandsView } from './pages/BandsView';
import { MusiciansView } from './pages/MusiciansView';
import { FavoritesView } from './pages/FavoritesView';
import { SyndicationManagerView } from './pages/SyndicationManagerView';
import { AdminView } from './pages/AdminView';
import { AdminRoleRequestsView } from './pages/AdminRoleRequestsView';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { VenueManagerAdmin } from './pages/VenueManagerAdmin';
import { BandManagerAdmin } from './pages/BandManagerAdmin';

import { 
  Loader2, LogOut, Music, Calendar, MapPin, Users, Settings, 
  ShieldCheck, UserCircle, Heart, Globe, LayoutDashboard, ChevronDown, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { 
    activeTab, 
    setActiveTab, 
    unsavedChanges, 
    setUnsavedChanges, 
    pendingTab, 
    setPendingTab, 
    confirmNavigation,
    selectedBandId,
    selectedEventId,
    eventFilter
  } = useNavigationContext();
  
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('unlocked') === 'true');

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

  useEffect(() => {
    // Check if we are in a password reset flow
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsResettingPassword(true);
    }
    
    // Also check for the specific route we set in AuthUI
    if (window.location.pathname === '/reset-password') {
      setIsResettingPassword(true);
    }

    // Check for confirmation route
    if (window.location.pathname.startsWith('/confirm-event/')) {
      setActiveTab('confirm-event');
    }
  }, []);

  if (!isUnlocked) {
    return <ComingSoon onUnlock={() => {
      sessionStorage.setItem('unlocked', 'true');
      setIsUnlocked(true);
    }} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="animate-spin text-red-600" size={48} />
      </div>
    );
  }

  if (isResettingPassword) {
    return <ResetPasswordView onComplete={() => {
      setIsResettingPassword(false);
      window.history.replaceState({}, document.title, "/");
      refreshProfile();
    }} />;
  }

  if (user && !profile && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 p-4 text-center">
        <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="text-red-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
          <p className="text-neutral-400 mb-8 leading-relaxed">
            We couldn't load your user profile. This might be a connection issue or your account setup may be incomplete.
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => refreshProfile()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-600/20"
            >
              Retry Loading
            </button>
            <button 
              onClick={() => signOut()}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans">
      <Toaster position="top-center" richColors />
      <DisclaimerOverlay />
      
      {/* Navigation */}
      {activeTab !== 'login' && <Navigation />}

      {/* Main Content */}
      <main className={`${activeTab === 'login' ? '' : 'pt-6 pb-32 md:pt-24 md:pb-12 max-w-7xl mx-auto px-4'}`}>
        {!user && !['events', 'venues', 'bands', 'musicians', 'login', 'confirm-event'].includes(activeTab) ? (
          <AuthUI />
        ) : (
          <>
            {activeTab === 'events' && <EventsView />}
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'manage-events' && <EventManager initialAttentionFilter={eventFilter?.attention} initialEntityFilter={eventFilter?.entity} />}
            {activeTab === 'venues' && <VenuesView />}
            {activeTab === 'bands' && <BandsView />}
            {activeTab === 'musicians' && <MusiciansView />}
            {activeTab === 'my-venue' && <VenueProfileEditor onDirtyChange={setUnsavedChanges} onSaveSuccess={() => { setUnsavedChanges(false); setActiveTab('events'); }} />}
            {activeTab === 'my-band' && <BandProfileEditor bandId={selectedBandId || undefined} onDirtyChange={setUnsavedChanges} onSaveSuccess={() => { setUnsavedChanges(false); setActiveTab('events'); }} />}
            {activeTab === 'my-event' && <EventProfileEditor eventId={selectedEventId || ''} onDirtyChange={setUnsavedChanges} onSaveSuccess={() => { setUnsavedChanges(false); setActiveTab('events'); }} />}
            {activeTab === 'my-profile' && <ProfileManager onDirtyChange={setUnsavedChanges} onSaveSuccess={() => { setUnsavedChanges(false); setActiveTab('events'); }} />}
            {activeTab === 'admin' && <AdminView />}
            {activeTab === 'super-admin' && <SuperAdminDashboard />}
            {activeTab === 'role-requests' && <AdminRoleRequestsView />}
            {activeTab === 'venue-manager' && <VenueManagerAdmin />}
            {activeTab === 'band-manager' && <BandManagerAdmin />}
            {activeTab === 'syndication' && <SyndicationManagerView />}
            {activeTab === 'favorites' && <FavoritesView />}
            {activeTab === 'login' && <AuthUI />}
            {activeTab === 'confirm-event' && <BandConfirmationPage eventId={window.location.pathname.split('/')[2]} />}

            {/* Footer About Us */}
            {activeTab !== 'login' && (
              <div className="mt-20 pt-8 border-t border-neutral-900 flex flex-col items-center gap-4">
                <button 
                  onClick={() => setIsAboutOpen(true)}
                  className="text-neutral-600 hover:text-red-600 text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                >
                  About BandVenue
                </button>
                <p className="text-[10px] text-neutral-800 font-medium">© 2026 BandVenue. All rights reserved.</p>
              </div>
            )}
          </>
        )}
      </main>

      <AboutModal 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
      />

      {/* Navigation Confirmation Modal */}
      <AnimatePresence>
        {pendingTab && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setPendingTab(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-red-600/10 p-3 rounded-2xl">
                  <Settings className="text-red-600" size={24} />
                </div>
                <h3 className="text-2xl font-bold">Unsaved Changes</h3>
              </div>
              <p className="text-neutral-400 mb-8 leading-relaxed">
                You have unsaved changes on this page. If you leave now, your progress will be lost. Are you sure you want to continue?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setPendingTab(null)}
                  className="flex-1 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-2xl transition-all"
                >
                  Stay Here
                </button>
                <button
                  onClick={confirmNavigation}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20"
                >
                  Leave Page
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <SupabaseErrorBoundary>
          <AppContent />
        </SupabaseErrorBoundary>
      </NavigationProvider>
    </AuthProvider>
  );
}
