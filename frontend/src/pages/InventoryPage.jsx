import {  useEffect, useMemo, useState  } from 'react';
import toast from "react-hot-toast";
import API from "../services/apiClient";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Drawer } from "../components/ui/Drawer";
import { Modal } from "../components/ui/Modal";
import { Search, Plus, Filter, Trash2, Edit3, Package } from "lucide-react";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null); // For Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockForm, setRestockForm] = useState({ quantity: "", cost_price: "", selling_price: "", batch_name: "" });

  const [form, setForm] = useState({
    company: "",
    sku: "",
    name: "",
    price: "",
    wholesale_price: "",
    cost_price: "",
    stock: "",
    gst_percent: "",
    units: "pcs"
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

  useEffect(() => {
    if (isAddModalOpen && !form.sku && items.length > 0) {
      const maxId = items.reduce((max, item) => {
        const part = item.sku?.split('-')[1];
        return part && !isNaN(part) ? Math.max(max, parseInt(part)) : max;
      }, 0);
      setForm(f => ({ ...f, sku: `FS-${String(maxId + 1).padStart(3, '0')}` }));
    }
  }, [isAddModalOpen, items]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i =>
      i.name?.toLowerCase().includes(q) ||
      i.sku?.toLowerCase().includes(q) ||
      i.company?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: "Out of Stock", variant: "danger" };
    if (stock <= 10) return { label: "Low Stock", variant: "warning" };
    return { label: "OK", variant: "success" }; // "White -> OK" handled via generic badge standard (Success)
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Product Name required");
    try {
      await API.post("/inventory", {
        ...form,
        price: Number(form.price || 0),
        wholesale_price: Number(form.wholesale_price || 0),
        cost_price: Number(form.cost_price || 0),
        stock: Number(form.stock || 0),
        gst_percent: Number(form.gst_percent || 0),
      });
      toast.success("Product added successfully");
      setIsAddModalOpen(false);
      setForm({ company: "", sku: "", name: "", price: "", wholesale_price: "", cost_price: "", stock: "", gst_percent: "", units: "pcs" });
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
      setRestockForm({ quantity: "", cost_price: "", selling_price: "", batch_name: "" });
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

  const openItemDetails = (item) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-[32px] animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[16px]">
        <div>
          <h1 className="text-[22px] font-bold text-text-main flex items-center gap-[8px]">
            <Package size={24} className="text-brand-blue" />
            Inventory Master
          </h1>
          <p className="text-[14px] text-text-muted mt-[4px]">Manage your catalog and stock variations.</p>
        </div>
        <div className="flex gap-[12px] w-full md:w-auto">
          <Input 
             placeholder="Search products..." 
             value={searchQuery} 
             onChange={e => setSearchQuery(e.target.value)} 
             className="w-full md:w-[300px]"
          />
          <Button onClick={() => setIsAddModalOpen(true)} icon={<Plus size={18} />}>Add Product</Button>
        </div>
      </div>

      <Card noPadding>
        <Table>
          <Thead>
            <tr>
              <Th>Item & SKU</Th>
              <Th>Company</Th>
              <Th>Retail Price</Th>
              <Th>Total Stock</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr><Td colSpan="5" className="text-center text-text-muted">Loading inventory...</Td></Tr>
            ) : filteredItems.length === 0 ? (
              <Tr><Td colSpan="5" className="text-center text-text-muted">No products found.</Td></Tr>
            ) : filteredItems.map(item => {
              const batches = item.inventory_batches || [];
              const totalStock = batches.reduce((sum, b) => sum + (b.stock || 0), 0);
              const status = getStockStatus(totalStock);
              
              return (
                <Tr key={item.id} onClick={() => openItemDetails(item)}>
                  <Td>
                     <div className="font-semibold">{item.name}</div>
                     <div className="text-[12px] text-text-muted mt-[2px]">{item.sku}</div>
                  </Td>
                  <Td>{item.company || '-'}</Td>
                  <Td>₹{item.price}</Td>
                  <Td className="font-bold">{totalStock} {item.units}</Td>
                  <Td>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Card>

      {/* Item Details Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Product Details"
      >
        {selectedItem && (
          <div className="space-y-[24px]">
            <div className="flex items-center gap-[16px]">
               <div className="w-[64px] h-[64px] bg-brand-blue/10 text-brand-blue rounded-xl flex items-center justify-center">
                  <Package size={32} />
               </div>
               <div>
                 <h3 className="text-[18px] font-bold text-text-main">{selectedItem.name}</h3>
                 <p className="text-[13px] text-text-muted">{selectedItem.sku} • {selectedItem.company}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-[16px]">
               <div className="p-[16px] bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[12px] font-semibold text-text-muted uppercase">Retail Price</p>
                  <p className="text-[18px] font-bold text-text-main mt-[4px]">₹{selectedItem.price}</p>
               </div>
               <div className="p-[16px] bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[12px] font-semibold text-text-muted uppercase">Cost Price</p>
                  <p className="text-[18px] font-bold text-text-main mt-[4px]">₹{selectedItem.cost_price}</p>
               </div>
            </div>

            <div className="pt-[16px] border-t border-gray-100">
               <h4 className="text-[14px] font-semibold mb-[12px]">Stock History (Batches)</h4>
               <div className="space-y-[12px]">
                 {(selectedItem.inventory_batches || []).map(b => (
                   <div key={b.id} className="flex justify-between items-center p-[12px] border border-gray-100 rounded-lg">
                      <div>
                        <span className="text-[13px] font-medium block">{b.batch_name || 'Standard Batch'}</span>
                        <span className="text-[12px] text-text-muted">CP: ₹{b.cost_price}</span>
                      </div>
                      <Badge variant="gray">{b.stock} units</Badge>
                   </div>
                 ))}
               </div>
            </div>

            <div className="pt-[24px] flex gap-[12px]">
               <Button className="w-full" onClick={() => setIsRestockModalOpen(true)} icon={<Plus size={16}/>}>
                 Restock Item
               </Button>
               <Button variant="danger" className="w-full" icon={<Trash2 size={16}/>} onClick={() => handleDeleteProduct(selectedItem.id)}>
                 Delete Item
               </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Product Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="New Product">
        <form onSubmit={handleAddProduct} className="space-y-[16px]">
           <div className="grid grid-cols-2 gap-[12px]">
              <Input label="Company" placeholder="Brand Name" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
              <Input label="Product Name" placeholder="e.g. Rice 1kg" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
           </div>
           <div className="grid grid-cols-2 gap-[12px]">
              <Input label="Cost Price" type="number" placeholder="0.00" value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} />
              <Input label="Selling Price" type="number" placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
           </div>
           <div className="grid grid-cols-2 gap-[12px]">
              <Input label="Initial Stock" type="number" placeholder="0" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
              <Input label="GST %" type="number" placeholder="0" value={form.gst_percent} onChange={e => setForm({...form, gst_percent: e.target.value})} />
           </div>
            <Button type="submit" className="w-full mt-[8px]">Save Product</Button>
        </form>
      </Modal>

      {/* Restock Modal */}
      <Modal isOpen={isRestockModalOpen} onClose={() => setIsRestockModalOpen(false)} title="Add Stock Batch">
        <form onSubmit={handleRestock} className="space-y-[16px]">
           <Input label="Batch Name (Optional)" placeholder="e.g. March Supply" value={restockForm.batch_name} onChange={e => setRestockForm({...restockForm, batch_name: e.target.value})} />
           <div className="grid grid-cols-2 gap-[12px]">
              <Input label="Cost Price" type="number" placeholder="0.00" value={restockForm.cost_price} onChange={e => setRestockForm({...restockForm, cost_price: e.target.value})} required />
              <Input label="Selling Price" type="number" placeholder="0.00" value={restockForm.selling_price} onChange={e => setRestockForm({...restockForm, selling_price: e.target.value})} required />
           </div>
           <Input label="Quantity to Add" type="number" placeholder="0" value={restockForm.quantity} onChange={e => setRestockForm({...restockForm, quantity: e.target.value})} required />
           <Button type="submit" className="w-full mt-[8px]">Confirm Restock</Button>
        </form>
      </Modal>
    </div>
  );
}
