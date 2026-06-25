import { useState, useMemo } from 'react';
import { useExpenses, useSuppliers, useAddExpense, useAddSupplier, useUpdateExpense } from "../hooks/useExpenses";
import { toast } from "react-hot-toast";
import { Card, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { TrendingDown, Plus, FileText, PieChart as PieIcon, Users, CreditCard, DollarSign, BarChart3, AlertCircle, Edit2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ["#3B82F6", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"];

// Default budgets for MSME categories
const CATEGORY_BUDGETS = {
  "Inventory": 150000,
  "Rent": 30000,
  "Salary": 80000,
  "Electricity": 10000,
  "Marketing": 25000,
  "Misc": 15000

};

export default function ExpensePage() {
  const { data: expenses = [], isLoading: loadingExpenses } = useExpenses();
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();
  const { mutateAsync: addExpense, isPending: addingExpense } = useAddExpense();
  const { mutateAsync: addSupplier } = useAddSupplier();
  const { mutateAsync: updateExpense, isPending: updatingExpense } = useUpdateExpense();
  
  const [form, setForm] = useState({ amount: "", category: "", supplier_id: "", description: "" });
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "" });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", amount: "", category: "", supplier_id: "", description: "" });

  const categoryData = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
        const cat = e.category || "Misc";
        map[cat] = (map[cat] || 0) + Number(e.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  // Compute budget progress list
  const budgetProgress = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const cat = e.category || "Misc";
      map[cat] = (map[cat] || 0) + Number(e.amount);
    });

    return Object.keys(CATEGORY_BUDGETS).map(cat => {
      const spent = map[cat] || 0;
      const budget = CATEGORY_BUDGETS[cat];
      const percent = Math.min(Math.round((spent / budget) * 100), 100);
      return { category: cat, spent, budget, percent };
    });
  }, [expenses]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.category) return toast.error("Amount & Category required");
    try {
      await addExpense({
         amount: Number(form.amount),
         category: form.category,
         supplier_id: form.supplier_id || null,
         description: form.description
      });
      toast.success("Expense Added!");
      setForm({ amount: "", category: "", supplier_id: "", description: "" });
    } catch(err) {
      toast.error("Failed to add expense");
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name) return toast.error("Supplier name required");
    try {
        await addSupplier(supplierForm);
        toast.success("Supplier Added!");
        setSupplierForm({ name: "", phone: "" });
        setShowSupplierModal(false);
    } catch {
        toast.error("Failed to add supplier");
    }
  };

  const handleEditExpense = (exp) => {
      setEditForm({
          id: exp.id,
          amount: exp.amount,
          category: exp.category,
          supplier_id: exp.supplier_id || "",
          description: exp.description || ""
      });
      setShowEditModal(true);
  };

  const handleUpdateExpense = async (e) => {
      e.preventDefault();
      try {
          await updateExpense({
              id: editForm.id,
              amount: Number(editForm.amount),
              category: editForm.category,
              supplier_id: editForm.supplier_id || null,
              description: editForm.description
          });
          toast.success("Expense Updated!");
          setShowEditModal(false);
      } catch (err) {
          toast.error("Failed to update expense");
      }
  };

  return (
    <div className="space-y-[32px] animate-fade-in-up pb-[40px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[16px]">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A] flex items-center gap-[8px]">
            <TrendingDown size={24} className="text-red-500" />
            Expenses & Vendors
          </h1>
          <p className="text-[14px] text-[#64748B] mt-[4px]">Log operational expenses, manage suppliers, and track budget utilization.</p>
        </div>
        <div className="flex gap-[12px]">
          <Button variant="outline" onClick={() => setShowSupplierModal(true)} icon={<Users size={16}/>}>
             Manage Vendors
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[24px]">
        <Card className="flex items-center gap-[16px] border border-slate-150">
          <div className="w-[48px] h-[48px] rounded-xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
             <TrendingDown size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Total Outflow</span>
             <span className="text-[24px] font-extrabold text-[#0F172A] mt-1 block">₹{totalExpense.toLocaleString('en-IN')}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-[16px] border border-slate-150">
          <div className="w-[48px] h-[48px] rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
             <Users size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Active Vendors</span>
             <span className="text-[24px] font-extrabold text-[#0F172A] mt-1 block">{suppliers.length}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-[16px] border border-slate-150">
          <div className="w-[48px] h-[48px] rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
             <BarChart3 size={20} />
          </div>
          <div>
             <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Highest Category</span>
             <span className="text-[20px] font-extrabold text-[#0F172A] mt-1 block truncate">
               {categoryData.length > 0 ? [...categoryData].sort((a,b) => b.value - a.value)[0].name : 'None'}
             </span>
          </div>
        </Card>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
        {/* Left Column: Recording Form & Breakdown */}
        <div className="lg:col-span-2 space-y-[24px]">
          {/* Record Expense Card */}
          <Card className="border border-slate-150">
            <div className="flex justify-between items-center mb-[20px]">
                <CardTitle className="flex items-center gap-[8px] text-[#0F172A] text-sm font-bold">
                    <Plus size={18} className="text-[#3B82F6]" /> Record Operational Expense
                </CardTitle>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-[20px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                    <Input 
                        label="Amount (₹)" 
                        type="number" 
                        required 
                        value={form.amount} 
                        onChange={e => setForm({...form, amount: e.target.value})} 
                        placeholder="0.00"
                    />
                    <div className="flex flex-col gap-[4px]">
                        <label className="text-[13px] font-semibold text-[#64748B]">Category</label>
                        <select 
                            className="bg-white border border-slate-200 rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] outline-none transition-all"
                            value={form.category}
                            onChange={e => setForm({...form, category: e.target.value})}
                            required
                        >
                            <option value="">Select Category</option>
                            <option value="Inventory">Inventory</option>
                            <option value="Rent">Rent</option>
                            <option value="Salary">Salary</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Misc">Miscellaneous</option>
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                    <div className="flex flex-col gap-[4px]">
                        <label className="text-[13px] font-semibold text-[#64748B]">Vendor / Supplier (Optional)</label>
                        <select 
                            className="bg-white border border-slate-200 rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] outline-none transition-all"
                            value={form.supplier_id}
                            onChange={e => setForm({...form, supplier_id: e.target.value})}
                        >
                            <option value="">None / Walk-in Vendor</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <Input 
                        label="Description" 
                        type="text" 
                        value={form.description} 
                        onChange={e => setForm({...form, description: e.target.value})} 
                        placeholder="e.g. Office supplies invoice"
                    />
                </div>
                
                <Button size="large" type="submit" disabled={addingExpense} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700" icon={<CreditCard size={18}/>}>
                    {addingExpense ? "Logging Transaction..." : "Save Expense Transaction"}
                </Button>
            </form>
          </Card>

          {/* Ledger Table */}
          <Card noPadding className="border border-slate-150 overflow-hidden">
             <div className="p-[20px] border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-[8px]">
                    <FileText size={16} className="text-slate-500" /> Expense Ledger
                 </h3>
             </div>
             <Table>
                 <Thead>
                     <tr>
                         <Th>Date</Th>
                         <Th>Category</Th>
                         <Th>Vendor</Th>
                         <Th>Description</Th>
                         <Th className="text-right">Amount (₹)</Th>
                         <Th className="text-right">Actions</Th>
                     </tr>
                 </Thead>
                 <Tbody>
                     {expenses.map((exp, i) => (
                        <Tr key={exp.id || i} className="border-b border-slate-100 hover:bg-slate-50/30">
                           <Td className="text-slate-500 font-medium">{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Td>
                           <Td>
                              <Badge variant="gray" className="font-bold uppercase text-[9px] tracking-wider">{exp.category || 'Misc'}</Badge>
                           </Td>
                           <Td className="font-semibold text-slate-800 text-xs">
                              {exp.suppliers?.name || <span className="text-slate-400 font-normal">—</span>}
                           </Td>
                           <Td className="text-slate-500 text-xs">{exp.description || '—'}</Td>
                           <Td className="text-right font-bold text-red-600">₹{Number(exp.amount).toLocaleString('en-IN')}</Td>
                           <Td className="text-right">
                              <button onClick={() => handleEditExpense(exp)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                  <Edit2 size={16} />
                              </button>
                           </Td>
                        </Tr>
                     ))}
                     {expenses.length === 0 && (
                        <Tr>
                           <Td colSpan="6" className="text-center py-10 text-slate-400">No expense records found.</Td>
                        </Tr>
                     )}
                 </Tbody>
             </Table>
          </Card>
        </div>

        {/* Right Column: Budgets & Pie Chart */}
        <div className="space-y-[24px]">
          {/* Category Breakdown Card */}
          <Card className="flex flex-col items-center justify-center p-[20px] border border-slate-150">
             <div className="flex items-center gap-[8px] mb-[20px] self-start w-full border-b border-slate-100 pb-3">
                <PieIcon size={16} className="text-[#3B82F6]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Category Breakdown</h3>
             </div>
             {expenses.length > 0 ? (
                <div className="h-[220px] w-full relative flex items-center justify-center">
                    <ResponsiveContainer width="99%" height="100%">
                        <PieChart>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontFamily: 'Inter, sans-serif', fontSize: '12px' }} formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                            <Pie
                            data={categoryData}
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                            >
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
             ) : (
                <div className="h-[220px] flex items-center justify-center text-slate-400 text-xs italic">No graphical breakdown data.</div>
             )}
             {/* Legend */}
             {expenses.length > 0 && (
               <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 w-full">
                 {categoryData.map((item, idx) => (
                   <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                     <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                     {item.name}
                   </div>
                 ))}
               </div>
             )}
          </Card>

          {/* Budget Progress Bars Card */}
          <Card className="border border-slate-150">
             <div className="flex items-center gap-[8px] mb-[16px] border-b border-slate-100 pb-3">
                <BarChart3 size={16} className="text-[#3B82F6]" />
                <h3 className="text-sm font-bold text-[#0F172A]">Monthly Budget Tracking</h3>
             </div>
             <div className="space-y-[18px]">
                {budgetProgress.map((item, idx) => {
                  const isLimitExceeded = item.spent > item.budget;
                  return (
                    <div key={idx} className="space-y-1.5">
                       <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-800">{item.category}</span>
                          <span className={`${isLimitExceeded ? 'text-red-600' : 'text-slate-500'}`}>
                            ₹{item.spent.toLocaleString()} / <span className="text-slate-400">₹{item.budget.toLocaleString()}</span>
                          </span>
                       </div>
                       <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                          <div 
                             className={`h-full rounded-full transition-all duration-500 ${isLimitExceeded ? 'bg-red-500' : 'bg-indigo-600'}`} 
                             style={{ width: `${item.percent}%` }}
                          />
                       </div>
                       <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          <span>{item.percent}% utilized</span>
                          {isLimitExceeded && (
                            <span className="text-red-500 flex items-center gap-0.5"><AlertCircle size={10} /> Over Budget</span>
                          )}
                       </div>
                    </div>
                  );
                })}
             </div>
          </Card>
        </div>
      </div>

      {/* Supplier Modal */}
      <Modal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} title="Vendor Registry">
          <div className="space-y-[24px]">
            <form onSubmit={handleAddSupplier} className="space-y-[16px] bg-slate-50 border border-slate-200 p-[16px] rounded-2xl">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Add New Vendor</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
                    <Input placeholder="Vendor Name" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} required />
                    <Input placeholder="Phone (Optional)" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
                </div>
                <Button type="submit" size="small" className="w-full bg-indigo-600 hover:bg-indigo-700">Save Vendor</Button>
            </form>

            <div className="space-y-[12px]">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Registered Vendors ({suppliers.length})</p>
                <div className="max-h-[260px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
                    {suppliers.map(s => (
                        <div key={s.id} className="p-[12px] bg-white border border-slate-150 rounded-xl flex justify-between items-center hover:border-indigo-600/30 transition-all shadow-sm">
                            <div>
                                <h4 className="text-xs font-bold text-slate-900">{s.name}</h4>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{s.phone || 'No phone registered'}</p>
                            </div>
                            <Badge variant="gray" className="font-bold text-[8px] uppercase tracking-wide">Vendor</Badge>
                        </div>
                    ))}
                    {suppliers.length === 0 && <p className="text-center text-slate-400 text-xs italic py-4">No vendors registered yet.</p>}
                </div>
            </div>
          </div>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Expense">
          <form onSubmit={handleUpdateExpense} className="space-y-[20px]">
              <div className="grid grid-cols-1 gap-[16px]">
                  <Input 
                      label="Amount (₹)" 
                      type="number" 
                      required 
                      value={editForm.amount} 
                      onChange={e => setEditForm({...editForm, amount: e.target.value})} 
                  />
                  <div className="flex flex-col gap-[4px]">
                      <label className="text-[13px] font-semibold text-[#64748B]">Category</label>
                      <select 
                          className="bg-white border border-slate-200 rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] outline-none transition-all"
                          value={editForm.category}
                          onChange={e => setEditForm({...editForm, category: e.target.value})}
                          required
                      >
                          <option value="Inventory">Inventory</option>
                          <option value="Rent">Rent</option>
                          <option value="Salary">Salary</option>
                          <option value="Electricity">Electricity</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Misc">Miscellaneous</option>
                      </select>
                  </div>
                  <div className="flex flex-col gap-[4px]">
                      <label className="text-[13px] font-semibold text-[#64748B]">Vendor / Supplier</label>
                      <select 
                          className="bg-white border border-slate-200 rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] outline-none transition-all"
                          value={editForm.supplier_id}
                          onChange={e => setEditForm({...editForm, supplier_id: e.target.value})}
                      >
                          <option value="">None / Walk-in Vendor</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                  </div>
                  <Input 
                      label="Description" 
                      type="text" 
                      value={editForm.description} 
                      onChange={e => setEditForm({...editForm, description: e.target.value})} 
                  />
              </div>
              <Button size="large" type="submit" disabled={updatingExpense} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700">
                  {updatingExpense ? "Updating..." : "Save Changes"}
              </Button>
          </form>
      </Modal>
    </div>
  );
}
