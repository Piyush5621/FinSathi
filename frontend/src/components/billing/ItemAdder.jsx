import React, { useState, useEffect } from "react";
import Select from "react-select";
import { PlusCircle, Tag, Layers } from "lucide-react";
import toast from "react-hot-toast";

const ItemAdder = ({ products = [], onAddItem }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [priceTier, setPriceTier] = useState("retail"); // 'retail' | 'wholesale'

  // Build options for react-select
  const productOptions = products.map((product) => ({
    value: product.id,
    label: `${product.company ? `[${product.company}] ` : ""}${product.name} ${product.sku ? `(${product.sku})` : ""} – Stock: ${product.stock}`,
    ...product,
  }));

  // When Product is Selected
  useEffect(() => {
    if (selectedProduct) {
      const batches = selectedProduct.inventory_batches || [];
      // Default to the first batch found, or if none, fallback to product master values (legacy)
      let initialBatch = null;

      if (batches.length > 0) {
        // Try to find a batch with stock > 0
        initialBatch = batches.find(b => b.stock > 0) || batches[0];
      }

      setSelectedBatch(initialBatch);

      // Inherit GST
      setGstPercent(selectedProduct.gst_percent || 0);

      if (initialBatch) {
        setPrice(Number(initialBatch.selling_price));
        setPriceTier('retail');
      } else {
        // Legacy path for old items without batches
        setPrice(Number(selectedProduct.price || 0));
        setPriceTier('retail');
      }
    } else {
      setSelectedBatch(null);
      setPrice(0);
      setGstPercent(0);
    }
  }, [selectedProduct]);

  // When Batch or Tier Changes
  useEffect(() => {
    if (!selectedProduct) return;

    if (selectedBatch) {
      // Use Batch Pricing
      const p = priceTier === 'wholesale' ? (selectedBatch.wholesale_price || selectedBatch.selling_price) : selectedBatch.selling_price;
      setPrice(Number(p));
    } else {
      // Use Product Master Pricing
      const p = priceTier === 'wholesale' ? (selectedProduct.wholesale_price || selectedProduct.price) : selectedProduct.price;
      setPrice(Number(p));
    }
  }, [selectedBatch, priceTier, selectedProduct]);

  // Recalculate subtotal
  useEffect(() => {
    setSubtotal(quantity * price);
  }, [quantity, price]);

  const handleAddItem = () => {
    if (!selectedProduct) return toast.error("Please select a product");
    if (quantity < 1) return toast.error("Quantity must be at least 1");

    // Stock Validation
    const currentStock = selectedBatch ? selectedBatch.stock : (selectedProduct.stock || 0);
    if (quantity > currentStock) {
      return toast.error(`Insufficient stock! Only ${currentStock} available in this batch.`);
    }

    onAddItem({
      productId: selectedProduct.id,
      batchId: selectedBatch ? selectedBatch.id : null, // Backend needs this
      name: selectedProduct.name,
      code: selectedBatch ? (selectedBatch.sku_variant || selectedProduct.sku) : selectedProduct.sku,
      unit: selectedProduct.units || selectedProduct.unit || "",
      quantity,
      price,
      cost_price: selectedBatch ? selectedBatch.cost_price : (selectedProduct.cost_price || 0),
      gst_percent: gstPercent,
      amount: subtotal,
      // Metadata for display
      meta: selectedBatch ? `Batch: ${selectedBatch.batch_name || 'Standard'}` : 'Legacy Stock'
    });

    // Reset
    setSelectedProduct(null);
    setSelectedBatch(null);
    setQuantity(1);
    setPrice(0);
    setGstPercent(0);
    setSubtotal(0);
    toast.success("Item added");
  };

  const batches = selectedProduct?.inventory_batches || [];

  return (
    <div>
      <h3 className="text-emerald-400 text-lg font-bold mb-4 flex items-center gap-2">
        <PlusCircle size={20} /> Add Items
      </h3>

      <div className="flex flex-wrap gap-4 items-end">
        {/* Product Search */}
        <div className="flex-1 min-w-[240px]">
          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 block">Product Search</label>
          <Select
            value={selectedProduct}
            onChange={setSelectedProduct}
            options={productOptions}
            placeholder="Scan SKU or Search..."
            isClearable
            className="text-sm font-medium"
            styles={{
              control: (base, state) => ({
                ...base,
                borderRadius: "0.75rem",
                backgroundColor: "#1e293b",
                border: state.isFocused ? "1px solid #10b981" : "1px solid #334155",
                color: "white",
                boxShadow: "none",
                padding: "2px"
              }),
              singleValue: (base) => ({ ...base, color: "white" }),
              input: (base) => ({ ...base, color: "white" }),
              menu: (base) => ({
                ...base,
                backgroundColor: "#1e293b",
                color: "white",
                border: "1px solid #334155",
                zIndex: 50
              }),
              option: (styles, { isFocused }) => ({
                ...styles,
                backgroundColor: isFocused ? "#334155" : "#1e293b",
                color: "white",
                cursor: "pointer",
              }),
              placeholder: (base) => ({ ...base, color: "#94a3b8" })
            }}
          />
        </div>

        {/* Batch Selector (Only if product selected and has batches) */}
        {selectedProduct && batches.length > 0 && (
          <div className="w-48">
            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 block flex items-center gap-1">
              <Layers size={12} /> Batch / Lot
            </label>
            <select
              value={selectedBatch?.id || ""}
              onChange={(e) => {
                const b = batches.find(x => x.id === e.target.value);
                setSelectedBatch(b);
              }}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl py-2.5 px-3 text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.batch_name || 'Lot'} (Qty: {b.stock}) - CP: {b.cost_price}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Qty */}
        <div className="w-20">
          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 block">Qty</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-full bg-slate-800 border border-slate-600 rounded-xl py-2.5 px-3 text-center font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Price & Tier */}
        <div className="w-32 relative">
          <div className="flex justify-between items-center mb-1">
            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Price</label>
            {((selectedBatch && selectedBatch.wholesale_price > 0) || (!selectedBatch && selectedProduct?.wholesale_price > 0)) && (
              <select
                value={priceTier}
                onChange={(e) => setPriceTier(e.target.value)}
                className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded px-1 outline-none"
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </select>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₹</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl py-2.5 pl-7 pr-3 font-mono font-bold text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Subtotal */}
        <div className="w-32 hidden md:block">
          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 block text-right">Total</label>
          <div className="py-2.5 px-3 bg-slate-900/50 border border-slate-700 rounded-xl text-emerald-400 font-bold font-mono text-right">
            ₹{subtotal.toFixed(2)}
          </div>
        </div>

        <button
          onClick={handleAddItem}
          disabled={!selectedProduct}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-6 py-2.5 font-bold flex items-center gap-2 transition-all active:scale-95 h-[46px]"
        >
          <PlusCircle size={20} />
        </button>
      </div>
    </div>
  );
};

export default ItemAdder;
