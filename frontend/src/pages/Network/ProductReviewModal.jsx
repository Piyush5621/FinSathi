import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import {
  X, CheckCircle2, Package, Zap, AlertTriangle, ChevronRight,
  ArrowRight, Loader2, Sparkles, Tag, Scale
} from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

const STEPS = ['Review Products', 'Configure Settings', 'Confirm & Import'];

const ACTION_LABELS = {
  create: { label: 'Create New', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  match: { label: 'Match Existing', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  ignore: { label: 'Ignore', color: 'text-slate-400 bg-slate-50 border-slate-200' }
};

const MATCH_TYPE_LABELS = {
  permanent_link: { label: '🔗 Auto-linked', desc: 'Saved from previous import', color: 'text-indigo-600' },
  fuzzy: { label: '🧠 AI Suggested', desc: 'Name similarity match', color: 'text-emerald-600' },
  none: { label: '➕ New Product', desc: 'No match found', color: 'text-slate-500' },
};

export default function ProductReviewModal({ transaction, onClose, onImportDone }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const [items, setItems] = useState([]);
  const [importId, setImportId] = useState(null);

  useEffect(() => {
    loadDraft();
  }, [transaction.id]);

  const loadDraft = async () => {
    setLoading(true);
    try {
      const res = await API.post('/imports/draft', { transaction_id: transaction.id });
      const data = res.data?.data;
      setDraftData(data);
      setImportId(data?.import?.id);
      setItems((data?.items || []).map(item => ({ ...item })));
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to load product match data');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleExecuteImport = async () => {
    const toImport = items.filter(item => item.action !== 'ignore');
    if (toImport.length === 0) {
      toast.error('Please configure at least one product before importing.');
      return;
    }

    setExecuting(true);
    try {
      const payload = items.map(item => ({
        trade_item_id: item.trade_item_id,
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        purchase_price: item.purchase_price,
        gst_percent: item.gst_percent,
        category: item.category,
        unit: item.unit,
        action: item.action,
        inventory_id: item.inventory_id || null,
        selling_price: Number(item.selling_price || 0),
        mrp: Number(item.mrp || 0),
        min_stock: Number(item.min_stock || 5),
        reorder_level: Number(item.reorder_level || 10),
      }));

      await API.post('/imports/execute', { import_id: importId, items: payload });
      onImportDone();
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Import failed');
    } finally {
      setExecuting(false);
    }
  };

  const activeCount = items.filter(i => i.action !== 'ignore').length;
  const createCount = items.filter(i => i.action === 'create').length;
  const matchCount = items.filter(i => i.action === 'match').length;
  const ignoreCount = items.filter(i => i.action === 'ignore').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-indigo-600" />
              <h2 className="text-base font-black text-slate-900">Smart Import Wizard</h2>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">
              Invoice #{transaction.invoice_no} · {transaction.sender?.business_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 rounded-xl hover:bg-slate-50">
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-50 shrink-0">
          <div className="flex gap-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  i < step ? 'bg-emerald-500 text-white' :
                  i === step ? 'bg-indigo-600 text-white' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {i < step ? <CheckCircle2 size={12} /> : i + 1}
                </div>
                <span className={`text-[10px] font-bold hidden sm:block ${i === step ? 'text-indigo-700' : 'text-slate-400'}`}>{s}</span>
                {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="text-indigo-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-500">Analyzing products & finding matches...</p>
            </div>
          ) : (
            <>
              {/* Step 0: Review & Map Products */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <p className="text-xs text-slate-600 font-semibold">
                      Review {items.length} product{items.length !== 1 ? 's' : ''}. For each, choose to create new, match existing, or skip.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {items.map((item, idx) => {
                      const matchMeta = MATCH_TYPE_LABELS[item.match_type] || MATCH_TYPE_LABELS.none;
                      return (
                        <div key={idx} className={`p-4 border rounded-2xl transition-all ${item.action === 'ignore' ? 'opacity-50 border-slate-100 bg-slate-50/50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-slate-900">{item.product_name}</p>
                                {item.sku && <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{item.sku}</span>}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-semibold">
                                <span>Qty: <strong>{item.quantity}</strong> {item.unit}</span>
                                <span>Price: <strong>₹{item.purchase_price}</strong></span>
                                {item.gst_percent > 0 && <span>GST: <strong>{item.gst_percent}%</strong></span>}
                              </div>
                              {/* Match suggestion */}
                              {item.match_type !== 'none' && item.matched_inventory && (
                                <div className="flex items-center gap-1.5 mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                                  <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                                  <div className="text-[10px]">
                                    <span className={`font-black ${matchMeta.color}`}>{matchMeta.label}</span>
                                    <span className="text-slate-500"> → {item.matched_inventory.name}</span>
                                    <span className="text-slate-400"> (Stock: {item.matched_inventory.stock})</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action Selector */}
                            <div className="flex gap-1.5 flex-wrap">
                              {Object.entries(ACTION_LABELS).map(([action, meta]) => (
                                <button
                                  key={action}
                                  onClick={() => {
                                    updateItem(idx, 'action', action);
                                    if (action === 'match' && item.matched_inventory) {
                                      updateItem(idx, 'inventory_id', item.matched_inventory.id);
                                    }
                                    if (action === 'create') {
                                      updateItem(idx, 'inventory_id', null);
                                    }
                                  }}
                                  className={`text-[9px] font-black border rounded-full px-2.5 py-1 transition-all ${
                                    item.action === action ? meta.color : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                  }`}
                                >
                                  {meta.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 1: Configure Settings */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 font-semibold">
                    Configure selling prices and settings for {activeCount} product{activeCount !== 1 ? 's' : ''} to be imported.
                  </p>
                  {items.filter(i => i.action !== 'ignore').map((item, idx) => {
                    const realIdx = items.findIndex(it => it.trade_item_id === item.trade_item_id);
                    return (
                      <div key={idx} className="p-4 border border-slate-100 rounded-2xl bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.product_name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              Buy price: ₹{item.purchase_price} · Qty: {item.quantity} {item.unit}
                            </p>
                          </div>
                          <span className={`text-[9px] font-black border rounded-full px-2 py-0.5 ${ACTION_LABELS[item.action]?.color}`}>
                            {ACTION_LABELS[item.action]?.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { field: 'selling_price', label: 'Selling Price (₹)', type: 'number' },
                            { field: 'mrp', label: 'MRP (₹)', type: 'number' },
                            { field: 'gst_percent', label: 'GST %', type: 'number' },
                            { field: 'category', label: 'Category', type: 'text' },
                          ].map(({ field, label, type }) => (
                            <div key={field}>
                              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">{label}</label>
                              <input
                                type={type}
                                value={item[field] || ''}
                                onChange={e => updateItem(realIdx, field, type === 'number' ? Number(e.target.value) : e.target.value)}
                                className="w-full px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                                placeholder={type === 'number' ? '0' : 'e.g. FMCG'}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 2: Confirm & Import */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2">
                      <Sparkles size={16} /> Import Summary
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center p-3 bg-white rounded-xl">
                        <p className="text-2xl font-black text-indigo-600">{createCount}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">New Products</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-xl">
                        <p className="text-2xl font-black text-emerald-600">{matchCount}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Stock Updates</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-xl">
                        <p className="text-2xl font-black text-slate-400">{ignoreCount}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Skipped</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {items.filter(i => i.action !== 'ignore').map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${item.action === 'create' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                          <p className="text-xs font-bold text-slate-800">{item.product_name}</p>
                          <span className="text-[9px] text-slate-400">×{item.quantity}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
                          <span>Buy: ₹{item.purchase_price}</span>
                          <span>Sell: ₹{item.selling_price || '—'}</span>
                          <span className={`font-black border rounded-full px-2 py-0.5 ${ACTION_LABELS[item.action]?.color}`}>
                            {ACTION_LABELS[item.action]?.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-semibold">
                    <strong>Note:</strong> {createCount} new products will be added to your inventory. {matchCount} existing products will have their stock updated.
                    Supplier product links will be saved for faster future imports.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-between p-6 border-t border-slate-100 shrink-0 bg-slate-50/50">
            <Button
              variant="ghost"
              onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
              className="text-sm font-bold text-slate-500 hover:text-slate-800"
            >
              {step === 0 ? 'Cancel' : '← Back'}
            </Button>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 font-semibold">
                Step {step + 1} of {STEPS.length}
              </span>
              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-2 text-sm font-bold bg-indigo-600 text-white border-none hover:bg-indigo-700"
                >
                  Next <ArrowRight size={14} />
                </Button>
              ) : (
                <Button
                  onClick={handleExecuteImport}
                  disabled={executing || activeCount === 0}
                  className="flex items-center gap-2 text-sm font-bold bg-emerald-600 text-white border-none hover:bg-emerald-700 disabled:opacity-60"
                >
                  {executing ? (
                    <><Loader2 size={14} className="animate-spin" /> Importing...</>
                  ) : (
                    <><Zap size={14} /> Import {activeCount} Product{activeCount !== 1 ? 's' : ''}</>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
