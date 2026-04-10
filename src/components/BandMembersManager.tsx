import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BandMember } from '../types';
import { Plus, Trash2, Edit2, Loader2, X, Check, User } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { handleSupabaseError, OperationType } from '../lib/error-handler';
import { cn } from '../lib/utils';

interface BandMembersManagerProps {
  bandId: string;
}

export default function BandMembersManager({ bandId }: BandMembersManagerProps) {
  const [members, setMembers] = useState<BandMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<BandMember> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (bandId && bandId !== 'new') {
      fetchMembers();
    } else {
      setLoading(false);
    }
  }, [bandId]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('band_members')
        .select('*')
        .eq('band_id', bandId)
        .order('first_name');
        
      if (error) throw error;
      if (data) setMembers(data);
    } catch (error) {
      console.error('Error fetching band members:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    console.log('handleSaveMember: editingMember', editingMember);
    if (!editingMember?.email || !editingMember?.first_name || !editingMember?.last_name) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      let personId = editingMember.person_id;

      // If no person_id, search by email
      if (!personId) {
        const { data: existingPerson, error: searchError } = await supabase
          .from('people')
          .select('id, roles')
          .eq('email', editingMember.email.toLowerCase().trim())
          .maybeSingle();

        if (searchError) throw searchError;

        if (existingPerson) {
          personId = existingPerson.id;
          // Update role to include musician if not already
          if (!existingPerson.roles.includes('musician')) {
            const newRoles = [...existingPerson.roles, 'musician'];
            await supabase.from('people').update({ roles: newRoles }).eq('id', personId);
          }
        } else {
          // Create new person
          console.log('Creating new person:', editingMember.email);
          const { data: newPerson, error: createError } = await supabase
            .from('people')
            .insert({
              first_name: editingMember.first_name,
              last_name: editingMember.last_name,
              email: editingMember.email.toLowerCase().trim(),
              roles: ['musician'],
              venue_ids: [],
              user_id: null
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating person:', createError);
            throw createError;
          }
          console.log('New person created:', newPerson);
          if (newPerson) personId = newPerson.id;
        }
      }

      if (!personId) {
        throw new Error('Failed to resolve or create a User ID for this member.');
      }

      const memberData = {
        band_id: bandId,
        person_id: personId,
        first_name: editingMember.first_name,
        last_name: editingMember.last_name,
        email: editingMember.email.toLowerCase().trim(),
        instrument_description: editingMember.instrument_description || '',
        is_active: editingMember.is_active !== undefined ? editingMember.is_active : true,
      };

      if (editingMember.id) {
        // Update existing
        const { error } = await supabase
          .from('band_members')
          .update(memberData)
          .eq('id', editingMember.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('band_members')
          .insert(memberData);
        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Band member saved successfully!' });
      fetchMembers();
      setTimeout(() => {
        setIsModalOpen(false);
        setEditingMember(null);
        setMessage(null);
      }, 1500);

    } catch (error: any) {
      console.error('Error saving band member:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save band member.' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(member: BandMember) {
    try {
      const { error } = await supabase
        .from('band_members')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);
      
      if (error) throw error;
      fetchMembers();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  }

  if (bandId === 'new') {
    return (
      <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-neutral-800">
        <h3 className="text-2xl font-bold mb-6 text-white">Band Members</h3>
        <p className="text-neutral-400">Please save the band profile first before adding members.</p>
      </div>
    );
  }

  return (
    <div id="band-members-section" className="mt-12 pt-8 border-t border-neutral-800">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white">Band Members</h3>
        <Button
          type="button"
          onClick={() => {
            setEditingMember({ is_active: true });
            setIsModalOpen(true);
          }}
          size="sm"
        >
          <Plus size={16} className="mr-2" /> Add Member
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
          <p className="text-neutral-400">No members added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {members.map((member) => (
            <div key={member.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                    <User size={20} className="text-neutral-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{member.first_name} {member.last_name}</h4>
                    <p className="text-sm text-neutral-400">{member.instrument_description || 'No instrument listed'}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingMember(member);
                    setIsModalOpen(true);
                  }}
                  className="shrink-0"
                >
                  <Edit2 size={16} className="text-neutral-400 hover:text-blue-500" />
                </Button>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <span className="text-sm text-neutral-500 truncate pr-4">{member.email}</span>
                <Button
                  variant={member.is_active ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => toggleStatus(member)}
                  className={cn("shrink-0 text-xs py-1 h-auto", member.is_active ? "bg-blue-600/10 text-blue-600 hover:bg-blue-600/20" : "")}
                >
                  {member.is_active ? 'Active' : 'Inactive'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-neutral-900 z-10 pb-2 border-b border-neutral-800">
              <h3 className="text-2xl font-bold text-white">{editingMember?.id ? 'Edit Member' : 'Add Band Member'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-neutral-400 hover:text-white rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {message && (
              <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {message.type === 'success' ? <Check size={20} className="text-green-500" /> : <X size={20} className="text-red-500" />}
                <p className="font-medium">{message.text}</p>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  type="text"
                  required
                  value={editingMember?.first_name || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, first_name: e.target.value })}
                />
                <Input
                  label="Last Name *"
                  type="text"
                  required
                  value={editingMember?.last_name || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, last_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Input
                  label="Email *"
                  type="email"
                  required
                  value={editingMember?.email || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                />
                <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider ml-1">We will use this to link to an existing user or create a new one.</p>
              </div>

              <Input
                label="Instrument Description"
                type="text"
                value={editingMember?.instrument_description || ''}
                onChange={(e) => setEditingMember({ ...editingMember, instrument_description: e.target.value })}
                placeholder="e.g., Lead Guitar, Vocals"
              />

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">User ID (Read Only)</label>
                <input
                  type="text"
                  readOnly
                  value={editingMember?.person_id || 'Will be generated/linked on save'}
                  className="w-full bg-neutral-800/50 border border-neutral-800 rounded-xl py-3 px-4 text-neutral-500 cursor-not-allowed outline-none"
                />
              </div>

              <label className="flex items-center gap-3 p-4 bg-neutral-800 rounded-xl border border-neutral-700 cursor-pointer group hover:border-neutral-600 transition-colors">
                <input
                  type="checkbox"
                  checked={editingMember?.is_active !== false}
                  onChange={(e) => setEditingMember({ ...editingMember, is_active: e.target.checked })}
                  className="sr-only"
                />
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                  editingMember?.is_active !== false ? "bg-blue-600 border-blue-600" : "bg-neutral-900 border-neutral-600 group-hover:border-neutral-500"
                )}>
                  {editingMember?.is_active !== false && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                </div>
                <span className="font-semibold text-white">Active Member</span>
              </label>

              <div className="pt-6 border-t border-neutral-800 flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:flex-1"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : 'Save Member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
