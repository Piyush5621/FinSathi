import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Download, FileSpreadsheet, Filter, CheckCircle2, Building2, User, Receipt, DollarSign, Calendar, ArrowUpRight, ArrowDownLeft, AlertTriangle } from 'lucide-react';
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
      from = `${currentYear}-04-01`;
      to = `${currentYear + 1}-03-31`;
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
        if (res.data.success) {
          setGstr1Report(res.data.data);
          toast.success("GSTR-1 report generated!");
        }
      } else {
        const res = await API.get(`/reports/gst/gstr3b?from=${dateRange.from}&to=${dateRange.to}`);
        if (res.data.success) {
          setGstr3bReport(res.data.data);
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
      // Direct Excel download from backend
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
      toast.success("GSTR-1 Excel exported!");
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

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet size={26} className="text-emerald-600" /> GST Compliance & Reporting
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Auto-generate and download accurate GSTR-1 and GSTR-3B tax returns with Input Tax Credit (ITC) reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'gstr1' ? (
            <Button
              variant="outline"
              onClick={exportGstr1Excel}
              disabled={!gstr1Report || loading}
              icon={<Download size={15} />}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              Export GSTR-1 (.xlsx)
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={exportGstr3bExcel}
              disabled={!gstr3bReport || loading}
              icon={<Download size={15} />}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              Export GSTR-3B (.xlsx)
            </Button>
          )}

          <Button onClick={fetchReports} icon={<Filter size={15} />} loading={loading} className="bg-brand-blue text-white">
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs (GSTR-1 vs GSTR-3B) */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('gstr1')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'gstr1'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Receipt size={16} />
          GSTR-1 (Outward Supplies)
        </button>
        <button
          onClick={() => setActiveTab('gstr3b')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'gstr3b'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Building2 size={16} />
          GSTR-3B (Summary & ITC)
        </button>
      </div>

      {/* Period & Filters Bar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1">Period:</span>
            <button
              onClick={() => applyPeriodPreset('this_month')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all cursor-pointer"
            >
              This Month
            </button>
            <button
              onClick={() => applyPeriodPreset('last_month')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Last Month
            </button>
            <button
              onClick={() => applyPeriodPreset('q1')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Q1 (Apr-Jun)
            </button>
            <button
              onClick={() => applyPeriodPreset('q2')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Q2 (Jul-Sep)
            </button>
            <button
              onClick={() => applyPeriodPreset('q3')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Q3 (Oct-Dec)
            </button>
            <button
              onClick={() => applyPeriodPreset('q4')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Q4 (Jan-Mar)
            </button>
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
            />
            <span className="text-slate-400 text-xs font-bold">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
            />
          </div>
        </div>
      </Card>

      {/* ================= GSTR-1 CONTENT ================= */}
      {activeTab === 'gstr1' && gstr1Report && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-4 bg-white border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Invoices</p>
              <p className="text-xl font-black text-slate-900 mt-1">{gstr1Report.summary.totalInvoices}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                {gstr1Report.summary.b2bCount} B2B • {gstr1Report.summary.b2cCount} B2C
              </p>
            </Card>

            <Card className="p-4 bg-white border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Taxable Value</p>
              <p className="text-xl font-black text-slate-900 mt-1">₹{gstr1Report.summary.totalTaxableValue.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Net of tax</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CGST (Central)</p>
              <p className="text-xl font-black text-indigo-600 mt-1">₹{gstr1Report.summary.totalCgst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Intra-state</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SGST (State)</p>
              <p className="text-xl font-black text-indigo-600 mt-1">₹{gstr1Report.summary.totalSgst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Intra-state</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IGST (Integrated)</p>
              <p className="text-xl font-black text-purple-600 mt-1">₹{gstr1Report.summary.totalIgst.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Inter-state</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Total Invoice Value</p>
              <p className="text-xl font-black text-emerald-700 mt-1">₹{gstr1Report.summary.totalInvoiceValue.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5 font-bold">Tax: ₹{gstr1Report.summary.totalGst.toLocaleString('en-IN')}</p>
            </Card>
          </div>

          {/* GSTR-1 Sub-navigation (B2B, B2C, Rate Summary) */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setGstr1SubTab('b2b')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gstr1SubTab === 'b2b'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              B2B Invoices ({gstr1Report.b2bInvoices.length})
            </button>
            <button
              onClick={() => setGstr1SubTab('b2c')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gstr1SubTab === 'b2c'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              B2C Invoices ({gstr1Report.b2cInvoices.length})
            </button>
            <button
              onClick={() => setGstr1SubTab('rate')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gstr1SubTab === 'rate'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Rate Wise Summary ({gstr1Report.rateWiseSummary.length})
            </button>
          </div>

          {/* Table: B2B Invoices */}
          {gstr1SubTab === 'b2b' && (
            <Card noPadding className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Table 4A — Taxable outward supplies made to registered persons (B2B)
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                  {gstr1Report.b2bInvoices.length} Invoices
                </span>
              </div>
              <Table>
                <Thead>
                  <tr>
                    <Th>Invoice #</Th>
                    <Th>Date</Th>
                    <Th>Customer</Th>
                    <Th>Customer GSTIN</Th>
                    <Th>Place of Supply</Th>
                    <Th className="text-right">Taxable (₹)</Th>
                    <Th className="text-right">CGST (₹)</Th>
                    <Th className="text-right">SGST (₹)</Th>
                    <Th className="text-right">IGST (₹)</Th>
                    <Th className="text-right">Total (₹)</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {gstr1Report.b2bInvoices.length === 0 ? (
                    <Tr>
                      <Td colSpan={10} className="text-center text-slate-400 py-8 italic">
                        No B2B invoices recorded in this period.
                      </Td>
                    </Tr>
                  ) : (
                    gstr1Report.b2bInvoices.map((inv, idx) => (
                      <Tr key={idx}>
                        <Td className="font-mono text-xs font-bold text-indigo-600">{inv.invoiceNo}</Td>
                        <Td className="text-xs text-slate-600">{inv.invoiceDate}</Td>
                        <Td className="font-bold text-slate-900">{inv.customerName}</Td>
                        <Td className="font-mono text-xs font-bold text-slate-800">{inv.customerGstin}</Td>
                        <Td className="text-xs text-slate-600">{inv.placeOfSupply}</Td>
                        <Td className="text-right font-semibold">₹{inv.taxableValue.toLocaleString('en-IN')}</Td>
                        <Td className="text-right text-indigo-600 font-semibold">₹{inv.cgst.toLocaleString('en-IN')}</Td>
                        <Td className="text-right text-indigo-600 font-semibold">₹{inv.sgst.toLocaleString('en-IN')}</Td>
                        <Td className="text-right text-purple-600 font-semibold">₹{inv.igst.toLocaleString('en-IN')}</Td>
                        <Td className="text-right font-black text-slate-900">₹{inv.totalInvoiceValue.toLocaleString('en-IN')}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Card>
          )}

          {/* Table: B2C Invoices */}
          {gstr1SubTab === 'b2c' && (
            <Card noPadding className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Table 7 — Taxable supplies to unregistered consumers (B2C)
                </h3>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                  {gstr1Report.b2cInvoices.length} Invoices
                </span>
              </div>
              <Table>
                <Thead>
                  <tr>
                    <Th>Invoice #</Th>
                    <Th>Date</Th>
                    <Th>Customer</Th>
                    <Th>Place of Supply</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Taxable (₹)</Th>
                    <Th className="text-right">CGST (₹)</Th>
                    <Th className="text-right">SGST (₹)</Th>
                    <Th className="text-right">IGST (₹)</Th>
                    <Th className="text-right">Total (₹)</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {gstr1Report.b2cInvoices.length === 0 ? (
                    <Tr>
                      <Td colSpan={10} className="text-center text-slate-400 py-8 italic">
                        No B2C invoices recorded in this period.
                      </Td>
                    </Tr>
                  ) : (
                    gstr1Report.b2cInvoices.map((inv, idx) => (
                      <Tr key={idx}>
                        <Td className="font-mono text-xs font-bold text-indigo-600">{inv.invoiceNo}</Td>
                        <Td className="text-xs text-slate-600">{inv.invoiceDate}</Td>
                        <Td className="font-bold text-slate-900">{inv.customerName}</Td>
                        <Td className="text-xs text-slate-600">{inv.placeOfSupply}</Td>
                        <Td className="text-[10px] font-bold text-slate-500 uppercase">{inv.supplyType}</Td>
                        <Td className="text-right font-semibold">₹{inv.taxableValue.toLocaleString('en-IN')}</Td>
                        <Td className="text-right text-indigo-600 font-semibold">₹{inv.cgst.toLocaleString('en-IN')}</Td>
                        <Td className="text-right text-indigo-600 font-semibold">₹{inv.sgst.toLocaleString('en-IN')}</Td>
                        <Td className="text-right text-purple-600 font-semibold">₹{inv.igst.toLocaleString('en-IN')}</Td>
                        <Td className="text-right font-black text-slate-900">₹{inv.totalInvoiceValue.toLocaleString('en-IN')}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Card>
          )}

          {/* Table: Rate Wise Summary */}
          {gstr1SubTab === 'rate' && (
            <Card noPadding className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Rate-wise Summary Breakdown
                </h3>
              </div>
              <Table>
                <Thead>
                  <tr>
                    <Th>GST Rate</Th>
                    <Th>Invoices</Th>
                    <Th className="text-right">Taxable Value (₹)</Th>
                    <Th className="text-right">CGST (₹)</Th>
                    <Th className="text-right">SGST (₹)</Th>
                    <Th className="text-right">IGST (₹)</Th>
                    <Th className="text-right">Total Tax (₹)</Th>
                    <Th className="text-right">Total Value (₹)</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {gstr1Report.rateWiseSummary.length === 0 ? (
                    <Tr>
                      <Td colSpan={8} className="text-center text-slate-400 py-8 italic">
                        No transactions found in this period.
                      </Td>
                    </Tr>
                  ) : (
                    gstr1Report.rateWiseSummary.map((r, idx) => (
                      <Tr key={idx}>
                        <Td className="font-bold text-emerald-700">{r.rateLabel}</Td>
                        <Td className="font-semibold text-slate-700">{r.invoiceCount}</Td>
                        <Td className="text-right font-semibold">₹{r.taxableValue.toLocaleString('en-IN')}</Td>
                        <Td className="text-right text-indigo-600 font-semibold">₹{r.cgst.toLocaleString('en-IN')}</Td>
                        <Td className="text-right text-indigo-600 font-semibold">₹{r.sgst.toLocaleString('en-IN')}</Td>
                        <Td className="text-right text-purple-600 font-semibold">₹{r.igst.toLocaleString('en-IN')}</Td>
                        <Td className="text-right font-bold text-slate-900">₹{r.totalGst.toLocaleString('en-IN')}</Td>
                        <Td className="text-right font-black text-slate-900">₹{r.totalValue.toLocaleString('en-IN')}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* ================= GSTR-3B CONTENT ================= */}
      {activeTab === 'gstr3b' && gstr3bReport && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 bg-white border border-slate-200">
              <div className="flex items-center gap-2 text-rose-600">
                <ArrowUpRight size={18} />
                <p className="text-[10px] font-black uppercase tracking-wider">Outward Tax Liability</p>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                ₹{gstr3bReport.table31OutwardSupplies.totalTaxLiability.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                CGST: ₹{gstr3bReport.table31OutwardSupplies.centralTax.toLocaleString('en-IN')} • SGST: ₹{gstr3bReport.table31OutwardSupplies.stateUtTax.toLocaleString('en-IN')}
              </p>
            </Card>

            <Card className="p-5 bg-white border border-slate-200">
              <div className="flex items-center gap-2 text-emerald-600">
                <ArrowDownLeft size={18} />
                <p className="text-[10px] font-black uppercase tracking-wider">Eligible Input Tax Credit (ITC)</p>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">
                ₹{gstr3bReport.table4EligibleItc.totalItcAvailable.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                From {gstr3bReport.table4EligibleItc.purchaseCount} inward purchase orders
              </p>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Net GST Payable</p>
              <p className="text-2xl font-black text-white mt-2">
                ₹{gstr3bReport.table5NetTaxPayable.totalNetPayable.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-indigo-200 mt-1 font-medium">
                After ITC set-off deduction
              </p>
            </Card>
          </div>

          {/* Table 3.1 & Table 4 Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table 3.1 */}
            <Card noPadding className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  3.1 Outward Taxable Supplies
                </h3>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Total Taxable Value</span>
                  <span className="font-bold text-slate-900">₹{gstr3bReport.table31OutwardSupplies.totalTaxableValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Central Tax (CGST)</span>
                  <span className="font-bold text-indigo-600">₹{gstr3bReport.table31OutwardSupplies.centralTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">State / UT Tax (SGST)</span>
                  <span className="font-bold text-indigo-600">₹{gstr3bReport.table31OutwardSupplies.stateUtTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Integrated Tax (IGST)</span>
                  <span className="font-bold text-purple-600">₹{gstr3bReport.table31OutwardSupplies.integratedTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold text-slate-900">Total Tax Liability</span>
                  <span className="font-black text-rose-600 text-sm">₹{gstr3bReport.table31OutwardSupplies.totalTaxLiability.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </Card>

            {/* Table 4 Eligible ITC */}
            <Card noPadding className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  4. Eligible Input Tax Credit (ITC)
                </h3>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Purchases Taxable Value</span>
                  <span className="font-bold text-slate-900">₹{gstr3bReport.table4EligibleItc.totalPurchaseTaxableValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Input CGST Available</span>
                  <span className="font-bold text-emerald-600">₹{gstr3bReport.table4EligibleItc.centralTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Input SGST Available</span>
                  <span className="font-bold text-emerald-600">₹{gstr3bReport.table4EligibleItc.stateUtTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-semibold">Input IGST Available</span>
                  <span className="font-bold text-purple-600">₹{gstr3bReport.table4EligibleItc.integratedTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="font-bold text-slate-900">Total ITC Set-off</span>
                  <span className="font-black text-emerald-600 text-sm">₹{gstr3bReport.table4EligibleItc.totalItcAvailable.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Compliance Disclaimer */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-start gap-3">
        <CheckCircle2 className="text-amber-600 shrink-0 mt-0.5" size={18} />
        <div className="text-xs text-amber-800">
          <p className="font-bold">Official GST Disclaimer</p>
          <p className="text-amber-700 mt-0.5 leading-relaxed">
            This GST report summary is compiled directly from immutable transaction records in your Karobar Business OS. 
            It is generated for reference and CA audit assistance. Verify figures before filing returns on the GSTN portal.
          </p>
        </div>
      </div>
    </div>
  );
}
