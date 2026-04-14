import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Check, X } from 'lucide-react';

import { useAuth } from '../AuthContext';

export function AdminRoleRequestsView() {
  const { personId } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('role_requests')
      .select('*, profiles(email, first_name, last_name)')
      .eq('status', 'pending');
    
    if (error) console.error('Error fetching requests:', error);
    else setRequests(data || []);
    setLoading(false);
  };

  const handleAction = async (id: string, userId: string, role: string, action: 'approved' | 'denied') => {
    // 1. Update request status
    const { error: reqError } = await supabase
      .from('role_requests')
      .update({ 
        status: action,
        updated_at: new Date().toISOString(),
        updated_by_id: personId
      })
      .eq('id', id);
    
    if (reqError) {
      console.error('Error updating request:', reqError);
      return;
    }

    // 2. If approved, add role to profile
    if (action === 'approved') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', userId)
        .single();
      
      if (profile && !profile.roles.includes(role)) {
        await supabase
          .from('profiles')
          .update({ 
            roles: [...profile.roles, role],
            updated_at: new Date().toISOString(),
            updated_by_id: personId
          })
          .eq('id', userId);
        
        await supabase
          .from('people')
          .update({ 
            roles: [...profile.roles, role],
            updated_at: new Date().toISOString(),
            updated_by_id: personId
          })
          .eq('user_id', userId);
      }
    }

    fetchRequests();
  };

  if (loading) return <div className="p-8"><Loader2 className="animate-spin text-red-500" /></div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Pending Role Requests</h2>
      {requests.length === 0 ? (
        <p className="text-neutral-400">No pending requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req: any) => (
            <div key={req.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex justify-between items-center">
              <div>
                <p className="font-bold text-white">{req.profiles?.first_name} {req.profiles?.last_name}</p>
                <p className="text-sm text-neutral-400">{req.profiles?.email}</p>
                <p className="text-sm text-red-500 font-bold mt-1">Role: {req.role_type}</p>
                <p className="text-sm text-neutral-300 mt-2 italic">"{req.request_details}"</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleAction(req.id, req.user_id, req.role_type, 'approved')}
                  className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all"
                >
                  <Check size={20} />
                </button>
                <button 
                  onClick={() => handleAction(req.id, req.user_id, req.role_type, 'denied')}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
