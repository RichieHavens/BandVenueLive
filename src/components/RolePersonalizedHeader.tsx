import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { PersonalizationService } from '../services/PersonalizationService';
import { RolePageContent, RoleAlert } from '../types';
import { Info, AlertCircle, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RolePersonalizedHeaderProps {
  pageId: string;
}

export default function RolePersonalizedHeader({ pageId }: RolePersonalizedHeaderProps) {
  const { profile, activeRole, roleData, user } = useAuth();
  const [soundbites, setSoundbites] = useState<RolePageContent[]>([]);
  const [alerts, setAlerts] = useState<RoleAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeRole) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [sbData, alertData] = await Promise.all([
          PersonalizationService.getPageSoundbites(activeRole, pageId),
          user ? PersonalizationService.getActiveAlerts(user.id, activeRole) : Promise.resolve([])
        ]);
        setSoundbites(sbData);
        setAlerts(alertData);
      } catch (error) {
        console.error('Error fetching personalization data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeRole, pageId, user]);

  if (!activeRole) return null;

  const welcomeMessage = roleData?.welcome_template
    ? roleData.welcome_template.replace('{first_name}', profile?.first_name || 'there')
    : `Welcome back, ${profile?.first_name || 'there'}!`;

  return (
    <div className="space-y-6 mb-8">
      {/* Welcome Section */}
      <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Info size={120} className="text-red-500" />
        </div>
        
        <div className="relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white mb-2"
          >
            {pageId === 'dashboard' ? roleData?.dashboard_headline : welcomeMessage}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-neutral-400 text-lg max-w-2xl"
          >
            {pageId === 'dashboard' ? roleData?.dashboard_subheadline : roleData?.description}
          </motion.p>

          {/* Page Soundbites */}
          <AnimatePresence>
            {soundbites.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-6 flex flex-wrap gap-3"
              >
                {soundbites.map((sb) => (
                  <div 
                    key={sb.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-600/20 rounded-full text-red-500 text-xs font-bold uppercase tracking-widest"
                  >
                    <Info size={14} />
                    {sb.content_text}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Alerts Section */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                  alert.priority === 1 
                    ? 'bg-red-600/10 border-red-600/30 text-red-500' 
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <div className="mt-1">
                  {alert.type === 'blocking' ? <XCircle size={20} /> : <AlertCircle size={20} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold leading-tight mb-1">{alert.message}</p>
                  {alert.link_url && (
                    <button className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                      Resolve Now <ChevronRight size={10} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
