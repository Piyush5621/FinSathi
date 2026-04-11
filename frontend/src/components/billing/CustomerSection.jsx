
import Select from "react-select";
import { format } from "date-fns";

const CustomerSection = ({ customers = [], onCustomerSelect, selectedCustomer, invoiceNo }) => {
  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: `${customer.name} ${customer.phone ? `(${customer.phone})` : ""}`,
    phone: customer.phone,
    email: customer.email,
  }));

  const customerInfo = customerOptions.find(
    (c) => c.value.toString() === selectedCustomer?.toString()
  );

  return (
    <div className="pt-[16px]">
      {/* Customer Selector */}
      <div className="mb-[16px]">
        <Select
          options={customerOptions}
          onChange={(selected) => onCustomerSelect(selected?.value || null)}
          value={
            customerInfo ? { value: customerInfo.value, label: customerInfo.label } : null
          }
          placeholder="Search or select customer..."
          isClearable
          className="text-[14px]"
          styles={{
            control: (base, state) => ({
              ...base,
              borderRadius: "0.5rem",
              backgroundColor: "#FFFFFF",
              border: state.isFocused ? "1px solid #3B82F6" : "1px solid #E2E8F0",
              color: "#0F172A",
              boxShadow: "none",
            }),
            singleValue: (base) => ({ ...base, color: "#0F172A" }),
            input: (base) => ({ ...base, color: "#0F172A" }),
            menu: (base) => ({
              ...base,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }),
            option: (styles, { isFocused }) => ({
              ...styles,
              backgroundColor: isFocused ? "#F8FAFC" : "#FFFFFF",
              color: "#334155",
              cursor: "pointer",
            }),
          }}
        />
      </div>

      {customerInfo && (
        <div className="p-[12px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
          <div className="grid grid-cols-2 gap-[8px]">
             <div>
                <span className="text-[12px] font-semibold text-[#64748B] uppercase">Phone</span>
                <p className="text-[14px] text-[#0F172A] font-medium">{customerInfo.phone || "N/A"}</p>
             </div>
             <div>
                <span className="text-[12px] font-semibold text-[#64748B] uppercase">Email</span>
                <p className="text-[14px] text-[#0F172A] font-medium">{customerInfo.email || "N/A"}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSection;
