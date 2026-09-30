import React from 'react';
import CreatableSelect from "react-select/creatable";
import { User, Phone, Mail, AlertTriangle, CheckCircle2, UserCheck } from 'lucide-react';

const CustomerSection = ({ customers = [], onCustomerSelect, selectedCustomer }) => {
  const customerOptions = customers.filter(Boolean).map((customer) => ({
    value: customer.id,
    label: `${customer.name || 'Unnamed'} ${customer.phone ? `(${customer.phone})` : ""}`,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    balance: customer.outstanding_balance || customer.balance || 0,
  }));

  const customerInfo = customerOptions.find(
    (c) => c.value?.toString() === selectedCustomer?.toString()
  );

  return (
    <div className="space-y-2.5">
      {/* Customer Quick Selector & Walk-in shortcut */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <CreatableSelect
            inputId="customer-search-input"
            options={customerOptions}
            onChange={(selected) => onCustomerSelect(selected?.value || null)}
            onCreateOption={typeof onCustomerSelect === 'function' ? (inputValue) => onCustomerSelect(null, inputValue) : undefined}
            value={customerInfo ? { value: customerInfo.value, label: customerInfo.label } : null}
            formatCreateLabel={(inputValue) => `+ Quick Add "${inputValue}"`}
            placeholder="Search customer (F2) or type name / phone..."
            isClearable
            className="text-xs"
            styles={{
              control: (base, state) => ({
                ...base,
                borderRadius: "0.75rem",
                backgroundColor: "var(--app-surface-subtle, #F8FAFC)",
                borderColor: state.isFocused ? "var(--app-primary, #3B82F6)" : "var(--app-border, #E2E8F0)",
                color: "var(--app-text, #0F172A)",
                boxShadow: "none",
                minHeight: "36px",
                fontSize: "12px",
                transition: "all 0.15s ease",
                "&:hover": {
                  borderColor: "var(--app-primary, #3B82F6)",
                }
              }),
              singleValue: (base) => ({ ...base, color: "inherit", fontWeight: 600 }),
              input: (base) => ({ ...base, color: "inherit" }),
              placeholder: (base) => ({ ...base, color: "var(--app-text-muted, #94A3B8)" }),
              menu: (base) => ({
                ...base,
                backgroundColor: "var(--app-surface, #FFFFFF)",
                border: "1px solid var(--app-border, #E2E8F0)",
                borderRadius: "0.75rem",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                zIndex: 60
              }),
              option: (styles, { isFocused, isSelected }) => ({
                ...styles,
                backgroundColor: isSelected 
                  ? "var(--app-primary, #3B82F6)" 
                  : isFocused 
                    ? "rgba(59, 130, 246, 0.08)" 
                    : "transparent",
                color: isSelected ? "#FFFFFF" : "inherit",
                fontSize: "12px",
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
              }),
            }}
          />
        </div>
        
        {/* Walk-in Shortcut Button */}
        {selectedCustomer && (
          <button
            type="button"
            onClick={() => onCustomerSelect(null)}
            className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl border border-app-border bg-app-surface text-app-text-secondary hover:text-app-text hover:border-app-border-hover transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            title="Reset to Walk-in Cash Customer"
          >
            Walk-in
          </button>
        )}
      </div>

      {/* Selected Customer Info Pill / Alert */}
      {customerInfo ? (
        <div className="p-2.5 bg-app-surface-subtle border border-app-border rounded-xl transition-all animate-fadeIn">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-app-primary/10 text-app-primary flex items-center justify-center font-black text-xs shrink-0">
                {customerInfo.name ? customerInfo.name.charAt(0).toUpperCase() : <User size={13} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-app-text truncate">{customerInfo.name}</span>
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-app-text-muted mt-0.5">
                  {customerInfo.phone && (
                    <span className="flex items-center gap-0.5">
                      <Phone size={10} /> {customerInfo.phone}
                    </span>
                  )}
                  {customerInfo.email && (
                    <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                      <Mail size={10} /> {customerInfo.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Outstanding Khata Due Alert */}
            {Number(customerInfo.balance) > 0 ? (
              <div className="text-right shrink-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 flex items-center justify-end gap-0.5">
                  <AlertTriangle size={10} className="animate-pulse" /> Khata Due
                </span>
                <p className="text-xs font-black text-rose-600 font-mono">
                  ₹{Number(customerInfo.balance).toLocaleString('en-IN')}
                </p>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                No Dues
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] px-1 text-app-text-muted">
          <span className="flex items-center gap-1.5">
            <UserCheck size={12} className="text-app-text-secondary" />
            Walk-in Customer (नकद ग्राहक)
          </span>
          <span className="text-[10px] font-mono bg-app-surface-subtle border border-app-border text-app-text-secondary px-1.5 py-0.2 rounded">
            F2: Search
          </span>
        </div>
      )}
    </div>
  );
};

export default CustomerSection;
