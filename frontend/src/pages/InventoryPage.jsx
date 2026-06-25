import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import toast from "react-hot-toast";
import API from "../services/apiClient";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Drawer } from "../components/ui/Drawer";
import { Modal } from "../components/ui/Modal";
import { Search, Plus, Trash2, Package, Share2, Copy, Send, AlertTriangle, TrendingUp, DollarSign, Layers } from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [restockForm, setRestockForm] = useState({ quantity: "", cost_price: "", selling_price: "", batch_name: "" });

  const parentRef = useRef();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const catalogSlug = user.business_name?.toLowerCase().replace(/\s+/g, '-');
  const catalogUrl = `${window.location.origin}/catalog/${catalogSlug}`;

  const [form, setForm] = useState({
    company: "", sku: "", name: "", price: "", wholesale_price: "", cost_price: "", stock: "", gst_percent: "", units: "pcs"
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await API.get("/inventory");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i =>
      i.name?.toLowerCase().includes(q) ||
      i.sku?.toLowerCase().includes(q) ||
      i.company?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 10,
  });

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: "Out of Stock", variant: "danger" };
    if (stock <= 10) return { label: "Low Stock", variant: "warning" };
    return { label: "In Stock", variant: "success" };
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Product Name required");
    try {
      await API.post("/inventory", {
        ...form,
        price: Number(form.price || 0),
        stock: Number(form.stock || 0),
        gst_percent: Number(form.gst_percent || 0),
      });
      toast.success("Product added successfully");
      setIsAddModalOpen(false);
      fetchItems();
    } catch {
      toast.error("Failed to add product");
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await API.post(`/inventory/${selectedItem.id}/batches`, {
        batch_name: restockForm.batch_name || `Batch ${new Date().toLocaleDateString()}`,
        sku_variant: selectedItem.sku,
        cost_price: Number(restockForm.cost_price),
        selling_price: Number(restockForm.selling_price),
        stock: Number(restockForm.quantity)
      });
      toast.success("Batch Added!");
      setIsRestockModalOpen(false);
      fetchItems();
      setIsDrawerOpen(false);
    } catch {
      toast.error("Failed to restock");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await API.delete(`/inventory/${id}`);
      toast.success("Product deleted");
      setIsDrawerOpen(false);
      fetchItems();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  // Compute stats
  const stats = useMemo(() => {
    let totalItemsCount = items.length;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let totalVal = 0;

    items.forEach(item => {
      const stock = (item.inventory_batches || []).reduce((sum, b) => sum + (b.stock || 0), 0);
      if (stock === 0) outOfStockCount++;
      else if (stock <= 10) lowStockCount++;
      totalVal += (item.price || 0) * stock;
    });

    return { totalItemsCount, outOfStockCount, lowStockCount, totalVal };
  }, [items]);

  // Find top restocking recommendations
  const restockRecommendations = useMemo(() => {
    return items
      .map(item => {
        const stock = (item.inventory_batches || []).reduce((sum, b) => sum + (b.stock || 0), 0);
        return { ...item, stock };
      })
      .filter(item => item.stock <= 10)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 3);
  }, [items]);

  return (
    <div className="space-y-[32px] animate-fade-in-up pb-[40px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[16px]">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-[8px]">
            <Package size={24} className="text-[#3B82F6]" /> Inventory Master
          </h1>
          <p className="text-[14px] text-[#64748B] mt-[4px]">Manage your catalog, stock levels, and batches.</p>
        </div>
        <div className="flex items-center gap-[12px] w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-[12px] top-[10px] h-[16px] w-[16px] text-slate-400" />
            <Input 
              placeholder="Search by name, SKU..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-[36px] w-full" 
            />
          </div>
          <Button variant="outline" onClick={() => setIsShareModalOpen(true)} className="gap-2 text-[#3B82F6] border-[#3B82F6]/20 bg-white hover:bg-slate-50">
             <Share2 size={16} /> Catalog
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} icon={<Plus size={18} />}>Add Product</Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px]">
        <Card className="flex items-center gap-[16px]">
          <div className="w-[48px] h-[48px] rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
             <Layers size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Total SKUs</span>
             <span className="text-[24px] font-extrabold text-[#0F172A] mt-1 block">{stats.totalItemsCount}</span>
          </div>
        </Card>
        
        <Card className="flex items-center gap-[16px]">
          <div className="w-[48px] h-[48px] rounded-xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
             <AlertTriangle size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Out of Stock</span>
             <span className="text-[24px] font-extrabold text-red-600 mt-1 block">{stats.outOfStockCount}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-[16px]">
          <div className="w-[48px] h-[48px] rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
             <AlertTriangle size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Low Stock</span>
             <span className="text-[24px] font-extrabold text-amber-600 mt-1 block">{stats.lowStockCount}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-[16px]">
          <div className="w-[48px] h-[48px] rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
             <DollarSign size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Stock Valuation</span>
             <span className="text-[24px] font-extrabold text-emerald-600 mt-1 block">₹{stats.totalVal.toLocaleString('en-IN')}</span>
          </div>
        </Card>
      </div>

      {/* Restock Recommendations Banner */}
      {restockRecommendations.length > 0 && (
        <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-2xl p-[20px] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-red-950">Restock Recommendations</h4>
              <p className="text-xs text-red-800 mt-0.5">
                The following products are running low or out of stock. Consider restocking them to avoid sales disruption.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {restockRecommendations.map(item => (
                  <span 
                    key={item.id} 
                    onClick={() => { setSelectedItem(item); setRestockForm({ quantity: "", cost_price: item.cost_price || "", selling_price: item.price || "", batch_name: "" }); setIsRestockModalOpen(true); }}
                    className="cursor-pointer text-[11px] font-medium bg-red-100 hover:bg-red-200 text-red-900 px-2.5 py-1 rounded-lg border border-red-200 transition-colors inline-flex items-center gap-1.5"
                  >
                    {item.name} ({item.stock} left) <span className="text-red-500 font-bold hover:underline">Restock</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Table */}
      <Card noPadding className="overflow-hidden">
        <div 
          ref={parentRef}
          className="max-h-[600px] overflow-auto custom-scrollbar"
        >
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            <Table>
              <Thead className="sticky top-0 z-20 bg-white">
                <tr>
                  <Th>Item & SKU</Th>
                  <Th>Company</Th>
                  <Th>Retail Price</Th>
                  <Th>Est. Margin</Th>
                  <Th>Total Stock</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr><Td colSpan="6" className="text-center py-10 text-slate-400">Loading catalog items...</Td></Tr>
                ) : filteredItems.length === 0 ? (
                  <Tr><Td colSpan="6" className="text-center py-10 text-slate-400">No products found in catalog.</Td></Tr>
                ) : rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = filteredItems[virtualRow.index];
                  const totalStock = (item.inventory_batches || []).reduce((sum, b) => sum + (b.stock || 0), 0);
                  const status = getStockStatus(totalStock);
                  
                  // Calculate Margin
                  const cost = Number(item.cost_price || 0);
                  const sell = Number(item.price || 0);
                  const marginPercent = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;
                  
                  return (
                    <Tr 
                      key={item.id} 
                      onClick={() => { setSelectedItem(item); setIsDrawerOpen(true); }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer"
                    >
                      <Td>
                         <div className="font-semibold text-slate-900 text-sm">{item.name}</div>
                         <div className="text-xs text-slate-400 font-mono mt-0.5">{item.sku || 'No SKU'}</div>
                      </Td>
                      <Td>{item.company || '-'}</Td>
                      <Td className="font-medium text-slate-900">₹{item.price}</Td>
                      <Td>
                         {marginPercent > 0 ? (
                           <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                             {marginPercent}% margin
                           </Badge>
                         ) : marginPercent < 0 ? (
                           <Badge variant="danger">
                             {marginPercent}% loss
                           </Badge>
                         ) : (
                           <span className="text-slate-400 text-xs">—</span>
                         )}
                      </Td>
                      <Td className="font-bold text-slate-800">{totalStock} {item.units || 'pcs'}</Td>
                      <Td><Badge variant={status.variant}>{status.label}</Badge></Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Item Details Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Product Details">
        {selectedItem && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                  <Package size={28} />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-[#0F172A]">{selectedItem.name}</h3>
                 <p className="text-sm text-slate-500 font-mono mt-0.5">{selectedItem.sku || 'No SKU'} • {selectedItem.company || 'No Company'}</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Retail Price</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">₹{selectedItem.price}</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cost Price</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">₹{selectedItem.cost_price || 0}</p>
               </div>
            </div>
            
            <div>
               <div className="flex justify-between items-center mb-3">
                 <h4 className="text-sm font-bold text-slate-900">Inventory Batches</h4>
                 <Badge variant="gray">
                   {(selectedItem.inventory_batches || []).reduce((sum, b) => sum + (b.stock || 0), 0)} units total
                 </Badge>
               </div>
               <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                 {(selectedItem.inventory_batches || []).length === 0 ? (
                   <p className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">No batch details recorded.</p>
                 ) : (selectedItem.inventory_batches || []).map(b => (
                   <div key={b.id} className="flex justify-between items-center p-3 bg-white border border-slate-150 rounded-xl hover:border-slate-300 transition-colors">
                      <div>
                        <span className="text-xs font-semibold text-slate-800">{b.batch_name || 'Standard Batch'}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">CP: ₹{b.cost_price} • SP: ₹{b.selling_price}</span>
                      </div>
                      <Badge variant="gray" className="font-mono">{b.stock} left</Badge>
                   </div>
                 ))}
               </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100">
               <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => { setRestockForm({ quantity: "", cost_price: selectedItem.cost_price || "", selling_price: selectedItem.price || "", batch_name: "" }); setIsRestockModalOpen(true); }}>Restock Item</Button>
               <Button variant="danger" className="flex-1" onClick={() => handleDeleteProduct(selectedItem.id)}>Delete</Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Share Catalog Modal */}
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Storefront Catalog">
         <div className="space-y-6">
            <div className="p-6 bg-slate-900 text-white rounded-2xl relative overflow-hidden border border-slate-800 shadow-xl">
               <div className="absolute right-[-10px] top-[-10px] w-24 h-24 rounded-full bg-indigo-500/10 blur-xl"></div>
               <h3 className="text-lg font-bold tracking-tight">{user.business_name || 'My Store'}</h3>
               <p className="text-xs text-slate-400 break-all mt-2 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">{catalogUrl}</p>
            </div>
            <p className="text-xs text-slate-500">
               Share this link with your customers so they can view your live catalog and place orders.
            </p>
            <div className="flex gap-4">
               <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(catalogUrl); toast.success("Link copied!"); }}>Copy Link</Button>
               <Button className="flex-1 bg-[#25D366] border-none hover:bg-[#20ba59] text-white" onClick={() => window.open(`https://wa.me/?text=Check out our live catalog: ${catalogUrl}`, '_blank')}>WhatsApp Catalog</Button>
            </div>
         </div>
      </Modal>

      {/* Add Product Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="New Product">
        <form onSubmit={handleAddProduct} className="space-y-4">
           <div className="grid grid-cols-2 gap-3">
               <Input label="Company / Brand" placeholder="e.g. Acme Corp" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
               <Input label="Product Name" placeholder="e.g. Blue Pen" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
           </div>
           <div className="grid grid-cols-2 gap-3">
               <Input label="Cost Price (₹)" type="number" placeholder="0.00" value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} />
               <Input label="Selling Price (₹)" type="number" placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
           </div>
           <div className="grid grid-cols-2 gap-3">
               <Input label="SKU / Barcode" placeholder="e.g. SKU-1001" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
               <Input label="Units" placeholder="e.g. pcs, boxes, kgs" value={form.units} onChange={e => setForm({...form, units: e.target.value})} />
           </div>
           <Input label="Initial Stock Level" type="number" placeholder="e.g. 50" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
           <Button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">Save Product to Catalog</Button>
        </form>
      </Modal>

      {/* Restock Modal */}
      <Modal isOpen={isRestockModalOpen} onClose={() => setIsRestockModalOpen(false)} title={`Restock: ${selectedItem?.name}`}>
        <form onSubmit={handleRestock} className="space-y-4">
           <Input label="Batch Name" placeholder="e.g. Summer Batch" value={restockForm.batch_name} onChange={e => setRestockForm({...restockForm, batch_name: e.target.value})} />
           <div className="grid grid-cols-2 gap-3">
               <Input label="Cost Price (₹)" type="number" value={restockForm.cost_price} onChange={e => setRestockForm({...restockForm, cost_price: e.target.value})} required />
               <Input label="Selling Price (₹)" type="number" value={restockForm.selling_price} onChange={e => setRestockForm({...restockForm, selling_price: e.target.value})} required />
           </div>
           <Input label="Quantity to Add" type="number" placeholder="e.g. 100" value={restockForm.quantity} onChange={e => setRestockForm({...restockForm, quantity: e.target.value})} required />
           <Button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">Confirm Restocking</Button>
        </form>
      </Modal>
    </div>
  );
}
