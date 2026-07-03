import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { BUTTONS, TYPOGRAPHY } from '../utils/networkConstants';
import toast from 'react-hot-toast';

/**
 * Accessible Modal for posting a new listing to the Business Exchange.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Array} props.tabs - Listing types to select from
 * @param {Function} props.onSuccess - Callback after posting
 */
export default function PostListingModal({ isOpen, onClose, tabs, onSuccess }) {
  const [postStep, setPostStep] = useState(1);
  const [postType, setPostType] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', location: '', expiry: '', quantity: '', price: '', notes: '' });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Listing posted successfully!');
    onSuccess();
    setPostStep(1);
    setPostType(null);
    setForm({ title: '', description: '', location: '', expiry: '', quantity: '', price: '', notes: '' });
  };

  const handleClose = () => {
    setPostStep(1);
    setPostType(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-modal-title"
    >
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 focus:outline-none" tabIndex="-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 id="post-modal-title" className="text-lg font-black text-slate-900">Post New Listing</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Reach verified businesses across India</p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
            aria-label="Close modal"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {postStep === 1 ? (
          <div>
            <p className={TYPOGRAPHY.sectionTitle + ' mb-4'}>Select Listing Type</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setPostType(tab); setPostStep(2); }}
                  className={`p-4 border border-slate-200 rounded-xl hover:border-${tab.color}-400 hover:bg-${tab.color}-50/50 flex flex-col items-center text-center transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-${tab.color}-500`}
                >
                  <div className={`p-2.5 rounded-xl bg-${tab.color}-100 text-${tab.color}-600 mb-3 group-hover:scale-110 transition-transform`}>
                    <tab.icon size={22} aria-hidden="true" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <button 
                type="button" 
                onClick={() => setPostStep(1)} 
                className="text-xs font-bold text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              >
                ← Back
              </button>
              <span className="text-xs text-slate-300">|</span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{postType.label}</span>
            </div>
            
            <div>
              <label htmlFor="post-title" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Title <span className="text-rose-500">*</span></label>
              <Input id="post-title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. A4 Paper Reams Required" required />
            </div>
            <div>
              <label htmlFor="post-desc" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Description</label>
              <textarea 
                id="post-desc"
                rows="3" 
                className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" 
                placeholder="Provide detailed specifications..." 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})}
              ></textarea>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="post-qty" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Quantity/Volume</label>
                <Input id="post-qty" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} placeholder="e.g. 500 units" />
              </div>
              <div>
                <label htmlFor="post-price" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Price/Budget</label>
                <Input id="post-price" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="e.g. ₹20,000" />
              </div>
              <div>
                <label htmlFor="post-loc" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Location <span className="text-rose-500">*</span></label>
                <Input id="post-loc" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Delhi NCR" required />
              </div>
              <div>
                <label htmlFor="post-exp" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Expiry Date <span className="text-rose-500">*</span></label>
                <Input id="post-exp" type="date" value={form.expiry} onChange={e => setForm({...form, expiry: e.target.value})} required />
              </div>
            </div>
            <div className="pt-5 mt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button type="button" onClick={handleClose} className={BUTTONS.ghost}>
                Cancel
              </button>
              <button type="submit" className={BUTTONS.primary}>
                Post Listing
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
