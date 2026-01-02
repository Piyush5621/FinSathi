import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Search, X, Loader2 } from "lucide-react";
import API from "../../../services/apiClient";
import { supabase } from "../../../lib/supabaseClient";
import toast from "react-hot-toast";

const CustomerList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/customers");
      setCustomers(res.data || []);
    } catch (err) {
      toast.error("Failed to load customers");
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // Subscribe to realtime customer inserts so the list updates automatically
    let custChannel;
    try {
      custChannel = supabase
        .channel("public:customers")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "customers" },
          (payload) => {
            // prepend new customer and refetch to keep ordering consistent
            fetchCustomers();
            toast.success(`New customer added: ${payload.new.name}`);
          }
        )
        .subscribe();
    } catch (e) {
      console.debug("Supabase customers realtime not available", e.message || e);
    }

    return () => {
      if (custChannel) supabase.removeChannel(custChannel);
    };
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.email || !newCustomer.phone)
      return toast.error("Please fill all required fields");

    setAdding(true);
    try {
      await API.post("/customers", newCustomer);
      toast.success("Customer added successfully 🎉");
      setShowModal(false);
      setNewCustomer({ name: "", email: "", phone: "", city: "" });
      fetchCustomers();
    } catch (err) {
      toast.error("Failed to add customer");
      console.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-lg text-white border border-white/10 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Customer List</h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
        >
          <UserPlus size={16} /> Add
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-2 mb-4">
        <Search size={18} className="text-indigo-200" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent w-full outline-none text-sm text-white placeholder-indigo-200"
        />
      </div>

      {/* Customer Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin text-indigo-300" size={28} />
            <p className="ml-3 text-indigo-200">Loading customers...</p>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-indigo-200 border-b border-white/10">
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-left py-2 px-3">Phone</th>
                <th className="text-left py-2 px-3">City</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-white/10 transition border-b border-white/5"
                >
                  <td className="py-2 px-3">{c.name}</td>
                  <td className="py-2 px-3">{c.email}</td>
                  <td className="py-2 px-3">{c.phone}</td>
                  <td className="py-2 px-3">{c.city || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-indigo-200 italic py-6">
            No customers found
          </p>
        )}
      </div>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-6 w-full max-w-md text-white shadow-lg relative"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-3 right-3 text-white/80 hover:text-red-400 transition"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-semibold mb-4">Add New Customer</h2>

              <form onSubmit={handleAddCustomer} className="space-y-3">
                {["name", "email", "phone", "city"].map((field) => (
                  <input
                    key={field}
                    type={field === "email" ? "email" : "text"}
                    placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                    value={newCustomer[field]}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        [field]: e.target.value,
                      })
                    }
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                ))}
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg py-2 font-semibold transition disabled:opacity-50"
                >
                  {adding ? "Adding..." : "Add Customer"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CustomerList;
