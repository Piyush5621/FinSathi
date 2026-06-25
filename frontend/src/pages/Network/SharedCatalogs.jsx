import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { BookOpen, Plus, X, Package, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

export default function SharedCatalogs() {
  const [loading, setLoading] = useState(true);
  const [myCatalogs, setMyCatalogs] = useState([]);
  const [partnerCatalogs, setPartnerCatalogs] = useState([]);
  const [activeTab, setActiveTab] = useState('mine');
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [catalogItems, setCatalogItems] = useState([]);
  const [showNewCatalog, setShowNewCatalog] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCatalog, setNewCatalog] = useState({ name: '', description: '', is_public: false });
  const [newItem, setNewItem] = useState({ product_name: '', sku: '', price: '', mrp: '', gst_percent: 0, unit: 'pcs', category: '', brand: '', moq: 1 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, partnerRes] = await Promise.all([
        API.get('/network-catalogs/mine'),
        API.get('/network-catalogs/partners')
      ]);
      setMyCatalogs(myRes.data?.data || []);
      setPartnerCatalogs(partnerRes.data?.data || []);
    } catch { toast.error('Failed to load catalogs'); }
    finally { setLoading(false); }
  };

  const openCatalog = async (catalog) => {
    setSelectedCatalog(catalog);
    try {
      const res = await API.get(`/network-catalogs/${catalog.id}/items`);
      setCatalogItems(res.data?.data || []);
    } catch { setCatalogItems([]); }
  };

  const handleCreateCatalog = async (e) => {
    e.preventDefault();
    if (!newCatalog.name) return toast.error('Catalog name required');
    setSaving(true);
    try {
      await API.post('/network-catalogs', newCatalog);
      toast.success('Catalog created!');
      setShowNewCatalog(false);
      setNewCatalog({ name: '', description: '', is_public: false });
      fetchData();
    } catch { toast.error('Failed to create catalog'); }
    finally { setSaving(false); }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!selectedCatalog || !newItem.product_name) return;
    setSaving(true);
    try {
      const res = await API.post(`/network-catalogs/${selectedCatalog.id}/items`, {
        ...newItem, price: Number(newItem.price), mrp: Number(newItem.mrp), gst_percent: Number(newItem.gst_percent)
      });
      setCatalogItems(prev => [...prev, res.data?.data]);
      toast.success('Product added to catalog!');
      setShowAddItem(false);
      setNewItem({ product_name: '', sku: '', price: '', mrp: '', gst_percent: 0, unit: 'pcs', category: '', brand: '', moq: 1 });
    } catch { toast.error('Failed to add item'); }
    finally { setSaving(false); }
  };

  const handleDeleteCatalog = async (id) => {
    if (!confirm('Delete this catalog?')) return;
    try {
      await API.delete(`/network-catalogs/${id}`);
      toast.success('Catalog deleted');
      setMyCatalogs(prev => prev.filter(c => c.id !== id));
      if (selectedCatalog?.id === id) setSelectedCatalog(null);
    } catch { toast.error('Failed to delete catalog'); }
  };

  const catalogs = activeTab === 'mine' ? myCatalogs : partnerCatalogs;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen size={22} className="text-teal-600" /> Shared Catalogs
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Publish your product catalog or browse catalogs from connected suppliers.</p>
        </div>
        {activeTab === 'mine' && (
          <Button onClick={() => setShowNewCatalog(true)} className="bg-teal-600 text-white border-none hover:bg-teal-700 font-bold flex items-center gap-2">
            <Plus size={15} /> New Catalog
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ key: 'mine', label: `My Catalogs (${myCatalogs.length})` }, { key: 'partners', label: `Partner Catalogs (${partnerCatalogs.length})` }].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${activeTab === key ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Catalog List */}
        <div className="space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} height="100px" rounded="rounded-[20px]" />)
          ) : catalogs.length === 0 ? (
            <Card className="p-10 text-center rounded-[20px] border-slate-100 shadow-sm">
              <BookOpen size={32} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-xs font-semibold">
                {activeTab === 'mine' ? 'No catalogs yet. Create your first catalog!' : 'No partner catalogs available.'}
              </p>
            </Card>
          ) : catalogs.map(catalog => (
            <div key={catalog.id}
              onClick={() => openCatalog(catalog)}
              className={`p-4 bg-white border rounded-[16px] cursor-pointer transition-all group hover:shadow-md ${selectedCatalog?.id === catalog.id ? 'border-teal-400 shadow-sm' : 'border-slate-100 hover:border-teal-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{catalog.name}</p>
                  {catalog.supplier && <p className="text-[9px] text-slate-400 mt-0.5">by {catalog.supplier.business_name}</p>}
                  {catalog.description && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{catalog.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {catalog.is_public ? (
                    <Eye size={12} className="text-teal-500" />
                  ) : (
                    <EyeOff size={12} className="text-slate-300" />
                  )}
                  {activeTab === 'mine' && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCatalog(catalog.id); }}
                      className="p-1 text-rose-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-400 font-semibold">
                <Package size={10} />
                {catalog.partner_catalog_items?.length || 0} products
                <span className={`ml-auto border rounded-full px-1.5 py-0.5 ${catalog.is_public ? 'text-teal-600 border-teal-200 bg-teal-50' : 'text-slate-400 border-slate-200 bg-slate-50'}`}>
                  {catalog.is_public ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Catalog Items */}
        <div className="lg:col-span-2">
          {!selectedCatalog ? (
            <Card className="p-16 text-center rounded-[24px] border-slate-100 shadow-sm h-full flex flex-col items-center justify-center">
              <BookOpen size={40} className="text-slate-200 mb-3" />
              <p className="text-slate-400 font-semibold text-sm">Select a catalog to view products</p>
            </Card>
          ) : (
            <Card className="p-5 rounded-[24px] border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-black text-slate-900">{selectedCatalog.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{catalogItems.length} products</p>
                </div>
                {activeTab === 'mine' && (
                  <Button onClick={() => setShowAddItem(true)} className="bg-teal-600 text-white border-none hover:bg-teal-700 font-bold text-xs py-1.5 px-3 flex items-center gap-1">
                    <Plus size={12} /> Add Product
                  </Button>
                )}
              </div>

              {catalogItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={32} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs">No products in this catalog yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-100">
                      <tr>{['Product', 'Price', 'MRP', 'GST', 'MOQ', 'Unit'].map(h => (
                        <th key={h} className="text-left pb-2 text-[9px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {catalogItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5">
                            <p className="font-bold text-slate-800">{item.product_name}</p>
                            {item.sku && <p className="text-[9px] font-mono text-slate-400">{item.sku}</p>}
                          </td>
                          <td className="py-2.5 font-black text-indigo-600">₹{item.price}</td>
                          <td className="py-2.5 text-slate-500">₹{item.mrp}</td>
                          <td className="py-2.5 text-slate-500">{item.gst_percent}%</td>
                          <td className="py-2.5 text-slate-500">{item.moq}</td>
                          <td className="py-2.5 text-slate-500">{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* New Catalog Modal */}
      {showNewCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-7">
            <div className="flex justify-between mb-5">
              <h2 className="text-base font-black text-slate-900">Create Catalog</h2>
              <button onClick={() => setShowNewCatalog(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-xl"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCatalog} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Catalog Name *</label>
                <input value={newCatalog.name} onChange={e => setNewCatalog({ ...newCatalog, name: e.target.value })}
                  placeholder="e.g. FMCG Q2 2024 Catalog" required
                  className="w-full px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Description</label>
                <textarea value={newCatalog.description} onChange={e => setNewCatalog({ ...newCatalog, description: e.target.value })}
                  rows={2} className="w-full px-4 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-semibold resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newCatalog.is_public} onChange={e => setNewCatalog({ ...newCatalog, is_public: e.target.checked })} className="rounded" />
                <span className="text-xs font-bold text-slate-700">Make catalog visible to connected buyers</span>
              </label>
              <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowNewCatalog(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-teal-600 text-white border-none font-bold">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Create Catalog'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && selectedCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-7">
            <div className="flex justify-between mb-5">
              <h2 className="text-base font-black text-slate-900">Add Product</h2>
              <button onClick={() => setShowAddItem(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-xl"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-3">
              <input value={newItem.product_name} onChange={e => setNewItem({ ...newItem, product_name: e.target.value })}
                placeholder="Product Name *" required
                className="w-full px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500" />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { field: 'price', placeholder: 'Price (₹)', type: 'number' },
                  { field: 'mrp', placeholder: 'MRP (₹)', type: 'number' },
                  { field: 'gst_percent', placeholder: 'GST %', type: 'number' },
                  { field: 'unit', placeholder: 'Unit (pcs, kg...)', type: 'text' },
                ].map(({ field, placeholder, type }) => (
                  <input key={field} type={type} value={newItem[field]} onChange={e => setNewItem({ ...newItem, [field]: e.target.value })}
                    placeholder={placeholder}
                    className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500" />
                ))}
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowAddItem(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-teal-600 text-white border-none font-bold">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Add Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
