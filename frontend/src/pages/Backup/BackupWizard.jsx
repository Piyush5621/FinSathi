import React, { useEffect, useState } from "react";
import API from "../../services/apiClient";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";
import { 
  Download, UploadCloud, RotateCcw, ShieldCheck, 
  AlertTriangle, History, RefreshCw, AlertCircle, FileText, CheckCircle2 
} from "lucide-react";
import toast from "react-hot-toast";

export default function BackupWizard() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [restoring, setRestoring] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await API.get("/backup/history");
      if (res.data?.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load backup logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExport = async () => {
    const toastId = toast.loading("Preparing database export...");
    try {
      const res = await API.get("/backup/export", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `finsathi_backup_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully!", { id: toastId });
      fetchHistory();
    } catch (err) {
      console.error(err);
      toast.error("Failed to export backup", { id: toastId });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast.error("Only JSON files are supported");
      return;
    }

    setUploadFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.schema_version !== "2.0" || !json.tables) {
          toast.error("Invalid schema version. Requires version 2.0 backup.");
          setUploadFile(null);
          return;
        }
        setParsedData(json);
        setShowWarningModal(true);
      } catch (err) {
        toast.error("Corrupted JSON file structure");
        setUploadFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    setShowWarningModal(false);
    setRestoring(true);
    const toastId = toast.loading("Executing restore safe-rollback pipeline...");
    try {
      const res = await API.post("/backup/restore", { backupData: parsedData });
      if (res.data?.success) {
        toast.success("Database restored successfully!", { id: toastId });
        setUploadFile(null);
        setParsedData(null);
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message;
      toast.error(errMsg, { id: toastId, duration: 6000 });
    } finally {
      setRestoring(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === "Success") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "Restored") return "bg-indigo-50 text-indigo-700 border-indigo-100";
    if (status === "Failed") return "bg-rose-50 text-rose-700 border-rose-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 pb-16 max-w-[1400px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Data Safety & Backup Wizard
            <Badge variant="success" className="text-[9px] uppercase tracking-wider py-0.5 px-2 font-bold bg-indigo-50 border-indigo-100 text-indigo-700">
              Safe Rollback
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Export secure copies of your business databases or restore data with full safety rollbacks.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm ml-auto"
        >
          <RefreshCw size={12} />
          <span>Refresh List</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* OPERATIONAL WIZARDS (Left Column) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Export Card */}
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-[24px] space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Export Ledger Data</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Save secure offline backups</p>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Download size={16} />
              </div>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Export all customers ledger, inventory products, billing records, payroll logs, and CRM pipeline settings. Backups are encrypted for security and isolated per merchant.
            </p>
            <button
              onClick={handleExport}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Download size={13} />
              <span>Export Full Database JSON</span>
            </button>
          </Card>

          {/* Restore Card */}
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-[24px] space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Restore Ledger Backup</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Upload and sync previous data</p>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <UploadCloud size={16} />
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Import a previously exported JSON backup file. The system will run validation checks, take a temporary snapshot rollback file, and swap your data.
            </p>

            <div className="border border-dashed border-slate-200/80 hover:border-indigo-400/80 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-slate-50 relative group">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={restoring}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="mx-auto text-slate-400 group-hover:text-indigo-600 w-8 h-8 mb-2 transition-colors" />
              <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-650 transition-colors">
                {uploadFile ? uploadFile.name : "Click to browse and upload backup JSON"}
              </p>
              <p className="text-[9px] text-slate-450 mt-1 font-medium">Supported format: JSON (Version 2.0)</p>
            </div>
          </Card>

        </div>

        {/* LOG HISTORY (Right Column) */}
        <div className="lg:col-span-5">
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-[24px] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <History size={16} className="text-slate-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Backup Logs</h3>
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Operation history</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} height="55px" rounded="rounded-xl" />)}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <AlertCircle className="mx-auto w-6 h-6 mb-1 opacity-50" />
                No backup or restore operations logged yet.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {history.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate" title={log.file_name}>{log.file_name}</p>
                      <div className="flex gap-2 text-[9px] text-slate-400 font-semibold mt-1">
                        <span>{log.backup_type}</span>
                        <span>•</span>
                        <span>{formatBytes(log.file_size)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 border rounded ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                      <p className="text-[8px] text-slate-450 mt-1.5 font-bold">
                        {new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* WARNING POPUP DIALOG */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-[24px] border border-slate-100 p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider">Critical Data Restore Warning</h3>
            </div>
            
            <p className="text-xs text-slate-650 font-medium leading-relaxed">
              You are about to restore the backup file <span className="font-extrabold text-slate-900">"{uploadFile?.name}"</span>. 
              This will overwrite your current customer data, stock sheets, and invoices.
            </p>

            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-[10px] leading-normal font-semibold text-rose-800">
              ⚠️ A Pre-Restore Backup snapshot will be automatically captured to allow rollback recovery if this restore process encounters an error.
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setUploadFile(null);
                  setParsedData(null);
                  setShowWarningModal(false);
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-xs text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-rose-600/20"
              >
                Execute Safe Restore
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
