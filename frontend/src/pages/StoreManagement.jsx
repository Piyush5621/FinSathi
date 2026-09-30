import React, { useState } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Store, Plus, CheckCircle2, MapPin, Phone, FileText } from 'lucide-react';
import API from '../services/apiClient';
import toast from 'react-hot-toast';

export default function StoreManagement() {
  const { stores, activeStoreId, switchStore, refetchStores } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    address: '',
    phone: '',
    gstin: ''
  });

  const handleAddStore = async (e) => {
    e.preventDefault();
    if (!newStore.name) {
      return toast.error("Store name is required");
    }

    setLoading(true);
    try {
      const res = await API.post('/stores', newStore);
      if (res.data?.success) {
        toast.success("Store branch created successfully!");
        setNewStore({ name: '', address: '', phone: '', gstin: '' });
        setShowAddModal(false);
        refetchStores();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.summary || "Failed to create store branch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-app-surface border border-app-border rounded-panel shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center font-black shadow-md shadow-app-primary/20 shrink-0">
            <Store size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-app-text tracking-tight flex items-center gap-2">
              Branch & Store Settings
            </h1>
            <p className="text-xs text-app-text-secondary mt-0.5">
              Manage your retail locations, franchises, and switch preferred branch contexts.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          variant="primary"
          size="sm"
          icon={<Plus size={15} />}
          className="font-bold shadow-md shadow-app-primary/20 text-xs"
        >
          Add New Branch
        </Button>
      </div>

      {/* Stores List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stores.map((s) => {
          const isActive = s.id === activeStoreId;
          return (
            <div
              key={s.id}
              onClick={() => !isActive && switchStore(s.id)}
              className={`p-5 cursor-pointer relative overflow-hidden transition-all duration-200 rounded-panel border ${
                isActive
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                  : 'border-app-border bg-app-surface hover:border-app-primary/40 hover:shadow-xs'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2.5 rounded-xl ${isActive ? 'bg-app-primary text-white' : 'bg-app-surface-subtle text-app-text-secondary'}`}>
                  <Store size={18} />
                </div>
                {isActive ? (
                  <Badge variant="success" className="font-bold uppercase tracking-wider text-[10px]">
                    Active Context
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="font-bold uppercase tracking-wider text-[10px]">
                    Switch Branch
                  </Badge>
                )}
              </div>

              <h3 className="text-base font-bold text-app-text tracking-tight">{s.name}</h3>

              <div className="mt-3 space-y-1.5 text-xs text-app-text-secondary">
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-app-text-muted mt-0.5 shrink-0" />
                  <span>{s.address || 'No Address configured'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span>{s.phone || 'No Phone configured'}</span>
                </div>
                {s.gstin && (
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-slate-400 shrink-0" />
                    <span>GSTIN: {s.gstin}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Structured Ledger Table */}
      <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-app-border bg-app-surface-subtle">
          <h3 className="text-xs font-bold text-app-text">All Branch Metadata</h3>
        </div>
        <Table>
          <Thead>
            <tr>
              <Th>Branch Name</Th>
              <Th>GSTIN Number</Th>
              <Th>Phone Number</Th>
              <Th>Branch Address</Th>
              <Th className="text-right">Status</Th>
            </tr>
          </Thead>
          <Tbody>
            {stores.map((s) => (
              <Tr
                key={s.id}
                onClick={() => s.id !== activeStoreId && switchStore(s.id)}
                className={`cursor-pointer ${s.id === activeStoreId ? 'bg-indigo-500/10' : ''}`}
              >
                <Td className="font-bold flex items-center gap-2 text-app-text">
                  <Store size={14} className="text-indigo-600" />
                  {s.name}
                </Td>
                <Td className="font-mono text-xs text-app-text-muted">{s.gstin || '-'}</Td>
                <Td className="text-app-text-secondary font-semibold">{s.phone || '-'}</Td>
                <Td className="text-app-text-secondary max-w-xs truncate">{s.address || '-'}</Td>
                <Td className="text-right">
                  <Badge variant={s.is_active ? 'success' : 'neutral'}>
                    {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      {/* Add Store Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn p-4">
          <div className="bg-app-surface p-6 rounded-panel border border-app-border shadow-2xl w-full max-w-md space-y-4 animate-slide-up">
            <div className="border-b border-app-border pb-3">
              <h3 className="text-base font-bold text-app-text tracking-tight">Create Store Branch</h3>
              <p className="text-xs text-app-text-secondary">Add another branch location to map inventory stock and track transactions.</p>
            </div>

            <form onSubmit={handleAddStore} className="space-y-4 text-xs">
              <Input
                label="Branch Name *"
                placeholder="e.g. Rohini Sector 11 Branch"
                value={newStore.name}
                onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                required
              />
              <Input
                label="Address"
                placeholder="e.g. Plot No 12, Sector 11, Rohini"
                value={newStore.address}
                onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
              />
              <Input
                label="Phone Number"
                placeholder="e.g. +91 9876543210"
                value={newStore.phone}
                onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
              />
              <Input
                label="GSTIN / Tax ID"
                placeholder="e.g. 07AAAAA1111A1Z1"
                value={newStore.gstin}
                onChange={(e) => setNewStore({ ...newStore, gstin: e.target.value })}
              />

              <div className="flex gap-2 justify-end pt-3 border-t border-app-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loading}
                  loading={loading}
                  className="font-bold"
                >
                  Create Branch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
