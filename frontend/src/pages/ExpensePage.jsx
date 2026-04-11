import {  useState, useMemo  } from 'react';
import { useExpenses, useSuppliers, useAddExpense, useAddSupplier } from "../hooks/useExpenses";
import { toast } from "react-hot-toast";
import { Card, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { TrendingDown, Plus, FileText, PieChart as PieIcon, Users, CreditCard } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ["#3B82F6", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"];

export default function ExpensePage() {
  const { data: expenses = [], isLoading: loadingExpenses } = useExpenses();
  const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();
  const { mutateAsync: addExpense, isPending: addingExpense } = useAddExpense();
  const { mutateAsync: addSupplier } = useAddSupplier();
  
  const [form, setForm] = useState({ amount: "", category: "", supplier_id: "", description: "" });
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "" });

  const categoryData = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
        map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

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

  return (
    <div className="space-y-[32px] animate-fade-in-up pb-[40px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[16px]">
        <div>
          <h1 className="text-[22px] font-bold text-text-main flex items-center gap-[8px]">
            <TrendingDown size={24} className="text-status-danger" />
            Expenses & Vendors
          </h1>
          <p className="text-[14px] text-text-muted mt-[4px]">Log expenditures and manage supplier relationships.</p>
        </div>
        <div className="flex gap-[12px]">
            <div className="bg-[#FEF2F2] border border-[#FECACA] px-[20px] py-[10px] rounded-xl flex flex-col items-end">
                <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider">Total Spending</span>
                <span className="text-[20px] font-extrabold text-[#991B1B]">₹{totalExpense.toLocaleString()}</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
          {/* Chart Section */}
          <Card className="lg:col-span-1 flex flex-col items-center justify-center p-[24px]">
             <div className="flex items-center gap-[8px] mb-[24px] self-start">
                <PieIcon size={18} className="text-brand-blue" />
                <h3 className="text-[14px] font-bold text-text-main">Category Breakdown</h3>
             </div>
             {expenses.length > 0 ? (
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="99%" height="100%">
                        <PieChart>
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Pie
                            data={categoryData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
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
                <div className="flex-1 flex items-center justify-center text-text-muted text-[13px]">No data available</div>
             )}
          </Card>

          {/* Form Section */}
          <Card className="lg:col-span-2">
            <div className="flex justify-between items-center mb-[20px]">
                <CardTitle className="flex items-center gap-[8px]">
                    <Plus size={18} className="text-brand-blue" /> Record New Expense
                </CardTitle>
                <Button variant="outline" size="small" onClick={() => setShowSupplierModal(true)} icon={<Users size={14}/>}>
                    Manage Vendors
                </Button>
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
                    <Input 
                        label="Category" 
                        type="text" 
                        required 
                        list="expense_cats"
                        value={form.category} 
                        onChange={e => setForm({...form, category: e.target.value})} 
                        placeholder="e.g. Rent, Electricity, Inventory" 
                    />
                    <datalist id="expense_cats">
                        <option value="Inventory" />
                        <option value="Rent" />
                        <option value="Salary" />
                        <option value="Electricity" />
                        <option value="Marketing" />
                    </datalist>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                    <div className="flex flex-col gap-[4px]">
                        <label className="text-[13px] font-semibold text-text-muted">Vendor / Supplier (Optional)</label>
                        <select 
                            className="bg-white border border-gray-300 rounded-lg px-[12px] py-[10px] text-[14px] text-text-main focus:ring-2 focus:ring-brand-blue/20 outline-none"
                            value={form.supplier_id}
                            onChange={e => setForm({...form, supplier_id: e.target.value})}
                        >
                            <option value="">None / Self</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <Input 
                        label="Description" 
                        type="text" 
                        value={form.description} 
                        onChange={e => setForm({...form, description: e.target.value})} 
                        placeholder="Short note"
                    />
                </div>
                
                <Button size="large" type="submit" disabled={addingExpense} className="w-full" icon={<CreditCard size={18}/>}>
                    {addingExpense ? "Processing..." : "Add Expense Transaction"}
                </Button>
            </form>
          </Card>
      </div>
      
      <Card noPadding>
         <div className="p-[20px] border-b border-gray-100 flex justify-between items-center bg-white rounded-t-xl">
             <CardTitle className="flex items-center gap-[8px]">
                <FileText size={18} className="text-text-muted" /> Expense Ledger
             </CardTitle>
         </div>
         <Table>
             <Thead>
                 <tr>
                     <Th>Date</Th>
                     <Th>Category</Th>
                     <Th>Vendor</Th>
                     <Th>Description</Th>
                     <Th className="text-right">Amount (₹)</Th>
                 </tr>
             </Thead>
             <Tbody>
                 {expenses.map((exp, i) => (
                    <Tr key={exp.id || i}>
                       <Td className="text-[13px] text-text-muted">{new Date(exp.date).toLocaleDateString()}</Td>
                       <Td>
                          <Badge variant="gray">{exp.category}</Badge>
                       </Td>
                       <Td className="text-[13px] font-medium text-text-main">
                          {exp.suppliers?.name || <span className="text-gray-400">—</span>}
                       </Td>
                       <Td className="text-text-muted text-[13px]">{exp.description || '-'}</Td>
                       <Td className="text-right font-bold text-status-danger">₹{Number(exp.amount).toLocaleString('en-IN')}</Td>
                    </Tr>
                 ))}
                 {expenses.length === 0 && (
                    <Tr>
                       <Td colSpan="5" className="text-center p-6 text-text-muted">No expenses recorded yet.</Td>
                    </Tr>
                 )}
             </Tbody>
         </Table>
      </Card>

      {/* Supplier Modal */}
      <Modal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} title="Vendor Management">
          <div className="space-y-[24px]">
            <form onSubmit={handleAddSupplier} className="space-y-[16px] bg-gray-50 p-[16px] rounded-xl border border-gray-200">
                <p className="text-[12px] font-bold text-text-muted uppercase">Add Quick Vendor</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                    <Input placeholder="Vendor Name" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} />
                    <Input placeholder="Phone (Optional)" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
                </div>
                <Button type="submit" size="small" className="w-full">Save Vendor</Button>
            </form>

            <div className="space-y-[12px]">
                <p className="text-[12px] font-bold text-text-muted uppercase px-2">Existing Vendors</p>
                <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-[4px]">
                    {suppliers.map(s => (
                        <div key={s.id} className="p-[12px] bg-white border border-gray-100 rounded-lg flex justify-between items-center hover:border-brand-blue/30 transition-colors">
                            <div>
                                <h4 className="text-[14px] font-bold text-text-main">{s.name}</h4>
                                <p className="text-[12px] text-text-muted">{s.phone || 'No phone'}</p>
                            </div>
                            <Badge variant="gray">Vendor</Badge>
                        </div>
                    ))}
                    {suppliers.length === 0 && <p className="text-center text-text-muted text-[13px] py-4">No vendors added.</p>}
                </div>
            </div>
          </div>
      </Modal>
    </div>
  );
}
