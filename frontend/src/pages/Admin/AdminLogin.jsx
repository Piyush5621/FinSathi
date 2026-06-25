import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../api/admin';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function AdminLogin() {
  const [username, setUsername] = useState('admin@finsathi.com');
  const [password, setPassword] = useState('finadmin123');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await adminLogin(username, password);
      localStorage.setItem('adminToken', data.token);
      toast.success('Superadmin access granted');
      window.location.href = '/admin/dashboard';
    } catch (err) {
      toast.error('Invalid credentials or unauthorized access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
        <div className="p-8 text-center bg-slate-900 border-b border-slate-800">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <ShieldCheck size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">FinSathi Command Center</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide uppercase">Restricted Tier-1 Access</p>
        </div>
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin Identifier</label>
             <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-4 focus:border-red-500 outline-none"
             />
          </div>
          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock size={14} /> Passcode</label>
             <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-4 focus:border-red-500 outline-none"
             />
          </div>
          <Button fullWidth type="submit" disabled={loading} className="py-4 bg-red-600 hover:bg-red-700 text-white font-black text-lg border-none shadow-lg shadow-red-600/20">
             {loading ? 'Verifying...' : 'Initialize Override'}
          </Button>
        </form>
      </div>
    </div>
  );
}
