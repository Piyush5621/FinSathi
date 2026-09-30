import React, { useState, useEffect } from 'react';
import { 
  Download, FileSpreadsheet, Filter, CheckCircle2, Building2, User, 
  Receipt, DollarSign, Calendar, ArrowUpRight, ArrowDownLeft, AlertTriangle, 
  Printer, Store, RefreshCw
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import API from '../services/apiClient';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function GstReportsPage() {
  const [activeTab, setActiveTab] = useState('gstr1'); // 'gstr1' | 'gstr3b'
  const [gstr1SubTab, setGstr1SubTab] = useState('b2b'); // 'b2b' | 'b2c' | 'rate'

  // Period management
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const [dateRange, setDateRange] = useState({
    from: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
    to: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
  });

  const [gstr1Report, setGstr1Report] = useState(null);
  const [gstr3bReport, setGstr3bReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const applyPeriodPreset = (preset) => {
    let from, to;
    if (preset === 'this_month') {
      from = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      to = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    } else if (preset === 'last_month') {
      from = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      to = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
    } else if (preset === 'q1') {
      from = `${currentYear}-04-01`;
      to = `${currentYear}-06-30`;
    } else if (preset === 'q2') {
      from = `${currentYear}-07-01`;
      to = `${currentYear}-09-30`;
    } else if (preset === 'q3') {
      from = `${currentYear}-10-01`;
      to = `${currentYear}-12-31`;
    } else if (preset === 'q4') {
      from = `${currentYear}-01-01`;
      to = `${currentYear}-03-31`;
    } else if (preset === 'fy') {
      const fyStart = currentMonth >= 3 ? currentYear : currentYear - 1;
      from = `${fyStart}-04-01`;
      to = `${fyStart + 1}-03-31`;
    }
    if (from && to) {
      setDateRange({ from, to });
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'gstr1') {
        const res = await API.get(`/reports/gst/gstr1?from=${dateRange.from}&to=${dateRange.to}`);
        if (res.data.success || res.data) {
          setGstr1Report(res.data.data || res.data);
          toast.success("GSTR-1 report generated!");
        }
      } else {
        const res = await API.get(`/reports/gst/gstr3b?from=${dateRange.from}&to=${dateRange.to}`);
        if (res.data.success || res.data) {
          setGstr3bReport(res.data.data || res.data);
          toast.success("GSTR-3B summary generated!");
        }
      }
    } catch (err) {
      console.error("GST report error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, dateRange]);

  const exportGstr1Excel = async () => {
    try {
      const response = await API.get(`/reports/gst/export/gstr1?from=${dateRange.from}&to=${dateRange.to}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_${dateRange.from}_to_${dateRange.to}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("GSTR-1 Excel downloaded successfully!");
    } catch {
      // Client-side fallback via xlsx
      if (!gstr1Report) return;
      const wb = XLSX.utils.book_new();
      const wsB2B = XLSX.utils.json_to_sheet(gstr1Report.b2bInvoices || []);
      XLSX.utils.book_append_sheet(wb, wsB2B, "B2B Invoices");
      const wsB2C = XLSX.utils.json_to_sheet(gstr1Report.b2cInvoices || []);
      XLSX.utils.book_append_sheet(wb, wsB2C, "B2C Invoices");
      XLSX.writeFile(wb, `GSTR1_${dateRange.from}_to_${dateRange.to}.xlsx`);
      toast.success("GSTR-1 Excel exported via fallback!");
    }
  };

  const exportGstr1Csv = async () => {
    try {
      const response = await API.get(`/reports/gst/export/gstr1?from=${dateRange.from}&to=${dateRange.to}&format=csv`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR1_${dateRange.from}_to_${dateRange.to}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("GSTR-1 CSV downloaded successfully!");
    } catch {
      toast.error("Failed to export GSTR-1 CSV");
    }
  };

  const exportGstr3bExcel = async () => {
    try {
      const response = await API.get(`/reports/gst/export/gstr3b?from=${dateRange.from}&to=${dateRange.to}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GSTR3B_${dateRange.from}_to_${dateRange.to}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("GSTR-3B Excel downloaded successfully!");
    } catch {
      toast.error("Failed to export GSTR-3B Excel");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-24 max-w-[1600px] mx-auto print:p-0">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs print:border-none print:shadow-none">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black border border-emerald-500/20 shrink-0 print:hidden">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-app-text tracking-tight">GST Compliance & Reporting</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 size={10} /> GSTN Ready
              </span>
            </div>
            <p className="text-xs text-app-muted mt-0.5">
              Authoritative GSTR-1 outward supplies and GSTR-3B Input Tax Credit (ITC) reconciliation ledger.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          {activeTab === 'gstr1' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={exportGstr1Excel}
                disabled={!gstr1Report || loading}
                icon={<Download size={14} />}
                className="text-xs font-semibold"
              >
                Export GSTR-1 (.xlsx)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportGstr1Csv}
                disabled={!gstr1Report || loading}
                icon={<Download size={14} />}
                className="text-xs font-semibold"
              >
                Export CSV
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={exportGstr3bExcel}
              disabled={!gstr3bReport || loading}
              icon={<Download size={14} />}
              className="text-xs font-semibold"
            >
              Export GSTR-3B (.xlsx)
            </Button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border bg-app-surface hover:bg-app-hover text-app-text text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Print Tax Audit Report"
          >
            <Printer size={13} />
            <span>Print Report</span>
          </button>

          <Button 
            size="sm"
            onClick={fetchReports} 
            icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />} 
            disabled={loading}
            className="text-xs font-bold"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Print-only statement header */}
      <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {activeTab === 'gstr1' ? "GSTR-1 Outward Supplies Report" : "GSTR-3B Return Summary"}
            </h2>
            <p className="text-xs text-slate-500">
              Period: {dateRange.from} to {dateRange.to} • Generated: {new Date().toLocaleDateString('en-IN')}
            </p>
          </div>
          <div className="text-right font-mono text-xs text-slate-600">
            KaroBar Compliance Engine
          </div>
        </div>
      </div>

      {/* 2. Main Tabs (GSTR-1 vs GSTR-3B) */}
      <div className="flex border-b border-app-border gap-6 pb-px print:hidden">
        <button
          onClick={() => setActiveTab('gstr1')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'gstr1'
              ? 'border-primary text-primary'
              : 'border-transparent text-app-muted hover:text-app-text'
          }`}
        >
          <Receipt size={15} />
          GSTR-1 (Outward Supplies)
        </button>
        <button
          onClick={() => setActiveTab('gstr3b')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'gstr3b'
              ? 'border-primary text-primary'
              : 'border-transparent text-app-muted hover:text-app-text'
          }`}
        >
          <Building2 size={15} />
          GSTR-3B (Summary & ITC)
        </button>
      </div>

      {/* 3. Period & Filters Bar */}
      <div className="p-3 bg-app-surface border border-app-border rounded-2xl shadow-2xs print:hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-app-muted font-bold uppercase tracking-wider text-[10px] mr-1">Tax Period:</span>
            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'q1', label: 'Q1 (Apr-Jun)' },
              { id: 'q2', label: 'Q2 (Jul-Sep)' },
              { id: 'q3', label: 'Q3 (Oct-Dec)' },
              { id: 'q4', label: 'Q4 (Jan-Mar)' },
              { id: 'fy', label: 'Full FY' }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPeriodPreset(preset.id)}
                className="px-2.5 py-1 rounded-xl bg-app-subtle hover:bg-app-hover text-app-text font-semibold text-xs border border-app-border transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-app-subtle border border-app-border rounded-xl px-2.5 py-1">
              <span className="text-app-muted text-[11px] font-medium">From:</span>
              <input
                type="date"
                value={dateRange.from}
                onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
                className="bg-transparent text-xs text-app-text outline-none font-mono"
              />
            </div>
            <span className="text-app-muted text-xs font-bold">to</span>
            <div className="flex items-center gap-1 bg-app-subtle border border-app-border rounded-xl px-2.5 py-1">
              <span className="text-app-muted text-[11px] font-medium">To:</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
                className="bg-transparent text-xs text-app-text outline-none font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. GSTR-1 CONTENT */}
      {activeTab === 'gstr1' && gstr1Report && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl shadow-2xs">
              <p className="text-[10px] font-bold text-app-muted uppercase tracking-wider">Total Invoices</p>
              <p className="text-xl font-black font-mono text-app-text mt-1">{gstr1Report.summary.totalInvoices}</p>
              <p className="text-[10px] text-app-muted mt-0.5 font-medium">
                {gstr1Report.summary.b2bCount} B2B • {gstr1Report.summary.b2cCount} B2C
              </p>
            </div>

            <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl shadow-2xs">
              <p className="text-[10px] font-bold text-app-muted uppercase tracking-wider">Taxable Value</p>
              <p className="text-xl font-black font-mono text-app-text mt-1">₹{gstr1Report.summary.totalTaxableValue.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-app-muted mt-0.5">Net base amount</p>
            </div>

            <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl shadow-2xs">
              <p className="text-[10px] font-bold text-app-muted uppercase tracking-wider">CGST (Central)</p>
              <p className="text-xl font-black font-mono text-primary mt-1">₹{gstr1Report.summary.totalCgst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-app-muted mt-0.5">Intra-state share</p>
            </div>

            <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl shadow-2xs">
              <p className="text-[10px] font-bold text-app-muted uppercase tracking-wider">SGST (State)</p>
              <p className="text-xl font-black font-mono text-primary mt-1">₹{gstr1Report.summary.totalSgst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-app-muted mt-0.5">Intra-state share</p>
            </div>

            <div className="p-3.5 bg-app-surface border border-app-border rounded-2xl shadow-2xs">
              <p className="text-[10px] font-bold text-app-muted uppercase tracking-wider">IGST (Integrated)</p>
              <p className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">₹{gstr1Report.summary.totalIgst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-app-muted mt-0.5">Inter-state sales</p>
            </div>

            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-2xs">
              <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Invoice Value</p>
              <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{gstr1Report.summary.totalInvoiceValue.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
                Tax: ₹{gstr1Report.summary.totalGst.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* GSTR-1 Sub-navigation (B2B, B2C, Rate Summary) */}
          <div className="flex items-center gap-2 border-b border-app-border pb-2 print:hidden">
            <button
              onClick={() => setGstr1SubTab('b2b')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gstr1SubTab === 'b2b'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-app-subtle text-app-muted hover:text-app-text'
              }`}
            >
              B2B Invoices ({gstr1Report.b2bInvoices.length})
            </button>
            <button
              onClick={() => setGstr1SubTab('b2c')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gstr1SubTab === 'b2c'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-app-subtle text-app-muted hover:text-app-text'
              }`}
            >
              B2C Invoices ({gstr1Report.b2cInvoices.length})
            </button>
            <button
              onClick={() => setGstr1SubTab('rate')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gstr1SubTab === 'rate'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-app-subtle text-app-muted hover:text-app-text'
              }`}
            >
              Rate Wise Summary ({gstr1Report.rateWiseSummary.length})
            </button>
          </div>

          {/* Table: B2B Invoices */}
          {gstr1SubTab === 'b2b' && (
            <div className="border border-app-border rounded-2xl overflow-hidden bg-app-surface shadow-2xs">
              <div className="p-3.5 border-b border-app-border flex justify-between items-center bg-app-subtle/30">
                <h3 className="text-xs font-bold text-app-text uppercase tracking-wider">
                  Table 4A — Taxable Outward Supplies to Registered Persons (B2B)
                </h3>
                <Badge variant="success" className="font-mono text-[10px]">
                  {gstr1Report.b2bInvoices.length} Invoices
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-app-subtle/50 border-b border-app-border text-[10px] font-bold uppercase text-app-muted">
                      <th className="py-2.5 px-3.5">Invoice #</th>
                      <th className="py-2.5 px-3.5">Date</th>
                      <th className="py-2.5 px-3.5">Customer</th>
                      <th className="py-2.5 px-3.5 font-mono">GSTIN</th>
                      <th className="py-2.5 px-3.5">Place of Supply</th>
                      <th className="py-2.5 px-3.5 text-right">Taxable</th>
                      <th className="py-2.5 px-3.5 text-right">CGST</th>
                      <th className="py-2.5 px-3.5 text-right">SGST</th>
                      <th className="py-2.5 px-3.5 text-right">IGST</th>
                      <th className="py-2.5 px-3.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border/40">
                    {gstr1Report.b2bInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center text-app-muted py-8 text-xs italic">
                          No B2B invoices recorded in this tax period.
                        </td>
                      </tr>
                    ) : (
                      gstr1Report.b2bInvoices.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-app-hover/50 transition-colors">
                          <td className="font-mono text-xs font-bold text-primary py-2 px-3.5">{inv.invoiceNo}</td>
                          <td className="text-xs text-app-muted py-2 px-3.5">{inv.invoiceDate}</td>
                          <td className="font-bold text-app-text py-2 px-3.5">{inv.customerName}</td>
                          <td className="font-mono text-xs text-app-muted py-2 px-3.5">{inv.customerGstin}</td>
                          <td className="text-xs text-app-muted py-2 px-3.5">{inv.placeOfSupply}</td>
                          <td className="text-right font-mono font-semibold text-app-text py-2 px-3.5">₹{inv.taxableValue.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-semibold text-primary py-2 px-3.5">₹{inv.cgst.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-semibold text-primary py-2 px-3.5">₹{inv.sgst.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-semibold text-purple-600 dark:text-purple-400 py-2 px-3.5">₹{inv.igst.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-black text-app-text py-2 px-3.5">₹{inv.totalInvoiceValue.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table: B2C Invoices */}
          {gstr1SubTab === 'b2c' && (
            <div className="border border-app-border rounded-2xl overflow-hidden bg-app-surface shadow-2xs">
              <div className="p-3.5 border-b border-app-border flex justify-between items-center bg-app-subtle/30">
                <h3 className="text-xs font-bold text-app-text uppercase tracking-wider">
                  Table 7 — Taxable Supplies to Unregistered Consumers (B2C)
                </h3>
                <Badge variant="primary" className="font-mono text-[10px]">
                  {gstr1Report.b2cInvoices.length} Invoices
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-app-subtle/50 border-b border-app-border text-[10px] font-bold uppercase text-app-muted">
                      <th className="py-2.5 px-3.5">Invoice #</th>
                      <th className="py-2.5 px-3.5">Date</th>
                      <th className="py-2.5 px-3.5">Customer</th>
                      <th className="py-2.5 px-3.5">Place of Supply</th>
                      <th className="py-2.5 px-3.5">Type</th>
                      <th className="py-2.5 px-3.5 text-right">Taxable</th>
                      <th className="py-2.5 px-3.5 text-right">CGST</th>
                      <th className="py-2.5 px-3.5 text-right">SGST</th>
                      <th className="py-2.5 px-3.5 text-right">IGST</th>
                      <th className="py-2.5 px-3.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border/40">
                    {gstr1Report.b2cInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center text-app-muted py-8 text-xs italic">
                          No B2C invoices recorded in this tax period.
                        </td>
                      </tr>
                    ) : (
                      gstr1Report.b2cInvoices.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-app-hover/50 transition-colors">
                          <td className="font-mono text-xs font-bold text-primary py-2 px-3.5">{inv.invoiceNo}</td>
                          <td className="text-xs text-app-muted py-2 px-3.5">{inv.invoiceDate}</td>
                          <td className="font-bold text-app-text py-2 px-3.5">{inv.customerName}</td>
                          <td className="text-xs text-app-muted py-2 px-3.5">{inv.placeOfSupply}</td>
                          <td className="text-[10px] font-bold text-app-muted uppercase py-2 px-3.5">{inv.supplyType}</td>
                          <td className="text-right font-mono font-semibold text-app-text py-2 px-3.5">₹{inv.taxableValue.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-semibold text-primary py-2 px-3.5">₹{inv.cgst.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-semibold text-primary py-2 px-3.5">₹{inv.sgst.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-semibold text-purple-600 dark:text-purple-400 py-2 px-3.5">₹{inv.igst.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-black text-app-text py-2 px-3.5">₹{inv.totalInvoiceValue.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table: Rate Wise Summary */}
          {gstr1SubTab === 'rate' && (
            <div className="border border-app-border rounded-2xl overflow-hidden bg-app-surface shadow-2xs">
              <div className="p-3.5 border-b border-app-border flex justify-between items-center bg-app-subtle/30">
                <h3 className="text-xs font-bold text-app-text uppercase tracking-wider">
                  Rate-Wise Outward Supplies Summary
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-app-subtle/50 border-b border-app-border text-[10px] font-bold uppercase text-app-muted">
                      <th className="py-2.5 px-3.5">GST Slab</th>
                      <th className="py-2.5 px-3.5 text-center">Invoices</th>
                      <th className="py-2.5 px-3.5 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3.5 text-right">CGST</th>
                      <th className="py-2.5 px-3.5 text-right">SGST</th>
                      <th className="py-2.5 px-3.5 text-right">IGST</th>
                      <th className="py-2.5 px-3.5 text-right">Total Tax</th>
                      <th className="py-2.5 px-3.5 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border/40">
                    {gstr1Report.rateWiseSummary.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center text-app-muted py-8 text-xs italic">
                          No transactions found in this period.
                        </td>
                      </tr>
                    ) : (
                      gstr1Report.rateWiseSummary.map((r, idx) => (
                        <tr key={idx} className="hover:bg-app-hover/50 transition-colors">
                          <td className="font-bold text-emerald-600 dark:text-emerald-400 py-2 px-3.5">{r.rateLabel}</td>
                          <td className="font-mono text-center font-semibold text-app-muted py-2 px-3.5">{r.invoiceCount}</td>
                          <td className="text-right font-mono font-semibold text-app-text py-2 px-3.5">₹{r.taxableValue.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-semibold text-primary py-2 px-3.5">₹{r.cgst.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-semibold text-primary py-2 px-3.5">₹{r.sgst.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-semibold text-purple-600 dark:text-purple-400 py-2 px-3.5">₹{r.igst.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-bold text-app-text py-2 px-3.5">₹{r.totalGst.toLocaleString('en-IN')}</td>
                          <td className="text-right font-mono font-black text-app-text py-2 px-3.5">₹{r.totalValue.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. GSTR-3B CONTENT */}
      {activeTab === 'gstr3b' && gstr3bReport && (
        <div className="space-y-4">
          {/* Summary Hero Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <ArrowUpRight size={16} />
                <p className="text-[10px] font-bold uppercase tracking-wider">Outward Tax Liability (3.1)</p>
              </div>
              <p className="text-2xl font-black font-mono text-app-text mt-2">
                ₹{gstr3bReport.table31OutwardSupplies.totalTaxLiability.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-app-muted mt-1 font-mono">
                CGST: ₹{gstr3bReport.table31OutwardSupplies.centralTax.toLocaleString('en-IN')} • SGST: ₹{gstr3bReport.table31OutwardSupplies.stateUtTax.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="p-4 bg-app-surface border border-app-border rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft size={16} />
                <p className="text-[10px] font-bold uppercase tracking-wider">Eligible Input Tax Credit / ITC (4)</p>
              </div>
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                ₹{gstr3bReport.table4EligibleItc.totalItcAvailable.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                From {gstr3bReport.table4EligibleItc.purchaseCount} inward purchase bills
              </p>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl shadow-2xs">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Net GST Cash Payable (5)</p>
              <p className="text-2xl font-black font-mono text-primary mt-2">
                ₹{gstr3bReport.table5NetTaxPayable.totalNetPayable.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-app-muted mt-1 font-medium">
                After ITC set-off deduction
              </p>
            </div>
          </div>

          {/* Table 3.1 & Table 4 Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Table 3.1 */}
            <div className="border border-app-border rounded-2xl overflow-hidden bg-app-surface shadow-2xs">
              <div className="p-3.5 border-b border-app-border bg-app-subtle/30">
                <h3 className="text-xs font-bold text-app-text uppercase tracking-wider">
                  3.1 Outward Taxable Supplies Details
                </h3>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-app-border/40">
                  <span className="text-app-muted">Total Taxable Value</span>
                  <span className="font-bold font-mono text-app-text">₹{gstr3bReport.table31OutwardSupplies.totalTaxableValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-app-border/40">
                  <span className="text-app-muted">Central Tax (CGST)</span>
                  <span className="font-bold font-mono text-primary">₹{gstr3bReport.table31OutwardSupplies.centralTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-app-border/40">
                  <span className="text-app-muted">State / UT Tax (SGST)</span>
                  <span className="font-bold font-mono text-primary">₹{gstr3bReport.table31OutwardSupplies.stateUtTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-app-border/40">
                  <span className="text-app-muted">Integrated Tax (IGST)</span>
                  <span className="font-bold font-mono text-purple-600 dark:text-purple-400">₹{gstr3bReport.table31OutwardSupplies.integratedTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold text-app-text">Total Outward Tax Liability</span>
                  <span className="font-black font-mono text-rose-600 dark:text-rose-400 text-sm">
                    ₹{gstr3bReport.table31OutwardSupplies.totalTaxLiability.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Table 4 Eligible ITC */}
            <div className="border border-app-border rounded-2xl overflow-hidden bg-app-surface shadow-2xs">
              <div className="p-3.5 border-b border-app-border bg-app-subtle/30">
                <h3 className="text-xs font-bold text-app-text uppercase tracking-wider">
                  4. Eligible Input Tax Credit (ITC)
                </h3>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-app-border/40">
                  <span className="text-app-muted">Purchases Taxable Value</span>
                  <span className="font-bold font-mono text-app-text">₹{gstr3bReport.table4EligibleItc.totalPurchaseTaxableValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-app-border/40">
                  <span className="text-app-muted">Input CGST Available</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">₹{gstr3bReport.table4EligibleItc.centralTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-app-border/40">
                  <span className="text-app-muted">Input SGST Available</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">₹{gstr3bReport.table4EligibleItc.stateUtTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-app-border/40">
                  <span className="text-app-muted">Input IGST Available</span>
                  <span className="font-bold font-mono text-purple-600 dark:text-purple-400">₹{gstr3bReport.table4EligibleItc.integratedTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold text-app-text">Total ITC Set-Off Credit</span>
                  <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{gstr3bReport.table4EligibleItc.totalItcAvailable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Compliance Disclaimer */}
      <div className="bg-app-subtle border border-app-border rounded-2xl p-4 flex items-start gap-3">
        <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
        <div className="text-xs text-app-muted">
          <p className="font-bold text-app-text">Official GST Compliance Disclaimer</p>
          <p className="mt-0.5 leading-relaxed">
            This GST statement is computed directly from immutable POS sales invoices and purchase records in KaroBar. 
            Generated for compliance auditing and CA verification prior to filing on the GSTN portal.
          </p>
        </div>
      </div>
    </div>
  );
}
