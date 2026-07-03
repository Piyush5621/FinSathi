import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import { 
  Users, Truck, FileText, Plus, Landmark, 
  RefreshCw, CheckCircle2, AlertTriangle, 
  ExternalLink, ChevronRight, X, ArrowLeft,
  Circle, Receipt, Trash2, Edit, Search, Trash, Printer, XCircle, MoreVertical
} from 'lucide-react';
import API from '../services/apiClient';
import toast from 'react-hot-toast';

export default function SupplierHub() {
  const [activeTab, setActiveTab] = useState('suppliers'); // 'suppliers' or 'orders'
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // PO Filters
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('');

  // Selected details
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierLedger, setSupplierLedger] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showAddPoModal, setShowAddPoModal] = useState(false);
  const [showEditPoModal, setShowEditPoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);

  // Form states
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', gstin: '', address: '', credit_limit: '' });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ supplier_id: '', amount: '', payment_method: 'Cash', ref_no: '' });
  
  const initialPoForm = {
    supplier_id: '',
    order_no: '',
    tax_amount: 0,
    discount_amount: 0,
    notes: '',
    items: [{ inventory_id: '', quantity: 1, cost_price: 0, gst_rate: 0, discount_amount: 0 }]
  };
  const [poForm, setPoForm] = useState(initialPoForm);
  const [editingPo, setEditingPo] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [activeTab, searchTerm, poSearchTerm, poStatusFilter]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [suppRes, invRes] = await Promise.all([
        API.get(`/suppliers${searchTerm ? `?search=${searchTerm}` : ''}`),
        API.get('/inventory')
      ]);
      setSuppliers(suppRes.data?.data || []);
      setProducts(invRes.data || []);

      if (activeTab === 'orders') {
        const queryParams = new URLSearchParams();
        if (poSearchTerm) queryParams.append('search', poSearchTerm);
        if (poStatusFilter) queryParams.append('status', poStatusFilter);
        const poRes = await API.get(`/purchase-orders?${queryParams.toString()}`);
        setPurchaseOrders(poRes.data?.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load supplier/inventory details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.name) return toast.error('Name is required');
    try {
      const res = await API.post('/suppliers', newSupplier);
      if (res.data?.success) {
        toast.success('Supplier added successfully!');
        setShowAddSupplierModal(false);
        setNewSupplier({ name: '', phone: '', gstin: '', address: '', credit_limit: '' });
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to add supplier');
    }
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    if (!editingSupplier.name) return toast.error('Name is required');
    try {
      const res = await API.put(`/suppliers/${editingSupplier.id}`, editingSupplier);
      if (res.data?.success) {
        toast.success('Supplier updated successfully!');
        setShowEditSupplierModal(false);
        setEditingSupplier(null);
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to update supplier');
    }
  };

  const handleDeleteSupplier = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) return;
    try {
      const res = await API.delete(`/suppliers/${id}`);
      if (res.data?.success) {
        toast.success('Supplier deleted successfully');
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to delete supplier');
    }
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (isSubmittingPo) return;
    if (!poForm.supplier_id || !poForm.order_no) {
      return toast.error('Please specify supplier and purchase order number');
    }
    
    const validItems = poForm.items.filter(i => i.inventory_id && i.quantity > 0);
    if (validItems.length === 0) {
      return toast.error('Please add at least one valid product');
    }

    try {
      setIsSubmittingPo(true);
      const res = await API.post('/purchase-orders', { ...poForm, items: validItems });
      if (res.data?.success) {
        toast.success('Purchase order created successfully!');
        setShowAddPoModal(false);
        setPoForm(initialPoForm);
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to create purchase order');
    } finally {
      setIsSubmittingPo(false);
    }
  };

  const handleUpdatePo = async (e) => {
    e.preventDefault();
    if (isSubmittingPo) return;
    if (!editingPo.supplier_id || !editingPo.order_no) {
      return toast.error('Please specify supplier and purchase order number');
    }
    
    const validItems = editingPo.items.filter(i => i.inventory_id && i.quantity > 0);
    if (validItems.length === 0) {
      return toast.error('Please add at least one valid product');
    }

    try {
      setIsSubmittingPo(true);
      const res = await API.put(`/purchase-orders/${editingPo.id}`, { ...editingPo, items: validItems });
      if (res.data?.success) {
        toast.success('Purchase order updated successfully!');
        setShowEditPoModal(false);
        setEditingPo(null);
        setSelectedPo(res.data.data); // update details view if open
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to update purchase order');
    } finally {
      setIsSubmittingPo(false);
    }
  };

  const handleDeletePo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Draft PO?')) return;
    try {
      const res = await API.delete(`/purchase-orders/${id}`);
      if (res.data?.success) {
        toast.success('Purchase order deleted successfully');
        setSelectedPo(null);
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to delete PO');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.supplier_id || !paymentForm.amount) {
      return toast.error('Supplier and amount are required');
    }
    try {
      const res = await API.post('/suppliers/payment', paymentForm);
      if (res.data?.success) {
        toast.success('Supplier payment logged successfully!');
        setShowPaymentModal(false);
        setPaymentForm({ supplier_id: '', amount: '', payment_method: 'Cash', ref_no: '' });
        fetchInitialData();
        if (selectedSupplier) viewSupplierLedger(selectedSupplier);
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to log payment');
    }
  };

  const viewSupplierLedger = async (supplier) => {
    setSelectedSupplier(supplier);
    try {
      const res = await API.get(`/suppliers/${supplier.id}/ledger`);
      setSupplierLedger(res.data?.data || { purchaseOrders: [], payments: [], stats: {} });
    } catch (err) {
      toast.error('Failed to load ledger log');
    }
  };

  const handleUpdatePoStatus = async (poId, status) => {
    if (status === 'Cancelled' && !window.confirm('Are you sure you want to cancel this PO?')) return;
    if (status === 'Received' && !window.confirm('Receiving this PO will permanently add to inventory and register an expense. Continue?')) return;
    
    try {
      const res = await API.patch(`/purchase-orders/${poId}/status`, { status });
      if (res.data?.success) {
        toast.success(`Purchase order status updated to ${status}`);
        fetchInitialData();
        const detailsRes = await API.get(`/purchase-orders/${poId}`);
        setSelectedPo(detailsRes.data?.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to update PO status');
    }
  };

  const viewPoDetails = async (po) => {
    try {
      const res = await API.get(`/purchase-orders/${po.id}`);
      setSelectedPo(res.data?.data);
    } catch (err) {
      toast.error('Failed to load PO details');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-700';
      case 'Sent': return 'bg-sky-100 text-sky-800';
      case 'Accepted': return 'bg-blue-100 text-blue-800';
      case 'Partially Received': return 'bg-orange-100 text-orange-800';
      case 'Received': return 'bg-teal-100 text-teal-800';
      case 'Completed': return 'bg-emerald-100 text-emerald-800';
      case 'Cancelled': return 'bg-rose-100 text-rose-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck size={26} className="text-indigo-600" />
            Supplier & Purchases Hub
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Track wholesale vendors, manage purchase orders, record cash settlements, and analyze supplier performance.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowPaymentModal(true)}
            variant="secondary"
            className="flex items-center gap-2 text-xs font-bold"
          >
            <Landmark size={14} /> Record Payment
          </Button>
          <Button
            onClick={() => setShowAddSupplierModal(true)}
            className="flex items-center gap-2 text-xs font-bold bg-slate-900 border-none hover:bg-slate-800 text-white"
          >
            <Plus size={14} /> Add Supplier
          </Button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row border-b border-slate-200 gap-6 justify-between items-start sm:items-center pb-2 print:hidden">
        <div className="flex gap-6">
          <button
            onClick={() => { setActiveTab('suppliers'); setSelectedSupplier(null); setSelectedPo(null); }}
            className={`pb-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'suppliers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            Suppliers Directory
          </button>
          <button
            onClick={() => { setActiveTab('orders'); setSelectedSupplier(null); setSelectedPo(null); }}
            className={`pb-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'orders' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            Purchase Orders
          </button>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          {activeTab === 'suppliers' && !selectedSupplier && (
            <div className="relative w-full sm:w-64 mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium placeholder-slate-400"
              />
            </div>
          )}
          {activeTab === 'orders' && !selectedPo && (
            <>
              <div className="relative w-full sm:w-48 mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search PO No..."
                  value={poSearchTerm}
                  onChange={(e) => setPoSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium placeholder-slate-400"
                />
              </div>
              <select
                value={poStatusFilter}
                onChange={(e) => setPoStatusFilter(e.target.value)}
                className="mb-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-medium text-slate-600"
              >
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Received">Received</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 print:hidden">
          <Skeleton height="80px" rounded="rounded-2xl" />
          <Skeleton height="300px" rounded="rounded-[24px]" />
        </div>
      ) : selectedSupplier ? (
        /* Supplier Ledger View */
        <div className="space-y-6 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedSupplier(null)} className="p-2">
              <ArrowLeft size={16} /> Back to Directory
            </Button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedSupplier.name}</h2>
              <p className="text-xs text-slate-500 font-semibold">{selectedSupplier.phone || 'No Phone'} | GSTIN: {selectedSupplier.gstin || 'None'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 border-slate-100 bg-white">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Outstanding Balance</span>
              <span className="text-2xl font-black text-rose-600 mt-2 block">₹{Number(selectedSupplier.outstanding_balance || 0).toLocaleString()}</span>
            </Card>
            <Card className="p-5 border-slate-100 bg-white">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Total Purchases</span>
              <span className="text-2xl font-black text-slate-900 mt-2 block">₹{Number(supplierLedger?.stats?.totalPurchases || 0).toLocaleString()}</span>
            </Card>
            <Card className="p-5 border-slate-100 bg-white">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Pending POs</span>
              <span className="text-2xl font-black text-indigo-600 mt-2 block">{supplierLedger?.stats?.pendingPOs || 0}</span>
            </Card>
            <Card className="p-5 border-slate-100 bg-white">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Completed POs</span>
              <span className="text-2xl font-black text-emerald-600 mt-2 block">{supplierLedger?.stats?.completedPOs || 0}</span>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Orders history */}
            <Card noPadding className="rounded-[24px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Order Logs</h3>
              </div>
              <Table>
                <Thead>
                  <tr>
                    <Th>Order No</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {supplierLedger?.purchaseOrders?.map((po) => (
                    <Tr key={po.id} onClick={() => viewPoDetails(po)} className="cursor-pointer">
                      <Td className="font-mono text-xs font-bold text-indigo-600">{po.order_no}</Td>
                      <Td className="font-black text-slate-900">₹{Number(po.total_amount || 0).toLocaleString()}</Td>
                      <Td>
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${getStatusColor(po.status)}`}>
                          {po.status}
                        </span>
                      </Td>
                    </Tr>
                  ))}
                  {(!supplierLedger?.purchaseOrders || supplierLedger.purchaseOrders.length === 0) && (
                    <Tr><Td colSpan={3} className="text-center text-slate-400 text-xs py-8 font-bold">No purchase orders found</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </Card>

            {/* Payments history */}
            <Card noPadding className="rounded-[24px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Settlements Ledger</h3>
              </div>
              <Table>
                <Thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Amount</Th>
                    <Th>Method</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {supplierLedger?.payments?.map((pay) => (
                    <Tr key={pay.id}>
                      <Td className="font-semibold text-slate-500 text-xs">{pay.date}</Td>
                      <Td className="font-black text-emerald-600">₹{Number(pay.amount || 0).toLocaleString()}</Td>
                      <Td className="text-slate-700 font-bold">{pay.payment_method}</Td>
                    </Tr>
                  ))}
                  {(!supplierLedger?.payments || supplierLedger.payments.length === 0) && (
                    <Tr><Td colSpan={3} className="text-center text-slate-400 text-xs py-8 font-bold">No settlements recorded</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </Card>
          </div>
        </div>
      ) : (
        /* Main Directories Views */
        <div className="print:hidden">
          {activeTab === 'suppliers' ? (
            <div className="overflow-x-auto">
              <Card noPadding className="rounded-[24px] min-w-[800px]">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Supplier Name</Th>
                      <Th>Phone</Th>
                      <Th>GSTIN</Th>
                      <Th>Credit Limit</Th>
                      <Th>Outstanding Balance</Th>
                      <Th className="text-right">Fit Score</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {suppliers.map((s) => (
                      <Tr key={s.id} onClick={() => viewSupplierLedger(s)} className="cursor-pointer">
                        <Td className="font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                          {s.name}
                        </Td>
                        <Td className="font-semibold text-slate-600">{s.phone || '-'}</Td>
                        <Td className="font-mono text-xs text-slate-500">{s.gstin || '-'}</Td>
                        <Td className="text-slate-600 font-semibold">₹{Number(s.credit_limit || 0).toLocaleString()}</Td>
                        <Td className="font-black text-rose-600">₹{Number(s.outstanding_balance || 0).toLocaleString()}</Td>
                        <Td className="text-right font-black text-emerald-600">{s.performance_score}%</Td>
                        <Td className="text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingSupplier(s); setShowEditSupplierModal(true); }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteSupplier(s.id, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                    {suppliers.length === 0 && (
                      <Tr><Td colSpan={7} className="text-center text-slate-400 py-12 text-sm font-bold">No suppliers found.</Td></Tr>
                    )}
                  </Tbody>
                </Table>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">All Purchase Orders</h3>
                <Button onClick={() => setShowAddPoModal(true)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none py-1.5 px-4 shadow-sm flex items-center gap-1">
                  <Plus size={12} /> Create Purchase Order
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Card noPadding className="rounded-[24px] min-w-[800px]">
                  <Table>
                    <Thead>
                      <tr>
                        <Th>Order No</Th>
                        <Th>Supplier</Th>
                        <Th>Date Created</Th>
                        <Th>Total Amount</Th>
                        <Th className="text-right">Pipeline Status</Th>
                      </tr>
                    </Thead>
                    <Tbody>
                      {purchaseOrders.map((po) => (
                        <Tr key={po.id} onClick={() => viewPoDetails(po)} className="cursor-pointer">
                          <Td className="font-mono text-xs font-bold text-indigo-600">{po.order_no}</Td>
                          <Td className="font-bold text-slate-900">{po.suppliers?.name || 'Unknown'}</Td>
                          <Td className="font-semibold text-slate-500 text-xs">{new Date(po.created_at).toLocaleDateString()}</Td>
                          <Td className="font-black text-slate-900">₹{Number(po.total_amount || 0).toLocaleString()}</Td>
                          <Td className="text-right">
                            <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-wider ${getStatusColor(po.status)}`}>
                              {po.status}
                            </span>
                          </Td>
                        </Tr>
                      ))}
                      {purchaseOrders.length === 0 && (
                        <Tr><Td colSpan={5} className="text-center text-slate-400 py-12 text-sm font-bold">No purchase orders found.</Td></Tr>
                      )}
                    </Tbody>
                  </Table>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PO Details Modal */}
      {selectedPo && !showEditPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in print:bg-white print:static print:block print:p-0">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-2xl space-y-6 max-h-[85vh] overflow-y-auto print:shadow-none print:border-none print:max-w-none print:max-h-none print:h-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full tracking-wider print:border print:border-slate-800 print:text-slate-800 ${getStatusColor(selectedPo.status)}`}>
                  {selectedPo.status}
                </span>
                <h3 className="text-xl font-black text-slate-950 mt-2 tracking-tight">Purchase Order: {selectedPo.order_no}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Supplier: {selectedPo.suppliers?.name}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Created: {new Date(selectedPo.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button onClick={() => window.print()} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center" title="Print PO">
                  <Printer size={18} />
                </button>
                {['Draft', 'Sent'].includes(selectedPo.status) && (
                  <button onClick={() => {
                    setEditingPo({
                      ...selectedPo,
                      items: selectedPo.items || []
                    });
                    setShowEditPoModal(true);
                  }} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center" title="Edit PO">
                    <Edit size={18} />
                  </button>
                )}
                {selectedPo.status === 'Draft' && (
                  <button onClick={() => handleDeletePo(selectedPo.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center" title="Delete PO">
                    <Trash size={18} />
                  </button>
                )}
                <button onClick={() => setSelectedPo(null)} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden print:border-slate-300">
              <Table>
                <Thead>
                  <tr>
                    <Th>Item / Product</Th>
                    <Th>Qty</Th>
                    <Th>Cost Price</Th>
                    <Th>GST</Th>
                    <Th>Discount</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {selectedPo.items?.map((item, idx) => (
                    <Tr key={idx}>
                      <Td className="font-bold text-slate-800">{item.inventory?.name || 'Loading item...'}</Td>
                      <Td className="font-semibold text-slate-600">{item.quantity}</Td>
                      <Td className="text-slate-500 font-mono text-xs">₹{Number(item.cost_price || 0).toLocaleString()}</Td>
                      <Td className="text-slate-500 text-xs">{item.gst_rate || 0}%</Td>
                      <Td className="text-rose-500 text-xs">-₹{Number(item.discount_amount || 0).toLocaleString()}</Td>
                      <Td className="text-right font-black text-slate-900">₹{Number(item.total || 0).toLocaleString()}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>

            <div className="flex flex-col items-end gap-1 px-4 text-sm font-semibold text-slate-600">
              <div className="flex justify-between w-48"><span>Subtotal:</span> <span>₹{Number(selectedPo.subtotal || 0).toLocaleString()}</span></div>
              <div className="flex justify-between w-48"><span>Tax (GST):</span> <span>₹{Number(selectedPo.tax_amount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between w-48 text-rose-500"><span>Discount:</span> <span>-₹{Number(selectedPo.discount_amount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between w-48 pt-2 mt-2 border-t border-slate-100 text-lg font-black text-slate-900">
                <span>Total:</span> <span>₹{Number(selectedPo.total_amount || 0).toLocaleString()}</span>
              </div>
            </div>

            {selectedPo.notes && (
              <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 print:bg-transparent print:border">
                <span className="font-bold block mb-1">Notes:</span>
                {selectedPo.notes}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 space-y-3 print:hidden">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Update Pipeline Status</h4>
              <div className="flex flex-wrap gap-2">
                {['Draft', 'Sent', 'Accepted', 'Partially Received', 'Received', 'Completed'].map(st => (
                  <Button
                    key={st}
                    variant={selectedPo.status === st ? 'primary' : 'ghost'}
                    className={`text-xs py-1.5 px-3 rounded-full font-bold ${selectedPo.status === st ? getStatusColor(st) : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                    onClick={() => handleUpdatePoStatus(selectedPo.id, st)}
                  >
                    {st}
                  </Button>
                ))}
                {!['Received', 'Completed', 'Cancelled'].includes(selectedPo.status) && (
                  <Button
                    variant="ghost"
                    className="text-xs py-1.5 px-3 rounded-full font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 ml-auto"
                    onClick={() => handleUpdatePoStatus(selectedPo.id, 'Cancelled')}
                  >
                    Cancel PO
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Register Wholesale Supplier</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Add vendor credentials to create purchase orders and manage credits.</p>
              </div>
              <button onClick={() => setShowAddSupplierModal(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="mt-6 space-y-4">
              <Input
                label="Supplier Business Name *"
                placeholder="e.g. Balaji Distributors"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  placeholder="e.g. 9876543210"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                />
                <Input
                  label="GSTIN Number"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={newSupplier.gstin}
                  onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Full Address</label>
                <textarea
                  className="w-full px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none h-20"
                  placeholder="Enter business address"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                />
              </div>
              <Input
                label="Credit Limit (₹)"
                type="number"
                placeholder="e.g. 50000"
                value={newSupplier.credit_limit}
                onChange={(e) => setNewSupplier({ ...newSupplier, credit_limit: e.target.value })}
              />

              <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowAddSupplierModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none">Create Profile</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditSupplierModal && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Edit Supplier</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Update vendor details.</p>
              </div>
              <button onClick={() => { setShowEditSupplierModal(false); setEditingSupplier(null); }} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateSupplier} className="mt-6 space-y-4">
              <Input
                label="Supplier Business Name *"
                placeholder="e.g. Balaji Distributors"
                value={editingSupplier.name}
                onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  placeholder="e.g. 9876543210"
                  value={editingSupplier.phone}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                />
                <Input
                  label="GSTIN"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={editingSupplier.gstin}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, gstin: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Full Address</label>
                <textarea
                  className="w-full px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none h-20"
                  placeholder="Enter business address"
                  value={editingSupplier.address || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                />
              </div>
              <Input
                label="Credit Limit (₹)"
                type="number"
                placeholder="e.g. 50000"
                value={editingSupplier.credit_limit}
                onChange={(e) => setEditingSupplier({ ...editingSupplier, credit_limit: e.target.value })}
              />

              <div className="flex gap-3 justify-end pt-4 mt-2">
                <Button type="button" variant="ghost" onClick={() => { setShowEditSupplierModal(false); setEditingSupplier(null); }}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none">Update Supplier</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Record Supplier Payment</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Log outgoing cash to settle accounts.</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment} className="mt-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Supplier *</label>
                <select
                  value={paymentForm.supplier_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplier_id: e.target.value })}
                  className="w-full px-4 py-2 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (Balance: ₹{s.outstanding_balance})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Amount (₹) *"
                  type="number"
                  min="1"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Payment Method *</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-4 py-2 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / Net Banking</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <Input
                label="Reference No / Notes"
                placeholder="e.g. Transaction ID or Cheque No."
                value={paymentForm.ref_no}
                onChange={(e) => setPaymentForm({ ...paymentForm, ref_no: e.target.value })}
              />

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none">Log Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Form Modal Component (used for Create & Edit) */}
      {(showAddPoModal || showEditPoModal) && (() => {
        const isEditing = showEditPoModal;
        const currentForm = isEditing ? editingPo : poForm;
        const setCurrentForm = isEditing ? setEditingPo : setPoForm;
        const handleSubmit = isEditing ? handleUpdatePo : handleCreatePo;
        const closeModal = () => { isEditing ? setShowEditPoModal(false) : setShowAddPoModal(false); };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-2 sm:p-4 print:hidden">
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-4xl space-y-6 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">{isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Specify vendor, PO code, and itemize products. Quantities automatically increment stock on receipt.</p>
                </div>
                <button onClick={closeModal} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto pr-2 space-y-6 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Supplier *</label>
                      <select
                        value={currentForm.supplier_id}
                        onChange={(e) => setCurrentForm({ ...currentForm, supplier_id: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                        required
                        disabled={isEditing} // Cannot change supplier when editing
                      >
                        <option value="">-- Choose Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <Input
                      label="Purchase Order No *"
                      placeholder="e.g. PO-2026-001"
                      value={currentForm.order_no}
                      onChange={(e) => setCurrentForm({ ...currentForm, order_no: e.target.value })}
                      required
                    />
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Itemized Products</label>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setCurrentForm({ ...currentForm, items: [...currentForm.items, { inventory_id: '', quantity: 1, cost_price: 0, gst_rate: 0, discount_amount: 0 }] })}
                        className="text-xs font-bold text-indigo-600 min-h-[44px]"
                      >
                        + Add Item Row
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {currentForm.items.map((item, idx) => (
                        <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-3 items-end p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-full sm:w-auto flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block">Product</label>
                            <select
                              value={item.inventory_id}
                              onChange={(e) => {
                                const newItems = [...currentForm.items];
                                newItems[idx].inventory_id = e.target.value;
                                const selectedProd = products.find(p => p.id === e.target.value);
                                if (selectedProd) {
                                  newItems[idx].cost_price = Number(selectedProd.cost_price || 0);
                                }
                                setCurrentForm({ ...currentForm, items: newItems });
                              }}
                              className="w-full px-3 py-2 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold min-h-[44px]"
                              required
                            >
                              <option value="">-- Select Product --</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                            </select>
                          </div>

                          <div className="w-1/3 sm:w-20">
                            <Input
                              label="Qty"
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...currentForm.items];
                                newItems[idx].quantity = Number(e.target.value);
                                setCurrentForm({ ...currentForm, items: newItems });
                              }}
                              required
                            />
                          </div>

                          <div className="w-1/3 sm:w-28">
                            <Input
                              label="Cost(₹)"
                              type="number"
                              step="0.01"
                              value={item.cost_price}
                              onChange={(e) => {
                                const newItems = [...currentForm.items];
                                newItems[idx].cost_price = Number(e.target.value);
                                setCurrentForm({ ...currentForm, items: newItems });
                              }}
                              required
                            />
                          </div>
                          
                          <div className="w-1/3 sm:w-20">
                            <Input
                              label="GST(%)"
                              type="number"
                              min="0"
                              max="100"
                              value={item.gst_rate}
                              onChange={(e) => {
                                const newItems = [...currentForm.items];
                                newItems[idx].gst_rate = Number(e.target.value);
                                setCurrentForm({ ...currentForm, items: newItems });
                              }}
                            />
                          </div>
                          
                          <div className="w-1/3 sm:w-28">
                            <Input
                              label="Disc(₹)"
                              type="number"
                              min="0"
                              value={item.discount_amount}
                              onChange={(e) => {
                                const newItems = [...currentForm.items];
                                newItems[idx].discount_amount = Number(e.target.value);
                                setCurrentForm({ ...currentForm, items: newItems });
                              }}
                            />
                          </div>

                          {currentForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = currentForm.items.filter((_, i) => i !== idx);
                                setCurrentForm({ ...currentForm, items: newItems });
                              }}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 mb-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Notes / Terms</label>
                      <textarea
                        className="w-full px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none h-24"
                        placeholder="Add delivery terms, notes..."
                        value={currentForm.notes}
                        onChange={(e) => setCurrentForm({ ...currentForm, notes: e.target.value })}
                      />
                    </div>
                    <div className="space-y-4">
                      <Input
                        label="Overall Order Discount (₹)"
                        type="number"
                        min="0"
                        value={currentForm.discount_amount}
                        onChange={(e) => setCurrentForm({ ...currentForm, discount_amount: e.target.value })}
                      />
                      <Input
                        label="Additional Order Tax / Charges (₹)"
                        type="number"
                        min="0"
                        value={currentForm.tax_amount}
                        onChange={(e) => setCurrentForm({ ...currentForm, tax_amount: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 shrink-0 mt-auto">
                  <Button type="button" variant="ghost" onClick={closeModal} disabled={isSubmittingPo}>Cancel</Button>
                  <Button type="submit" disabled={isSubmittingPo} className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none min-h-[44px] ${isSubmittingPo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isSubmittingPo ? 'Saving...' : (isEditing ? 'Update PO' : 'Create PO')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
