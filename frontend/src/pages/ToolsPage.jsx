import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Bell, 
  ScanBarcode, 
  Smartphone, 
  FileDown, 
  ShieldCheck, 
  Settings2, 
  Zap,
  MessageCircle,
  ArrowRight,
  Wallet,
  Receipt,
  Package,
  History,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const toolSections = [
    {
        title: "Sales & Revenue",
        icon: Receipt,
        color: "text-brand-blue",
        features: [
            { id: 'whatsapp_invoice', title: 'WhatsApp PDF Bills', desc: 'Auto-send GST invoices to customer WhatsApp after sale.', icon: MessageCircle, enabled: true, badge: 'Active' },
            { id: 'pos_shortcuts', title: 'Keyboard POS', desc: 'Use numeric keys and enter to bill faster without mouse.', icon: Zap, enabled: true, badge: 'Pro' },
        ]
    },
    {
        title: "Payments & Collections",
        icon: Wallet,
        color: "text-emerald-600",
        features: [
            { id: 'reminders', title: 'Auto-Reminders', desc: 'System automatically prompts you to collect old dues.', icon: Bell, enabled: true, badge: 'Popular' },
            { id: 'payment_history', title: 'Payments Center', desc: 'View complete collection ledger and bank reconciliations.', icon: History, enabled: true, badge: 'Core', link: '/payments' },
        ]
    },
    {
        title: "Inventory & Logistics",
        icon: Package,
        color: "text-amber-600",
        features: [
            { id: 'barcode', title: 'Barcode Logic', desc: 'Group products by SKU and scan to deduct stock instantly.', icon: ScanBarcode, enabled: false, badge: 'Coming Soon' },
            { id: 'low_stock_adv', title: 'Stock Forecasting', desc: 'Predict when you will run out of specific items.', icon: Zap, enabled: false, badge: 'Beta' },
        ]
    },
    {
        title: "HR & Payroll",
        icon: Users,
        color: "text-indigo-600",
        features: [
            { id: 'attendance', title: 'Staff Attendance', desc: 'Let staff mark attendance and auto-calculate monthly salary.', icon: ShieldCheck, enabled: true, badge: 'Active', link: '/staff' },
            { id: 'payroll', title: 'Smart Payroll', desc: 'Generate salary slips and track employee advances/loans.', icon: Wallet, enabled: true, badge: 'Active', link: '/staff' },
        ]
    },
    {
        title: "Tax & Compliance",
        icon: ShieldCheck,
        color: "text-rose-600",
        features: [
            { id: 'gst_filing', title: 'GSTR-1 Reports', desc: 'Export auto-calculated GST reports for easy filing.', icon: FileDown, enabled: false, badge: 'Beta' },
            { id: 'audit_logs', title: 'Audit Logs', desc: 'Track every single action by staff for high security.', icon: History, enabled: true, badge: 'Premium' },
        ]
    },
    {
        title: "Advanced CRM",
        icon: Smartphone,
        color: "text-purple-600",
        features: [
            { id: 'bulk_sms', title: 'Bulk Marketing', desc: 'Send promotional SMS or WhatsApp to all your customers.', icon: Zap, enabled: false, badge: 'Coming Soon' },
            { id: 'loyalty', title: 'Loyalty Points', desc: 'Reward regular customers with points on every purchase.', icon: Zap, enabled: false, badge: 'Beta' },
        ]
    }
];

export default function ToolsPage() {
  const navigate = useNavigate();
  const [sections, setSections] = useState(toolSections);

  const toggleFeature = (sectionIdx, featureId) => {
    const newSections = [...sections];
    const feature = newSections[sectionIdx].features.find(f => f.id === featureId);
    if (!feature) return;
    
    if (feature.badge === 'Coming Soon') return toast.error("This feature is coming soon!");
    
    feature.enabled = !feature.enabled;
    toast.success(`${feature.title} ${feature.enabled ? 'Enabled' : 'Disabled'}`);
    setSections(newSections);
  };

  return (
    <div className="space-y-[40px] animate-fade-in-up pb-[60px]">
      <div>
        <h1 className="text-[24px] font-extrabold text-[#0F172A] flex items-center gap-[12px]">
          <Settings2 size={28} className="text-brand-blue" />
          Feature Hub & Modules
        </h1>
        <p className="text-[14px] text-[#64748B] mt-[4px] font-medium">Enable powerful modular extensions to supercharge your FinSathi experience.</p>
      </div>

      <div className="space-y-[48px]">
        {sections.map((section, sIdx) => {
            const SectionIcon = section.icon;
            return (
                <div key={section.title} className="space-y-[20px]">
                    <div className="flex items-center gap-[12px] border-b border-gray-100 pb-[12px]">
                        <div className={`p-[8px] rounded-lg bg-gray-50 ${section.color}`}>
                            <SectionIcon size={20} />
                        </div>
                        <h2 className="text-[18px] font-bold text-brand-navy">{section.title}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
                        {section.features.map(f => {
                            const Icon = f.icon;
                            return (
                                <Card key={f.id} className="flex flex-col justify-between hover:shadow-lg transition-all duration-300 border-gray-100 group">
                                    <div onClick={() => f.link && navigate(f.link)} className={f.link ? 'cursor-pointer' : ''}>
                                        <div className="flex justify-between items-start mb-[16px]">
                                            <div className={`p-[10px] rounded-xl bg-gray-50 group-hover:bg-brand-blue/5 transition-colors ${f.enabled ? 'text-brand-blue' : 'text-gray-400'}`}>
                                                <Icon size={24} />
                                            </div>
                                            <Badge variant={f.badge === 'Active' || f.badge === 'Core' || f.badge === 'Popular' ? 'success' : 'gray'}>
                                                {f.badge}
                                            </Badge>
                                        </div>
                                        <h3 className="text-[15px] font-bold text-brand-navy mb-[6px] flex items-center justify-between">
                                            {f.title}
                                            {f.link && <ArrowRight size={14} className="text-gray-300 group-hover:text-brand-blue transition-colors" />}
                                        </h3>
                                        <p className="text-[12px] text-[#64748B] leading-relaxed mb-[20px]">
                                            {f.desc}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-[16px] border-t border-gray-50">
                                        <span className={`text-[11px] font-bold ${f.enabled ? 'text-emerald-600' : 'text-gray-400'} uppercase tracking-widest`}>
                                            {f.enabled ? 'Functional' : 'Inactive'}
                                        </span>
                                        <div 
                                            onClick={() => toggleFeature(sIdx, f.id)}
                                            className={`w-[38px] h-[20px] rounded-full relative cursor-pointer transition-colors ${f.enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute top-[2px] w-[16px] h-[16px] bg-white rounded-full shadow-sm transition-all ${f.enabled ? 'left-[20px]' : 'left-[2px]'}`} />
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )
        })}
      </div>

      {/* FOOTER CALL TO ACTION */}
      <Card className="bg-brand-navy border-none p-[32px] overflow-hidden relative">
         <div className="absolute top-0 right-0 p-[24px] opacity-10">
            <Zap size={100} className="text-white" />
         </div>
         <div className="relative z-10 max-w-2xl">
            <h2 className="text-[20px] font-bold text-white mb-[12px]">Request a Custom Business Module?</h2>
            <p className="text-slate-400 text-[14px] leading-relaxed mb-8">
               Our engineering team can build custom logic specifically for your business workflow (e.g. specialized jewelry billing, pharmacy expiry tracking, or transport logistics).
            </p>
            <Button variant="secondary" size="lg" className="px-[32px]">Contact Solution Experts</Button>
         </div>
      </Card>
    </div>
  );
}
