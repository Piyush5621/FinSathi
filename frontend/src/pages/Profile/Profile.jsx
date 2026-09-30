import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';
import {
  User, ShieldCheck, Building2, Receipt, Calendar, Sliders,
  Store, Users, MessageCircle, Database, Save, Camera, Upload,
  KeyRound, LogOut, Plus, CheckCircle2, AlertTriangle, RefreshCw,
  Clock, ArrowRight, Lock, FileText, Sparkles, Check, X,
  MapPin, Phone, Mail, ExternalLink, ShieldAlert, Zap
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useStore } from '../../contexts/StoreContext';
import { logoutUser } from '../../utils/auth';

const TABS = [
  { id: 'account', label: 'Account & Security', icon: User, desc: 'Personal credentials & password', roleReq: 'all' },
  { id: 'business', label: 'Business Profile', icon: Building2, desc: 'Company identity & address', roleReq: 'admin' },
  { id: 'tax', label: 'Tax & GST', icon: Receipt, desc: 'GSTIN & invoice terms', roleReq: 'admin' },
  { id: 'financial', label: 'Financial Year & Numbering', icon: Calendar, desc: 'Fiscal periods & prefix sequences', roleReq: 'admin' },
  { id: 'preferences', label: 'Preferences & Payments', icon: Sliders, desc: 'Currency, timezone & UPI QR', roleReq: 'admin' },
  { id: 'stores', label: 'Store Branches', icon: Store, desc: 'Retail locations & context', roleReq: 'manager' },
  { id: 'integrations', label: 'Integrations & WhatsApp', icon: MessageCircle, desc: 'E-Bill delivery & reminder rules', roleReq: 'admin' },
  { id: 'system', label: 'System & Recovery', icon: Database, desc: 'Audit trail & backup protection', roleReq: 'admin' },
];

