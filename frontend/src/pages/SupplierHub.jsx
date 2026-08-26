import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import API from '../services/apiClient';
import { useStore } from '../contexts/StoreContext';
import { Card, MetricCard, SectionCard } from '../components/ui';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Truck, FileText, Plus, Landmark, RefreshCw, CheckCircle2, 
  AlertTriangle, ExternalLink, ChevronRight, X, ArrowLeft, 
  Receipt, Trash2, Edit, Search, Printer, Globe, Calendar, 
  DollarSign, Package, Layers, Store, Clock, ArrowRight, 
  Send, Check, Copy, Sparkles, Filter, SlidersHorizontal, 
  Eye, CheckCheck, MapPin, Phone, Mail, Building, ShieldAlert
} from 'lucide-react';

export default function SupplierHub() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeStore, stores } = useStore();

  // Tab & Period Navigation
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'suppliers' | 'reorder'
  const [selectedPeriod, setSelectedPeriod] = useState('30d'); // 'today' | '7d' | '30d' | '3m' | '12m'
  const [loading, setLoading] = useState(true);

  // Data State
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('all'); // 'all' | 'Draft' | 'Sent' | 'Accepted' | 'Partially Received' | 'Received' | 'Completed' | 'Cancelled'

  // Selected Detail Drawers & Modals
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierLedger, setSupplierLedger] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);
  const [receivingPo, setReceivingPo] = useState(null);
  const [printablePo, setPrintablePo] = useState(null);

  // Modal Visibility State
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showAddPoModal, setShowAddPoModal] = useState(false);
  const [showEditPoModal, setShowEditPoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);

  // Form States
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', gstin: '', address: '', credit_limit: '', payment_terms: '30 Days' });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ supplier_id: '', amount: '', payment_method: 'Cash', ref_no: '', remarks: '' });
  const [receiveForm, setReceiveForm] = useState({ batch_name: '', notes: '' });

  const initialPoForm = {
    supplier_id: '',
    order_no: '',
    tax_amount: 0,
    discount_amount: 0,
    expected_delivery_date: '',
    notes: '',
    items: [{ inventory_id: '', quantity: 1, cost_price: 0, gst_rate: 0, discount_amount: 0 }]
  };
  const [poForm, setPoForm] = useState(initialPoForm);
  const [editingPo, setEditingPo] = useState(null);

  const printRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onBeforeGetContent: () => toast.success("Preparing vendor order slip..."),
  });

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [suppRes, invRes, poRes] = await Promise.all([
        API.get('/suppliers?limit=200').catch(() => ({ data: { data: [] } })),
        API.get('/inventory?limit=500').catch(() => ({ data: [] })),
        API.get('/purchase-orders?limit=200').catch(() => ({ data: { data: [] } }))
      ]);

      setSuppliers(suppRes.data?.data || []);
      setProducts(invRes.data || []);
      setPurchaseOrders(poRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching supplier data:", err);
      toast.error('Failed to load supplier/purchases details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pre-fill PO from URL if redirected from Inventory Reorder
  useEffect(() => {
    const reorderProdId = searchParams.get('reorder_product_id');
    const reorderQty = searchParams.get('reorder_qty');
    if (reorderProdId && products.length > 0) {
      const product = products.find(p => p.id === reorderProdId);
      if (product) {
        setPoForm({
          ...initialPoForm,
          order_no: `PO-${Date.now().toString().slice(-6)}`,
          items: [{
            inventory_id: product.id,
            quantity: Number(reorderQty || 50),
            cost_price: Number(product.cost_price || 0),
            gst_rate: Number(product.gst_percent || 0),
            discount_amount: 0
          }]
        });
        setShowAddPoModal(true);
        setActiveTab('orders');
      }
    }
  }, [searchParams, products]);

  // Snapshot KPI Metrics
  const stats = useMemo(() => {
    const totalPos = purchaseOrders.length;
    let totalPurchaseValue = 0;
    let pendingOrdersCount = 0;
    let receivedOrdersCount = 0;
    let goodsExpectedUnits = 0;

    purchaseOrders.forEach(po => {
      totalPurchaseValue += Number(po.total_amount || 0);
      if (['Draft', 'Sent', 'Accepted', 'Partially Received'].includes(po.status)) {
        pendingOrdersCount++;
        // Estimate goods inflow
        (po.items || []).forEach(item => {
          goodsExpectedUnits += Number(item.quantity || 0);
        });
      } else if (['Received', 'Completed'].includes(po.status)) {
        receivedOrdersCount++;
      }
    });

    const totalSupplierPayables = suppliers.reduce((sum, s) => sum + Number(s.outstanding_balance || 0), 0);
    const activeSuppliersCount = suppliers.length;

    return {
      totalPurchaseValue,
      pendingOrdersCount,
      receivedOrdersCount,
      goodsExpectedUnits,
      totalSupplierPayables,
      activeSuppliersCount,
      totalPos
    };
  }, [purchaseOrders, suppliers]);

  // Reorder Intelligence Candidates (Low stock from inventory)
  const reorderCandidates = useMemo(() => {
    return products
      .filter(p => Number(p.stock || 0) <= 10)
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
  }, [products]);

  // Filtered Purchase Orders
  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchSearch = !poSearchTerm.trim() || 
        po.order_no?.toLowerCase().includes(poSearchTerm.toLowerCase().trim()) ||
        po.suppliers?.name?.toLowerCase().includes(poSearchTerm.toLowerCase().trim());
      
      const matchStatus = poStatusFilter === 'all' || po.status === poStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, poSearchTerm, poStatusFilter]);

  // Filtered Suppliers Directory
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    const q = searchTerm.toLowerCase().trim();
    return suppliers.filter(s => 
      s.name?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.gstin?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q)
    );
  }, [suppliers, searchTerm]);

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft': return { label: 'Draft', bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300' };
      case 'Sent': return { label: 'Sent to Vendor', bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300' };
      case 'Accepted': return { label: 'Order Accepted', bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300' };
      case 'Partially Received': return { label: 'Partially Received', bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300' };
      case 'Received': return { label: 'Stock Received', bg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300' };
      case 'Completed': return { label: 'Completed', bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300' };
      case 'Cancelled': return { label: 'Cancelled', bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300' };
      default: return { label: status || 'Pending', bg: 'bg-slate-100 text-slate-800' };
    }
  };

  // Add Supplier Handler
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) return toast.error('Supplier Name is required');
    try {
      const res = await API.post('/suppliers', newSupplier);
      if (res.data?.success || res.data) {
        toast.success('Supplier added successfully! 🎉');
        setShowAddSupplierModal(false);
        setNewSupplier({ name: '', phone: '', gstin: '', address: '', credit_limit: '', payment_terms: '30 Days' });
        fetchData();
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to add supplier');
    }
  };

  // Update Supplier Handler
  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    if (!editingSupplier.name.trim()) return toast.error('Supplier Name is required');
    try {
      const res = await API.put(`/suppliers/${editingSupplier.id}`, editingSupplier);
      if (res.data?.success || res.data) {
        toast.success('Supplier details updated!');
        setShowEditSupplierModal(false);
        setEditingSupplier(null);
        fetchData();
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to update supplier');
    }
  };

  // Delete Supplier Handler
  const handleDeleteSupplier = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this supplier? All associated logs will be archived.')) return;
    try {
      await API.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted');
      fetchData();
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      if (selectedSupplier?.id === id) setSelectedSupplier(null);
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to delete supplier');
    }
  };

  // Create Purchase Order Handler
  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (isSubmittingPo) return;
    if (!poForm.supplier_id) return toast.error('Please select a supplier');
    if (!poForm.order_no.trim()) return toast.error('Please specify a PO Number');

    const validItems = poForm.items.filter(i => i.inventory_id && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      return toast.error('Please add at least one valid product item');
    }

    try {
      setIsSubmittingPo(true);
      const res = await API.post('/purchase-orders', { ...poForm, items: validItems });
      if (res.data?.success || res.data) {
        toast.success('Purchase Order created successfully! 📦');
        setShowAddPoModal(false);
        setPoForm(initialPoForm);
        fetchData();
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to create purchase order');
    } finally {
      setIsSubmittingPo(false);
    }
  };

  // Update Status / Receive Stock
  const handleUpdatePoStatus = async (poId, newStatus) => {
    if (newStatus === 'Cancelled' && !window.confirm('Are you sure you want to cancel this PO?')) return;

    try {
      const res = await API.patch(`/purchase-orders/${poId}/status`, { status: newStatus });
      if (res.data?.success || res.data) {
        toast.success(`Purchase Order marked as ${newStatus}!`);
        fetchData();
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        if (selectedPo?.id === poId) {
          const detailsRes = await API.get(`/purchase-orders/${poId}`);
          setSelectedPo(detailsRes.data?.data);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to update PO status');
    }
  };

  // Execute Goods Receiving
  const handleExecuteReceiving = async (e) => {
    e.preventDefault();
    if (!receivingPo) return;

    try {
      const res = await API.patch(`/purchase-orders/${receivingPo.id}/status`, { 
        status: 'Received',
        notes: receiveForm.notes || undefined
      });

      if (res.data?.success || res.data) {
        toast.success(`Goods received successfully! Stock added to inventory and ledger updated. 📦✨`);
        setShowReceiveModal(false);
        setReceivingPo(null);
        setReceiveForm({ batch_name: '', notes: '' });
        fetchData();
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to receive stock');
    }
  };

  // Record Supplier Payment Handler
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.supplier_id || !paymentForm.amount) {
      return toast.error('Please specify supplier and payment amount');
    }

    try {
      const res = await API.post('/suppliers/payment', paymentForm);
      if (res.data?.success || res.data) {
        toast.success('Supplier payment recorded successfully! 💳');
        setShowPaymentModal(false);
        setPaymentForm({ supplier_id: '', amount: '', payment_method: 'Cash', ref_no: '', remarks: '' });
        fetchData();
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        if (selectedSupplier) viewSupplierLedger(selectedSupplier);
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to log payment');
    }
  };

  // View Supplier Ledger Detail
  const viewSupplierLedger = async (supplier) => {
    setSelectedSupplier(supplier);
    try {
      const res = await API.get(`/suppliers/${supplier.id}/ledger`);
      setSupplierLedger(res.data?.data || { purchaseOrders: [], payments: [], stats: {} });
    } catch (err) {
      toast.error('Failed to load supplier ledger history');
    }
  };

  // View PO Details
  const viewPoDetails = async (po) => {
    try {
      const res = await API.get(`/purchase-orders/${po.id}`);
      setSelectedPo(res.data?.data);
    } catch (err) {
      toast.error('Failed to load PO details');
    }
  };

  // Quick Prefill from Reorder Candidate
  const handlePrefillReorder = (product) => {
    setPoForm({
      ...initialPoForm,
      order_no: `PO-${Date.now().toString().slice(-6)}`,
      items: [{
        inventory_id: product.id,
        quantity: 50,
        cost_price: Number(product.cost_price || product.price || 0),
        gst_rate: Number(product.gst_percent || 0),
        discount_amount: 0
      }]
    });
    setShowAddPoModal(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24 max-w-[1600px] mx-auto">
      
      {/* 1. OPERATIONAL PURCHASING HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-app-surface border border-app-border rounded-panel shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center font-black shadow-md shadow-app-primary/20 shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-app-text tracking-tight">Purchasing & Supplier Operations</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-primary/10 text-app-primary">
                <Store size={10} /> {activeStore?.name || "Main Branch"}
              </span>
            </div>
            <p className="text-xs text-app-text-secondary mt-0.5">
              Manage wholesale vendors, purchase orders, goods receiving, and supplier payables.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/network?tab=partners"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-app-primary bg-app-primary/10 border border-app-primary/20 hover:bg-app-primary/20 rounded-xl transition-colors shadow-xs"
          >
            <Globe size={14} /> Karobar B2B Network
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPaymentModal(true)}
            icon={<Landmark size={14} />}
            className="text-xs"
          >
            Record Payment
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSupplierModal(true)}
            icon={<Plus size={14} />}
            className="text-xs"
          >
            Add Supplier
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setPoForm({ ...initialPoForm, order_no: `PO-${Date.now().toString().slice(-6)}` });
              setShowAddPoModal(true);
            }}
            icon={<Plus size={15} />}
            className="text-xs shadow-md shadow-app-primary/20 font-bold"
          >
            + New Purchase Order
          </Button>
        </div>
      </div>

      {/* 2. SNAPSHOT KPI CARDS (Global KaroBar Card System) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          title="Total Purchase Spend"
          value={`₹${stats.totalPurchaseValue.toLocaleString('en-IN')}`}
          subtitle="Cumulative PO volume"
          icon={<DollarSign size={18} />}
          iconBg="bg-app-surface-subtle text-app-text-secondary"
        />

        <MetricCard
          title="Pending Orders"
          value={stats.pendingOrdersCount}
          badge={stats.pendingOrdersCount > 0 ? "Awaiting Inflow" : "Cleared"}
          badgeVariant={stats.pendingOrdersCount > 0 ? "warning" : "success"}
          subtitle="Orders in transit / draft"
          icon={<Clock size={18} />}
          iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
        />

        <MetricCard
          title="Goods Inflow Expected"
          value={`${stats.goodsExpectedUnits.toLocaleString('en-IN')} units`}
          subtitle="Across pending PO items"
          icon={<Package size={18} />}
          iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
        />

        <MetricCard
          title="Supplier Payables"
          value={`₹${stats.totalSupplierPayables.toLocaleString('en-IN')}`}
          badge={stats.totalSupplierPayables > 0 ? "Outstanding" : "Settled"}
          badgeVariant={stats.totalSupplierPayables > 0 ? "danger" : "success"}
          subtitle="Total unpaid vendor khata"
          icon={<AlertTriangle size={18} />}
          iconBg="bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
        />

        <MetricCard
          title="Active Suppliers"
          value={stats.activeSuppliersCount}
          subtitle="Registered vendor partners"
          icon={<Truck size={18} />}
          iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
        />
      </div>

      {/* 3. TABS & OPERATIONAL CONTROLS */}
      <div className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border/60 pb-3">
          
          {/* Navigation Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'orders', label: 'Purchase Orders', icon: <FileText size={14} />, count: purchaseOrders.length },
              { id: 'suppliers', label: 'Supplier Directory & Payables', icon: <Truck size={14} />, count: suppliers.length },
              { id: 'reorder', label: 'Reorder Intelligence', icon: <Sparkles size={14} />, count: reorderCandidates.length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedSupplier(null);
                  setSelectedPo(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-app-primary text-white shadow-xs'
                    : 'bg-app-surface-subtle text-app-text-secondary hover:text-app-text'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-app-border text-app-text-muted'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-app-text-muted text-[11px] font-semibold">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-app-surface-subtle border border-app-border rounded-xl px-2.5 py-1 text-xs font-bold text-app-text outline-none focus:border-app-primary"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="3m">Last 3 Months</option>
              <option value="12m">Last 12 Months</option>
            </select>
          </div>
        </div>

        {/* Tab 1 Filter Bar: POs */}
        {activeTab === 'orders' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={15} />
              <input
                type="text"
                placeholder="Search PO Number or Supplier..."
                value={poSearchTerm}
                onChange={(e) => setPoSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Orders' },
                { id: 'Draft', label: 'Draft' },
                { id: 'Sent', label: 'Sent' },
                { id: 'Accepted', label: 'Accepted' },
                { id: 'Partially Received', label: 'Partial' },
                { id: 'Received', label: 'Received' },
                { id: 'Completed', label: 'Completed' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPoStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    poStatusFilter === s.id
                      ? 'bg-app-text text-app-surface dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-app-surface-subtle text-app-text-secondary hover:text-app-text'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2 Filter Bar: Suppliers */}
        {activeTab === 'suppliers' && (
          <div className="relative max-w-md pt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={15} />
            <input
              type="text"
              placeholder="Search by Supplier Name, Phone, GSTIN, or Address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
            />
          </div>
        )}
      </div>

      {/* 4. WORKSPACE TAB CONTENT */}
      {loading ? (
        <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel space-y-3">
          <RefreshCw className="animate-spin text-app-primary mx-auto" size={28} />
          <p className="text-xs font-bold text-app-text">Loading purchasing data...</p>
        </div>
      ) : activeTab === 'orders' ? (
        /* TAB 1: PURCHASE ORDERS WORKSPACE */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
          {filteredPurchaseOrders.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={40} className="mx-auto text-app-text-muted mb-2" />
              <h3 className="font-bold text-sm text-app-text">No purchase orders found</h3>
              <p className="text-xs text-app-text-muted mt-1">Create a new purchase order or adjust your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Expected Date</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredPurchaseOrders.map(po => {
                    const statusObj = getStatusBadge(po.status);
                    return (
                      <tr 
                        key={po.id} 
                        className="hover:bg-app-surface-subtle/50 transition-colors cursor-pointer"
                        onClick={() => viewPoDetails(po)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-app-text">
                          {po.order_no}
                        </td>
                        <td className="py-3 px-4 font-bold text-app-text">
                          {po.suppliers?.name || 'Vendor'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-app-text-secondary">
                          {new Date(po.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-app-text-secondary">
                          {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-app-text">
                          {(po.items || []).length || 1}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono text-app-text">
                          ₹{Number(po.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusObj.bg}`}>
                            {statusObj.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {['Draft', 'Sent', 'Accepted', 'Partially Received'].includes(po.status) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReceivingPo(po);
                                  setReceiveForm({ batch_name: `Batch ${new Date().toLocaleDateString('en-IN')}`, notes: '' });
                                  setShowReceiveModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-2xs"
                                title="Receive Goods into Inventory"
                              >
                                Receive
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setPrintablePo(po);
                                setTimeout(() => handlePrint(), 200);
                              }}
                              className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text hover:bg-app-surface-subtle transition-colors"
                              title="Print Order Slip"
                            >
                              <Printer size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => viewPoDetails(po)}
                              className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-primary hover:bg-app-surface-subtle transition-colors"
                              title="View PO Details"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'suppliers' ? (
        /* TAB 2: SUPPLIER DIRECTORY & PAYABLES */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
          {filteredSuppliers.length === 0 ? (
            <div className="p-12 text-center">
              <Truck size={40} className="mx-auto text-app-text-muted mb-2" />
              <h3 className="font-bold text-sm text-app-text">No suppliers found</h3>
              <p className="text-xs text-app-text-muted mt-1">Add your first wholesale vendor to start managing purchases.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4">Credit Limit</th>
                    <th className="py-3 px-4 text-right">Outstanding Due (Payable)</th>
                    <th className="py-3 px-4 text-center w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredSuppliers.map(supplier => {
                    const balance = Number(supplier.outstanding_balance || 0);

                    return (
                      <tr 
                        key={supplier.id} 
                        className="hover:bg-app-surface-subtle/50 transition-colors cursor-pointer"
                        onClick={() => viewSupplierLedger(supplier)}
                      >
                        <td className="py-3 px-4 font-bold text-app-text">
                          {supplier.name}
                        </td>
                        <td className="py-3 px-4 text-app-text-secondary">
                          <div>{supplier.phone || 'N/A'}</div>
                          {supplier.address && <div className="text-[10px] text-app-text-muted truncate max-w-[180px]">{supplier.address}</div>}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-app-text-secondary">
                          {supplier.gstin || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-app-text">
                          ₹{Number(supplier.credit_limit || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono">
                          <span className={balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}>
                            ₹{balance.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentForm({ supplier_id: supplier.id, amount: balance > 0 ? balance : '', payment_method: 'Cash', ref_no: '', remarks: '' });
                                setShowPaymentModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors shadow-2xs"
                              title="Pay Supplier"
                            >
                              Pay
                            </button>

                            <button
                              type="button"
                              onClick={() => viewSupplierLedger(supplier)}
                              className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-primary hover:bg-app-surface-subtle transition-colors"
                              title="View Ledger"
                            >
                              <Receipt size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setShowEditSupplierModal(true);
                              }}
                              className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text hover:bg-app-surface-subtle transition-colors"
                              title="Edit Supplier"
                            >
                              <Edit size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteSupplier(supplier.id, e)}
                              className="p-1.5 rounded-lg text-app-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete Supplier"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB 3: REORDER INTELLIGENCE WORKSPACE */
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-panel text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-600" size={18} />
              <span>
                <strong>Smart Reorder Radar:</strong> Identified <strong>{reorderCandidates.length} products</strong> with critical stock levels. Click <strong>Generate PO</strong> to prefill order quantities.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reorderCandidates.map(product => (
              <div
                key={product.id}
                className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-mono text-app-text-muted">{product.sku || 'SKU'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 border border-rose-200">
                      {product.stock} {product.units || 'pcs'} left
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-app-text leading-tight">{product.name}</h3>
                  <p className="text-[11px] text-app-text-muted mt-0.5 capitalize">{product.category || 'General'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-app-border space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-app-text-secondary">Recent Cost Price:</span>
                    <span className="font-mono text-app-text">₹{Number(product.cost_price || product.price || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-app-text-secondary">Suggested Reorder:</span>
                    <span className="font-mono font-bold text-emerald-600">50 {product.units || 'pcs'}</span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => handlePrefillReorder(product)}
                    icon={<Plus size={14} />}
                    className="mt-2 text-xs font-bold"
                  >
                    Generate Purchase Order
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. SUPPLIER LEDGER DRAWER */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 animate-fadeIn">
          <div className="bg-app-surface border-l border-app-border w-full max-w-xl h-full shadow-2xl overflow-y-auto flex flex-col justify-between">
            
            {/* Header */}
            <div>
              <div className="flex justify-between items-center px-6 py-4 border-b border-app-border bg-app-surface-subtle">
                <div className="flex items-center gap-2.5">
                  <Truck className="text-app-primary" size={20} />
                  <div>
                    <h2 className="font-black text-base text-app-text leading-tight">{selectedSupplier.name}</h2>
                    <span className="text-[10px] font-mono text-app-text-muted">GSTIN: {selectedSupplier.gstin || 'Unregistered'}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedSupplier(null)} className="p-1.5 rounded-lg text-app-text-muted hover:text-app-text">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                
                {/* Balance Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl text-center">
                    <span className="text-[10px] font-bold text-app-text-muted uppercase">Outstanding Payable</span>
                    <p className="text-xl font-black font-mono text-rose-600 mt-0.5">
                      ₹{Number(selectedSupplier.outstanding_balance || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl text-center">
                    <span className="text-[10px] font-bold text-app-text-muted uppercase">Credit Limit</span>
                    <p className="text-xl font-black font-mono text-app-text mt-0.5">
                      ₹{Number(selectedSupplier.credit_limit || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Ledger Timeline */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-app-text">Transaction History & Ledger</h4>
                  
                  {supplierLedger?.purchaseOrders?.length > 0 || supplierLedger?.payments?.length > 0 ? (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {/* Combine POs and Payments */}
                      {[
                        ...(supplierLedger.purchaseOrders || []).map(po => ({ type: 'purchase', date: po.created_at, title: `PO #${po.order_no}`, amount: Number(po.total_amount || 0), status: po.status })),
                        ...(supplierLedger.payments || []).map(pay => ({ type: 'payment', date: pay.created_at, title: `Payment (${pay.payment_method || 'Cash'})`, amount: Number(pay.amount || 0), ref: pay.ref_no }))
                      ]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((tx, idx) => (
                          <div key={idx} className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-app-text">{tx.title}</p>
                              <span className="text-[10px] font-mono text-app-text-muted">
                                {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono font-black ${tx.type === 'purchase' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {tx.type === 'purchase' ? `+₹${tx.amount.toLocaleString('en-IN')}` : `-₹${tx.amount.toLocaleString('en-IN')}`}
                              </span>
                              <span className="text-[9px] text-app-text-muted block uppercase">{tx.type}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-app-text-muted italic">No prior transaction history on file.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-app-border bg-app-surface-subtle flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPoForm({ ...initialPoForm, supplier_id: selectedSupplier.id, order_no: `PO-${Date.now().toString().slice(-6)}` });
                  setShowAddPoModal(true);
                }}
                className="text-xs font-bold"
              >
                + Create PO
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setPaymentForm({ supplier_id: selectedSupplier.id, amount: selectedSupplier.outstanding_balance || '', payment_method: 'Cash', ref_no: '', remarks: '' });
                  setShowPaymentModal(true);
                }}
                className="text-xs font-bold"
              >
                💳 Record Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. GOODS RECEIVING MODAL */}
      {showReceiveModal && receivingPo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Package className="text-emerald-500" size={18} />
                <h3 className="font-bold text-sm text-app-text">Receive Stock ({receivingPo.order_no})</h3>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecuteReceiving} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl space-y-1">
                <p className="font-bold text-app-text">Supplier: {receivingPo.suppliers?.name || 'Vendor'}</p>
                <p className="text-[11px] text-app-text-secondary">PO Total Value: ₹{Number(receivingPo.total_amount || 0).toLocaleString('en-IN')}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Batch / Lot Name</label>
                <input
                  type="text"
                  placeholder={`Batch ${new Date().toLocaleDateString('en-IN')}`}
                  value={receiveForm.batch_name}
                  onChange={e => setReceiveForm(p => ({ ...p, batch_name: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Receiving Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. All cartons inspected in good condition..."
                  value={receiveForm.notes}
                  onChange={e => setReceiveForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl p-2.5 text-xs text-app-text outline-none focus:border-app-primary resize-none"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300">
                ⚡ Receiving this order will automatically increment physical inventory stock batches and log an audit expense.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowReceiveModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold bg-emerald-600 hover:bg-emerald-700">
                  Confirm Stock Intake
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CREATE PURCHASE ORDER MODAL */}
      {showAddPoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-app-border sticky top-0 bg-app-surface z-10">
              <div className="flex items-center gap-2">
                <Plus className="text-app-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Create New Purchase Order</h3>
              </div>
              <button onClick={() => setShowAddPoModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Supplier *</label>
                  <select
                    required
                    value={poForm.supplier_id}
                    onChange={e => setPoForm(p => ({ ...p, supplier_id: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  >
                    <option value="">Select Vendor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Due: ₹{s.outstanding_balance || 0})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">PO Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PO-10024"
                    value={poForm.order_no}
                    onChange={e => setPoForm(p => ({ ...p, order_no: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 pt-2 border-t border-app-border">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs text-app-text">Order Items</h4>
                  <button
                    type="button"
                    onClick={() => setPoForm(p => ({
                      ...p,
                      items: [...p.items, { inventory_id: '', quantity: 1, cost_price: 0, gst_rate: 0, discount_amount: 0 }]
                    }))}
                    className="text-xs font-bold text-app-primary hover:underline"
                  >
                    + Add Item Row
                  </button>
                </div>

                {poForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 bg-app-surface-subtle rounded-xl border border-app-border">
                    <div className="col-span-5">
                      <select
                        required
                        value={item.inventory_id}
                        onChange={e => {
                          const prod = products.find(p => p.id === e.target.value);
                          const updated = [...poForm.items];
                          updated[idx] = {
                            ...updated[idx],
                            inventory_id: e.target.value,
                            cost_price: prod ? Number(prod.cost_price || prod.price || 0) : 0,
                            gst_rate: prod ? Number(prod.gst_percent || 0) : 0
                          };
                          setPoForm(p => ({ ...p, items: updated }));
                        }}
                        className="w-full bg-app-surface border border-app-border rounded-lg px-2 py-1.5 text-xs font-bold text-app-text outline-none"
                      >
                        <option value="">Select Product...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => {
                          const updated = [...poForm.items];
                          updated[idx].quantity = Number(e.target.value) || 1;
                          setPoForm(p => ({ ...p, items: updated }));
                        }}
                        className="w-full text-center bg-app-surface border border-app-border rounded-lg p-1.5 text-xs font-bold text-app-text outline-none"
                      />
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        placeholder="Unit Cost ₹"
                        value={item.cost_price}
                        onChange={e => {
                          const updated = [...poForm.items];
                          updated[idx].cost_price = Number(e.target.value) || 0;
                          setPoForm(p => ({ ...p, items: updated }));
                        }}
                        className="w-full text-right bg-app-surface border border-app-border rounded-lg p-1.5 text-xs font-bold text-app-text outline-none"
                      />
                    </div>

                    <div className="col-span-2 text-right">
                      {poForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPoForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                          className="p-1 text-app-text-muted hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={poForm.expected_delivery_date}
                  onChange={e => setPoForm(p => ({ ...p, expected_delivery_date: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddPoModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmittingPo} className="font-bold">
                  {isSubmittingPo ? "Creating..." : "Create Purchase Order"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. RECORD SUPPLIER PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Landmark className="text-indigo-500" size={18} />
                <h3 className="font-bold text-sm text-app-text">Record Supplier Settlement</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Supplier *</label>
                <select
                  required
                  value={paymentForm.supplier_id}
                  onChange={e => setPaymentForm(p => ({ ...p, supplier_id: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                >
                  <option value="">Select Supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Outstanding: ₹{s.outstanding_balance || 0})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="₹0"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Payment Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={e => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Reference / UTR No.</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-987654321"
                  value={paymentForm.ref_no}
                  onChange={e => setPaymentForm(p => ({ ...p, ref_no: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold">
                  Confirm Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. ADD / EDIT SUPPLIER MODAL */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <Plus className="text-app-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Add Vendor Partner</h3>
              </div>
              <button onClick={() => setShowAddSupplierModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="p-5 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Supplier Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Wholesale Traders"
                  value={newSupplier.name}
                  onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="27ABCDE1234F1Z5"
                    value={newSupplier.gstin}
                    onChange={e => setNewSupplier(p => ({ ...p, gstin: e.target.value }))}
                    className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="City, State"
                  value={newSupplier.address}
                  onChange={e => setNewSupplier(p => ({ ...p, address: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Credit Limit (₹)</label>
                <input
                  type="number"
                  placeholder="₹50,000"
                  value={newSupplier.credit_limit}
                  onChange={e => setNewSupplier(p => ({ ...p, credit_limit: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddSupplierModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="font-bold">
                  Save Supplier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. HIDDEN PRINTABLE PURCHASE ORDER */}
      <div className="hidden">
        <div ref={printRef} className="p-8 font-sans text-slate-900 bg-white min-h-[800px]">
          {printablePo && (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h1 className="text-xl font-black">{activeStore?.name || "KAROBAR STORE"}</h1>
                  <p className="text-xs text-slate-500">{activeStore?.address || "Store Address"}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black text-indigo-600">PURCHASE ORDER</h2>
                  <p className="font-mono text-xs font-bold">{printablePo.order_no}</p>
                  <p className="text-[11px] text-slate-500">Date: {new Date(printablePo.created_at || Date.now()).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-bold uppercase text-slate-400 text-[10px]">Vendor:</p>
                  <p className="font-bold text-sm">{printablePo.suppliers?.name}</p>
                  <p>{printablePo.suppliers?.phone}</p>
                  <p>{printablePo.suppliers?.address}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold uppercase text-slate-400 text-[10px]">Status:</p>
                  <p className="font-bold">{printablePo.status}</p>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 font-bold">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Item</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Cost Price</th>
                    <th className="py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(printablePo.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-2 font-bold">{item.inventory?.name || 'Product Item'}</td>
                      <td className="py-2 px-2 text-center">{item.quantity}</td>
                      <td className="py-2 px-2 text-right">₹{Number(item.cost_price || 0).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-bold">₹{(Number(item.cost_price || 0) * Number(item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-4 border-t text-sm font-black">
                <div>Total Amount: ₹{Number(printablePo.total_amount || 0).toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
