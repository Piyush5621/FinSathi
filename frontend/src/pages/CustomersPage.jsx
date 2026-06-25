import { useState, useMemo } from 'react';
import { Search, Plus, MapPin, Users, PhoneCall, MessageCircle, DollarSign, ArrowRight, UserCheck } from 'lucide-react';

// Generate a deterministic color from a name string
function getAvatarColor(name = '') {
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500',
    'bg-teal-500', 'bg-orange-500'
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useCustomers, usePendingAmounts, useAddCustomer, useDeleteCustomer } from "../hooks/useCustomers";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
  });

  const navigate = useNavigate();

  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const { data: pendingAmounts = {}, isLoading: loadingPending } = usePendingAmounts();
  const addCustomerMutation = useAddCustomer();

  const loading = loadingCustomers || loadingPending;

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    
    addCustomerMutation.mutate(form, {
      onSuccess: () => {
        toast.success("Customer added successfully");
        setShowAddModal(false);
        setForm({ name: "", phone: "", email: "", address: "", city: "" });
      },
      onError: (err) => {
        toast.error("Failed to add customer");
      }
    });
  };

  const filtered = useMemo(() => {
    return customers.filter((c) =>
      [c.name, c.email, c.phone, c.city]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [customers, search]);

  // Compute metrics
  const metrics = useMemo(() => {
    const totalCount = customers.length;
    let totalDuesVal = 0;
    let customersWithDuesCount = 0;

    customers.forEach(c => {
      const due = pendingAmounts[c.id] || 0;
      if (due > 0) {
        totalDuesVal += due;
        customersWithDuesCount++;
      }
    });

    return {
      totalCount,
      totalDuesVal,
      customersWithDuesCount,
      cleanAccountsCount: totalCount - customersWithDuesCount
    };
  }, [customers, pendingAmounts]);

  return (
    <div className="space-y-[32px] animate-fade-in-up pb-[40px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[16px]">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-[8px]">
            <Users size={24} className="text-[#3B82F6]" />
            Customer Directory
          </h1>
          <p className="text-[14px] text-[#64748B] mt-[4px]">Manage your client relationships, phone logs, and outstanding dues.</p>
        </div>

        <div className="flex items-center gap-[12px] w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-[12px] top-[10px] h-[16px] w-[16px] text-slate-400" />
            <Input 
               placeholder="Search name, phone, city..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-[36px] w-full"
            />
          </div>
          <Button onClick={() => setShowAddModal(true)} icon={<Plus size={18} />}>
            New Customer
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px]">
        <Card className="flex items-center gap-[16px]">
          <div className="w-[48px] h-[48px] rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
             <Users size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Total Clients</span>
             <span className="text-[24px] font-extrabold text-[#0F172A] mt-1 block">{metrics.totalCount}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-[16px]">
          <div className="w-[48px] h-[48px] rounded-xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
             <DollarSign size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Outstanding Dues</span>
             <span className="text-[24px] font-extrabold text-red-600 mt-1 block">₹{metrics.totalDuesVal.toLocaleString('en-IN')}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-[16px]">
          <div className="w-[48px] h-[48px] rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
             <Users size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Accounts with Dues</span>
             <span className="text-[24px] font-extrabold text-amber-600 mt-1 block">{metrics.customersWithDuesCount}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-[16px]">
          <div className="w-[48px] h-[48px] rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
             <UserCheck size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Settled Accounts</span>
             <span className="text-[24px] font-extrabold text-emerald-600 mt-1 block">{metrics.cleanAccountsCount}</span>
          </div>
        </Card>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[24px]">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="h-[200px] bg-slate-50 border border-slate-100 animate-pulse rounded-2xl"></div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Users size={32} className="mx-auto text-slate-400 mb-[16px]" />
            <p className="text-[16px] text-[#0F172A] font-semibold mb-[8px]">No customers found.</p>
            <p className="text-[13px] text-[#64748B] mb-[16px]">Create a profile for client logs, bills and automation.</p>
            <Button variant="outline" onClick={() => setShowAddModal(true)}>Add your first customer</Button>
          </div>
        ) : (
          filtered.map((c) => {
            const pending = pendingAmounts[c.id] || 0;
            return (
              <Card 
                key={c.id}
                onClick={() => navigate(`/customer-invoices/${c.id}`)}
                className="cursor-pointer hover:shadow-lg hover:border-[#3B82F6]/30 transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[210px] group border border-slate-150"
              >
                <div>
                  <div className="flex items-start justify-between gap-[12px]">
                    <div className="flex items-start gap-[12px]">
                      <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0 uppercase shadow-sm ${getAvatarColor(c.name)}`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A] group-hover:text-[#3B82F6] transition-colors line-clamp-1">
                          {c.name}
                        </h3>
                        <p className="text-xs text-[#64748B] flex items-center gap-[4px] mt-[4px]">
                          <MapPin size={12} className="text-slate-400" /> {c.city || 'Unknown City'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-[#3B82F6] group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                  </div>
                  
                  {c.email && (
                    <p className="text-[11px] text-[#64748B] truncate mt-4 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {c.email}
                    </p>
                  )}
                </div>

                <div className="mt-auto pt-[16px] border-t border-slate-100 flex justify-between items-end">
                  <div className="flex gap-[8px]">
                    {c.phone && (
                      <>
                        <a 
                          href={`tel:${c.phone}`} 
                          onClick={e=>e.stopPropagation()} 
                          className="p-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="Call Client"
                        >
                          <PhoneCall size={14} />
                        </a>
                        <a 
                          href={`https://wa.me/91${c.phone}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          onClick={e=>e.stopPropagation()} 
                          className="p-2 bg-[#E8F8EE] border border-[#d2f3dd] text-[#128C7E] rounded-lg hover:bg-[#128C7E] hover:text-white hover:border-[#128C7E] transition-colors"
                          title="WhatsApp Message"
                        >
                          <MessageCircle size={14} />
                        </a>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-[#64748B] tracking-wider block mb-[2px]">Due Balance</span>
                    <div className={`text-[16px] font-black ${pending > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ₹{pending.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* New Customer Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Customer Profile">
        <form onSubmit={handleAddCustomer} className="space-y-[16px]">
           <Input label="Full Name" placeholder="e.g. Rahul Sharma" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
           <div className="grid grid-cols-2 gap-[12px]">
              <Input label="Phone" placeholder="Mobile Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <Input label="City" placeholder="City or Region" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
           </div>
           <Input label="Email" placeholder="Email Address" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
           <div className="flex flex-col gap-[4px]">
              <label className="text-[13px] font-semibold text-[#64748B]">Business Address</label>
              <textarea 
                 placeholder="Enter full billing address..."
                 value={form.address} 
                 onChange={e=>setForm({...form, address: e.target.value})}
                 className="w-full p-[12px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[14px] text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all resize-none custom-scrollbar"
                 rows="3"
               />
           </div>
           <Button type="submit" className="w-full mt-[8px] bg-indigo-600 hover:bg-indigo-700">Save Client Profile</Button>
        </form>
      </Modal>
    </div>
  );
}

