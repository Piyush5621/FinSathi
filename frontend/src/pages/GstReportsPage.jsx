import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Download, FileSpreadsheet, Filter, CheckCircle2 } from 'lucide-react';
import API from '../services/apiClient';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function GstReportsPage() {
  const [dateRange, setDateRange] = useState({ 
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/reports/gst/gstr1?from=${dateRange.from}&to=${dateRange.to}`);
      if (res.data.success) {
        setReport(res.data.data);
        toast.success("Report generated!");
      }
    } catch (err) {
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!report || !report.invoices.length) return;
    
    const worksheet = XLSX.utils.json_to_sheet(report.invoices);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GSTR-1 Invoices");
    XLSX.writeFile(workbook, `GSTR1_${dateRange.from}_to_${dateRange.to}.xlsx`);
    toast.success("Export successful!");
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-emerald-600" /> GST Compliance Hub
          </h1>
          <p className="text-sm text-slate-500">Auto-generate GSTR-1 summaries for filing.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={exportToExcel} disabled={!report} icon={<Download size={16} />}>
            Export XLSX
          </Button>
          <Button onClick={fetchReport} icon={<Filter size={16} />} loading={loading}>
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
         <div className="flex gap-4">
            <Input 
              type="date" 
              label="From Date"
              value={dateRange.from} 
              onChange={e => setDateRange({...dateRange, from: e.target.value})} 
            />
            <Input 
              type="date" 
              label="To Date"
              value={dateRange.to} 
              onChange={e => setDateRange({...dateRange, to: e.target.value})} 
            />
         </div>
      </div>

      {report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             {[
               { label: 'Total Invoices', value: report.summary.totalInvoices },
               { label: 'Taxable Value', value: `₹${report.summary.totalTaxableValue.toLocaleString()}` },
               { label: 'Estimated GST', value: `₹${report.summary.totalGst.toLocaleString()}`, color: 'text-emerald-600' },
               { label: 'Total Sales', value: `₹${report.summary.totalValue.toLocaleString()}`, color: 'text-indigo-600' }
             ].map((stat, i) => (
               <Card key={i} className="p-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className={`text-2xl font-black mt-2 ${stat.color || 'text-slate-900'}`}>{stat.value}</p>
               </Card>
             ))}
          </div>

          <Card noPadding>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-sm font-bold text-slate-700">Invoice Level Breakdown</h3>
               <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-black">VALIDATED</span>
            </div>
            <Table>
               <Thead>
                  <tr>
                     <Th>Invoice #</Th>
                     <Th>Customer</Th>
                     <Th>Taxable Value</Th>
                     <Th>GST Rate</Th>
                     <Th className="text-right">Total Value</Th>
                  </tr>
               </Thead>
               <Tbody>
                  {report.invoices.map((inv, idx) => (
                    <Tr key={idx}>
                       <Td className="font-mono text-xs text-indigo-500">{inv.invoiceNo}</Td>
                       <Td className="font-bold">{inv.customer}</Td>
                       <Td>₹{inv.taxableValue.toLocaleString()}</Td>
                       <Td>{inv.gstRate}%</Td>
                       <Td className="text-right font-black">₹{inv.totalValue.toLocaleString()}</Td>
                    </Tr>
                  ))}
               </Tbody>
            </Table>
          </Card>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex gap-4">
             <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="text-amber-600" size={20} />
             </div>
             <div>
                <p className="text-xs font-black text-amber-800 uppercase tracking-tight">Disclaimer</p>
                <p className="text-[10px] text-amber-600 mt-1 leading-relaxed">
                   This report is a data summary generated from your FinSathi transaction history. 
                   It is not an official tax filing. Please verify this data with your Chartered Accountant 
                   before submitting to the GST portal.
                </p>
             </div>
          </div>
        </>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-slate-400">
           <FileSpreadsheet size={48} className="opacity-20 mb-4" />
           <p className="text-sm font-bold">Select a date range and click "Generate Report"</p>
        </div>
      )}
    </div>
  );
}
