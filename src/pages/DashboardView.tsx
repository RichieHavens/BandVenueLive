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
  const { setActiveTab } = useNavigationContext();

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
          <Card key={cardId} className="bg-neutral-800/50 border-neutral-700 p-6 group hover:bg-neutral-800 transition-all cursor-pointer" onClick={() => setActiveTab('manage-events')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-600/10 rounded-2xl text-red-500">
                <AlertCircle size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500/50">Action Required</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Attention Required</h3>
            <p className="text-neutral-400 text-sm mb-6">You have events that need details or confirmation before they can be published.</p>
            <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-widest group-hover:gap-3 transition-all">
              Review Now <ArrowRight size={14} />
            </div>
          </Card>
        );
      case 'open_slots':
        return (
          <Card key={cardId} className="bg-neutral-800/50 border-neutral-700 p-6 group hover:bg-neutral-800 transition-all cursor-pointer" onClick={() => setActiveTab('manage-events')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-400/10 rounded-2xl text-cyan-400">
                <Plus size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Inventory</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Open Slots</h3>
            <p className="text-neutral-400 text-sm mb-6">You have upcoming dates with no bands booked yet. Fill your calendar!</p>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest group-hover:gap-3 transition-all">
              Find Bands <ArrowRight size={14} />
            </div>
          </Card>
        );
      case 'unconfirmed_acts':
        return (
          <Card key={cardId} className="bg-neutral-800/50 border-neutral-700 p-6 group hover:bg-neutral-800 transition-all cursor-pointer" onClick={() => setActiveTab('manage-events')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-neutral-800 rounded-2xl text-neutral-400">
                <Clock size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Pending</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Unconfirmed Acts</h3>
            <p className="text-neutral-400 text-sm mb-6">Bands are waiting for your confirmation. Don't let them hang!</p>
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-widest group-hover:gap-3 transition-all">
              Manage Acts <ArrowRight size={14} />
            </div>
          </Card>
        );
      case 'confirmed_events':
        return (
          <Card key={cardId} className="bg-neutral-800/50 border-neutral-700 p-6 group hover:bg-neutral-800 transition-all cursor-pointer" onClick={() => setActiveTab('events')}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-neutral-800 rounded-2xl text-neutral-400">
                <CheckCircle size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Success</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Confirmed Events</h3>
            <p className="text-neutral-400 text-sm mb-6">Your upcoming calendar is looking solid. Great work!</p>
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-widest group-hover:gap-3 transition-all">
              View Calendar <ArrowRight size={14} />
            </div>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-12">
      <RolePersonalizedHeader pageId="dashboard" />

      {/* Primary CTAs */}
      {roleData.primary_ctas && roleData.primary_ctas.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {roleData.primary_ctas.map((cta, index) => (
            <Button
              key={index}
              onClick={() => setActiveTab(cta.tab)}
              className="px-8 py-4 font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl flex items-center gap-3 group"
            >
              {cta.label}
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          ))}
        </div>
      )}

      {/* Dashboard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {roleData.default_dashboard_cards.map(cardId => renderCard(cardId))}
      </div>

      {/* Feature Priorities / Goals */}
      <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-[3rem] p-12">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
            <LayoutDashboard className="text-cyan-400" />
            Your {roleData.name} Focus
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-4">Primary Goal</h4>
              <p className="text-xl font-bold text-neutral-200">{roleData.primary_goal}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-4">Feature Priorities</h4>
              <ul className="space-y-2">
                {roleData.feature_priorities.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-neutral-400 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
