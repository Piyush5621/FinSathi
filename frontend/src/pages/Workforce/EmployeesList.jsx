import React, { useState, useEffect } from 'react';
import API from '../../services/apiClient';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Users, Search, MoreVertical, Edit, Key, Ban, UserX, Store, ArrowRightLeft, UserCheck, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmployeesList() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await API.get('/staff');
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = (id, name) => {
    toast.success(`${name} has been suspended (Mock)`);
  };

  const handleDeactivate = (id, name) => {
    if (window.confirm(`Are you sure you want to deactivate ${name}?`)) {
      toast.success(`${name} has been deactivated (Mock)`);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-[32px] font-black text-white tracking-tight">Workforce Directory</h1>
            <div className="text-slate-400 text-[14px] font-medium mt-1 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Manage Roles & Store Access
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 relative z-10">
          <Button icon={<Users size={20} />} className="px-8 py-4 rounded-2xl font-black shadow-xl shadow-brand-blue/20 bg-brand-blue hover:bg-blue-600 text-white">
            Invite Employee
          </Button>
        </div>
      </div>

      <Card noPadding className="overflow-hidden border-none shadow-2xl rounded-[40px] bg-white">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search employees..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 font-bold text-[13px] text-[#0F172A] outline-none focus:border-brand-blue/50 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200 px-4 py-2 text-xs font-black tracking-widest uppercase">
              Total: {employees.length}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 font-medium">Loading workforce data...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead className="bg-slate-50/50">
                <tr>
                  <Th className="py-6 px-8">Employee</Th>
                  <Th>Primary Role</Th>
                  <Th>Store Context</Th>
                  <Th>Status</Th>
                  <Th className="text-right px-8">Actions</Th>
                </tr>
              </Thead>
              <Tbody className="divide-y divide-slate-100 italic font-medium">
                {filteredEmployees.map(emp => (
                  <Tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <Td className="py-6 px-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center text-[20px] font-black shadow-lg shadow-slate-300 transition-transform group-hover:scale-105">
                          {emp.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-black text-[16px] text-[#0F172A] not-italic">{emp.name}</p>
                          <p className="text-[11px] text-brand-blue font-black uppercase tracking-widest mt-1">{emp.phone || 'No phone'}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge variant="outline" className="text-slate-500 border-slate-200 font-black tracking-widest px-4 py-1.5 uppercase">
                        <ShieldCheck size={14} className="inline mr-2 text-brand-blue" />
                        {emp.position || 'Standard'}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge variant="outline" className="bg-emerald-50/50 text-emerald-600 border-emerald-100 font-black tracking-widest px-4 py-1.5 uppercase">
                        <Store size={14} className="inline mr-2 text-emerald-500" />
                        Main Branch
                      </Badge>
                    </Td>
                    <Td>
                      <Badge variant="success" className="rounded-full px-6 py-1.5 font-black uppercase tracking-widest text-[10px]">
                        Active
                      </Badge>
                    </Td>
                    <Td className="text-right px-8">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-3 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-xl transition-all" title="Change Role">
                          <Edit size={18} />
                        </button>
                        <button className="p-3 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Transfer Store">
                          <ArrowRightLeft size={18} />
                        </button>
                        <button className="p-3 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all" title="Reset Credentials">
                          <Key size={18} />
                        </button>
                        <button onClick={() => handleSuspend(emp.id, emp.name)} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Suspend Access">
                          <Ban size={18} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <Tr>
                    <Td colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                      No employees found.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
