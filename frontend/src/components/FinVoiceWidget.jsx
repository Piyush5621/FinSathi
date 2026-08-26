import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/apiClient';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, Send, X, Loader2,
  Bot, TrendingUp, PieChart as PieChartIcon, List, BarChart2 as BarChartIcon, ChevronUp,
  AlertCircle, WifiOff, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, 
  Volume2, RotateCcw, MessageSquare, Package, Users, DollarSign
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart,
  Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import logoImg from '../assets/logo.svg';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const QUICK_QUERIES = [
  "आज कितना बिका? (Aaj kitna bika?)",
  "Kaunse products reorder karne hain?",
  "Rahul ka kitna udhaar hai?",
  "Is mahine ka profit batao",
  "Cash runway kitna hai?"
];

function ResultChart({ type, data }) {
  if (!data || !type) return null;

  if (type === 'SALES_SUMMARY' && data.trend?.length > 0) {
    return (
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.trend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: 11 }}
              formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Sales']}
            />
            <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#aiGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'TOP_PRODUCTS' && data.topProducts?.length > 0) {
    return (
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.topProducts} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: 11 }}
              formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.topProducts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'EXPENSE_QUERY' && data.byCategory?.length > 0) {
    return (
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data.byCategory} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={3}>
              {data.byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', fontSize: 11 }}
              formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'INVENTORY_CHECK' && data.lowStock?.length > 0) {
    return (
      <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
        {data.lowStock.map((item, i) => (
          <div key={i} className="flex justify-between items-center py-1.5 px-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-100 dark:border-rose-900/40 text-xs">
            <span className="font-semibold text-app-text">{item.name}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
              {item.stock === 0 ? 'OUT OF STOCK' : `${item.stock} left`}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'CUSTOMER_BALANCE' && data.perCustomer && Object.keys(data.perCustomer).length > 0) {
    return (
      <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
        {Object.entries(data.perCustomer).slice(0, 5).map(([name, amt], i) => (
          <div key={i} className="flex justify-between items-center py-1.5 px-2.5 bg-app-surface-subtle rounded-lg border border-app-border text-xs">
            <span className="font-semibold text-app-text">{name}</span>
            <span className="font-black font-mono text-rose-600">₹{Number(amt).toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

const intentIcon = {
  SALES_SUMMARY:    <TrendingUp size={12} />,
  EXPENSE_QUERY:    <PieChartIcon size={12} />,
  TOP_PRODUCTS:     <BarChartIcon size={12} />,
  CUSTOMER_BALANCE: <Users size={12} />,
  INVENTORY_CHECK:  <Package size={12} />,
  PROFIT_REPORT:    <TrendingUp size={12} />,
  STAFF_SALARY:     <DollarSign size={12} />,
};

export default function FinVoiceWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showQuickQueries, setShowQuickQueries] = useState(true);
  const [micError, setMicError] = useState(null);
  const [language, setLanguage] = useState('hi-IN'); // 'hi-IN' | 'en-IN'
  const [pendingAction, setPendingAction] = useState(null);

  // Recent queries history
  const [recentQueries, setRecentQueries] = useState(() => {
    try {
      const saved = localStorage.getItem('karobar_recent_voice_queries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const submitRef = useRef(null);

  // Detect Action Intent
  const extractActionIntent = (qText, resData) => {
    const q = qText.toLowerCase();
    
    if (q.includes("reminder") || q.includes("bhejo") || q.includes("send message") || q.includes("taqaza")) {
      return {
        title: "Send Customer Payment Reminder",
        target: "Customer Khata Collection",
        path: "/customers",
        buttonLabel: "Open Khata & Dispatch"
      };
    }
    if (q.includes("reorder") || q.includes("khareed") || q.includes("purchase") || q.includes("order banao")) {
      return {
        title: "Create Purchase Order for Low-Stock Items",
        target: "Supplier Wholesale Replenishment",
        path: "/suppliers",
        buttonLabel: "Open Supplier Hub"
      };
    }
    if (q.includes("sale banao") || q.includes("bill banao") || q.includes("billing")) {
      return {
        title: "Open POS Billing Terminal",
        target: "New Invoice Checkout",
        path: "/billing",
        buttonLabel: "Go to Billing Terminal"
      };
    }
    if (q.includes("kharcha add") || q.includes("expense record") || q.includes("kharcha likho")) {
      return {
        title: "Record Operational Business Expense",
        target: "Expense & Outflow Ledger",
        path: "/expenses",
        buttonLabel: "Record in Expense Center"
      };
    }
    return null;
  };

  // Submit Query
  const handleQuerySubmit = useCallback(async (queryText) => {
    const q = (typeof queryText === 'string' ? queryText : query).trim();
    if (!q) return;

    setIsLoading(true);
    setShowQuickQueries(false);
    setResult(null);
    setPendingAction(null);

    // Save to recent queries
    const updated = [q, ...recentQueries.filter(item => item !== q)].slice(0, 5);
    setRecentQueries(updated);
    localStorage.setItem('karobar_recent_voice_queries', JSON.stringify(updated));

    try {
      const res = await API.post('/ai/query', { query: q });
      setResult(res.data);

      // Check if this query implies an action
      const action = extractActionIntent(q, res.data);
      if (action) {
        setPendingAction(action);
      }
    } catch (err) {
      const serverMsg = err.response?.data?.summary || err.response?.data?.error;
      const networkErr = !err.response;
      setResult({
        success: false,
        summary: networkErr
          ? "Cannot reach backend server. Please verify your connection."
          : (serverMsg || `Server error: ${err.message}`),
        isNetworkError: networkErr,
      });
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  }, [query, recentQueries]);

  submitRef.current = handleQuerySubmit;

  // Web Speech API Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError('Speech recognition not supported in this browser. Use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = language;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setIsListening(false);
      submitRef.current(transcript);
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') {
        setMicError('Microphone permission denied. Allow mic access in browser settings.');
      } else if (e.error === 'no-speech') {
        setMicError('No speech detected. Please speak clearly.');
        setTimeout(() => setMicError(null), 3000);
      } else {
        setMicError(`Mic notice: ${e.error}`);
        setTimeout(() => setMicError(null), 3000);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, [language]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setMicError('Voice not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setMicError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        recognitionRef.current.stop();
        setTimeout(() => {
          try { recognitionRef.current.start(); setIsListening(true); } catch {}
        }, 200);
      }
    }
  };

  return (
    <>
      {/* Floating FinVoice Activation FAB */}
      <button
        id="finvoice-fab"
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer border-2 border-white/20"
        title="FinVoice AI — Speak in Hindi, Hinglish, or English"
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <div className="relative flex items-center justify-center">
            <Mic size={22} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
        )}
      </button>

      {/* Slide-Up Voice Assistant Panel */}
      {isOpen && (
        <div className="fixed bottom-[calc(6rem+3.5rem)] right-6 z-50 w-[360px] bg-app-surface rounded-2xl shadow-2xl shadow-indigo-500/20 border border-app-border overflow-hidden animate-slide-up flex flex-col max-h-[540px]">

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-4 py-3 text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  <Bot size={18} className="text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm tracking-tight">FinVoice AI</span>
                    <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-mono font-bold">MSME v2</span>
                  </div>
                </div>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setLanguage('hi-IN')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${language === 'hi-IN' ? 'bg-white text-indigo-700' : 'text-white/80 hover:text-white'}`}
                >
                  हिन्दी (Hinglish)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en-IN')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${language === 'en-IN' ? 'bg-white text-indigo-700' : 'text-white/80 hover:text-white'}`}
                >
                  English
                </button>
              </div>
            </div>
            <p className="text-[11px] text-indigo-100 mt-1">
              Speak naturally: "आज कितना बिका?", "Low stock items", "Rahul ka udhaar"
            </p>
          </div>

          {/* Body Content */}
          <div className="p-3.5 flex-1 overflow-y-auto no-scrollbar space-y-3">

            {/* Mic error notice */}
            {micError && (
              <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl p-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                <p>{micError}</p>
              </div>
            )}

            {/* Listening Waveform State */}
            {isListening && (
              <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl text-center space-y-3">
                <div className="flex items-center justify-center gap-1.5 h-10">
                  {[0.4, 0.8, 1.2, 0.6, 1.0, 0.5, 0.9, 0.3].map((delay, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-indigo-600 rounded-full animate-bounce"
                      style={{ height: `${20 + (i % 4) * 8}px`, animationDelay: `${delay * 0.15}s` }}
                    />
                  ))}
                </div>
                <p className="text-xs font-bold text-app-text">
                  Listening in {language === 'hi-IN' ? 'Hindi / Hinglish' : 'English'}...
                </p>
                <span className="text-[10px] text-app-text-muted">Speak now, then pause to evaluate</span>
              </div>
            )}

            {/* Thinking Loader */}
            {isLoading && (
              <div className="flex items-center gap-3 py-8 justify-center text-xs text-app-text font-bold">
                <Loader2 size={20} className="animate-spin text-app-primary" />
                <span>Evaluating verified store ledgers...</span>
              </div>
            )}

            {/* Result View */}
            {result && !isLoading && !isListening && (
              <div className="space-y-3">
                {result.intent && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] font-black bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded-full uppercase">
                      {intentIcon[result.intent] || <Sparkles size={10} />} {result.intent?.replace(/_/g, ' ')}
                    </span>
                    {result.period && (
                      <span className="text-[10px] font-bold bg-app-surface-subtle text-app-text-secondary px-2 py-0.5 rounded-full">
                        {result.period?.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                )}

                <div className={`text-xs leading-relaxed rounded-xl p-3.5 flex gap-2 border ${
                  result.success === false 
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200' 
                    : 'bg-app-surface-subtle border-app-border text-app-text'
                }`}>
                  {result.isNetworkError && <WifiOff size={14} className="text-rose-500 shrink-0 mt-0.5" />}
                  <span className="font-medium whitespace-pre-wrap">{result.summary}</span>
                </div>

                {/* Supporting Chart/Data */}
                {result.success !== false && result.data && (
                  <ResultChart type={result.intent} data={result.data} />
                )}

                {/* Safe Action Confirmation Box */}
                {pendingAction && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Suggested Action Guard</span>
                    </div>
                    <p className="text-app-text font-semibold">{pendingAction.title}</p>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPendingAction(null)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-app-text-muted hover:text-app-text"
                      >
                        Dismiss
                      </button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setIsOpen(false);
                          navigate(pendingAction.path);
                        }}
                        icon={<ArrowRight size={12} />}
                        className="text-[11px] font-bold py-1"
                      >
                        {pendingAction.buttonLabel}
                      </Button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setResult(null); setShowQuickQueries(true); setPendingAction(null); }}
                  className="text-[11px] text-app-primary font-bold flex items-center gap-1 hover:underline cursor-pointer pt-1"
                >
                  <RotateCcw size={12} /> Ask another business question
                </button>
              </div>
            )}

            {/* Quick Queries & Recent History */}
            {showQuickQueries && !result && !isLoading && !isListening && (
              <div className="space-y-3">
                {recentQueries.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider block mb-1.5">
                      Recent Voice Questions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {recentQueries.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleQuerySubmit(q)}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-app-surface-subtle border border-app-border text-app-text hover:border-app-primary transition-colors cursor-pointer truncate max-w-full text-left"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold text-app-text-muted uppercase tracking-wider block mb-1.5">
                    Suggested Questions
                  </span>
                  <div className="space-y-1.5">
                    {QUICK_QUERIES.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleQuerySubmit(q)}
                        className="w-full text-left text-xs font-medium text-app-text hover:text-app-primary bg-app-surface-subtle hover:bg-app-primary/5 px-3 py-2 rounded-xl border border-app-border transition-colors cursor-pointer flex justify-between items-center group"
                      >
                        <span className="truncate">{q}</span>
                        <ArrowRight size={12} className="text-app-text-muted group-hover:text-app-primary transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Voice & Text Input Bar */}
          <div className="border-t border-app-border p-3 bg-app-surface-subtle">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-40 ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                    : 'bg-app-primary text-white shadow-md shadow-app-primary/20 hover:scale-105 active:scale-95'
                }`}
                title={isListening ? 'Click to stop listening' : 'Click to speak in Hindi/English'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isLoading && query.trim() && handleQuerySubmit(query)}
                placeholder={isListening ? "Listening now..." : "Speak or type query..."}
                className="flex-1 text-xs bg-app-surface border border-app-border rounded-xl px-3 py-2 text-app-text placeholder:text-app-text-muted focus:outline-none focus:border-app-primary"
                disabled={isLoading || isListening}
              />

              <button
                type="button"
                onClick={() => handleQuerySubmit(query)}
                disabled={isLoading || !query.trim()}
                className="w-10 h-10 rounded-xl bg-app-surface border border-app-border text-app-primary hover:bg-app-primary hover:text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="text-[10px] text-app-text-muted text-center mt-2 font-medium">
              KaroBar Voice AI • Strictly grounded in your verified store records
            </p>
          </div>
        </div>
      )}
    </>
  );
}
