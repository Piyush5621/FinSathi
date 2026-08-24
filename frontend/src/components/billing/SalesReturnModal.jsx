import { useState, useMemo } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle, DollarSign, Package } from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export default function SalesReturnModal({ invoice, isOpen, onClose, onReturnSuccess }) {
  const [returnItems, setReturnItems] = useState({});
  const [reason, setReason] = useState('Customer Return');
  const [refundMode, setRefundMode] = useState('cash');
  const [loading, setLoading] = useState(false);

  // Parse items and previous returns
  const saleItems = useMemo(() => {
    if (!invoice || !Array.isArray(invoice.items)) return [];
    return invoice.items;
  }, [invoice]);

  const alreadyReturnedMap = useMemo(() => {
    const map = {};
    const previousReturns = Array.isArray(invoice?.returns) ? invoice.returns : [];
    for (const ret of previousReturns) {
      for (const item of ret.items || []) {
        const key = `${item.productId || item.product_id || item.inventory_id || item.id}:${item.variantId || item.variant_id || 'null'}`;
        map[key] = (map[key] || 0) + Number(item.quantity || 0);
      }
    }
    return map;
  }, [invoice]);

  const itemsWithReturnable = useMemo(() => {
    return saleItems.map(item => {
      const pId = item.productId || item.product_id || item.inventory_id || item.id;
      const vId = item.variantId || item.variant_id || null;
      const key = `${pId}:${vId || 'null'}`;
      const soldQty = Number(item.quantity || 0);
      const alreadyReturned = alreadyReturnedMap[key] || 0;
      const returnable = Math.max(0, soldQty - alreadyReturned);
      const price = Number(item.price || item.selling_price || 0);

      return {
        ...item,
        pId,
        vId,
        key,
        soldQty,
        alreadyReturned,
        returnable,
        price
      };
    });
  }, [saleItems, alreadyReturnedMap]);

  const handleQtyChange = (key, val, max) => {
    const num = Math.min(max, Math.max(0, parseInt(val) || 0));
    setReturnItems(prev => ({
      ...prev,
      [key]: num
    }));
  };

  // Calculate total refund
  const totalRefund = useMemo(() => {
    let sum = 0;
    itemsWithReturnable.forEach(item => {
      const qty = returnItems[item.key] || 0;
      sum += qty * item.price;
    });
    return sum;
  }, [itemsWithReturnable, returnItems]);

  const totalUnitsToReturn = useMemo(() => {
    return Object.values(returnItems).reduce((a, b) => a + Number(b || 0), 0);
  }, [returnItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalUnitsToReturn <= 0) {
      return toast.error("Please specify at least 1 item to return.");
    }

    const payloadItems = [];
    for (const item of itemsWithReturnable) {
      const qty = returnItems[item.key] || 0;
      if (qty > 0) {
        payloadItems.push({
          productId: item.pId,
          variantId: item.vId,
          batchId: item.batchId || item.batch_id || null,
          quantity: qty,
          name: item.name || item.product_name || "Product"
        });
      }
    }

    setLoading(true);
    try {
      const idempotencyKey = `RET-${invoice.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const { data } = await API.post(`/sales/${invoice.id}/return`, {
        items: payloadItems,
        reason,
        refund_payment_mode: refundMode,
        idempotency_key: idempotencyKey
      });

      toast.success("Sales return processed and stock restored!");
      if (onReturnSuccess) onReturnSuccess(data);
      onClose();
    } catch (err) {
      console.error("Sales return error:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to process sales return");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sales Return — #${invoice.invoice_no || invoice.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
          <RotateCcw size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Inventory Restoration</p>
            <p className="text-blue-700 mt-0.5">
              Returned products will be immediately restored to warehouse stock and recorded in the immutable inventory movement ledger.
            </p>
          </div>
        </div>

        {/* Item Selection List */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Select Items to Return
          </label>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {itemsWithReturnable.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">No items found on this invoice.</p>
            ) : (
              itemsWithReturnable.map(item => (
                <div key={item.key} className="p-3 bg-white flex items-center justify-between gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{item.name || item.product_name || "Product"}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>Sold: {item.soldQty}</span>
                      {item.alreadyReturned > 0 && (
                        <span className="text-amber-600 font-semibold">• Prev Returned: {item.alreadyReturned}</span>
                      )}
                      <span>• Price: ₹{item.price}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.returnable > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max={item.returnable}
                          value={returnItems[item.key] || ''}
                          onChange={(e) => handleQtyChange(item.key, e.target.value, item.returnable)}
                          placeholder="0"
                          className="w-16 text-center py-1 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-blue"
                        />
                        <span className="text-xs text-slate-400">/ {item.returnable} max</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                        Fully Returned
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reason & Refund Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Return Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Damaged, Customer change, Defective"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Refund Method
            </label>
            <select
              value={refundMode}
              onChange={(e) => setRefundMode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-blue"
            >
              <option value="cash">Cash Refund</option>
              <option value="upi">UPI / Online Refund</option>
              <option value="credit">Credit to Customer Khata</option>
              <option value="store_credit">Store Credit / Note</option>
            </select>
          </div>
        </div>

        {/* Refund Total Summary */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Refund Amount</span>
            <span className="text-xs text-slate-400">{totalUnitsToReturn} unit(s) selected</span>
          </div>
          <span className="text-xl font-black text-rose-600">₹{totalRefund.toLocaleString('en-IN')}</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || totalUnitsToReturn <= 0}
            className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
          >
            <RotateCcw size={16} />
            {loading ? "Processing..." : `Process Return (₹${totalRefund.toLocaleString('en-IN')})`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
