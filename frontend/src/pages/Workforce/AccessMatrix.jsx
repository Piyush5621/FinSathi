import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import Skeleton from '../../components/ui/Skeleton';
import { Check, X, Shield, Info } from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';

export default function AccessMatrix() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await API.get('/rbac/matrix');
      const matrix = res.data?.data || { roles: [], permissions: [], rolePermissions: [] };
      setRoles(matrix.roles);
      setPermissions(matrix.permissions);
      setRolePermissions(matrix.rolePermissions);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Access Matrix');
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

    // Optimistic UI update
    setRolePermissions(prev => {
      if (isEnabled) {
        return prev.filter(rp => !(rp.role_id === roleId && rp.permission_id === permissionId));
      } else {
        return [...prev, { role_id: roleId, permission_id: permissionId }];
      }
    });

    try {
      const res = await API.post(`/rbac/roles/${roleId}/permissions`, {
        permissionIds: updatedPermIds
      });
      if (!res.data?.success) {
        throw new Error('API reported failure');
      }
      toast.success("Permissions updated");
    } catch (err) {
      toast.error("Failed to update. Reverting...");
      fetchMatrix(); // revert
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in-up max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy flex items-center gap-2">
            <Shield className="text-brand-blue" /> Access Matrix
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Toggle what different roles are allowed to do across the platform.
          </p>
        </div>
      </div>

      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-3 text-sm text-slate-600">
        <Info className="text-brand-blue shrink-0 mt-0.5" size={18} />
        <p>The <strong>Owner</strong> role automatically has full permissions and cannot be restricted. Any changes you make here are instantly applied to all employees who hold the respective role.</p>
      </div>

      {loading ? (
        <Skeleton height="500px" rounded="rounded-3xl" />
      ) : (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Global Role Permissions</h3>
            <Badge variant="indigo" className="font-black uppercase tracking-widest text-[10px]">
              {roles.length} Roles • {permissions.length} Permissions
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <tr>
                  <Th className="w-1/3 py-4 pl-6">Permission Key / Action</Th>
                  {roles.map(r => (
                    <Th key={r.id} className="text-center text-xs font-black uppercase text-slate-700">{r.name}</Th>
                  ))}
                </tr>
              </Thead>
              <Tbody className="divide-y divide-slate-100">
                {permissions.map((p) => (
                  <Tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                    <Td className="pl-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{p.label}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-1 tracking-tight">{p.key}</p>
                    </Td>
                    {roles.map((r) => {
                      const enabled = isPermissionEnabled(r.id, p.id);
                      const isOwnerRole = r.name === 'Owner';
                      return (
                        <Td key={r.id} className="text-center">
                          <button
                            disabled={isOwnerRole}
                            onClick={() => handleTogglePermission(r.id, p.id)}
                            className={`p-2 rounded-xl border transition-all ${isOwnerRole
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-600 cursor-not-allowed opacity-60'
                                : enabled
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600'
                                  : 'bg-slate-50 border-slate-200/60 text-slate-300 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600'
                              }`}
                          >
                            {isOwnerRole || enabled ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                          </button>
                        </Td>
                      );
                    })}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
