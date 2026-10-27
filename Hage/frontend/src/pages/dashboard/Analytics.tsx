import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart2, Layers, Filter, TrendingUp, Clock, Globe,
  ShieldAlert, ArrowDownRight, Sun, Moon, Zap, Lock, Sparkles, ArrowRight, Brain
} from 'lucide-react';
import { useTradeStore } from '../../store/useTradeStore';
import { CumulativePnLChart, DailyPnLChart, TraderScoreWidget } from '../../components/dashboard/PerformanceCharts';
import { 
  calculateAnalytics, 
  PerformanceOverviewSection, 
  DirectionalBiasSection 
} from '../../components/analytics/AnalyticsComponents';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { canAccessAdvancedAnalytics, getUserPlan } from '../../store/subscriptionRules';
import { UpgradeModal } from '../../components/ui/UpgradeModal';
import { AiChartAnalysis } from '../../components/analytics/AiChartAnalysis';

type AnalyticsTab = 'performance' | 'behavior' | 'sessions' | 'ai';

export default function Analytics() {
  const { trades, campaigns, activeCampaignId } = useTradeStore();
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('active');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('performance');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const hasAdvancedAnalytics = canAccessAdvancedAnalytics();
  const userPlan = getUserPlan();

  // Determine which campaign or trades to analyze
  const activeId = activeCampaignId || (campaigns.length > 0 ? campaigns[0].id : null);
  const activeCampaign = campaigns.find(c => c.id === activeId);

  const effectiveCampaignId = selectedAccountId === 'active' ? activeId : selectedAccountId === 'all' ? null : selectedAccountId;
  const currentCampaign = campaigns.find(c => c.id === effectiveCampaignId) || (selectedAccountId === 'all' ? undefined : activeCampaign);

  // Filter trades based on selected account/campaign
  const filteredTrades = useMemo(() => {
    if (!effectiveCampaignId) return trades;
    return trades.filter(t => t.campaignId === effectiveCampaignId);
  }, [trades, effectiveCampaignId]);

  // Dynamically calculate starting balance
  const startingBalance = useMemo(() => {
    if (selectedAccountId === 'all') {
      if (campaigns.length > 0) {
        return campaigns.reduce((sum, c) => sum + (c.startingBalance || 100000), 0);
      }
      return 100000;
    }
    return currentCampaign?.startingBalance || 100000;
  }, [selectedAccountId, campaigns, currentCampaign]);

  // Dynamically calculate comprehensive analytics from REAL trade data
  const analyticsStats = useMemo(() => {
    return calculateAnalytics(filteredTrades, startingBalance);
  }, [filteredTrades, startingBalance]);

  // Current balance display
  const balanceDisplay = useMemo(() => {
    if (selectedAccountId === 'all') {
      if (campaigns.length > 0) {
        return campaigns.reduce((sum, c) => sum + (c.currentBalance || 100000), 0);
      }
      return startingBalance + analyticsStats.netPnL;
    }
    return currentCampaign?.currentBalance !== undefined 
      ? currentCampaign.currentBalance 
      : (startingBalance + analyticsStats.netPnL);
  }, [selectedAccountId, campaigns, currentCampaign, startingBalance, analyticsStats.netPnL]);

  // Helper for Session Icons
  const getSessionIcon = (id: string) => {
    switch (id) {
      case 'asia': return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'london': return <Sun className="w-4 h-4 text-amber-500" />;
      case 'ny': return <Globe className="w-4 h-4 text-blue-500" />;
      case 'overlap': return <Zap className="w-4 h-4 text-emerald-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-[1680px] mx-auto w-full min-w-0 space-y-6 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 w-full min-w-0"
      >
        
        {/* Top Header & Account Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <BarChart2 className="w-7 h-7 text-primary dark:text-blue-400" />
                {hasAdvancedAnalytics ? 'Advanced Analytics' : 'Analytics'}
              </h1>
              {userPlan === 'Free' ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                    Basic Tier
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Unlock Pro</span>
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Pro Active
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              {hasAdvancedAnalytics
                ? 'Clean, professional breakdown of your trading performance, behavior, and session edge.'
                : 'Basic performance overview. Upgrade to Pro for deep behavioral and session analytics.'}
            </p>
          </div>

          {/* Account Filter Selection & Balance Badge */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-[#182030] border border-gray-200 dark:border-slate-700/60 text-xs font-semibold text-gray-700 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-blue-500" />
              <span>Account:</span>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-transparent font-bold text-gray-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="active" className="dark:bg-[#111722]">
                  {activeCampaign ? `${activeCampaign.name} (${activeCampaign.phase})` : 'Active Account'}
                </option>
                <option value="all" className="dark:bg-[#111722]">All Accounts ({trades.length} trades)</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id} className="dark:bg-[#111722]">
                    {c.name} ({c.phase})
                  </option>
                ))}
              </select>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200/60 dark:border-blue-800/60">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Balance: ${balanceDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 4 Main Clickable Analytics Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-1.5 rounded-2xl bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          {/* Tab 1: PERFORMANCE */}
          <button
            id="tab-performance"
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer ${
              activeTab === 'performance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-[#182030]'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>PERFORMANCE</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              activeTab === 'performance' ? 'bg-white/20 text-white' : 'bg-gray-200/60 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}>{analyticsStats.winRate}%</span>
          </button>

          {/* Tab 2: TRADING BEHAVIOR */}
          <button
            id="tab-trading-behavior"
            type="button"
            onClick={() => setActiveTab('behavior')}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer ${
              activeTab === 'behavior'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-[#182030]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>BEHAVIOR</span>
              {!hasAdvancedAnalytics && <Lock className="w-3 h-3 text-amber-500" />}
            </div>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              activeTab === 'behavior' ? 'bg-white/20 text-white' : 'bg-gray-200/60 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}>{hasAdvancedAnalytics ? 'Pro' : 'Pro'}</span>
          </button>

          {/* Tab 3: SESSIONS */}
          <button
            id="tab-sessions"
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-[#182030]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>SESSIONS</span>
              {!hasAdvancedAnalytics && <Lock className="w-3 h-3 text-amber-500" />}
            </div>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              activeTab === 'sessions' ? 'bg-white/20 text-white' : 'bg-gray-200/60 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}>{hasAdvancedAnalytics ? '4' : 'Pro'}</span>
          </button>

          {/* Tab 4: AI CHART */}
          <button
            id="tab-ai-chart"
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-[#182030]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span>AI CHART</span>
            </div>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              activeTab === 'ai' ? 'bg-white/20 text-white' : 'bg-violet-500/10 text-violet-500 dark:text-violet-400'
            }`}>AI</span>
          </button>
        </div>

        {/* Tab Content Rendering */}
        <AnimatePresence mode="wait">
          {/* TAB 1: PERFORMANCE (Only essential performance metrics & equity curve) */}
          {activeTab === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* 1. Core Performance Overview Metrics (Net P&L, Win Rate, Total Trades, Profit Factor, Avg Win, Avg Loss, Expectancy) */}
              <PerformanceOverviewSection stats={analyticsStats} />

              {/* 2. Equity Curve & Daily P&L Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6 min-w-0">
                {/* Equity Curve (Cumulative P&L Chart) */}
                <div className="min-w-0">
                  <CumulativePnLChart trades={filteredTrades} campaign={currentCampaign} />
                </div>

                {/* Daily P&L Bar Chart */}
                <div className="min-w-0">
                  <DailyPnLChart trades={filteredTrades} />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: TRADING BEHAVIOR (Risk per Trade, Risk/Reward, Max DD, Trades/Day, Long vs Short, Discipline/HAGE Score) */}
          {activeTab === 'behavior' && (!hasAdvancedAnalytics ? (
            <motion.div
              key="behavior-locked"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 sm:p-12 text-center bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-[#1E293B] space-y-5 shadow-xs"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shadow-md shadow-blue-500/10">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
                  Pro Feature: Advanced Analytics
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  Trading Behavior &amp; Trader Score
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Average risk per trade, risk/reward discipline, directional long vs short ratio, holding times, and psychological trade insights are included with the <strong>Pro</strong> plan.
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upgrade to Pro</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="behavior"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Top 4 Core Behavior KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* 1. Risk per Trade */}
                <Card className="hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Risk per Trade</span>
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      {analyticsStats.avgRiskPercent}%
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-[#1E293B]">
                      <span>Max: <strong className="text-gray-700 dark:text-slate-200">{analyticsStats.maxRiskPercent}%</strong></span>
                      <span className="text-emerald-500 font-semibold">Target ≤ 2.0%</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Risk / Reward */}
                <Card className="hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Risk / Reward</span>
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      {analyticsStats.avgWinLossRatio > 0 ? analyticsStats.avgWinLossRatio.toFixed(2) : '0.00'} : 1
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-[#1E293B]">
                      <span>Avg R: <strong className="text-purple-500">{analyticsStats.avgR >= 0 ? '+' : ''}{analyticsStats.avgR}R</strong></span>
                      <span className="text-gray-500 dark:text-slate-300">{analyticsStats.rrDisciplinePct}% ≥ 1.5R</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Max Drawdown */}
                <Card className="hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Max Drawdown</span>
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                        <ArrowDownRight className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                      -${analyticsStats.maxDrawdownDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-[#1E293B]">
                      <span>Peak DD: <strong className="text-rose-500">{analyticsStats.maxDrawdownPercent.toFixed(2)}%</strong></span>
                      <span>Current: <strong className="text-gray-700 dark:text-slate-200">{analyticsStats.currentDrawdownPercent.toFixed(2)}%</strong></span>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Average Trades per Day */}
                <Card className="hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Avg Trades / Day</span>
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      {analyticsStats.tradesPerDay}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-[#1E293B]">
                      <span>Active Days: <strong className="text-gray-700 dark:text-slate-200">{analyticsStats.activeDaysCount}</strong></span>
                      <span className="text-indigo-500 font-semibold">{analyticsStats.targetDisciplinePct}% disciplined</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 5. Discipline / HAGE Score & 6. Long vs Short */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
                {/* Discipline / HAGE Score Widget */}
                <div className="min-w-0">
                  <TraderScoreWidget trades={filteredTrades} startingBalance={startingBalance} />
                </div>

                {/* Long vs Short (Directional Bias) */}
                <div className="min-w-0">
                  <DirectionalBiasSection stats={analyticsStats} />
                </div>
              </div>
            </motion.div>
          ))}

          {/* TAB 3: SESSIONS (Only London, New York, Asia, London / NY Overlap with Trades, Win Rate, Net P&L, Avg R) */}
          {activeTab === 'sessions' && (!hasAdvancedAnalytics ? (
            <motion.div
              key="sessions-locked"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 sm:p-12 text-center bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-[#1E293B] space-y-5 shadow-xs"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20 shadow-md shadow-indigo-500/10">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                  Pro Feature: Advanced Analytics
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  Sessions Edge &amp; Market Timing
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Discover which market hours you excel in: compare Win Rate, Average R, and Net P&amp;L across London, New York, Asia, and overlap sessions with the <strong>Pro</strong> plan.
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upgrade to Pro</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sessions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* 4 Session Performance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {analyticsStats.sessions.map((session, idx) => {
                  const isProfitable = session.pnl >= 0;
                  return (
                    <Card key={idx} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4 sm:p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-gray-100 dark:bg-[#182030] text-blue-600 dark:text-blue-400 border border-gray-200/60 dark:border-slate-800">
                              {getSessionIcon(session.id)}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{session.name.replace(' Session', '')}</h4>
                              <p className="text-[11px] text-gray-400 font-medium">{session.hours}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-600 dark:text-slate-300 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-700/50">
                            {session.trades} {session.trades === 1 ? 'Trade' : 'Trades'}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-[#1E293B] grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Net P&L</p>
                            <p className={`text-base sm:text-lg font-black tracking-tight ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {session.trades > 0 
                                ? `${isProfitable ? '+' : '-'}$${Math.abs(session.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                : '$0.00'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Win Rate</p>
                            <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                              {session.trades > 0 ? `${session.winRate}%` : '0%'}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-[#1E293B] flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-slate-400 font-medium">Average R</span>
                          <span className="font-extrabold text-purple-600 dark:text-purple-400">
                            {session.trades > 0 ? `${session.avgR >= 0 ? '+' : ''}${session.avgR}R` : '0R'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Sessions Performance Summary Comparison Table */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B] flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    Sessions Breakdown & Edge
                  </CardTitle>
                  <span className="text-xs text-gray-400 dark:text-slate-400">UTC Trading Windows</span>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-[#1E293B] text-gray-400 uppercase text-[10px] tracking-wider bg-gray-50/50 dark:bg-[#141B26]">
                        <th className="py-3 px-4 font-semibold">Session</th>
                        <th className="py-3 px-4 font-semibold text-center">Number of Trades</th>
                        <th className="py-3 px-4 font-semibold text-center">Win Rate</th>
                        <th className="py-3 px-4 font-semibold text-center">Average R</th>
                        <th className="py-3 px-4 font-semibold text-right">Net P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#1E293B]">
                      {analyticsStats.sessions.map((s, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-[#182030]/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                            {s.name.replace(' Session', '')}
                            <span className="text-[10px] text-gray-400 block font-normal font-mono">{s.hours}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-gray-700 dark:text-slate-300">
                            {s.trades}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                              s.trades > 0 && s.winRate >= 50 
                                ? 'bg-emerald-500/10 text-emerald-500' 
                                : s.trades > 0 
                                ? 'bg-rose-500/10 text-rose-500' 
                                : 'text-gray-400'
                            }`}>
                              {s.trades > 0 ? `${s.winRate}%` : '0%'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-purple-600 dark:text-purple-400">
                            {s.trades > 0 ? `${s.avgR >= 0 ? '+' : ''}${s.avgR}R` : '0R'}
                          </td>
                          <td className={`py-3 px-4 text-right font-black text-sm ${s.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {s.trades > 0 
                              ? `${s.pnl >= 0 ? '+' : '-'}$${Math.abs(s.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                              : '$0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {/* TAB 4: AI CHART */}
          {activeTab === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <AiChartAnalysis />
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        targetPlan="Pro"
        reason="Advanced Analytics is included in Pro & Premium memberships."
      />
    </div>
  );
}
