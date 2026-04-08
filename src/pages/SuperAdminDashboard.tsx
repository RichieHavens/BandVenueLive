import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Music, MapPin, Users, Calendar } from 'lucide-react';
import QuickAddBandModal from '../components/quick-add/QuickAddBandModal';
import QuickAddEventModal from '../components/quick-add/QuickAddEventModal';

export function SuperAdminDashboard() {
  const [isBandModalOpen, setIsBandModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-bold">Super Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 flex flex-col gap-4">
          <h3 className="text-xl font-bold">Quick Actions</h3>
          <Button onClick={() => setIsBandModalOpen(true)}>
            <Plus size={20} className="mr-2" /> Add New Band
          </Button>
          <Button variant="secondary">
            <Plus size={20} className="mr-2" /> Add New Venue
          </Button>
          <Button variant="secondary">
            <Plus size={20} className="mr-2" /> Add New Manager
          </Button>
          <Button variant="secondary" onClick={() => setIsEventModalOpen(true)}>
            <Plus size={20} className="mr-2" /> Add New Event
          </Button>
        </Card>
        
        <Card className="p-6 md:col-span-3">
          <h3 className="text-xl font-bold mb-4">Recent Quick Adds</h3>
          <p className="text-neutral-400">No recent activity.</p>
        </Card>
      </div>

      <QuickAddBandModal 
        isOpen={isBandModalOpen} 
        onClose={() => setIsBandModalOpen(false)} 
        onSuccess={() => {}} 
      />
      <QuickAddEventModal 
        isOpen={isEventModalOpen} 
        onClose={() => setIsEventModalOpen(false)} 
        onSuccess={() => {}} 
      />
    </div>
  );
}