export default function SettingsHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stores, activeStoreId, activeStore, switchStore, refetchStores } = useStore();

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const isStaff = !!(currentUser.staff_id);
  const isOwner = !isStaff && (currentUser.role === 'Owner' || currentUser.is_owner || !currentUser.role || !currentUser.staff_id);
  const isManager = isOwner || currentUser.role === 'Manager';

  // Determine initial tab from query param or route
  const tabFromQuery = searchParams.get('tab');
  const defaultTab = location.pathname === '/profile' ? 'account' : (isOwner ? 'business' : 'account');
  const activeTab = tabFromQuery || defaultTab;

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // State Containers
  const [profile, setProfile] = useState(currentUser);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Security Form State
  const [securityForm, setSecurityForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Master Preferences State
  const [preferences, setPreferences] = useState({
    currencyCode: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    invoicePrefix: 'INV',
    invoiceSuffix: '',
    paddingZeroes: 5,
    resetPolicy: 'yearly'
  });
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Financial Year State
  const [activeFy, setActiveFy] = useState('FY26-27');
  const [showAddFyModal, setShowAddFyModal] = useState(false);
  const [newFy, setNewFy] = useState({
    name: 'FY26-27',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    isActive: true
  });
  const [savingFy, setSavingFy] = useState(false);

  // Reminders Autopilot State
  const [reminderSettings, setReminderSettings] = useState({
    enabled: false,
    threshold: 500,
    days_past_due: 7,
    template: 'Dear {CustomerName}, your pending balance of {Amount} is due. Kindly clear at your earliest.',
    auto_send_on_create: false
  });
  const [savingReminders, setSavingReminders] = useState(false);

  // Add Store Branch State
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [newStore, setNewStore] = useState({ name: '', address: '', phone: '', gstin: '' });
  const [savingStore, setSavingStore] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile — use staff endpoint if staff user
      let profileData = null;
      if (isStaff) {
        const meRes = await API.get('/staff/me/profile').catch(() => null);
        profileData = meRes?.data || null;
      } else {
        const meRes = await API.get('/auth/me').catch(() => null);
        profileData = meRes?.data || null;
      }
      if (profileData) {
        setProfile(prev => ({ ...prev, ...profileData }));
        localStorage.setItem('user', JSON.stringify({ ...currentUser, ...profileData }));
      }

      // 2. Fetch Preferences (owner only)
      if (!isStaff) {
        const prefsRes = await API.get('/settings/preferences').catch(() => null);
        if (prefsRes?.data?.data) {
          const d = prefsRes.data.data;
          setPreferences(prev => ({
            ...prev,
            currencyCode: d.currencyCode || 'INR',
            currencySymbol: d.currencySymbol || '₹',
            timezone: d.timezone || 'Asia/Kolkata',
            ...(d.billingPreferences || {})
          }));
        }

        // 3. Fetch Reminders (owner only)
        const remRes = await API.get('/reminders/settings').catch(() => null);
        if (remRes?.data) {
          setReminderSettings(prev => ({ ...prev, ...remRes.data }));
        }
      }
    } catch (err) {
      console.warn('Settings preload partial fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  // Profile Form Handlers
  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return toast.error('Photo size must be under 2MB.');
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatar_url: reader.result }));
        toast.success('Photo ready! Click Save Changes below to persist.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSavingProfile(true);
    try {
      // Staff can only update name, phone, avatar_url
      let payload = {};
      if (isStaff) {
        payload = {
          name: profile.name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
        };
        const res = await API.put('/auth/update', payload);
        const updated = res.data?.data || payload;
        setProfile(prev => ({ ...prev, ...updated }));
        localStorage.setItem('user', JSON.stringify({ ...currentUser, ...updated }));
      } else {
        payload = { ...profile };
        const res = await API.put('/auth/update', payload);
        const updated = res.data?.data || payload;
        setProfile(prev => ({ ...prev, ...updated }));
        localStorage.setItem('user', JSON.stringify({ ...currentUser, ...updated }));
      }
      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to update settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!securityForm.oldPassword) return toast.error('Please enter your current password.');
    if (securityForm.newPassword.length < 6) return toast.error('New password must be at least 6 characters.');
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      return toast.error('New passwords do not match.');
    }

    setSavingSecurity(true);
    try {
      if (isStaff) {
        // Staff use dedicated endpoint
        await API.put('/staff/me/password', {
          currentPassword: securityForm.oldPassword,
          newPassword: securityForm.newPassword
        });
        toast.success('Password updated! Please log in again with your new password.');
        setSecurityForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        // Clear session and redirect to login since all sessions are invalidated
        setTimeout(() => {
          localStorage.clear();
          window.location.href = '/login';
        }, 1500);
      } else {
        await API.post('/auth/change-password', {
          oldPassword: securityForm.oldPassword,
          newPassword: securityForm.newPassword
        });
        toast.success('Password changed successfully! Other device sessions invalidated.');
        setSecurityForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.summary || 'Failed to change password.');
    } finally {
      setSavingSecurity(false);
    }
  };

  // Logout All Devices Handler
  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to sign out from all other logged-in devices?')) return;
    try {
      await API.post('/auth/logout-all');
      toast.success('All other sessions terminated.');
    } catch (err) {
      toast.error('Failed to terminate sessions.');
    }
  };

  // Preferences Save Handler
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPreferences(true);
    try {
      await API.put('/settings/preferences', {
        currencyCode: preferences.currencyCode,
        currencySymbol: preferences.currencySymbol,
        timezone: preferences.timezone,
        billingPreferences: {
          invoicePrefix: preferences.invoicePrefix,
          invoiceSuffix: preferences.invoiceSuffix,
          paddingZeroes: Number(preferences.paddingZeroes || 5),
          resetPolicy: preferences.resetPolicy
        }
      });
      toast.success('Preferences saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to save preferences.');
    } finally {
      setSavingPreferences(false);
    }
  };

  // Financial Year Handler
  const handleCreateFy = async (e) => {
    e.preventDefault();
    setSavingFy(true);
    try {
      const res = await API.post('/settings/fy', newFy);
      if (res.data?.success) {
        toast.success(`Fiscal Year ${newFy.name} registered and activated!`);
        setActiveFy(newFy.name);
        setShowAddFyModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to register Fiscal Year.');
    } finally {
      setSavingFy(false);
    }
  };

  // Reminders Autopilot Handler
  const handleSaveReminders = async (e) => {
    if (e) e.preventDefault();
    setSavingReminders(true);
    try {
      await API.put('/reminders/settings', reminderSettings);
      toast.success('Collections & reminder rules updated!');
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to save reminder rules.');
    } finally {
      setSavingReminders(false);
    }
  };

  // Store Branch Handler
  const handleCreateStore = async (e) => {
    e.preventDefault();
    if (!newStore.name.trim()) return toast.error('Branch name is required.');
    setSavingStore(true);
    try {
      const res = await API.post('/stores', newStore);
      if (res.data?.success) {
        toast.success('New branch registered successfully!');
        setNewStore({ name: '', address: '', phone: '', gstin: '' });
        setShowAddStoreModal(false);
        refetchStores();
      }
    } catch (err) {
      toast.error(err.response?.data?.summary || 'Failed to create branch.');
    } finally {
      setSavingStore(false);
    }
  };

  // Permission Check Helper
  const isTabPermitted = (tabId) => {
    if (tabId === 'account') return true;
    if (tabId === 'stores') return isManager;
    return isOwner;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* 1. Header with Breadcrumb Context & Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              System Administration
            </span>
            {activeStore && (
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                • <Store size={11} className="text-slate-400" /> {activeStore.name}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-600 shrink-0" />
            Settings & Business Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your personal credentials, company profile, tax compliance, numbering series, and automation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInitialData}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Refresh Settings"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Save size={15} /> <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Responsive Segmented Tab Strip */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 min-w-max">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const permitted = isTabPermitted(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : permitted
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 opacity-80'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{tab.label}</span>
                {!permitted && <Lock size={10} className="ml-0.5 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tab Contents */}
      {!isTabPermitted(activeTab) ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <Lock size={22} />
          </div>
          <h3 className="text-base font-black text-slate-900">Access Restricted</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            This administrative configuration section requires Business Owner privileges. Please consult your business administrator to modify these parameters.
          </p>
          <Button onClick={() => setActiveTab('account')} variant="outline" size="sm" className="font-bold text-xs">
            Return to My Account
          </Button>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ================= TAB 1: ACCOUNT & SECURITY ================= */}
          {activeTab === 'account' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card & Avatar */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs text-center flex flex-col items-center">
                  <div className="relative group mb-4">
                    <div
                      onClick={() => document.getElementById('avatar-input').click()}
                      className="w-24 h-24 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-3xl shadow-md border-2 border-white ring-4 ring-slate-100 cursor-pointer overflow-hidden relative"
                    >
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}</span>
                      )}
                      <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={18} className="text-white" />
                        <span className="text-[9px] text-white font-bold mt-1">Change</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => document.getElementById('avatar-input').click()}
                      className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-indigo-700"
                    >
                      <Upload size={12} />
                    </button>
                    <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                  </div>

                  <h2 className="text-base font-black text-slate-900">{profile.name || 'Staff User'}</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{profile.email}</p>

                  <div className="mt-3 flex items-center gap-1.5">
                    <Badge variant="blue" className="text-[10px] font-bold uppercase">
                      {currentUser.role || 'Owner'}
                    </Badge>
                    {profile.gstin && (
                      <Badge variant="success" className="text-[10px] font-bold uppercase">
                        GST: {profile.gstin}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-4 leading-snug">
                    Click avatar to upload your profile photo (PNG, JPG under 2MB).
                  </p>
                </div>

                {/* Session Revocation Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-rose-600" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Device Sessions</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    If you suspect unauthorized activity, invalidate all current authentication sessions across other browsers and mobile devices.
                  </p>
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={logoutUser}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut size={14} /> Sign Out of This Account
                    </button>
                    <button
                      type="button"
                      onClick={handleLogoutAll}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldAlert size={13} /> Sign Out All Other Devices
                    </button>
                  </div>
                </div>

                {/* Staff Business & Store Context Card (only for staff) */}
                {isStaff && (
                  <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2">
                      <Store size={16} className="text-amber-700" />
                      <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">Business & Store Context</h3>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-amber-100">
                        <span className="text-amber-800 font-medium">Business / Shop</span>
                        <span className="font-bold text-slate-900">{currentUser.shop_name || currentUser.business_name || 'Store'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-amber-100">
                        <span className="text-amber-800 font-medium">Store Owner</span>
                        <span className="font-bold text-slate-900">{currentUser.owner_name || 'Store Owner'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-amber-800 font-medium">Assigned Branch</span>
                        <span className="font-bold text-slate-900">{currentUser.store_name || activeStore?.name || 'Main Branch'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Staff Role & Permissions Card (only for staff) */}
                {isStaff && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-indigo-600" />
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">My Access & Role</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Assigned Role</span>
                        <Badge variant="blue" className="text-[10px] font-bold uppercase">
                          {currentUser.role || profile.position || 'Staff'}
                        </Badge>
                      </div>
                      {currentUser.permissions && currentUser.permissions.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 mb-2">Granted Permissions</p>
                          <div className="flex flex-wrap gap-1.5">
                            {currentUser.permissions.map(perm => (
                              <span key={perm} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {perm}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(!currentUser.permissions || currentUser.permissions.length === 0) && (
                        <p className="text-[11px] text-slate-400 leading-snug">
                          No specific permissions configured. Contact your store owner to get access assigned.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Personal Details & Password Forms */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Credentials */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Personal Information</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Your personal identity and contact details.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={profile.name || ''}
                          onChange={handleProfileChange}
                          required
                          className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={profile.phone || ''}
                          onChange={handleProfileChange}
                          placeholder="10-digit mobile number"
                          className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                        Email Address (Read-Only)
                      </label>
                      <input
                        type="email"
                        value={profile.email || ''}
                        disabled
                        className="w-full px-3.5 py-2.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl cursor-not-allowed font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">To update your login email, contact your organization administrator.</p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={savingProfile} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
                        {savingProfile ? 'Saving...' : 'Update Personal Info'}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Password & Security Credentials */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <KeyRound size={16} className="text-indigo-600" />
                      Change Password
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Protect your account with a secure, unique password.</p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                        Current Password <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={securityForm.oldPassword}
                        onChange={e => setSecurityForm({ ...securityForm, oldPassword: e.target.value })}
                        required
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                          New Password <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={securityForm.newPassword}
                          onChange={e => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                          required
                          placeholder="Min 6 characters"
                          className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                          Confirm New Password <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={securityForm.confirmPassword}
                          onChange={e => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                          required
                          placeholder="Re-enter new password"
                          className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={savingSecurity} size="sm" className="bg-slate-900 hover:bg-slate-800 text-xs font-bold">
                        {savingSecurity ? 'Updating Password...' : 'Save New Password'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: BUSINESS PROFILE ================= */}
          {activeTab === 'business' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-black text-slate-900">Legal Company & Store Identity</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  This information appears on tax invoices, bill headers, payment receipts, and B2B directory listings.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Business / Trade Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="business_name"
                      value={profile.business_name || ''}
                      onChange={handleProfileChange}
                      required
                      placeholder="e.g. Om Enterprise Wholesale"
                      className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Business Sector / Industry
                    </label>
                    <select
                      name="business_type"
                      value={profile.business_type || ''}
                      onChange={handleProfileChange}
                      className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                    >
                      <option value="">Select Category</option>
                      <option value="retail">Retail Store & Supermarket</option>
                      <option value="wholesale">Wholesale & Distributor</option>
                      <option value="manufacturing">Manufacturing & FMCG</option>
                      <option value="service">Service & Agency</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={profile.city || ''}
                      onChange={handleProfileChange}
                      placeholder="e.g. Ahmedabad"
                      className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      State / Union Territory
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={profile.state || ''}
                      onChange={handleProfileChange}
                      placeholder="e.g. Gujarat"
                      className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Physical Store Address
                  </label>
                  <textarea
                    name="address"
                    rows={3}
                    value={profile.address || ''}
                    onChange={handleProfileChange}
                    placeholder="Shop / Unit No, Street, Landmark, PIN Code"
                    className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold resize-none"
                  />
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <Button type="submit" disabled={savingProfile} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
                    {savingProfile ? 'Saving...' : 'Save Business Profile'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 3: TAX & GST ================= */}
          {activeTab === 'tax' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900">GST Registration & Tax Setup</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure your 15-character GSTIN number and default billing terms.
                  </p>
                </div>
                <Badge variant={profile.gstin ? 'success' : 'neutral'} className="text-[10px] font-bold uppercase self-start sm:self-auto">
                  {profile.gstin ? 'GST REGISTERED' : 'COMPOSITION / UNREGISTERED'}
                </Badge>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    GSTIN / Tax Identification Number
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={profile.gstin || ''}
                    onChange={handleProfileChange}
                    placeholder="e.g. 24ABCDE1234F1Z5"
                    className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format: 2-digit state code + 10-digit PAN + 1 entity number + 'Z' + 1 check digit.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Default Invoice Terms, Conditions & Return Policies
                  </label>
                  <textarea
                    name="invoice_terms"
                    rows={4}
                    value={profile.invoice_terms || '1. Goods once sold will not be accepted back.\n2. Interest @ 18% p.a. charged on overdue bills.\n3. Subject to local jurisdiction.'}
                    onChange={handleProfileChange}
                    className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-xs resize-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    These lines print at the footer of POS thermal receipts and A4 GST bills.
                  </p>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <Button type="submit" disabled={savingProfile} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
                    {savingProfile ? 'Saving...' : 'Save Tax & Terms'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 4: FINANCIAL YEAR & NUMBERING ================= */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              {/* Financial Year Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      Accounting Period
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">Active Financial Year</h3>
                    <p className="text-xs text-slate-500">All inventory valuations and invoice ledger books map to this fiscal period.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{activeFy}</p>
                      <p className="text-[10px] text-slate-400 font-medium">01 Apr 2026 – 31 Mar 2027</p>
                    </div>
                    <Button onClick={() => setShowAddFyModal(true)} size="sm" variant="outline" className="font-bold text-xs">
                      <Plus size={13} /> New Period
                    </Button>
                  </div>
                </div>
              </div>

              {/* Numbering Series Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900">Document Numbering Series</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize auto-incrementing serial sequences for POS bills, tax invoices, and credit notes.
                  </p>
                </div>

                <form onSubmit={handleSavePreferences} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                        Invoice Prefix
                      </label>
                      <input
                        type="text"
                        value={preferences.invoicePrefix || 'INV'}
                        onChange={e => setPreferences({ ...preferences, invoicePrefix: e.target.value })}
                        placeholder="e.g. INV or BILL"
                        className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                        Padding Zeroes
                      </label>
                      <select
                        value={preferences.paddingZeroes || 5}
                        onChange={e => setPreferences({ ...preferences, paddingZeroes: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                      >
                        <option value={4}>4 Digits (e.g. 0001)</option>
                        <option value={5}>5 Digits (e.g. 00001)</option>
                        <option value={6}>6 Digits (e.g. 000001)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                        Reset Cycle
                      </label>
                      <select
                        value={preferences.resetPolicy || 'yearly'}
                        onChange={e => setPreferences({ ...preferences, resetPolicy: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                      >
                        <option value="yearly">Reset Every Financial Year</option>
                        <option value="never">Continuous / Never Reset</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-700">Preview of Next Generated Number:</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Based on your prefix, fiscal year, and padding configuration.</p>
                    </div>
                    <span className="font-mono text-sm font-black text-indigo-700 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-2xs">
                      {preferences.invoicePrefix || 'INV'}-2627-00001
                    </span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={savingPreferences} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
                      {savingPreferences ? 'Saving...' : 'Save Numbering Series'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= TAB 5: PREFERENCES & UPI PAYMENTS ================= */}
          {activeTab === 'preferences' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-black text-slate-900">System Preferences & UPI Payment Setup</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure default currency, accounting timezone, and printed digital UPI QR codes.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Base Operating Currency
                    </label>
                    <input
                      type="text"
                      value={`${preferences.currencySymbol} ${preferences.currencyCode}`}
                      disabled
                      className="w-full px-3.5 py-2.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl cursor-not-allowed font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Operational Timezone
                    </label>
                    <input
                      type="text"
                      value={preferences.timezone}
                      disabled
                      className="w-full px-3.5 py-2.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl cursor-not-allowed font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      UPI ID (For Auto Invoice QR Code)
                    </label>
                    <input
                      type="text"
                      name="upi_id"
                      value={profile.upi_id || ''}
                      onChange={handleProfileChange}
                      placeholder="e.g. omstores@okaxis"
                      className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Customers scan this dynamic QR on checkout receipts to pay via GPay, PhonePe, or Paytm.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Static Custom QR Image URL (Optional)
                    </label>
                    <input
                      type="text"
                      name="payment_qr_url"
                      value={profile.payment_qr_url || ''}
                      onChange={handleProfileChange}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Overrides the auto-generated code with your bank's physical standee QR code.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <Button type="submit" disabled={savingProfile} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
                    {savingProfile ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 6: STORE BRANCHES ================= */}
          {activeTab === 'stores' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div>
                  <h2 className="text-base font-black text-slate-900">Branch Locations & Store Registry</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage multi-store locations, warehouse mappings, and switch active terminal context.
                  </p>
                </div>
                <Button onClick={() => setShowAddStoreModal(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
                  <Plus size={13} /> Add Store Branch
                </Button>
              </div>

              {/* Branch Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stores.map(s => {
                  const isActive = s.id === activeStoreId;
                  return (
                    <div
                      key={s.id}
                      onClick={() => !isActive && switchStore(s.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className={`p-2.5 rounded-xl ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Store size={18} />
                        </div>
                        <Badge variant={isActive ? 'success' : 'neutral'} className="text-[9px] font-black uppercase">
                          {isActive ? 'Active Terminal' : 'Switch Store'}
                        </Badge>
                      </div>

                      <h3 className="text-sm font-black text-slate-900">{s.name}</h3>
                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        <p className="flex items-center gap-1.5"><MapPin size={12} className="shrink-0 text-slate-400" /> {s.address || 'Address not set'}</p>
                        <p className="flex items-center gap-1.5"><Phone size={12} className="shrink-0 text-slate-400" /> {s.phone || 'Phone not set'}</p>
                        {s.gstin && <p className="font-mono text-[11px] text-slate-600">GSTIN: {s.gstin}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 7: INTEGRATIONS & WHATSAPP ================= */}
          {activeTab === 'integrations' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <MessageCircle size={18} className="text-emerald-600" />
                      WhatsApp Delivery & Due Collections Autopilot
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Auto-deliver PDF invoices to customer WhatsApp numbers and schedule automated collection reminders.
                    </p>
                  </div>
                  <Badge variant={reminderSettings.enabled ? 'success' : 'neutral'} className="text-[10px] font-bold uppercase">
                    {reminderSettings.enabled ? 'AUTOPILOT ACTIVE' : 'PAUSED'}
                  </Badge>
                </div>
              </div>

              <form onSubmit={handleSaveReminders} className="space-y-5">
                {/* Instant Delivery Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <p className="text-xs font-black text-slate-900">Instant WhatsApp Receipt Dispatch</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Automatically send a digital receipt via WhatsApp immediately upon POS checkout.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReminderSettings(prev => ({ ...prev, auto_send_on_create: !prev.auto_send_on_create }))}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      reminderSettings.auto_send_on_create ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                      reminderSettings.auto_send_on_create ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {/* Automation Rules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Collection Trigger Threshold (₹)
                    </label>
                    <input
                      type="number"
                      value={reminderSettings.threshold}
                      onChange={e => setReminderSettings(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Only trigger reminders if the customer outstanding exceeds this balance.</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Days Past Due Date
                    </label>
                    <input
                      type="number"
                      value={reminderSettings.days_past_due}
                      onChange={e => setReminderSettings(prev => ({ ...prev, days_past_due: Number(e.target.value) }))}
                      className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Grace period allowed after credit invoice due date before dispatching alert.</p>
                  </div>
                </div>

                {/* Template Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Automated Message Template
                    </label>
                    <div className="flex gap-1">
                      {['{CustomerName}', '{Amount}', '{InvoiceNo}'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setReminderSettings(prev => ({ ...prev, template: prev.template + ' ' + tag }))}
                          className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={reminderSettings.template}
                    onChange={e => setReminderSettings(prev => ({ ...prev, template: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                  />
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <Button type="submit" disabled={savingReminders} className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
                    {savingReminders ? 'Saving...' : 'Update Autopilot Rules'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 8: SYSTEM & RECOVERY ================= */}
          {activeTab === 'system' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Security Audit Center Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Security Audit Trail</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    View an immutable, tamper-resistant chronological log of all stock adjustments, invoice deletions, staff role updates, and system logins.
                  </p>
                </div>
                <Button onClick={() => navigate('/audit-center')} variant="outline" size="sm" className="font-bold text-xs w-fit">
                  Open Audit Center <ArrowRight size={13} className="ml-1" />
                </Button>
              </div>

              {/* Disaster Recovery Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <Database size={20} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Disaster Recovery & Backups</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Export offline database snapshots, schedule automated nightly cloud backups, and restore catalog snapshots in case of hardware failure.
                  </p>
                </div>
                <Button onClick={() => navigate('/backup-wizard')} variant="outline" size="sm" className="font-bold text-xs w-fit">
                  Open Backup Wizard <ArrowRight size={13} className="ml-1" />
                </Button>
              </div>

              {/* Roles & Permissions Link */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
                    <Users size={20} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Role-Based Access Control (RBAC)</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Configure capability matrix toggles for Cashiers, Managers, Accountants, and Warehouse Staff.
                  </p>
                </div>
                <Button onClick={() => navigate('/staff?tab=roles')} variant="outline" size="sm" className="font-bold text-xs w-fit">
                  Manage Roles Matrix <ArrowRight size={13} className="ml-1" />
                </Button>
              </div>

              {/* Subscription Plans Link */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Plan & Subscription Tiers</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Manage your KaroBar tier (Free, Growth, Pro, Enterprise) and multi-store license capacity.
                  </p>
                </div>
                <Button onClick={() => navigate('/subscription/plans')} variant="outline" size="sm" className="font-bold text-xs w-fit">
                  View Subscription Plans <ArrowRight size={13} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ================= MODAL: NEW FISCAL YEAR ================= */}
      {showAddFyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200" tabIndex="-1">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Fiscal Period
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">Register Financial Year</h2>
              </div>
              <button onClick={() => setShowAddFyModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFy} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Name (Format: FYYY-YY) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFy.name}
                  onChange={e => setNewFy({ ...newFy, name: e.target.value })}
                  placeholder="e.g. FY26-27"
                  pattern="^FY\d{2}-\d{2}$"
                  required
                  className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newFy.startDate}
                    onChange={e => setNewFy({ ...newFy, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">End Date</label>
                  <input
                    type="date"
                    value={newFy.endDate}
                    onChange={e => setNewFy({ ...newFy, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddFyModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingFy} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
                  {savingFy ? 'Registering...' : 'Register & Activate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD STORE BRANCH ================= */}
      {showAddStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200" tabIndex="-1">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Store Network
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">Add Retail Branch</h2>
              </div>
              <button onClick={() => setShowAddStoreModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Branch Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Rohini Sector 11 Branch"
                  value={newStore.name}
                  onChange={e => setNewStore({ ...newStore, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Branch Address</label>
                <input
                  type="text"
                  placeholder="e.g. Plot 12, Main Market, Rohini"
                  value={newStore.address}
                  onChange={e => setNewStore({ ...newStore, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="10 digits"
                    value={newStore.phone}
                    onChange={e => setNewStore({ ...newStore, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="Branch GSTIN"
                    value={newStore.gstin}
                    onChange={e => setNewStore({ ...newStore, gstin: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddStoreModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingStore} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
                  {savingStore ? 'Creating...' : 'Create Branch'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
