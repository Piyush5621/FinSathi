import React from 'react';
import { Trash2, Plus, Minus, AlertTriangle, Package } from 'lucide-react';
import { Badge } from '../ui/Badge';

const ItemTable = ({ items = [], onRemoveItem, onUpdateItem }) => {
  if (items.length === 0) {
    return (
      <div className="w-full py-12 px-4 flex flex-col items-center justify-center bg-app-surface-subtle/50 border-y border-app-border text-center rounded-xl my-1">
        <div className="w-12 h-12 rounded-2xl bg-app-primary/10 text-app-primary flex items-center justify-center mb-2 shadow-sm">
          <Package size={22} />
        </div>
        <p className="text-app-text font-bold text-xs">Cart is empty</p>
        <p className="text-[11px] text-app-text-muted mt-0.5">Click product cards or scan barcode to add items.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* DESKTOP TABLE */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-app-border bg-app-surface">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-app-border bg-app-surface-subtle text-[10px] font-bold uppercase tracking-wider text-app-text-secondary">
              <th className="py-2.5 px-3 w-8 text-center">#</th>
              <th className="py-2.5 px-3">Item Details</th>
              <th className="py-2.5 px-3 text-center w-28">Quantity</th>
              <th className="py-2.5 px-3 text-right w-24">Price (₹)</th>
              <th className="py-2.5 px-3 text-center w-16">GST</th>
              <th className="py-2.5 px-3 text-right w-24">Total (₹)</th>
              <th className="py-2.5 px-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {items.map((item, index) => {
              const uniqueKey = item.tableId || item.id || index;
              const gstAmount = ((item.price * item.quantity) * (item.gst_percent || 0)) / 100;
              const totalWithGST = (item.amount || (item.price * item.quantity)) + gstAmount;
              const isOverStock = item.stock !== undefined && item.quantity > item.stock;

              return (
                <tr key={uniqueKey} className="hover:bg-app-surface-subtle/50 transition-colors group">
                  <td className="py-2.5 px-3 text-center text-app-text-muted font-mono text-[11px]">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-app-text leading-tight">{item.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.code && (
                        <span className="text-[10px] text-app-text-muted font-mono">{item.code}</span>
                      )}
                      {item.unit && (
                        <span className="text-[10px] text-app-text-secondary bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-semibold">{item.unit}</span>
                      )}
                      {isOverStock && (
                        <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                          <AlertTriangle size={10} /> Max {item.stock} in stock
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="inline-flex items-center border border-app-border rounded-lg bg-app-surface overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const nextQty = Math.max(1, item.quantity - 1);
                          onUpdateItem(uniqueKey, 'quantity', nextQty);
                        }}
                        className="p-1 hover:bg-app-surface-subtle text-app-text-secondary hover:text-app-text transition-colors cursor-pointer"
                        title="Decrease Quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          onUpdateItem(uniqueKey, 'quantity', Math.max(1, val));
                        }}
                        className="w-10 text-center font-bold text-xs text-app-text bg-transparent border-x border-app-border outline-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextQty = item.quantity + 1;
                          onUpdateItem(uniqueKey, 'quantity', nextQty);
                        }}
                        className="p-1 hover:bg-app-surface-subtle text-app-text-secondary hover:text-app-text transition-colors cursor-pointer"
                        title="Increase Quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={item.price}
                      onChange={(e) => onUpdateItem(uniqueKey, 'price', parseFloat(e.target.value) || 0)}
                      className="w-18 text-right font-bold text-xs text-app-text bg-app-surface-subtle border border-app-border rounded-lg px-1.5 py-1 focus:border-app-primary outline-none transition-colors"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] font-bold text-app-text-secondary bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {item.gst_percent || 0}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-xs text-app-text">
                    ₹{totalWithGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(uniqueKey)}
                      className="p-1 text-app-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE LIST */}
      <div className="sm:hidden divide-y divide-app-border border border-app-border rounded-xl bg-app-surface overflow-hidden">
        {items.map((item, index) => {
          const uniqueKey = item.tableId || item.id || index;
          const gstAmount = ((item.price * item.quantity) * (item.gst_percent || 0)) / 100;
          const totalWithGST = (item.amount || (item.price * item.quantity)) + gstAmount;

          return (
            <div key={uniqueKey} className="p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div className="min-w-0 pr-2">
                  <h4 className="font-bold text-xs text-app-text leading-tight truncate">{item.name}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted mt-0.5">
                    <span>₹{item.price}</span>
                    {item.gst_percent > 0 && <span>+ {item.gst_percent}% GST</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(uniqueKey)}
                  className="p-1 text-app-text-muted hover:text-rose-600 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="inline-flex items-center border border-app-border rounded-lg bg-app-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onUpdateItem(uniqueKey, 'quantity', Math.max(1, item.quantity - 1))}
                    className="p-1 hover:bg-app-surface-subtle text-app-text-secondary"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center font-bold text-xs text-app-text">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateItem(uniqueKey, 'quantity', item.quantity + 1)}
                    className="p-1 hover:bg-app-surface-subtle text-app-text-secondary"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <div className="font-black text-xs text-app-text">
                  ₹{totalWithGST.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ItemTable;
