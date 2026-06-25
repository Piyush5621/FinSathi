import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import Skeleton from '../components/ui/Skeleton';
import { Shield, ShieldAlert, Check, X, ShieldCheck, UserCheck, Plus, Landmark, Store, Users, ChevronRight } from 'lucide-react';
import API from '../services/apiClient';
import toast from 'react-hot-toast';

export default function RbacPage() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  
  // Staff section
  const [staff, setStaff] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [staffOverrides, setStaffOverrides] = useState([]);

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ store_id: '', staff_id: '', role_id: '' });

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const [matrixRes, staffRes, storesRes] = await Promise.all([
        API.get('/rbac/matrix'),
        API.get('/staff'),
        API.get('/stores')
      ]);

      const matrix = matrixRes.data?.data || { roles: [], permissions: [], rolePermissions: [] };
      setRoles(matrix.roles);
      setPermissions(matrix.permissions);
      setRolePermissions(matrix.rolePermissions);
      setStaff(staffRes.data || []);
      setStores(storesRes.data?.data?.stores || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load RBAC permissions');
    } finally {
      setLoading(false);
    }
  };

  const isPermissionEnabled = (roleId, permissionId) => {
    return rolePermissions.some(rp => rp.role_id === roleId && rp.permission_id === permissionId);
  };

  const handleTogglePermission = async (roleId, permissionId) => {
    const isEnabled = isPermissionEnabled(roleId, permissionId);
    
    // Find current permissions for role
    const currentPermsForRole = rolePermissions
      .filter(rp => rp.role_id === roleId)
      .map(rp => rp.permission_id);

    let updatedPermIds = [];
    if (isEnabled) {
      updatedPermIds = currentPermsForRole.filter(id => id !== permissionId);
    } else {
      updatedPermIds = [...currentPermsForRole, permissionId];
    }

    try {
      const res = await API.post(`/rbac/roles/${roleId}/permissions`, {
        permissionIds: updatedPermIds
      });
      if (res.data?.success) {
        toast.success("Role permissions updated successfully!");
        fetchMatrix();
      }
    } catch (err) {
      toast.error("Failed to update role permissions");
    }
  };

  const handleSelectStaff = async (member) => {
    setSelectedStaff(member);
    try {
      const [assignRes, overridesRes] = await Promise.all([
        API.get(`/rbac/staff/${member.id}/assignments`),
        API.get(`/rbac/staff/${member.id}/overrides`)
      ]);
      setStaffAssignments(assignRes.data?.data || []);
      setStaffOverrides(overridesRes.data?.data || []);
    } catch (err) {
      toast.error("Failed to load staff permissions profile");
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!assignForm.store_id || !assignForm.role_id || !assignForm.staff_id) {
      return toast.error("All parameters are required");
    }

    try {
      const res = await API.post('/rbac/staff/assign', assignForm);
      if (res.data?.success) {
        toast.success("Staff member assigned to store role successfully!");
        setShowAssignModal(false);
        setAssignForm({ store_id: '', staff_id: '', role_id: '' });
        if (selectedStaff) {
          handleSelectStaff(selectedStaff);
        }
      }
    } catch (err) {
      toast.error("Failed to assign staff store role");
    }
  };

  const handleToggleOverride = async (permissionId, currentlyGranted) => {
    if (!selectedStaff) return;

    try {
      const res = await API.post(`/rbac/staff/${selectedStaff.id}/overrides`, {
        permission_id: permissionId,
        grant: !currentlyGranted
      });

      if (res.data?.success) {
        toast.success(currentlyGranted ? "Override revoked" : "Granular override granted");
        // Refresh overrides
        const overridesRes = await API.get(`/rbac/staff/${selectedStaff.id}/overrides`);
        setStaffOverrides(overridesRes.data?.data || []);
      }
    } catch (err) {
      toast.error("Failed to save override");
    }
  };

  const hasOverride = (permissionId) => {
    return staffOverrides.some(o => o.permission_id === permissionId);
  };

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Shield size={26} className="text-indigo-600" />
          Access Control & RBAC
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Configure security clearance levels, assign staff roles to branches, and manage custom permission overrides.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton height="300px" rounded="rounded-[24px]" />
          <Skeleton height="200px" rounded="rounded-[24px]" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Permission Matrix Grid */}
          <Card noPadding className="rounded-[24px] overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Role Permissions Authorization Matrix</h3>
              <Badge variant="indigo" className="font-black uppercase tracking-widest text-[8px]">
                Owner Bypassed
              </Badge>
            </div>
            <Table>
              <Thead>
                <tr>
                  <Th className="w-1/3">Permission Key / Description</Th>
                  {roles.map(r => (
                    <Th key={r.id} className="text-center text-xs font-black uppercase text-slate-700">{r.name}</Th>
                  ))}
                </tr>
              </Thead>
              <Tbody>
                {permissions.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <p className="text-xs font-bold text-slate-900">{p.label}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.key}</p>
                    </Td>
                    {roles.map((r) => {
                      const enabled = isPermissionEnabled(r.id, p.id);
                      const isOwnerRole = r.name === 'Owner';
                      return (
                        <Td key={r.id} className="text-center">
                          <button
                            disabled={isOwnerRole}
                            onClick={() => handleTogglePermission(r.id, p.id)}
                            className={`p-1.5 rounded-xl border transition-all ${
                              isOwnerRole
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-600 cursor-not-allowed opacity-60'
                                : enabled
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600'
                                : 'bg-slate-50 border-slate-200/60 text-slate-300 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600'
                            }`}
                          >
                            {isOwnerRole || enabled ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                          </button>
                        </Td>
                      );
                    })}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>

          {/* Staff Mapping Controls & Overrides */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Staff list */}
            <Card noPadding className="lg:col-span-1 rounded-[24px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Business Employees</h3>
                <Button
                  onClick={() => {
                    if (staff.length === 0) return toast.error("Please add staff in Staff Hub first");
                    setAssignForm({ store_id: '', staff_id: '', role_id: '' });
                    setShowAssignModal(true);
                  }}
                  className="text-[9px] font-black uppercase tracking-widest py-1 px-3 bg-slate-900 border-none hover:bg-slate-800 text-white"
                >
                  Map to Branch
                </Button>
              </div>

              <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto no-scrollbar">
                {staff.map((member) => {
                  const isSelected = selectedStaff?.id === member.id;
                  return (
                    <div
                      key={member.id}
                      onClick={() => handleSelectStaff(member)}
                      className={`p-4 cursor-pointer hover:bg-slate-50/50 transition-colors flex justify-between items-center ${
                        isSelected ? 'bg-indigo-50/20 border-r-4 border-indigo-600' : ''
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{member.name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{member.position || 'Employee'}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300" />
                    </div>
                  );
                })}
                {staff.length === 0 && (
                  <div className="p-8 text-center text-xs font-bold text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                    No staff records found. Add them in Staff Hub.
                  </div>
                )}
              </div>
            </Card>

            {/* Selected staff detail / override mapping */}
            <Card noPadding className="lg:col-span-2 rounded-[24px]">
              {selectedStaff ? (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-950 tracking-tight">{selectedStaff.name}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">{selectedStaff.position} | Staff-Level Credentials</p>
                  </div>

                  {/* Branch Assignments */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Store Branch assignments</h4>
                    <div className="flex flex-wrap gap-3">
                      {staffAssignments.map((a) => (
                        <div key={a.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
                          <Store size={12} className="text-indigo-600" />
                          <span>{a.stores?.name}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-indigo-600">{a.roles?.name}</span>
                        </div>
                      ))}
                      {staffAssignments.length === 0 && (
                        <p className="text-xs text-slate-400 font-semibold italic">Not assigned to any store branch. Click 'Map to Branch'.</p>
                      )}
                    </div>
                  </div>

                  {/* Granular Overrides checkboxes */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Granular Override Policies</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Bypass role requirements by granting specific permission keys directly.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                      {permissions.map((p) => {
                        const granted = hasOverride(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleToggleOverride(p.id, granted)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                              granted
                                ? 'bg-indigo-50/15 border-indigo-500 text-indigo-800'
                                : 'bg-slate-50/30 border-slate-100 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold">{p.label}</p>
                              <p className="text-[9px] font-mono text-slate-400 mt-0.5">{p.key}</p>
                            </div>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                              granted ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {granted && <Check size={10} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <ShieldCheck size={48} className="text-slate-300 mb-4" />
                  <h3 className="text-sm font-bold text-slate-700">Select an Employee</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Select an employee from the directory list to configure branch roles and permission overrides.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Map Employee to Branch</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Assign an employee to a specific branch location with an operational role.</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignRole} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Employee *</label>
                <select
                  value={assignForm.staff_id}
                  onChange={(e) => setAssignForm({ ...assignForm, staff_id: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {staff.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Store Branch *</label>
                <select
                  value={assignForm.store_id}
                  onChange={(e) => setAssignForm({ ...assignForm, store_id: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                  required
                >
                  <option value="">-- Choose Branch --</option>
                  {stores.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">System Role *</label>
                <select
                  value={assignForm.role_id}
                  onChange={(e) => setAssignForm({ ...assignForm, role_id: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                  required
                >
                  <option value="">-- Choose Role --</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
                <Button type="button" variant="ghost" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none">Save Assignment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
