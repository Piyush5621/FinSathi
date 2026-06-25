import {  useState, useEffect, memo  } from 'react';
import AsyncSelect from "react-select/async";
import API from "../../services/apiClient";
import toast from "react-hot-toast";
import { Button } from "../ui/Button";

const ItemAdder = memo(({ onAddItem }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [priceTier, setPriceTier] = useState("retail");

  // Debounced API search
  let debounceTimer;
  const loadOptions = (inputValue) => new Promise((resolve) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!inputValue || inputValue.length < 2) return resolve([]);
      try {
        const res = await API.get(`/inventory/search?q=${inputValue}`);
        resolve(res.data.map(p => ({
          value: p.id,
          label: `${p.name} ${p.sku ? `(${p.sku})` : ""} – Stock: ${p.stock}`,
          ...p
        })));
      } catch (e) {
        console.error(e);
        resolve([]);
      }
    }, 300);
  });

  useEffect(() => {
    if (selectedProduct) {
      const batches = selectedProduct.inventory_batches || [];
      let initialBatch = null;
      if (batches.length > 0) {
        initialBatch = batches.find(b => b.stock > 0) || batches[0];
      }
      setSelectedBatch(initialBatch);
      setGstPercent(selectedProduct.gst_percent || 0);

      if (initialBatch) {
        setPrice(Number(initialBatch.selling_price));
        setPriceTier('retail');
      } else {
        setPrice(Number(selectedProduct.price || 0));
        setPriceTier('retail');
      }
    } else {
      setSelectedBatch(null);
      setPrice(0);
      setGstPercent(0);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) return;
    if (selectedBatch) {
      const p = priceTier === 'wholesale' ? (selectedBatch.wholesale_price || selectedBatch.selling_price) : selectedBatch.selling_price;
      setPrice(Number(p));
    } else {
      const p = priceTier === 'wholesale' ? (selectedProduct.wholesale_price || selectedProduct.price) : selectedProduct.price;
      setPrice(Number(p));
    }
  }, [selectedBatch, priceTier, selectedProduct]);

  useEffect(() => {
    setSubtotal(quantity * price);
  }, [quantity, price]);

  const handleAddItem = () => {
    if (!selectedProduct) return toast.error("Please select a product");
    if (quantity < 1) return toast.error("Quantity must be at least 1");

    const currentStock = selectedBatch ? selectedBatch.stock : (selectedProduct.stock || 0);
    if (quantity > currentStock) {
      return toast.error(`Insufficient stock! Only ${currentStock} available in this batch.`);
    }

    onAddItem({
      productId: selectedProduct.id,
      batchId: selectedBatch ? selectedBatch.id : null,
      name: selectedProduct.name,
      code: selectedBatch ? (selectedBatch.sku_variant || selectedProduct.sku) : selectedProduct.sku,
      unit: selectedProduct.units || selectedProduct.unit || "",
      quantity,
      price,
      cost_price: selectedBatch ? selectedBatch.cost_price : (selectedProduct.cost_price || 0),
      gst_percent: gstPercent,
      amount: subtotal,
      meta: selectedBatch ? `Batch: ${selectedBatch.batch_name || 'Standard'}` : 'Legacy Stock'
    });

    setSelectedProduct(null);
    setSelectedBatch(null);
    setQuantity(1);
    setPrice(0);
    setGstPercent(0);
    setSubtotal(0);
  };

  const batches = selectedProduct?.inventory_batches || [];

  return (
    <div className="py-2 bg-white">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        
        <div className="flex-1 min-w-[240px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Product Search</label>
          <AsyncSelect
            value={selectedProduct}
            onChange={setSelectedProduct}
            loadOptions={loadOptions}
            defaultOptions={false}
            placeholder="Search Products... (min 2 chars)"
            isClearable
            className="text-xs"
            styles={{
              control: (base, state) => ({
                ...base,
                borderRadius: "0.75rem",
                backgroundColor: "#FFFFFF",
                border: state.isFocused ? "1px solid #2483F5" : "1px solid #E5E7EB",
                color: "#1F2937",
                boxShadow: "none",
                minHeight: "40px"
              }),
              singleValue: (base) => ({ ...base, color: "#1F2937", fontWeight: 500 }),
              input: (base) => ({ ...base, color: "#1F2937" }),
              menu: (base) => ({
                ...base,
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "0.75rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                zIndex: 50
              }),
              option: (styles, { isFocused }) => ({
                ...styles,
                backgroundColor: isFocused ? "#F9FAFB" : "#FFFFFF",
                color: "#374151",
                fontSize: "12px",
                cursor: "pointer",
              }),
            }}
          />
        </div>

        {selectedProduct && batches.length > 0 && (
          <div className="w-[180px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Batch</label>
            <select
              value={selectedBatch?.id || ""}
              onChange={(e) => setSelectedBatch(batches.find(x => x.id === e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl h-10 px-3.5 text-xs text-slate-800 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-medium"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.batch_name || 'Lot'} (Qty: {b.stock})</option>
              ))}
            </select>
          </div>
        )}

        <div className="w-[80px]">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Qty</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-full bg-white border border-slate-200 rounded-xl h-10 px-3 text-center text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
          />
        </div>

        <div className="w-[120px]">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price</label>
            {((selectedBatch && selectedBatch.wholesale_price > 0) || (!selectedBatch && selectedProduct?.wholesale_price > 0)) && (
              <select value={priceTier} onChange={(e) => setPriceTier(e.target.value)} className="text-[9px] bg-slate-50 text-slate-600 border border-slate-100 rounded outline-none p-0.5 font-semibold">
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </select>
            )}
          </div>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-white border border-slate-200 rounded-xl h-10 px-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
          />
        </div>

        <Button onClick={handleAddItem} disabled={!selectedProduct} className="h-10 px-5 rounded-xl font-bold text-xs shrink-0 active:scale-[0.98]">
          Add Item
        </Button>
      </div>
    </div>
  );
});

export default ItemAdder;
