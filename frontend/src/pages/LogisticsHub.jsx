import {  useState, useEffect  } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Truck, Warehouse, ShoppingCart, Package, Plus, ArrowRight, Timer, AlertCircle, BarChart3, MapPin, Building2, Search, History, Navigation, Info, Layers, Globe, Briefcase } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';

export default function LogisticsHub() {
  const [activeTab, setActiveTab] = useState('overview');
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isWHModalOpen, setIsWHModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [whRes, poRes, suppRes, invRes] = await Promise.all([
        supabase.from('warehouses').select('*').order('created_at', {ascending: false}),
        supabase.from('purchase_orders').select('*, suppliers(name), warehouses(name)').order('created_at', {ascending: false}),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('inventory').select('*').order('name')
      ]);

      setWarehouses(whRes.data || []);
      setPurchaseOrders(poRes.data || []);
      setSuppliers(suppRes.data || []);
      setInventory(invRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Network synchronization error");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'warehouses', name: 'Multi-Warehouse', icon: Warehouse },
    { id: 'pos', name: 'Orders Hub', icon: ShoppingCart },
    { id: 'logistics', name: 'Live Tracking', icon: Truck },
  ];

  return (
    <div className="space-y-[32px] animate-fade-in-up pb-[140px] font-inter">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-6">
           <div className="w-20 h-20 bg-brand-navy rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-slate-300">
              <Globe size={36} className="animate-spin-slow" />
           </div>
           <div>
              <h1 className="text-[32px] font-black text-brand-navy tracking-tighter">Supply Chain Engine</h1>
              <div className="flex items-center gap-4 mt-1">
                 <p className="text-[12px] text-brand-blue font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" /> Global Node Active
                 </p>
                 <span className="text-slate-300">|</span>
                 <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest">{warehouses.length} Active Storage Terminals</p>
              </div>
           </div>
        </div>
        <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsSupplierModalOpen(true)} icon={<Briefcase size={18} />}>Add Vendor</Button>
            <Button onClick={() => setIsPOModalOpen(true)} icon={<ShoppingCart size={18} />} className="shadow-2xl shadow-brand-blue/30">Release PO</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center font-black text-brand-blue/30 animate-pulse text-[24px]">
           Syncing Global Logistics Matrix...
        </div>
      ) : (
        <div className="min-h-[600px]">
           {activeTab === 'overview' && <OverviewTab warehouses={warehouses} pos={purchaseOrders} setTab={setActiveTab} />}
           {activeTab === 'warehouses' && <WarehouseTab warehouses={warehouses} setOpen={setIsWHModalOpen} />}
           {activeTab === 'pos' && <POTab pos={purchaseOrders} />}
           {activeTab === 'logistics' && <LogisticsTracker pos={purchaseOrders} />}
        </div>
      )}

      {/* Tabs Navigation (Floating Style) */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white p-2 rounded-[32px] shadow-2xl flex gap-2 z-[90]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-8 py-4 rounded-[24px] text-[14px] font-black transition-all ${
                activeTab === tab.id 
                  ? 'bg-brand-navy text-white shadow-xl scale-[1.05]' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={18} />
              <span className="hidden lg:block">{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* MODALS */}
      <CreateWHModal isOpen={isWHModalOpen} onClose={() => setIsWHModalOpen(false)} refresh={fetchData} />
      <CreatePOModal isOpen={isPOModalOpen} onClose={() => setIsPOModalOpen(false)} refresh={fetchData} suppliers={suppliers} warehouses={warehouses} />
      <CreateSupplierModal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} refresh={fetchData} />
    </div>
  );
}

