import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";
import { Pencil, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function InvoiceDrawer({
  customerId,
  invoicesCache,
  setInvoicesCache,
  onEditInvoice,
}) {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const navigate = useNavigate();

  // ✅ Fetch invoices
  const fetchInvoices = async () => {
    if (invoicesCache[customerId]) {
      setInvoices(invoicesCache[customerId]);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales")
        .select("id, total, date, payment_status")
        .eq("customer_id", customerId)
        .order("id", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
      setInvoicesCache((prev) => ({ ...prev, [customerId]: data }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [customerId]);

  // ✅ Navigate to billing with customerId
  const handleCreateInvoice = () => {
    navigate(`/billing?customer_id=${customerId}`);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-indigo-300 font-semibold">Invoices</h4>
        <button
          onClick={handleCreateInvoice}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1 rounded-lg transition-all"
        >
          <Plus className="h-4 w-4" /> New Invoice
        </button>
      </div>

      {loading && (
        <p className="text-slate-400 text-sm">Loading invoices...</p>
      )}

      {!loading && invoices.length === 0 && (
        <p className="text-slate-400 text-sm">No invoices found.</p>
      )}

      {!loading && invoices.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex justify-between items-center bg-slate-800/70 hover:bg-slate-700/60 transition p-3 rounded-lg"
            >
              <div>
                <p className="text-slate-100 font-medium">
                  Invoice #{inv.id} —{" "}
                  <span className="text-indigo-300">
                    ₹{Number(inv.total).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(inv.date).toLocaleDateString()} |{" "}
                  {inv.payment_status === "paid" ? (
                    <span className="text-emerald-400 font-semibold">
                      Paid
                    </span>
                  ) : inv.payment_status === "partial" ? (
                    <span className="text-yellow-400 font-semibold">
                      Partial
                    </span>
                  ) : (
                    <span className="text-red-400 font-semibold">Unpaid</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => onEditInvoice(inv)}
                className="text-indigo-400 hover:text-indigo-300 p-1"
                title="Edit Invoice"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
