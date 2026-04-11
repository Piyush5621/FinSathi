import {  useState  } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LayoutGrid, ShoppingCart, Truck, Users, Database, Zap, Monitor, Globe, Star, History } from 'lucide-react';

const sections = [
    {
        id: 'ecommerce',
        label: 'E-Commerce',
        icon: ShoppingCart,
        title: 'Online Storefront & Digital Payments',
        desc: 'Link your inventory to a public website where customers can order directly. Real-time sync with your POS stock.',
        milestones: ['Custom Domain Support', 'WhatsApp Order Link', 'UPI Payment Integration'],
        status: 'In Development'
    },
    {
        id: 'logistics',
        label: 'Supply Chain',
        icon: Truck,
        title: 'Advanced Vendor & Logistics Hub',
        desc: 'Track shipments, manage multiple warehouses, and automate purchase orders based on stock prediction.',
        milestones: ['Multi-Warehouse Management', 'Automated POs', 'Logistics Tracking'],
        status: 'Planning Phase'
    },
    {
        id: 'hr',
        label: 'HR & Staff',
        icon: Users,
        title: 'Employee Portal & Payroll',
        desc: 'Manage staff attendance, leave applications, and automated salary slip generation with tax compliance.',
        milestones: ['Attendance Monitoring', 'Salary Generation', 'Performance Tracking'],
        status: 'Beta Testing'
    },
    {
        id: 'api',
        label: 'Third Party API',
        icon: Database,
        title: 'Developer Portal & API Access',
        desc: 'Connect FinSathi to your own custom software via secure REST APIs and Webhooks.',
        milestones: ['API Key Management', 'Webhooks Support', 'Documentation Hub'],
        status: 'Roadmap'
    }
];

export default function DemoHub() {
    const [activeTab, setActiveTab] = useState(sections[0].id);
    const activeSection = sections.find(s => s.id === activeTab);

    return (
        <div className="space-y-[32px] animate-fade-in-up pb-[60px]">
            <div>
                <h1 className="text-[24px] font-extrabold text-[#0F172A] flex items-center gap-[12px]">
                    <LayoutGrid size={28} className="text-brand-blue" />
                    Marketplace & Future Hub
                </h1>
                <p className="text-[14px] text-[#64748B] mt-[4px] font-medium">Explore upcoming modular sections designed to handle every aspect of your enterprise.</p>
            </div>

            {/* DEMO SECTION NAV */}
            <div className="bg-white border border-gray-100 rounded-2xl p-[6px] flex flex-wrap shadow-sm">
                {sections.map(s => {
                    const Icon = s.icon;
                    return (
                        <button
                            key={s.id}
                            onClick={() => setActiveTab(s.id)}
                            className={`flex items-center gap-[10px] px-[20px] py-[12px] rounded-xl text-[14px] font-bold transition-all ${
                                activeTab === s.id 
                                ? 'bg-brand-blue text-white shadow-md' 
                                : 'text-text-muted hover:bg-gray-50'
                            }`}
                        >
                            <Icon size={18} />
                            {s.label}
                        </button>
                    )
                })}
            </div>

            {/* PREVIEW AREA */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-[32px]">
                {/* Information Card */}
                <div className="xl:col-span-2 space-y-[24px]">
                    <Card className="min-h-[400px] flex flex-col justify-center p-[48px] bg-gradient-to-br from-white to-[#F8FAFC]">
                        <div className="w-[64px] h-[64px] rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mb-[32px]">
                            <activeSection.icon size={32} />
                        </div>
                        <Badge variant="blue" className="mb-[16px] w-fit">{activeSection.status}</Badge>
                        <h2 className="text-[32px] font-black text-brand-navy leading-tight mb-[20px]">{activeSection.title}</h2>
                        <p className="text-[16px] text-[#64748B] leading-relaxed mb-[40px] max-w-xl">
                            {activeSection.desc}
                        </p>
                        
                        <div className="space-y-[12px]">
                            <p className="text-[12px] font-bold text-text-muted uppercase tracking-widest mb-[16px]">Future Milestones</p>
                            {activeSection.milestones.map((m, i) => (
                                <div key={i} className="flex items-center gap-[12px] text-[14px] font-bold text-brand-navy">
                                   <div className="w-[6px] h-[6px] rounded-full bg-brand-blue" /> {m}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-[24px]">
                    <Card className="bg-brand-navy border-none">
                        <div className="p-2 space-y-[16px]">
                            <div className="w-[48px] h-[48px] bg-white/10 rounded-xl flex items-center justify-center text-[#3B82F6]">
                                <Monitor size={24} />
                            </div>
                            <h3 className="text-white font-bold">Early Access Program</h3>
                            <p className="text-slate-400 text-[13px] leading-relaxed">
                                Want to test this section before it goes public? Join our Beta testing group.
                            </p>
                            <Button variant="secondary" className="w-full">Apply for Beta</Button>
                        </div>
                    </Card>

                    <Card className="border-dashed border-2 flex flex-col items-center justify-center text-center p-[40px]">
                        <Globe size={32} className="text-gray-300 mb-[16px]" />
                        <p className="text-[14px] font-bold text-brand-navy italic">"A completely modular business ecosystem."</p>
                        <div className="flex gap-1 mt-4 text-yellow-400">
                           {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                        </div>
                    </Card>
                </div>
            </div>

            {/* DYNAMIC SHORTCUTS DEMO */}
            <div className="pt-[32px]">
                 <h3 className="text-[18px] font-bold text-brand-navy mb-[24px]">Unified Dashboard Integration</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">
                      <div className="p-[24px] bg-white border border-gray-100 rounded-2xl flex items-center gap-[20px] opacity-60">
                         <Zap size={24} className="text-brand-blue" />
                         <div>
                            <p className="text-[14px] font-bold">Add Online Order</p>
                            <p className="text-[11px] font-bold text-text-muted">Shortcuts enabled</p>
                         </div>
                      </div>
                      <div className="p-[24px] bg-white border border-gray-100 rounded-2xl flex items-center gap-[20px] opacity-60 text-gray-400">
                         <Monitor size={24} />
                         <div>
                            <p className="text-[14px] font-bold">Monitor Fleet</p>
                            <p className="text-[11px] font-bold">Logistics Module</p>
                         </div>
                      </div>
                      <div className="p-[24px] bg-white border border-gray-100 rounded-2xl flex items-center gap-[20px] opacity-60 text-gray-400">
                         <History size={24} />
                         <div>
                            <p className="text-[14px] font-bold">Payroll Auto-Sync</p>
                            <p className="text-[11px] font-bold">HR Module</p>
                         </div>
                      </div>
                 </div>
            </div>
        </div>
    );
}
