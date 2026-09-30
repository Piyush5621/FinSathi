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
  Eye, CheckCheck, MapPin, Phone, Mail, Building, ShieldAlert,
  RotateCcw, Compass, CreditCard, Inbox
} from 'lucide-react';

export default function SupplierHub() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeStore, stores } = useStore();

  // Tab & Period Navigation
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'requests' | 'incoming' | 'suppliers' | 'reorder' | 'discover'
  const [selectedPeriod, setSelectedPeriod] = useState('30d'); // 'today' | '7d' | '30d' | '3m' | '12m'
  const [loading, setLoading] = useState(true);

  // Data State
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [incomingSearchTerm, setIncomingSearchTerm] = useState('');
  const [incomingStatusFilter, setIncomingStatusFilter] = useState('all');

  // Supplier-specific Catalog for Purchase Request
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [loadingSupplierProducts, setLoadingSupplierProducts] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('all'); // 'all' | 'Draft' | 'Sent' | 'Accepted' | 'Partially Received' | 'Received' | 'Completed' | 'Cancelled'

  // Discovery State (Phase 7 — Find Suppliers)
  const [discoveredSuppliers, setDiscoveredSuppliers] = useState([]);
  const [discoverySearch, setDiscoverySearch] = useState('');
  const [discoveryCategory, setDiscoveryCategory] = useState('');
  const [discoveryRadius, setDiscoveryRadius] = useState('all'); // 'all' | '5' | '10' | '25' | '50' | 'custom'
  const [customRadius, setCustomRadius] = useState('');
  const [discoveryCity, setDiscoveryCity] = useState('');
  const [userCoords, setUserCoords] = useState({ latitude: null, longitude: null });
  const [isLocating, setIsLocating] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [selectedDiscoveredSupplier, setSelectedDiscoveredSupplier] = useState(null);
  const [discoveryTotal, setDiscoveryTotal] = useState(0);

  // Purchase Requests State (Phase 8 — Purchase Requests)
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [prSearchTerm, setPrSearchTerm] = useState('');
  const [prStatusFilter, setPrStatusFilter] = useState('all'); // 'all' | 'draft' | 'sent' | 'cancelled'
  const [selectedPr, setSelectedPr] = useState(null);
  const [showAddPrModal, setShowAddPrModal] = useState(false);
  const [isSubmittingPr, setIsSubmittingPr] = useState(false);
  const initialPrForm = {
    supplier_id: '',
    supplier_name: '',
    notes: '',
    status: 'draft',
    items: [{
      supplier_product_id: null,
      product_name: '',
      sku: '',
      requested_quantity: 1,
      requested_unit: 'pcs',
      requested_price: ''
    }]
  };
  const [prForm, setPrForm] = useState(initialPrForm);
  const [prProductSearch, setPrProductSearch] = useState('');

  // Selected Detail Drawers & Modals
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierLedger, setSupplierLedger] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);
  const [receivingPo, setReceivingPo] = useState(null);
  const [returningPo, setReturningPo] = useState(null);
  const [printablePo, setPrintablePo] = useState(null);

  // Supplier Response & Counter-Offer State
  const [isResponding, setIsResponding] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [responseItems, setResponseItems] = useState([]);

  // Modal Visibility State
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showAddPoModal, setShowAddPoModal] = useState(false);
  const [showEditPoModal, setShowEditPoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Form States
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', gstin: '', address: '', credit_limit: '', payment_terms: '30 Days' });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ supplier_id: '', amount: '', payment_method: 'Cash', ref_no: '', remarks: '' });
  const [receiveForm, setReceiveForm] = useState({ batch_name: '', notes: '' });
  const [returnForm, setReturnForm] = useState({ reason: 'Damaged', notes: '', items: [] });

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
      const [suppRes, invRes, poRes, prRes, incomingRes] = await Promise.all([
        API.get('/suppliers?limit=200').catch(() => ({ data: { data: [] } })),
        API.get('/inventory?limit=500').catch(() => ({ data: [] })),
        API.get('/purchase-orders?limit=200').catch(() => ({ data: { data: [] } })),
        API.get('/purchase-requests?limit=100').catch(() => ({ data: { data: { results: [] } } })),
        API.get('/purchase-requests/incoming?limit=100').catch(() => ({ data: { data: { results: [] } } }))
      ]);

      setSuppliers(suppRes.data?.data || []);
      setProducts(invRes.data || []);
      setPurchaseOrders(poRes.data?.data || []);
      setPurchaseRequests(prRes.data?.data?.results || prRes.data?.data || []);
      setIncomingRequests(incomingRes.data?.data?.results || incomingRes.data?.data || []);
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

  // Fetch product catalog for a specific vendor
  const fetchSupplierProducts = useCallback(async (supplierId) => {
    if (!supplierId) {
      setSupplierProducts([]);
      return;
    }
    setLoadingSupplierProducts(true);
    try {
      const res = await API.get(`/suppliers/${supplierId}/products`);
      setSupplierProducts(res.data?.data || []);
    } catch (err) {
      console.warn("Could not fetch supplier products:", err);
      setSupplierProducts([]);
    } finally {
      setLoadingSupplierProducts(false);
    }
  }, []);

  // Auto-fetch vendor products when PR supplier changes
  useEffect(() => {
    if (prForm.supplier_id) {
      fetchSupplierProducts(prForm.supplier_id);
    } else {
      setSupplierProducts([]);
    }
  }, [prForm.supplier_id, fetchSupplierProducts]);

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

  // Filtered Purchase Requests
  const filteredPurchaseRequests = useMemo(() => {
    return purchaseRequests.filter(pr => {
      const matchSearch = !prSearchTerm.trim() ||
        pr.request_number?.toLowerCase().includes(prSearchTerm.toLowerCase().trim()) ||
        pr.supplier?.name?.toLowerCase().includes(prSearchTerm.toLowerCase().trim()) ||
        pr.notes?.toLowerCase().includes(prSearchTerm.toLowerCase().trim());
      const matchStatus = prStatusFilter === 'all' || pr.status === prStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchaseRequests, prSearchTerm, prStatusFilter]);

  // Status Badge Helper for Purchase Requests
  const getPrStatusBadge = (status) => {
    switch (status) {
      case 'draft': return { label: 'Draft', bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300' };
      case 'sent': return { label: 'Sent to Supplier', bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300' };
      case 'countered': return { label: 'Counter Offer Received', bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300' };
      case 'accepted': return { label: 'Accepted', bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300' };
      case 'completed': return { label: 'PO Created (Completed)', bg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300' };
      case 'rejected': return { label: 'Rejected', bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300' };
      case 'cancelled': return { label: 'Cancelled', bg: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-300' };
      case 'expired': return { label: 'Expired', bg: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-300' };
      default: return { label: status || 'Unknown', bg: 'bg-slate-100 text-slate-800' };
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft': return { label: 'Draft', bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300' };
      case 'Sent': return { label: 'Sent to Vendor', bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300' };
      case 'Accepted': return { label: 'Order Accepted', bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300' };
      case 'Partially Received': return { label: 'Partially Received', bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300' };
      case 'Received': return { label: 'Stock Received', bg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300' };
      case 'Partially Returned': return { label: 'Partially Returned', bg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-300' };
      case 'Returned': return { label: 'Returned', bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300' };
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

  // Open Return Modal with returnable quantities
  const openReturnModal = async (po) => {
    try {
      const res = await API.get(`/purchase-orders/${po.id}`);
      const poDetails = res.data?.data || po;
      setReturningPo(poDetails);
      const itemsToReturn = (poDetails.items || []).map(item => {
        const received = Number(item.received_quantity || 0);
        const returned = Number(item.returned_quantity || 0);
        const returnable = Math.max(0, received - returned);
        return {
          purchase_order_item_id: item.id,
          product_name: item.inventory?.name || 'Product Item',
          received_quantity: received,
          returned_quantity: returned,
          returnable_quantity: returnable,
          quantity: 0,
          reason: 'Damaged',
          notes: ''
        };
      }).filter(item => item.returnable_quantity > 0);

      setReturnForm({
        reason: 'Damaged',
        notes: '',
        items: itemsToReturn
      });
      setShowReturnModal(true);
    } catch (err) {
      toast.error('Failed to load purchase order details for return');
    }
  };

  // Execute Purchase Return
  const handleExecuteReturn = async (e) => {
    e.preventDefault();
    if (!returningPo || isSubmittingReturn) return;

    const itemsWithQty = returnForm.items.filter(i => Number(i.quantity) > 0);
    if (itemsWithQty.length === 0) {
      return toast.error('Please specify a return quantity greater than 0 for at least one item');
    }

    for (const it of itemsWithQty) {
      if (Number(it.quantity) > it.returnable_quantity) {
        return toast.error(`Return quantity for ${it.product_name} exceeds returnable amount (${it.returnable_quantity})`);
      }
    }

    try {
      setIsSubmittingReturn(true);
      const res = await API.post(`/purchase-orders/${returningPo.id}/returns`, {
        reason: returnForm.reason,
        notes: returnForm.notes,
        items: itemsWithQty.map(i => ({
          purchase_order_item_id: i.purchase_order_item_id,
          quantity: Number(i.quantity),
          reason: returnForm.reason,
          notes: i.notes || returnForm.notes
        }))
      });

      if (res.data?.success || res.data) {
        toast.success(`Purchase return recorded! Stock reduced and supplier balance adjusted. ↩️`);
        setShowReturnModal(false);
        setReturningPo(null);
        fetchData();
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || err.response?.data?.error || 'Failed to process purchase return');
    } finally {
      setIsSubmittingReturn(false);
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

  // Fetch Discovered Suppliers
  const fetchDiscoveredSuppliers = useCallback(async () => {
    setDiscoveryLoading(true);
    try {
      const params = {};
      if (discoverySearch.trim()) params.search = discoverySearch.trim();
      if (discoveryCategory.trim()) params.category = discoveryCategory.trim();
      if (discoveryCity.trim()) params.city = discoveryCity.trim();

      if (userCoords.latitude !== null && userCoords.longitude !== null) {
        params.latitude = userCoords.latitude;
        params.longitude = userCoords.longitude;
      }

      if (discoveryRadius !== 'all') {
        const rad = discoveryRadius === 'custom' ? parseFloat(customRadius) : parseFloat(discoveryRadius);
        if (rad > 0) {
          params.radius = rad;
        }
      }

      const res = await API.get('/suppliers/discover', { params });
      setDiscoveredSuppliers(res.data?.data?.results || []);
      setDiscoveryTotal(res.data?.data?.total || 0);
    } catch (err) {
      console.error("Error discovering suppliers:", err);
      toast.error(err.response?.data?.summary || 'Failed to search suppliers');
    } finally {
      setDiscoveryLoading(false);
    }
  }, [discoverySearch, discoveryCategory, discoveryCity, discoveryRadius, customRadius, userCoords]);

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchDiscoveredSuppliers();
    }
  }, [activeTab, fetchDiscoveredSuppliers]);

  // Geolocation Handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return toast.error("Geolocation is not supported by your browser");
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6))
        });
        setIsLocating(false);
        toast.success("Location updated! Calculating supplier distances.");
      },
      (err) => {
        setIsLocating(false);
        toast.error("Could not obtain location. You can still search by city or product.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Choose Supplier Handler (prefill PO)
  const handleChooseSupplier = async (discoveredSupplier, product = null) => {
    try {
      let localSupplier = suppliers.find(s => 
        s.id === discoveredSupplier.id || 
        (s.phone && discoveredSupplier.phone && s.phone === discoveredSupplier.phone) ||
        (s.name.toLowerCase() === discoveredSupplier.name.toLowerCase())
      );

      if (!localSupplier) {
        toast.loading("Connecting supplier to your directory...", { id: "import-supp" });
        const createRes = await API.post('/suppliers', {
          name: discoveredSupplier.name,
          phone: discoveredSupplier.phone || '',
          address: discoveredSupplier.address || discoveredSupplier.city || '',
          credit_limit: 0,
          payment_terms: discoveredSupplier.payment_terms || '30 Days'
        });
        toast.dismiss("import-supp");
        localSupplier = createRes.data?.data || createRes.data;
        await fetchData();
      }

      let matchingProduct = null;
      if (product) {
        matchingProduct = products.find(p => 
          (product.sku && p.sku === product.sku) || 
          p.name.toLowerCase() === product.product_name.toLowerCase()
        );
      }

      setPoForm({
        ...initialPoForm,
        supplier_id: localSupplier.id,
        order_no: `PO-${Date.now().toString().slice(-6)}`,
        items: [{
          inventory_id: matchingProduct ? matchingProduct.id : (products[0]?.id || ''),
          quantity: product?.min_order_quantity || 1,
          cost_price: product?.price ? Number(product.price) : (matchingProduct?.cost_price || 0),
          gst_rate: matchingProduct?.gst_percent || 0,
          discount_amount: 0
        }]
      });

      setSelectedDiscoveredSupplier(null);
      setActiveTab('orders');
      setShowAddPoModal(true);
      toast.success(`Selected ${discoveredSupplier.name}! Prefilled purchase order.`);
    } catch (err) {
      toast.dismiss("import-supp");
      toast.error(err.response?.data?.summary || err.message || "Failed to choose supplier");
    }
  };

  // Open Create Purchase Request Modal
  const handleOpenCreatePr = (supplier, product = null) => {
    setPrForm({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      notes: '',
      status: 'draft',
      items: [{
        supplier_product_id: product?.id || null,
        product_name: product?.product_name || '',
        sku: product?.sku || '',
        requested_quantity: product?.min_order_quantity || 1,
        requested_unit: product?.unit || 'pcs',
        requested_price: product?.price ? Number(product.price) : ''
      }]
    });
    setShowAddPrModal(true);
  };

  // Quick Add Product to PR (Supports multiple products seamlessly)
  const handleAddProductToPr = (prod) => {
    setPrForm(prev => {
      const prodName = prod.name || prod.product_name || '';
      const prodSku = prod.sku || '';
      const existingIdx = prev.items.findIndex(i => 
        (prodSku && i.sku && i.sku === prodSku) || 
        (prodName && i.product_name && i.product_name.toLowerCase() === prodName.toLowerCase())
      );
      if (existingIdx >= 0) {
        const updated = [...prev.items];
        updated[existingIdx].requested_quantity = Number(updated[existingIdx].requested_quantity || 1) + 1;
        return { ...prev, items: updated };
      }
      const cleanItems = prev.items.filter(i => i.product_name?.trim());
      return {
        ...prev,
        items: [
          ...cleanItems,
          {
            supplier_product_id: prod.supplier_product_id || null,
            product_name: prodName,
            sku: prodSku,
            requested_quantity: Number(prod.min_order_quantity) || 1,
            requested_unit: prod.units || prod.unit || 'pcs',
            requested_price: prod.cost_price != null ? Number(prod.cost_price) : (prod.price != null ? Number(prod.price) : '')
          }
        ]
      };
    });
    toast.success(`Added ${prod.name || prod.product_name} to request`);
  };

  // Submit Purchase Request (Draft or Sent)
  const handleSubmitPr = async (targetStatus = 'draft') => {
    if (isSubmittingPr) return;
    if (!prForm.supplier_id) return toast.error('Please select a supplier');

    const validItems = (prForm.items || []).filter(i => i.product_name?.trim() && Number(i.requested_quantity) > 0);
    if (validItems.length === 0) {
      return toast.error('Please add at least one item with valid quantity');
    }

    try {
      setIsSubmittingPr(true);
      const res = await API.post('/purchase-requests', {
        ...prForm,
        status: targetStatus,
        items: validItems
      });

      if (res.data?.success || res.data) {
        toast.success(targetStatus === 'sent' ? 'Purchase Request sent to supplier! 🚀' : 'Purchase Request saved as draft! 📝');
        setShowAddPrModal(false);
        setPrForm(initialPrForm);
        fetchData();
        setActiveTab('requests');
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || err.message || 'Failed to create purchase request');
    } finally {
      setIsSubmittingPr(false);
    }
  };

  // Send an existing draft PR
  const handleSendPr = async (requestId) => {
    try {
      const res = await API.post(`/purchase-requests/${requestId}/send`);
      if (res.data?.success || res.data) {
        toast.success('Purchase request sent to supplier! 🚀');
        fetchData();
        if (selectedPr?.id === requestId) {
          const detailRes = await API.get(`/purchase-requests/${requestId}`);
          setSelectedPr(detailRes.data?.data);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || err.message || 'Failed to send purchase request');
    }
  };

  // Initialize response editor with items from PR
  const handleStartResponding = (pr) => {
    setResponseNotes('');
    setResponseItems((pr.items || []).map(item => ({
      ...item,
      offered_quantity: Number(item.requested_quantity || 1),
      offered_price: item.requested_price ? Number(item.requested_price) : ''
    })));
    setIsResponding(true);
  };

  // Submit supplier response (accept, counter, or reject)
  const handleRespondToPr = async (actionType = 'counter') => {
    if (!selectedPr) return;
    try {
      const payload = {
        action: actionType,
        notes: responseNotes || (actionType === 'counter' ? 'Supplier sent counter-offer with revised quantities/rates' : 'Supplier accepted request'),
        items: responseItems.map(item => ({
          purchase_request_item_id: item.id,
          product_name: item.product_name,
          sku: item.sku,
          requested_quantity: item.requested_quantity,
          offered_quantity: Number(item.offered_quantity || 0),
          requested_price: item.requested_price,
          offered_price: item.offered_price !== '' && item.offered_price !== null ? Number(item.offered_price) : (item.requested_price ? Number(item.requested_price) : 0)
        }))
      };

      const res = await API.post(`/purchase-requests/${selectedPr.id}/respond`, payload);
      if (res.data?.success || res.data) {
        toast.success(actionType === 'counter' ? 'Counter-offer sent to buyer! 📋' : 'Purchase request updated! 🎉');
        setIsResponding(false);
        fetchData();
        const detailRes = await API.get(`/purchase-requests/${selectedPr.id}`);
        setSelectedPr(detailRes.data?.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to submit response');
    }
  };

  // Accept Supplier Counter Offer
  const handleAcceptCounter = async (requestId) => {
    try {
      const res = await API.post(`/purchase-requests/${requestId}/accept-counter`, {
        notes: 'Buyer accepted counter offer'
      });
      if (res.data?.success || res.data) {
        toast.success("Counter-offer accepted! You can now convert this request to a Purchase Order. 🎉");
        fetchData();
        const detailRes = await API.get(`/purchase-requests/${requestId}`);
        setSelectedPr(detailRes.data?.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.summary || 'Failed to accept counter offer');
    }
  };

  // Convert Accepted Request to Canonical Purchase Order
  const handleCreatePoFromRequest = async (requestId) => {
    if (!window.confirm("Convert this accepted request into an official Purchase Order?")) return;

    try {
      const res = await API.post(`/purchase-requests/${requestId}/create-po`, {
        notes: `Auto-generated PO from PR ${selectedPr?.request_number || ''}`
      });

      if (res.data?.success || res.data) {
        toast.success(`Purchase Order created successfully! (Status: Completed) 🚀`);
        fetchData();
        setSelectedPr(null);
        setActiveTab('orders');
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.summary || 'Failed to create Purchase Order');
    }
  };

  // Supplier generates a formal Sales Invoice / Bill from an accepted purchase request
  const handleGenerateInvoice = async (requestId) => {
    try {
      setIsGeneratingInvoice(true);
      const res = await API.post(`/purchase-requests/${requestId}/generate-invoice`);
      if (res.data?.success || res.data) {
        const invNo = res.data?.data?.invoice_no || res.data?.invoice_no || 'INV';
        toast.success(`Sales Invoice ${invNo} generated successfully! 🧾🎉`);
        fetchData();
        const detailRes = await API.get(`/purchase-requests/${requestId}`);
        setSelectedPr(detailRes.data?.data);
      }
    } catch (err) {
      console.error("Error generating invoice:", err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // Filter vendor's specific products matching search term for Purchase Request
  const filteredCatalogForPr = useMemo(() => {
    const catalogSource = (supplierProducts && supplierProducts.length > 0) ? supplierProducts : products;
    if (!catalogSource || catalogSource.length === 0) return [];
    const q = prProductSearch.trim().toLowerCase();
    
    return catalogSource.filter(p => {
      const name = (p.product_name || p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const brand = (p.brand || p.company || p.category || '').toLowerCase();
      
      return !q || name.includes(q) || sku.includes(q) || brand.includes(q);
    }).slice(0, 25);
  }, [supplierProducts, products, prProductSearch]);

  // Filter incoming requests received from buyers
  const filteredIncomingRequests = useMemo(() => {
    return incomingRequests.filter(req => {
      const q = incomingSearchTerm.trim().toLowerCase();
      const matchesSearch = !q ||
        req.request_number?.toLowerCase().includes(q) ||
        req.buyer?.name?.toLowerCase().includes(q) ||
        req.buyer?.business_name?.toLowerCase().includes(q) ||
        req.supplier?.name?.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (incomingStatusFilter === 'all') return true;
      if (incomingStatusFilter === 'needs_response') return req.status === 'sent';
      if (incomingStatusFilter === 'accepted') return req.status === 'accepted';
      if (incomingStatusFilter === 'invoiced') return req.notes?.includes('[INVOICE_ID:') || req.status === 'completed';
      return req.status === incomingStatusFilter;
    });
  }, [incomingRequests, incomingSearchTerm, incomingStatusFilter]);

  const prTotalEstAmount = useMemo(() => {
    return (prForm.items || []).reduce((acc, item) => {
      return acc + (Number(item.requested_quantity || 0) * Number(item.requested_price || 0));
    }, 0);
  }, [prForm.items]);

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
            variant="outline"
            size="sm"
            onClick={() => {
              setPrForm(initialPrForm);
              setShowAddPrModal(true);
            }}
            icon={<Send size={14} />}
            className="text-xs font-bold"
          >
            + New Request
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

      {/* Financial Concept Guide Banner: Supplier Hub vs Customer Sales */}
      <div className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <Truck size={18} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs font-bold text-app-text">Supplier Hub (Accounts Payable / सप्लायर को देना है)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                Stock Vendors & Inward POs
              </span>
            </div>
            <p className="text-xs text-app-text-secondary leading-relaxed">
              <strong>Suppliers</strong> are wholesale distributors and vendors whom you <em>buy stock/inventory from</em>. Creating Purchase Orders increases your store stock and tracks payables (money you owe vendors).
            </p>
            <p className="text-[11px] text-app-text-muted">
              Looking to sell goods to retail buyers or record customer orders? Use <button onClick={() => navigate('/billing')} className="font-semibold text-app-primary underline hover:text-app-primary/80 cursor-pointer">POS Billing</button> to ring up purchases, view sales in <button onClick={() => navigate('/invoices')} className="font-semibold text-app-primary underline hover:text-app-primary/80 cursor-pointer">Invoices History</button>, or manage customer credit in <button onClick={() => navigate('/customers')} className="font-semibold text-emerald-600 dark:text-emerald-400 underline hover:opacity-80 cursor-pointer">Customer Khata (Receivables / ग्राहकों से लेना है) →</button>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/invoices')}
            icon={<Receipt size={13} />}
            className="text-xs font-semibold"
          >
            Invoices History
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/billing')}
            icon={<CreditCard size={13} />}
            className="text-xs font-bold"
          >
            POS Billing
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
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'orders', label: 'Purchase Orders', icon: <FileText size={14} />, count: purchaseOrders.length },
              { id: 'requests', label: 'Purchase Requests (Sent)', icon: <Send size={14} />, count: purchaseRequests.length },
              { id: 'incoming', label: 'Incoming Orders (सप्लायर व्यू)', icon: <Inbox size={14} />, count: incomingRequests.length },
              { id: 'suppliers', label: 'Supplier Directory & Payables', icon: <Truck size={14} />, count: suppliers.length },
              { id: 'reorder', label: 'Reorder Intelligence', icon: <Sparkles size={14} />, count: reorderCandidates.length },
              { id: 'discover', label: 'Find Suppliers', icon: <Compass size={14} />, count: discoveryTotal || discoveredSuppliers.length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedSupplier(null);
                  setSelectedPo(null);
                  setSelectedPr(null);
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
                { id: 'Partially Returned', label: 'Part. Returned' },
                { id: 'Returned', label: 'Returned' },
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

        {/* Tab Filter Bar: Purchase Requests */}
        {activeTab === 'requests' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={15} />
              <input
                type="text"
                placeholder="Search Request Number, Supplier, or Notes..."
                value={prSearchTerm}
                onChange={(e) => setPrSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Requests' },
                { id: 'draft', label: 'Draft' },
                { id: 'sent', label: 'Sent' },
                { id: 'accepted', label: 'Accepted' },
                { id: 'rejected', label: 'Rejected' },
                { id: 'cancelled', label: 'Cancelled' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPrStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    prStatusFilter === s.id
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

        {/* Tab Filter Bar: Incoming Purchase Requests (Supplier View) */}
        {activeTab === 'incoming' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={15} />
              <input
                type="text"
                placeholder="Search Buyer Store, Person, Request #..."
                value={incomingSearchTerm}
                onChange={(e) => setIncomingSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Incoming' },
                { id: 'needs_response', label: 'Needs Response' },
                { id: 'accepted', label: 'Accepted' },
                { id: 'invoiced', label: 'Invoiced / Completed' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIncomingStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    incomingStatusFilter === s.id
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

        {/* Tab 4 Filter Bar: Find Suppliers */}
        {activeTab === 'discover' && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={15} />
                <input
                  type="text"
                  placeholder="Search by Product, SKU, or Supplier Name..."
                  value={discoverySearch}
                  onChange={(e) => setDiscoverySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchDiscoveredSuppliers()}
                  className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
                />
              </div>

              <div className="w-full md:w-48">
                <input
                  type="text"
                  placeholder="Category (e.g. Dairy, Hardware)..."
                  value={discoveryCategory}
                  onChange={(e) => setDiscoveryCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchDiscoveredSuppliers()}
                  className="w-full px-3 py-1.5 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
                />
              </div>

              <div className="w-full md:w-40">
                <input
                  type="text"
                  placeholder="City (e.g. Mumbai)..."
                  value={discoveryCity}
                  onChange={(e) => setDiscoveryCity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchDiscoveredSuppliers()}
                  className="w-full px-3 py-1.5 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-app-border/40">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-bold text-app-text-secondary mr-1">Radius:</span>
                {[
                  { id: 'all', label: 'All Distances' },
                  { id: '5', label: '5 km' },
                  { id: '10', label: '10 km' },
                  { id: '25', label: '25 km' },
                  { id: '50', label: '50 km' },
                  { id: 'custom', label: 'Custom' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setDiscoveryRadius(r.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      discoveryRadius === r.id
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-app-surface-subtle text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}

                {discoveryRadius === 'custom' && (
                  <div className="flex items-center gap-1 ml-1">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      placeholder="km"
                      value={customRadius}
                      onChange={(e) => setCustomRadius(e.target.value)}
                      className="w-16 px-2 py-0.5 rounded-lg bg-app-surface-subtle border border-app-border text-xs font-bold text-app-text outline-none focus:border-app-primary"
                    />
                    <span className="text-[11px] text-app-text-muted">km</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    userCoords.latitude
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-app-surface-subtle text-app-text-secondary border-app-border hover:text-app-text'
                  }`}
                  title={userCoords.latitude ? `Lat: ${userCoords.latitude}, Lon: ${userCoords.longitude}` : "Click to detect location"}
                >
                  <MapPin size={12} className={isLocating ? 'animate-bounce' : ''} />
                  <span>{isLocating ? 'Locating...' : userCoords.latitude ? 'Location Active' : 'My Location'}</span>
                </button>

                <button
                  type="button"
                  onClick={fetchDiscoveredSuppliers}
                  className="px-3 py-1 bg-app-primary hover:bg-app-primary-hover text-white text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1"
                >
                  <RefreshCw size={12} className={discoveryLoading ? 'animate-spin' : ''} />
                  <span>Search</span>
                </button>
              </div>
            </div>
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

                            {['Partially Received', 'Received', 'Partially Returned'].includes(po.status) && (
                              <button
                                type="button"
                                onClick={() => openReturnModal(po)}
                                className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] transition-colors shadow-2xs"
                                title="Return Goods to Supplier"
                              >
                                Return
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
      ) : activeTab === 'requests' ? (
        /* TAB: PURCHASE REQUESTS WORKSPACE */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
          {filteredPurchaseRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Send size={40} className="mx-auto text-app-text-muted mb-2" />
              <h3 className="font-bold text-sm text-app-text">No purchase requests found</h3>
              <p className="text-xs text-app-text-muted mt-1">
                Create a draft request, or find nearby suppliers and request wholesale products.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPrForm(initialPrForm);
                    setShowAddPrModal(true);
                  }}
                  icon={<Plus size={14} />}
                >
                  Create Request
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('discover')}
                  icon={<Compass size={14} />}
                >
                  Find Suppliers
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                    <th className="py-3 px-4">Request #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Requested Date</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Est. Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredPurchaseRequests.map(pr => {
                    const statusObj = getPrStatusBadge(pr.status);
                    const estAmount = (pr.items || []).reduce((acc, item) => {
                      return acc + (Number(item.requested_quantity || 0) * Number(item.requested_price || 0));
                    }, 0);

                    return (
                      <tr
                        key={pr.id}
                        className="hover:bg-app-surface-subtle/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedPr(pr)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-app-text">
                          {pr.request_number}
                        </td>
                        <td className="py-3 px-4 font-bold text-app-text">
                          {pr.supplier?.name || 'Supplier'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-app-text-secondary">
                          {new Date(pr.requested_at || pr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-app-text">
                          {(pr.items || []).length || pr.item_count || 1}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-app-text">
                          {estAmount > 0 ? `₹${estAmount.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusObj.bg}`}>
                            {statusObj.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {pr.status === 'draft' && (
                              <button
                                type="button"
                                onClick={() => handleSendPr(pr.id)}
                                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] transition-colors shadow-2xs"
                                title="Send Request to Supplier"
                              >
                                Send
                              </button>
                            )}

                            {['draft', 'sent'].includes(pr.status) && (
                              <button
                                type="button"
                                onClick={() => handleCancelPr(pr.id)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold text-[11px] border border-rose-200 dark:border-rose-900 transition-colors"
                                title="Cancel Request"
                              >
                                Cancel
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedPr(pr)}
                              className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-primary hover:bg-app-surface-subtle transition-colors"
                              title="View Request Details"
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
      ) : activeTab === 'incoming' ? (
        /* TAB: INCOMING PURCHASE REQUESTS (SUPPLIER WORKSPACE) */
        <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden shadow-xs">
          {filteredIncomingRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox size={40} className="mx-auto text-app-text-muted mb-2" />
              <h3 className="font-bold text-sm text-app-text">No incoming purchase requests</h3>
              <p className="text-xs text-app-text-muted mt-1 max-w-md mx-auto">
                When retail store buyers place purchase inquiries or orders with your wholesale supplier account, they will appear here. You can review requirements, adjust quantities, send counter-quotes, and generate official sales invoices.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                    <th className="py-3 px-4">Request #</th>
                    <th className="py-3 px-4">Buyer Store & Contact</th>
                    <th className="py-3 px-4">Destination Supplier</th>
                    <th className="py-3 px-4">Requested Date</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center w-56">Supplier Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredIncomingRequests.map(pr => {
                    const statusObj = getPrStatusBadge(pr.status);
                    const hasInvoice = pr.notes?.includes('[INVOICE_ID:') || pr.status === 'completed';
                    const invoiceNo = pr.notes?.match(/\[INVOICE_NO:([^\]]+)\]/)?.[1];

                    return (
                      <tr
                        key={pr.id}
                        className="hover:bg-app-surface-subtle/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedPr(pr)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-app-text">
                          {pr.request_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-app-text">{pr.buyer?.business_name || pr.buyer?.name || 'Store Buyer'}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted mt-0.5">
                            {pr.buyer?.name && <span>{pr.buyer.name}</span>}
                            {pr.buyer?.phone && <span>• {pr.buyer.phone}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-app-text-secondary">
                          {pr.supplier?.name || 'Your Supplier'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-app-text-secondary">
                          {new Date(pr.requested_at || pr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-app-text">
                          {(pr.items || []).length || pr.items_count || 1}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusObj.bg}`}>
                            {statusObj.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {pr.status === 'sent' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPr(pr);
                                  handleStartResponding(pr);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Respond with counter-offer or adjustments"
                              >
                                <Edit size={11} /> Respond
                              </button>
                            )}

                            {(pr.status === 'accepted' || pr.status === 'completed') && (
                              hasInvoice ? (
                                <button
                                  type="button"
                                  onClick={() => navigate('/invoices')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                  title="View invoice in Sales/Khata"
                                >
                                  <Receipt size={11} /> {invoiceNo || 'Invoiced'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleGenerateInvoice(pr.id)}
                                  disabled={isGeneratingInvoice}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                                  title="Generate Sales Invoice / Bill"
                                >
                                  <Receipt size={11} /> Make Invoice
                                </button>
                              )
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedPr(pr)}
                              className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-primary hover:bg-app-surface-subtle transition-colors cursor-pointer"
                              title="View Request Details"
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
      ) : activeTab === 'reorder' ? (
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
      ) : (
        /* TAB 4: FIND SUPPLIERS WORKSPACE */
        <div className="space-y-4">
          {/* Discovery Banner */}
          <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-panel text-xs text-sky-900 dark:text-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Compass className="text-sky-600 dark:text-sky-400 shrink-0" size={20} />
              <div>
                <span className="font-bold text-sm block">Supplier Discovery Hub</span>
                <span className="text-[11px] text-sky-800 dark:text-sky-300">
                  Find verified wholesale suppliers nearby, explore real-time catalogs, and initiate purchase orders directly.
                </span>
              </div>
            </div>
            {userCoords.latitude && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 shrink-0">
                <MapPin size={11} /> Distance active ({userCoords.latitude}, {userCoords.longitude})
              </span>
            )}
          </div>

          {/* Results Grid */}
          {discoveryLoading ? (
            <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel space-y-3">
              <RefreshCw className="animate-spin text-sky-600 mx-auto" size={28} />
              <p className="text-xs font-bold text-app-text">Searching nearby suppliers & catalogs...</p>
            </div>
          ) : discoveredSuppliers.length === 0 ? (
            <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel">
              <Compass size={40} className="mx-auto text-app-text-muted mb-2" />
              <h3 className="font-bold text-sm text-app-text">No discoverable suppliers found</h3>
              <p className="text-xs text-app-text-muted mt-1">
                Try widening your search radius, changing keywords, or removing city filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoveredSuppliers.map(supplier => (
                <div
                  key={supplier.id}
                  className="p-4 bg-app-surface border border-app-border rounded-panel shadow-xs flex flex-col justify-between hover:border-sky-500/40 transition-all"
                >
                  <div>
                    {/* Top Row: Name, Category, Distance */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-sm text-app-text leading-tight">{supplier.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {supplier.category && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-app-primary/10 text-app-primary">
                              {supplier.category}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-200">
                            Verified Partner
                          </span>
                        </div>
                      </div>

                      {supplier.distance_km !== null && supplier.distance_km !== undefined ? (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-300 whitespace-nowrap">
                          📍 {supplier.distance_km} km
                        </span>
                      ) : (
                        supplier.city && (
                          <span className="text-[10px] font-bold text-app-text-muted">
                            {supplier.city}
                          </span>
                        )
                      )}
                    </div>

                    {/* Location & Contact */}
                    <div className="space-y-1 text-xs text-app-text-secondary mt-2 mb-3">
                      {(supplier.city || supplier.state) && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <MapPin size={12} className="text-app-text-muted shrink-0" />
                          <span className="truncate">
                            {[supplier.address, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Phone size={12} className="text-app-text-muted shrink-0" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.payment_terms && (
                        <div className="text-[10px] text-app-text-muted font-semibold">
                          Terms: {supplier.payment_terms}
                        </div>
                      )}
                    </div>

                    {/* Products Preview */}
                    <div className="border-t border-app-border pt-2.5 mt-2">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold uppercase text-app-text-muted">Published Catalog</span>
                        <span className="text-[10px] font-mono text-app-text-muted">{(supplier.products || []).length} products</span>
                      </div>

                      {(supplier.products || []).length === 0 ? (
                        <p className="text-[11px] text-app-text-muted italic py-1">Inquire for product listings.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                          {(supplier.products || []).slice(0, 3).map((prod, pIdx) => (
                            <div
                              key={pIdx}
                              className="p-2 bg-app-surface-subtle border border-app-border/70 rounded-lg flex items-center justify-between text-xs"
                            >
                              <div className="truncate mr-2">
                                <span className="font-bold text-app-text block truncate">{prod.product_name}</span>
                                <div className="flex items-center gap-1 text-[10px] text-app-text-muted">
                                  {prod.sku && <span>SKU: {prod.sku}</span>}
                                  {prod.min_order_quantity > 1 && <span>• MOQ: {prod.min_order_quantity}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                {prod.price !== null && prod.price !== undefined ? (
                                  <span className="font-black font-mono text-app-text block">
                                    ₹{Number(prod.price).toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-app-text-muted block">Contact for price</span>
                                )}
                                {prod.available_quantity !== null && prod.available_quantity !== undefined ? (
                                  <span className="text-[9px] font-bold text-emerald-600 block">
                                    {prod.available_quantity} {prod.unit || 'pcs'} in stock
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-app-text-muted block">Contact for qty</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {(supplier.products || []).length > 3 && (
                            <div className="text-center pt-0.5">
                              <button
                                type="button"
                                onClick={() => setSelectedDiscoveredSupplier(supplier)}
                                className="text-[10px] font-bold text-sky-600 hover:underline"
                              >
                                + {(supplier.products || []).length - 3} more items in catalog
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-app-border flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDiscoveredSupplier(supplier)}
                      icon={<Eye size={13} />}
                      className="text-xs"
                    >
                      Details
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCreatePr(supplier)}
                      icon={<Send size={13} />}
                      className="text-xs font-bold flex-1 text-sky-600 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                    >
                      Request
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleChooseSupplier(supplier)}
                      icon={<Plus size={13} />}
                      className="text-xs font-bold flex-1 bg-sky-600 hover:bg-sky-700 border-sky-600"
                    >
                      Order
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  
                  {supplierLedger?.purchaseOrders?.length > 0 || supplierLedger?.payments?.length > 0 || supplierLedger?.returns?.length > 0 ? (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {/* Combine POs, Payments, and Returns */}
                      {[
                        ...(supplierLedger.purchaseOrders || []).map(po => ({ type: 'purchase', date: po.created_at, title: `PO #${po.order_no}`, amount: Number(po.total_amount || 0), status: po.status })),
                        ...(supplierLedger.payments || []).map(pay => ({ type: 'payment', date: pay.created_at, title: `Payment (${pay.payment_method || 'Cash'})`, amount: Number(pay.amount || 0), ref: pay.ref_no })),
                        ...(supplierLedger.returns || []).map(ret => ({ type: 'return', date: ret.created_at, title: `Return #${ret.return_no || 'RET'} (${ret.reason || 'Goods Return'})`, amount: Number(ret.total_return_amount || 0), po_order_no: ret.purchase_orders?.order_no }))
                      ]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((tx, idx) => (
                          <div key={idx} className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-app-text">{tx.title}</p>
                              {tx.po_order_no && <span className="text-[10px] text-app-primary block font-mono">PO: {tx.po_order_no}</span>}
                              <span className="text-[10px] font-mono text-app-text-muted">
                                {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono font-black ${
                                tx.type === 'purchase' ? 'text-rose-600' : tx.type === 'return' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                              }`}>
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

      {/* 6b. PURCHASE RETURN MODAL */}
      {showReturnModal && returningPo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-5 py-4 border-b border-app-border">
              <div className="flex items-center gap-2">
                <RotateCcw className="text-orange-500" size={18} />
                <h3 className="font-bold text-sm text-app-text">Return Goods to Supplier ({returningPo.order_no})</h3>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="p-1 text-app-text-muted hover:text-app-text">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecuteReturn} className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl space-y-1">
                <p className="font-bold text-app-text">Supplier: {returningPo.suppliers?.name || 'Vendor'}</p>
                <p className="text-[11px] text-app-text-secondary">PO Total: ₹{Number(returningPo.total_amount || 0).toLocaleString('en-IN')}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Reason for Return *</label>
                <select
                  value={returnForm.reason}
                  onChange={e => setReturnForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                >
                  <option value="Damaged">Damaged Goods</option>
                  <option value="Expired">Expired</option>
                  <option value="Wrong Product">Wrong Product Delivered</option>
                  <option value="Excess Quantity">Excess Quantity</option>
                  <option value="Rejected Goods">Rejected Goods</option>
                  <option value="Quality Issue">Quality Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Line items return selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-app-text-muted uppercase block">Select Return Quantities</label>
                {returnForm.items.length === 0 ? (
                  <p className="text-xs text-app-text-muted italic">No items with returnable quantities remaining.</p>
                ) : (
                  returnForm.items.map((item, idx) => (
                    <div key={item.purchase_order_item_id} className="p-2.5 bg-app-surface-subtle border border-app-border rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-app-text">{item.product_name}</span>
                        <span className="text-[10px] font-mono text-app-text-secondary">
                          Returnable: <strong>{item.returnable_quantity}</strong> (Rcvd: {item.received_quantity}, Ret: {item.returned_quantity})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max={item.returnable_quantity}
                          placeholder="Return Qty"
                          value={item.quantity}
                          onChange={e => {
                            const val = Math.min(item.returnable_quantity, Math.max(0, Number(e.target.value) || 0));
                            const updated = [...returnForm.items];
                            updated[idx] = { ...updated[idx], quantity: val };
                            setReturnForm(p => ({ ...p, items: updated }));
                          }}
                          className="w-28 bg-app-surface border border-app-border rounded-lg px-2.5 py-1 text-xs font-bold text-app-text outline-none text-center"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...returnForm.items];
                            updated[idx] = { ...updated[idx], quantity: item.returnable_quantity };
                            setReturnForm(p => ({ ...p, items: updated }));
                          }}
                          className="text-[10px] font-bold text-app-primary hover:underline"
                        >
                          Return All ({item.returnable_quantity})
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">Return Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 5 boxes returned due to packaging breach..."
                  value={returnForm.notes}
                  onChange={e => setReturnForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl p-2.5 text-xs text-app-text outline-none focus:border-app-primary resize-none"
                />
              </div>

              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[11px] text-orange-800 dark:text-orange-300">
                ⚡ Processing this return will atomically reduce inventory stock batches and decrement supplier outstanding payable.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowReturnModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  type="submit" 
                  disabled={isSubmittingReturn || returnForm.items.every(i => Number(i.quantity) <= 0)}
                  className="font-bold bg-orange-600 hover:bg-orange-700"
                >
                  {isSubmittingReturn ? "Processing..." : "Confirm Purchase Return"}
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

      {/* 10. DISCOVERED SUPPLIER DETAILS MODAL */}
      {selectedDiscoveredSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-app-border bg-app-surface-subtle">
              <div className="flex items-center gap-2.5">
                <Compass className="text-sky-600" size={20} />
                <div>
                  <h3 className="font-black text-base text-app-text leading-tight">{selectedDiscoveredSupplier.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-app-text-muted mt-0.5">
                    {selectedDiscoveredSupplier.category && <span>{selectedDiscoveredSupplier.category}</span>}
                    {selectedDiscoveredSupplier.distance_km && <span>• 📍 {selectedDiscoveredSupplier.distance_km} km away</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedDiscoveredSupplier(null)} className="p-1.5 text-app-text-muted hover:text-app-text">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl">
                  <span className="text-[10px] font-bold text-app-text-muted uppercase block">Contact Information</span>
                  <p className="font-semibold text-app-text mt-1">{selectedDiscoveredSupplier.phone || 'Phone not listed'}</p>
                  {selectedDiscoveredSupplier.email && <p className="text-app-text-secondary">{selectedDiscoveredSupplier.email}</p>}
                </div>
                <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl">
                  <span className="text-[10px] font-bold text-app-text-muted uppercase block">Location & Terms</span>
                  <p className="font-semibold text-app-text mt-1">{[selectedDiscoveredSupplier.address, selectedDiscoveredSupplier.city, selectedDiscoveredSupplier.state, selectedDiscoveredSupplier.pincode].filter(Boolean).join(', ') || 'Location on file'}</p>
                  <p className="text-app-text-secondary">Terms: {selectedDiscoveredSupplier.payment_terms || '30 Days'}</p>
                </div>
              </div>

              {selectedDiscoveredSupplier.description && (
                <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl text-xs">
                  <span className="text-[10px] font-bold text-app-text-muted uppercase block mb-1">About Supplier</span>
                  <p className="text-app-text-secondary leading-relaxed">{selectedDiscoveredSupplier.description}</p>
                </div>
              )}

              <div>
                <h4 className="font-bold text-xs text-app-text mb-2">Available Products & Published Pricing</h4>
                {(selectedDiscoveredSupplier.products || []).length === 0 ? (
                  <p className="text-xs text-app-text-muted italic">No products listed in catalog. Contact supplier directly.</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedDiscoveredSupplier.products || []).map((prod, idx) => (
                      <div key={idx} className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-app-text">{prod.product_name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-app-text-muted mt-0.5">
                            {prod.sku && <span>SKU: {prod.sku}</span>}
                            {prod.category && <span>Category: {prod.category}</span>}
                            <span>MOQ: {prod.min_order_quantity || 1} {prod.unit || 'pcs'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {prod.price !== null && prod.price !== undefined ? (
                              <span className="font-black font-mono text-app-text block">₹{Number(prod.price).toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-[10px] text-app-text-muted block">Contact for price</span>
                            )}
                            {prod.available_quantity !== null && prod.available_quantity !== undefined ? (
                              <span className="text-[10px] font-bold text-emerald-600 block">{prod.available_quantity} {prod.unit || 'pcs'}</span>
                            ) : (
                              <span className="text-[10px] text-app-text-muted block">Contact for stock</span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const s = selectedDiscoveredSupplier;
                              setSelectedDiscoveredSupplier(null);
                              handleOpenCreatePr(s, prod);
                            }}
                            className="text-xs font-bold text-sky-600 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                          >
                            Request
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleChooseSupplier(selectedDiscoveredSupplier, prod)}
                            className="text-xs font-bold bg-sky-600 hover:bg-sky-700"
                          >
                            Order
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-app-border bg-app-surface-subtle flex justify-end gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setSelectedDiscoveredSupplier(null)}>
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const s = selectedDiscoveredSupplier;
                  setSelectedDiscoveredSupplier(null);
                  handleOpenCreatePr(s);
                }}
                icon={<Send size={13} />}
                className="text-sky-600 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30 font-bold"
              >
                Send Request
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleChooseSupplier(selectedDiscoveredSupplier)}
                className="bg-sky-600 hover:bg-sky-700 font-bold"
              >
                Choose Supplier (Create PO)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 11. CREATE PURCHASE REQUEST MODAL — MULTI-PRODUCT VENDOR SELECTION */}
      {showAddPrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-app-border bg-app-surface-subtle">
              <div className="flex items-center gap-2.5">
                <Send className="text-sky-600" size={20} />
                <div>
                  <h3 className="font-black text-base text-app-text">Create Purchase Request</h3>
                  <p className="text-xs text-app-text-muted">Search vendor products, add multiple items, and send purchase inquiry</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddPrModal(false);
                  setPrForm(initialPrForm);
                  setPrProductSearch('');
                }} 
                className="p-1.5 text-app-text-muted hover:text-app-text cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Supplier Selection & Status Bar */}
              <div className="p-4 bg-app-surface-subtle border border-app-border rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-app-text uppercase tracking-wider">
                    Select Target Supplier / Vendor *
                  </label>
                  {prForm.supplier_id && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      ✓ Connected Vendor in Directory
                    </span>
                  )}
                </div>

                {prForm.supplier_name && !suppliers.some(s => s.id === prForm.supplier_id) ? (
                  <div className="p-2.5 bg-app-surface border border-app-border rounded-lg text-xs font-bold text-app-text flex items-center justify-between">
                    <span>{prForm.supplier_name} (Discovered Wholesale Vendor)</span>
                    <span className="text-[10px] text-sky-600 font-normal">Catalog Inquiry</span>
                  </div>
                ) : (
                  <select
                    value={prForm.supplier_id}
                    onChange={(e) => {
                      const supp = suppliers.find(s => s.id === e.target.value);
                      setPrForm(prev => ({
                        ...prev,
                        supplier_id: e.target.value,
                        supplier_name: supp?.name || ''
                      }));
                    }}
                    className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs font-bold text-app-text outline-none focus:border-app-primary"
                    required
                  >
                    <option value="">Select a Supplier from your Directory...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} • Phone: {s.phone || 'N/A'} • Credit: ₹{Number(s.credit_limit || 0).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Vendor Product Search & Multi-Add Picker */}
              <div className="space-y-2.5">
                {!prForm.supplier_id ? (
                  <div className="p-6 bg-app-surface-subtle border border-app-border rounded-xl text-center space-y-1.5">
                    <Truck className="mx-auto text-app-text-muted mb-1 opacity-60" size={32} />
                    <p className="text-xs font-bold text-app-text">Select a Target Supplier Above</p>
                    <p className="text-[11px] text-app-text-muted max-w-sm mx-auto">
                      Please select a vendor first to browse the wholesale catalog and products supplied by that vendor.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-app-text uppercase tracking-wider flex items-center gap-1.5">
                          <span>Browse {prForm.supplier_name || 'Vendor'}'s Catalog</span>
                          <span className="text-[10px] text-app-text-muted font-normal lowercase font-mono">
                            ({filteredCatalogForPr.length} available)
                          </span>
                        </h4>
                        <p className="text-[11px] text-app-text-muted">
                          Click "+ Add" on vendor products below to quickly add them to your purchase request
                        </p>
                      </div>
                      
                      {/* Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 text-app-text-muted" size={13} />
                        <input
                          type="text"
                          placeholder="Search vendor products by name, SKU, brand..."
                          value={prProductSearch}
                          onChange={(e) => setPrProductSearch(e.target.value)}
                          className="w-full bg-app-surface-subtle border border-app-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-app-text outline-none focus:border-app-primary shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Available Products Quick Pick Grid */}
                    {loadingSupplierProducts ? (
                      <div className="p-8 text-center text-xs text-app-text-muted flex items-center justify-center gap-2 border border-app-border/80 rounded-xl bg-app-surface-subtle/50">
                        <RefreshCw className="animate-spin text-app-primary" size={16} />
                        <span>Loading {prForm.supplier_name}'s product catalog...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-app-border/80 rounded-xl bg-app-surface-subtle/50">
                        {filteredCatalogForPr.length === 0 ? (
                          <div className="col-span-full py-6 text-center text-xs text-app-text-muted">
                            {prProductSearch ? `No vendor products found matching "${prProductSearch}".` : `No pre-cataloged products found for ${prForm.supplier_name}. You can add custom items below.`}
                          </div>
                        ) : (
                          filteredCatalogForPr.map((p) => {
                            const prodName = p.product_name || p.name || '';
                            const prodSku = p.sku || '';
                            const prodPrice = p.price !== null && p.price !== undefined ? Number(p.price) : (p.cost_price != null ? Number(p.cost_price) : 0);
                            const prodStock = p.available_quantity !== null && p.available_quantity !== undefined ? p.available_quantity : null;
                            const prodUnit = p.unit || p.units || 'pcs';

                            const existing = prForm.items.find(i => 
                              (prodSku && i.sku && i.sku === prodSku) || 
                              (prodName && i.product_name && i.product_name.toLowerCase() === prodName.toLowerCase())
                            );

                            return (
                              <div key={p.id} className="p-2.5 bg-app-surface border border-app-border rounded-xl flex items-center justify-between gap-2 hover:border-app-primary/40 transition-colors shadow-2xs">
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-xs text-app-text truncate" title={prodName}>{prodName}</p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted mt-0.5">
                                    {(p.brand || p.company || p.category) && (
                                      <span className="font-semibold text-app-text-secondary">{p.brand || p.company || p.category}</span>
                                    )}
                                    {prodSku && <span>• {prodSku}</span>}
                                    {prodPrice > 0 && <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">• ₹{prodPrice}/{prodUnit}</span>}
                                    {prodStock !== null && <span>• Stock: {prodStock}</span>}
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {existing ? (
                                    <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-0.5">
                                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-1.5">
                                        {existing.requested_quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAddProductToPr(p)}
                                        className="w-5 h-5 flex items-center justify-center rounded bg-app-surface text-app-text font-bold text-xs hover:bg-app-hover cursor-pointer"
                                        title="Add one more"
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAddProductToPr(p)}
                                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus size={11} /> Add
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setPrForm(prev => ({
                            ...prev,
                            items: [
                              ...prev.items,
                              {
                                supplier_product_id: null,
                                product_name: '',
                                sku: '',
                                requested_quantity: 1,
                                requested_unit: 'pcs',
                                requested_price: ''
                              }
                            ]
                          }));
                        }}
                        className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} /> + Add Custom / Unlisted Product
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Selected Items Table (Order Form) */}
              <div className="space-y-2 border-t border-app-border pt-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-app-text uppercase tracking-wider flex items-center gap-2">
                    <span>Selected Items in Request</span>
                    <Badge variant="blue" className="text-[10px] font-mono font-bold">
                      {prForm.items.filter(i => i.product_name?.trim()).length} Items
                    </Badge>
                  </h4>
                  <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                    Est. Total: ₹{prTotalEstAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {prForm.items.length === 0 || !prForm.items.some(i => i.product_name?.trim()) ? (
                  <div className="p-6 bg-app-surface-subtle border border-dashed border-app-border rounded-xl text-center text-xs text-app-text-muted">
                    No products added yet. Click <strong>"+ Add"</strong> on products above or add a custom item row.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prForm.items.map((item, idx) => {
                      const itemSubtotal = (Number(item.requested_quantity || 0) * Number(item.requested_price || 0));

                      return (
                        <div key={idx} className="p-3 bg-app-surface-subtle border border-app-border rounded-xl space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            
                            {/* Product Name */}
                            <div className="sm:col-span-5">
                              <label className="text-[9px] font-bold text-app-text-muted uppercase block mb-0.5">Product Name *</label>
                              <input
                                type="text"
                                placeholder="Product Name"
                                value={item.product_name}
                                onChange={(e) => {
                                  const updated = [...prForm.items];
                                  updated[idx].product_name = e.target.value;
                                  setPrForm({ ...prForm, items: updated });
                                }}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-app-text outline-none focus:border-app-primary"
                                required
                              />
                            </div>

                            {/* Qty */}
                            <div className="sm:col-span-2">
                              <label className="text-[9px] font-bold text-app-text-muted uppercase block mb-0.5">Qty *</label>
                              <input
                                type="number"
                                min="1"
                                value={item.requested_quantity}
                                onChange={(e) => {
                                  const updated = [...prForm.items];
                                  updated[idx].requested_quantity = Math.max(1, parseInt(e.target.value) || 1);
                                  setPrForm({ ...prForm, items: updated });
                                }}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-app-text outline-none focus:border-app-primary text-center"
                                required
                              />
                            </div>

                            {/* Unit */}
                            <div className="sm:col-span-2">
                              <label className="text-[9px] font-bold text-app-text-muted uppercase block mb-0.5">Unit</label>
                              <input
                                type="text"
                                placeholder="pcs, kg, box"
                                value={item.requested_unit}
                                onChange={(e) => {
                                  const updated = [...prForm.items];
                                  updated[idx].requested_unit = e.target.value;
                                  setPrForm({ ...prForm, items: updated });
                                }}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-app-primary text-center"
                              />
                            </div>

                            {/* Target Price */}
                            <div className="sm:col-span-2">
                              <label className="text-[9px] font-bold text-app-text-muted uppercase block mb-0.5">Target Price (₹)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Rate"
                                value={item.requested_price}
                                onChange={(e) => {
                                  const updated = [...prForm.items];
                                  updated[idx].requested_price = e.target.value;
                                  setPrForm({ ...prForm, items: updated });
                                }}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-app-text outline-none focus:border-app-primary text-right"
                              />
                            </div>

                            {/* Remove */}
                            <div className="sm:col-span-1 flex justify-end items-end pt-3 sm:pt-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = prForm.items.filter((_, i) => i !== idx);
                                  setPrForm({ ...prForm, items: updated });
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Line Subtotal */}
                          {itemSubtotal > 0 && (
                            <div className="flex justify-end text-[10px] font-mono text-app-text-muted pr-1">
                              Subtotal: <span className="font-bold text-app-text ml-1">₹{itemSubtotal.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-app-text-secondary uppercase mb-1">
                  Notes / Delivery Instructions
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Need delivery by Friday, please quote with shipping charges..."
                  value={prForm.notes}
                  onChange={(e) => setPrForm({ ...prForm, notes: e.target.value })}
                  className="w-full bg-app-surface-subtle border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-app-primary"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-app-border bg-app-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-app-text-muted">Estimated Total Value:</span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{prTotalEstAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setShowAddPrModal(false);
                    setPrForm(initialPrForm);
                    setPrProductSearch('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={isSubmittingPr}
                  onClick={() => handleSubmitPr('draft')}
                  className="font-bold"
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  disabled={isSubmittingPr}
                  onClick={() => handleSubmitPr('sent')}
                  icon={<Send size={13} />}
                  className="font-bold bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-600/20"
                >
                  {isSubmittingPr ? 'Sending...' : 'Send Purchase Request 🚀'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. PURCHASE REQUEST DETAILS MODAL */}
      {selectedPr && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-app-border bg-app-surface-subtle">
              <div className="flex items-center gap-2.5">
                <Send className="text-sky-600" size={20} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono font-black text-base text-app-text">{selectedPr.request_number}</h3>
                    {(() => {
                      const badge = getPrStatusBadge(selectedPr.status);
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-app-text-muted">
                    Requested on {new Date(selectedPr.requested_at || selectedPr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedPr(null)} 
                className="p-1.5 text-app-text-muted hover:text-app-text"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Buyer / Supplier & Store Info */}
              {(() => {
                const isIncomingPr = incomingRequests.some(r => r.id === selectedPr.id) || selectedPr.buyer;
                const hasInvoice = selectedPr.notes?.includes('[INVOICE_ID:') || selectedPr.invoice_no;
                const invoiceNo = selectedPr.notes?.match(/\[INVOICE_NO:([^\]]+)\]/)?.[1] || selectedPr.invoice_no;

                return (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {isIncomingPr && selectedPr.buyer ? (
                        <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl">
                          <span className="text-[10px] font-bold text-app-text-muted uppercase block">Ordering Store & Buyer</span>
                          <p className="font-bold text-app-text mt-1">{selectedPr.buyer.business_name || selectedPr.buyer.name || 'Store Buyer'}</p>
                          {selectedPr.buyer.name && <p className="text-app-text-secondary">{selectedPr.buyer.name}</p>}
                          {selectedPr.buyer.phone && <p className="text-app-text-muted text-[11px]">📞 {selectedPr.buyer.phone}</p>}
                          {selectedPr.buyer.email && <p className="text-app-text-muted text-[11px]">✉️ {selectedPr.buyer.email}</p>}
                        </div>
                      ) : (
                        <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl">
                          <span className="text-[10px] font-bold text-app-text-muted uppercase block">Target Supplier</span>
                          <p className="font-bold text-app-text mt-1">{selectedPr.supplier?.name || 'Supplier'}</p>
                          {selectedPr.supplier?.phone && <p className="text-app-text-secondary">{selectedPr.supplier.phone}</p>}
                          {selectedPr.supplier?.address && <p className="text-app-text-muted text-[11px]">{selectedPr.supplier.address}</p>}
                        </div>
                      )}

                      <div className="p-3 bg-app-surface-subtle border border-app-border rounded-xl">
                        <span className="text-[10px] font-bold text-app-text-muted uppercase block">
                          {isIncomingPr ? "Fulfilling Supplier Account" : "Destination Store"}
                        </span>
                        <p className="font-bold text-app-text mt-1">
                          {isIncomingPr ? (selectedPr.supplier?.name || 'Your Supplier Business') : (selectedPr.store?.name || activeStore?.name || 'Main Branch')}
                        </p>
                        {selectedPr.notes && (
                          <p className="text-app-text-secondary mt-1 text-[11px] italic">
                            Notes: "{selectedPr.notes.replace(/\[INVOICE_[^\]]+\]/g, '').trim()}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Official Sales Invoice Banner if already invoiced */}
                    {hasInvoice && (
                      <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <p className="font-bold text-emerald-800 dark:text-emerald-300">
                              Official Sales Invoice Generated: {invoiceNo || 'INV Confirmed'}
                            </p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                              Order billed and synced to Sales History & Customer Khata ledger.
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/invoices')}
                          icon={<ExternalLink size={12} />}
                          className="text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold"
                        >
                          View Invoices
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Supplier Response & Offer Comparison (Phase 9) */}
              {selectedPr.latest_response && (
                <div className="p-4 rounded-xl border border-app-border bg-app-surface-subtle/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-app-text-secondary">
                        Supplier Response:
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPrStatusBadge(selectedPr.latest_response.status).bg}`}>
                        {getPrStatusBadge(selectedPr.latest_response.status).label}
                      </span>
                    </div>
                    {selectedPr.latest_response.responded_at && (
                      <span className="text-[10px] text-app-text-muted">
                        Responded: {new Date(selectedPr.latest_response.responded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {selectedPr.latest_response.notes && (
                    <div className="p-2.5 rounded-lg bg-app-surface border border-app-border text-xs text-app-text">
                      <span className="font-bold text-app-text-secondary text-[11px]">Supplier Notes: </span>
                      "{selectedPr.latest_response.notes}"
                    </div>
                  )}

                  {/* Counter Offer Comparison Table */}
                  {selectedPr.latest_response.status === 'countered' && (
                    <div>
                      <h5 className="font-bold text-[11px] text-amber-700 dark:text-amber-400 mb-1.5 uppercase tracking-wide">
                        Side-by-Side Offer Comparison
                      </h5>
                      <div className="border border-app-border rounded-lg overflow-hidden bg-app-surface">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                              <th className="py-2 px-2.5">Item</th>
                              <th className="py-2 px-2.5 text-center">Requested Qty</th>
                              <th className="py-2 px-2.5 text-center bg-amber-500/10 text-amber-700 dark:text-amber-300">Offered Qty</th>
                              <th className="py-2 px-2.5 text-right">Target Price</th>
                              <th className="py-2 px-2.5 text-right bg-amber-500/10 text-amber-700 dark:text-amber-300">Offered Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-app-border">
                            {(selectedPr.latest_response.items || []).map((ri, rIdx) => (
                              <tr key={rIdx} className="hover:bg-app-surface-subtle/40">
                                <td className="py-2 px-2.5 font-bold text-app-text">{ri.product_name}</td>
                                <td className="py-2 px-2.5 text-center font-mono text-app-text-secondary">
                                  {ri.requested_quantity} {ri.unit || 'pcs'}
                                </td>
                                <td className="py-2 px-2.5 text-center font-mono font-bold bg-amber-500/5 text-amber-800 dark:text-amber-300">
                                  {ri.offered_quantity} {ri.unit || 'pcs'}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono text-app-text-secondary">
                                  {ri.requested_price ? `₹${Number(ri.requested_price).toFixed(2)}` : '—'}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-bold bg-amber-500/5 text-amber-800 dark:text-amber-300">
                                  ₹{Number(ri.offered_price || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Supplier Response & Counter-Offer Interactive Editor */}
              {isResponding ? (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Edit size={13} />
                        <span>Supplier Fulfillment & Counter-Offer Editor</span>
                      </h4>
                      <p className="text-[11px] text-app-text-muted mt-0.5">
                        Adjust available quantities, edit prices, or remove out-of-stock items before responding.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsResponding(false)}
                      className="text-xs text-app-text-muted hover:text-app-text underline cursor-pointer"
                    >
                      Cancel Editing
                    </button>
                  </div>

                  {/* Editable Line Items */}
                  <div className="space-y-2">
                    {responseItems.map((item, idx) => {
                      const isRemoved = Number(item.offered_quantity) === 0;

                      return (
                        <div key={idx} className={`p-3 rounded-xl border transition-colors ${isRemoved ? 'bg-rose-500/5 border-rose-500/30' : 'bg-app-surface border-app-border'}`}>
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            
                            <div className="sm:col-span-4">
                              <p className={`font-bold text-xs ${isRemoved ? 'line-through text-rose-500' : 'text-app-text'}`}>
                                {item.product_name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-app-text-muted mt-0.5">
                                <span>Requested: {item.requested_quantity} {item.requested_unit || 'pcs'}</span>
                                {item.requested_price && <span>• Target: ₹{Number(item.requested_price).toFixed(2)}</span>}
                              </div>
                            </div>

                            {/* Offered Qty with Increment/Decrement */}
                            <div className="sm:col-span-3">
                              <label className="text-[9px] font-bold text-app-text-muted uppercase block mb-0.5">Available / Offered Qty</label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...responseItems];
                                    updated[idx].offered_quantity = Math.max(0, Number(updated[idx].offered_quantity || 0) - 1);
                                    setResponseItems(updated);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-app-surface-subtle hover:bg-app-hover border border-app-border text-app-text font-black text-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.offered_quantity}
                                  onChange={(e) => {
                                    const updated = [...responseItems];
                                    updated[idx].offered_quantity = Math.max(0, parseInt(e.target.value) || 0);
                                    setResponseItems(updated);
                                  }}
                                  className="w-16 bg-app-surface border border-app-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-center text-app-text outline-none focus:border-app-primary"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...responseItems];
                                    updated[idx].offered_quantity = Number(updated[idx].offered_quantity || 0) + 1;
                                    setResponseItems(updated);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-app-surface-subtle hover:bg-app-hover border border-app-border text-app-text font-black text-xs cursor-pointer"
                                >
                                  +
                                </button>
                                <span className="text-[10px] text-app-text-muted ml-1">{item.requested_unit || 'pcs'}</span>
                              </div>
                            </div>

                            {/* Offered Price */}
                            <div className="sm:col-span-3">
                              <label className="text-[9px] font-bold text-app-text-muted uppercase block mb-0.5">Offered Rate (₹)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={item.requested_price ? `₹${item.requested_price}` : 'Rate'}
                                value={item.offered_price}
                                onChange={(e) => {
                                  const updated = [...responseItems];
                                  updated[idx].offered_price = e.target.value;
                                  setResponseItems(updated);
                                }}
                                className="w-full bg-app-surface border border-app-border rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-app-text outline-none focus:border-app-primary text-right"
                              />
                            </div>

                            {/* Quick Action: Mark Unavailable / Restore */}
                            <div className="sm:col-span-2 flex justify-end items-center">
                              {isRemoved ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...responseItems];
                                    updated[idx].offered_quantity = item.requested_quantity || 1;
                                    setResponseItems(updated);
                                  }}
                                  className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                                >
                                  + Restore Item
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...responseItems];
                                    updated[idx].offered_quantity = 0;
                                    setResponseItems(updated);
                                  }}
                                  className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                  title="Mark as out of stock / omit from order"
                                >
                                  Remove (0 Qty)
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Supplier Notes */}
                  <div>
                    <label className="block text-[10px] font-bold text-app-text-muted uppercase mb-1">
                      Supplier Response Notes / Terms
                    </label>
                    <textarea
                      rows="2"
                      placeholder="e.g. Only 30 units available in warehouse today, rate revised to ₹29 due to transport."
                      value={responseNotes}
                      onChange={(e) => setResponseNotes(e.target.value)}
                      className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs text-app-text outline-none focus:border-app-primary"
                    />
                  </div>

                  {/* Response Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRespondToPr('reject')}
                      className="text-rose-600 border-rose-300 hover:bg-rose-50 text-xs font-bold"
                    >
                      Decline Request
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRespondToPr('counter')}
                      className="font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs"
                    >
                      Send Counter-Offer 📋
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRespondToPr('accept')}
                      className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      Accept In Full ✓
                    </Button>
                  </div>
                </div>
              ) : (
                /* Items Snapshot Table */
                <div>
                  <h4 className="font-bold text-xs text-app-text mb-2 uppercase tracking-wide">
                    Item Requirements (Catalog Snapshots)
                  </h4>
                  <div className="border border-app-border rounded-xl overflow-hidden bg-app-surface">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Item Name</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3 text-center">Requested Qty</th>
                          <th className="py-2.5 px-3 text-right">Target Price</th>
                          <th className="py-2.5 px-3 text-right">Est. Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-app-border">
                        {(selectedPr.items || []).map((item, idx) => {
                          const price = Number(item.requested_price || 0);
                          const qty = Number(item.requested_quantity || 0);
                          const subtotal = price * qty;
                          return (
                            <tr key={idx} className="hover:bg-app-surface-subtle/40">
                              <td className="py-2.5 px-3 text-app-text-muted font-mono">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-app-text">{item.product_name}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-app-text-muted">{item.sku || '—'}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-app-text">
                                {qty} {item.requested_unit || 'pcs'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-app-text">
                                {price > 0 ? `₹${price.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-app-text">
                                {subtotal > 0 ? `₹${subtotal.toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-app-border bg-app-surface-subtle flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {['draft', 'sent'].includes(selectedPr.status) && !isResponding && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelPr(selectedPr.id)}
                    className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold"
                  >
                    Cancel Request
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSelectedPr(null); setIsResponding(false); }}>
                  Close
                </Button>

                {selectedPr.status === 'sent' && !isResponding && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartResponding(selectedPr)}
                    icon={<Edit size={13} />}
                    className="font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                  >
                    Respond & Counter-Offer (Edit Items) 📋
                  </Button>
                )}

                {selectedPr.status === 'draft' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSendPr(selectedPr.id)}
                    icon={<Send size={13} />}
                    className="font-bold bg-sky-600 hover:bg-sky-700"
                  >
                    Send to Supplier
                  </Button>
                )}

                {selectedPr.status === 'countered' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAcceptCounter(selectedPr.id)}
                    icon={<Check size={13} />}
                    className="font-bold bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Accept Counter Offer
                  </Button>
                )}

                {/* For Buyer: Convert to Purchase Order */}
                {selectedPr.status === 'accepted' && !incomingRequests.some(r => r.id === selectedPr.id) && !selectedPr.buyer && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCreatePoFromRequest(selectedPr.id)}
                    icon={<Plus size={13} />}
                    className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Convert to Purchase Order
                  </Button>
                )}

                {/* For Supplier: Make Invoice / Generate Bill */}
                {(selectedPr.status === 'accepted' || selectedPr.status === 'completed' || incomingRequests.some(r => r.id === selectedPr.id) || selectedPr.buyer) && (
                  (selectedPr.notes?.includes('[INVOICE_ID:') || selectedPr.invoice_no) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/invoices')}
                      icon={<Receipt size={13} />}
                      className="font-bold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50"
                    >
                      View Invoice ({selectedPr.notes?.match(/\[INVOICE_NO:([^\]]+)\]/)?.[1] || selectedPr.invoice_no || 'Invoiced'})
                    </Button>
                  ) : (selectedPr.status === 'accepted' || selectedPr.status === 'completed') ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleGenerateInvoice(selectedPr.id)}
                      disabled={isGeneratingInvoice}
                      icon={<Receipt size={13} />}
                      className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      {isGeneratingInvoice ? "Generating Invoice..." : "Make Invoice / Bill (बिल बनाएं) 🧾"}
                    </Button>
                  ) : null
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 13. HIDDEN PRINTABLE PURCHASE ORDER */}
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
