import React from 'react';
import { useAuth } from '../AuthContext';
import RolePersonalizedHeader from '../components/RolePersonalizedHeader';
import { useNavigationContext } from '../context/NavigationContext';
import { 
  Calendar, Music, MapPin, Users, Globe, LayoutDashboard, 
  AlertCircle, CheckCircle, Clock, Plus, ChevronRight, ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function DashboardView() {
  const { roleData, profile } = useAuth();
  const { setActiveTab, setEventFilter } = useNavigationContext();

  if (!roleData) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-[2rem] p-8 shadow-2xl">
          <h2 className="text-3xl font-bold mb-2">Welcome, {profile?.first_name || 'there'}!</h2>
          <p className="text-neutral-400">Your dashboard is being set up. Please explore the navigation menu to get started.</p>
        </div>
      </div>
    );
  }

  const renderCard = (cardId: string) => {
    switch (cardId) {
      case 'attention_required':
        return (
          <Card key={cardId} className="bg-neutral-900 border-neutral-800 p-4 group hover:border-primary transition-all cursor-pointer" onClick={() => { setEventFilter({ attention: 'needs_attention', entity: 'all' }); setActiveTab('manage-events'); }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                <AlertCircle size={16} />
              </div>
              <h3 className="text-sm font-bold text-white">Needs Attention</h3>
            </div>
            <p className="text-neutral-400 text-xs mb-3">Events needing action.</p>
            <div className="flex items-center justify-between">
              <div className="text-primary text-[10px] font-bold uppercase tracking-widest">Review Now</div>
              <ChevronRight size={16} className="text-primary" />
            </div>
          </Card>
        );
      case 'open_slots':
        return (
          <Card key={cardId} className="bg-neutral-900 border-neutral-800 p-4 group hover:border-primary transition-all cursor-pointer" onClick={() => { setEventFilter({ attention: 'open_slots', entity: 'all' }); setActiveTab('manage-events'); }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
                <Plus size={16} />
              </div>
              <h3 className="text-sm font-bold text-white">Open Dates</h3>
            </div>
            <p className="text-neutral-400 text-xs mb-3">Dates without a band.</p>
            <div className="flex items-center justify-between">
              <div className="text-primary text-[10px] font-bold uppercase tracking-widest">Find Bands</div>
              <ChevronRight size={16} className="text-primary" />
            </div>
          </Card>
        );
      case 'unconfirmed_acts':
        return (
          <Card key={cardId} className="bg-neutral-900 border-neutral-800 p-4 group hover:border-primary transition-all cursor-pointer" onClick={() => { setEventFilter({ attention: 'unconfirmed_acts', entity: 'all' }); setActiveTab('manage-events'); }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-neutral-800 rounded-lg text-neutral-400">
                <Clock size={16} />
              </div>
              <h3 className="text-sm font-bold text-white">Pending Acts</h3>
            </div>
            <p className="text-neutral-400 text-xs mb-3">Bands yet to confirm.</p>
            <div className="flex items-center justify-between">
              <div className="text-primary text-[10px] font-bold uppercase tracking-widest">Manage Acts</div>
              <ChevronRight size={16} className="text-primary" />
            </div>
          </Card>
        );
      case 'confirmed_events':
        return (
          <Card key={cardId} className="bg-neutral-900 border-neutral-800 p-4 group hover:border-primary transition-all cursor-pointer" onClick={() => { setEventFilter({ attention: 'confirmed_events', entity: 'all' }); setActiveTab('manage-events'); }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-neutral-800 rounded-lg text-neutral-400">
                <CheckCircle size={16} />
              </div>
              <h3 className="text-sm font-bold text-white">Confirmed</h3>
            </div>
            <p className="text-neutral-400 text-xs mb-3">Fully set events.</p>
            <div className="flex items-center justify-between">
              <div className="text-primary text-[10px] font-bold uppercase tracking-widest">View Calendar</div>
              <ChevronRight size={16} className="text-primary" />
            </div>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <RolePersonalizedHeader pageId="dashboard" />

      {/* Primary CTAs */}
      {roleData.primary_ctas && roleData.primary_ctas.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {roleData.primary_ctas.map((cta, index) => (
            <Button
              key={index}
              onClick={() => setActiveTab(cta.tab)}
              className="px-6 py-3 font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center gap-2 group"
            >
              {cta.label}
            </Button>
          ))}
        </div>
      )}

      {/* Dashboard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roleData.default_dashboard_cards.map(cardId => renderCard(cardId))}
      </div>

      {/* Next Best Actions */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-4">Recommended Next Actions</h3>
        <div className="space-y-3">
          {roleData.feature_priorities.slice(0, 3).map((action, i) => (
            <button key={i} className="w-full flex items-center justify-between p-3 bg-neutral-800/50 rounded-xl hover:bg-neutral-800 transition-all text-sm text-neutral-300">
              <span>{action}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
