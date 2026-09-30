import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useQueryClient } from '@tanstack/react-query';
import toast from "react-hot-toast";
import API from "../services/apiClient";
import { useStore } from "../contexts/StoreContext";
import { Button } from "../components/ui/Button";
import { 
  Search, Plus, Trash2, Package, Share2, Copy, Send, 
  AlertTriangle, TrendingUp, DollarSign, Layers, ChevronDown, 
  ChevronRight, Barcode as BarcodeIcon, Tag, Sparkles, X,
  ArrowUpDown, Download, Upload, Store, ArrowRight, CheckCircle2,
  RefreshCw, FileSpreadsheet, LayoutGrid, List, SlidersHorizontal,
  Info, Edit3, ArrowRightLeft, Clock, ShieldAlert, Check, ShoppingBag,
  ExternalLink, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeStore, stores } = useStore();

  // Core Catalog & Inventory State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // 'all' | 'instock' | 'low' | 'out' | 'fast' | 'dead'
  const [sortBy, setSortBy] = useState("name"); // 'name' | 'stock_asc' | 'stock_desc' | 'price_desc' | 'valuation_desc'
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  
  // Selected Item & Drawer
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState({});

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Forms
  const [restockForm, setRestockForm] = useState({ quantity: "", cost_price: "", selling_price: "", batch_name: "" });
  const [adjustForm, setAdjustForm] = useState({ 
    adjustment_type: "decrease", 
    quantity: "", 
    reason: "Damaged Goods", 
    remarks: "", 
    batch_id: "" 
  });
  const [transferForm, setTransferForm] = useState({
    target_store_id: "",
    quantity: "",
    remarks: ""
  });
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    cost_price: "",
    mrp: "",
    barcode: "",
    stock: "",
    category: "",
    units: "pcs",
    gst_percent: 0,
    hasVariants: false
  });
  const [variantList, setVariantList] = useState([
    { name: "", attributeName: "Size", attributeValue: "", sku: "", barcode: "", price: "", cost_price: "" }
  ]);

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  const parentRef = useRef();
  const searchInputRef = useRef();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const catalogSlug = user.business_name?.toLowerCase().replace(/\s+/g, '-') || 'store';
  const catalogUrl = `${window.location.origin}/catalog/${catalogSlug}`;

  // Fetch Inventory Items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const storeParam = activeStore?.id ? `&store_id=${activeStore.id}` : '';
      const res = await API.get(`/catalog/products?limit=500${storeParam}`);
      const raw = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const normalized = raw.map(p => ({
        ...p,
        id: p.id,
        name: p.name,
        sku: p.sku || '',
        price: Number(p.sellingPrice ?? p.price ?? 0),
        cost_price: Number(p.costPrice ?? p.cost_price ?? 0),
        mrp: Number(p.mrp ?? 0),
        stock: Number(p.stock ?? 0),
        variants: p.variants || [],
        barcodes: p.barcodes || [],
        inventory_batches: p.inventory_batches || [],
        category: p.category || p.company || 'General',
        company: p.companyId || p.company || '',
        units: p.units || p.unit || 'pcs',
        gst_percent: Number(p.gst_percent || 0),
        created_at: p.created_at || p.createdAt || new Date().toISOString()
      }));
      setItems(normalized);
    } catch {
      toast.error("Failed to fetch inventory catalog");
    } finally {
      setLoading(false);
    }
  }, [activeStore?.id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Snapshot KPI Metrics
  const stats = useMemo(() => {
    let totalItemsCount = items.length;
    let totalStockUnits = 0;
    let totalValuation = 0;
    let totalCostValuation = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let healthyStockCount = 0;
    let fastMoversCount = 0;
    let deadStockCount = 0;

    items.forEach(item => {
      const stock = (item.inventory_batches || []).reduce((sum, b) => sum + (b.stock || 0), item.stock || 0);
      totalStockUnits += stock;
      totalValuation += (item.price || 0) * stock;
      totalCostValuation += (item.cost_price || 0) * stock;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= 10) {
        lowStockCount++;
      } else {
        healthyStockCount++;
      }

      // Classification heuristics
      if (stock > 20 && (item.price || 0) > 0) fastMoversCount++;
      if (stock > 0 && stock <= 2) deadStockCount++;
    });

    const healthyPercent = totalItemsCount > 0 ? Math.round((healthyStockCount / totalItemsCount) * 100) : 0;
    const lowPercent = totalItemsCount > 0 ? Math.round((lowStockCount / totalItemsCount) * 100) : 0;
    const outPercent = totalItemsCount > 0 ? Math.round((outOfStockCount / totalItemsCount) * 100) : 0;
    const overallMargin = totalValuation > 0 ? Math.round(((totalValuation - totalCostValuation) / totalValuation) * 100) : 0;

    return {
      totalItemsCount,
      totalStockUnits,
      totalValuation,
      totalCostValuation,
      overallMargin,
      outOfStockCount,
      lowStockCount,
      healthyStockCount,
      healthyPercent,
      lowPercent,
      outPercent,
      fastMoversCount,
      deadStockCount
    };
  }, [items]);

  // Categories Extracted & Item Counts
  const { categories, categoryCounts } = useMemo(() => {
    const set = new Set();
    const counts = {};
    items.forEach(p => {
      const cat = p.category || 'General';
      set.add(cat);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return {
      categories: ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))],
      categoryCounts: counts
    };
  }, [items]);

  // Filtered & Sorted Catalog
  const filteredItems = useMemo(() => {
    let result = items;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(i => {
        const nameMatch = i.name?.toLowerCase().includes(q);
        const skuMatch = i.sku?.toLowerCase().includes(q);
        const barcodeMatch = (i.barcodes || []).some(b => (b.barcodeValue || b.barcode_value)?.toLowerCase().includes(q));
        const categoryMatch = i.category?.toLowerCase().includes(q);
        return nameMatch || skuMatch || barcodeMatch || categoryMatch;
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(i => i.category === selectedCategory);
    }

    // Stock Health filter
    if (stockFilter === 'out') {
      result = result.filter(i => (i.stock || 0) === 0);
    } else if (stockFilter === 'low') {
      result = result.filter(i => (i.stock || 0) > 0 && (i.stock || 0) <= 10);
    } else if (stockFilter === 'instock') {
      result = result.filter(i => (i.stock || 0) > 10);
    } else if (stockFilter === 'fast') {
      result = result.filter(i => (i.stock || 0) > 20);
    } else if (stockFilter === 'dead') {
      result = result.filter(i => (i.stock || 0) > 0 && (i.stock || 0) <= 2);
    }

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
      if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'valuation_desc') return ((b.price || 0) * (b.stock || 0)) - ((a.price || 0) * (a.stock || 0));
      return 0;
    });

    return result;
  }, [items, searchQuery, selectedCategory, stockFilter, sortBy]);

  // Virtualizer for smooth scrolling with large catalogs
  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  // Stock Status Helper
  const getStockStatus = (stock) => {
    if (stock === 0) return { label: "Out of Stock", variant: "danger", bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900" };
    if (stock <= 10) return { label: "Low Stock", variant: "warning", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900" };
    return { label: "In Stock", variant: "success", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900" };
  };

  // Restock Recommendations
  const restockRecommendations = useMemo(() => {
    return items
      .filter(item => (item.stock || 0) <= 10)
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 5);
  }, [items]);

  // Add Product Handler
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Product Name is required");

    try {
      const productPayload = {
        name: form.name,
        sku: form.sku ? form.sku.trim() : undefined,
        sellingPrice: Number(form.price || 0),
        costPrice: Number(form.cost_price || 0),
        mrp: Number(form.mrp || form.price || 0),
        productType: form.hasVariants ? "variant" : "simple",
        category: form.category || "General",
        units: form.units || "pcs",
        gst_percent: Number(form.gst_percent || 0),
        barcodes: form.barcode ? [{ value: form.barcode.trim(), type: "EAN-13", isPrimary: true }] : []
      };

      const res = await API.post("/catalog/products", productPayload);
      const createdProduct = res.data?.data || res.data;

      // Variants creation if enabled
      if (form.hasVariants && Array.isArray(variantList) && variantList.length > 0) {
        for (const v of variantList) {
          if (!v.name && !v.attributeValue) continue;
          const variantName = v.name || `${v.attributeValue}`;
          const variantPayload = {
            name: variantName,
            sku: v.sku ? v.sku.trim() : undefined,
            sellingPrice: v.price ? Number(v.price) : Number(form.price || 0),
            purchasePrice: v.cost_price ? Number(v.cost_price) : Number(form.cost_price || 0),
            attributes: v.attributeName && v.attributeValue ? { [v.attributeName]: v.attributeValue } : { variant: variantName },
            barcodes: v.barcode ? [{ value: v.barcode.trim(), type: "EAN-13", isPrimary: true }] : []
          };
          await API.post(`/catalog/products/${createdProduct.id}/variants`, variantPayload);
        }
      }

      toast.success("Product created successfully! 🎉");
      setIsAddModalOpen(false);
      setForm({ name: "", sku: "", price: "", cost_price: "", mrp: "", barcode: "", stock: "", category: "", units: "pcs", gst_percent: 0, hasVariants: false });
      setVariantList([{ name: "", attributeName: "Size", attributeValue: "", sku: "", barcode: "", price: "", cost_price: "" }]);
      fetchItems();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to add product");
    }
  };

  // Stock Adjustment Handler
  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    const qty = Number(adjustForm.quantity);
    if (!qty || qty <= 0) return toast.error("Quantity must be greater than 0");

    try {
      await API.post(`/inventory/${selectedItem.id}/adjust`, {
        adjustment_type: adjustForm.adjustment_type,
        quantity: qty,
        reason: adjustForm.reason,
        remarks: adjustForm.remarks,
        batch_id: adjustForm.batch_id || null
      });

      toast.success(`Stock adjusted successfully! (${adjustForm.adjustment_type === 'decrease' ? `-${qty}` : `+${qty}`} units)`);
      setIsAdjustModalOpen(false);
      setAdjustForm({ adjustment_type: "decrease", quantity: "", reason: "Damaged Goods", remarks: "", batch_id: "" });
      fetchItems();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (isDrawerOpen) setIsDrawerOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to adjust stock");
    }
  };

  // Restock Batch Handler
  const handleRestock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await API.post(`/inventory/${selectedItem.id}/batches`, {
        batch_name: restockForm.batch_name || `Batch ${new Date().toLocaleDateString('en-IN')}`,
        sku_variant: selectedItem.sku,
        cost_price: Number(restockForm.cost_price || selectedItem.cost_price || 0),
        selling_price: Number(restockForm.selling_price || selectedItem.price || 0),
        stock: Number(restockForm.quantity)
      });
      toast.success("New batch added successfully!");
      setIsRestockModalOpen(false);
      setRestockForm({ quantity: "", cost_price: "", selling_price: "", batch_name: "" });
      fetchItems();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (isDrawerOpen) setIsDrawerOpen(false);
    } catch {
      toast.error("Failed to restock batch");
    }
  };

  // Stock Transfer Handler
  const handleStockTransfer = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    const qty = Number(transferForm.quantity);
    if (!qty || qty <= 0) return toast.error("Transfer quantity must be positive");
    if (!transferForm.target_store_id) return toast.error("Please select a destination store branch");

    try {
      const sourceStoreId = activeStore?.id || (stores && stores[0]?.id);
      await API.post('/inventory/transfer', {
        source_store_id: sourceStoreId,
        destination_store_id: transferForm.target_store_id,
        productId: selectedItem.id,
        quantity: qty,
        remarks: transferForm.remarks
      });

      toast.success(`Successfully transferred ${qty} units to destination branch! 📦`);
      setIsTransferModalOpen(false);
      setTransferForm({ target_store_id: "", quantity: "", remarks: "" });
      fetchItems();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to process stock transfer");
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product from catalog?")) return;
    try {
      await API.delete(`/catalog/products/${id}`);
      toast.success("Product removed from catalog");
      setIsDrawerOpen(false);
      fetchItems();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    } catch {
      toast.error("Failed to delete product");
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (items.length === 0) return toast.error("No inventory items to export");
    const headers = ["Product Name", "SKU", "Category", "Stock", "Unit", "Selling Price", "Cost Price", "GST Percent", "Stock Value"];
    const rows = items.map(i => [
      `"${(i.name || '').replace(/"/g, '""')}"`,
      `"${i.sku || ''}"`,
      `"${i.category || ''}"`,
      i.stock || 0,
      `"${i.units || 'pcs'}"`,
      i.price || 0,
      i.cost_price || 0,
      i.gst_percent || 0,
      ((i.price || 0) * (i.stock || 0)).toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `karobar_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Inventory CSV exported successfully!");
  };

  // CSV Import File Reader
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length <= 1) return toast.error("CSV file contains no records");

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        if (cols.length >= 2) {
          parsed.push({
            name: cols[0] || `Imported Item ${i}`,
            sku: cols[1] || `SKU-${Date.now()}-${i}`,
            category: cols[2] || 'General',
            stock: Number(cols[3] || 0),
            units: cols[4] || 'pcs',
            price: Number(cols[5] || 0),
            cost_price: Number(cols[6] || 0),
            gst_percent: Number(cols[7] || 0)
          });
        }
      }
      setCsvPreview(parsed.slice(0, 5));
    };
    reader.readAsText(file);
  };

  // Execute CSV Import
  const handleExecuteImport = async () => {
    if (!csvFile || csvPreview.length === 0) return toast.error("Please select a valid CSV file");
    setIsImporting(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const text = evt.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const productsToImport = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
          if (cols[0]) {
            productsToImport.push({
              name: cols[0],
              sku: cols[1] || `SKU-${Date.now()}-${i}`,
              company: cols[2] || 'General',
              stock: Number(cols[3] || 0),
              units: cols[4] || 'pcs',
              price: Number(cols[5] || 0),
              cost_price: Number(cols[6] || 0),
              gst_percent: Number(cols[7] || 0)
            });
          }
        }

        await API.post('/inventory/bulk', { products: productsToImport });
        toast.success(`Successfully imported ${productsToImport.length} products! 📦`);
        setIsImportModalOpen(false);
        setCsvFile(null);
        setCsvPreview([]);
        fetchItems();
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      };
      reader.readAsText(csvFile);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to bulk import products");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-[1680px] mx-auto animate-fadeIn">
      
      {/* 1. OPERATIONAL INVENTORY HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-app-surface border border-app-border rounded-panel shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center font-black shadow-sm shadow-app-primary/25 shrink-0">
            <Package size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-app-text tracking-tight">Inventory & Stock Operations</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-primary/10 text-app-primary">
                <Store size={10} /> {activeStore?.name || "Main Store"}
              </span>
            </div>
            <p className="text-xs text-app-text-secondary mt-0.5">
              Real-time stock balance, multi-lot valuation, restock automation, and store audits.
            </p>
          </div>
        </div>

        {/* Consolidated Action Cluster */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center border border-app-border rounded-xl bg-app-surface-subtle p-0.5">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-app-text-secondary hover:text-app-text hover:bg-app-surface transition-colors cursor-pointer"
              title="Share Digital Public Catalog"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">Share Catalog</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-app-text-secondary hover:text-app-text hover:bg-app-surface transition-colors cursor-pointer"
              title="Export Inventory as CSV"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-app-text-secondary hover:text-app-text hover:bg-app-surface transition-colors cursor-pointer"
              title="Bulk CSV Import"
            >
              <Upload size={13} />
              <span className="hidden sm:inline">Import</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus size={15} />}
            className="text-xs font-bold shadow-sm shadow-app-primary/20"
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* 2. 4-PILLAR INVENTORY COMMAND SNAPSHOT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Pillar 1: Total Catalog Products */}
        <div className="p-3.5 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary">Catalog SKUs</span>
            <div className="w-7 h-7 rounded-lg bg-app-surface-subtle text-app-text-secondary flex items-center justify-center">
              <Layers size={14} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-app-text font-mono tracking-tight leading-none">
              {stats.totalItemsCount.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-app-text-muted mt-1.5 font-medium">
              <span>{stats.totalStockUnits.toLocaleString('en-IN')} Units In Stock</span>
              <span>•</span>
              <span>{categories.length - 1} Categories</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Stock Valuation & Margin */}
        <div className="p-3.5 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary">Stock Valuation</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={14} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight leading-none">
              ₹{(stats.totalValuation >= 100000 ? `${(stats.totalValuation / 100000).toFixed(2)}L` : stats.totalValuation.toLocaleString('en-IN'))}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-app-text-muted mt-1.5 font-medium">
              <span className="font-bold text-emerald-600">{stats.overallMargin}% Avg Margin</span>
              <span>•</span>
              <span className="font-mono">Cost: ₹{Math.round(stats.totalCostValuation).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Stock Health Breakdown */}
        <div className="p-3.5 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary">Stock Health</span>
            <span className="text-xs font-black text-emerald-600 font-mono">{stats.healthyPercent}% Healthy</span>
          </div>
          <div>
            {/* Visual Progress Bar */}
            <div className="h-2.5 w-full bg-app-surface-subtle rounded-full overflow-hidden flex shadow-2xs mt-1">
              <div style={{ width: `${stats.healthyPercent}%` }} className="bg-emerald-500 transition-all duration-300" title={`Healthy: ${stats.healthyPercent}%`} />
              <div style={{ width: `${stats.lowPercent}%` }} className="bg-amber-500 transition-all duration-300" title={`Low Stock: ${stats.lowPercent}%`} />
              <div style={{ width: `${stats.outPercent}%` }} className="bg-rose-500 transition-all duration-300" title={`Out of Stock: ${stats.outPercent}%`} />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-app-text-secondary mt-2">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats.healthyStockCount} Healthy
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {stats.lowStockCount} Low
              </span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {stats.outOfStockCount} Out
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 4: Restock & PO Reorder Hub */}
        <div className="p-3.5 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary">Restock Alerts</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
              stats.lowStockCount + stats.outOfStockCount > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
            }`}>
              {stats.lowStockCount + stats.outOfStockCount > 0 ? `${stats.lowStockCount + stats.outOfStockCount} Need Action` : "Optimal"}
            </span>
          </div>

          <div>
            <div className="text-sm font-bold text-app-text leading-snug">
              {stats.lowStockCount + stats.outOfStockCount > 0 
                ? `${stats.outOfStockCount} Out • ${stats.lowStockCount} Low stock`
                : "All items well stocked"}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
                className="flex-1 py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px] text-center transition-colors cursor-pointer"
              >
                Filter Low Stock
              </button>
              <button
                type="button"
                onClick={() => navigate('/suppliers')}
                className="flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg bg-app-primary text-white font-bold text-[10px] hover:bg-app-primary-hover transition-colors cursor-pointer shadow-2xs shrink-0"
                title="Create Supplier Purchase Order"
              >
                <span>Supplier PO</span>
                <ArrowUpRight size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RESTOCK & REORDER INTELLIGENCE QUICK ACTIONS (When Low-Stock items exist) */}
      {restockRecommendations.length > 0 && (
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-panel shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="text-amber-500 shrink-0" size={15} />
            <div className="text-xs">
              <span className="font-bold text-app-text">Urgent Restock Triggers: </span>
              <span className="text-app-text-secondary">Low stock items requiring immediate batch receipt or vendor PO:</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {restockRecommendations.map(item => (
              <div 
                key={item.id}
                className="inline-flex items-center border border-amber-300 dark:border-amber-800 rounded-lg bg-app-surface text-[11px] font-semibold overflow-hidden shadow-2xs"
              >
                <span className="px-2 py-0.5 text-app-text max-w-[120px] truncate">{item.name}</span>
                <span className="px-1 text-rose-600 font-bold font-mono">({item.stock})</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(item);
                    setRestockForm({ quantity: "50", cost_price: item.cost_price || "", selling_price: item.price || "", batch_name: "" });
                    setIsRestockModalOpen(true);
                  }}
                  className="px-1.5 py-0.5 bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-white font-bold transition-colors cursor-pointer border-l border-amber-200 dark:border-amber-800"
                  title="Quick Add Batch"
                >
                  + Batch
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/suppliers?reorder_product_id=${item.id}&reorder_qty=50`)}
                  className="px-1.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold transition-colors cursor-pointer border-l border-amber-200 dark:border-amber-800"
                  title="Create Vendor PO"
                >
                  PO →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SEARCH, CATEGORY DROPDOWN & SORT COMMAND BAR */}
      <div className="p-3 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted pointer-events-none" size={15} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Product Name, SKU, Barcode, or Category (/ or F3)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary transition-all"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text cursor-pointer p-0.5"
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Controls: Category Dropdown, Sort Dropdown & Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-app-text-secondary text-[11px] font-bold hidden sm:inline">Category:</span>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-app-surface border border-app-border rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-app-text outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary appearance-none cursor-pointer hover:border-app-border-hover transition-colors shadow-2xs"
                >
                  <option value="all">All Categories ({items.length})</option>
                  {categories.filter(c => c !== 'all').map(cat => (
                    <option key={cat} value={cat}>
                      {cat} ({categoryCounts[cat] || 0})
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-text-muted pointer-events-none" />
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-app-text-secondary text-[11px] font-bold hidden sm:inline">Sort:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-app-surface border border-app-border rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-app-text outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary appearance-none cursor-pointer hover:border-app-border-hover transition-colors shadow-2xs"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="stock_asc">Lowest Stock First</option>
                  <option value="stock_desc">Highest Stock First</option>
                  <option value="price_desc">Highest Price</option>
                  <option value="valuation_desc">Highest Valuation</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-text-muted pointer-events-none" />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-app-border bg-app-surface p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-app-primary text-white shadow-2xs font-bold' : 'text-app-text-muted hover:text-app-text'
                }`}
                title="Operational Table View"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-app-primary text-white shadow-2xs font-bold' : 'text-app-text-muted hover:text-app-text'
                }`}
                title="Visual Grid Cards"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Stock Health Status Pills & Active Filter Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-app-border/60">
          
          {/* Stock Health Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: "all", label: "All Stock", count: items.length },
              { id: "instock", label: "In Stock", count: stats.healthyStockCount },
              { id: "low", label: "Low Stock", count: stats.lowStockCount, badgeColor: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
              { id: "out", label: "Out of Stock", count: stats.outOfStockCount, badgeColor: "bg-rose-500/20 text-rose-600 dark:text-rose-400" },
              { id: "fast", label: "Fast Movers", count: stats.fastMoversCount },
              { id: "dead", label: "Dead Stock", count: stats.deadStockCount }
            ].map(f => {
              const isActive = stockFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStockFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    isActive
                      ? 'bg-app-primary text-white shadow-xs'
                      : 'bg-app-surface border border-app-border text-app-text-secondary hover:text-app-text hover:border-app-border-hover'
                  }`}
                >
                  <span>{f.label}</span>
                  {typeof f.count === 'number' && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : (f.badgeColor || 'bg-app-surface-secondary text-app-text-muted')
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Filter Tags & Reset */}
          {(selectedCategory !== 'all' || stockFilter !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 text-xs">
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-app-primary/10 border border-app-primary/30 text-app-primary font-bold text-[11px]">
                  Category: {selectedCategory}
                  <button type="button" onClick={() => setSelectedCategory('all')} className="hover:opacity-75 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setStockFilter('all');
                  setSearchQuery('');
                }}
                className="text-[11px] font-bold text-app-text-muted hover:text-rose-500 transition-colors cursor-pointer underline underline-offset-2"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. PRODUCT OPERATIONAL WORKSPACE (TABLE OR GRID) */}
      {loading ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel space-y-3">
          <RefreshCw className="animate-spin text-app-primary mx-auto" size={26} />
          <p className="text-xs font-bold text-app-text">Loading catalog & inventory data...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel">
          <Package size={38} className="mx-auto text-app-text-muted mb-2" />
          <h3 className="font-bold text-sm text-app-text">No products match your filters</h3>
          <p className="text-xs text-app-text-muted mt-1">Try resetting your search query or stock filter.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* OPERATIONAL TABLE VIEW */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-2xs">
          <div 
            ref={parentRef} 
            className="max-h-[620px] overflow-auto custom-scrollbar"
          >
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              
              {/* Sticky Table Header */}
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">SKU / Barcode</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Stock Balance</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">Stock Valuation</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = filteredItems[virtualRow.index];
                    const stock = (item.inventory_batches || []).reduce((sum, b) => sum + (b.stock || 0), item.stock || 0);
                    const status = getStockStatus(stock);
                    const valuation = (item.price || 0) * stock;
                    const margin = item.price > 0 ? (((item.price - (item.cost_price || 0)) / item.price) * 100).toFixed(1) : 0;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setIsDrawerOpen(true);
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start + 34}px)`,
                        }}
                        className="hover:bg-app-surface-subtle/70 transition-colors border-b border-app-border cursor-pointer select-none"
                      >
                        <td className="py-2 px-3 text-center font-mono text-[11px] text-app-text-muted">
                          {virtualRow.index + 1}
                        </td>
                        <td className="py-2 px-3 max-w-[220px]">
                          <div className="font-bold text-xs text-app-text truncate leading-snug">{item.name}</div>
                          {item.variants && item.variants.length > 0 && (
                            <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 inline-block">
                              {item.variants.length} Variants
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-app-text-secondary">
                          <div>{item.sku || 'N/A'}</div>
                          {item.barcodes && item.barcodes.length > 0 && (
                            <div className="text-[10px] text-app-text-muted flex items-center gap-0.5">
                              <BarcodeIcon size={10} /> {item.barcodes[0].barcodeValue || item.barcodes[0].barcode_value}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-app-text-secondary text-xs capitalize">
                          {item.category || 'General'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-mono font-bold text-xs text-app-text">
                            {stock} {item.units}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-black font-mono text-app-text">
                          ₹{Number(item.price || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-app-text-secondary">
                          ₹{Number(item.cost_price || 0).toLocaleString('en-IN')}
                          <span className="text-[9px] text-emerald-600 block">({margin}% mrg)</span>
                        </td>
                        <td className="py-2 px-3 text-right font-black font-mono text-app-text">
                          ₹{valuation.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.bg}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItem(item);
                                setAdjustForm({ adjustment_type: "decrease", quantity: "", reason: "Damaged Goods", remarks: "", batch_id: "" });
                                setIsAdjustModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-app-text-secondary hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              title="Adjust Stock (Wastage / Audit)"
                            >
                              <SlidersHorizontal size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItem(item);
                                setRestockForm({ quantity: "50", cost_price: item.cost_price || "", selling_price: item.price || "", batch_name: "" });
                                setIsRestockModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-app-text-secondary hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              title="Restock Batch"
                            >
                              <Plus size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(item.id)}
                              className="p-1.5 text-app-text-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VISUAL GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredItems.map(item => {
            const stock = (item.inventory_batches || []).reduce((sum, b) => sum + (b.stock || 0), item.stock || 0);
            const status = getStockStatus(stock);
            const valuation = (item.price || 0) * stock;

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setIsDrawerOpen(true);
                }}
                className="p-3.5 bg-app-surface border border-app-border hover:border-app-primary/50 rounded-panel shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group select-none"
              >
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-mono text-app-text-muted truncate max-w-[100px]">
                      {item.sku || 'SKU'}
                    </span>
                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${status.bg}`}>
                      {status.label}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-app-text group-hover:text-app-primary transition-colors leading-snug line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-[10px] text-app-text-muted mt-0.5 capitalize">{item.category || 'General'}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-app-border/60 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-app-text-secondary font-medium">Stock:</span>
                    <span className="font-black font-mono text-app-text">{stock} {item.units}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-app-text-secondary font-medium">Selling Price:</span>
                    <span className="font-black font-mono text-app-text">₹{Number(item.price || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-app-text-secondary font-medium">Stock Value:</span>
                    <span className="font-black font-mono text-emerald-600">₹{valuation.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. PRODUCT DETAIL COMMAND CENTER DRAWER */}
      {isDrawerOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 animate-fadeIn">
          <div className="bg-app-surface border-l border-app-border w-full max-w-lg h-full shadow-2xl overflow-y-auto flex flex-col justify-between">
            
            {/* Drawer Header */}
            <div>
              <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border bg-app-surface-subtle">
                <div className="flex items-center gap-2.5">
                  <Package className="text-app-primary" size={18} />
                  <div>
                    <h2 className="font-black text-sm text-app-text leading-tight">{selectedItem.name}</h2>
                    <span className="text-[10px] font-mono text-app-text-muted">SKU: {selectedItem.sku || 'N/A'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 text-app-text-muted hover:text-app-text cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 space-y-5">
                
                {/* 1. Quick Metrics Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 bg-app-surface-subtle border border-app-border rounded-xl text-center shadow-2xs">
                    <span className="text-[9px] font-bold text-app-text-muted uppercase">Stock Balance</span>
                    <p className="text-base font-black font-mono text-app-text mt-0.5">{selectedItem.stock} {selectedItem.units}</p>
                  </div>
                  <div className="p-2.5 bg-app-surface-subtle border border-app-border rounded-xl text-center shadow-2xs">
                    <span className="text-[9px] font-bold text-app-text-muted uppercase">Selling Price</span>
                    <p className="text-base font-black font-mono text-app-text mt-0.5">₹{selectedItem.price}</p>
                  </div>
                  <div className="p-2.5 bg-app-surface-subtle border border-app-border rounded-xl text-center shadow-2xs">
                    <span className="text-[9px] font-bold text-app-text-muted uppercase">Cost Price</span>
                    <p className="text-base font-black font-mono text-app-text mt-0.5">₹{selectedItem.cost_price || 0}</p>
                  </div>
                </div>

                {/* 2. Product Specifications */}
                <div className="p-3.5 bg-app-surface-subtle border border-app-border rounded-xl space-y-2 text-xs shadow-2xs">
                  <h4 className="font-bold text-xs text-app-text border-b border-app-border pb-1">Product Specifications</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-app-text-muted uppercase">Category</span>
                      <p className="font-bold text-app-text">{selectedItem.category || 'General'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-app-text-muted uppercase">GST Rate</span>
                      <p className="font-bold text-app-text">{selectedItem.gst_percent || 0}%</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-app-text-muted uppercase">Unit of Measure</span>
                      <p className="font-bold text-app-text">{selectedItem.units || 'pcs'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-app-text-muted uppercase">Gross Margin</span>
                      <p className="font-bold text-emerald-600 font-mono">
                        {selectedItem.price > 0 ? (((selectedItem.price - (selectedItem.cost_price || 0)) / selectedItem.price) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Batches & Lots Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-app-text">Active Batches & Lots</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setRestockForm({ quantity: "50", cost_price: selectedItem.cost_price || "", selling_price: selectedItem.price || "", batch_name: "" });
                        setIsRestockModalOpen(true);
                      }}
                      className="text-xs font-bold text-app-primary hover:underline cursor-pointer"
                    >
                      + Add Batch
                    </button>
                  </div>

                  {selectedItem.inventory_batches && selectedItem.inventory_batches.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedItem.inventory_batches.map((batch, idx) => (
                        <div key={idx} className="p-2.5 bg-app-surface border border-app-border rounded-xl flex justify-between items-center text-xs shadow-2xs">
                          <div>
                            <p className="font-bold text-app-text">{batch.batch_name || `Batch #${idx + 1}`}</p>
                            <span className="text-[10px] text-app-text-muted">Cost: ₹{batch.cost_price || 0} • Sell: ₹{batch.selling_price || selectedItem.price}</span>
                          </div>
                          <div className="text-right font-mono font-black text-app-text">
                            {batch.stock} units
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-app-text-muted italic">No distinct lot batches recorded.</p>
                  )}
                </div>

                {/* 4. Direct Purchasing Vendor PO */}
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Supplier Procurement</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/suppliers?reorder_product_id=${selectedItem.id}&reorder_qty=50`)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      Create Vendor PO <ArrowRight size={12} />
                    </button>
                  </div>
                  <p className="text-[11px] text-app-text-muted">
                    Generate an official purchase order with registered suppliers for this item.
                  </p>
                </div>
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="p-4 border-t border-app-border bg-app-surface-subtle flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdjustForm({ adjustment_type: "decrease", quantity: "", reason: "Damaged Goods", remarks: "", batch_id: "" });
                  setIsAdjustModalOpen(true);
                }}
                className="text-xs"
              >
                ⚡ Adjust Stock
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTransferForm({ target_store_id: "", quantity: "", remarks: "" });
                  setIsTransferModalOpen(true);
                }}
                className="text-xs"
              >
                📦 Transfer
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setRestockForm({ quantity: "50", cost_price: selectedItem.cost_price || "", selling_price: selectedItem.price || "", batch_name: "" });
                  setIsRestockModalOpen(true);
                }}
                className="text-xs font-bold"
              >
                + Restock
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. STOCK ADJUSTMENT MODAL */}
      {isAdjustModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="text-amber-500" size={17} />
                <h3 className="font-bold text-sm text-app-text">Stock Adjustment ({selectedItem.name})</h3>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="p-1 text-app-text-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Adjustment Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustForm(p => ({ ...p, adjustment_type: 'increase' }))}
                    className={`py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
                      adjustForm.adjustment_type === 'increase' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'border-app-border bg-app-surface-subtle text-app-text-secondary'
                    }`}
                  >
                    + Increase Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustForm(p => ({ ...p, adjustment_type: 'decrease' }))}
                    className={`py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
                      adjustForm.adjustment_type === 'decrease' ? 'bg-rose-500/10 border-rose-500 text-rose-600' : 'border-app-border bg-app-surface-subtle text-app-text-secondary'
                    }`}
                  >
                    - Decrease Stock
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Adjustment Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 5"
                  value={adjustForm.quantity}
                  onChange={e => setAdjustForm(p => ({ ...p, quantity: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Reason</label>
                <select
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                >
                  <option value="Damaged Goods">Damaged Goods (Wastage)</option>
                  <option value="Expired Batch">Expired Batch / Shelf Life</option>
                  <option value="Physical Audit Discrepancy">Physical Audit Discrepancy</option>
                  <option value="Internal Consumption">Internal Consumption / Samples</option>
                  <option value="Supplier Return">Supplier Return / RMA</option>
                  <option value="Other">Other Adjustment</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Remarks (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or audit notes..."
                  value={adjustForm.remarks}
                  onChange={e => setAdjustForm(p => ({ ...p, remarks: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl p-2.5 text-xs text-app-text outline-none focus:border-app-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsAdjustModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold">
                  Confirm Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. RESTOCK BATCH MODAL */}
      {isRestockModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Plus className="text-emerald-500" size={17} />
                <h3 className="font-bold text-sm text-app-text">Restock Batch ({selectedItem.name})</h3>
              </div>
              <button onClick={() => setIsRestockModalOpen(false)} className="p-1 text-app-text-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRestock} className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Batch / Lot Name</label>
                <input
                  type="text"
                  placeholder={`Batch ${new Date().toLocaleDateString('en-IN')}`}
                  value={restockForm.batch_name}
                  onChange={e => setRestockForm(p => ({ ...p, batch_name: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Restock Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 50"
                    value={restockForm.quantity}
                    onChange={e => setRestockForm(p => ({ ...p, quantity: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold font-mono text-app-text outline-none focus:border-app-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder={`₹${selectedItem.cost_price || 0}`}
                    value={restockForm.cost_price}
                    onChange={e => setRestockForm(p => ({ ...p, cost_price: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold font-mono text-app-text outline-none focus:border-app-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder={`₹${selectedItem.price || 0}`}
                  value={restockForm.selling_price}
                  onChange={e => setRestockForm(p => ({ ...p, selling_price: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold font-mono text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsRestockModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold">
                  Add Stock Batch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. STOCK TRANSFER MODAL */}
      {isTransferModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="text-indigo-500" size={17} />
                <h3 className="font-bold text-sm text-app-text">Multi-Branch Stock Transfer</h3>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)} className="p-1 text-app-text-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleStockTransfer} className="p-4 space-y-3 text-xs">
              <div className="p-2.5 bg-app-surface-subtle border border-app-border rounded-xl">
                <span className="text-[9px] font-bold text-app-text-muted uppercase">Source Store</span>
                <p className="font-bold text-app-text">{activeStore?.name || "Main Branch"}</p>
                <p className="text-[11px] text-app-text-secondary mt-0.5">Available Stock: {selectedItem.stock} {selectedItem.units}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Destination Branch</label>
                <select
                  required
                  value={transferForm.target_store_id}
                  onChange={e => setTransferForm(p => ({ ...p, target_store_id: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                >
                  <option value="">Select Destination Store...</option>
                  {(stores || []).filter(s => s.id !== activeStore?.id).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.address || 'Branch'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.stock}
                  required
                  placeholder="e.g. 20"
                  value={transferForm.quantity}
                  onChange={e => setTransferForm(p => ({ ...p, quantity: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold font-mono text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Transfer Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dispatched with Driver Ramesh..."
                  value={transferForm.remarks}
                  onChange={e => setTransferForm(p => ({ ...p, remarks: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl p-2 text-xs text-app-text outline-none focus:border-app-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsTransferModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold">
                  Ship Transfer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. CSV BULK IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-500" size={17} />
                <h3 className="font-bold text-sm text-app-text">Bulk CSV Inventory Import</h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1 text-app-text-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl space-y-1">
                <p className="font-bold text-app-text">CSV Column Structure:</p>
                <code className="text-[10px] text-app-primary font-mono block">
                  Product Name, SKU, Category, Stock, Unit, Selling Price, Cost Price, GST Percent
                </code>
              </div>

              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="w-full text-xs text-app-text file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-app-primary file:text-white hover:file:bg-app-primary/90 cursor-pointer"
              />

              {csvPreview.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-[11px] text-app-text">Preview (First {csvPreview.length} items):</p>
                  <div className="divide-y divide-app-border border border-app-border rounded-xl bg-app-surface overflow-hidden">
                    {csvPreview.map((item, idx) => (
                      <div key={idx} className="p-2 flex justify-between text-[11px]">
                        <span className="font-bold text-app-text truncate max-w-[200px]">{item.name}</span>
                        <span className="font-mono text-app-text-secondary">{item.stock} {item.units} • ₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsImportModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleExecuteImport}
                  disabled={!csvFile || isImporting}
                  className="font-bold"
                >
                  {isImporting ? "Importing..." : "Execute Bulk Import"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-3.5 border-b border-app-border sticky top-0 bg-app-surface z-10">
              <div className="flex items-center gap-2">
                <Plus className="text-app-primary" size={17} />
                <h3 className="font-bold text-sm text-app-text">Add New Catalog Product</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-app-text-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-5 space-y-4 text-xs">
              
              {/* Product Basic Info */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs text-app-text border-b border-app-border pb-1">1. Basic Information</h4>
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basmati Rice (1kg)"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">SKU</label>
                    <input
                      type="text"
                      placeholder="e.g. PROD-101"
                      value={form.sku}
                      onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                      className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Barcode (EAN-13)</label>
                    <input
                      type="text"
                      placeholder="e.g. 8901234567890"
                      value={form.barcode}
                      onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))}
                      className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Grocery"
                      value={form.category}
                      onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Tax */}
              <div className="space-y-2.5 pt-1">
                <h4 className="font-bold text-xs text-app-text border-b border-app-border pb-1">2. Pricing & GST</h4>
                <div className="grid grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Selling Price (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="₹0"
                      value={form.price}
                      onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                      className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Cost Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="₹0"
                      value={form.cost_price}
                      onChange={e => setForm(p => ({ ...p, cost_price: e.target.value }))}
                      className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">GST %</label>
                    <select
                      value={form.gst_percent}
                      onChange={e => setForm(p => ({ ...p, gst_percent: e.target.value }))}
                      className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                    >
                      <option value="0">0% (Exempt)</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Unit</label>
                    <select
                      value={form.units}
                      onChange={e => setForm(p => ({ ...p, units: e.target.value }))}
                      className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                    >
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="ltr">ltr</option>
                      <option value="box">box</option>
                      <option value="packet">packet</option>
                      <option value="gram">gram</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Variants Switch */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.hasVariants}
                    onChange={e => setForm(p => ({ ...p, hasVariants: e.target.checked }))}
                    className="w-4 h-4 rounded text-app-primary focus:ring-app-primary cursor-pointer"
                  />
                  <span className="font-bold text-xs text-app-text">This product has multiple variants (Size, Color)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold">
                  Save Product to Catalog
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. SHARE CATALOG MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Share2 className="text-app-primary" size={17} />
                <h3 className="font-bold text-sm text-app-text">Public Digital Catalog Link</h3>
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className="p-1 text-app-text-muted hover:text-app-text cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <p className="text-app-text-secondary">
                Share this link with retail and wholesale customers to let them browse your real-time store catalog:
              </p>

              <div className="p-2.5 bg-app-surface-subtle border border-app-border rounded-xl flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-app-primary truncate">{catalogUrl}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(catalogUrl);
                    toast.success("Catalog link copied to clipboard!");
                  }}
                  className="p-1.5 rounded-lg bg-app-surface border border-app-border hover:bg-app-surface-subtle text-app-text cursor-pointer"
                  title="Copy Link"
                >
                  <Copy size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const msg = encodeURIComponent(`👋 Browse our latest store catalog here: ${catalogUrl}`);
                  window.open(`https://wa.me/?text=${msg}`, '_blank');
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <Send size={14} /> Share via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
