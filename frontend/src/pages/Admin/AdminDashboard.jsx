import React, { useEffect, useState } from 'react';
import { fetchAllUsers, toggleUserStatus, fetchUserActivity } from '../../api/admin';
import toast from 'react-hot-toast';
import { ShieldAlert, Users, Activity, Power, History, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        window.location.href = '/admin/login';
      }
      toast.error('Failed to connect to Command Center');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active;
    if (!window.confirm(`Are you sure you want to ${newStatus ? 'ACTIVATE' : 'SUSPEND'} user ${user.email}?`)) return;
    
    try {
      await toggleUserStatus(user.id, newStatus);
      toast.success(`User ${newStatus ? 'Activated' : 'Suspended'}`);
      loadUsers();
    } catch (err) {
      toast.error('Failed to change user status');
    }
  };

  const handleViewActivity = async (user) => {
    try {
      setSelectedUser(user);
      const logs = await fetchUserActivity(user.id);
      setActivityLogs(logs);
      setIsActivityModalOpen(true);
    } catch (err) {
      toast.error('Failed to fetch activity logs');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login';
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.business_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-inter pb-20">
      {/* Admin Header */}
      <div className="bg-slate-900 border-b-4 border-red-500 sticky top-0 z-[100] px-8 py-4 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
            <ShieldAlert size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl tracking-tight">FinSathi Global Command</h1>
            <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Superadmin Session Active</p>
          </div>
        </div>
        <Button onClick={handleLogout} variant="ghost" className="text-red-400 hover:bg-slate-800 hover:text-red-300">
           Terminate Session
        </Button>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 mt-10">
        
        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
           <Card className="bg-white border-2 border-slate-100 p-8 shadow-sm">
              <Users size={32} className="text-brand-blue mb-4" />
              <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest">Total Accounts</h3>
              <p className="text-4xl font-black text-slate-800">{users.length}</p>
           </Card>
           <Card className="bg-white border-2 border-slate-100 p-8 shadow-sm">
              <Activity size={32} className="text-emerald-500 mb-4" />
              <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest">Active Accounts</h3>
              <p className="text-4xl font-black text-slate-800">{users.filter(u => u.is_active).length}</p>
           </Card>
           <Card className="bg-white border-2 border-red-100 p-8 shadow-sm">
              <Power size={32} className="text-red-500 mb-4" />
              <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest">Suspended Accounts</h3>
              <p className="text-4xl font-black text-slate-800">{users.filter(u => !u.is_active).length}</p>
           </Card>
        </div>

        {/* USERS TABLE */}
        <Card className="bg-white border border-slate-200 overflow-hidden shadow-lg">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h2 className="text-lg font-black text-slate-800">Master Directory</h2>
             <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-[300px]">
                <Search size={16} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by name, email, business..." 
                  className="w-full text-sm outline-none bg-transparent"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Auth ID</th>
                  <th className="px-6 py-4">Business Contact</th>
                  <th className="px-6 py-4">Registered Business</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Overrides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                   <tr><td colSpan="5" className="text-center p-10 text-slate-400 font-bold animate-pulse">Scanning Grid...</td></tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-400 font-mono">{user.id.slice(0,8)}...</td>
                    <td className="px-6 py-4">
                       <p className="font-bold text-slate-800">{user.name}</p>
                       <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                       <p className="font-bold text-brand-navy">{user.business_name || 'Individual'}</p>
                       <p className="text-xs text-slate-400">{new Date(user.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                       {user.is_active ? 
                         <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">Active</span> : 
                         <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Suspended</span>
                       }
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                       <Button size="sm" variant="secondary" onClick={() => handleViewActivity(user)} icon={<History size={14}/>}>Logs</Button>
                       <Button 
                          size="sm" 
                          className={user.is_active ? "bg-red-500 hover:bg-red-600 border-none text-white" : "bg-emerald-500 hover:bg-emerald-600 border-none text-white"} 
                          onClick={() => handleToggleStatus(user)}
                       >
                          {user.is_active ? 'Suspend' : 'Activate'}
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ACTIVITY MODAL */}
      <Modal isOpen={isActivityModalOpen} onClose={() => setIsActivityModalOpen(false)} title={`Activity Logs: ${selectedUser?.name}`}>
         <div className="max-h-[500px] overflow-y-auto pr-2 pb-4">
            {activityLogs.length === 0 ? (
               <p className="text-center py-10 text-slate-400 font-bold">No activity recorded</p>
            ) : (
               <div className="space-y-4 relative">
                  <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-slate-200" />
                  {activityLogs.map((log, i) => (
                     <div key={log.id || i} className="relative pl-10 flex flex-col gap-1 z-10">
                        <div className="absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full bg-brand-blue border-2 border-white shadow-sm" />
                        <p className="text-xs font-bold text-slate-500 uppercase">{new Date(log.created_at).toLocaleString()}</p>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl shadow-sm">
                           <p className="text-sm font-black text-brand-navy">{log.action}</p>
                           {log.details && <pre className="mt-2 text-[10px] bg-slate-800 text-emerald-400 p-2 rounded-lg font-mono overflow-x-auto">{JSON.stringify(log.details, null, 2)}</pre>}
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </Modal>

    </div>
  );
}
