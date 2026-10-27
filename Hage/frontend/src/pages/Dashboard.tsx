import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, PlusCircle, ArrowRight } from 'lucide-react';
import { 
  NetPnLCard, 
  WinRateCard, 
  AvgWinLossCard, 
  ProfitFactorCard, 
  StreakCard 
} from '../components/dashboard/StatCard';
import { CumulativePnLChart, TraderScoreWidget } from '../components/dashboard/PerformanceCharts';
import { DashboardCalendar } from '../components/dashboard/DashboardCalendar';
import { CompactActiveAccountCard } from '../components/dashboard/CompactActiveAccountCard';
import { useTradeStore, switchActiveUser } from '../store/useTradeStore';
import { format } from 'date-fns';

export default function Dashboard() {
  const { trades, campaigns, activeCampaignId } = useTradeStore();
  const [userName, setUserName] = useState<string>('Trader');

  useEffect(() => {
    switchActiveUser();
    const first = localStorage.getItem('profile_firstName') || '';
    const last = localStorage.getItem('profile_lastName') || '';
    const name = (first + ' ' + last).trim() || 'Trader';
    setUserName(name);
  }, []);

  const activeId = activeCampaignId || (campaigns.length > 0 ? campaigns[0].id : null);

  // Filter trades for metrics
  const activeTrades = useMemo(() => {
    if (!activeId) return trades;
    return trades.filter(t => t.campaignId === activeId);
  }, [trades, activeId]);

  // Calculations
  const totalTrades = activeTrades.length;
  const totalProfit = activeTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const winningTrades = activeTrades.filter(t => t.result === 'Win');
  const losingTrades = activeTrades.filter(t => t.result === 'Loss');
  const winCount = winningTrades.length;
  const lossCount = losingTrades.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  
  const totalWonAmount = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLostAmount = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLostAmount > 0 ? (totalWonAmount / totalLostAmount) : (totalWonAmount > 0 ? totalWonAmount : 0);

  const avgWin = winCount > 0 ? totalWonAmount / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLostAmount / lossCount : 0;
  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? avgWin : 0;
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysTrades = activeTrades.filter(t => {
    try {
      return format(new Date(t.date), 'yyyy-MM-dd') === todayStr;
    } catch {
      return t.date.startsWith(todayStr);
    }
  });
  const todayPnL = todaysTrades.reduce((sum, t) => sum + t.pnl, 0);

  return (
    <div className="max-w-[1680px] mx-auto w-full min-w-0 space-y-4 sm:space-y-5 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-4 sm:space-y-5 w-full min-w-0"
      >
        {/* Onboarding Welcome Banner for New User (0 Accounts) */}
        {campaigns.length === 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-purple-600/10 border border-blue-500/20 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                  Welcome to your Personal Journal, {userName}!
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Your journal is fresh and ready. Connect your first trading account to begin logging trades and tracking metrics.
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Connect First Account</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        )}

        {/* 1. TOP KPI CARDS ROW (5 High-Density Cards Matching Reference) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 min-w-0">
          <NetPnLCard 
            value={totalProfit >= 0 ? `+$${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `-$${Math.abs(totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            rawValue={totalProfit}
          />
          <WinRateCard 
            winRate={winRate} 
            wins={winCount} 
            losses={lossCount} 
          />
          <AvgWinLossCard 
            ratio={avgWinLossRatio} 
            avgWin={avgWin} 
            avgLoss={avgLoss} 
          />
          <ProfitFactorCard 
            profitFactor={profitFactor} 
          />
          <div className="col-span-2 md:col-span-1 min-w-0">
            <StreakCard 
              totalTrades={totalTrades} 
              todayTrades={todaysTrades.length} 
              todayPnL={todayPnL} 
            />
          </div>
        </div>

        {/* 2. MAIN SECTION: Left Cumulative P&L + Radar | Right Monthly Calendar (Side-by-Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start min-w-0">
          
          {/* LEFT COLUMN: Chart + Trader Performance Radar */}
          <div className="min-w-0 lg:col-span-5 space-y-4 sm:space-y-5">
            {/* Daily Net Cumulative P&L Area Chart */}
            <CumulativePnLChart />

            {/* HAGE Performance Score & Radar Widget */}
            <TraderScoreWidget />
          </div>

          {/* RIGHT COLUMN: Compact Monthly Trading Calendar */}
          <div className="min-w-0 lg:col-span-7">
            <DashboardCalendar />
          </div>

        </div>

        {/* 3. ACTIVE ACCOUNT CARD (Compact Non-Full-Width Dashboard Card) */}
        <div className="flex items-start justify-start">
          <CompactActiveAccountCard />
        </div>

      </motion.div>
    </div>
  );
}
