import { useState, useMemo } from 'react';
import { useTradeStore } from '../../store/useTradeStore';
import { ChevronLeft, ChevronRight, Camera, Maximize2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameMonth,
  isToday
} from 'date-fns';

export function DashboardCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { trades, activeCampaignId, campaigns } = useTradeStore();

  const activeId = activeCampaignId || (campaigns.length > 0 ? campaigns[0].id : null);

  // Filter trades by active campaign if selected, or all trades
  const campaignTrades = useMemo(() => {
    if (!activeId) return trades;
    return trades.filter(t => t.campaignId === activeId);
  }, [trades, activeId]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const { monthStart, days } = useMemo(() => {
    const mStart = startOfMonth(currentDate);
    const mEnd = endOfMonth(mStart);
    const sDate = startOfWeek(mStart);
    const eDate = endOfWeek(mEnd);
    return {
      monthStart: mStart,
      days: eachDayOfInterval({ start: sDate, end: eDate })
    };
  }, [currentDate]);

  // Daily statistics
  const dailyStats = useMemo(() => {
    const stats: Record<string, { pnl: number; tradesCount: number; wins: number; hasImages: boolean }> = {};
    
    campaignTrades.forEach(trade => {
      try {
        let dateString = trade.date;
        if (!/\d{4}/.test(dateString)) {
          if (dateString.includes(',')) {
            dateString = dateString.replace(',', ` ${new Date().getFullYear()},`);
          } else {
            dateString = `${dateString} ${new Date().getFullYear()}`;
          }
        }
        const tradeDate = new Date(dateString);
        if (isNaN(tradeDate.getTime())) return;

        const dateKey = format(tradeDate, 'yyyy-MM-dd');
        
        if (!stats[dateKey]) {
          stats[dateKey] = { pnl: 0, tradesCount: 0, wins: 0, hasImages: false };
        }
        
        stats[dateKey].pnl += trade.pnl;
        stats[dateKey].tradesCount += 1;
        if (trade.result === 'Win') {
          stats[dateKey].wins += 1;
        }
        if (trade.imageUrl) {
          stats[dateKey].hasImages = true;
        }
      } catch (e) {
        // ignore invalid dates
      }
    });
    
    return stats;
  }, [campaignTrades]);

  // Weekly stats
  const weeks = useMemo(() => {
    const weekChunks = [];
    for (let i = 0; i < days.length; i += 7) {
      weekChunks.push(days.slice(i, i + 7));
    }
    
    return weekChunks.map((weekDays, index) => {
      let weekPnl = 0;
      let activeDays = 0;
      
      weekDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const stat = dailyStats[dateKey];
        if (stat && stat.tradesCount > 0) {
          weekPnl += stat.pnl;
          activeDays++;
        }
      });
      
      return {
        label: `Week ${index + 1}`,
        pnl: weekPnl,
        days: activeDays
      };
    });
  }, [days, dailyStats]);

  // Monthly stats
  const { monthPnl, monthActiveDays } = useMemo(() => {
    let pnl = 0;
    let activeDays = 0;
    const monthKeyPrefix = format(monthStart, 'yyyy-MM');
    Object.keys(dailyStats).forEach(key => {
      if (key.startsWith(monthKeyPrefix)) {
        pnl += dailyStats[key].pnl;
        if (dailyStats[key].tradesCount > 0) activeDays++;
      }
    });
    return { monthPnl: pnl, monthActiveDays: activeDays };
  }, [dailyStats, monthStart]);

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
      const formatted = (absValue / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 });
      return (value < 0 ? '-$' : '+$') + formatted + 'K';
    }
    return (value < 0 ? '-$' : '+$') + absValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-[#111722] rounded-xl border border-gray-200/80 dark:border-[#1E293B] shadow-sm p-3.5 sm:p-4 lg:p-5 flex flex-col w-full min-w-0 transition-colors duration-200">
      
      {/* Calendar Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pb-3 sm:pb-4 mb-3 border-b border-gray-100 dark:border-[#1E293B]">
        
        {/* Month Navigator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#182030] p-0.5 rounded-lg border border-gray-200/60 dark:border-slate-700/60">
            <button 
              onClick={prevMonth} 
              className="p-1 hover:bg-white dark:hover:bg-[#111722] rounded text-gray-600 dark:text-slate-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm px-2 text-center min-w-[90px]">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button 
              onClick={nextMonth} 
              className="p-1 hover:bg-white dark:hover:bg-[#111722] rounded text-gray-600 dark:text-slate-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-[#182030] dark:hover:bg-[#1e293b] text-gray-700 dark:text-slate-200 border border-gray-200/60 dark:border-slate-700/60 transition-colors"
          >
            This month
          </button>
        </div>

        {/* Monthly Summary Badges & Quick Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-gray-500 dark:text-slate-400 hidden sm:inline">Monthly stats:</span>
            <span className={`px-2 py-0.5 rounded-md font-extrabold text-xs ${
              monthPnl > 0 
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60' 
                : monthPnl < 0 
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60' 
                : 'bg-gray-100 text-gray-600 dark:bg-[#182030] dark:text-slate-300'
            }`}>
              {monthPnl === 0 ? '$0' : formatCurrency(monthPnl)}
            </span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 text-xs font-bold rounded-md border border-blue-200 dark:border-blue-800/60">
              {monthActiveDays} {monthActiveDays === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <NavLink 
              to="/dashboard/calendar" 
              className="p-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              title="Open full calendar page"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </NavLink>
          </div>
        </div>
      </div>

      {/* Main Grid: Days of Week + Day Cells + Weekly Summary Column */}
      <div className="w-full min-w-0 overflow-x-auto custom-scrollbar pb-1">
        <div className="flex gap-1.5 sm:gap-3.5 min-w-[310px] sm:min-w-[440px] md:min-w-[540px]">
          
          {/* 7-Column Calendar Body */}
          <div className="flex-1 min-w-0">
            
            {/* Weekday Labels Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {weekDays.map(day => (
                <div 
                  key={day} 
                  className="text-center font-bold text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const stat = dailyStats[dateKey];
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isDayToday = isToday(day);
                const hasTrades = isCurrentMonth && stat && stat.tradesCount > 0;
                const isProfit = hasTrades && stat.pnl >= 0;

                return (
                  <div 
                    key={day.toString()} 
                    className={`min-h-[56px] sm:min-h-[86px] md:min-h-[96px] p-1 sm:p-2 rounded-xl relative flex flex-col justify-between transition-all border ${
                      !isCurrentMonth 
                        ? 'bg-transparent dark:bg-[#0B0E14]/20 border-transparent opacity-25' 
                        : hasTrades 
                          ? isProfit 
                            ? 'bg-[#EBF7F0] dark:bg-[#0E2A1E]/80 border-[#B7E4C7] dark:border-[#1E5638] text-[#0F763F] dark:text-[#34D399] shadow-xs' 
                            : 'bg-[#FDF0F0] dark:bg-[#2D1216]/80 border-[#F8B4B4] dark:border-[#5E1E26] text-[#C53030] dark:text-[#F87171] shadow-xs'
                          : 'bg-gray-50/60 dark:bg-[#161F30]/40 border-gray-100 dark:border-slate-800/80 text-gray-700 dark:text-slate-300'
                    }`}
                  >
                    {/* Top Bar inside cell: Date number + optional photo badge */}
                    <div className="flex items-center justify-between w-full">
                      {stat?.hasImages && (
                        <span title="Contains trade charts">
                          <Camera className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-blue-500 dark:text-blue-400 opacity-75" />
                        </span>
                      )}
                      <div className="ml-auto">
                        {isDayToday ? (
                          <span className="text-[10px] sm:text-xs font-black w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                            {format(day, 'd')}
                          </span>
                        ) : (
                          <span className={`text-[10px] sm:text-xs font-bold ${
                            !isCurrentMonth 
                              ? 'text-gray-400 dark:text-slate-600' 
                              : 'text-gray-500 dark:text-slate-400'
                          }`}>
                            {format(day, 'd')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cell Body: P&L Amount + Trade Count + Win % */}
                    {hasTrades ? (
                      <div className="flex flex-col items-center justify-center py-0.5 space-y-0.5">
                        <span className={`font-black text-xs sm:text-[13px] md:text-sm leading-tight tracking-tight ${
                          isProfit 
                            ? 'text-[#0F763F] dark:text-[#34D399]' 
                            : 'text-[#C53030] dark:text-[#F87171]'
                        }`}>
                          {formatCurrency(stat.pnl)}
                        </span>
                        <span className="text-[9px] sm:text-[10px] md:text-[11px] font-medium text-gray-500 dark:text-slate-400 leading-none">
                          {stat.tradesCount} {stat.tradesCount === 1 ? 'trade' : 'trades'}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 dark:text-slate-400 leading-none">
                          {((stat.wins / stat.tradesCount) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Stats Column (Right-hand side) */}
          <div className="w-18 sm:w-22 md:w-26 shrink-0 flex flex-col justify-start pt-7 sm:pt-8 space-y-1.5 sm:space-y-2">
            {weeks.map((week, idx) => {
              const isProfitWeek = week.pnl > 0;
              const isLossWeek = week.pnl < 0;
              return (
                <div 
                  key={idx} 
                  className="h-[74px] sm:h-[86px] md:h-[96px] flex flex-col justify-center items-center p-1.5 sm:p-2 rounded-xl border border-gray-200/60 dark:border-slate-800 bg-gray-50/50 dark:bg-[#161F30]/50 text-center"
                >
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                    {week.label}
                  </span>
                  <span className={`text-[11px] sm:text-xs md:text-[13px] font-black my-0.5 ${
                    isProfitWeek 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : isLossWeek 
                      ? 'text-rose-600 dark:text-rose-400' 
                      : 'text-gray-600 dark:text-slate-300'
                  }`}>
                    {week.pnl === 0 ? '$0' : formatCurrency(week.pnl)}
                  </span>
                  <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[9px] sm:text-[10px] font-bold rounded">
                    {week.days} {week.days === 1 ? 'day' : 'days'}
                  </span>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
