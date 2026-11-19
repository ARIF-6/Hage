import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { useTradeStore } from '../../store/useTradeStore';
import { ChevronLeft, ChevronRight, Settings, Camera, Info, Percent } from 'lucide-react';
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

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [displayMode, setDisplayMode] = useState<'dollar' | 'percent'>('dollar');
  const { trades, activeCampaignId, campaigns } = useTradeStore();

  const activeId = activeCampaignId || (campaigns.length > 0 ? campaigns[0].id : null);

  const baseBalance = useMemo(() => {
    if (activeId) {
      const matched = campaigns.find(c => c.id === activeId);
      if (matched && (matched.startingBalance || matched.accountSize)) {
        return matched.startingBalance || matched.accountSize;
      }
    }
    if (campaigns.length > 0) {
      const total = campaigns.reduce((sum, c) => sum + (c.startingBalance || c.accountSize || 0), 0);
      if (total > 0) return total;
    }
    return 100000;
  }, [activeId, campaigns]);

  const campaignTrades = useMemo(() => {
    if (!activeId) return trades;
    return trades.filter(t => t.campaignId === activeId);
  }, [trades, activeId]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  // Calculate stats per day
  const dailyStats = useMemo(() => {
    const stats: Record<string, { pnl: number; tradesCount: number; wins: number; }> = {};
    
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
          stats[dateKey] = { pnl: 0, tradesCount: 0, wins: 0 };
        }
        
        stats[dateKey].pnl += trade.pnl;
        stats[dateKey].tradesCount += 1;
        if (trade.result === 'Win') {
          stats[dateKey].wins += 1;
        }
      } catch {
        // ignore
      }
    });
    
    return stats;
  }, [campaignTrades]);

  // Weeks for sidebar
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
        if (stat) {
          weekPnl += stat.pnl;
          if (stat.tradesCount > 0) activeDays++;
        }
      });
      
      return {
        label: `Week ${index + 1}`,
        pnl: weekPnl,
        days: activeDays
      };
    });
  }, [days, dailyStats]);

  // Month stats
  const { monthPnl, monthActiveDays } = useMemo(() => {
    let pnl = 0;
    let activeDays = 0;
    Object.keys(dailyStats).forEach(key => {
      // Only count days in the current month
      if (key.startsWith(format(monthStart, 'yyyy-MM'))) {
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
      return (value < 0 ? '-' : '') + '$' + formatted + 'K';
    }
    return (value < 0 ? '-$' : '$') + absValue.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const formatValue = (value: number) => {
    if (displayMode === 'percent') {
      if (value === 0) return '0%';
      const pct = baseBalance > 0 ? (value / baseBalance) * 100 : 0;
      const sign = pct > 0 ? '+' : '';
      return `${sign}${Math.round(pct)}%`;
    }
    return formatCurrency(value);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full max-w-full overflow-x-auto custom-scrollbar pb-12 pt-4 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 w-max max-w-full"
      >
        <Card className="p-4 sm:p-8 bg-white dark:bg-[#111722] border-none shadow-sm rounded-2xl overflow-x-auto custom-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors text-gray-600 dark:text-slate-300">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-gray-900 dark:text-white text-[15px] w-28 text-center">
                  {format(currentDate, dateFormat)}
                </span>
                <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors text-gray-600 dark:text-slate-300">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button 
                onClick={goToToday}
                className="px-4 py-1.5 bg-white dark:bg-[#182030] hover:bg-gray-50 dark:hover:bg-[#1e2a3f] border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-semibold rounded-lg transition-colors text-xs shadow-sm cursor-pointer"
              >
                This month
              </button>
              <div className="flex items-center bg-gray-100 dark:bg-[#182030] p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDisplayMode('dollar')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    displayMode === 'dollar'
                      ? 'bg-white dark:bg-[#111722] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Show in dollar ($)"
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode(prev => prev === 'percent' ? 'dollar' : 'percent')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    displayMode === 'percent'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Show in percentage (%)"
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>Percentage</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-gray-900 dark:text-slate-300 font-bold text-xs">Monthly stats:</span>
                <span className={`font-bold text-xs ${monthPnl >= 0 ? 'text-[#0f763f] dark:text-emerald-400' : 'text-rose-500'}`}>
                  {formatValue(monthPnl)}
                </span>
                <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-blue-950/70 text-indigo-600 dark:text-blue-400 text-[11px] font-bold rounded-md ml-1 border border-indigo-100 dark:border-blue-900/60">
                  {monthActiveDays} {monthActiveDays === 1 ? 'day' : 'days'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-gray-400 hover:text-indigo-600 dark:hover:text-blue-400 transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-indigo-600 dark:hover:text-blue-400 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-indigo-600 dark:hover:text-blue-400 transition-colors">
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {/* Calendar Grid */}
            <div className="bg-white dark:bg-[#111722] rounded-lg overflow-hidden w-max">
              <div className="grid grid-cols-[repeat(7,110px)] gap-[2px] mb-1">
                {weekDays.map(day => (
                  <div key={day} className="text-center font-bold text-gray-900 dark:text-slate-300 text-[13px] py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[repeat(7,110px)] gap-[2px] bg-white dark:bg-[#111722]">
                {days.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const stat = dailyStats[dateKey];
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isDayToday = isToday(day);
                  
                  let bgColor = "bg-[#f4f5f7] dark:bg-[#161F30]/40";
                  let textColor = "text-gray-900 dark:text-slate-200";
                  
                  if (isCurrentMonth && stat && stat.tradesCount > 0) {
                    if (stat.pnl >= 0) {
                      bgColor = "bg-[#e2f5ea] dark:bg-[#0E2A1E]/80";
                      textColor = "text-[#0f763f] dark:text-[#34D399]";
                    } else {
                      bgColor = "bg-[#fce8e8] dark:bg-[#2D1216]/80";
                      textColor = "text-[#c53030] dark:text-[#F87171]";
                    }
                  } else if (!isCurrentMonth) {
                    bgColor = "bg-white dark:bg-[#0B0E14]/20";
                  }

                  return (
                    <div 
                      key={day.toString()} 
                      className={`h-[135px] p-1.5 rounded-sm relative flex flex-col border border-black/5 dark:border-slate-800 ${bgColor} ${textColor} ${!isCurrentMonth ? 'opacity-30' : ''}`}
                    >
                      <div className="flex justify-end mb-1">
                        {isDayToday ? (
                          <span className="text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full bg-indigo-600 text-white">
                            {format(day, 'd')}
                          </span>
                        ) : (
                          <span className="text-[12px] font-bold text-gray-500 dark:text-slate-400 px-1 pt-0.5">
                            {format(day, 'd')}
                          </span>
                        )}
                      </div>
                      
                      {stat && stat.tradesCount > 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-0.5">
                          <span className={`font-black text-[15px] ${stat.pnl >= 0 ? 'text-gray-900 dark:text-white' : ''}`}>
                            {formatValue(stat.pnl)}
                          </span>
                          <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400 leading-tight">
                            {stat.tradesCount} {stat.tradesCount === 1 ? 'trade' : 'trades'}
                          </span>
                          <span className="text-[11px] font-medium text-gray-400 dark:text-slate-400 leading-tight">
                            {((stat.wins / stat.tradesCount) * 100).toFixed(1)}%
                          </span>
                          
                          {/* Small red dot indicator */}
                          <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#f43f5e]"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Stats Sidebar */}
            <div className="w-[110px] pt-7 space-y-[3px]">
              {weeks.map((week, idx) => (
                <div key={idx} className="min-h-[120px] flex flex-col justify-center items-center p-2 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#161F30]/50 shadow-sm">
                  <span className="text-[10px] font-medium text-gray-400 dark:text-slate-400 mb-1">{week.label}</span>
                  <span className={`text-[13px] font-black mb-1.5 ${week.pnl > 0 ? 'text-[#0f763f] dark:text-emerald-400' : week.pnl < 0 ? 'text-[#c53030] dark:text-rose-400' : 'text-gray-900 dark:text-slate-200'}`}>
                    {week.pnl === 0 ? (displayMode === 'percent' ? '0%' : '$0') : formatValue(week.pnl)}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-blue-950/70 text-indigo-600 dark:text-blue-400 text-[10px] font-bold rounded-md border border-indigo-100 dark:border-blue-900/60">
                    {week.days} {week.days === 1 ? 'day' : 'days'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
