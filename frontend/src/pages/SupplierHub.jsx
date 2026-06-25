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
  Circle, Receipt, Trash2
} from 'lucide-react';
import API from '../services/apiClient';
import toast from 'react-hot-toast';

export default function SupplierHub() {
  const [activeTab, setActiveTab] = useState('suppliers'); // 'suppliers' or 'orders'
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // Selected details
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierLedger, setSupplierLedger] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddPoModal, setShowAddPoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', gstin: '', address: '', credit_limit: '' });
  const [paymentForm, setPaymentForm] = useState({ supplier_id: '', amount: '', payment_method: 'Cash', ref_no: '' });
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    order_no: '',
    items: [{ inventory_id: '', quantity: 1, cost_price: 0 }]
  });

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [suppRes, invRes] = await Promise.all([
        API.get('/suppliers'),
        API.get('/inventory')
      ]);
      setSuppliers(suppRes.data?.data || []);
      setProducts(invRes.data || []);

      if (activeTab === 'orders') {
        const poRes = await API.get('/purchase-orders');
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

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (!poForm.supplier_id || !poForm.order_no) {
      return toast.error('Please specify supplier and purchase order number');
    }
    
    // Filter out invalid items
    const validItems = poForm.items.filter(i => i.inventory_id && i.quantity > 0);
    if (validItems.length === 0) {
      return toast.error('Please add at least one valid product');
    }

    try {
      const res = await API.post('/purchase-orders', {
        supplier_id: poForm.supplier_id,
        order_no: poForm.order_no,
        items: validItems
      });

      if (res.data?.success) {
        toast.success('Purchase order created successfully!');
        setShowAddPoModal(false);
        setPoForm({ supplier_id: '', order_no: '', items: [{ inventory_id: '', quantity: 1, cost_price: 0 }] });
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to create purchase order');
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
        if (selectedSupplier) {
          viewSupplierLedger(selectedSupplier);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to log payment');
    }
  };

  const viewSupplierLedger = async (supplier) => {
    setSelectedSupplier(supplier);
    try {
      const res = await API.get(`/suppliers/${supplier.id}/ledger`);
      setSupplierLedger(res.data?.data || { purchaseOrders: [], payments: [] });
    } catch (err) {
      toast.error('Failed to load ledger log');
    }
  };

  const handleUpdatePoStatus = async (poId, status) => {
    try {
      const res = await API.patch(`/purchase-orders/${poId}/status`, { status });
      if (res.data?.success) {
        toast.success(`Purchase order status updated to ${status}`);
        fetchInitialData();
        // Refresh details modal
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
      case 'Approved': return 'bg-indigo-100 text-indigo-800';
      case 'Received': return 'bg-teal-100 text-teal-800';
      case 'Completed': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck size={26} className="text-indigo-600" />
            Supplier & Procurement Hub
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
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

      {loading ? (
        <div className="space-y-4">
          <Skeleton height="80px" rounded="rounded-2xl" />
          <Skeleton height="300px" rounded="rounded-[24px]" />
        </div>
      ) : selectedSupplier ? (
        /* Supplier Ledger View */
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedSupplier(null)} className="p-2">
              <ArrowLeft size={16} /> Back to Directory
            </Button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedSupplier.name}</h2>
              <p className="text-xs text-slate-500 font-semibold">{selectedSupplier.phone || 'No Phone'} | GSTIN: {selectedSupplier.gstin || 'None'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 border-slate-100 bg-white">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Outstanding Balance</span>
              <span className="text-2xl font-black text-rose-600 mt-2 block">₹{Number(selectedSupplier.outstanding_balance || 0).toLocaleString()}</span>
            </Card>
            <Card className="p-5 border-slate-100 bg-white">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Credit Limit</span>
              <span className="text-2xl font-black text-slate-800 mt-2 block">₹{Number(selectedSupplier.credit_limit || 0).toLocaleString()}</span>
            </Card>
            <Card className="p-5 border-slate-100 bg-white">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Performance Index</span>
              <span className="text-2xl font-black text-emerald-600 mt-2 block">{selectedSupplier.performance_score}%</span>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* POs history */}
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
        <>
          {activeTab === 'suppliers' ? (
            <Card noPadding className="rounded-[24px]">
              <Table>
                <Thead>
                  <tr>
                    <Th>Supplier Name</Th>
                    <Th>Phone</Th>
                    <Th>GSTIN</Th>
                    <Th>Credit Limit</Th>
                    <Th>Outstanding Balance</Th>
                    <Th className="text-right">Fit Score</Th>
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
                    </Tr>
                  ))}
                  {suppliers.length === 0 && (
                    <Tr><Td colSpan={6} className="text-center text-slate-400 py-12 text-sm font-bold">No suppliers registered. Add one using the button above.</Td></Tr>
                  )}
                </Tbody>
              </Table>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">All Procurement Orders</h3>
                <Button onClick={() => setShowAddPoModal(true)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none py-1.5 px-4 shadow-sm flex items-center gap-1">
                  <Plus size={12} /> Create Purchase Order
                </Button>
              </div>

              <Card noPadding className="rounded-[24px]">
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
          )}
        </>
      )}

      {/* PO Details Modal */}
      {selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full tracking-wider ${getStatusColor(selectedPo.status)}`}>
                  {selectedPo.status}
                </span>
                <h3 className="text-xl font-black text-slate-950 mt-2 tracking-tight">Purchase Order: {selectedPo.order_no}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Supplier: {selectedPo.suppliers?.name}</p>
              </div>
              <button onClick={() => setSelectedPo(null)} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={18} />
              </button>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <Table>
                <Thead>
                  <tr>
                    <Th>Item / Product</Th>
                    <Th>Qty</Th>
                    <Th>Cost Price</Th>
                    <Th className="text-right">Subtotal</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {selectedPo.items?.map((item, idx) => (
                    <Tr key={idx}>
                      <Td className="font-bold text-slate-800">{item.inventory?.name || 'Loading item...'}</Td>
                      <Td className="font-semibold text-slate-600">{item.quantity}</Td>
                      <Td className="text-slate-500 font-mono text-xs">₹{item.cost_price}</Td>
                      <Td className="text-right font-black text-slate-900">₹{item.total}</Td>
                    </Tr>
                  ))}
                  <Tr>
                    <Td colSpan={3} className="font-bold text-slate-800 text-right">Grand Total</Td>
                    <Td className="text-right font-black text-indigo-600 text-base">₹{Number(selectedPo.total_amount || 0).toLocaleString()}</Td>
                  </Tr>
                </Tbody>
              </Table>
            </div>

            {/* Pipeline State Controller */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center">
              <div className="text-xs text-slate-400 font-black uppercase">Change Status:</div>
              <div className="flex gap-2">
                {['Draft', 'Sent', 'Approved', 'Received', 'Completed'].map((st) => {
                  const isActive = selectedPo.status === st;
                  // Restrict transitions (received/completed can't go backwards)
                  const isStocked = ['Received', 'Completed'].includes(selectedPo.status);
                  return (
                    <button
                      key={st}
                      disabled={isActive || (isStocked && !['Received', 'Completed'].includes(st))}
                      onClick={() => handleUpdatePoStatus(selectedPo.id, st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white cursor-default'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/50 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Register Wholesale Supplier</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Add vendor credentials to create purchase orders and manage credits.</p>
              </div>
              <button onClick={() => setShowAddSupplierModal(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-4">
              <Input
                label="Supplier / Business Name *"
                placeholder="e.g. ABC Distributors Delhi"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                placeholder="e.g. 9876543210"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
              />
              <Input
                label="GSTIN Number"
                placeholder="e.g. 07AAAAA1111A1Z1"
                value={newSupplier.gstin}
                onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value })}
              />
              <Input
                label="Warehouse Address"
                placeholder="e.g. Gali No. 4, Khari Baoli, Delhi"
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              />
              <Input
                label="Credit Limit (₹)"
                type="number"
                placeholder="e.g. 100000"
                value={newSupplier.credit_limit}
                onChange={(e) => setNewSupplier({ ...newSupplier, credit_limit: e.target.value })}
              />

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowAddSupplierModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none">Add Supplier</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Record Supplier Payment</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Log a cash settlement or bank transfer to reduce outstanding balance.</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Select Supplier *</label>
                <select
                  value={paymentForm.supplier_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplier_id: e.target.value })}
                  className="w-full px-4 py-2 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (Outstanding: ₹{s.outstanding_balance})</option>)}
                </select>
              </div>

              <Input
                label="Payment Amount (₹) *"
                type="number"
                placeholder="e.g. 50000"
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

      {/* Create PO Modal */}
      {showAddPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Create Procurement Purchase Order</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Specify vendor, PO code, and itemize products. Quantities automatically increment stock on receipt.</p>
              </div>
              <button onClick={() => setShowAddPoModal(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Supplier *</label>
                  <select
                    value={poForm.supplier_id}
                    onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <Input
                  label="Purchase Order No *"
                  placeholder="e.g. PO-2026-001"
                  value={poForm.order_no}
                  onChange={(e) => setPoForm({ ...poForm, order_no: e.target.value })}
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
                    onClick={() => setPoForm({ ...poForm, items: [...poForm.items, { inventory_id: '', quantity: 1, cost_price: 0 }] })}
                    className="text-xs font-bold text-indigo-600"
                  >
                    + Add Item Row
                  </Button>
                </div>

                <div className="space-y-3">
                  {poForm.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1">
                        {idx === 0 && <label className="text-[10px] font-bold text-slate-400 uppercase block">Product Name</label>}
                        <select
                          value={item.inventory_id}
                          onChange={(e) => {
                            const newItems = [...poForm.items];
                            newItems[idx].inventory_id = e.target.value;
                            // Pre-fill cost price from inventory selection
                            const selectedProd = products.find(p => p.id === e.target.value);
                            if (selectedProd) {
                              newItems[idx].cost_price = Number(selectedProd.cost_price || 0);
                            }
                            setPoForm({ ...poForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                          required
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                        </select>
                      </div>

                      <div className="w-24">
                        <Input
                          label={idx === 0 ? "Quantity" : ""}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...poForm.items];
                            newItems[idx].quantity = Number(e.target.value);
                            setPoForm({ ...poForm, items: newItems });
                          }}
                          required
                        />
                      </div>

                      <div className="w-32">
                        <Input
                          label={idx === 0 ? "Cost Price (₹)" : ""}
                          type="number"
                          value={item.cost_price}
                          onChange={(e) => {
                            const newItems = [...poForm.items];
                            newItems[idx].cost_price = Number(e.target.value);
                            setPoForm({ ...poForm, items: newItems });
                          }}
                          required
                        />
                      </div>

                      {poForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = poForm.items.filter((_, i) => i !== idx);
                            setPoForm({ ...poForm, items: newItems });
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mb-1.5 shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowAddPoModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none">Create PO</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
