

export function Input({ label, type = 'text', value, onChange, placeholder, required = false, className = '' }) {
  return (
    <div className={`flex flex-col gap-[4px] ${className}`}>
      {label && (
        <label className="text-[13px] font-semibold text-[#64748B]">
          {label} {required && <span className="text-[#B91C1C]">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-[12px] py-[10px] text-[14px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 focus:border-[#3B82F6] transition-all"
      />
    </div>
  );
}
