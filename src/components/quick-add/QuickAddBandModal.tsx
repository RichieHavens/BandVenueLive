import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Loader2, X, Plus, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Scratchpad } from './Scratchpad';
import { useNavigationContext } from '../../context/NavigationContext';

interface QuickAddBandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickAddBandModal({ isOpen, onClose, onSuccess }: QuickAddBandModalProps) {
  const { setActiveTab, setSelectedBandId } = useNavigationContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  const [managers, setManagers] = useState<any[]>([]);
  const [selectedManager, setSelectedManager] = useState<any>(null);
  const [isAddingManager, setIsAddingManager] = useState(false);
  const [newManager, setNewManager] = useState({ first_name: '', last_name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchManagers();
    }
  }, [isOpen]);

  const fetchManagers = async () => {
    const { data } = await supabase.from('people').select('id, first_name, last_name, email');
    if (data) setManagers(data);
  };

  const filteredManagers = managers.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(managerSearch.toLowerCase())
  );

  const checkDuplicate = async (bandName: string) => {
    const { data } = await supabase.from('bands').select('name').ilike('name', bandName).maybeSingle();
    setDuplicateWarning(!!data);
  };

  const handleSave = async (e: React.FormEvent, action: 'close' | 'another' | 'open') => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { error, data } = await supabase.from('bands').insert({
        name,
        description,
        city,
        state,
        manager_id: selectedManager?.id || null,
        is_confirmed: false,
      }).select().single();

      if (error) throw error;
      
      toast.success('Band created successfully!');
      if (action === 'close') {
        onSuccess();
        onClose();
      } else if (action === 'another') {
        setName('');
        setDescription('');
        setCity('');
        setState('');
        setSelectedManager(null);
        setManagerSearch('');
      } else if (action === 'open') {
        setSelectedBandId(data.id);
        setActiveTab('my-band');
        onClose();
      }
    } catch (err: any) {
      toast.error('Failed to create band: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateManager = async () => {
    const { data, error } = await supabase.from('people').insert(newManager).select().single();
    if (error) {
      toast.error('Failed to create manager');
      return;
    }
    setSelectedManager(data);
    setIsAddingManager(false);
    setNewManager({ first_name: '', last_name: '', email: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Quick Add Band</h3>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-cyan-400 rounded-full">
            <X size={20} />
          </button>
        </div>
        <form className="space-y-4">
          <Input label="Band Name" required value={name} onChange={(e) => { setName(e.target.value); checkDuplicate(e.target.value); }} />
          {duplicateWarning && <p className="text-yellow-500 text-sm">Warning: A band with this name already exists.</p>}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Manager</label>
            {selectedManager ? (
              <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-xl">
                <span>{selectedManager.first_name} {selectedManager.last_name}</span>
                <button onClick={() => setSelectedManager(null)}><X size={16} /></button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-neutral-500" size={18} />
                  <Input value={managerSearch} onChange={(e) => setManagerSearch(e.target.value)} placeholder="Search managers..." className="pl-10" />
                </div>
                {managerSearch && (
                  <div className="bg-neutral-800 rounded-xl p-2 max-h-40 overflow-y-auto">
                    {filteredManagers.map(m => (
                      <button key={m.id} className="block w-full text-left p-2 hover:bg-neutral-700 rounded" onClick={() => { setSelectedManager(m); setManagerSearch(''); }}>
                        {m.first_name} {m.last_name}
                      </button>
                    ))}
                    <button className="block w-full text-left p-2 text-cyan-400 hover:bg-neutral-700 rounded" onClick={() => setIsAddingManager(true)}>
                      <Plus size={16} className="inline mr-2" /> Add New Manager
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isAddingManager && (
            <div className="p-4 bg-neutral-800 rounded-xl space-y-2">
              <Input label="First Name" value={newManager.first_name} onChange={(e) => setNewManager({...newManager, first_name: e.target.value})} />
              <Input label="Last Name" value={newManager.last_name} onChange={(e) => setNewManager({...newManager, last_name: e.target.value})} />
              <Input label="Email" value={newManager.email} onChange={(e) => setNewManager({...newManager, email: e.target.value})} />
              <Button type="button" onClick={handleCreateManager}>Create Manager</Button>
            </div>
          )}

          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Scratchpad />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          
          <div className="pt-6 flex flex-wrap gap-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={(e) => handleSave(e, 'close')} disabled={saving}>Save & Close</Button>
            <Button type="button" onClick={(e) => handleSave(e, 'another')} disabled={saving}>Save & Add Another</Button>
            <Button type="button" onClick={(e) => handleSave(e, 'open')} disabled={saving}>Save & Open</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
