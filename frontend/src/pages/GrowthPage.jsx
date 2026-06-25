import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Sparkles, TrendingUp, ExternalLink, X, ShieldCheck, Landmark, Search, RefreshCcw } from 'lucide-react';
import API from '../services/apiClient';
import toast from 'react-hot-toast';
import Skeleton from '../components/ui/Skeleton';

export default function GrowthPage() {
  const [loading, setLoading] = useState(true);
  const [matchedSchemes, setMatchedSchemes] = useState([]);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/schemes/matched');
      setMatchedSchemes(data || []);
    } catch (err) {
      toast.error("Failed to load subsidy matches");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await API.post(`/schemes/dismiss/${id}`);
      setMatchedSchemes(prev => prev.filter(s => s.id !== id));
      toast.success("Scheme hidden");
    } catch (err) {
      toast.error("Failed to dismiss");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Premium Hero Header */}
      <div className="relative p-10 bg-slate-900 text-white rounded-[32px] overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-10 opacity-10 animate-pulse"><Landmark size={200} /></div>
         <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
               <div className="bg-brand-blue p-2 rounded-lg"><Sparkles size={16} className="text-white" /></div>
               <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-blue">Growth Intelligence</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight leading-tight">Scale your business with <span className="text-brand-blue">Government Subsidies.</span></h1>
            <p className="text-slate-400 mt-4 text-lg">FinSathi AI has analyzed your business profile and matched you with these verified schemes and grants from the Government of India.</p>
         </div>
      </div>

      {/* 📖 User Guide: How it Works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <GuideCard 
            step="01" 
            title="Profile Analysis" 
            desc="We check your city, business type, and turnover against government criteria." 
            icon={<Search size={20} />}
         />
         <GuideCard 
            step="02" 
            title="Smart Matching" 
            desc="Our algorithms calculate a 'Fit Score' to show your eligibility probability." 
            icon={<Sparkles size={20} />}
         />
         <GuideCard 
            step="03" 
            title="Direct Application" 
            desc="Click 'Apply Now' to go directly to the official government portal." 
            icon={<ExternalLink size={20} />}
         />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
         {/* Main Feed: Matched Schemes */}
         <div className="xl:col-span-3 space-y-6">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-500" /> Active Recommended Schemes
               </h2>
               <Badge className="bg-slate-100 text-slate-400 uppercase font-black">Verified Scans</Badge>
            </div>

            {loading ? (
               <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} height="180px" rounded="rounded-3xl" />)}
               </div>
            ) : matchedSchemes.length === 0 ? (
               <Card className="p-12 text-center border-dashed border-2 bg-slate-50/30">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                     <TrendingUp size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No New Matches Found</h3>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto text-sm leading-relaxed">
                     Complete your business profile details in settings to help our AI find better matches for you.
                  </p>
                  <div className="mt-8 flex items-center justify-center gap-4">
                     <Button href="/profile" className="font-bold px-8">Update Profile</Button>
                     <Button variant="secondary" onClick={fetchMatches} className="font-bold gap-2">
                        <RefreshCcw size={16} /> Re-Scan
                     </Button>
                  </div>
               </Card>
            ) : (
               <div className="grid grid-cols-1 gap-6">
                  {matchedSchemes.map(scheme => (
                     <Card key={scheme.id} className="p-8 group hover:border-brand-blue/30 transition-all duration-500 flex flex-col md:flex-row gap-8 relative overflow-hidden">
                        {/* Match Score Gauge */}
                        <div className="flex-shrink-0 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 min-w-[120px]">
                           <div className="relative w-16 h-16 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90">
                                 <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-200" />
                                 <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 * (1 - scheme.match_score / 100)} className="text-brand-blue transition-all duration-1000" />
                              </svg>
                              <span className="absolute text-xs font-black text-slate-900">{scheme.match_score}%</span>
                           </div>
                           <span className="text-[10px] font-black text-slate-400 uppercase mt-2">AI Match</span>
                        </div>

                        <div className="flex-1">
                           <div className="flex justify-between items-start">
                              <div>
                                 <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 uppercase text-[10px] mb-2">{scheme.category}</Badge>
                                 <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-blue transition-colors">{scheme.name}</h3>
                              </div>
                              <button onClick={() => handleDismiss(scheme.id)} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100">
                                 <X size={16} />
                              </button>
                           </div>
                           
                           <p className="text-slate-600 mt-2 line-clamp-2 leading-relaxed">{scheme.description}</p>
                           
                           <div className="mt-6 flex flex-wrap gap-4 items-center">
                              <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                 <span className="text-[10px] font-bold text-emerald-400 uppercase block">Max Benefit</span>
                                 <span className="text-lg font-black text-emerald-700">₹{scheme.max_amount?.toLocaleString()}</span>
                              </div>
                              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                 <span className="text-[10px] font-bold text-slate-400 uppercase block">Region</span>
                                 <span className="text-sm font-black text-slate-700 uppercase tracking-wider">{scheme.state}</span>
                              </div>
                           </div>
                        </div>

                        <div className="md:border-l border-slate-100 md:pl-8 flex flex-col gap-3 items-center justify-center">
                           <Button as="a" href={scheme.application_url} target="_blank" className="w-full font-bold gap-2 bg-slate-900 border-none px-6">
                              Apply Now <ExternalLink size={16} />
                           </Button>
                           <Button 
                              variant="ghost" 
                              className="w-full text-[10px] font-black uppercase tracking-tighter text-slate-400 hover:text-indigo-600"
                              onClick={() => {
                                 toast.success("Saved to your growth plan!");
                              }}
                           >
                              Save for Later
                           </Button>
                        </div>
                     </Card>
                  ))}
               </div>
            )}
         </div>

         {/* Right Sidebar: Growth Tips */}
         <div className="space-y-6">
            <Card className="p-6 bg-brand-blue text-white overflow-hidden relative">
               <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={80} /></div>
               <h4 className="text-sm font-black uppercase tracking-widest opacity-70">Coming Phase 3</h4>
               <h3 className="text-xl font-black mt-2 leading-tight">FinPredict AI <br/>Cash Flow Engine</h3>
               <p className="text-sm text-indigo-100 mt-3 leading-relaxed">Soon, FinSathi will predict your 90-day cash cycle and alert you of potential crunches before they happen.</p>
               <div className="mt-6 bg-white/20 p-2 rounded-xl text-center text-xs font-bold uppercase tracking-wider cursor-default">
                  Under Training...
               </div>
            </Card>

            <div className="space-y-4 px-2">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Growth Checklist</h3>
               <div className="space-y-3">
                  <GrowthStep label="Update GSTIN Profile" done={true} />
                  <GrowthStep label="Add Udyam Registration" done={false} />
                  <GrowthStep label="Analyze Profit Margins" done={false} />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function GrowthStep({ label, done }) {
   return (
      <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
         <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
            {done && <Check size={12} className="text-white" />}
         </div>
         <span className={`text-sm font-bold ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{label}</span>
      </div>
   );
}

function Check({ size, className }) {
   return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>;
}

function GuideCard({ step, title, desc, icon }) {
   return (
      <Card className="p-6 border-slate-100 hover:border-indigo-100 transition-colors group">
         <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">
               {icon || step}
            </div>
            <div>
               <h4 className="text-sm font-black text-slate-900 leading-none">{title}</h4>
               <p className="text-xs text-slate-500 mt-2 leading-relaxed">{desc}</p>
            </div>
         </div>
      </Card>
   );
}

