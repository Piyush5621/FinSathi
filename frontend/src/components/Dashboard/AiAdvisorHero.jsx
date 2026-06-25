import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  Sparkles, Send, Zap, AlertTriangle, TrendingUp, 
  MessageSquare, ShieldAlert, Target, Terminal, Bot
} from 'lucide-react';
import API from '../../services/apiClient';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

const SUGGESTIONS = [
  "Show low-stock items",
  "Summarize this month's profit",
  "Show my top products",
  "How are my expenses split?"
];

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AiAdvisorHero({ dashboardData }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! I am FinVoice, your AI business advisor. I've analyzed your financial ledger. What insights would you like to review today?"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!dashboardData) return null;

  const { metrics, inventory, recentSales } = dashboardData;

  // AI Generated Executive Summary
  const executiveSummary = `MTD Revenue is ₹${metrics.revenue.toLocaleString('en-IN')} with a growth of ${metrics.revenueGrowth}% compared to last month. Net profit is ₹${metrics.profit.toLocaleString('en-IN')} with average order value at ₹${metrics.aov}. Outstanding uncollected dues are high at ₹${metrics.outstanding.toLocaleString('en-IN')}. Focus on collecting receivables and restocking ${inventory.lowStockCount} low-stock inventory items.`;

  // Priority recommendations
  const priorityRecs = [];
  if (metrics.outstanding > 1000) {
    priorityRecs.push({
      type: 'risk',
      title: 'Due Collection Threat',
      desc: `₹${metrics.outstanding.toLocaleString()} outstanding dues remain uncollected. Click 'Collect Dues' to follow up.`
    });
  }
  if (inventory.lowStockCount > 0) {
    priorityRecs.push({
      type: 'optimization',
      title: 'Inventory Stockout Hazard',
      desc: `${inventory.lowStockCount} items are low on stock. Restock soon to prevent billing disruption.`
    });
  }
  if (metrics.revenueGrowth > 10) {
    priorityRecs.push({
      type: 'opportunity',
      title: 'Sales Momentum',
      desc: `Revenue grew ${metrics.revenueGrowth}% this month. Consider launching promotions to sustain growth.`
    });
  } else {
    priorityRecs.push({
      type: 'opportunity',
      title: 'AOV Optimization',
      desc: `Average Order Value is ₹${metrics.aov}. Bundle high-margin products to increase checkout size.`
    });
  }

  const handleSend = async (textToSend) => {
    const text = textToSend || query;
    if (!text.trim()) return;

    // Add user message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await API.post("/ai/query", { query: text });
      if (res.data && res.data.success) {
        const aiData = res.data.data;
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          text: aiData.summary || "Here is what I found:",
          chartType: aiData.chartType,
          chartData: aiData.data
        }]);
      } else {
        throw new Error(res.data?.summary || "Failed to get AI response");
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        text: "I ran into a server error processing that query. Please make sure the backend configuration and API keys are correct."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderAICardChart = (type, data) => {
    if (!data) return null;
    
    // 1. Sales Trend Area Chart
    if (type === 'line' && data.trend) {
      return (
        <div className="h-40 w-full mt-4 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="aiTrendColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{fontSize: 8, fill: '#94A3B8'}} />
              <YAxis tick={{fontSize: 8, fill: '#94A3B8'}} />
              <Tooltip />
              <Area type="monotone" dataKey="amount" stroke="#6366F1" strokeWidth={1.5} fillOpacity={1} fill="url(#aiTrendColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // 2. Expenses Pie Chart
    if (type === 'pie' && data.byCategory) {
      return (
        <div className="flex items-center gap-4 mt-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
          <div className="w-20 h-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byCategory} dataKey="value" nameKey="name" innerRadius={15} outerRadius={30} paddingAngle={2}>
                  {data.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1">
            {data.byCategory.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between text-[9px] font-bold">
                <span className="text-slate-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: COLORS[i]}} />
                  {item.name}
                </span>
                <span className="text-slate-800">₹{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 3. Top Products Bar Chart
    if (type === 'bar' && data.topProducts) {
      return (
        <div className="h-40 w-full mt-4 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topProducts} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{fontSize: 8, fill: '#94A3B8'}} />
              <YAxis tick={{fontSize: 8, fill: '#94A3B8'}} />
              <Tooltip />
              <Bar dataKey="amount" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // 4. Low stock items
    if (data.lowStock && data.lowStock.length > 0) {
      return (
        <div className="space-y-1.5 mt-3">
          {data.lowStock.slice(0, 3).map((item, i) => (
            <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-[10px]">
              <span className="font-bold text-slate-800">{item.name}</span>
              <span className="font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">
                Stock: {item.stock}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // 5. Staff Salaries
    if (data.staff && data.staff.length > 0) {
      return (
        <div className="space-y-1.5 mt-3">
          {data.staff.slice(0, 3).map((item, i) => (
            <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-[10px]">
              <span className="font-bold text-slate-800">{item.name}</span>
              <span className="font-bold text-slate-500">₹{Number(item.salary).toLocaleString()}/mo</span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left Pane: Summary and Recommendations (5 cols) */}
      <div className="lg:col-span-5 space-y-5 flex flex-col">
        {/* Executive Summary */}
        <Card className="p-5 flex-1 bg-gradient-to-br from-indigo-950 to-slate-900 border-none text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 p-6 opacity-[0.03] pointer-events-none">
            <Bot size={200} />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Sparkles size={14} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                AI Generated Executive Summary
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {executiveSummary}
            </p>
          </div>
        </Card>

        {/* Priority Recommendations */}
        <Card className="p-5 flex-2 bg-white border border-slate-100/90 shadow-sm rounded-[24px]">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Target size={12} className="text-indigo-500" /> Focus Decisions
          </h3>
          <div className="space-y-3">
            {priorityRecs.map((rec, i) => {
              const isRisk = rec.type === 'risk';
              const isOpt = rec.type === 'optimization';
              return (
                <div key={i} className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                  isRisk ? 'bg-rose-50/30 border-rose-100 text-rose-800' :
                  isOpt ? 'bg-amber-50/30 border-amber-100 text-amber-800' :
                  'bg-indigo-50/30 border-indigo-100 text-indigo-800'
                }`}>
                  <div className="mt-0.5 shrink-0">
                    {isRisk ? <ShieldAlert size={14} className="text-rose-500" /> :
                     isOpt ? <AlertTriangle size={14} className="text-amber-500" /> :
                     <Sparkles size={14} className="text-indigo-500" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">{rec.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{rec.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Right Pane: Conversational Assistant console (7 cols) */}
      <div className="lg:col-span-7">
        <Card className="p-5 bg-white border border-slate-100/90 shadow-sm rounded-[24px] flex flex-col h-[580px]">
          {/* Console Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="text-indigo-600" size={16} />
              <div>
                <h3 className="text-xs font-black text-slate-800 tracking-tight">FinVoice Assistant</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Natural Query Engine</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Agent Ready</span>
            </div>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1 mb-4 flex flex-col">
            {messages.map((msg) => {
              const isAI = msg.role === 'assistant';
              return (
                <div key={msg.id} className={`flex gap-2 max-w-[85%] ${isAI ? 'self-start' : 'self-end flex-row-reverse'}`}>
                  {isAI && (
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Bot size={13} className="text-indigo-600" />
                    </div>
                  )}
                  <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed border ${
                    isAI 
                      ? 'bg-slate-50 border-slate-100 text-slate-700 rounded-tl-sm' 
                      : 'bg-indigo-600 border-indigo-700 text-white rounded-tr-sm shadow-sm'
                  }`}>
                    <p>{msg.text}</p>
                    {isAI && renderAICardChart(msg.chartType, msg.chartData)}
                  </div>
                </div>
              );
            })}
            
            {loading && (
              <div className="flex gap-2 max-w-[85%] self-start items-center">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Bot size={13} className="text-indigo-600" />
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl rounded-tl-sm text-slate-400 text-xs font-medium flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '0ms'}} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '150ms'}} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                  FinVoice is thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts List (when idle) */}
          {!loading && messages.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Zap size={9} className="text-amber-500" /> {s}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Console */}
          <div className="flex gap-2 shrink-0">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Ask about margins, expenses, products, or cash flow..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={loading}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
              />
            </div>
            <Button 
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              icon={<Send size={12} />} 
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50"
            />
          </div>
        </Card>
      </div>

    </div>
  );
}
