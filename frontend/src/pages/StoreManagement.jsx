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
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Store size={26} className="text-indigo-600" />
            Branch & Store Settings
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage your retail locations, franchises, and switch preferred branch contexts.
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 font-bold bg-indigo-600 border-none hover:bg-indigo-700 shadow-md text-white"
        >
          <Plus size={16} /> Add New Branch
        </Button>
      </div>

      {/* Stores List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stores.map((s) => {
          const isActive = s.id === activeStoreId;
          return (
            <Card
              key={s.id}
              onClick={() => !isActive && switchStore(s.id)}
              className={`p-6 cursor-pointer relative overflow-hidden transition-all duration-300 rounded-[24px] border ${
                isActive
                  ? 'border-indigo-500 bg-gradient-to-br from-white to-indigo-50/20 shadow-md'
                  : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                  <Store size={20} />
                </div>
                {isActive ? (
                  <Badge variant="success" className="font-black uppercase tracking-widest text-[9px]">
                    Active Context
                  </Badge>
                ) : (
                  <Badge variant="gray" className="font-black uppercase tracking-widest text-[9px]">
                    Switch Branch
                  </Badge>
                )}
              </div>

              <h3 className="text-lg font-black text-slate-950 tracking-tight">{s.name}</h3>

              <div className="mt-4 space-y-2 text-xs font-semibold text-slate-500">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
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
            </Card>
          );
        })}
      </div>

      {/* Structured Ledger Table */}
      <Card noPadding className="rounded-[24px]">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800">All Branch Metadata</h3>
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
                className={`cursor-pointer ${s.id === activeStoreId ? 'bg-indigo-50/10' : ''}`}
              >
                <Td className="font-bold flex items-center gap-2 text-slate-900">
                  <Store size={14} className="text-indigo-600" />
                  {s.name}
                </Td>
                <Td className="font-mono text-xs text-slate-500">{s.gstin || '-'}</Td>
                <Td className="text-slate-600 font-semibold">{s.phone || '-'}</Td>
                <Td className="text-slate-500 max-w-xs truncate">{s.address || '-'}</Td>
                <Td className="text-right">
                  <Badge variant={s.is_active ? 'success' : 'gray'}>
                    {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      {/* Add Store Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Create Store Branch</h3>
              <p className="text-xs text-slate-500 font-medium">Add another branch location to map inventory and track transactions.</p>
            </div>

            <form onSubmit={handleAddStore} className="space-y-4">
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

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddModal(false)}
                  className="font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  className="font-bold bg-indigo-600 border-none hover:bg-indigo-700 text-white"
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
