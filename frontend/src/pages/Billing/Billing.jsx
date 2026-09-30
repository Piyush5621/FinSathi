import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from "react-hot-toast";
import { useQueryClient } from '@tanstack/react-query';
import API from "../../services/apiClient";
import CustomerSection from "../../components/billing/CustomerSection";
import ItemTable from "../../components/billing/ItemTable";
import PaymentSection from "../../components/billing/PaymentSection";
import InvoicePreviewModal from "../../components/billing/InvoicePreviewModal";
import OfflineSyncIndicator from "../../components/billing/OfflineSyncIndicator";
import { queueOfflineSale } from "../../services/offlineSyncService";
import { useStore } from "../../contexts/StoreContext";
import { Button } from "../../components/ui/Button";
import { 
  Search, Plus, PauseCircle, PlayCircle, History, 
  HelpCircle, Store, RotateCcw, LayoutGrid, List, 
  Package, ShoppingCart, Zap, TrendingUp, Clock, 
  FileText, CheckCircle2, AlertTriangle, X, MessageCircle,
  Barcode as BarcodeIcon, ShieldCheck, ChevronUp, ChevronDown,
  Percent, Hash, Trash2, ArrowRight
} from 'lucide-react';

export default function Billing() {
  const queryClient = useQueryClient();
  const { activeStore, activeStoreId } = useStore();

  // State: Customer, Products Catalog, & Cart
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('karobar_active_pos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // State: Discount, Tax, & Notes
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFlat, setDiscountFlat] = useState(0);
  const [discountType, setDiscountType] = useState('percent'); // 'percent' | 'flat'
  const [notes, setNotes] = useState("");
  const [todayStats, setTodayStats] = useState({ invoices: 0, revenue: 0 });

  // State: Payment & Split Details
  const [paymentDetails, setPaymentDetails] = useState({
    method: "cash",
    status: "paid",
    amountReceived: 0,
  });
  const [splitDetails, setSplitDetails] = useState({ cash: 0, upi: 0, card: 0 });

  // State: Modals & Mobile Drawers
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastSavedInvoice, setLastSavedInvoice] = useState(null);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState(false);
  const [showRecentSalesModal, setShowRecentSalesModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showMobileCartDrawer, setShowMobileCartDrawer] = useState(false);
  const [recentSales, setRecentSales] = useState([]);
  const [heldSales, setHeldSales] = useState(() => {
    try {
      const saved = localStorage.getItem('karobar_held_pos_sales');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Barcode buffer state & refs
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const searchInputRef = useRef(null);

  // Sync active cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('karobar_active_pos_cart', JSON.stringify(items));
    } catch (e) {
      console.warn("Could not save cart to localStorage", e);
    }
  }, [items]);

  // Sync held sales to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('karobar_held_pos_sales', JSON.stringify(heldSales));
    } catch (e) {
      console.warn("Could not save held sales", e);
    }
  }, [heldSales]);

  // Fetch Customers, Products Catalog, and Recent Sales
  const fetchData = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [custRes, prodRes, salesRes] = await Promise.all([
        API.get("/customers").catch(() => ({ data: [] })),
        API.get("/inventory?limit=500").catch(() => ({ data: [] })),
        API.get("/sales?limit=30").catch(() => ({ data: [] })),
      ]);

      const customerData = custRes.data || [];
      const productData = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data || [];
      const salesData = Array.isArray(salesRes.data) ? salesRes.data : (salesRes.data?.sales || []);


      setCustomers(customerData);
      setProducts(productData);
      setRecentSales(salesData);

      // Compute Today's POS statistics
      const today = new Date().toISOString().split('T')[0];
      const todaySales = salesData.filter(s => s.date?.startsWith(today) || s.created_at?.startsWith(today));
      setTodayStats({
        invoices: todaySales.length,
        revenue: todaySales.reduce((sum, s) => sum + Number(s.total || 0), 0)
      });
    } catch (err) {
      console.error("Error loading POS initial data:", err);
      toast.error("Failed to load catalog data");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculations: Subtotal, Discounts, GST, and Grand Total
  const { subtotal, gstAmount, totalDiscount, grandTotal } = useMemo(() => {
    const rawSubtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const rawGst = items.reduce((sum, item) => {
      const lineAmt = Number(item.price || 0) * Number(item.quantity || 1);
      return sum + (lineAmt * (Number(item.gst_percent || 0) / 100));
    }, 0);

    let calculatedDiscount = 0;
    if (discountType === 'percent') {
      calculatedDiscount = (rawSubtotal * Number(discountPercent || 0)) / 100;
    } else {
      calculatedDiscount = Math.min(rawSubtotal, Number(discountFlat || 0));
    }

    const finalTotal = Math.max(0, rawSubtotal + rawGst - calculatedDiscount);

    return {
      subtotal: rawSubtotal,
      gstAmount: rawGst,
      totalDiscount: calculatedDiscount,
      grandTotal: Math.round(finalTotal),
    };
  }, [items, discountPercent, discountFlat, discountType]);

  // Update amountReceived when grandTotal changes (for exact payment methods)
  useEffect(() => {
    if (paymentDetails.status === 'paid' && paymentDetails.method !== 'split') {
      setPaymentDetails(prev => ({ ...prev, amountReceived: grandTotal }));
    }
  }, [grandTotal, paymentDetails.status, paymentDetails.method]);

  // Category Extraction
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach(p => {
      if (p.category) set.add(p.category);
      else if (p.company) set.add(p.company);
    });
    return ["all", ...Array.from(set)];
  }, [products]);

  // Filtered Products Catalog
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory || p.company === selectedCategory);
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      list = list.filter(p => 
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, selectedCategory, productSearch]);

  // Add Item to Cart (or increment if already present)
  const handleAddItem = useCallback((product) => {
    const existingIndex = items.findIndex(i => (i.productId || i.id) === product.id);
    const availableStock = Number(product.stock ?? 9999);

    if (existingIndex > -1) {
      const existingItem = items[existingIndex];
      if (existingItem.quantity >= availableStock && availableStock > 0) {
        toast.error(`Only ${availableStock} units available in stock!`);
        return;
      }
      setItems(prev => prev.map((item, idx) => 
        idx === existingIndex 
          ? { ...item, quantity: item.quantity + 1, amount: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      if (availableStock <= 0) {
        toast.error(`${product.name} is currently OUT OF STOCK!`);
        return;
      }
      const newItem = {
        tableId: Date.now() + Math.random(),
        productId: product.id,
        id: product.id,
        name: product.name,
        code: product.sku || product.barcode || '',
        price: Number(product.price || product.sellingPrice || 0),
        cost_price: Number(product.cost_price || product.costPrice || 0),
        stock: availableStock,
        unit: product.units || product.unit || 'pcs',
        gst_percent: Number(product.gst_percent || 0),
        quantity: 1,
        amount: Number(product.price || product.sellingPrice || 0)
      };
      setItems(prev => [newItem, ...prev]);
    }
  }, [items]);

  // Remove Item from Cart
  const handleRemoveItem = useCallback((tableId) => {
    setItems(prev => prev.filter(item => item.tableId !== tableId && item.id !== tableId));
  }, []);

  // Update Item in Cart (Quantity / Price)
  const handleUpdateItem = useCallback((tableId, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.tableId === tableId || item.id === tableId) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity') {
          if (item.stock && value > item.stock) {
            toast.error(`Warning: Only ${item.stock} in stock!`);
          }
        }
        updated.amount = Number(updated.price || 0) * Number(updated.quantity || 1);
        return updated;
      }
      return item;
    }));
  }, []);

  // Customer Selection & Quick Add
  const handleCustomerSelect = useCallback(async (id, newName) => {
    if (newName && !id) {
      try {
        toast.loading(`Creating customer "${newName}"...`, { id: "quick-cust" });
        const res = await API.post("/customers", { name: newName });
        const createdCust = res.data?.customer || res.data;
        if (createdCust && createdCust.id) {
          setCustomers(prev => [createdCust, ...prev]);
          setSelectedCustomer(createdCust.id);
          toast.success(`Customer "${newName}" added & selected!`, { id: "quick-cust" });
        } else {
          toast.error("Could not add customer", { id: "quick-cust" });
        }
      } catch (err) {
        console.error("Quick add customer error:", err);
        toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to create customer", { id: "quick-cust" });
      }
    } else {
      setSelectedCustomer(id);
    }
  }, []);

  // Barcode Handler
  const handleBarcodeScan = useCallback(async (code) => {
    const cleanCode = String(code).trim();
    if (!cleanCode) return;

    // First search in local products list for instant zero-latency match
    const localMatch = products.find(p => 
      p.barcode === cleanCode || 
      p.sku === cleanCode || 
      (p.barcodes && p.barcodes.some(b => b.barcodeValue === cleanCode || b.barcode_value === cleanCode))
    );

    if (localMatch) {
      handleAddItem(localMatch);
      toast.success(`Scanned: ${localMatch.name}`, { icon: '⚡' });
      return;
    }

    // Fallback to exact Barcode API lookup
    try {
      const res = await API.get(`/catalog/products/barcode/${encodeURIComponent(cleanCode)}`);
      const prod = res.data?.data || (res.data?.success ? res.data?.data : res.data);
      if (prod && prod.id) {
        handleAddItem(prod);
        toast.success(`Scanned: ${prod.name}`, { icon: '⚡' });
      } else {
        toast.error(`Barcode not found: ${cleanCode}`);
      }
    } catch (e) {
      if (e.response?.status === 404) {
        toast.error(`Barcode not found: ${cleanCode}`);
      } else {
        console.error("Barcode API scan error:", e);
        toast.error(`Error finding item: ${cleanCode}`);
      }
    }
  }, [products, handleAddItem]);

  // Hold Current Sale Ticket
  const handleHoldSale = () => {
    if (items.length === 0) {
      toast.error("Cart is empty — nothing to hold.");
      return;
    }
    const customer = customers.find(c => c.id === selectedCustomer);
    const heldTicket = {
      id: `HOLD-${Date.now()}`,
      items: [...items],
      selectedCustomer,
      customerName: customer ? customer.name : "Walk-in Customer",
      subtotal,
      grandTotal,
      discountPercent,
      discountFlat,
      discountType,
      notes,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setHeldSales(prev => [heldTicket, ...prev]);
    setItems([]);
    setSelectedCustomer(null);
    setNotes("");
    setDiscountPercent(0);
    setDiscountFlat(0);
    toast.success(`Sale #${heldTicket.id.slice(-4)} placed on hold!`, { icon: '⏸️' });
  };

  // Resume Held Sale Ticket
  const handleResumeSale = (ticket) => {
    if (items.length > 0) {
      if (!window.confirm("Replace current active cart with this held sale?")) return;
    }
    setItems(ticket.items);
    setSelectedCustomer(ticket.selectedCustomer || null);
    setDiscountPercent(ticket.discountPercent || 0);
    setDiscountFlat(ticket.discountFlat || 0);
    setDiscountType(ticket.discountType || 'percent');
    setNotes(ticket.notes || "");
    setHeldSales(prev => prev.filter(t => t.id !== ticket.id));
    setShowHeldSalesModal(false);
    toast.success(`Resumed held sale #${ticket.id.slice(-4)}`);
  };

  // Discard Held Sale Ticket
  const handleDiscardHeldSale = (ticketId) => {
    setHeldSales(prev => prev.filter(t => t.id !== ticketId));
    toast.success("Held ticket discarded");
  };

  // Clear Cart
  const handleClearCart = () => {
    if (items.length === 0) return;
    if (window.confirm("Clear all items from current cart?")) {
      setItems([]);
      setNotes("");
      setDiscountPercent(0);
      setDiscountFlat(0);
      toast.success("Cart cleared");
    }
  };

  // Save / Complete Sale
  const handleSaveInvoice = async (paymentOverride = null) => {
    if (isSaving) return;
    if (items.length === 0) {
      toast.error("Cart is empty! Add products first.");
      return;
    }

    const finalPayment = paymentOverride || paymentDetails;

    // Validate split payment totals
    if (finalPayment.method === 'split') {
      const splitTotal = Math.round(((Number(splitDetails.cash) || 0) + (Number(splitDetails.upi) || 0) + (Number(splitDetails.card) || 0)) * 100) / 100;
      if (Math.abs(splitTotal - grandTotal) > 0.05) {
        toast.error(`Split payment sum (₹${splitTotal}) must match sale total (₹${grandTotal})!`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Determine final amount paid
      let paidAmt = grandTotal;
      if (finalPayment.status === 'unpaid') {
        paidAmt = 0;
      } else if (finalPayment.status === 'partial') {
        paidAmt = Number(finalPayment.amountReceived || 0);
      } else if (finalPayment.method === 'split') {
        paidAmt = (Number(splitDetails.cash) || 0) + (Number(splitDetails.upi) || 0) + (Number(splitDetails.card) || 0);
      }

      // Generate client-side idempotency key for this sale attempt
      const clientSaleId = `POS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const customerObj = customers.find(c => c.id === selectedCustomer);

      const payload = {
        store_id: activeStoreId || null,
        customer_id: selectedCustomer || null,
        customer_gstin: customerObj?.gstin || null,
        place_of_supply: customerObj?.state || null,
        idempotency_key: clientSaleId,
        client_id: clientSaleId,
        items: items.map(i => {
          const itemPayload = {
            productId: i.productId || i.id,
            quantity: Number(i.quantity),
            price: Number(i.price),
            cost_price: Number(i.cost_price || 0),
            product_name: i.name,
            gst_percent: Number(i.gst_percent || 0)
          };
          if (i.variantId) itemPayload.variantId = i.variantId;
          if (i.batchId) itemPayload.batchId = i.batchId;
          return itemPayload;
        }),
        subtotal: subtotal,
        tax_amount: gstAmount,
        discount_percent: discountType === 'percent' ? discountPercent : 0,
        discount_amount: totalDiscount,
        total: grandTotal,
        payment_method: finalPayment.method,
        payment_status: finalPayment.status,
        amount_paid: paidAmt,
        split_details: finalPayment.method === 'split' ? splitDetails : null,
        notes: notes || null,
      };

      let savedInvoice = null;

      // Handle Offline vs Online
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const offlineRecord = await queueOfflineSale(payload);
        savedInvoice = {
          ...payload,
          id: offlineRecord.id,
          invoiceNo: offlineRecord.invoice_no,
          customer: customers.find(c => c.id === selectedCustomer) || { name: "Walk-in Customer" },
          isOffline: true
        };
        toast.success("Bill saved offline! Will auto-sync on reconnect.", { icon: "💾" });
      } else {
        try {
          const response = await API.post("/sales", payload);
          savedInvoice = {
            ...payload,
            id: response.data.id,
            invoiceNo: response.data.invoice_no || `INV-${String(response.data.id).slice(0, 8).toUpperCase()}`,
            customer: customers.find(c => c.id === selectedCustomer) || { name: "Walk-in Customer" }
          };
          toast.success("Sale completed successfully! 🎉");
        } catch (apiErr) {
          const isNetworkErr = !apiErr.response || apiErr.code === 'ERR_NETWORK';
          if (isNetworkErr) {
            const offlineRecord = await queueOfflineSale(payload);
            savedInvoice = {
              ...payload,
              id: offlineRecord.id,
              invoiceNo: offlineRecord.invoice_no,
              customer: customers.find(c => c.id === selectedCustomer) || { name: "Walk-in Customer" },
              isOffline: true
            };
            toast.success("Network dropped: bill saved offline!", { icon: "💾" });
          } else {
            throw apiErr;
          }
        }
      }

      // Invalidate queries to refresh dashboard, sales, inventory, and khata
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      // Update local state
      setLastSavedInvoice(savedInvoice);
      setShowPreview(true);
      setShowMobileCartDrawer(false);
      setTodayStats(prev => ({
        invoices: prev.invoices + 1,
        revenue: prev.revenue + grandTotal
      }));
      setRecentSales(prev => [savedInvoice, ...prev.slice(0, 20)]);

      // Reset cart
      setItems([]);
      setSelectedCustomer(null);
      setNotes("");
      setDiscountPercent(0);
      setDiscountFlat(0);
    } catch (err) {
      console.error("Save Invoice Error:", err);
      const rawError = err.response?.data?.error || err.response?.data?.message || err.message;
      const displayMsg = typeof rawError === 'string'
        ? rawError
        : (rawError?.message || "Failed to complete sale");
      toast.error(displayMsg);
    } finally {

      setIsSaving(false);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing inside text inputs, except for F-keys
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

      if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('customer-search-input')?.focus();
      } else if (e.key === 'F3' || (e.key === '/' && !isInput)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        const p = { method: 'cash', status: 'paid', amountReceived: grandTotal };
        setPaymentDetails(p);
        handleSaveInvoice(p);
      } else if (e.key === 'F5') {
        e.preventDefault();
        const p = { method: 'upi', status: 'paid', amountReceived: grandTotal };
        setPaymentDetails(p);
        handleSaveInvoice(p);
      } else if (e.key === 'F6') {
        e.preventDefault();
        const p = { method: 'cash', status: 'unpaid', amountReceived: 0 };
        setPaymentDetails(p);
        handleSaveInvoice(p);
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldSale();
      } else if (e.key === 'F9') {
        e.preventDefault();
        setShowHeldSalesModal(prev => !prev);
      } else if (e.key === 'F10') {
        e.preventDefault();
        setShowRecentSalesModal(prev => !prev);
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSaveInvoice();
      } else if (e.key === 'Escape') {
        if (showPreview) setShowPreview(false);
        else if (showHeldSalesModal) setShowHeldSalesModal(false);
        else if (showRecentSalesModal) setShowRecentSalesModal(false);
        else if (showShortcutsModal) setShowShortcutsModal(false);
        else if (showMobileCartDrawer) setShowMobileCartDrawer(false);
        else if (items.length > 0 && !isInput) {
          handleClearCart();
        }
      }

      // Barcode rapid buffer collector
      if (!isInput) {
        if (e.key === 'Enter') {
          if (barcodeBuffer.length > 3) {
            handleBarcodeScan(barcodeBuffer);
          }
          setBarcodeBuffer("");
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          setBarcodeBuffer(prev => prev + e.key);
        }
      }
    };

    const timeout = setTimeout(() => setBarcodeBuffer(""), 50);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [barcodeBuffer, grandTotal, items, showPreview, showHeldSalesModal, showRecentSalesModal, showShortcutsModal, showMobileCartDrawer, handleBarcodeScan]);

  // Checkout Panel Sub-Component (Reused on Desktop Column & Mobile Bottom Sheet)
  const renderCheckoutPanel = (isMobile = false) => (
    <div className="flex flex-col gap-3">
      {/* 1. Customer & Khata Section */}
      <div className="p-3 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary">
            Customer / Khata
          </span>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear Cart
            </button>
          )}
        </div>
        <CustomerSection 
          customers={customers} 
          selectedCustomer={selectedCustomer} 
          onCustomerSelect={handleCustomerSelect} 
        />
      </div>

      {/* 2. Cart Items Container */}
      <div className="p-3 bg-app-surface border border-app-border rounded-panel shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={13} className="text-app-primary" />
            <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary">
              Current Cart ({items.length})
            </span>
          </div>
          {items.length > 0 && (
            <span className="text-[10px] font-mono text-app-text-muted">
              {items.reduce((sum, i) => sum + i.quantity, 0)} Units
            </span>
          )}
        </div>

        <div className={`${isMobile ? 'max-h-[35vh]' : 'max-h-[250px]'} overflow-y-auto pr-0.5 space-y-2`}>
          <ItemTable 
            items={items} 
            onRemoveItem={handleRemoveItem} 
            onUpdateItem={handleUpdateItem} 
          />
        </div>
      </div>

      {/* 3. Discount, Totals, & Payment Details */}
      <div className="p-3 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-3">
        {/* Discount Bar */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-app-text-secondary font-bold text-xs">Discount</span>
            <div className="inline-flex rounded-lg border border-app-border bg-app-surface-subtle p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  discountType === 'percent' ? 'bg-app-surface text-app-primary shadow-2xs font-black' : 'text-app-text-muted'
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('flat')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  discountType === 'flat' ? 'bg-app-surface text-app-primary shadow-2xs font-black' : 'text-app-text-muted'
                }`}
              >
                ₹
              </button>
            </div>
          </div>

          <input
            type="number"
            min="0"
            max={discountType === 'percent' ? 100 : subtotal}
            value={discountType === 'percent' ? (discountPercent || '') : (discountFlat || '')}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              if (discountType === 'percent') setDiscountPercent(val);
              else setDiscountFlat(val);
            }}
            placeholder="0"
            className="w-18 text-right font-bold text-xs bg-app-surface-subtle border border-app-border rounded-lg px-2 py-1 outline-none focus:border-app-primary text-app-text font-mono"
          />
        </div>

        {/* Subtotal & GST Line Items */}
        <div className="space-y-1 text-xs pt-2 border-t border-app-border/60">
          <div className="flex justify-between text-app-text-secondary font-medium">
            <span>Taxable Subtotal:</span>
            <span className="font-mono font-bold text-app-text">₹{subtotal.toFixed(2)}</span>
          </div>
          {gstAmount > 0 && (
            <div className="flex justify-between text-app-text-secondary font-medium">
              <span>GST (CGST + SGST):</span>
              <span className="font-mono font-bold text-app-text">₹{gstAmount.toFixed(2)}</span>
            </div>
          )}
          {totalDiscount > 0 && (
            <div className="flex justify-between text-rose-600 font-bold">
              <span>Discount Applied:</span>
              <span className="font-mono">-₹{totalDiscount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Dominant Grand Total */}
        <div className="flex justify-between items-baseline pt-2.5 border-t border-app-border">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-app-text-secondary block">
              Grand Total
            </span>
            <span className="text-[10px] text-app-text-muted">Net Payable</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-app-text font-mono">
            ₹{grandTotal.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="pt-2 border-t border-app-border">
          <PaymentSection
            method={paymentDetails.method}
            status={paymentDetails.status}
            amountReceived={paymentDetails.amountReceived}
            total={grandTotal}
            splitDetails={splitDetails}
            onChange={(k, v) => setPaymentDetails(p => ({ ...p, [k]: v }))}
            onSplitChange={(v) => setSplitDetails(v)}
          />
        </div>

        {/* Complete Sale Primary Button */}
        <button
          type="button"
          onClick={() => handleSaveInvoice()}
          disabled={isSaving || items.length === 0}
          className="w-full py-3.5 px-4 rounded-xl bg-app-primary hover:bg-app-primary-hover active:scale-[0.99] text-white font-black text-sm shadow-md shadow-app-primary/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap size={16} />
          <span>{isSaving ? "PROCESSING SALE..." : `COMPLETE SALE • ₹${grandTotal.toLocaleString('en-IN')}`}</span>
          <span className="text-[10px] opacity-75 font-mono ml-1 hidden sm:inline">(Ctrl+S)</span>
        </button>

        {/* 1-Tap Quick Pay Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              const p = { method: 'cash', status: 'paid', amountReceived: grandTotal };
              setPaymentDetails(p);
              handleSaveInvoice(p);
            }}
            disabled={isSaving || items.length === 0}
            className="py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-[11px] shadow-sm flex flex-col items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>CASH</span>
            <span className="text-[9px] opacity-80 font-mono">F4</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const p = { method: 'upi', status: 'paid', amountReceived: grandTotal };
              setPaymentDetails(p);
              handleSaveInvoice(p);
            }}
            disabled={isSaving || items.length === 0}
            className="py-2 px-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-[11px] shadow-sm flex flex-col items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>UPI QR</span>
            <span className="text-[9px] opacity-80 font-mono">F5</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const p = { method: 'cash', status: 'unpaid', amountReceived: 0 };
              setPaymentDetails(p);
              handleSaveInvoice(p);
            }}
            disabled={isSaving || items.length === 0}
            className="py-2 px-1 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-[11px] shadow-sm flex flex-col items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>KHATA</span>
            <span className="text-[9px] opacity-80 font-mono">F6</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-24 lg:pb-12 max-w-[1680px] mx-auto animate-fadeIn">
      
      {/* 1. OPERATIONAL POS TERMINAL HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-app-surface border border-app-border rounded-panel shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-app-primary text-white flex items-center justify-center font-black shadow-sm shadow-app-primary/25 shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-app-text tracking-tight">Billing POS Terminal</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ready
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-app-text-secondary mt-0.5">
              <span className="flex items-center gap-1 font-semibold">
                <Store size={12} /> {activeStore?.name || "Main Store"}
              </span>
              <span>•</span>
              <span className="text-app-text-muted">
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>
        </div>

        {/* Counter KPI Chips, Hold actions & Sync status */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Today's Stats Chip */}
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-app-surface-subtle border border-app-border text-xs">
            <div>
              <span className="text-[9px] font-bold text-app-text-muted uppercase">Today's Bills</span>
              <p className="font-black text-app-text font-mono leading-none mt-0.5">{todayStats.invoices}</p>
            </div>
            <div className="h-5 w-px bg-app-border" />
            <div>
              <span className="text-[9px] font-bold text-app-text-muted uppercase">Revenue</span>
              <p className="font-black text-emerald-600 font-mono leading-none mt-0.5">₹{todayStats.revenue.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Hold Sale Button */}
          <button
            type="button"
            onClick={handleHoldSale}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-app-border bg-app-surface text-app-text hover:border-amber-400 hover:text-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            title="Hold Current Sale Ticket (F8)"
          >
            <PauseCircle size={14} className="text-amber-500" /> Hold (F8)
          </button>

          {/* Held Sales Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowHeldSalesModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer shadow-2xs ${
              heldSales.length > 0
                ? 'bg-amber-500/10 border-amber-400 text-amber-600 dark:text-amber-400'
                : 'border-app-border bg-app-surface text-app-text-secondary hover:text-app-text'
            }`}
            title="View Held Sales Register (F9)"
          >
            <PlayCircle size={14} /> Held ({heldSales.length})
          </button>

          {/* Recent Invoices Trigger */}
          <button
            type="button"
            onClick={() => setShowRecentSalesModal(true)}
            className="p-2 rounded-xl border border-app-border bg-app-surface text-app-text-secondary hover:text-app-text hover:border-app-border-hover transition-colors cursor-pointer shadow-2xs"
            title="Recent Invoices (F10)"
          >
            <History size={15} />
          </button>

          {/* Shortcuts Help */}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 rounded-xl border border-app-border bg-app-surface text-app-text-secondary hover:text-app-primary transition-colors cursor-pointer shadow-2xs"
            title="Keyboard Shortcuts Cheat Sheet"
          >
            <HelpCircle size={15} />
          </button>

          <OfflineSyncIndicator />
        </div>
      </div>

      {/* 2. MAIN 2-ZONE POS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT ZONE: PRODUCT CATALOG & SCANNING (7 cols on lg, 8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
          
          {/* Search, Barcode Indicator & View Mode */}
          <div className="p-3 bg-app-surface border border-app-border rounded-panel shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Scan barcode or search by Name, SKU (/ or F3)..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-app-surface-subtle border border-app-border text-xs font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary transition-colors"
                />
                {productSearch && (
                  <button 
                    onClick={() => setProductSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Barcode Scanner Active Indicator */}
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-app-border bg-app-surface-subtle text-[11px] font-bold text-app-text-secondary" title="Hardware barcode scanner is actively listening">
                <BarcodeIcon size={14} className="text-emerald-500" />
                <span>Scanner Active</span>
              </div>

              {/* Grid / Table Mode Toggle */}
              <div className="inline-flex rounded-xl border border-app-border bg-app-surface-subtle p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-app-surface text-app-primary shadow-2xs font-bold' : 'text-app-text-muted hover:text-app-text'
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'table' ? 'bg-app-surface text-app-primary shadow-2xs font-bold' : 'text-app-text-muted hover:text-app-text'
                  }`}
                  title="Compact Table View"
                >
                  <List size={15} />
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-app-primary text-white shadow-2xs'
                      : 'bg-app-surface-subtle text-app-text-secondary hover:text-app-text hover:bg-app-border/40'
                  }`}
                >
                  {cat === 'all' ? 'All Items' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Catalog Cards Grid / Table View */}
          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 rounded-panel bg-app-surface border border-app-border animate-pulse p-3 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-app-surface-subtle" />
                  <div className="h-4 bg-app-surface-subtle rounded w-3/4" />
                  <div className="h-3 bg-app-surface-subtle rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-app-surface border border-app-border rounded-panel">
              <Package size={36} className="mx-auto text-app-text-muted mb-2" />
              <h3 className="font-bold text-sm text-app-text">No products match your search</h3>
              <p className="text-xs text-app-text-muted mt-1">Try typing a different item name, SKU, or category.</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID CARDS VIEW */
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const stock = Number(p.stock ?? 0);
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= 5;
                const inCartItem = items.find(i => (i.productId || i.id) === p.id);

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && handleAddItem(p)}
                    className={`relative p-3 rounded-panel border transition-all duration-150 flex flex-col justify-between select-none ${
                      isOutOfStock
                        ? 'bg-app-surface-subtle/50 border-app-border opacity-50 cursor-not-allowed'
                        : 'bg-app-surface border-app-border hover:border-app-primary/50 hover:shadow-sm cursor-pointer group active:scale-[0.98]'
                    }`}
                  >
                    <div>
                      {/* Top Bar: SKU & Stock Badge */}
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] font-mono text-app-text-muted truncate max-w-[80px]">
                          {p.sku || p.barcode || 'ITEM'}
                        </span>
                        {isOutOfStock ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600">
                            {stock} left
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600">
                            {stock} in stock
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h3 className="font-bold text-xs text-app-text leading-snug line-clamp-2 group-hover:text-app-primary transition-colors">
                        {p.name}
                      </h3>
                      {p.category && (
                        <p className="text-[10px] text-app-text-muted mt-0.5 capitalize truncate">{p.category}</p>
                      )}
                    </div>

                    {/* Bottom Bar: Price & Add Action */}
                    <div className="flex items-end justify-between pt-2.5 mt-2 border-t border-app-border/60">
                      <div>
                        <p className="text-[9px] text-app-text-muted uppercase">Price</p>
                        <p className="text-xs sm:text-sm font-black text-app-text font-mono">
                          ₹{Number(p.price || p.sellingPrice || 0).toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {inCartItem ? (
                          <div className="w-7 h-7 rounded-lg bg-app-primary text-white flex items-center justify-center font-black text-xs shadow-2xs">
                            {inCartItem.quantity}
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-app-surface-subtle group-hover:bg-app-primary group-hover:text-white text-app-text-secondary flex items-center justify-center transition-colors shadow-2xs">
                            <Plus size={14} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* COMPACT TABLE VIEW */
            <div className="border border-app-border rounded-panel bg-app-surface overflow-hidden max-h-[calc(100vh-250px)] overflow-y-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-app-surface-subtle border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary z-10">
                  <tr>
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3">SKU / Code</th>
                    <th className="py-2 px-3 text-center">Stock</th>
                    <th className="py-2 px-3 text-right">Price</th>
                    <th className="py-2 px-3 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filteredProducts.map((p) => {
                    const stock = Number(p.stock ?? 0);
                    const isOutOfStock = stock <= 0;
                    const inCartItem = items.find(i => (i.productId || i.id) === p.id);

                    return (
                      <tr 
                        key={p.id}
                        onClick={() => !isOutOfStock && handleAddItem(p)}
                        className={`hover:bg-app-surface-subtle/60 transition-colors ${
                          isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-app-text">{p.name}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-app-text-muted">{p.sku || p.barcode || '-'}</td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span className={stock <= 0 ? 'text-rose-600' : stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}>
                            {stock}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-black font-mono text-app-text">
                          ₹{Number(p.price || p.sellingPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {inCartItem ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-app-primary text-white font-bold text-xs">
                              {inCartItem.quantity}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              className="p-1 rounded-md bg-app-surface-subtle hover:bg-app-primary hover:text-white text-app-text-secondary transition-colors cursor-pointer"
                            >
                              <Plus size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT ZONE: DESKTOP STICKY CHECKOUT PANEL (5 cols on lg, 4 on xl) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-0.5">
          {renderCheckoutPanel(false)}
        </div>
      </div>

      {/* 3. MOBILE FLOATING CART & CHECKOUT BAR (< 1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-app-surface/95 backdrop-blur-md border-t border-app-border z-40 shadow-xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-app-text-muted uppercase block">
              Cart ({items.length} items)
            </span>
            <p className="text-base font-black text-app-text font-mono">
              ₹{grandTotal.toLocaleString('en-IN')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowMobileCartDrawer(true)}
            className="flex-1 py-3 px-4 rounded-xl bg-app-primary hover:bg-app-primary-hover text-white font-black text-xs shadow-md shadow-app-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <ShoppingCart size={15} />
            <span>Review Cart & Pay</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 4. MOBILE CART DRAWER (< 1024px) */}
      {showMobileCartDrawer && (
        <div className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col justify-end animate-fadeIn">
          <div className="bg-app-surface border-t border-app-border rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-app-border">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-app-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">POS Checkout</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileCartDrawer(false)}
                className="p-1 text-app-text-muted hover:text-app-text cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            {renderCheckoutPanel(true)}
          </div>
        </div>
      )}

      {/* 5. INVOICE PREVIEW MODAL */}
      {showPreview && (
        <InvoicePreviewModal
          invoice={lastSavedInvoice}
          onClose={() => setShowPreview(false)}
          onNewSale={() => {
            setShowPreview(false);
            searchInputRef.current?.focus();
          }}
        />
      )}

      {/* 6. HELD SALES REGISTER MODAL (F9) */}
      {showHeldSalesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <PlayCircle className="text-amber-500" size={18} />
                <h3 className="font-bold text-sm text-app-text">Held Sales Register ({heldSales.length})</h3>
              </div>
              <button 
                onClick={() => setShowHeldSalesModal(false)}
                className="p-1 text-app-text-muted hover:text-app-text cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 max-h-[380px] overflow-y-auto space-y-2.5">
              {heldSales.length === 0 ? (
                <div className="py-10 text-center text-app-text-muted text-xs">
                  <PauseCircle size={24} className="mx-auto mb-1 text-app-text-muted opacity-40" />
                  No sales currently on hold.
                </div>
              ) : (
                heldSales.map((ticket) => (
                  <div 
                    key={ticket.id}
                    className="p-3 bg-app-surface-subtle border border-app-border rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-app-text">{ticket.customerName}</span>
                        <span className="text-[10px] font-mono text-app-text-muted">({ticket.timestamp})</span>
                      </div>
                      <p className="text-[11px] text-app-text-muted mt-0.5">
                        {ticket.items.length} items • ₹{ticket.grandTotal.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResumeSale(ticket)}
                        className="text-xs"
                      >
                        Resume
                      </Button>
                      <button
                        onClick={() => handleDiscardHeldSale(ticket.id)}
                        className="p-1.5 text-app-text-muted hover:text-rose-600 transition-colors cursor-pointer"
                        title="Discard Ticket"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. RECENT INVOICES REGISTER MODAL (F10) */}
      {showRecentSalesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <History className="text-app-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">Recent Counter Invoices</h3>
              </div>
              <button 
                onClick={() => setShowRecentSalesModal(false)}
                className="p-1 text-app-text-muted hover:text-app-text cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-app-border text-[10px] font-bold uppercase text-app-text-secondary">
                    <th className="py-2 px-2">Invoice #</th>
                    <th className="py-2 px-2">Customer</th>
                    <th className="py-2 px-2">Payment</th>
                    <th className="py-2 px-2 text-right">Total</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-app-surface-subtle/50">
                      <td className="py-2.5 px-2 font-mono font-bold text-app-text">
                        {sale.invoice_no || `INV-${String(sale.id).slice(0, 6)}`}
                      </td>
                      <td className="py-2.5 px-2 text-app-text-secondary">
                        {sale.customer?.name || "Walk-in Customer"}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          sale.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {sale.payment_method || 'Cash'} • {sale.payment_status || 'PAID'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-black font-mono text-app-text">
                        ₹{Number(sale.total || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setLastSavedInvoice(sale);
                            setShowRecentSalesModal(false);
                            setShowPreview(true);
                          }}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg bg-app-surface-subtle hover:bg-app-primary hover:text-white transition-colors cursor-pointer"
                        >
                          View / Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. KEYBOARD SHORTCUTS CHEAT SHEET MODAL */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-app-surface border border-app-border rounded-panel shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-app-border">
              <div className="flex items-center gap-2">
                <HelpCircle className="text-app-primary" size={18} />
                <h3 className="font-bold text-sm text-app-text">POS Keyboard Shortcuts</h3>
              </div>
              <button 
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 text-app-text-muted hover:text-app-text cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-2 text-xs">
              {[
                { key: "F2", desc: "Focus Customer Search / Add" },
                { key: "F3 or /", desc: "Focus Product Search Bar" },
                { key: "F4", desc: "1-Tap Exact Cash Sale" },
                { key: "F5", desc: "1-Tap UPI QR Sale" },
                { key: "F6", desc: "1-Tap Khata / Udhaar (Credit) Sale" },
                { key: "F8", desc: "Hold Current Sale" },
                { key: "F9", desc: "Open Held Sales Register" },
                { key: "F10", desc: "Open Recent Invoices Register" },
                { key: "Ctrl + S", desc: "Complete & Save Current Sale" },
                { key: "Esc", desc: "Dismiss Modals / Prompt Clear Cart" },
              ].map((s) => (
                <div key={s.key} className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-app-surface-subtle border border-app-border/40">
                  <span className="text-app-text-secondary font-medium">{s.desc}</span>
                  <kbd className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-app-surface border border-app-border text-app-text shadow-2xs">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
