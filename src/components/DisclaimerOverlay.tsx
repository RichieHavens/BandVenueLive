import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function DisclaimerOverlay() {
  const { user } = useAuth();
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const cookieAccepted = document.cookie.split('; ').find(row => row.startsWith('disclaimer_accepted='));
    const storageAccepted = localStorage.getItem('disclaimer_accepted');
    
    if (!cookieAccepted && !storageAccepted) {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAccept = async () => {
    // Set cookie for 1 year with iframe-compatible settings
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    document.cookie = `disclaimer_accepted=true; expires=${d.toUTCString()}; path=/; SameSite=None; Secure`;
    
    // Fallback to localStorage
    localStorage.setItem('disclaimer_accepted', 'true');

    // Log acceptance
    try {
      let sessionId = localStorage.getItem('bv_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('bv_session_id', sessionId);
      }

      await supabase.from('disclaimer_acceptances').insert({
        user_id: user?.id || null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        session_id: sessionId
      });
    } catch (err) {
      console.error('Error logging disclaimer acceptance:', err);
    }

    setShowDisclaimer(false);
  };

  if (!showDisclaimer) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl my-8 sm:my-0"
      >
        <div className="w-full flex items-center justify-center mb-6">
          <img 
            src="/bandvenue_transparent.png" 
            alt="BandVenue Logo" 
            className="w-48 h-auto max-w-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Data Protection & Terms of Use</h2>
        <div className="space-y-4 text-neutral-400 text-sm leading-relaxed mb-8 max-h-[50vh] sm:max-h-64 overflow-y-auto pr-4 custom-scrollbar">
          <p>Welcome to BandVenue. By accessing this platform, you agree to our terms regarding data usage and protection.</p>
          <p className="font-bold text-white">1. Data Ownership & Value</p>
          <p>The data on this platform, including venue details, band profiles, and event schedules, is a proprietary asset of BandVenue and its contributors. Unauthorized scraping, harvesting, or automated collection of this data is strictly prohibited.</p>
          <p className="font-bold text-white">2. Forensic Seeding</p>
          <p>To protect our community and data value, we employ forensic seeding techniques. This means our database contains unique, traceable records ("Seed Data") that allow us to identify and prove unauthorized data use in legal proceedings.</p>
          <p className="font-bold text-white">3. Acceptable Use</p>
          <p>You may use this data for personal discovery and event planning. Commercial use, redistribution, or integration into other platforms without explicit written consent is a violation of these terms and may result in a Cease and Desist order or legal action.</p>
          <p className="font-bold text-white">4. User Content License</p>
          <p>By creating a profile or submitting content (including but not limited to venue details, band information, musician profiles, images, and event data), you grant BandVenue a perpetual, irrevocable, world-wide, royalty-free, and non-exclusive license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, perform, and display such content in any media. You waive any right to demand removal of such data once it has been integrated into the BandVenue database or syndicated to partners.</p>
          <p className="font-bold text-white">5. Consent Tracking</p>
          <p>By clicking "I Accept", you consent to the storage of this acceptance, including your session identifier, IP address, and timestamp, for compliance and forensic purposes.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleAccept}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95"
          >
            I Accept & Understand
          </button>
          <button 
            onClick={() => window.location.href = 'https://google.com'}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-4 rounded-2xl font-bold transition-all active:scale-95"
          >
            Decline & Exit
          </button>
        </div>
      </motion.div>
    </div>
  );
}
