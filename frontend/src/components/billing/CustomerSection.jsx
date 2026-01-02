import React from "react";
import Select from "react-select";
import { format } from "date-fns";

const CustomerSection = ({ customers = [], onCustomerSelect, selectedCustomer, invoiceNo }) => {
  // Prepare customer options for react-select
  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: `${customer.name} ${customer.phone ? `(${customer.phone})` : ""}`,
    phone: customer.phone,
    email: customer.email,
  }));

  // Find selected customer info
  const customerInfo = customerOptions.find(
    (c) => c.value.toString() === selectedCustomer?.toString()
  );

  return (
    <div>
      <h3 className="text-indigo-400 text-lg font-semibold mb-4">Customer Details</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Customer Selector with Search */}
        <div>
          <label className="text-indigo-400 font-semibold">Select Customer</label>
          <Select
            options={customerOptions}
            onChange={(selected) => onCustomerSelect(selected?.value || null)}
            value={
              customerInfo
                ? { value: customerInfo.value, label: customerInfo.label }
                : null
            }
            placeholder="Search or select customer..."
            isClearable
            className="mt-2 text-black rounded-xl"
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: "0.75rem",
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                color: "white",
                boxShadow: "none",
              }),
              singleValue: (base) => ({ ...base, color: "white" }),
              input: (base) => ({ ...base, color: "white" }),
              menu: (base) => ({
                ...base,
                backgroundColor: "#1e293b",
                color: "white",
              }),
              option: (styles, { isFocused }) => ({
                ...styles,
                backgroundColor: isFocused ? "#334155" : "#1e293b",
                color: "white",
                cursor: "pointer",
              }),
            }}
          />
        </div>

        {/* Invoice Number */}
        <div>
          <label className="text-indigo-400 font-semibold">Invoice No</label>
          <input
            value={invoiceNo}
            readOnly
            className="w-full bg-slate-800 border border-slate-600 rounded-xl mt-2 p-2"
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-indigo-400 font-semibold">Date</label>
          <input
            value={format(new Date(), "yyyy-MM-dd")}
            readOnly
            className="w-full bg-slate-800 border border-slate-600 rounded-xl mt-2 p-2"
          />
        </div>

        {/* Customer Info (Auto-filled) */}
        {customerInfo && (
          <div className="space-y-2 col-span-2">
            <div>
              <label className="text-indigo-400 font-semibold">Phone</label>
              <input
                value={customerInfo.phone || ""}
                readOnly
                className="w-full bg-slate-800 border border-slate-600 rounded-xl mt-2 p-2"
              />
            </div>
            <div>
              <label className="text-indigo-400 font-semibold">Email</label>
              <input
                value={customerInfo.email || ""}
                readOnly
                className="w-full bg-slate-800 border border-slate-600 rounded-xl mt-2 p-2"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSection;
