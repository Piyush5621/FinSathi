import {  useState, useEffect  } from 'react';
import Select from "react-select";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../ui/Button";

const ItemAdder = ({ products = [], onAddItem }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [priceTier, setPriceTier] = useState("retail");

  const productOptions = products.map((product) => ({
    value: product.id,
    label: `${product.name} ${product.sku ? `(${product.sku})` : ""} – Stock: ${product.stock}`,
    ...product,
  }));

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
    <div className="py-[16px]">
      <div className="flex flex-col md:flex-row gap-[16px] items-end">
        
        <div className="flex-1 min-w-[240px]">
          <label className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-[4px] block">Product Search</label>
          <Select
            value={selectedProduct}
            onChange={setSelectedProduct}
            options={productOptions}
            placeholder="Scan SKU or Search..."
            isClearable
            className="text-[14px]"
            styles={{
              control: (base, state) => ({
                ...base,
                borderRadius: "0.5rem",
                backgroundColor: "#FFFFFF",
                border: state.isFocused ? "1px solid #3B82F6" : "1px solid #E2E8F0",
                color: "#0F172A",
                boxShadow: "none",
                minHeight: "42px"
              }),
              singleValue: (base) => ({ ...base, color: "#0F172A" }),
              input: (base) => ({ ...base, color: "#0F172A" }),
              menu: (base) => ({
                ...base,
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                zIndex: 50
              }),
              option: (styles, { isFocused }) => ({
                ...styles,
                backgroundColor: isFocused ? "#F8FAFC" : "#FFFFFF",
                color: "#334155",
                cursor: "pointer",
              }),
            }}
          />
        </div>

        {selectedProduct && batches.length > 0 && (
          <div className="w-[180px]">
            <label className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-[4px] block">Batch</label>
            <select
              value={selectedBatch?.id || ""}
              onChange={(e) => setSelectedBatch(batches.find(x => x.id === e.target.value))}
              className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg h-[42px] px-[12px] text-[14px] text-[#0F172A] focus:ring-1 focus:ring-[#3B82F6] outline-none"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.batch_name || 'Lot'} (Qty: {b.stock})</option>
              ))}
            </select>
          </div>
        )}

        <div className="w-[80px]">
          <label className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider mb-[4px] block">Qty</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg h-[42px] px-[12px] text-center font-bold text-[#0F172A] focus:ring-1 focus:ring-[#3B82F6] outline-none"
          />
        </div>

        <div className="w-[120px]">
          <div className="flex justify-between items-center mb-[4px]">
            <label className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider">Price</label>
            {((selectedBatch && selectedBatch.wholesale_price > 0) || (!selectedBatch && selectedProduct?.wholesale_price > 0)) && (
              <select value={priceTier} onChange={(e) => setPriceTier(e.target.value)} className="text-[10px] bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] rounded outline-none">
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
              </select>
            )}
          </div>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg h-[42px] px-[12px] font-medium text-[#0F172A] focus:ring-1 focus:ring-[#3B82F6] outline-none"
          />
        </div>

        <Button onClick={handleAddItem} disabled={!selectedProduct} className="h-[42px] px-[24px]">
          Add
        </Button>
      </div>
    </div>
  );
};

export default ItemAdder;
