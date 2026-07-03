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
  const [isAddingInline, setIsAddingInline] = useState(false);
  
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
        setIsAddingInline(false);
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
          <Button onClick={() => setIsAddingInline(!isAddingInline)} icon={<Plus size={18} />}>
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

      {/* Inline Add Row */}
      {isAddingInline && (
        <Card className="p-4 bg-white border-2 border-brand-blue/30 shadow-md">
           <form onSubmit={handleAddCustomer} className="flex flex-col md:flex-row gap-3 items-end">
              <div className="w-full md:flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Full Name *</label>
                 <input type="text" autoFocus required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-blue" placeholder="e.g. Rahul Sharma" />
              </div>
              <div className="w-full md:w-48">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Phone</label>
                 <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-blue" placeholder="Mobile Number" />
              </div>
              <div className="w-full md:w-48">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">City</label>
                 <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-blue" placeholder="City or Region" />
              </div>
              <div className="w-full md:w-auto flex gap-2">
                 <Button type="button" variant="outline" onClick={() => setIsAddingInline(false)} className="px-4 py-2 text-sm">Cancel</Button>
                 <Button type="submit" className="px-6 py-2 text-sm bg-indigo-600 hover:bg-indigo-700">Save</Button>
              </div>
           </form>
        </Card>
      )}

      {/* List Layout */}
      <div className="flex flex-col gap-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-50 border border-slate-100 animate-pulse rounded-2xl"></div>
          ))
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Users size={32} className="mx-auto text-slate-400 mb-[16px]" />
            <p className="text-[16px] text-[#0F172A] font-semibold mb-[8px]">No customers found.</p>
            <p className="text-[13px] text-[#64748B] mb-[16px]">Create a profile for client logs, bills and automation.</p>
            <Button variant="outline" onClick={() => setIsAddingInline(true)}>Add your first customer</Button>
          </div>
        ) : (
          filtered.map((c) => {
            const pending = pendingAmounts[c.id] || 0;
            return (
              <Card 
                key={c.id}
                onClick={() => navigate(`/customer-invoices/${c.id}`)}
                className={`cursor-pointer transition-all duration-200 group border ${pending > 0 ? 'border-rose-200 bg-rose-50/20' : 'border-slate-150 hover:border-brand-blue/30 hover:shadow-md'} p-4`}
              >
                <div className="flex items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0 uppercase shadow-sm ${getAvatarColor(c.name)}`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-brand-blue transition-colors">
                          {c.name}
                        </h3>
                        {pending > 0 && <span className="md:hidden px-2 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold uppercase rounded-lg">Overdue</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <MapPin size={12} className="text-slate-400" /> {c.city || 'Unknown'}
                        </p>
                        {c.phone && <p className="text-xs text-slate-500 font-mono hidden md:block">• {c.phone}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex gap-2">
                      {c.phone && (
                        <>
                          <a href={`tel:${c.phone}`} onClick={e=>e.stopPropagation()} className="p-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors" title="Call">
                            <PhoneCall size={14} />
                          </a>
                          <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="p-2 bg-[#E8F8EE] border border-[#d2f3dd] text-[#128C7E] rounded-lg hover:bg-[#128C7E] hover:text-white transition-colors" title="WhatsApp">
                            <MessageCircle size={14} />
                          </a>
                        </>
                      )}
                    </div>
                    <div className="text-right w-24">
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Due</span>
                      <div className={`text-base font-black ${pending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ₹{pending.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-blue group-hover:translate-x-1 transition-all hidden md:block" />
                  </div>

                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

