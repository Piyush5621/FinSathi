import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import API from "../services/apiClient";
import {
  Edit3, Plus, Package, TrendingUp, AlertTriangle, AlertCircle,
  Search, Box, Archive, DollarSign, X, RefreshCw, Layers, ChevronDown, ChevronRight, Tag, Trash2
} from "lucide-react";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // form for Add Product
  const [form, setForm] = useState({
    company: "",
    sku: "",
    name: "",
    description: "",
    price: "",         // Retail Price (Default Batch)
    wholesale_price: "",
    cost_price: "",
    stock: "",
    gst_percent: "",
  });

  const [companySuggestions, setCompanySuggestions] = useState([]);

  const [activeTab, setActiveTab] = useState("inventory");
  const [expandedRows, setExpandedRows] = useState({}); // { itemId: boolean }
  const [searchQuery, setSearchQuery] = useState("");

  // Restock / Batch Modal State
  const [restockItem, setRestockItem] = useState(null);
  const [restockMode, setRestockMode] = useState("existing"); // "existing" | "new_batch"
  const [selectedBatchId, setSelectedBatchId] = useState("");

  const [restockForm, setRestockForm] = useState({
    quantity: 0,
    // New Batch Fields
    newCost: "",
    newPrice: "",
    newWholesale: "",
    batchName: ""
  });

  // fetch inventory
  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await API.get("/inventory");
      // Backend now returns items joined with inventory_batches
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch inventory error:", err);
      toast.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // SKU Auto-Generator
  useEffect(() => {
    if (activeTab === 'create' && !form.sku && items.length > 0) {
      const maxId = items.reduce((max, item) => {
        const part = item.sku?.split('-')[1];
        return part && !isNaN(part) ? Math.max(max, parseInt(part)) : max;
      }, 0);
      setForm(f => ({ ...f, sku: `FS-${String(maxId + 1).padStart(3, '0')}` }));
    }
  }, [activeTab, items]);

  // Metric Calculations
  const summary = useMemo(() => {
    let totalProducts = items.length;
    let totalAssetValue = 0;
    let inStock = 0, lowStock = 0, outStock = 0;

    items.forEach((it) => {
      // Stock is sum of batches
      const batches = it.inventory_batches || [];
      const totalStock = batches.reduce((sum, b) => sum + (b.stock || 0), 0);

      // Asset value = sum (batch stock * batch CP)
      const assetVal = batches.reduce((sum, b) => sum + ((b.cost_price || 0) * (b.stock || 0)), 0);
      totalAssetValue += assetVal;

      if (totalStock === 0) outStock++;
      else if (totalStock <= 10) lowStock++;
      else inStock++;
    });

    return { totalProducts, totalAssetValue, inStock, lowStock, outStock };
  }, [items]);

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: "Out of Stock", color: "red", icon: <AlertCircle size={14} /> };
    if (stock <= 10) return { label: "Low Stock", color: "orange", icon: <AlertTriangle size={14} /> };
    return { label: "In Stock", color: "emerald", icon: <Package size={14} /> };
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i =>
      i.name?.toLowerCase().includes(q) ||
      i.sku?.toLowerCase().includes(q) ||
      i.company?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const groupedByCompany = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const company = item.company || "General";
      if (!acc[company]) acc[company] = [];
      acc[company].push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // HANDLERS
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Product Name is required");
      return;
    }
    try {
      await API.post("/inventory", {
        ...form,
        price: Number(form.price || 0),
        wholesale_price: Number(form.wholesale_price || 0),
        cost_price: Number(form.cost_price || 0),
        stock: Number(form.stock || 0),
        gst_percent: Number(form.gst_percent || 0),
        units: form.units || "pcs",
      });
      toast.success("Product added successfully");
      setForm({ company: "", sku: "", name: "", description: "", price: "", wholesale_price: "", cost_price: "", stock: "", gst_percent: "", units: "pcs" });
      fetchItems();
      setActiveTab("inventory");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add product");
    }
  };

  const openRestockModal = (item) => {
    setRestockItem(item);
    setRestockMode("existing");
    setRestockForm({
      quantity: 0,
      newCost: "",
      newPrice: "",
      newWholesale: "",
      batchName: ""
    });
    // Default to first batch if exists
    if (item.inventory_batches && item.inventory_batches.length > 0) {
      setSelectedBatchId(item.inventory_batches[0].id);
    }
  };

  const openEditBatchModal = (batch, product) => {
    setRestockItem(product);
    setRestockMode("edit_batch");
    setSelectedBatchId(batch.id);
    setRestockForm({
      quantity: batch.stock,
      newCost: batch.cost_price,
      newPrice: batch.selling_price,
      newWholesale: batch.wholesale_price,
      batchName: batch.batch_name
    });
  };

  const handleRestockSubmit = async () => {
    if (!restockItem) return;

    try {
      if (restockMode === "edit_batch") {
        await API.put(`/inventory/batches/${selectedBatchId}`, {
          batch_name: restockForm.batchName,
          cost_price: Number(restockForm.newCost),
          selling_price: Number(restockForm.newPrice),
          wholesale_price: Number(restockForm.newWholesale),
          stock: Number(restockForm.quantity)
        });
        toast.success("Batch Updated!");
      } else if (restockMode === "existing") {
        toast.error("Please use 'Edit' button on the batch row or 'New Batch' to add stock.");
      } else {
        // Create NEW Batch
        await API.post(`/inventory/${restockItem.id}/batches`, {
          batch_name: restockForm.batchName || `Batch ${new Date().toLocaleDateString()}`,
          sku_variant: restockItem.sku, // or custom
          cost_price: Number(restockForm.newCost),
          selling_price: Number(restockForm.newPrice),
          wholesale_price: Number(restockForm.newWholesale),
          stock: Number(restockForm.quantity)
        });
        toast.success("New Batch Added!");
      }
      setRestockItem(null);
      await fetchItems();
    } catch (err) {
      console.error(err);
      toast.error("Operation failed");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await API.delete(`/inventory/${id}`);
      toast.success("Product deleted");
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete product");
    }
  };

  const handleDeleteCompany = async (company) => {
    if (!window.confirm(`WARNING: This will delete ALL products under "${company}". Continue?`)) return;
    try {
      await API.delete(`/inventory/company/${encodeURIComponent(company)}`);
      toast.success(`Deleted all products for ${company}`);
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete company");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0f172a] text-slate-100 p-6 font-inter relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-emerald-500/5 blur-[100px] rounded-full"></div>
      </div>

      <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">

        {/* Header & Stats */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center gap-3">
              <Box className="text-emerald-400" /> Inventory Master
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Manage products, multi-price batches, and stock expiration.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full xl:w-auto min-w-[600px]">
            {/* Stats Cards */}
            <div className="glass-card p-4 rounded-2xl flex flex-col justify-between border-l-4 border-emerald-500">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-emerald-400" />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Asset Value</span>
              </div>
              <div className="text-2xl font-bold text-white">₹{summary.totalAssetValue.toLocaleString()}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl flex flex-col justify-between border-l-4 border-indigo-500">
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-indigo-400" />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total SKUs</span>
              </div>
              <div className="text-2xl font-bold text-white">{summary.totalProducts}</div>
            </div>
            <div className="glass-card p-4 rounded-2xl flex flex-col justify-between border-l-4 border-rose-500">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-rose-400" />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Alerts</span>
              </div>
              <div className="text-2xl font-bold text-rose-400">{summary.lowStock + summary.outStock}</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 backdrop-blur-md p-2 rounded-2xl border border-slate-700/50">
          <div className="flex gap-2 bg-slate-800/50 p-1.5 rounded-xl">
            <button
              onClick={() => fetchItems()}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
              title="Refresh Inventory"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === "inventory"
                ? "bg-slate-700 text-white shadow-lg shadow-slate-900/50 ring-1 ring-slate-600"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
            >
              <Package size={16} /> Stock Overview
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === "create"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-500"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
            >
              <Plus size={16} /> New Product Entry
            </button>
          </div>

          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-3 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search by name, SKU, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none placeholder:text-slate-600 transition-all font-medium hover:bg-slate-900/80"
            />
          </div>
        </div>

        {/* Content */}
        {activeTab === "create" ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
            <div className="glass-card p-10 rounded-3xl border border-slate-700/50 relative overflow-hidden">
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 relative z-10">
                <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                  <Plus size={24} />
                </div>
                Create Master Product
                <span className="text-sm font-normal text-slate-500 ml-auto bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700">
                  Auto-assigned SKU: <strong className="text-emerald-400">{form.sku}</strong>
                </span>
              </h2>

              <form onSubmit={handleAddProduct} className="space-y-8 relative z-10">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2 relative">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company / Brand</label>
                    <input
                      value={form.company}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({ ...form, company: val });
                        setCompanySuggestions(
                          Array.from(new Set(items.map(i => i.company))).filter(c =>
                            c && c.toLowerCase().includes(val.toLowerCase()) &&
                            c.toLowerCase() !== val.toLowerCase()
                          )
                        );
                      }}
                      onFocus={() => {
                        setCompanySuggestions(
                          Array.from(new Set(items.map(i => i.company))).filter(c => c)
                        );
                      }}
                      onBlur={() => {
                        // Delay closing to allow click event to fire
                        setTimeout(() => setCompanySuggestions([]), 200);
                      }}
                      placeholder="e.g. Nike"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    />
                    {/* Suggestions Dropdown */}
                    {companySuggestions.length > 0 && (
                      <div className="absolute top-full left-0 w-full z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto">
                        {companySuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            onMouseDown={(e) => {
                              // Use onMouseDown to prevent input blur from firing first
                              e.preventDefault();
                              setForm(prev => ({ ...prev, company: suggestion }));
                              setCompanySuggestions([]);
                            }}
                            className="px-4 py-2 hover:bg-slate-700 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                          >
                            <Layers size={14} className="text-indigo-400" /> {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Air Force 1"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Units</label>
                    <select
                      value={form.units || "pcs"}
                      onChange={(e) => setForm({ ...form, units: e.target.value })}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    >
                      {["pcs", "kg", "g", "l", "ml", "box", "bundle", "pair", "set", "meter"].map(u => (
                        <option key={u} value={u}>{u.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-700/50 space-y-6">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase flex items-center gap-2">
                    <Layers size={14} /> Initial Batch Configuration
                  </h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cost Price (CP)</label>
                      <input
                        type="number"
                        value={form.cost_price}
                        onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-3 py-3 text-white focus:border-emerald-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selling Price (SP)</label>
                      <input
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-3 py-3 text-white focus:border-indigo-500 outline-none font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Wholesale Price</label>
                      <input
                        type="number"
                        value={form.wholesale_price}
                        onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-3 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Initial Stock</label>
                      <input
                        type="number"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">GST %</label>
                      <input
                        type="number"
                        value={form.gst_percent}
                        onChange={(e) => setForm({ ...form, gst_percent: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setActiveTab('inventory')} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition">Cancel</button>
                  <button type="submit" className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all">Confirm & Create Master</button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedByCompany).length === 0 && (
              <div className="text-center py-20 text-slate-500">No Inventory Found</div>
            )}

            {Object.entries(groupedByCompany).map(([company, products]) => (
              <div key={company} className="glass-card rounded-3xl overflow-hidden border border-slate-700/50">
                <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700/50 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Layers size={18} className="text-indigo-400" /> {company}
                  </h3>
                  <div className="flex gap-3">
                    <span className="text-xs font-bold bg-slate-800 px-3 py-1 rounded-lg text-slate-400 flex items-center">{products.length} Products</span>
                    <button
                      onClick={() => handleDeleteCompany(company)}
                      className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                      title="Delete Entire Company Group"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/50">
                  {products.map(item => {
                    const batches = item.inventory_batches || [];
                    const totalStock = batches.reduce((sum, b) => sum + (b.stock || 0), 0);
                    const stockStat = getStockStatus(totalStock);
                    const isExpanded = expandedRows[item.id];

                    return (
                      <div key={item.id} className="bg-slate-900/20">
                        {/* Main Row */}
                        <div className="flex items-center p-4 hover:bg-slate-800/30 transition-colors">
                          <button onClick={() => toggleRow(item.id)} className="p-2 text-slate-500 hover:text-white transition mr-2">
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </button>

                          <div className="flex-1">
                            <h4 className="font-bold text-white text-lg">{item.name}</h4>
                            <p className="text-xs text-slate-500 font-mono mt-1">SKU: {item.sku}</p>
                          </div>

                          <div className="text-right px-6">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Stock</div>
                            <div className="text-xl font-bold flex items-center gap-2 justify-end">
                              <span className={`${stockStat.color === 'red' ? 'text-rose-500' : 'text-emerald-400'}`}>{totalStock}</span>
                              {stockStat.icon}
                            </div>
                          </div>

                          <div className="px-4 flex items-center gap-2">
                            <button
                              onClick={() => openRestockModal(item)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                            >
                              <Plus size={16} /> Restock
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(item.id)}
                              className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                              title="Delete Product"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Batch Table */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-slate-950/30 border-t border-slate-800/50"
                            >
                              <table className="w-full text-left text-sm">
                                <thead className="text-xs uppercase text-slate-500 font-bold bg-slate-900/50">
                                  <tr>
                                    <th className="p-3 pl-8">Batch Name</th>
                                    <th className="p-3">Cost Price</th>
                                    <th className="p-3">Retail Price</th>
                                    <th className="p-3">Wholesale</th>
                                    <th className="p-3 text-center">Stock</th>
                                    <th className="p-3 text-right pr-6">Value (CP)</th>
                                    <th className="p-3 text-right">Edit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/30">
                                  {batches.length === 0 ? (
                                    <tr><td colSpan="7" className="p-4 text-center text-slate-500">No active batches.</td></tr>
                                  ) : batches.map(batch => (
                                    <tr key={batch.id} className="hover:bg-slate-900/50 transition">
                                      <td className="p-3 pl-8 font-medium text-slate-300">
                                        <div className="flex items-center gap-2">
                                          <Tag size={12} className="text-indigo-400" />
                                          {batch.batch_name || 'Standard Lot'}
                                        </div>
                                      </td>
                                      <td className="p-3 text-slate-400 font-mono">₹{batch.cost_price}</td>
                                      <td className="p-3 text-emerald-400 font-bold font-mono">₹{batch.selling_price}</td>
                                      <td className="p-3 text-blue-400 font-mono">₹{batch.wholesale_price}</td>
                                      <td className="p-3 text-center font-bold text-white">{batch.stock}</td>
                                      <td className="p-3 text-right pr-6 text-slate-500 mr-4">₹{(batch.cost_price * batch.stock).toLocaleString()}</td>
                                      <td className="p-3 text-right">
                                        <button
                                          onClick={() => openEditBatchModal(batch, item)}
                                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition"
                                          title="Edit Batch Details"
                                        >
                                          <Edit3 size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RESTOCK / BATCH MODAL */}
      <AnimatePresence>
        {restockItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f172a] border border-slate-700 rounded-3xl p-8 max-w-lg w-full relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

              <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {restockMode === 'edit_batch' ? 'Edit Exisiting Batch' : 'Restock Inventory'}
                  </h2>
                  <p className="text-slate-400 text-sm">Product: <span className="text-emerald-400">{restockItem.name}</span></p>
                </div>
                <button onClick={() => setRestockItem(null)} className="p-2 hover:bg-slate-800 rounded-full transition"><X size={20} /></button>
              </div>

              <div className="relative z-10 space-y-6">
                {/* Toggle Mode (Only if not editing) */}
                {restockMode !== 'edit_batch' && (
                  <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button
                      onClick={() => setRestockMode('new_batch')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${restockMode === 'new_batch'
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'}`}
                    >
                      New Batch Entry
                    </button>
                    <button
                      onClick={() => setRestockMode('existing')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${restockMode === 'existing'
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'}`}
                    >
                      Existing Batch
                    </button>
                  </div>
                )}

                {restockMode === 'existing' ? (
                  <div className="space-y-4 py-8 text-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
                    <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
                    <p className="text-slate-400 text-sm px-8">
                      To add stock to an existing batch, please edit the batch row directly or use New Batch Entry.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Batch Name / Lot No</label>
                      <input
                        type="text"
                        placeholder="e.g. Jan 2024 Supply"
                        value={restockForm.batchName}
                        onChange={(e) => setRestockForm({ ...restockForm, batchName: e.target.value })}
                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Cost Price</label>
                        <input
                          type="number"
                          value={restockForm.newCost}
                          onChange={(e) => setRestockForm({ ...restockForm, newCost: e.target.value })}
                          className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Retail Price</label>
                        <input
                          type="number"
                          value={restockForm.newPrice}
                          onChange={(e) => setRestockForm({ ...restockForm, newPrice: e.target.value })}
                          className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Wholesale</label>
                        <input
                          type="number"
                          value={restockForm.newWholesale}
                          onChange={(e) => setRestockForm({ ...restockForm, newWholesale: e.target.value })}
                          className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">
                          {restockMode === 'edit_batch' ? 'Total Stock In Hand' : 'Quantity To Add'}
                        </label>
                        <input
                          type="number"
                          value={restockForm.quantity}
                          onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                          className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRestockSubmit}
                  disabled={restockMode === 'existing'}
                  className="w-full py-3.5 mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl font-bold text-white shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {restockMode === 'edit_batch' ? 'Update Batch Details' : 'Confirm Inventory Add'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
