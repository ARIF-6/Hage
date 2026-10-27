import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, TrendingUp, TrendingDown, BarChart2,
  Send, Bot, RefreshCw, Loader2, Brain, AlertTriangle,
  CheckCircle2, XCircle, Zap, Target
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Bar
} from 'recharts';
import { useTradeStore } from '../../store/useTradeStore';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface AiMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface ChartInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  label: string;
  value: string;
}

/* ------------------------------------------------------------------ */
/*  AI Insight generator (local, pattern-based)                         */
/* ------------------------------------------------------------------ */
function generateAiAnalysis(trades: any[], question: string): string {
  const total = trades.length;
  if (total === 0) {
    return "I don't see any trades in your account yet. Log your first trade and I'll analyse your performance patterns, drawdown exposure, win rate trends, and psychological tendencies.";
  }

  const wins = trades.filter(t => (t.pnl ?? 0) > 0);
  const losses = trades.filter(t => (t.pnl ?? 0) < 0);
  const winRate = total > 0 ? ((wins.length / total) * 100).toFixed(1) : '0';
  const netPnL = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;
  const rr = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A';

  const q = question.toLowerCase();

  if (q.includes('drawdown') || q.includes('risk')) {
    const runningPnL: number[] = [];
    let running = 0;
    let peak = 0;
    let maxDD = 0;
    for (const t of trades) {
      running += t.pnl ?? 0;
      runningPnL.push(running);
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    }
    return `📉 **Drawdown Analysis**\n\nYour maximum drawdown was **$${maxDD.toFixed(2)}** across ${total} trades.\n\n**Observations:**\n• Win rate: ${winRate}% — ${parseFloat(winRate) >= 50 ? 'above the 50% threshold' : 'below breakeven threshold, requires strong R:R to compensate'}\n• Average risk-reward: ${rr} — ${parseFloat(rr) >= 1.5 ? 'healthy ratio' : 'needs improvement, target ≥ 1.5R'}\n• Net P&L: ${netPnL >= 0 ? '+' : ''}$${netPnL.toFixed(2)}\n\n**Recommendation:** ${maxDD > 3000 ? 'Your drawdown exposure is significant. Consider reducing position sizes by 20-30% until you achieve 3 consecutive profitable days.' : 'Your drawdown control is within acceptable range. Keep risk per trade below 2% of account.'}`;
  }

  if (q.includes('win rate') || q.includes('winrate') || q.includes('performance')) {
    return `📊 **Performance Analysis**\n\nWith **${total} trades** analysed:\n\n• **Win Rate:** ${winRate}%\n• **Avg Win:** +$${avgWin.toFixed(2)}\n• **Avg Loss:** -$${avgLoss.toFixed(2)}\n• **Risk-Reward:** ${rr}\n• **Net P&L:** ${netPnL >= 0 ? '+' : ''}$${netPnL.toFixed(2)}\n\n**AI Assessment:** ${parseFloat(winRate) >= 55 ? `Your win rate of ${winRate}% is excellent. With a ${rr}:1 R:R, your expectancy is strongly positive. Focus on consistency and scaling up gradually.` : parseFloat(winRate) >= 45 ? `Win rate of ${winRate}% is decent. Your edge comes from the ${rr}:1 R:R. Ensure you're not revenge-trading after losses.` : `Win rate of ${winRate}% means you need a high R:R to be profitable. Current ${rr}:1 ratio ${parseFloat(rr) >= 2 ? 'covers this well' : 'needs improvement — target ≥ 2.5R for this win rate'}.`}`;
  }

  if (q.includes('pattern') || q.includes('trend') || q.includes('best') || q.includes('worst')) {
    const recent5 = trades.slice(-5);
    const recent5Pnl = recent5.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const bestTrade = [...trades].sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0))[0];
    const worstTrade = [...trades].sort((a, b) => (a.pnl ?? 0) - (b.pnl ?? 0))[0];
    return `📈 **Pattern Analysis**\n\n**Recent 5 Trades P&L:** ${recent5Pnl >= 0 ? '+' : ''}$${recent5Pnl.toFixed(2)} — ${recent5Pnl >= 0 ? 'on a positive streak' : 'in a drawdown phase'}\n\n**Best Trade:** +$${(bestTrade?.pnl ?? 0).toFixed(2)} (${bestTrade?.symbol ?? 'N/A'})\n**Worst Trade:** $${(worstTrade?.pnl ?? 0).toFixed(2)} (${worstTrade?.symbol ?? 'N/A'})\n\n**Trend Insight:** ${recent5Pnl >= 0 ? 'Your recent trades show positive momentum. This is a good time to maintain discipline — avoid overconfidence and stick to your process.' : 'Recent trades are in negative territory. Consider taking a step back, reviewing your last 5 setups and identifying any execution errors before resuming.'}`;
  }

  if (q.includes('improve') || q.includes('advice') || q.includes('suggest') || q.includes('help')) {
    return `🎯 **AI Improvement Recommendations**\n\nBased on your ${total} trades:\n\n1. **Win Rate (${winRate}%)** — ${parseFloat(winRate) >= 50 ? '✅ Good' : '⚠️ Below 50%'}\n   ${parseFloat(winRate) < 50 ? '→ Raise your entry standard. Only trade A+ setups at key HTF levels.' : '→ Maintain your current entry criteria.'}\n\n2. **Risk-Reward (${rr})** — ${parseFloat(rr) >= 1.5 ? '✅ Healthy' : '⚠️ Needs work'}\n   ${parseFloat(rr) < 1.5 ? '→ Stop cutting winners early. Let trades run to target.' : '→ Keep letting your winners run.'}\n\n3. **Consistency** — ${total >= 30 ? '✅ Good sample size' : '⚠️ Need more trades'}\n   ${total < 30 ? '→ You need at least 30 trades to measure your edge reliably.' : '→ Your edge is measurable. Focus on process, not P&L.'}\n\n4. **Mindset:** Journal every trade with emotional state. Pattern-matching your psychology to outcomes is the fastest path to improvement.`;
  }

  // Default
  return `🤖 **AI Chart Analysis — ${total} Trades**\n\n**Summary:**\n• Win Rate: **${winRate}%** (${wins.length}W / ${losses.length}L)\n• Net P&L: **${netPnL >= 0 ? '+' : ''}$${netPnL.toFixed(2)}**\n• Risk-Reward: **${rr}**\n• Avg Win: +$${avgWin.toFixed(2)} | Avg Loss: -$${avgLoss.toFixed(2)}\n\n**What I can analyse for you:**\n→ Ask about **drawdown**, **win rate**, **patterns**, **best/worst trades**, or **how to improve**\n\nType a question below and I'll give you a detailed analysis of your chart!`;
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                       */
/* ------------------------------------------------------------------ */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="bg-white dark:bg-[#1a1e30] border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl px-3 py-2 text-xs">
      <p className="text-gray-500 dark:text-slate-400 font-mono mb-1">{label}</p>
      <p className={`font-bold text-sm ${val >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
        {val >= 0 ? '+' : ''}${typeof val === 'number' ? val.toFixed(2) : val}
      </p>
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                      */
/* ================================================================== */
export function AiChartAnalysis() {
  const { trades } = useTradeStore();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chartView, setChartView] = useState<'equity' | 'daily'>('equity');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* -- Initial greeting -- */
  useEffect(() => {
    const welcomeMsg: AiMessage = {
      id: 'welcome',
      role: 'ai',
      text: trades.length > 0
        ? `Hello! 👋 I've analysed your **${trades.length} trades**. Ask me anything about your performance, drawdown, patterns, or how to improve.`
        : `Hello! 👋 I'm your AI chart analyst. Log your trades and I'll give you detailed AI-powered insights about your trading performance.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcomeMsg]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnalyzing]);

  /* -- Chart data -- */
  const equityCurveData = useMemo(() => {
    let running = 0;
    return trades.map((t, i) => {
      running += t.pnl ?? 0;
      const date = t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `T${i + 1}`;
      return { name: date, equity: parseFloat(running.toFixed(2)), trade: i + 1 };
    });
  }, [trades]);

  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach(t => {
      const date = t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown';
      map[date] = (map[date] || 0) + (t.pnl ?? 0);
    });
    return Object.entries(map).map(([date, pnl]) => ({ name: date, pnl: parseFloat(pnl.toFixed(2)) }));
  }, [trades]);

  /* -- AI Insights chips -- */
  const insights: ChartInsight[] = useMemo(() => {
    if (trades.length === 0) return [];
    const wins = trades.filter(t => (t.pnl ?? 0) > 0);
    const losses = trades.filter(t => (t.pnl ?? 0) < 0);
    const winRate = (wins.length / trades.length) * 100;
    const netPnL = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 1;
    const rr = avgWin / avgLoss;

    const result: ChartInsight[] = [
      {
        type: winRate >= 50 ? 'positive' : 'negative',
        label: 'Win Rate',
        value: `${winRate.toFixed(1)}%`
      },
      {
        type: netPnL >= 0 ? 'positive' : 'negative',
        label: 'Net P&L',
        value: `${netPnL >= 0 ? '+' : ''}$${netPnL.toFixed(2)}`
      },
      {
        type: rr >= 1.5 ? 'positive' : rr >= 1 ? 'neutral' : 'warning',
        label: 'Risk-Reward',
        value: `${rr.toFixed(2)}:1`
      },
      {
        type: trades.length >= 30 ? 'positive' : 'neutral',
        label: 'Sample Size',
        value: `${trades.length} trades`
      },
    ];
    return result;
  }, [trades]);

  /* -- send -- */
  const handleSend = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || isAnalyzing) return;

    const userMsg: AiMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    if (!text) setInput('');
    setIsAnalyzing(true);

    // Simulate thinking delay
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));

    const aiReply = generateAiAnalysis(trades, q);
    setMessages(prev => [
      ...prev,
      {
        id: `ai_${Date.now()}`,
        role: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setIsAnalyzing(false);
  };

  const insightIcon = (type: ChartInsight['type']) => {
    switch (type) {
      case 'positive': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'negative': return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      default: return <Zap className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const insightColors: Record<ChartInsight['type'], string> = {
    positive: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    negative: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    neutral: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
  };

  const QUICK_QUESTIONS = [
    'Analyse my drawdown',
    'What is my win rate trend?',
    'Show me my best/worst patterns',
    'How can I improve?',
  ];

  const chartColor = equityCurveData.length > 0 && equityCurveData[equityCurveData.length - 1]?.equity >= 0 ? '#10b981' : '#f43f5e';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 min-h-[600px]">

      {/* ── LEFT: Chart Panel ── */}
      <div className="flex flex-col gap-4">

        {/* Chart header with view toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">AI Chart Analysis</h3>
              <p className="text-[10.5px] text-gray-400 dark:text-slate-500">
                {trades.length > 0 ? `Based on ${trades.length} trades` : 'Log trades to unlock AI insights'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-[#182030] border border-gray-200/80 dark:border-slate-700/60">
            <button
              onClick={() => setChartView('equity')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                chartView === 'equity' ? 'bg-white dark:bg-[#1E293B] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'
              }`}
            >
              Equity
            </button>
            <button
              onClick={() => setChartView('daily')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                chartView === 'daily' ? 'bg-white dark:bg-[#1E293B] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'
              }`}
            >
              Daily P&L
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-[#111722]/80 rounded-2xl border border-gray-200/80 dark:border-[#1E293B] p-4 shadow-sm">
          {trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 opacity-50">
              <BarChart2 className="w-10 h-10 text-gray-400" />
              <p className="text-gray-500 dark:text-slate-400 text-sm font-semibold">No trades yet</p>
              <p className="text-gray-400 dark:text-slate-500 text-xs">Add trades to see your AI chart</p>
            </div>
          ) : chartView === 'equity' ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={equityCurveData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="aiEquityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="equity" stroke={chartColor} strokeWidth={2} fill="url(#aiEquityGrad)" dot={false} activeDot={{ r: 4, fill: chartColor }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={dailyData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" />
                <Bar
                  dataKey="pnl"
                  radius={[3, 3, 0, 0]}
                  fill="#10b981"
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* AI Insight chips */}
        {insights.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {insights.map((ins, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${insightColors[ins.type]}`}
              >
                {insightIcon(ins.type)}
                <div>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider opacity-70">{ins.label}</p>
                  <p className="text-sm font-black">{ins.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT: AI Chat Panel ── */}
      <div className="flex flex-col bg-white dark:bg-[#111722]/80 rounded-2xl border border-gray-200/80 dark:border-[#1E293B] shadow-sm overflow-hidden">

        {/* AI Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm relative">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-[#111722]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">HAGE AI Analyst</h3>
              <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online · Analysing your chart
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setMessages([{
                id: 'reset',
                role: 'ai',
                text: `Chat cleared. I've analysed your **${trades.length} trades** — ask me anything!`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }]);
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#182030] transition-colors cursor-pointer"
            title="Clear chat"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-[280px] max-h-[340px]" style={{ background: 'transparent' }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'ai' && (
                  <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 border border-violet-500/20 mb-0.5">
                    <Brain className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-50 dark:bg-[#182030] text-gray-800 dark:text-slate-200 border border-gray-200/80 dark:border-slate-700/60 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i} className={line.startsWith('**') && line.endsWith('**') ? 'font-bold' : ''}>
                        {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                      </p>
                    ))}
                  </div>
                  <span className={`block text-[9px] mt-1 font-mono ${msg.role === 'user' ? 'text-blue-100 text-right' : 'text-gray-400 dark:text-slate-500'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isAnalyzing && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <Brain className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-gray-200/80 dark:border-slate-700/60 bg-gray-50 dark:bg-[#182030] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" />
                <span className="text-[10px] text-gray-400 ml-1">Analysing chart…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick question chips */}
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              disabled={isAnalyzing}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/20 transition-all cursor-pointer disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-[#1E293B]">
          <form
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isAnalyzing}
              placeholder="Ask about your chart, risk, patterns…"
              className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#182030] disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isAnalyzing}
              className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-all cursor-pointer"
            >
              {isAnalyzing
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
