import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Info, BarChart3, Sparkles } from 'lucide-react';
import { useTradeStore, type Trade, type Campaign } from '../../store/useTradeStore';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { format, subDays } from 'date-fns';
import { parseTradeDate } from '../analytics/AnalyticsComponents';

interface CumulativePnLChartProps {
  trades?: Trade[];
  campaign?: Campaign;
  timeframe?: 'all' | '30d' | '90d' | 'month';
}

export function CumulativePnLChart({ 
  trades: propsTrades, 
  campaign: propsCampaign,
  timeframe: initialTimeframe 
}: CumulativePnLChartProps) {
  const store = useTradeStore();
  const [timeframe, setTimeframe] = useState<'all' | '30d' | '90d' | 'month'>(initialTimeframe || 'all');

  const trades = propsTrades !== undefined ? propsTrades : store.trades;
  const activeId = store.activeCampaignId || (store.campaigns.length > 0 ? store.campaigns[0].id : null);
  const campaign = propsCampaign !== undefined ? propsCampaign : store.campaigns.find(c => c.id === activeId);

  const chartData = useMemo(() => {
    // If propsTrades was passed, it is already filtered by account in Analytics page.
    // If not, filter by active campaign if activeId exists.
    let targetTrades = propsTrades !== undefined 
      ? trades 
      : trades.filter(t => !activeId || t.campaignId === activeId);
    
    // Sort chronologically using robust date parser
    targetTrades = [...targetTrades].sort((a, b) => parseTradeDate(a.date).getTime() - parseTradeDate(b.date).getTime());

    if (timeframe === '30d') {
      const cutoff = subDays(new Date(), 30);
      targetTrades = targetTrades.filter(t => parseTradeDate(t.date) >= cutoff);
    } else if (timeframe === '90d') {
      const cutoff = subDays(new Date(), 90);
      targetTrades = targetTrades.filter(t => parseTradeDate(t.date) >= cutoff);
    } else if (timeframe === 'month') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      targetTrades = targetTrades.filter(t => {
        const d = parseTradeDate(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }

    let runningPnl = 0;
    const initialBalance = campaign?.startingBalance || 100000;
    let runningBalance = initialBalance;

    const startDateStr = campaign?.startDate 
      ? format(parseTradeDate(campaign.startDate), 'MM/dd/yy') 
      : 'Start';

    const data = [
      {
        name: 'Start',
        date: startDateStr,
        pnl: 0,
        balance: initialBalance,
        cumulativePnl: 0
      }
    ];

    if (targetTrades.length === 0) {
      data.push({
        name: 'Current',
        date: format(new Date(), 'MM/dd/yy'),
        pnl: 0,
        balance: initialBalance,
        cumulativePnl: 0
      });
      return data;
    }

    targetTrades.forEach((trade, index) => {
      runningPnl += trade.pnl;
      runningBalance += trade.pnl;
      
      let dateLabel = `T${index + 1}`;
      try {
        dateLabel = format(parseTradeDate(trade.date), 'MM/dd/yy');
      } catch {
        dateLabel = `T${index + 1}`;
      }

      data.push({
        name: `T${index + 1}`,
        date: dateLabel,
        pnl: trade.pnl,
        balance: Number(runningBalance.toFixed(2)),
        cumulativePnl: Number(runningPnl.toFixed(2))
      });
    });

    return data;
  }, [trades, propsTrades, activeId, campaign, timeframe]);

  const latestPnl = chartData.length > 0 ? chartData[chartData.length - 1].cumulativePnl : 0;
  const isProfitable = latestPnl >= 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Daily net cumulative P&L
            </CardTitle>
            <span title="Net cumulative profits and losses across trades" className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 cursor-help">
              <Info className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="text-xs bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700/70 rounded-lg px-2.5 py-1 text-gray-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all" className="dark:bg-[#111722]">All Time</option>
              <option value="month" className="dark:bg-[#111722]">This Month</option>
              <option value="30d" className="dark:bg-[#111722]">Last 30 Days</option>
              <option value="90d" className="dark:bg-[#111722]">Last 3 Months</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3 pb-4">
        <div className="h-[230px] sm:h-[260px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <defs>
                <linearGradient id="pnlGreenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="pnlRedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis 
                dataKey="date" 
                stroke="#64748B" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                dy={6}
              />
              <YAxis 
                stroke="#64748B" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => {
                  const prefix = val < 0 ? '-$' : '$';
                  const absVal = Math.abs(val);
                  if (absVal >= 1000) return `${prefix}${(absVal / 1000).toFixed(0)}k`;
                  return `${prefix}${absVal}`;
                }}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const pnlVal = data.cumulativePnl;
                    return (
                      <div className="bg-[#111722] border border-[#1E293B] p-3 rounded-lg shadow-xl text-xs space-y-1 z-50">
                        <p className="text-gray-400 font-medium">{data.date} ({data.name})</p>
                        <p className="font-extrabold text-sm text-white">
                          Net P&L: <span className={pnlVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {pnlVal >= 0 ? '+' : '-'}${Math.abs(pnlVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </p>
                        {data.balance > 0 && (
                          <p className="text-gray-400 text-[11px]">
                            Balance: ${data.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}
                        {data.pnl !== 0 && (
                          <p className="text-gray-400 text-[11px]">
                            Trade PnL: <span className={data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {data.pnl >= 0 ? '+' : '-'}${Math.abs(data.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="cumulativePnl" 
                stroke={isProfitable ? '#10B981' : '#EF4444'} 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill={isProfitable ? "url(#pnlGreenGradient)" : "url(#pnlRedGradient)"}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Backward compatibility export
export function EquityCurveChart() {
  return <CumulativePnLChart />;
}

interface TraderScoreWidgetProps {
  trades?: Trade[];
  startingBalance?: number;
}

export function TraderScoreWidget({ trades: propsTrades, startingBalance = 100000 }: TraderScoreWidgetProps) {
  const store = useTradeStore();
  const trades = propsTrades !== undefined ? propsTrades : store.trades;

  const metrics = useMemo(() => {
    const totalTrades = trades.length;

    if (totalTrades === 0) {
      return {
        winScore: 0,
        pfScore: 0,
        riskScore: 0,
        consistencyScore: 0,
        drawdownScore: 0,
        recoveryScore: 0,
        overallScore: 0.00
      };
    }

    const wins = trades.filter(t => t.result === 'Win');
    const losses = trades.filter(t => t.result === 'Loss');
    const winRate = (wins.length / totalTrades) * 100;

    const totalWon = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLost = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const netProfit = totalWon - totalLost;

    // 1. Win % Score (0 to 100)
    // 50% win rate is benchmark 65; 65%+ is 85+
    const winScore = Math.min(100, Math.max(0, Math.round(winRate * 1.35)));

    // 2. Profit Factor Score (0 to 100)
    let pfScore = 50;
    if (totalLost === 0 && totalWon > 0) {
      pfScore = 100; // all winning trades
    } else if (totalLost > 0) {
      const pf = totalWon / totalLost;
      if (pf < 1.0) {
        pfScore = Math.max(10, Math.round(pf * 45));
      } else if (pf <= 2.0) {
        pfScore = Math.round(45 + (pf - 1.0) * 35);
      } else {
        pfScore = Math.min(100, Math.round(80 + (pf - 2.0) * 10));
      }
    } else {
      pfScore = 0;
    }

    // 3. Avg Win/Loss (Risk:Reward ratio score)
    const avgWin = wins.length > 0 ? totalWon / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLost / losses.length : 0;
    let riskScore = 50;
    if (avgLoss > 0) {
      const rrRatio = avgWin / avgLoss;
      if (rrRatio >= 2.0) riskScore = Math.min(100, Math.round(85 + (rrRatio - 2.0) * 10));
      else if (rrRatio >= 1.5) riskScore = Math.round(70 + (rrRatio - 1.5) * 30);
      else if (rrRatio >= 1.0) riskScore = Math.round(50 + (rrRatio - 1.0) * 40);
      else riskScore = Math.max(10, Math.round(rrRatio * 50));
    } else if (avgWin > 0) {
      riskScore = 95;
    } else {
      riskScore = 0;
    }

    // 4. Max Drawdown Score & Recovery Factor
    let peak = startingBalance;
    let balance = startingBalance;
    let maxDrawdownDollar = 0;
    let maxDrawdownPercent = 0;

    trades.forEach(t => {
      balance += t.pnl;
      if (balance >= peak) {
        peak = balance;
      }
      const dd = peak - balance;
      const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
      if (dd > maxDrawdownDollar) maxDrawdownDollar = dd;
      if (ddPct > maxDrawdownPercent) maxDrawdownPercent = ddPct;
    });

    // Drawdown score: 100 minus penalty
    const drawdownScore = Math.max(10, Math.min(100, Math.round(100 - maxDrawdownPercent * 3.5)));

    // Recovery score: Net Profit / Max Drawdown
    let recoveryScore = 50;
    if (maxDrawdownDollar === 0) {
      recoveryScore = netProfit > 0 ? 100 : 50;
    } else if (netProfit <= 0) {
      recoveryScore = Math.max(10, Math.round(40 + (netProfit / maxDrawdownDollar) * 20));
    } else {
      const rf = netProfit / maxDrawdownDollar;
      if (rf >= 3.0) recoveryScore = 95;
      else if (rf >= 2.0) recoveryScore = 85;
      else if (rf >= 1.0) recoveryScore = 70;
      else recoveryScore = Math.round(40 + rf * 30);
    }

    // 5. Consistency Score
    // Group trades by date to measure trading distribution
    const dayTradeCounts: Record<string, { count: number; pnl: number }> = {};
    trades.forEach(t => {
      const key = format(parseTradeDate(t.date), 'yyyy-MM-dd');
      if (!dayTradeCounts[key]) dayTradeCounts[key] = { count: 0, pnl: 0 };
      dayTradeCounts[key].count += 1;
      dayTradeCounts[key].pnl += t.pnl;
    });

    const activeDays = Object.values(dayTradeCounts);
    const disciplinedDays = activeDays.filter(d => d.count <= 3).length;
    const profitableDays = activeDays.filter(d => d.pnl > 0).length;
    
    const dayDisciplineRatio = activeDays.length > 0 ? disciplinedDays / activeDays.length : 1;
    const dayProfitRatio = activeDays.length > 0 ? profitableDays / activeDays.length : 0.5;
    
    const consistencyScore = Math.min(100, Math.max(10, Math.round(
      (dayDisciplineRatio * 0.45 + dayProfitRatio * 0.55) * 100
    )));

    // Overall HAGE Score: true arithmetic mean
    const overallScore = Number(
      ((winScore + pfScore + riskScore + consistencyScore + drawdownScore + recoveryScore) / 6).toFixed(2)
    );

    return {
      winScore,
      pfScore,
      riskScore,
      consistencyScore,
      drawdownScore,
      recoveryScore,
      overallScore
    };
  }, [trades, startingBalance]);

  // Dimensions for radar polygon
  const center = 100;
  const radius = 65;
  const numSides = 6;
  const labels = ['Win %', 'Profit factor', 'Avg win/loss', 'Recovery factor', 'Max drawdown', 'Consistency'];
  const values = [
    metrics.winScore,
    metrics.pfScore,
    metrics.riskScore,
    metrics.recoveryScore,
    metrics.drawdownScore,
    metrics.consistencyScore
  ];

  // Calculate polygon points
  const points = values.map((val, i) => {
    const angle = (Math.PI * 2 / numSides) * i - Math.PI / 2;
    const r = (Math.max(5, val) / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  // Background web rings
  const ringLevels = [0.33, 0.66, 1.0];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 border-b border-gray-100 dark:border-[#1E293B]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            HAGE Score
          </CardTitle>
          <span title="Performance multi-factor score dynamically calculated from win rate, profit factor, risk control, consistency, and drawdown" className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 cursor-help">
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-3 pb-4 flex flex-col items-center">
        {/* Radar Graphic */}
        <div className="relative w-full max-w-[240px] aspect-square flex items-center justify-center">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Background Hexagon Rings */}
            {ringLevels.map((lvl, idx) => {
              const hexPoints = Array.from({ length: numSides }).map((_, i) => {
                const angle = (Math.PI * 2 / numSides) * i - Math.PI / 2;
                const r = lvl * radius;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              }).join(' ');
              return (
                <polygon 
                  key={idx} 
                  points={hexPoints} 
                  fill="none" 
                  stroke="rgba(148, 163, 184, 0.18)" 
                  strokeWidth="1" 
                  strokeDasharray={idx < 2 ? "2 2" : undefined}
                />
              );
            })}

            {/* Axes Lines */}
            {Array.from({ length: numSides }).map((_, i) => {
              const angle = (Math.PI * 2 / numSides) * i - Math.PI / 2;
              const x = center + radius * Math.cos(angle);
              const y = center + radius * Math.sin(angle);
              return (
                <line 
                  key={i} 
                  x1={center} 
                  y1={center} 
                  x2={x} 
                  y2={y} 
                  stroke="rgba(148, 163, 184, 0.15)" 
                  strokeWidth="1" 
                />
              );
            })}

            {/* Filled Radar Data Shape with Gradient */}
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <polygon 
              points={points} 
              fill="url(#radarGradient)" 
              stroke="#8B5CF6" 
              strokeWidth="2" 
              className="transition-all duration-500"
            />

            {/* Corner Labels */}
            {labels.map((lbl, i) => {
              const angle = (Math.PI * 2 / numSides) * i - Math.PI / 2;
              const labelRadius = radius + 20;
              const x = center + labelRadius * Math.cos(angle);
              const y = center + labelRadius * Math.sin(angle);
              return (
                <text 
                  key={i} 
                  x={x} 
                  y={y} 
                  fill="#94A3B8" 
                  fontSize="7.5" 
                  fontWeight="600"
                  textAnchor="middle" 
                  dominantBaseline="central"
                >
                  {lbl}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Score Footer */}
        <div className="w-full mt-2 pt-2 border-t border-gray-100 dark:border-[#1E293B] flex flex-col items-center">
          <div className="flex items-baseline justify-between w-full mb-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Your HAGE Score</span>
            <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
              {metrics.overallScore.toFixed(2)}
            </span>
          </div>

          {/* Color Gradient Meter (0 to 100) */}
          <div className="w-full relative">
            <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 overflow-hidden" />
            <div 
              className="absolute -top-1 w-3 h-3 bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-full shadow-sm -ml-1.5 transition-all duration-300"
              style={{ left: `${Math.max(2, Math.min(98, metrics.overallScore))}%` }}
            />
            <div className="flex justify-between text-[9px] text-gray-400 font-semibold mt-1">
              <span>0</span>
              <span>20</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DailyPnLChartProps {
  trades?: Trade[];
}

export function DailyPnLChart({ trades: propsTrades }: DailyPnLChartProps) {
  const store = useTradeStore();
  const trades = propsTrades !== undefined ? propsTrades : store.trades;
  const activeId = store.activeCampaignId || (store.campaigns.length > 0 ? store.campaigns[0].id : null);

  const chartData = useMemo(() => {
    const campaignTrades = propsTrades !== undefined 
      ? trades 
      : trades.filter(t => !activeId || t.campaignId === activeId);
    
    // Group by ISO date key yyyy-MM-dd for true chronological sorting
    const dailyPnL: Record<string, number> = {};
    
    campaignTrades.forEach(trade => {
      try {
        const dateKey = format(parseTradeDate(trade.date), 'yyyy-MM-dd');
        if (!dailyPnL[dateKey]) dailyPnL[dateKey] = 0;
        dailyPnL[dateKey] += trade.pnl;
      } catch {
        // ignore
      }
    });

    const sortedIsoDates = Object.keys(dailyPnL).sort((a, b) => a.localeCompare(b));

    const data = sortedIsoDates.map(isoDate => ({
      isoDate,
      date: format(parseTradeDate(isoDate), 'MMM d'),
      pnl: Number(dailyPnL[isoDate].toFixed(2))
    }));

    if (data.length === 0) {
      return [{ isoDate: '', date: format(new Date(), 'MMM d'), pnl: 0 }];
    }

    return data.slice(-14);
  }, [trades, propsTrades, activeId]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
        <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          Daily P&L
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="#64748B" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => {
                  const prefix = val < 0 ? '-$' : '$';
                  return `${prefix}${Math.abs(val)}`;
                }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: '1px solid #1E293B', 
                  backgroundColor: '#111722',
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
                }}
                formatter={(value: any) => [
                  `${Number(value) >= 0 ? '+' : '-'}$${Math.abs(Number(value)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
                  'P&L'
                ]}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
