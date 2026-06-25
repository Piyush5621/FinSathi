
import Select from "react-select";
import { format } from "date-fns";

const CustomerSection = ({ customers = [], onCustomerSelect, selectedCustomer, invoiceNo }) => {
  const customerOptions = customers.filter(Boolean).map((customer) => ({
    value: customer.id,
    label: `${customer.name} ${customer.phone ? `(${customer.phone})` : ""}`,
    phone: customer.phone,
    email: customer.email,
  }));

  const customerInfo = customerOptions.find(
    (c) => c.value?.toString() === selectedCustomer?.toString()
  );

  return (
    <div className="pt-2">
      {/* Customer Selector */}
      <div className="mb-4">
        <Select
          options={customerOptions}
          onChange={(selected) => onCustomerSelect(selected?.value || null)}
          value={
            customerInfo ? { value: customerInfo.value, label: customerInfo.label } : null
          }
          placeholder="Search or select customer..."
          isClearable
          className="text-xs"
          styles={{
            control: (base, state) => ({
              ...base,
              borderRadius: "0.75rem",
              backgroundColor: "#FFFFFF",
              border: state.isFocused ? "1px solid #2483F5" : "1px solid #E5E7EB",
              color: "#1F2937",
              boxShadow: "none",
              padding: "2px 4px",
            }),
            singleValue: (base) => ({ ...base, color: "#1F2937", fontWeight: 500 }),
            input: (base) => ({ ...base, color: "#1F2937" }),
            menu: (base) => ({
              ...base,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "0.75rem",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            }),
            option: (styles, { isFocused }) => ({
              ...styles,
              backgroundColor: isFocused ? "#F9FAFB" : "#FFFFFF",
              color: "#374151",
              fontSize: "12px",
              cursor: "pointer",
            }),
          }}
        />
      </div>

      {customerInfo && (
        <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                <p className="text-xs text-slate-800 font-semibold mt-0.5">{customerInfo.phone || "N/A"}</p>
             </div>
             <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email</span>
                <p className="text-xs text-slate-800 font-semibold mt-0.5 truncate">{customerInfo.email || "N/A"}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSection;
