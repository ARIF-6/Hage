import { ShieldAlert, Crosshair, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useTradeStore, type Trade } from '../../store/useTradeStore';
import { useMemo } from 'react';
import { type AnalyticsStats, parseTradeDate } from '../analytics/AnalyticsComponents';
import { format } from 'date-fns';

interface RiskAndGoalsProps {
  trades?: Trade[];
  startingBalance?: number;
  stats?: AnalyticsStats;
}

export function RiskAndGoals({ trades: propsTrades, startingBalance = 100000, stats: propsStats }: RiskAndGoalsProps) {
  const store = useTradeStore();
  const trades = propsTrades !== undefined ? propsTrades : store.trades;

  const data = useMemo(() => {
    if (propsStats) {
      return {
        avgRisk: propsStats.avgRiskPercent,
        maxRisk: propsStats.maxRiskPercent,
        largestWin: propsStats.largestWin,
        largestLoss: propsStats.largestLoss,
        score: propsStats.disciplineScore,
        targetDisciplinePct: propsStats.targetDisciplinePct,
        maxDailyLossRespected: propsStats.maxDailyLossRespected,
        rrDisciplinePct: propsStats.rrDisciplinePct,
        tradesPerDay: propsStats.tradesPerDay,
        totalTrades: propsStats.totalTrades
      };
    }

    if (trades.length === 0) {
      return {
        avgRisk: 0,
        maxRisk: 0,
        largestWin: 0,
        largestLoss: 0,
        score: 'A+',
        targetDisciplinePct: 100,
        maxDailyLossRespected: true,
        rrDisciplinePct: 100,
        tradesPerDay: 0,
        totalTrades: 0
      };
    }

    const totalRisk = trades.reduce((sum, t) => sum + (t.risk || 0), 0);
    const avgRisk = totalRisk / trades.length;
    const maxRisk = Math.max(...trades.map(t => t.risk || 0));

    const wins = trades.filter(t => t.result === 'Win');
    const losses = trades.filter(t => t.result === 'Loss');

    const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
    const largestLoss = losses.length > 0 ? Math.abs(Math.min(...losses.map(t => t.pnl))) : 0;
    const avgLoss = losses.length > 0 ? largestLoss / losses.length : 0;

    // Day groups for daily loss & trades per day
    const dayGroups: Record<string, Trade[]> = {};
    trades.forEach(t => {
      const key = format(parseTradeDate(t.date), 'yyyy-MM-dd');
      if (!dayGroups[key]) dayGroups[key] = [];
      dayGroups[key].push(t);
    });

    const activeDaysCount = Object.keys(dayGroups).length || 1;
    const tradesPerDay = Number((trades.length / activeDaysCount).toFixed(1));

    const daysUnder3Trades = Object.values(dayGroups).filter(list => list.length <= 3).length;
    const targetDisciplinePct = Math.round((daysUnder3Trades / activeDaysCount) * 100);

    const maxAllowedDailyLoss = startingBalance * 0.05;
    const maxDailyLossRespected = Object.values(dayGroups).every(list => {
      const dayPnL = list.reduce((sum, t) => sum + t.pnl, 0);
      return dayPnL >= -maxAllowedDailyLoss;
    });

    const disciplinedWins = wins.filter(t => {
      if (t.rr && t.rr >= 1.5) return true;
      if (avgLoss > 0 && t.pnl >= avgLoss * 1.5) return true;
      return false;
    }).length;
    const rrDisciplinePct = wins.length > 0 ? Math.round((disciplinedWins / wins.length) * 100) : 100;

    let score = 'A';
    if (maxRisk > 3.5 || !maxDailyLossRespected) score = 'C+';
    else if (maxRisk > 2.5) score = 'B';
    else if (maxRisk > 2.0) score = 'B+';
    else if (avgRisk <= 1.5) score = 'A+';

    return {
      avgRisk: Number(avgRisk.toFixed(1)),
      maxRisk: Number(maxRisk.toFixed(1)),
      largestWin,
      largestLoss,
      score,
      targetDisciplinePct,
      maxDailyLossRespected,
      rrDisciplinePct,
      tradesPerDay,
      totalTrades: trades.length
    };
  }, [trades, propsStats, startingBalance]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      {/* Risk Management */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Risk Management
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-y-4 gap-x-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">Avg Risk / Trade</p>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white">{data.avgRisk}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">Max Risk / Trade</p>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white">{data.maxRisk}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">Largest Win</p>
              <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                +${data.largestWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">Largest Loss</p>
              <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                -${data.largestLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 dark:bg-[#182030] rounded-xl border border-gray-200/50 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Discipline Rating</p>
              <p className="text-[10px] text-gray-400 dark:text-slate-400">Based on sizing & loss limits</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{data.score}</span>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Target className="w-4 h-4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <Crosshair className="w-4 h-4 text-blue-500" />
            Trading Goals & Consistency
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3.5">
          
          {/* Daily Goal */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-700 dark:text-slate-300 font-medium">Daily Target Discipline</span>
              <span className="text-gray-500 dark:text-slate-400 font-bold">
                {data.totalTrades > 0 ? `${data.tradesPerDay} Trades/Day (${data.targetDisciplinePct}%)` : 'No Trades (100%)'}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-[#182030] rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.max(0, Math.min(100, data.targetDisciplinePct))}%` }}
              />
            </div>
          </div>

          {/* Max Daily Loss Guard */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-700 dark:text-slate-300 font-medium">Max Daily Loss Guard</span>
              <span className={`font-bold ${data.maxDailyLossRespected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {data.maxDailyLossRespected ? 'Respected' : 'Breached'}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-[#182030] rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${data.maxDailyLossRespected ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                style={{ width: data.maxDailyLossRespected ? '100%' : '35%' }}
              />
            </div>
          </div>

          {/* Risk-Reward Discipline */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-700 dark:text-slate-300 font-medium">Risk-Reward Discipline (&gt;1.5R)</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{data.rrDisciplinePct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-[#182030] rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.max(0, Math.min(100, data.rrDisciplinePct))}%` }}
              />
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
