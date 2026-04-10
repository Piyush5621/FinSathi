import React, { useState } from "react";
import { Search, Plus, Phone, MapPin, Users, PhoneCall, MessageCircle } from "lucide-react";
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
  const deleteCustomerMutation = useDeleteCustomer();

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

  const filtered = customers.filter((c) =>
    [c.name, c.email, c.phone, c.city]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-[32px] animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[16px]">
        <div>
          <h1 className="text-[22px] font-bold text-text-main flex items-center gap-[8px]">
            <Users size={24} className="text-brand-blue" />
            Customer Directory
          </h1>
          <p className="text-[14px] text-text-muted mt-[4px]">Manage your client relationships and dues.</p>
        </div>

        <div className="flex items-center gap-[12px] w-full sm:w-auto">
          <Input 
             placeholder="Search customers..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full sm:w-[300px]"
          />
          <Button onClick={() => setShowAddModal(true)} icon={<Plus size={18} />}>
            New Customer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[24px]">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="h-[220px] bg-gray-100 animate-pulse rounded-xl"></div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Users size={32} className="mx-auto text-gray-400 mb-[16px]" />
            <p className="text-[16px] text-text-muted font-medium mb-[8px]">No customers found.</p>
            <Button variant="ghost" onClick={() => setShowAddModal(true)}>Add your first customer</Button>
          </div>
        ) : (
          filtered.map((c) => {
            const pending = pendingAmounts[c.id] || 0;
            return (
              <Card 
                key={c.id}
                className="cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between min-h-[200px]"
              >
                <div 
                   className="flex items-start gap-[16px]" 
                   onClick={() => navigate(`/customer-invoices/${c.id}`)}
                >
                  <div className="w-[48px] h-[48px] rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue text-[20px] font-bold">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-text-main hover:text-brand-blue transition-colors line-clamp-1">
                      {c.name}
                    </h3>
                    <p className="text-[13px] text-text-muted flex items-center gap-[4px] mt-[2px]">
                      <MapPin size={12} /> {c.city || 'Unknown City'}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-[16px] border-t border-gray-100 flex justify-between items-end">
                  <div className="flex gap-[8px]">
                    {c.phone && (
                      <>
                        <a href={`tel:${c.phone}`} onClick={e=>e.stopPropagation()} className="p-2 bg-gray-50 text-brand-blue rounded-full hover:bg-brand-blue hover:text-white transition-colors">
                          <PhoneCall size={16} />
                        </a>
                        <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="p-2 bg-[#E8F8EE] text-[#128C7E] rounded-full hover:bg-[#128C7E] hover:text-white transition-colors">
                          <MessageCircle size={16} />
                        </a>
                      </>
                    )}
                  </div>
                  <div className="text-right pb-[4px]">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block mb-[2px]">Due Amount</span>
                    <div className={`text-[18px] font-extrabold ${pending > 0 ? 'text-status-danger' : 'text-status-success'}`}>
                      ₹{pending.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Customer">
        <form onSubmit={handleAddCustomer} className="space-y-[16px]">
           <Input label="Full Name" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
           <div className="grid grid-cols-2 gap-[12px]">
              <Input label="Phone" placeholder="Mobile Number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <Input label="City" placeholder="City or Region" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
           </div>
           <Input label="Email" placeholder="Email Address" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
           <div className="flex flex-col gap-[4px]">
              <label className="text-[13px] font-medium text-text-main">Address</label>
              <textarea 
                 value={form.address} 
                 onChange={e=>setForm({...form, address: e.target.value})}
                 className="w-full p-[12px] border border-gray-300 rounded-lg text-[14px] text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                 rows="3"
               />
           </div>
           <Button type="submit" className="w-full mt-[8px]">Save Customer</Button>
        </form>
      </Modal>

    </div>
  );
}
