import { useState, useRef, useEffect, useCallback } from 'react';
import API from '../services/apiClient';
import {
  Mic, MicOff, Send, X, Loader2,
  Bot, TrendingUp, PieChart as PieChartIcon, List, BarChart2 as BarChartIcon, ChevronUp,
  AlertCircle, WifiOff
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart,
  Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip
} from 'recharts';
import logoImg from '../assets/logo.svg';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const QUICK_QUERIES = [
  "Aaj kitna bika?",
  "Is mahine ka profit batao",
  "Kaunsa product best sell ho raha hai?",
  "Total outstanding balance kitna hai?",
  "Low stock items kaun se hain?",
];

function ResultChart({ type, data }) {
  if (!data || !type) return null;

  if (type === 'SALES_SUMMARY' && data.trend?.length > 0) {
    return (
      <div className="mt-3 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.trend} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
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
      <div className="mt-3 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.topProducts} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
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
      <div className="mt-3 h-32">
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
      <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto">
        {data.lowStock.map((item, i) => (
          <div key={i} className="flex justify-between items-center py-1 px-2 bg-orange-50 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-700">{item.name}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
              {item.stock === 0 ? 'OUT' : `${item.stock} left`}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'CUSTOMER_BALANCE' && data.perCustomer && Object.keys(data.perCustomer).length > 0) {
    return (
      <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto">
        {Object.entries(data.perCustomer).slice(0, 5).map(([name, amt], i) => (
          <div key={i} className="flex justify-between items-center py-1 px-2 bg-rose-50 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-700">{name}</span>
            <span className="text-[11px] font-black text-rose-600">₹{Number(amt).toLocaleString('en-IN')}</span>
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
  CUSTOMER_BALANCE: <List size={12} />,
  INVENTORY_CHECK:  <List size={12} />,
  PROFIT_REPORT:    <TrendingUp size={12} />,
  STAFF_SALARY:     <List size={12} />,
};

export default function FinVoiceWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showQuickQueries, setShowQuickQueries] = useState(true);
  const [micError, setMicError] = useState(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  // ── Ref trick: always stores the latest handleQuerySubmit ──────────────────
  const submitRef = useRef(null);

  // ── Core submit — defined with useCallback so it's stable ─────────────────
  const handleQuerySubmit = useCallback(async (queryText) => {
    const q = (typeof queryText === 'string' ? queryText : query).trim();
    if (!q) return;

    setIsLoading(true);
    setShowQuickQueries(false);
    setResult(null);

    try {
      const res = await API.post('/ai/query', { query: q });
      setResult(res.data);
    } catch (err) {
      const serverMsg = err.response?.data?.summary || err.response?.data?.error;
      const networkErr = !err.response;
      setResult({
        success: false,
        summary: networkErr
          ? "Cannot reach backend. Is the server running on port 5001?"
          : (serverMsg || `Server error ${err.response?.status || ''}: ${err.message}`),
        isNetworkError: networkErr,
      });
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  }, [query]);

  // Keep ref always pointing to the latest version
  submitRef.current = handleQuerySubmit;

  // ── Web Speech API setup ───────────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError('Your browser does not support voice input. Use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = 'hi-IN';

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setIsListening(false);
      // Use ref so we always call the latest version (avoids stale closure)
      submitRef.current(transcript);
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') {
        setMicError('Microphone permission denied. Allow mic access in browser settings.');
      } else if (e.error === 'no-speech') {
        setMicError('No speech detected. Try again.');
        setTimeout(() => setMicError(null), 3000);
      } else {
        setMicError(`Mic error: ${e.error}`);
        setTimeout(() => setMicError(null), 3000);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []); // runs once — safe because we use submitRef.current inside

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
      } catch (e) {
        // Recognition already started — stop and restart
        recognitionRef.current.stop();
        setTimeout(() => {
          try { recognitionRef.current.start(); setIsListening(true); } catch {}
        }, 200);
      }
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        id="finvoice-fab"
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-2xl shadow-indigo-500/40 hover:scale-110 hover:shadow-indigo-500/60 transition-all duration-200 flex items-center justify-center overflow-hidden"
        title="FinVoice AI — Ask your business anything"
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <img src={logoImg} alt="FinSathi" className="w-8 h-8 object-contain" />
        )}
      </button>

      {/* Slide-up panel */}
      {isOpen && (
        <div className="fixed bottom-[calc(6rem+3.5rem)] right-6 z-50 w-[340px] bg-white rounded-2xl shadow-2xl shadow-indigo-200/50 border border-slate-100 overflow-hidden animate-slide-up">

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoImg} alt="FinSathi" className="w-full h-full object-contain p-0.5" />
              </div>
              <span className="font-black text-sm tracking-tight">FinVoice AI</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black">BETA</span>
            </div>
            <p className="text-[11px] text-indigo-200 mt-0.5">
              Hindi, Hinglish, or English — ask anything about your business
            </p>
          </div>

          {/* Content */}
          <div className="p-3 max-h-[380px] overflow-y-auto no-scrollbar">

            {/* Mic error */}
            {micError && (
              <div className="mb-2 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <AlertCircle size={13} className="text-rose-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-rose-700">{micError}</p>
              </div>
            )}

            {/* Quick queries */}
            {showQuickQueries && !result && !isLoading && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quick queries</p>
                <div className="space-y-1.5">
                  {QUICK_QUERIES.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuerySubmit(q)}
                      className="w-full text-left text-[12px] font-medium text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center gap-3 py-6 justify-center">
                <Loader2 size={20} className="animate-spin text-indigo-600" />
                <span className="text-sm text-slate-500 font-medium">Thinking...</span>
              </div>
            )}

            {/* Listening indicator */}
            {isListening && (
              <div className="flex items-center gap-2 py-4 justify-center">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 bg-rose-500 rounded-full animate-bounce" style={{ height: 16 + i * 8, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <span className="text-sm text-slate-600 font-medium">Listening in Hindi...</span>
              </div>
            )}

            {/* Result */}
            {result && !isLoading && (
              <div>
                {result.intent && (
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                      {intentIcon[result.intent]} {result.intent?.replace(/_/g, ' ')}
                    </span>
                    {result.period && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {result.period?.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                )}

                <div className={`text-sm leading-relaxed rounded-xl p-3 flex gap-2 ${result.success === false ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-slate-800'}`}>
                  {result.isNetworkError && <WifiOff size={14} className="text-rose-500 shrink-0 mt-0.5" />}
                  <span>{result.summary}</span>
                </div>

                {result.success !== false && result.data && (
                  <ResultChart type={result.intent} data={result.data} />
                )}

                <button
                  onClick={() => { setResult(null); setShowQuickQueries(true); }}
                  className="text-[11px] text-indigo-500 font-bold mt-3 flex items-center gap-1 hover:text-indigo-700"
                >
                  <ChevronUp size={12} /> Ask another question
                </button>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="border-t border-slate-100 p-3">
            <div className="flex gap-2">
              <button
                onClick={toggleListening}
                disabled={isLoading}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 animate-pulse'
                    : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                }`}
                title={isListening ? 'Stop (click to cancel)' : 'Speak in Hindi / English'}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isLoading && query.trim() && handleQuerySubmit(query)}
                placeholder="Type or speak your query..."
                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
                disabled={isLoading || isListening}
              />

              <button
                onClick={() => handleQuerySubmit(query)}
                disabled={isLoading || !query.trim()}
                className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Powered by Gemini AI · Your data never leaves your account
            </p>
          </div>
        </div>
      )}
    </>
  );
}
