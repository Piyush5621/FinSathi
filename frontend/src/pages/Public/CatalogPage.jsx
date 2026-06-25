import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../../services/apiClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ShoppingCart, Send, ChevronRight, Package, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Skeleton from '../../components/ui/Skeleton';

export default function CatalogPage() {
  const { businessSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState(null);
  const [business, setBusiness] = useState(null);
  const [cart, setCart] = useState({});
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ customerName: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCatalog();
  }, [businessSlug]);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/catalog/${businessSlug}`);
      setCatalog(data.catalog);
      setBusiness(data.business);
    } catch (err) {
      toast.error("Catalog not found or offline");
    } finally {
      setLoading(false);
    }
  };

  const updateCart = (product, delta) => {
    setCart(prev => {
      const newQty = (prev[product.id]?.quantity || 0) + delta;
      if (newQty <= 0) {
        const { [product.id]: _, ...rest } = prev;
        return rest;
      }
      return { 
        ...prev, 
        [product.id]: { ...product, quantity: newQty } 
      };
    });
  };

  const totalItems = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = Object.values(cart).reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!customerInfo.customerName || !customerInfo.phone) return toast.error("Please fill your details");
    if (totalItems === 0) return toast.error("Cart is empty");

    try {
      setSubmitting(true);
      const payload = {
        ...customerInfo,
        items: Object.values(cart)
      };
      const { data } = await API.post(`/catalog/${businessSlug}/orders`, payload);
      toast.success(data.message, { duration: 5000 });
      setCart({});
      setShowOrderForm(false);
    } catch (err) {
      toast.error("Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col gap-6">
       <Skeleton height="200px" rounded="rounded-3xl" />
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} height="120px" rounded="rounded-2xl" />)}
       </div>
    </div>
  );

  if (!catalog) return (
    <div className="min-h-screen flex items-center justify-center bg-white p-10 text-center">
       <div>
          <Package size={64} className="text-slate-200 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900">Catalog Not Found</h1>
          <p className="text-slate-500 mt-2">This business link may be incorrect or deactivated.</p>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-8 md:p-12 rounded-b-[40px] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-10"><Package size={200} /></div>
         <div className="relative z-10 flex flex-col items-center text-center">
            {business.logo ? (
                <img src={business.logo} alt="Logo" className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg mb-4 object-cover" />
            ) : (
                <div className="w-20 h-20 rounded-2xl bg-white text-indigo-600 flex items-center justify-center text-3xl font-black shadow-lg mb-4 uppercase">
                    {business.name.charAt(0)}
                </div>
            )}
            <h1 className="text-3xl font-black tracking-tight">{business.name}</h1>
            <Badge className="bg-indigo-500/50 text-white mt-2 border-indigo-400">Official Digital Catalog</Badge>
         </div>
      </div>

      {/* Main Catalog View */}
      <div className="max-w-4xl mx-auto p-6 space-y-10 mt-6">
         {Object.entries(catalog).map(([company, products]) => (
            <div key={company} className="space-y-4">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">{company}</h3>
               <div className="grid grid-cols-1 gap-4">
                  {products.map(product => (
                     <Card key={product.id} className="p-4 flex items-center justify-between hover:shadow-md transition-all border-slate-100">
                        <div className="flex-1">
                           <h4 className="font-bold text-slate-900">{product.name}</h4>
                           <p className="text-xs text-slate-500 line-clamp-1">{product.description || 'No description available'}</p>
                           <div className="mt-2 flex items-center gap-3">
                              <span className="text-lg font-black text-indigo-600">₹{product.selling_price}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-bold">per {product.unit || 'unit'}</span>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border border-slate-100">
                           {cart[product.id] ? (
                              <div className="flex items-center gap-4">
                                 <button onClick={() => updateCart(product, -1)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-900">-</button>
                                 <span className="font-black text-sm w-4 text-center">{cart[product.id].quantity}</span>
                                 <button onClick={() => updateCart(product, 1)} className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">+</button>
                              </div>
                           ) : (
                              <button onClick={() => updateCart(product, 1)} className="px-6 py-2 bg-white border border-indigo-100 text-indigo-600 text-xs font-black rounded-lg hover:bg-indigo-600 hover:text-white transition-all uppercase flex items-center gap-2">
                                 <Plus size={14} /> Add
                              </button>
                           )}
                        </div>
                     </Card>
                  ))}
               </div>
            </div>
         ))}
      </div>

      {/* Floating Checkout Bar */}
      {totalItems > 0 && !showOrderForm && (
         <div className="fixed bottom-6 left-6 right-6 z-50">
            <button 
               onClick={() => setShowOrderForm(true)}
               className="w-full bg-indigo-600 text-white p-5 rounded-2xl shadow-[0_20px_50px_rgba(79,70,229,0.4)] flex items-center justify-between group transition-all hover:scale-[1.02] active:scale-95"
            >
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                     <ShoppingCart size={20} />
                  </div>
                  <div className="text-left">
                     <p className="text-[10px] font-black uppercase opacity-70 tracking-widest leading-none">Your Cart</p>
                     <p className="text-lg font-black">{totalItems} items · ₹{totalPrice.toLocaleString()}</p>
                  </div>
               </div>
               <div className="flex items-center gap-2 font-black uppercase text-sm">
                  Place Order <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </div>
            </button>
         </div>
      )}

      {/* Order Dialog Shell */}
      {showOrderForm && (
         <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
            <Card className="w-full max-w-md p-8 animate-scale-in">
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Confirm Order</h2>
               <p className="text-slate-500 text-sm mt-1">Ready to shop! Let the business owner know who you are.</p>
               
               <form onSubmit={handleSubmitOrder} className="mt-8 space-y-4">
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Your Name</label>
                     <input 
                        type="text" required
                        placeholder="e.g. Rahul Kumar"
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                        value={customerInfo.customerName}
                        onChange={e => setCustomerInfo({...customerInfo, customerName: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Phone Number</label>
                     <input 
                        type="tel" required
                        placeholder="10-digit mobile"
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                        value={customerInfo.phone}
                        onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                     />
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mt-6">
                     <div className="flex justify-between items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                        <span>Items</span>
                        <span>Estimated Total</span>
                     </div>
                     <div className="flex justify-between items-end mt-1">
                        <span className="font-bold text-slate-800">{totalItems} Products</span>
                        <span className="text-xl font-black text-indigo-600">₹{totalPrice.toLocaleString()}</span>
                     </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <Button type="button" variant="ghost" className="flex-1 font-black" onClick={() => setShowOrderForm(false)}>Cancel</Button>
                     <Button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 font-black gap-2">
                        {submitting ? 'Processing...' : <>Submit Order <Send size={16} /></>}
                     </Button>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1 mt-4">
                     <Info size={10} /> After submission, {business.name} will contact you on WhatsApp.
                  </p>
               </form>
            </Card>
         </div>
      )}
    </div>
  );
}

function Plus({ size }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
