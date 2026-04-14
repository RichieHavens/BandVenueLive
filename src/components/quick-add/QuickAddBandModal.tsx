import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Scratchpad } from './Scratchpad';
import { useNavigationContext } from '../../context/NavigationContext';
import { useAuth } from '../../AuthContext';
import { US_STATES, CA_PROVINCES } from '../../lib/geo';
import { theme } from '../../lib/theme';
import { SearchableSelect } from '../ui/SearchableSelect';

interface QuickAddBandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickAddBandModal({ isOpen, onClose, onSuccess }: QuickAddBandModalProps) {
  const { user, personId } = useAuth();
  const { setActiveTab, setSelectedBandId } = useNavigationContext();
  const [name, setName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState<'US' | 'CA'>('US');
  const [travelRegion, setTravelRegion] = useState<'Local' | 'Regional' | 'National'>('Local');
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  const checkDuplicate = async (bandName: string) => {
    const { data } = await supabase.from('bands_ordered').select('name').ilike('name', bandName).maybeSingle();
    setDuplicateWarning(!!data);
  };

  const handleSave = async (e: React.FormEvent | null, action: 'close' | 'another' | 'open') => {
    if (e) e.preventDefault();
    setSaving(true);
    
    // Simple parsing: split on first space
    const [first, ...rest] = managerName.split(' ');
    const last = rest.join(' ');

    try {
      const { error, data } = await supabase.from('bands').insert({
        name,
        unlinked_manager_first_name: first || '',
        unlinked_manager_last_name: last || '',
        description,
        city,
        state,
        country,
        travel_region: travelRegion,
        // manager_id: user?.id, // Removed default manager_id
        is_confirmed: false,
        is_published: false,
        created_by_id: personId,
        updated_at: new Date().toISOString(),
        updated_by_id: personId
      }).select().single();

      if (error) throw error;
      
      toast.success('Band created successfully!');
      if (action === 'close') {
        onSuccess();
        onClose();
      } else if (action === 'another') {
        setName('');
        setManagerName('');
        setDescription('');
        setCity('');
        setState('');
        setCountry('US');
        setTravelRegion('Local');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-md flex flex-col shadow-2xl p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h3 className="text-lg font-bold">Quick Add Band</h3>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-blue-500 rounded-full">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          <form className="space-y-3">
            <Input label="Band Name" required value={name} onChange={(e) => { setName(e.target.value); checkDuplicate(e.target.value); }} className="py-1.5 px-3" />
            {duplicateWarning && <p className="text-yellow-500 text-[10px]">Warning: A band with this name already exists.</p>}
            
            <Input label="Manager Name" value={managerName} onChange={(e) => setManagerName(e.target.value)} className="py-1.5 px-3" />
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">Location</label>
                <div className="flex bg-neutral-800 p-0.5 rounded-lg border border-neutral-700">
                  <Button type="button" variant={country === 'US' ? 'primary' : 'secondary'} size="sm" className="h-6 text-[10px] px-2" onClick={() => { setCountry('US'); setState(''); }}>USA</Button>
                  <Button type="button" variant={country === 'CA' ? 'primary' : 'secondary'} size="sm" className="h-6 text-[10px] px-2" onClick={() => { setCountry('CA'); setState(''); }}>CANADA</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} className="py-1.5 px-3" />
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">Travel Region</label>
                  <select
                    value={travelRegion}
                    onChange={(e) => setTravelRegion(e.target.value as 'Local' | 'Regional' | 'National')}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl py-2 px-3 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-neutral-600 text-sm"
                  >
                    <option value="Local">Local</option>
                    <option value="Regional">Regional</option>
                    <option value="National">National</option>
                  </select>
                </div>
                <SearchableSelect
                  label="State/Province"
                  value={state}
                  onChange={setState}
                  options={(country === 'US' ? US_STATES : CA_PROVINCES).map(s => ({ id: s.code, name: s.name }))}
                  placeholder="Select..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">Description</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl py-2 px-3 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-neutral-600 text-sm"
                rows={2}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">Scratchpad</label>
              <Scratchpad />
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-neutral-800 flex flex-wrap gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose} size="sm">Cancel</Button>
          <Button type="button" onClick={(e) => handleSave(e, 'close')} disabled={saving} size="sm">Save & Close</Button>
          <Button type="button" onClick={(e) => handleSave(e, 'another')} disabled={saving} size="sm">Save & Add Another</Button>
          <Button type="button" onClick={(e) => handleSave(e, 'open')} disabled={saving} size="sm">Save & Open</Button>
        </div>
      </Card>
    </div>
  );
}