function OverviewTab({ warehouses, pos, setTab }) {
    const totalPosAmt = pos.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
    const inTransit = pos.filter(p => p.status === 'shipping' || p.status === 'shipped').length;

    return (
        <div className="space-y-12">
            {/* EDUCATIONAL WORKFLOW CARD */}
            <Card className="bg-gradient-to-r from-brand-navy to-slate-800 border-none p-12 relative overflow-hidden text-white shadow-2xl">
               <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 translate-x-1/4 pointer-events-none" />
               <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div>
                     <h3 className="text-[12px] font-black text-brand-blue uppercase tracking-[0.4em] mb-4">Onboarding Guide</h3>
                     <h2 className="text-[36px] font-black tracking-tighter leading-tight">Master your Global Supply Chain in 4 Steps.</h2>
                     <p className="mt-6 text-slate-300 text-[16px] leading-relaxed max-w-md font-medium">
                        Logistics Hub is where you buy products in bulk from suppliers and track them as they arrive at your warehouses.
                     </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[
                        { step: '01', title: 'Add Suppliers', desc: 'Onboard Vendors who provide your stock.', icon: Briefcase },
                        { step: '02', title: 'Setup Depots', desc: 'Define where products will be stored.', icon: Warehouse },
                        { step: '03', title: 'Release PO', desc: 'Create Purchase Orders to buy stock.', icon: ShoppingCart },
                        { step: '04', title: 'Track Live', desc: 'Watch your shipments move in real-time.', icon: Truck },
                     ].map(item => (
                        <div key={item.step} className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-all cursor-default group">
                           <item.icon size={20} className="text-brand-blue mb-3 group-hover:scale-125 transition-transform" />
                           <p className="text-[10px] font-black text-white/30 mb-1">{item.step}</p>
                           <h4 className="font-black text-[15px]">{item.title}</h4>
                           <p className="text-[12px] text-slate-400 font-medium mt-1">{item.desc}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </Card>

            {/* STATISTICS HUD */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <Card className="lg:col-span-8 p-10 border-slate-100 shadow-xl shadow-slate-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-[22px] font-black text-brand-navy tracking-tight">Supply Network Map</h3>
                        <p className="text-[13px] text-slate-400 font-bold uppercase tracking-widest mt-1">Simulating {warehouses.length} Active Transit Nodes</p>
                     </div>
                     <Badge variant="success" className="px-4 py-1.5 rounded-full">OPTIMIZED</Badge>
                  </div>
                  <div className="mt-10 h-[320px] bg-slate-50/50 border border-dashed border-slate-200 rounded-[48px] flex flex-col items-center justify-center group overflow-hidden relative">
                     <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent pointer-events-none" />
                     <Navigation size={64} className="text-brand-blue/20 mb-6 animate-pulse" />
                     <p className="text-slate-400 font-black text-[16px] animate-fade-in">Visual Intelligence Mapping System</p>
                     <p className="text-slate-300 text-[12px] mt-2 font-bold uppercase tracking-[0.2em] italic">Rendering carrier routes...</p>
                  </div>
               </Card>

               <div className="lg:col-span-4 space-y-8">
                  <Card className="bg-[#3B82F6] text-white p-10 shadow-2xl shadow-brand-blue/20 flex flex-col justify-between h-[300px]">
                     <div>
                        <ShoppingCart size={40} className="mb-6 opacity-30" />
                        <h4 className="text-[12px] font-black uppercase tracking-[0.3em] opacity-70">Inventory Commitment</h4>
                        <p className="text-[42px] font-black mt-1">₹{totalPosAmt.toLocaleString()}</p>
                     </div>
                     <Button variant="ghost" className="w-full bg-white/10 hover:bg-white text-white hover:text-brand-blue font-black rounded-3xl mt-4" onClick={() => setTab('pos')}>
                        Manage Purchase Orders <ArrowRight size={18} className="ml-2" />
                     </Button>
                  </Card>

                  <Card className="p-10 shadow-xl shadow-slate-100 h-[300px] flex flex-col">
                     <h3 className="text-[16px] font-black text-brand-navy mb-8">Shipment Distribution</h3>
                     <div className="flex-1 flex flex-col justify-center gap-8">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 bg-slate-900 rounded-[22px] flex items-center justify-center text-white shadow-xl">
                              <Truck size={28} />
                           </div>
                           <div>
                              <p className="text-[32px] font-black text-brand-navy leading-none">{inTransit}</p>
                              <p className="text-[12px] text-slate-400 font-black uppercase mt-1 tracking-widest">In-Transit Freight</p>
                           </div>
                        </div>
                        <Button variant="secondary" fullWidth className="rounded-2xl py-4" onClick={() => setTab('logistics')}>
                           Launch Live Tracker
                        </Button>
                     </div>
                  </Card>
               </div>
            </div>
        </div>
    );
}

function WarehouseTab({ warehouses, setOpen }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {warehouses.map(wh => (
                <Card key={wh.id} className="hover:shadow-2xl hover:shadow-slate-200 transition-all cursor-pointer p-10 group border-slate-100 border-2">
                    <div className="flex justify-between items-start mb-10">
                       <div className="w-16 h-16 bg-slate-900 rounded-[28px] flex items-center justify-center text-white shadow-xl group-hover:bg-brand-blue group-hover:-rotate-6 transition-all">
                          <Building2 size={32} />
                       </div>
                       {wh.is_main_hub ? <Badge variant="success" className="px-4 py-1">MASTER</Badge> : <Badge variant="gray" className="px-4 py-1">NODE</Badge>}
                    </div>
                    <h4 className="text-[22px] font-black text-brand-navy mb-1 group-hover:text-brand-blue transition-colors">{wh.name}</h4>
                    <p className="text-[14px] text-slate-400 font-bold flex items-center gap-2 mb-8"><MapPin size={16} className="text-brand-blue" /> {wh.location}</p>
                    
                    <div className="pt-8 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-3">
                           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Storage Efficiency</p>
                           <p className="text-[16px] font-black text-brand-navy">{wh.capacity_used}%</p>
                        </div>
                        <div className="h-3 bg-slate-50 rounded-full relative overflow-hidden">
                           <div className={`absolute top-0 left-0 h-full transition-all duration-1000 ${wh.capacity_used > 80 ? 'bg-rose-500' : 'bg-brand-blue'}`} style={{width: `${wh.capacity_used}%`}} />
                        </div>
                        {wh.capacity_used > 80 && (
                           <p className="mt-3 text-[11px] font-black text-rose-500 uppercase flex items-center gap-1"><AlertCircle size={14} /> At Critical Threshold</p>
                        )}
                    </div>
                </Card>
            ))}
            <div 
               onClick={() => setOpen(true)}
               className="border-4 border-dashed border-slate-100 rounded-[48px] p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all group"
            >
               <div className="w-16 h-16 bg-white shadow-xl border border-slate-50 rounded-full flex items-center justify-center group-hover:scale-125 transition-transform">
                  <Plus size={32} className="text-brand-blue" />
               </div>
               <p className="mt-6 text-slate-400 font-black text-[16px] tracking-tight">Deploy New Local Depot</p>
               <p className="mt-1 text-slate-300 text-[11px] font-bold uppercase">Multi-Tenant Scalability Active</p>
            </div>
        </div>
    );
}

function POTab({ pos }) {
    return (
        <Card className="noPadding overflow-hidden border-slate-100 shadow-2xl rounded-[40px]">
            <div className="p-8 bg-slate-50/50 border-b border-white flex flex-col sm:flex-row justify-between items-center gap-4">
               <div>
                  <h3 className="text-[18px] font-black text-brand-navy">Inventory Acquisition Book</h3>
                  <p className="text-[12px] text-slate-400 font-bold tracking-widest uppercase">Verified Purchase Orders</p>
               </div>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200">
                     <Search size={16} className="text-slate-400" />
                     <input type="text" placeholder="Scan Reference..." className="bg-transparent border-none outline-none text-[13px] font-bold text-brand-navy w-[150px]" />
                  </div>
                  <Button variant="ghost" size="sm"><History size={16} /></Button>
               </div>
            </div>
            <div className="overflow-x-auto">
               <Table>
                   <Thead className="bg-white">
                       <Tr>
                           <Th className="text-brand-blue font-black tracking-[0.2em] text-[10px] uppercase">Reference</Th>
                           <Th className="font-black text-brand-navy">Supplier Node</Th>
                           <Th className="font-black text-brand-navy text-center">Inbound Channel</Th>
                           <Th className="font-black text-brand-navy text-right">Landed Cost</Th>
                           <Th className="font-black text-brand-navy">State</Th>
                           <Th className="font-black text-brand-navy">ETA Window</Th>
                           <Th></Th>
                       </Tr>
                   </Thead>
                   <tbody className="divide-y divide-slate-100 bg-white">
                       {pos.map(po => (
                           <Tr key={po.id} className="hover:bg-slate-50/50 transition-all cursor-default group">
                               <td className="px-6 py-5 font-black text-slate-300 group-hover:text-brand-blue transition-colors text-[14px]">#{po.id?.slice(0,6).toUpperCase()}</td>
                               <td className="px-6 py-5 font-black text-brand-navy flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-[14px]">
                                     {po.suppliers?.name?.charAt(0)}
                                  </div>
                                  <div>
                                     <p>{po.suppliers?.name}</p>
                                     <p className="text-[11px] text-slate-400 font-bold tracking-widest uppercase">Certified Vendor</p>
                                  </div>
                               </td>
                               <td className="px-6 py-5 text-center">
                                  <Badge variant="gray" className="bg-slate-100 text-slate-600 border-none font-black px-3">SURFACE CARGO</Badge>
                               </td>
                               <td className="px-6 py-5 font-black text-right text-[15px]">₹{Number(po.total).toLocaleString()}</td>
                               <td className="px-6 py-5">
                                   <Badge variant={
                                       po.status === 'ordered' ? 'info' : 
                                       po.status === 'received' ? 'success' : 
                                       po.status === 'shipping' ? 'warning' : 'gray'
                                   } className="font-black rounded-[8px] py-1">
                                       {po.status?.toUpperCase()}
                                   </Badge>
                               </td>
                               <td className="px-6 py-5 font-black text-[13px] text-slate-500">
                                   {po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'ESTIMATING...'}
                               </td>
                               <td className="px-6 py-5 text-right">
                                   <Button variant="ghost" size="sm" icon={<ArrowRight size={16} />} />
                               </td>
                           </Tr>
                       ))}
                   </tbody>
               </Table>
            </div>
            {pos.length === 0 && (
                <div className="py-40 text-center bg-white">
                    <ShoppingCart size={80} className="mx-auto text-slate-100 mb-8" />
                    <h3 className="text-slate-400 font-black text-[22px]">Supply Chain Silent</h3>
                    <p className="text-slate-300 font-bold uppercase text-[12px] tracking-[0.4em] mt-2">Ready for purchase cycle manifestation.</p>
                </div>
            )}
        </Card>
    );
}

function LogisticsTracker({ pos }) {
    const activeShipments = pos.filter(po => po.status === 'shipping' || po.status === 'shipped');

    return (
        <div className="space-y-12 pb-24">
            {activeShipments.map(ship => (
                <Card key={ship.id} className="p-16 border-slate-100 bg-white shadow-2xl rounded-[48px] overflow-hidden relative border-2 border-slate-50">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50/50 skew-x-12 translate-x-1/2 pointer-events-none" />
                    
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12 relative z-10">
                        <div className="flex items-center gap-10">
                            <div className="w-24 h-24 bg-brand-navy rounded-[36px] text-white flex items-center justify-center shadow-2xl shadow-slate-400">
                                <Truck size={48} className="animate-push" />
                            </div>
                            <div>
                                <h4 className="text-[32px] font-black text-brand-navy tracking-tight">{ship.tracking_id || 'Cross-Node Transit'}</h4>
                                <div className="flex flex-wrap gap-4 mt-3">
                                   <p className="text-[12px] text-brand-blue font-black uppercase tracking-[0.2em] border-2 border-blue-100 bg-blue-50/50 px-4 py-1.5 rounded-2xl flex items-center gap-2">
                                      <Layers size={14} /> Manifest: #{ship.id?.slice(0,8).toUpperCase()}
                                   </p>
                                   <p className="text-[12px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                                      <Timer size={16} /> Est. Arrival: <span className="text-brand-navy font-black">{ship.expected_delivery ? new Date(ship.expected_delivery).toLocaleDateString() : 'REAL-TIME CALCULATING'}</span>
                                   </p>
                                </div>
                            </div>
                        </div>
                        <div className="xl:text-right p-6 bg-slate-50 rounded-[32px] border border-white shadow-inner min-w-[280px]">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Target Depot</p>
                            <p className="text-[20px] font-black text-brand-navy flex items-center xl:justify-end gap-2">
                               <MapPin size={20} className="text-brand-blue" /> {ship.warehouses?.name || 'CENTRAL STORAGE'}
                            </p>
                        </div>
                    </div>

                    <div className="relative mt-24 px-12">
                        {/* Connecting Line (Advanced Visualization) */}
                        <div className="absolute top-7 left-14 right-14 h-2 bg-slate-100 rounded-full">
                           <div className="h-full bg-emerald-500 rounded-full w-[66%] relative shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-4 border-emerald-500 rounded-full animate-ping" />
                           </div>
                        </div>
                        
                        <div className="relative flex justify-between">
                            {[
                                { name: 'Origin Terminal', time: '11:00 AM', status: 'done', icon: Building2 },
                                { name: 'Load Manifested', time: '02:00 PM', status: 'done', icon: Package },
                                { name: 'Active Transit', time: 'In Progress', status: 'active', icon: Truck },
                                { name: 'Final Offload', time: 'Awaiting', status: 'pending', icon: Warehouse },
                            ].map((step, i) => {
                                const StepIcon = step.icon;
                                return (
                                <div key={i} className="flex flex-col items-center gap-8 group">
                                    <div className={`w-16 h-16 rounded-[24px] border-4 flex items-center justify-center transition-all duration-1000 z-10 ${
                                        step.status === 'done' ? 'bg-emerald-500 border-white text-white shadow-2xl shadow-emerald-200' : 
                                        step.status === 'active' ? 'bg-white border-brand-navy text-brand-navy scale-125 shadow-2xl shadow-slate-200' : 'bg-slate-50 border-white text-slate-200 shadow-inner'
                                    }`}>
                                       <StepIcon size={24} className={step.status === 'active' ? 'animate-bounce' : ''} />
                                    </div>
                                    <div className="text-center">
                                       <p className={`text-[15px] font-black tracking-tighter uppercase ${step.status === 'pending' ? 'text-slate-300' : 'text-brand-navy'}`}>{step.name}</p>
                                       <p className="text-[12px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{step.time}</p>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                </Card>
            ))}
            {activeShipments.length === 0 && (
                <div className="text-center py-48 border-4 border-dashed border-slate-100 rounded-[64px] bg-white shadow-2xl shadow-slate-100">
                   <div className="p-12 bg-slate-50 rounded-full w-fit mx-auto mb-12 border-2 border-white shadow-xl">
                      <Truck size={80} className="text-slate-200" />
                   </div>
                   <h3 className="text-slate-400 font-black text-[32px] tracking-tight">No Active Logistics Stream</h3>
                   <p className="text-slate-300 font-black uppercase text-[14px] tracking-[0.4em] mt-4">Monitoring Global Carriers...</p>
                </div>
            )}
        </div>
    );
}

// ----------------- MODAL COMPONENTS -----------------

function CreateWHModal({ isOpen, onClose, refresh }) {
    const [form, setForm] = useState({ name: '', location: '', is_main_hub: false });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await supabase.from('warehouses').insert([{ ...form, user_id: user.id }]);
            toast.success("New storage hub established!");
            refresh();
            onClose();
        } catch (err) {
            toast.error("Manifest error. Check your uplink.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Establish Supply Depot">
            <form onSubmit={handleSubmit} className="space-y-6 p-2">
                <Input label="Facility Name" placeholder="e.g. North Terminal - Zone B" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <Input label="Physical Coordinates" placeholder="Avenue 5, Mumbai Port Trust" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                <div className="flex items-center gap-4 bg-slate-900 p-6 rounded-[24px] text-white">
                   <input type="checkbox" className="w-6 h-6 accent-brand-blue rounded-lg" checked={form.is_main_hub} onChange={e => setForm({...form, is_main_hub: e.target.checked})} />
                   <div>
                      <p className="text-[14px] font-black">Strategic Main Terminal</p>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Sets this node as primary stock entry point.</p>
                   </div>
                </div>
                <Button fullWidth disabled={submitting} type="submit" className="py-8 rounded-[24px] shadow-2xl shadow-brand-blue/30">{submitting ? 'Connecting...' : 'Deploy Depot'}</Button>
            </form>
        </Modal>
    );
}

function CreateSupplierModal({ isOpen, onClose, refresh }) {
    const [form, setForm] = useState({ name: '', phone: '', address: '' });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await supabase.from('suppliers').insert([{ ...form, user_id: user.id }]);
            toast.success("Vendor network expanded!");
            refresh();
            onClose();
        } catch (err) {
            toast.error("Supplier data collision.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Onboard Certified Vendor">
            <form onSubmit={handleSubmit} className="space-y-6 p-2">
                <Input label="Vendor Registered Name" placeholder="e.g. Reliance Logistics Ltd." required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <Input label="Commercial Contact Line" placeholder="+91 98XXX XXX00" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                <Input label="Corporate Headquarters" placeholder="Suite 405, Terminal House, Jamshedpur" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                <Button fullWidth disabled={submitting} type="submit" className="py-8 rounded-[24px]">{submitting ? 'Registering...' : 'Certify Supplier'}</Button>
            </form>
        </Modal>
    );
}

function CreatePOModal({ isOpen, onClose, refresh, suppliers, warehouses }) {
    const [form, setForm] = useState({ supplier_id: '', warehouse_id: '', total: '', tracking_id: '' });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await supabase.from('purchase_orders').insert([{ 
                ...form, 
                user_id: user.id, 
                status: 'ordered',
                total: Number(form.total)
            }]);
            toast.success("Purchase Order Transmitted Successfully!");
            refresh();
            onClose();
        } catch (err) {
            toast.error("PO transmission failure.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Execute Global Purchase">
            <form onSubmit={handleSubmit} className="space-y-6 p-2 font-inter">
                <div className="space-y-2">
                   <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Select Certified Vendor</label>
                   <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] p-5 font-black text-brand-navy focus:border-brand-blue outline-none transition-all shadow-inner" value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})} required>
                      <option value="">-- Choose Supplier Node --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Target Storage Node</label>
                   <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] p-5 font-black text-brand-navy focus:border-brand-blue outline-none transition-all shadow-inner" value={form.warehouse_id} onChange={e => setForm({...form, warehouse_id: e.target.value})} required>
                      <option value="">-- Choose Arrival Depot --</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                   </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input label="Total Contract Value (₹)" type="number" placeholder="50,000" value={form.total} onChange={e => setForm({...form, total: e.target.value})} required />
                   <Input label="Tracking Ref ID" placeholder="SHP-INV-XXX" value={form.tracking_id} onChange={e => setForm({...form, tracking_id: e.target.value})} />
                </div>
                
                <div className="p-6 bg-blue-50 rounded-[24px] flex items-center gap-4 border border-blue-100 mb-4">
                   <Info size={24} className="text-brand-blue" />
                   <p className="text-[12px] font-bold text-brand-blue leading-relaxed">By executing this PO, you authorize a financial commitment towards the selected vendor. Stock will be added to the arrival depot upon shipment receipt.</p>
                </div>

                <Button fullWidth disabled={submitting} type="submit" className="py-8 rounded-[24px] shadow-2xl shadow-brand-blue/30 text-[18px] uppercase tracking-widest">{submitting ? 'Transmitting Order...' : 'Confirm & Release PO'}</Button>
            </form>
        </Modal>
    );
}
