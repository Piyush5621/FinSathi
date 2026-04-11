import {  useState, useEffect  } from 'react';
import API from '../services/apiClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Users, Calendar, QrCode, DollarSign, CheckCircle, XCircle, Plus, Calculator, ChevronLeft, ChevronRight, Maximize2, Lock, ArrowRight, Wallet, Coins, HandCoins, Edit, Trash2, Search, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../components/ui/Modal';

export default function StaffHub() {
    const [staff, setStaff] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [payroll, setPayroll] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Calendar View States
    const [calStaffId, setCalStaffId] = useState('');
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calData, setCalData] = useState([]);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showStoreQR, setShowStoreQR] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [activeTab, setActiveTab] = useState('list');
    
    const [newStaff, setNewStaff] = useState({ name: '', phone: '', position: '', salary_type: 'fixed', base_salary: '' });
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [payForm, setPayForm] = useState({ bonus: 0, deductions: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear(), calculated: false, daysPresent: 0, advanceDeduction: 0 });
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({ amount: '', notes: '' });
    const [calSearch, setCalSearch] = useState('');

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Stats
    const presentTodayCount = attendance.filter(a => a.status === 'present').length;

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab === 'attendance' && calStaffId) {
            fetchCalendarData();
        }
    }, [activeTab, calStaffId, calMonth, calYear]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const [staffRes, attRes, payrollRes] = await Promise.all([
                API.get('/staff'),
                API.get(`/staff/attendance?date=${today}`),
                API.get('/staff/payroll')
            ]);

            const validStaff = (staffRes.data || []).filter(s => s.name);
            setStaff(validStaff);
            setAttendance(attRes.data || []);
            setPayroll(payrollRes.data || []);
            if (validStaff.length > 0 && !calStaffId) setCalStaffId(validStaff[0].id);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCalendarData = async () => {
        const firstDay = new Date(calYear, calMonth, 1).toISOString();
        const lastDay = new Date(calYear, calMonth + 1, 0).toISOString();
        
        try {
            const { data } = await API.get(`/staff/attendance?staff_id=${calStaffId}&start=${firstDay}&end=${lastDay}`);
            setCalData(data || []);
        } catch (err) {
            toast.error("Error loading calendar context");
        }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        const qr_token = Math.floor(100000 + Math.random() * 900000).toString();
        try {
            await API.post('/staff', { ...newStaff, qr_token });
            toast.success("Staff added successfully");
            setShowAddModal(false);
            setNewStaff({ name: '', phone: '', position: '', salary_type: 'fixed', base_salary: '' });
            fetchData();
        } catch (err) {
            toast.error("Failed to add staff");
        }
    };

    const markAttendance = async (staffId, status) => {
        const today = new Date().toISOString().split('T')[0];
        try {
            await API.post('/staff/attendance', { 
                staff_id: staffId, 
                date: today, 
                status: status,
                clock_in: new Date().toISOString()
            });
            toast.success(`Marked ${status} manually`);
            fetchData();
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const calculateAttendanceSalary = async (staffId) => {
        const lastPay = payroll.find(p => p.staff_id === staffId);
        const startDate = lastPay ? new Date(lastPay.payment_date) : new Date(selectedStaff.join_date);
        const endDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        
        try {
            const { data } = await API.get(`/staff/attendance?staff_id=${staffId}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
            const presentDays = data.filter(a => a.status === 'present').length;
            const halfDays = data.filter(a => a.status === 'half_day').length;
            const effectiveDays = presentDays + (halfDays * 0.5);
            
            const { data: advances } = await API.get(`/staff/payroll?staff_id=${staffId}&type=advance&start=${startDate.toISOString()}`);
            const totalAdvance = (advances || []).reduce((sum, a) => sum + Number(a.total_paid), 0);

            const dailyRate = Number(selectedStaff.base_salary) / 30;
            const suggestion = dailyRate * effectiveDays;
            const deduction = Number(selectedStaff.base_salary) - suggestion; 

            setPayForm({
                ...payForm,
                calculated: true,
                daysPresent: presentDays,
                deductions: Math.max(0, Math.round(deduction)),
                advanceDeduction: totalAdvance,
                bonus: 0,
                period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
            });
            toast.success(`Hisab updated: ${totalAdvance} advance detected.`);
        } catch (err) {
            toast.error("Could not fetch attendance for calculation");
        }
    };

    const handleIssueAdvance = async (e) => {
        e.preventDefault();
        if (!selectedStaff) return;

        try {
            await API.post('/staff/payroll', {
                staff_id: selectedStaff.id,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                base_pay: 0,
                bonus: 0,
                deductions: 0,
                total_paid: Number(advanceForm.amount),
                payment_status: 'paid',
                payment_type: 'advance',
                payment_date: new Date().toISOString(),
                notes: advanceForm.notes
            });

            // Log as Expense via secure backend
            await API.post('/expenses', {
                amount: Number(advanceForm.amount),
                category: 'Staff Advance',
                description: `Advance given to ${selectedStaff.name}: ${advanceForm.notes || 'No notes'}`,
                date: new Date().toISOString()
            });

            toast.success("Cash Advance Issued & Expense Logged!");
            setShowAdvanceModal(false);
            setAdvanceForm({ amount: '', notes: '' });
            fetchData();
        } catch (err) {
            toast.error("Advance log failed");
        }
    };

    const handleSalaryPayment = async (e) => {
        e.preventDefault();
        const total = Number(selectedStaff.base_salary) + Number(payForm.bonus) - (Number(payForm.deductions) + Number(payForm.advanceDeduction));
        
        try {
            await API.post('/staff/payroll', {
                staff_id: selectedStaff.id,
                month: Number(payForm.month),
                year: Number(payForm.year),
                base_pay: Number(selectedStaff.base_salary),
                bonus: Number(payForm.bonus),
                deductions: Number(payForm.deductions),
                total_paid: total,
                payment_status: 'paid',
                payment_date: new Date().toISOString()
            });

            // Log as Expense
            await API.post('/expenses', {
                amount: total,
                category: 'Staff Salary',
                description: `Salary paid to ${selectedStaff.name} (Bonus: ₹${payForm.bonus}, Cuts: ₹${payForm.deductions + Number(payForm.advanceDeduction)})`,
                date: new Date().toISOString()
            });

            toast.success("Salary Paid & Expense Logged!");
            setShowPayModal(false);
            fetchData();
        } catch (err) {
            toast.error("Salary payment failed");
        }
    };

    const handleDeletePayroll = async (id, staffName, amount, type) => {
        if (!window.confirm(`Delete this payment record for ${staffName}?`)) return;

        try {
            await API.delete(`/staff/payroll/${id}`);
            // Note: Expense deletion is handled by backend or manual
            toast.success("Payment deleted & Hisab cleared!");
            fetchData();
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    const getDaysInMonth = (month, year) => {
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    };

    // Construct the one universal Store QR link
    const storeQRValue = `${window.location.origin}/attend?biz=${user.id}`;

    return (
        <div className="space-y-8 animate-fade-in-up pb-10 max-w-[1400px] mx-auto">
            {/* Elegant Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[#0F172A] p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-blue/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-[80px]" />
                <div className="flex items-center gap-6 relative z-10">
                   <div className="w-20 h-20 bg-brand-blue rounded-[28px] flex items-center justify-center text-white shadow-lg shadow-brand-blue/20 ring-4 ring-brand-blue/10">
                      <Users size={36} />
                   </div>
                   <div>
                      <h1 className="text-[32px] font-black text-white tracking-tight">Staff Operations</h1>
                      <div className="text-slate-400 text-[14px] font-medium mt-1 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Professional Workforce Management
                      </div>
                   </div>
                </div>
                <div className="flex flex-wrap gap-4 relative z-10">
                    <Button variant="secondary" onClick={() => setShowStoreQR(true)} icon={<QrCode size={20} />} className="bg-white/10 text-white border-white/10 hover:bg-white/20 backdrop-blur-md px-8 py-4 rounded-2xl font-black">Shop QR Code</Button>
                    <Button variant="secondary" onClick={() => setShowAdvanceModal(true)} icon={<Wallet size={20} />} className="bg-amber-500/20 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white px-8 py-4 rounded-2xl font-black">Give Advance Cash</Button>
                    <Button onClick={() => setShowAddModal(true)} icon={<Plus size={20} />} className="px-8 py-4 rounded-2xl font-black shadow-xl shadow-brand-blue/20">Add New Staff</Button>
                </div>
            </div>

            {/* Matrix Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="p-8 border-none bg-white shadow-xl rounded-[32px] relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                       <Users size={60} />
                   </div>
                   <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Employees</p>
                   <p className="text-[40px] font-black text-brand-navy">{staff.length}</p>
                </Card>
                <Card className="p-8 border-none bg-emerald-500 shadow-xl shadow-emerald-200 rounded-[32px] text-white">
                   <p className="text-[12px] font-black uppercase tracking-widest opacity-70 mb-1">On-Duty Today</p>
                   <p className="text-[40px] font-black">{presentTodayCount}</p>
                </Card>
                <Card className="p-8 border-none bg-white shadow-xl rounded-[32px] relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                       <DollarSign size={60} />
                   </div>
                   <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Budget</p>
                   <p className="text-[40px] font-black text-brand-navy">₹{staff.reduce((s, a) => s + Number(a.base_salary), 0).toLocaleString()}</p>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-100 p-2 rounded-[24px] w-fit shadow-inner mx-auto mb-10 border border-slate-200">
                {['list', 'salary-history', 'attendance'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-10 py-4 rounded-[18px] text-[15px] font-black transition-all ${
                            activeTab === tab ? 'bg-white text-brand-navy shadow-xl' : 'text-slate-400 hover:text-brand-navy'
                        }`}
                    >
                        {tab === 'list' && 'Staff Directory'}
                        {tab === 'salary-history' && 'Payment Logs'}
                        {tab === 'attendance' && 'Attendance Calendar'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-20 text-center font-black text-brand-blue/30 animate-pulse text-[28px] tracking-tighter italic">LOADING STAFF DETAILS...</div>
            ) : (
                <div className="min-h-[600px] pb-20">
                    {/* STAFF DIRECTORY */}
                    {activeTab === 'list' && (
                        <Card noPadding className="overflow-hidden border-none shadow-2xl rounded-[40px] bg-white">
                            <Table>
                                <Thead className="bg-slate-50/50">
                                    <tr>
                                        <Th className="py-6">ID & Employee</Th>
                                        <Th>Position</Th>
                                        <Th className="text-right">Base Salary</Th>
                                        <Th className="text-center">Today's Presence</Th>
                                        <Th className="text-center">Manual Log</Th>
                                        <Th className="text-right px-10">Actions</Th>
                                    </tr>
                                </Thead>
                                <tbody className="divide-y divide-slate-100 italic font-medium">
                                    {staff.map(s => {
                                        const todayLog = attendance.find(a => a.staff_id === s.id);
                                        return (
                                            <Tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <Td className="py-6">
                                                    <div className="flex items-center gap-5">
                                                       <div className="w-14 h-14 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center text-[20px] font-black shadow-lg shadow-slate-300 transition-transform group-hover:scale-105">{s.name.charAt(0)}</div>
                                                       <div>
                                                          <p className="font-black text-[16px] text-[#0F172A] not-italic">{s.name}</p>
                                                          <p className="text-[11px] text-brand-blue font-black uppercase tracking-widest mt-1">Worker PIN: {s.qr_token}</p>
                                                       </div>
                                                    </div>
                                                </Td>
                                                <Td><Badge variant="outline" className="text-slate-500 border-slate-200 font-black tracking-widest px-4 py-1">{s.position?.toUpperCase()}</Badge></Td>
                                                <Td className="text-right font-black text-[#0F172A] text-[17px]">₹{Number(s.base_salary).toLocaleString()}</Td>
                                                <Td className="text-center">
                                                    {todayLog ? (
                                                        <Badge variant={todayLog.status === 'present' ? 'success' : 'warning'} className="rounded-full px-6 py-1.5">{todayLog.status.toUpperCase()}</Badge>
                                                    ) : <span className="text-[12px] text-slate-300 font-black tracking-[0.2em] uppercase">Inactive</span>}
                                                </Td>
                                                <Td className="text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => markAttendance(s.id, 'present')} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all"><CheckCircle size={22} /></button>
                                                        <button onClick={() => markAttendance(s.id, 'absent')} className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><XCircle size={22} /></button>
                                                    </div>
                                                </Td>
                                                <Td className="text-right px-10">
                                                    {payroll.some(p => p.staff_id === s.id && p.payment_type !== 'advance' && new Date(p.payment_date).toDateString() === new Date().toDateString()) ? (
                                                        <div className="flex items-center gap-2 text-emerald-600 font-black text-[13px] ml-auto w-fit bg-emerald-50 px-4 py-2 rounded-xl">
                                                            <CheckCircle size={16} /> Paid Today
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => { setSelectedStaff(s); setShowPayModal(true); }} className="text-brand-blue font-black text-[14px] hover:underline flex items-center gap-2 ml-auto">Pay Salary <ArrowRight size={14} /></button>
                                                    )}
                                                </Td>
                                            </Tr>
                                        )
                                    })}
                                </tbody>
                            </Table>
                        </Card>
                    )}
                                    {/* ATTENDANCE CALENDAR (Refined & Professional) */}
                    {activeTab === 'attendance' && (
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                            <Card className="xl:col-span-1 p-6 border border-slate-100 bg-white shadow-xl rounded-[32px] h-fit">
                                <h3 className="text-[16px] font-black text-[#0F172A] mb-5 flex items-center gap-3"><Users size={18} className="text-brand-blue" /> Select Staff</h3>
                                
                                {/* Professional Search Bar */}
                                <div className="relative mb-5">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text"
                                        placeholder="Quick search..."
                                        value={calSearch}
                                        onChange={(e) => setCalSearch(e.target.value)}
                                        className="w-full bg-slate-50/80 border border-slate-100 rounded-xl py-3 pl-11 pr-4 font-bold text-[13px] text-[#0F172A] outline-none focus:border-brand-blue/50 focus:bg-white transition-all"
                                    />
                                </div>

                                <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar -mx-2">
                                    {staff.filter(s => s.name && s.name.toLowerCase().includes(calSearch.toLowerCase())).map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => setCalStaffId(s.id)}
                                            className={`w-full text-left p-4 rounded-xl font-black text-[14px] transition-all flex items-center justify-between group relative overflow-hidden ${
                                                calStaffId === s.id ? 'bg-brand-blue/5 text-brand-blue' : 'text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 z-10">
                                                <div className={`w-2 h-2 rounded-full transition-all ${calStaffId === s.id ? 'bg-brand-blue' : 'bg-slate-200'}`} />
                                                {s.name}
                                            </div>
                                            {calStaffId === s.id && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-blue rounded-r-full" />
                                            )}
                                        </button>
                                    ))}
                                    {staff.filter(s => s.name && s.name.toLowerCase().includes(calSearch.toLowerCase())).length === 0 && (
                                        <div className="py-10 text-center text-slate-300 font-bold italic text-[12px]">No workers found</div>
                                    )}
                                </div>
                            </Card>

                            <Card className="xl:col-span-3 p-10 border-none bg-white shadow-2xl rounded-[48px] relative overflow-hidden">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
                                    <div>
                                        <h3 className="text-[26px] font-black text-brand-navy tracking-tight">{staff.find(s=>s.id === calStaffId)?.name}'s Attendance</h3>
                                        <p className="text-[13px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">Worker Records</p>
                                    </div>
                                    <div className="flex bg-[#0F172A] rounded-2xl p-1.5 gap-2 shadow-xl">
                                        <button onClick={() => setCalMonth(m => (m === 0 ? 11 : m - 1))} className="p-3 text-white hover:bg-white/10 rounded-xl transition-all"><ChevronLeft size={20}/></button>
                                        <span className="px-8 py-3 font-black text-white min-w-[200px] text-center text-[16px]">
                                            {new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button onClick={() => setCalMonth(m => (m === 11 ? 0 : m + 1))} className="p-3 text-white hover:bg-white/10 rounded-xl transition-all"><ChevronRight size={20}/></button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-4 mb-12">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                        <div key={d} className="text-center text-[12px] font-black text-slate-300 uppercase tracking-[0.4em] py-4">{d}</div>
                                    ))}
                                    {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => (
                                        <div key={`empty-${i}`} className="h-[100px] rounded-[32px] bg-slate-50/30 border-2 border-dashed border-slate-100/50" />
                                    ))}
                                    {getDaysInMonth(calMonth, calYear).map(day => {
                                        const dateStr = day.toISOString().split('T')[0];
                                        const log = calData.find(a => a.date === dateStr);
                                        const isToday = new Date().toDateString() === day.toDateString();
                                        return (
                                            <div key={dateStr} className={`h-[100px] border-2 rounded-[32px] p-5 transition-all relative group flex flex-col justify-between ${
                                                log ? 'bg-white border-brand-blue/20 shadow-xl' : 
                                                day > new Date() ? 'bg-slate-50/10 border-slate-50 border-dashed opacity-40' : 'bg-white border-slate-100 hover:border-brand-blue/30 shadow-sm hover:shadow-md'
                                            }`}>
                                                <span className={`text-[20px] font-black ${isToday ? 'text-brand-blue' : 'text-slate-400 group-hover:text-brand-navy'}`}>
                                                    {day.getDate()}
                                                </span>
                                                {log ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3.5 h-3.5 rounded-full shadow-lg ${
                                                            log.status === 'present' ? 'bg-emerald-500 shadow-emerald-200' : 
                                                            log.status === 'late' ? 'bg-amber-500 shadow-amber-200' : 'bg-rose-500 shadow-rose-200'
                                                        }`} />
                                                        <span className="text-[10px] font-black uppercase text-brand-navy tracking-widest">{log.status}</span>
                                                    </div>
                                                ) : day < new Date() && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">ABSENT</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex flex-wrap gap-12 p-10 bg-slate-50 rounded-[40px] border border-slate-100 items-center justify-center">
                                    <div className="flex items-center gap-4"><div className="w-4 h-4 rounded-full bg-emerald-500 shadow-xl shadow-emerald-200" /><span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Verified Log</span></div>
                                    <div className="flex items-center gap-4"><div className="w-4 h-4 rounded-full bg-amber-500 shadow-xl shadow-amber-200" /><span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Late / Half Day</span></div>
                                    <div className="flex items-center gap-4"><div className="w-4 h-4 rounded-full bg-rose-500 shadow-xl shadow-rose-200" /><span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Unrecorded</span></div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* PAYMENT LOGS */}
                    {activeTab === 'salary-history' && (
                        <Card noPadding className="overflow-hidden border-none shadow-2xl rounded-[40px] bg-white">
                            <Table>
                                <Thead className="bg-slate-50/50">
                                    <tr>
                                        <Th className="py-6">Worker Name</Th>
                                        <Th>Month / Year</Th>
                                        <Th>Type</Th>
                                        <Th className="text-right">Pay Amount</Th>
                                        <Th className="text-center px-8">Actions</Th>
                                    </tr>
                                </Thead>
                                <Tbody className="bg-white italic font-medium">
                                    {payroll.map(p => (
                                        <Tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                            <Td className="py-6 font-black text-brand-navy not-italic">{p.staff?.name}</Td>
                                            <Td className="text-slate-500 font-bold">{new Date(0, p.month-1).toLocaleString('default', { month: 'long' })} {p.year}</Td>
                                            <Td>
                                                <Badge variant={p.payment_type === 'advance' ? 'warning' : 'info'} className="rounded-full px-4 capitalize">
                                                    {p.payment_type || 'salary'}
                                                </Badge>
                                            </Td>
                                            <Td className="text-right font-black text-emerald-600 text-[18px]">₹{Number(p.total_paid).toLocaleString()}</Td>
                                            <Td className="text-center px-8">
                                                <div className="flex justify-center gap-3">
                                                    <button onClick={() => toast.success("Edit feature coming soon!")} className="p-2 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-xl transition-all"><Edit size={18} /></button>
                                                    <button onClick={() => handleDeletePayroll(p.id, p.staff?.name, p.total_paid, p.payment_type)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                                </div>
                                            </Td>
                                        </Tr>
                                    ))}
                                    {payroll.length === 0 && (
                                        <Tr><Td colSpan="5" className="text-center py-20 text-slate-300 font-black tracking-widest uppercase">No Payment Records Found</Td></Tr>
                                    )}
                                </Tbody>
                            </Table>
                        </Card>
                    )}
                </div>
            )}

            {/* SHOP QR MODAL */}
            <Modal isOpen={showStoreQR} onClose={() => setShowStoreQR(false)} title="Attendance QR Setup" maxWidth="max-w-3xl">
                <div className="p-8 flex flex-col lg:flex-row items-center gap-10 bg-white">
                    {/* Left: QR Side */}
                    <div className="p-6 bg-slate-50 rounded-[40px] shadow-inner border border-slate-100 flex items-center justify-center shrink-0 group">
                        <div className="bg-white p-4 rounded-[32px] shadow-xl group-hover:scale-105 transition-transform duration-500">
                           <QRCodeSVG value={storeQRValue} size={220} includeMargin={true} level="H" />
                        </div>
                    </div>

                    {/* Right: Content Side */}
                    <div className="flex-1 space-y-6 min-w-[300px]">
                       <div>
                          <h3 className="text-[24px] font-black text-[#0F172A] tracking-tight">Shop QR Code</h3>
                          <p className="text-slate-500 font-medium leading-relaxed text-[14px] mt-2">
                             Staff should scan this code with their mobile device to mark their attendance.
                          </p>
                       </div>

                       <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                          <p className="text-[12px] font-black text-brand-blue uppercase tracking-widest mb-2 flex items-center gap-2">
                             <Lock size={14} /> How it works
                          </p>
                          <p className="text-[13px] text-slate-600 leading-snug">
                             Worker will scan this and then write their <b>Staff PIN</b> (found in staff list) to check-in.
                          </p>
                       </div>

                       <Button className="w-full py-5 rounded-2xl font-black text-[16px] shadow-xl" icon={<Maximize2 size={18} />} onClick={() => window.print()}>
                          Print QR Code
                       </Button>
                    </div>
                </div>
            </Modal>

            {/* SALARY PAYMENT MODAL */}
            <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title={`Pay Salary: ${selectedStaff?.name}`} maxWidth="max-w-5xl">
                <form onSubmit={handleSalaryPayment} className="p-4 space-y-8">
                    <div className="flex flex-col xl:flex-row gap-10">
                        {/* LEFT: Identity & Verification */}
                        <div className="xl:w-1/2 space-y-6">
                            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 shadow-inner">
                                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-2">Monthly Fixed Salary</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-[40px] font-black text-brand-navy leading-none">₹{selectedStaff?.base_salary?.toLocaleString()}</p>
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        icon={<Calculator size={20} />}
                                        className="bg-[#0F172A] text-white hover:bg-black rounded-2xl px-6"
                                        onClick={() => calculateAttendanceSalary(selectedStaff.id)}
                                    >
                                        Check Attendance
                                    </Button>
                                </div>
                            </div>

                                {payForm.calculated && (
                                    <div className="space-y-4">
                                        <div className={`p-8 rounded-[40px] border flex flex-col gap-4 ${payForm.daysPresent === 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                            <div className="flex items-center gap-4">
                                                {payForm.daysPresent === 0 ? <AlertCircle size={28} className="text-rose-500" /> : <CheckCircle size={28} className="text-emerald-500" />}
                                                <h4 className={`text-[18px] font-black ${payForm.daysPresent === 0 ? 'text-rose-900' : 'text-emerald-900'}`}>
                                                    {payForm.daysPresent === 0 ? 'Salary Already Paid' : 'Work Days Found'}
                                                </h4>
                                            </div>
                                            <p className={`text-[14px] font-medium italic ${payForm.daysPresent === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                For Days: <b>{payForm.period}</b> <br/>
                                                {payForm.daysPresent === 0 ? "Staff was already paid till today. No new work days found." : `Found ${payForm.daysPresent} days of work in this period.`}
                                            </p>
                                        </div>

                                        {payForm.advanceDeduction > 0 && (
                                            <div className="p-8 bg-amber-50 border border-amber-100 rounded-[40px] flex items-center gap-6">
                                                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                                    <Coins size={28} />
                                                </div>
                                                <div>
                                                    <p className="text-[16px] font-black text-amber-900">Earlier Advance Cash Taken</p>
                                                    <p className="text-[13px] text-amber-600 font-medium">This staff took <b>₹{payForm.advanceDeduction.toLocaleString()}</b> advance earlier. It will be cut from this salary.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT: Adjustments & Net */}
                            <div className="xl:w-1/2 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-2">
                                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Extra Reward / Bonus (₹)</label>
                                      <input 
                                         type="number" 
                                         value={payForm.bonus} 
                                         onChange={e => setPayForm({...payForm, bonus: e.target.value})} 
                                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-brand-navy outline-none focus:border-brand-blue" 
                                      />
                                   </div>
                                   <div className="space-y-2">
                                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Absent Cuts / Fine (₹)</label>
                                      <input 
                                         type="number" 
                                         value={Number(payForm.deductions) + Number(payForm.advanceDeduction)} 
                                         disabled
                                         className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-4 font-black text-brand-navy outline-none italic" 
                                      />
                                   </div>
                                </div>

                                <div className="bg-[#0F172A] p-10 rounded-[48px] text-white shadow-3xl shadow-brand-blue/30 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full translate-x-1/2 -translate-y-1/2" />
                                    <p className="text-[14px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Final Pay Amount</p>
                                    <p className="text-[52px] font-black text-brand-blue tracking-tighter">
                                        ₹{(Number(selectedStaff?.base_salary) + Number(payForm.bonus) - (Number(payForm.deductions) + Number(payForm.advanceDeduction))).toLocaleString()}
                                    </p>
                                </div>

                            <Button 
                                type="submit" 
                                disabled={payForm.daysPresent === 0 && payForm.calculated}
                                className={`w-full py-6 rounded-[28px] font-black text-[20px] shadow-2xl transition-all ${payForm.daysPresent === 0 && payForm.calculated ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                            >
                                {payForm.daysPresent === 0 && payForm.calculated ? 'Already Paid' : 'Confirm & Pay Salary'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* ADD STAFF MODAL */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Staff">
                <form onSubmit={handleAddStaff} className="p-6 space-y-8">
                    <Input label="Staff Name" required value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="p-5 rounded-2xl" placeholder="Full Name" />
                    <div className="grid grid-cols-2 gap-6">
                        <Input label="Position" required value={newStaff.position} onChange={e => setNewStaff({...newStaff, position: e.target.value})} className="p-5 rounded-2xl" placeholder="e.g. Sales" />
                        <Input label="Phone Number" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} className="p-5 rounded-2xl" placeholder="+91..." />
                    </div>
                    <Input label="Monthly Salary (₹)" type="number" required value={newStaff.base_salary} onChange={e => setNewStaff({...newStaff, base_salary: e.target.value})} className="p-5 rounded-2xl" />
                    <Button type="submit" className="w-full py-6 mt-4 rounded-2xl font-black text-[18px] shadow-2xl shadow-brand-blue/20">Add Staff Now</Button>
                </form>
            </Modal>
            {/* ISSUE ADVANCE MODAL */}
            <Modal isOpen={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} title="Issue Cash / Advance Payment" maxWidth="max-w-2xl">
                <form onSubmit={handleIssueAdvance} className="p-6 space-y-8">
                    <div className="bg-amber-50 p-8 rounded-[36px] border border-amber-100 flex items-center gap-6">
                        <div className="p-4 bg-white rounded-2xl shadow-sm">
                            <HandCoins size={32} className="text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[18px] font-black text-amber-900 tracking-tight">Give Cash Advance</p>
                            <p className="text-[13px] text-amber-600 font-medium">Money you give now will be tracked and cut from the next salary automatically.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">Choose Staff</label>
                            <select 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] p-5 font-black text-brand-navy outline-none focus:border-brand-blue shadow-inner"
                                value={selectedStaff?.id || ''}
                                onChange={e => setSelectedStaff(staff.find(s => s.id === e.target.value))}
                                required
                            >
                                <option value="">-- Select Person --</option>
                                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <Input 
                            label="Advance Amount (₹)" 
                            type="number" 
                            required 
                            value={advanceForm.amount} 
                            onChange={e => setAdvanceForm({...advanceForm, amount: e.target.value})} 
                            placeholder="e.g. 2000"
                            className="p-5 rounded-2xl" 
                        />
                        <Input 
                            label="Reason / Notes" 
                            value={advanceForm.notes} 
                            onChange={e => setAdvanceForm({...advanceForm, notes: e.target.value})} 
                            placeholder="Emergency use / Personal work"
                            className="p-5 rounded-2xl" 
                        />
                    </div>

                    <Button type="submit" className="w-full py-6 rounded-[24px] font-black text-[18px] bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-200">
                        Confirm & Issue Cash
                    </Button>
                </form>
            </Modal>
        </div>
    );
}
