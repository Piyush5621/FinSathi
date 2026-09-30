import React from 'react';
import { Trash2, Plus, Minus, AlertTriangle, Package, Sparkles } from 'lucide-react';

const ItemTable = ({ items = [], onRemoveItem, onUpdateItem }) => {
  if (items.length === 0) {
    return (
      <div className="w-full py-9 px-4 flex flex-col items-center justify-center bg-app-surface-subtle/60 border border-dashed border-app-border text-center rounded-xl my-1 select-none">
        <div className="w-10 h-10 rounded-2xl bg-app-primary/10 text-app-primary flex items-center justify-center mb-2 shadow-2xs">
          <Package size={20} />
        </div>
        <p className="text-app-text font-bold text-xs">Cart is empty</p>
        <p className="text-[11px] text-app-text-muted mt-0.5 max-w-[200px]">
          Click products from the catalog or scan barcode to add.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {items.map((item, index) => {
        const uniqueKey = item.tableId || item.id || index;
        const gstAmount = ((Number(item.price || 0) * Number(item.quantity || 1)) * Number(item.gst_percent || 0)) / 100;
        const totalWithGST = (Number(item.amount || (item.price * item.quantity))) + gstAmount;
        const isOverStock = item.stock !== undefined && item.quantity > item.stock;

        return (
          <div
            key={uniqueKey}
            className="p-2.5 rounded-xl border border-app-border bg-app-surface hover:border-app-border-hover transition-all duration-150 space-y-2 group shadow-2xs"
          >
            {/* Top row: Name, SKU, Unit, Remove */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs text-app-text leading-snug">
                    {item.name}
                  </span>
                  {item.unit && (
                    <span className="text-[10px] font-semibold text-app-text-secondary bg-app-surface-subtle border border-app-border px-1.5 py-0.2 rounded-md">
                      {item.unit}
                    </span>
                  )}
                  {Number(item.gst_percent) > 0 && (
                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded">
                      +{item.gst_percent}% GST
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-app-text-muted mt-0.5">
                  {item.code && (
                    <span className="font-mono">{item.code}</span>
                  )}
                  {isOverStock && (
                    <span className="text-rose-600 font-bold flex items-center gap-0.5">
                      <AlertTriangle size={10} /> Max {item.stock} in stock
                    </span>
                  )}
                </div>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemoveItem(uniqueKey)}
                className="p-1 text-app-text-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Remove item from cart"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Bottom row: Inline Tactile Quantity + Unit Price + Line Total */}
            <div className="flex items-center justify-between pt-1 border-t border-app-border/50 gap-2">
              {/* Quantity Controls */}
              <div className="inline-flex items-center border border-app-border rounded-lg bg-app-surface-subtle overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    const nextQty = Math.max(1, item.quantity - 1);
                    onUpdateItem(uniqueKey, 'quantity', nextQty);
                  }}
                  className="w-7 h-7 flex items-center justify-center hover:bg-app-border/40 text-app-text-secondary hover:text-app-text transition-colors cursor-pointer"
                  title="Decrease quantity"
                >
                  <Minus size={11} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    onUpdateItem(uniqueKey, 'quantity', Math.max(1, val));
                  }}
                  className="w-9 h-7 text-center font-bold text-xs text-app-text bg-app-surface border-x border-app-border outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextQty = item.quantity + 1;
                    onUpdateItem(uniqueKey, 'quantity', nextQty);
                  }}
                  className="w-7 h-7 flex items-center justify-center hover:bg-app-border/40 text-app-text-secondary hover:text-app-text transition-colors cursor-pointer"
                  title="Increase quantity"
                >
                  <Plus size={11} />
                </button>
              </div>

              {/* Price & Line Total */}
              <div className="flex items-center gap-2 text-right">
                <div className="flex items-center gap-1 text-[11px] text-app-text-muted">
                  <span>@</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.price}
                    onChange={(e) => onUpdateItem(uniqueKey, 'price', parseFloat(e.target.value) || 0)}
                    className="w-16 text-right font-bold text-xs text-app-text bg-app-surface-subtle border border-app-border rounded-md px-1.5 py-0.5 focus:border-app-primary outline-none font-mono transition-colors"
                    title="Edit item unit price"
                  />
                </div>
                <div className="font-black text-xs text-app-text font-mono min-w-[70px]">
                  ₹{totalWithGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ItemTable;
