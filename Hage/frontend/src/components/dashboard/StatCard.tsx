import type { ElementType } from 'react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../utils/cn';
import { Info, TrendingUp, TrendingDown, Target, Zap, DollarSign } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  colorTheme?: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend, 
  trendValue,
  colorTheme = 'blue',
  className
}: StatCardProps) {
  
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60',
    green: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60',
    red: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60',
    purple: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60',
    yellow: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60',
  };

  return (
    <Card className={cn("hover:shadow-md transition-all duration-200", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">{title}</p>
              <Info className="w-3 h-3 text-gray-400 dark:text-slate-400" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value}</h3>
            {subtitle && <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={cn("p-2 rounded-lg shrink-0", colorMap[colorTheme])}>
              <Icon className="w-4 h-4" strokeWidth={2.5} />
            </div>
          )}
        </div>
        
        {trend && trendValue && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
            {trend === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            ) : null}
            <span className={cn(
              trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 
              trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500'
            )}>
              {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendValue}
            </span>
            <span className="text-gray-400 dark:text-slate-400 font-normal">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 1. Net P&L Card with Glowing Ring / Indicator
export function NetPnLCard({ value, rawValue }: { value: string; rawValue: number }) {
  const isPositive = rawValue >= 0;
  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Net P&L</span>
            <Info className="w-3 h-3 text-gray-400" />
          </div>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
          }`}>
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className={`text-xl sm:text-2xl font-black tracking-tight ${
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {value}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-slate-400 mt-1 font-medium">Realized net returns</p>
      </CardContent>
    </Card>
  );
}

// 2. Win Rate Card with Radial Semi-Circle Arc
export function WinRateCard({ winRate, wins, losses }: { winRate: number; wins: number; losses: number }) {
  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Trade win %</span>
            <Info className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {winRate.toFixed(2)}%
            </span>
            <div className="flex items-center gap-2 mt-1 text-[10px] font-bold">
              <span className="text-emerald-500">{wins}W</span>
              <span className="text-gray-300 dark:text-slate-700">•</span>
              <span className="text-rose-500">{losses}L</span>
            </div>
          </div>

          {/* Radial Semi-Arc Gauge */}
          <div className="relative w-12 h-10 flex items-center justify-center">
            <svg viewBox="0 0 36 24" className="w-full">
              <path
                d="M 4 20 A 14 14 0 0 1 32 20"
                fill="none"
                stroke="rgba(148, 163, 184, 0.2)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 4 20 A 14 14 0 0 1 32 20"
                fill="none"
                stroke={winRate >= 50 ? "#10B981" : "#EF4444"}
                strokeWidth="4"
                strokeDasharray={`${(winRate / 100) * 44} 44`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 3. Avg Win/Loss Ratio Card with Split Bar
export function AvgWinLossCard({ ratio, avgWin, avgLoss }: { ratio: number; avgWin: number; avgLoss: number }) {
  const total = avgWin + avgLoss;
  const winPercent = total > 0 ? (avgWin / total) * 100 : 50;

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Avg win/loss trade</span>
            <Info className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {ratio.toFixed(2)}
          </span>
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-500">+${avgWin.toFixed(0)}</span>
            <span className="mx-1 text-gray-400">/</span>
            <span className="text-[10px] font-bold text-rose-500">-${avgLoss.toFixed(0)}</span>
          </div>
        </div>

        {/* Horizontal Split Bar */}
        <div className="w-full bg-rose-500/20 h-1.5 rounded-full overflow-hidden flex mt-2">
          <div 
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${Math.max(10, Math.min(90, winPercent))}%` }}
          />
          <div 
            className="bg-rose-500 h-full transition-all duration-300"
            style={{ width: `${100 - Math.max(10, Math.min(90, winPercent))}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// 4. Profit Factor Card with Ring Gauge
export function ProfitFactorCard({ profitFactor }: { profitFactor: number }) {
  const normalized = Math.min(100, Math.max(0, (profitFactor / 3) * 100));
  const isHealthy = profitFactor >= 1.5;

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Profit factor</span>
            <Info className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {profitFactor.toFixed(2)}
          </span>

          {/* Ring Donut Gauge */}
          <div className="relative w-9 h-9">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(148, 163, 184, 0.2)"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={isHealthy ? "#10B981" : "#3B82F6"}
                strokeWidth="3.5"
                strokeDasharray={`${normalized}, 100`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 dark:text-slate-400 mt-1 font-medium">
          {profitFactor >= 2 ? 'Superb edge' : profitFactor >= 1 ? 'Profitable' : 'Below breakeven'}
        </p>
      </CardContent>
    </Card>
  );
}

// 5. Current Streak / Daily Trades Card
export function StreakCard({ 
  totalTrades, 
  todayTrades, 
  todayPnL 
}: { 
  totalTrades: number; 
  todayTrades: number; 
  todayPnL: number; 
}) {
  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Current streak</span>
            <Info className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          {/* Days / Today's PnL badge */}
          <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#182030] border border-gray-200/50 dark:border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase">Today ({todayTrades})</span>
              <span className={`text-xs font-black ${
                todayPnL > 0 ? 'text-emerald-500' : todayPnL < 0 ? 'text-rose-500' : 'text-gray-700 dark:text-slate-300'
              }`}>
                {todayPnL >= 0 ? '+' : ''}${todayPnL.toFixed(0)}
              </span>
            </div>
            <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Zap className="w-3 h-3" />
            </div>
          </div>

          {/* Total Trades badge */}
          <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#182030] border border-gray-200/50 dark:border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase">Trades</span>
              <span className="text-xs font-black text-gray-900 dark:text-white">
                {totalTrades}
              </span>
            </div>
            <div className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Target className="w-3 h-3" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
