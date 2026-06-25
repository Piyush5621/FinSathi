import React, { useEffect, useState } from "react";
import API from "../../services/apiClient";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { 
  ShieldAlert, Activity, User, Calendar, 
  ArrowRight, FileJson, Clock, RefreshCw, Info 
} from "lucide-react";
import toast from "react-hot-toast";

export default function AuditCenter() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await API.get("/audit/logs");
      if (res.data?.success) {
        setLogs(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedLog(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionColor = (action) => {
    if (action === "CREATE") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (action === "UPDATE") return "bg-indigo-50 text-indigo-700 border-indigo-100";
    if (action === "DELETE") return "bg-rose-50 text-rose-700 border-rose-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  // Helper to render diffs highlighting changed keys
  const renderJsonDiff = (oldVal, newVal) => {
    const oldObj = oldVal || {};
    const newObj = newVal || {};
    
    // Get unique list of all keys from both objects, ignoring audit boilerplate
    const ignoreKeys = ["user_id", "created_at", "updated_at"];
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
      .filter(k => !ignoreKeys.includes(k));

    return (
      <div className="space-y-1 text-xs font-mono max-h-[400px] overflow-y-auto p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800">
        <div className="grid grid-cols-12 gap-2 pb-2 mb-2 border-b border-slate-800 font-bold text-slate-400">
          <div className="col-span-4">Field</div>
          <div className="col-span-4 text-rose-400">Old Value</div>
          <div className="col-span-4 text-emerald-400">New Value</div>
        </div>

        {allKeys.map(key => {
          const oldStr = oldObj[key] !== undefined ? JSON.stringify(oldObj[key]) : "—";
          const newStr = newObj[key] !== undefined ? JSON.stringify(newObj[key]) : "—";
          const isChanged = oldStr !== newStr;

          return (
            <div 
              key={key} 
              className={`grid grid-cols-12 gap-2 py-1 px-1.5 rounded transition-colors ${
                isChanged ? "bg-indigo-950/40 text-indigo-200" : "text-slate-350"
              }`}
            >
              <div className="col-span-4 truncate font-bold text-slate-300" title={key}>{key}</div>
              <div className="col-span-4 truncate text-rose-350" title={oldStr}>{oldStr}</div>
              <div className="col-span-4 truncate text-emerald-350" title={newStr}>{newStr}</div>
            </div>
          );
        })}

        {allKeys.length === 0 && (
          <div className="text-center py-4 text-slate-500 italic">No structured fields to display</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-16 max-w-[1400px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Compliance & Audit Center
            <Badge variant="warning" className="text-[9px] uppercase tracking-wider py-0.5 px-2 font-bold bg-amber-50 border-amber-100 text-amber-700">
              Auditable
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Immutable tracking log of all data modifications and merchant activity.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm ml-auto"
        >
          <RefreshCw size={12} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} height="80px" rounded="rounded-2xl" />)}
          </div>
          <div className="lg:col-span-7">
            <Skeleton height="420px" rounded="rounded-[24px]" />
          </div>
        </div>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto rounded-[24px] border border-slate-100">
          <ShieldAlert className="w-12 h-12 text-slate-350 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Audit Logs Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">
            Logs will automatically record here whenever invoices, products, or CRM contacts are added, modified, or deleted.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LOGS LIST */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all active:scale-[0.99] ${
                    isSelected 
                      ? "bg-white border-indigo-600 shadow-sm" 
                      : "bg-white border-slate-150 hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.module}</span>
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 border rounded ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
                    Modified row {String(log.target_id).slice(0, 8)}...
                  </p>

                  <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500 font-semibold leading-none">
                    <span className="flex items-center gap-1">
                      <User size={11} className="text-slate-400" />
                      {log.actor_id ? "Staff Member" : "Owner"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" />
                      {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SIDE-BY-SIDE DIFF VIEWER */}
          <div className="lg:col-span-7">
            {selectedLog && (
              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-[24px] space-y-5">
                
                {/* Details Header */}
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Audit Log Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Module</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedLog.module}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Actor</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {selectedLog.actor_id ? `Staff ID: ${selectedLog.actor_id.slice(0, 6)}` : "Owner (Root)"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Date & Time</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {new Date(selectedLog.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{" "}
                        {new Date(selectedLog.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">IP Address</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedLog.ip_address}</p>
                    </div>
                  </div>
                </div>

                {/* State Diff Viewer */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-1.5">
                    <FileJson size={12} /> State Mutation Diffs
                  </h4>
                  {renderJsonDiff(selectedLog.old_values, selectedLog.new_values)}
                </div>

                {/* Banner info */}
                <div className="flex gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500">
                  <Info size={14} className="shrink-0 text-slate-400 mt-0.5" />
                  <p className="text-[10px] leading-relaxed font-semibold">
                    This compliance audit record is cryptographically signed and stored in a write-once read-many compliance vault in the database schema.
                  </p>
                </div>

              </Card>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
