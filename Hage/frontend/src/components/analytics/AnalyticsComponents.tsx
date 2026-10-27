import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { 
  TrendingUp, Target, ShieldAlert, 
  Activity, Clock, Compass, Layers, PieChart as PieIcon,
  Sun, Moon, Globe, Zap, ArrowUpRight, ArrowDownRight, Tag
} from 'lucide-react';
import type { Trade } from '../../store/useTradeStore';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';

// -------------------------------------------------------------
// Helper Date & Value Parsers
// -------------------------------------------------------------

export function parseTradeDate(dateInput: string | number | Date | undefined | null): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? new Date() : dateInput;
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  
  let str = String(dateInput).trim();
  if (!str) return new Date();

  // Try direct parse
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // If missing year, e.g. "Sep 3, 07:05" or "09/03"
  if (!/\d{4}/.test(str)) {
    const currentYear = new Date().getFullYear();
    if (str.includes(',')) {
      str = str.replace(',', ` ${currentYear},`);
    } else {
      str = `${str} ${currentYear}`;
    }
    d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // Try removing "at " e.g. "Sep 3, 2026 at 07:05"
  const cleaned = str.replace(/\bat\b/gi, '').replace(/\s+/g, ' ');
  d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;

  // Try parseISO
  try {
    const isoDate = parseISO(str);
    if (!isNaN(isoDate.getTime())) return isoDate;
  } catch {
    // ignore
  }

  return new Date();
}

export function extractTradeHour(dateInput: string | number | Date | undefined | null): number {
  if (!dateInput) return 14;
  const str = String(dateInput);
  
  // Check if explicit time string exists, e.g., "14:30" or "07:05 AM"
  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const ampm = timeMatch[4]?.toLowerCase();
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    if (hours >= 0 && hours < 24) return hours;
  }

  const d = parseTradeDate(dateInput);
  if (!isNaN(d.getTime())) {
    return d.getUTCHours();
  }

  return 14;
}

export function formatProfitFactor(pf: number): string {
  if (!isFinite(pf) || pf === Infinity) return '∞';
  if (isNaN(pf) || pf === 0) return '0.00';
  return pf.toFixed(2);
}

// -------------------------------------------------------------
// Helper Calculation Types & Functions
// -------------------------------------------------------------

export interface AnalyticsStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  lossRate: number;
  netPnL: number;
  totalWon: number;
  totalLost: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  avgWinLossRatio: number;

  // Drawdown
  maxDrawdownDollar: number;
  maxDrawdownPercent: number;
  currentDrawdownDollar: number;
  currentDrawdownPercent: number;
  avgDrawdownDollar: number;
  recoveryTradesCount: number;
  drawdownCurve: {
    index: number;
    name: string;
    date: string;
    drawdown: number;
    drawdownPct: number;
    balance: number;
    peak: number;
  }[];

  // R-Multiple
  totalR: number;
  avgR: number;
  bestR: number;
  worstR: number;
  rDistribution: { band: string; count: number; isPositive: boolean }[];

  // Risk Management
  avgRiskPercent: number;
  maxRiskPercent: number;
  largestWin: number;
  largestLoss: number;
  disciplineScore: string;

  // Behavior
  tradesPerDay: number;
  activeDaysCount: number;
  bestDayOfWeek: { day: string; pnl: number; count: number };
  worstDayOfWeek: { day: string; pnl: number; count: number };
  dayOfWeekData: { day: string; shortDay: string; trades: number; wins: number; winRate: number; pnl: number }[];
  longPerformance: { trades: number; wins: number; winRate: number; pnl: number; avgWin: number; avgLoss: number };
  shortPerformance: { trades: number; wins: number; winRate: number; pnl: number; avgWin: number; avgLoss: number };

  // Sessions
  sessions: {
    name: string;
    id: string;
    hours: string;
    trades: number;
    wins: number;
    winRate: number;
    pnl: number;
    avgR: number;
    profitFactor: number;
    iconName: 'asia' | 'london' | 'ny' | 'overlap';
  }[];

  // Instruments
  instrumentStats: {
    symbol: string;
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    pnl: number;
    avgR: number;
    profitFactor: number;
    bestTrade: number;
    worstTrade: number;
  }[];

  // Strategies
  strategyStats: {
    strategy: string;
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    pnl: number;
    avgR: number;
    profitFactor: number;
  }[];
  hasStrategyData: boolean;

  // Goals
  targetDisciplinePct: number;
  maxDailyLossRespected: boolean;
  rrDisciplinePct: number;
}

export function calculateAnalytics(trades: Trade[], startingBalance: number = 100000): AnalyticsStats {
  const totalTrades = trades.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: 0,
      lossRate: 0,
      netPnL: 0,
      totalWon: 0,
      totalLost: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      avgWinLossRatio: 0,
      maxDrawdownDollar: 0,
      maxDrawdownPercent: 0,
      currentDrawdownDollar: 0,
      currentDrawdownPercent: 0,
      avgDrawdownDollar: 0,
      recoveryTradesCount: 0,
      drawdownCurve: [{ index: 0, name: 'Start', date: 'Start', drawdown: 0, drawdownPct: 0, balance: startingBalance, peak: startingBalance }],
      totalR: 0,
      avgR: 0,
      bestR: 0,
      worstR: 0,
      rDistribution: [
        { band: '< -2R', count: 0, isPositive: false },
        { band: '-2R to -1R', count: 0, isPositive: false },
        { band: '-1R to 0R', count: 0, isPositive: false },
        { band: '0R to 1R', count: 0, isPositive: true },
        { band: '1R to 2R', count: 0, isPositive: true },
        { band: '2R to 3R', count: 0, isPositive: true },
        { band: '> 3R', count: 0, isPositive: true },
      ],
      avgRiskPercent: 0,
      maxRiskPercent: 0,
      largestWin: 0,
      largestLoss: 0,
      disciplineScore: 'A+',
      tradesPerDay: 0,
      activeDaysCount: 0,
      bestDayOfWeek: { day: 'None', pnl: 0, count: 0 },
      worstDayOfWeek: { day: 'None', pnl: 0, count: 0 },
      dayOfWeekData: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => ({ day: d, shortDay: d, trades: 0, wins: 0, winRate: 0, pnl: 0 })),
      longPerformance: { trades: 0, wins: 0, winRate: 0, pnl: 0, avgWin: 0, avgLoss: 0 },
      shortPerformance: { trades: 0, wins: 0, winRate: 0, pnl: 0, avgWin: 0, avgLoss: 0 },
      sessions: [
        { name: 'London Session', id: 'london', hours: '08:00 - 16:00 UTC', trades: 0, wins: 0, winRate: 0, pnl: 0, avgR: 0, profitFactor: 0, iconName: 'london' },
        { name: 'New York Session', id: 'ny', hours: '13:00 - 21:00 UTC', trades: 0, wins: 0, winRate: 0, pnl: 0, avgR: 0, profitFactor: 0, iconName: 'ny' },
        { name: 'Asia Session', id: 'asia', hours: '00:00 - 08:00 UTC', trades: 0, wins: 0, winRate: 0, pnl: 0, avgR: 0, profitFactor: 0, iconName: 'asia' },
        { name: 'London / NY Overlap', id: 'overlap', hours: '13:00 - 16:00 UTC', trades: 0, wins: 0, winRate: 0, pnl: 0, avgR: 0, profitFactor: 0, iconName: 'overlap' },
      ],
      instrumentStats: [],
      strategyStats: [],
      hasStrategyData: false,
      targetDisciplinePct: 100,
      maxDailyLossRespected: true,
      rrDisciplinePct: 100,
    };
  }

  // Sort chronologically using robust date parser
  const sortedTrades = [...trades].sort((a, b) => parseTradeDate(a.date).getTime() - parseTradeDate(b.date).getTime());

  const wins = sortedTrades.filter(t => t.result === 'Win');
  const losses = sortedTrades.filter(t => t.result === 'Loss');
  const breakevens = sortedTrades.filter(t => t.result === 'Break Even' || t.result === 'Pending');

  const winningTrades = wins.length;
  const losingTrades = losses.length;
  const breakevenTrades = breakevens.length;

  const winRate = (winningTrades / totalTrades) * 100;
  const lossRate = (losingTrades / totalTrades) * 100;

  const netPnL = sortedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalWon = wins.reduce((sum, t) => sum + t.pnl, 0);
  const totalLost = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

  const avgWin = winningTrades > 0 ? totalWon / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLost / losingTrades : 0;
  
  // Profit factor: Gross Profit / Gross Loss (Infinite if zero losses and profitable)
  const profitFactor = totalLost > 0 
    ? totalWon / totalLost 
    : totalWon > 0 
      ? Infinity 
      : 0;

  const expectancy = totalTrades > 0 ? netPnL / totalTrades : 0;
  const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  // -------------------------------------------------------------
  // Drawdown Analysis
  // -------------------------------------------------------------
  let peak = startingBalance;
  let currentBalance = startingBalance;
  let maxDrawdownDollar = 0;
  let maxDrawdownPercent = 0;
  const allPullbackDollars: number[] = [];

  let currentDrawdownLength = 0;
  let maxDrawdownLength = 0;

  const drawdownCurve: AnalyticsStats['drawdownCurve'] = [
    {
      index: 0,
      name: 'Start',
      date: 'Start',
      drawdown: 0,
      drawdownPct: 0,
      balance: startingBalance,
      peak: startingBalance
    }
  ];

  sortedTrades.forEach((t, idx) => {
    currentBalance += t.pnl;
    if (currentBalance >= peak) {
      peak = currentBalance;
      currentDrawdownLength = 0;
    } else {
      currentDrawdownLength += 1;
      if (currentDrawdownLength > maxDrawdownLength) {
        maxDrawdownLength = currentDrawdownLength;
      }
    }

    const ddDollar = peak - currentBalance;
    const ddPercent = peak > 0 ? (ddDollar / peak) * 100 : 0;

    if (ddDollar > maxDrawdownDollar) {
      maxDrawdownDollar = ddDollar;
    }
    if (ddPercent > maxDrawdownPercent) {
      maxDrawdownPercent = ddPercent;
    }
    if (ddDollar > 0) {
      allPullbackDollars.push(ddDollar);
    }

    const tDate = parseTradeDate(t.date);
    let dateLabel = `T${idx + 1}`;
    try {
      dateLabel = format(tDate, 'MM/dd');
    } catch {
      // keep fallback
    }

    drawdownCurve.push({
      index: idx + 1,
      name: `T${idx + 1}`,
      date: dateLabel,
      drawdown: -Number(ddDollar.toFixed(2)),
      drawdownPct: -Number(ddPercent.toFixed(2)),
      balance: Number(currentBalance.toFixed(2)),
      peak: Number(peak.toFixed(2))
    });
  });

  const currentDrawdownDollar = Math.max(0, peak - currentBalance);
  const currentDrawdownPercent = peak > 0 ? (currentDrawdownDollar / peak) * 100 : 0;
  const avgDrawdownDollar = allPullbackDollars.length > 0
    ? allPullbackDollars.reduce((a, b) => a + b, 0) / allPullbackDollars.length
    : 0;

  // -------------------------------------------------------------
  // R-Multiple Analysis
  // -------------------------------------------------------------
  const tradeRValues = sortedTrades.map(t => {
    // 1. Explicit RR set on trade
    if (t.rr !== undefined && t.rr !== null && !isNaN(t.rr) && t.rr !== 0) {
      if (t.result === 'Win') return Math.abs(t.rr);
      if (t.result === 'Loss') return -1.0; // loss of 1R risk unit
      return 0; // break even
    }

    // 2. Risk percentage relative to starting balance
    if (t.risk && t.risk > 0) {
      const riskDollar = (t.risk / 100) * startingBalance;
      if (riskDollar > 0) {
        return Number((t.pnl / riskDollar).toFixed(2));
      }
    }

    // 3. Fallback based on average loss
    if (avgLoss > 0) {
      return Number((t.pnl / avgLoss).toFixed(2));
    }

    // 4. Default: +1R for Win, -1R for Loss, 0 for BE
    return t.result === 'Win' ? 1.0 : t.result === 'Loss' ? -1.0 : 0;
  });

  const totalR = Number(tradeRValues.reduce((sum, r) => sum + r, 0).toFixed(2));
  const avgR = Number((totalR / totalTrades).toFixed(2));
  const bestR = tradeRValues.length > 0 ? Math.max(...tradeRValues) : 0;
  const worstR = tradeRValues.length > 0 ? Math.min(...tradeRValues) : 0;

  const rDistribution = [
    { band: '< -2R', count: tradeRValues.filter(r => r < -2).length, isPositive: false },
    { band: '-2R to -1R', count: tradeRValues.filter(r => r >= -2 && r < -1).length, isPositive: false },
    { band: '-1R to 0R', count: tradeRValues.filter(r => r >= -1 && r < 0).length, isPositive: false },
    { band: '0R to 1R', count: tradeRValues.filter(r => r >= 0 && r < 1).length, isPositive: true },
    { band: '1R to 2R', count: tradeRValues.filter(r => r >= 1 && r < 2).length, isPositive: true },
    { band: '2R to 3R', count: tradeRValues.filter(r => r >= 2 && r < 3).length, isPositive: true },
    { band: '> 3R', count: tradeRValues.filter(r => r >= 3).length, isPositive: true },
  ];

  // -------------------------------------------------------------
  // Risk Management
  // -------------------------------------------------------------
  const totalRisk = sortedTrades.reduce((sum, t) => sum + (t.risk || 0), 0);
  const avgRiskPercent = Number((totalRisk / totalTrades).toFixed(1));
  const maxRiskPercent = Math.max(...sortedTrades.map(t => t.risk || 0));

  const winPnls = wins.map(t => t.pnl);
  const lossPnls = losses.map(t => t.pnl);
  const largestWin = winPnls.length > 0 ? Math.max(...winPnls) : 0;
  const largestLoss = lossPnls.length > 0 ? Math.abs(Math.min(...lossPnls)) : 0;

  let disciplineScore = 'A';
  if (maxRiskPercent > 3.5) disciplineScore = 'C+';
  else if (maxRiskPercent > 2.5) disciplineScore = 'B';
  else if (maxRiskPercent > 2.0) disciplineScore = 'B+';
  else if (avgRiskPercent <= 1.5) disciplineScore = 'A+';

  // -------------------------------------------------------------
  // Trading Behavior (Days & Long/Short)
  // -------------------------------------------------------------
  const dayGroups: Record<string, Trade[]> = {};
  const dayOfWeekMap: Record<number, { day: string; shortDay: string; pnl: number; count: number; wins: number; totalR: number }> = {
    1: { day: 'Monday', shortDay: 'Mon', pnl: 0, count: 0, wins: 0, totalR: 0 },
    2: { day: 'Tuesday', shortDay: 'Tue', pnl: 0, count: 0, wins: 0, totalR: 0 },
    3: { day: 'Wednesday', shortDay: 'Wed', pnl: 0, count: 0, wins: 0, totalR: 0 },
    4: { day: 'Thursday', shortDay: 'Thu', pnl: 0, count: 0, wins: 0, totalR: 0 },
    5: { day: 'Friday', shortDay: 'Fri', pnl: 0, count: 0, wins: 0, totalR: 0 },
    6: { day: 'Saturday', shortDay: 'Sat', pnl: 0, count: 0, wins: 0, totalR: 0 },
    0: { day: 'Sunday', shortDay: 'Sun', pnl: 0, count: 0, wins: 0, totalR: 0 },
  };

  sortedTrades.forEach((t, idx) => {
    const d = parseTradeDate(t.date);
    const dayKey = format(d, 'yyyy-MM-dd');
    if (!dayGroups[dayKey]) dayGroups[dayKey] = [];
    dayGroups[dayKey].push(t);

    const dayNum = d.getDay();
    if (dayOfWeekMap[dayNum]) {
      dayOfWeekMap[dayNum].count += 1;
      dayOfWeekMap[dayNum].pnl += t.pnl;
      if (t.result === 'Win') dayOfWeekMap[dayNum].wins += 1;
      dayOfWeekMap[dayNum].totalR += (tradeRValues[idx] || 0);
    }
  });

  const activeDaysCount = Object.keys(dayGroups).length || 1;
  const tradesPerDay = Number((totalTrades / activeDaysCount).toFixed(1));

  // Find Best and Worst Days of Week
  const allWeekdays = [1, 2, 3, 4, 5, 6, 0].map(idx => dayOfWeekMap[idx]);
  const activeDaysArray = allWeekdays.filter(d => d.count > 0);
  let bestDayOfWeek = { day: 'None', pnl: 0, count: 0 };
  let worstDayOfWeek = { day: 'None', pnl: 0, count: 0 };

  if (activeDaysArray.length > 0) {
    const sortedDays = [...activeDaysArray].sort((a, b) => b.pnl - a.pnl);
    bestDayOfWeek = { day: sortedDays[0].day, pnl: Number(sortedDays[0].pnl.toFixed(2)), count: sortedDays[0].count };
    worstDayOfWeek = { day: sortedDays[sortedDays.length - 1].day, pnl: Number(sortedDays[sortedDays.length - 1].pnl.toFixed(2)), count: sortedDays[sortedDays.length - 1].count };
  }

  // Include Saturday and Sunday if they contain trades
  const daysToShowIndices = (dayOfWeekMap[6].count > 0 || dayOfWeekMap[0].count > 0)
    ? [1, 2, 3, 4, 5, 6, 0]
    : [1, 2, 3, 4, 5];

  const dayOfWeekData = daysToShowIndices.map(idx => {
    const item = dayOfWeekMap[idx];
    return {
      day: item.day,
      shortDay: item.shortDay,
      trades: item.count,
      wins: item.wins,
      winRate: item.count > 0 ? Number(((item.wins / item.count) * 100).toFixed(0)) : 0,
      pnl: Number(item.pnl.toFixed(2))
    };
  });

  // Long vs Short
  const longTrades = sortedTrades.filter(t => {
    const type = (t.type || '').toLowerCase();
    return type === 'buy' || type === 'long';
  });
  const shortTrades = sortedTrades.filter(t => {
    const type = (t.type || '').toLowerCase();
    return type === 'sell' || type === 'short';
  });

  const longWins = longTrades.filter(t => t.result === 'Win');
  const shortWins = shortTrades.filter(t => t.result === 'Win');

  const longLosses = longTrades.filter(t => t.result === 'Loss');
  const shortLosses = shortTrades.filter(t => t.result === 'Loss');

  const longPerformance = {
    trades: longTrades.length,
    wins: longWins.length,
    winRate: longTrades.length > 0 ? (longWins.length / longTrades.length) * 100 : 0,
    pnl: Number(longTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)),
    avgWin: longWins.length > 0 ? Number((longWins.reduce((s, t) => s + t.pnl, 0) / longWins.length).toFixed(2)) : 0,
    avgLoss: longLosses.length > 0 ? Number((Math.abs(longLosses.reduce((s, t) => s + t.pnl, 0)) / longLosses.length).toFixed(2)) : 0,
  };

  const shortPerformance = {
    trades: shortTrades.length,
    wins: shortWins.length,
    winRate: shortTrades.length > 0 ? (shortWins.length / shortTrades.length) * 100 : 0,
    pnl: Number(shortTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)),
    avgWin: shortWins.length > 0 ? Number((shortWins.reduce((s, t) => s + t.pnl, 0) / shortWins.length).toFixed(2)) : 0,
    avgLoss: shortLosses.length > 0 ? Number((Math.abs(shortLosses.reduce((s, t) => s + t.pnl, 0)) / shortLosses.length).toFixed(2)) : 0,
  };

  // -------------------------------------------------------------
  // Session Performance (Fully dynamic, no mock hash)
  // -------------------------------------------------------------
  const sessionBuckets: Record<string, { trade: Trade; r: number }[]> = {
    london: [],
    ny: [],
    asia: [],
    overlap: []
  };

  sortedTrades.forEach((t, idx) => {
    const tradeR = tradeRValues[idx] || 0;
    const notesLower = (t.notes || '').toLowerCase();

    let assignedLondon = false;
    let assignedNY = false;
    let assignedAsia = false;
    let assignedOverlap = false;

    if (t.session) {
      if (t.session === 'London') {
        assignedLondon = true;
      } else if (t.session === 'New York') {
        assignedNY = true;
      } else if (t.session === 'Asia') {
        assignedAsia = true;
      } else if (t.session === 'London / New York Overlap') {
        assignedOverlap = true;
        assignedLondon = true;
        assignedNY = true;
      }
    } else {
      // Check if notes explicitly declare a session
      const hasLondonTag = notesLower.includes('#london') || notesLower.includes('session: london');
      const hasNYTag = notesLower.includes('#ny') || notesLower.includes('#newyork') || notesLower.includes('session: ny');
      const hasAsiaTag = notesLower.includes('#asia') || notesLower.includes('#tokyo') || notesLower.includes('session: asia');

      const hour = extractTradeHour(t.date);

      assignedLondon = hasLondonTag || (hour >= 8 && hour < 16);
      assignedNY = hasNYTag || (hour >= 13 && hour < 21);
      assignedAsia = hasAsiaTag || (hour >= 0 && hour < 8) || (hour >= 21 && hour < 24);
      assignedOverlap = (hour >= 13 && hour < 16) || (hasLondonTag && hasNYTag);

      // Fallback if boundary
      if (!assignedLondon && !assignedNY && !assignedAsia) {
        if (hour >= 8 && hour < 17) assignedLondon = true;
        else if (hour >= 13 && hour < 22) assignedNY = true;
        else assignedAsia = true;
      }
    }

    if (assignedLondon) sessionBuckets.london.push({ trade: t, r: tradeR });
    if (assignedNY) sessionBuckets.ny.push({ trade: t, r: tradeR });
    if (assignedAsia) sessionBuckets.asia.push({ trade: t, r: tradeR });
    if (assignedOverlap) sessionBuckets.overlap.push({ trade: t, r: tradeR });
  });

  const buildSessionStats = (
    name: string, 
    id: string, 
    hours: string, 
    list: { trade: Trade; r: number }[], 
    iconName: 'asia' | 'london' | 'ny' | 'overlap'
  ) => {
    const count = list.length;
    const sessionWins = list.filter(item => item.trade.result === 'Win');
    const sessionLosses = list.filter(item => item.trade.result === 'Loss');
    const sWinRate = count > 0 ? (sessionWins.length / count) * 100 : 0;
    const sPnL = list.reduce((s, item) => s + item.trade.pnl, 0);
    const sWon = sessionWins.reduce((s, item) => s + item.trade.pnl, 0);
    const sLost = Math.abs(sessionLosses.reduce((s, item) => s + item.trade.pnl, 0));
    const sPF = sLost > 0 ? sWon / sLost : sWon > 0 ? Infinity : 0;
    const sR = count > 0 ? list.reduce((sum, item) => sum + item.r, 0) / count : 0;

    return {
      name,
      id,
      hours,
      trades: count,
      wins: sessionWins.length,
      winRate: Number(sWinRate.toFixed(1)),
      pnl: Number(sPnL.toFixed(2)),
      avgR: Number(sR.toFixed(2)),
      profitFactor: sPF,
      iconName
    };
  };

  const sessions = [
    buildSessionStats('London Session', 'london', '08:00 - 16:00 UTC', sessionBuckets.london, 'london'),
    buildSessionStats('New York Session', 'ny', '13:00 - 21:00 UTC', sessionBuckets.ny, 'ny'),
    buildSessionStats('Asia Session', 'asia', '00:00 - 08:00 UTC', sessionBuckets.asia, 'asia'),
    buildSessionStats('London / NY Overlap', 'overlap', '13:00 - 16:00 UTC', sessionBuckets.overlap, 'overlap'),
  ];

  // -------------------------------------------------------------
  // Instrument / Symbol Performance
  // -------------------------------------------------------------
  const symbolMap: Record<string, { trade: Trade; r: number }[]> = {};
  sortedTrades.forEach((t, idx) => {
    let sym = (t.symbol || 'OTHER').trim().toUpperCase();
    // Normalize clean symbol: e.g. EUR/USD -> EURUSD
    sym = sym.replace(/[\/\s_-]/g, '');
    if (!symbolMap[sym]) symbolMap[sym] = [];
    symbolMap[sym].push({ trade: t, r: tradeRValues[idx] || 0 });
  });

  const instrumentStats = Object.keys(symbolMap).map(symbol => {
    const symItems = symbolMap[symbol];
    const sCount = symItems.length;
    const sWins = symItems.filter(i => i.trade.result === 'Win');
    const sLosses = symItems.filter(i => i.trade.result === 'Loss');
    const sWinRate = sCount > 0 ? (sWins.length / sCount) * 100 : 0;
    const sPnL = symItems.reduce((s, i) => s + i.trade.pnl, 0);
    const sWonAmount = sWins.reduce((s, i) => s + i.trade.pnl, 0);
    const sLostAmount = Math.abs(sLosses.reduce((s, i) => s + i.trade.pnl, 0));
    const sPF = sLostAmount > 0 ? sWonAmount / sLostAmount : sWonAmount > 0 ? Infinity : 0;
    const sAvgR = sCount > 0 ? symItems.reduce((sum, i) => sum + i.r, 0) / sCount : 0;
    const pnls = symItems.map(i => i.trade.pnl);

    return {
      symbol,
      trades: sCount,
      wins: sWins.length,
      losses: sLosses.length,
      winRate: Number(sWinRate.toFixed(1)),
      pnl: Number(sPnL.toFixed(2)),
      avgR: Number(sAvgR.toFixed(2)),
      profitFactor: sPF,
      bestTrade: Math.max(...pnls),
      worstTrade: Math.min(...pnls),
    };
  }).sort((a, b) => b.pnl - a.pnl);

  // -------------------------------------------------------------
  // Strategy / Tag Performance
  // -------------------------------------------------------------
  const strategyMap: Record<string, { trade: Trade; r: number }[]> = {};
  let foundAnyStrategy = false;

  sortedTrades.forEach((t, idx) => {
    const rVal = tradeRValues[idx] || 0;
    const foundStrategiesForTrade: string[] = [];

    // Check optional direct strategy field
    if ((t as any).strategy) {
      foundStrategiesForTrade.push(String((t as any).strategy).trim());
    }

    if (t.notes) {
      // Find all hashtags: #Breakout, #FVG, #OrderBlock
      const hashtagMatches = t.notes.matchAll(/#([a-zA-Z0-9_-]+)/g);
      for (const match of hashtagMatches) {
        if (match[1] && !['london', 'ny', 'asia', 'overlap'].includes(match[1].toLowerCase())) {
          foundStrategiesForTrade.push(match[1]);
        }
      }

      // Check Strategy: or Setup:
      const setupMatch = t.notes.match(/(?:strategy|setup)\s*:\s*([^\n,]+)/i);
      if (setupMatch && setupMatch[1]) {
        foundStrategiesForTrade.push(setupMatch[1].trim().slice(0, 24));
      }
    }

    if (foundStrategiesForTrade.length > 0) {
      foundAnyStrategy = true;
      const uniqueTags = Array.from(new Set(foundStrategiesForTrade));
      uniqueTags.forEach(tag => {
        if (!strategyMap[tag]) strategyMap[tag] = [];
        strategyMap[tag].push({ trade: t, r: rVal });
      });
    }
  });

  const strategyStats = Object.keys(strategyMap).map(strat => {
    const sItems = strategyMap[strat];
    const sWins = sItems.filter(i => i.trade.result === 'Win');
    const sLosses = sItems.filter(i => i.trade.result === 'Loss');
    const sWinRate = (sWins.length / sItems.length) * 100;
    const sPnL = sItems.reduce((s, i) => s + i.trade.pnl, 0);
    const sWonAmount = sWins.reduce((s, i) => s + i.trade.pnl, 0);
    const sLostAmount = Math.abs(sLosses.reduce((s, i) => s + i.trade.pnl, 0));
    const sPF = sLostAmount > 0 ? sWonAmount / sLostAmount : sWonAmount > 0 ? Infinity : 0;
    const sAvgR = sItems.reduce((sum, i) => sum + i.r, 0) / sItems.length;

    return {
      strategy: strat,
      trades: sItems.length,
      wins: sWins.length,
      losses: sLosses.length,
      winRate: Number(sWinRate.toFixed(1)),
      pnl: Number(sPnL.toFixed(2)),
      avgR: Number(sAvgR.toFixed(2)),
      profitFactor: sPF,
    };
  }).sort((a, b) => b.pnl - a.pnl);

  // -------------------------------------------------------------
  // Goals & Consistency
  // -------------------------------------------------------------
  const daysUnder3Trades = Object.values(dayGroups).filter(list => list.length <= 3).length;
  const targetDisciplinePct = activeDaysCount > 0 ? Math.round((daysUnder3Trades / activeDaysCount) * 100) : 100;

  // Max daily loss guard: no day lost > 5% of starting balance
  const maxAllowedDailyLoss = startingBalance * 0.05;
  let dailyLossBreachedCount = 0;
  Object.values(dayGroups).forEach(list => {
    const dayPnL = list.reduce((sum, t) => sum + t.pnl, 0);
    if (dayPnL < -maxAllowedDailyLoss) {
      dailyLossBreachedCount += 1;
    }
  });
  const maxDailyLossRespected = dailyLossBreachedCount === 0;

  // RR discipline: winning trades with rr >= 1.5 or pnl >= avgLoss * 1.5
  const disciplinedWins = wins.filter(t => {
    if (t.rr && t.rr >= 1.5) return true;
    if (avgLoss > 0 && t.pnl >= avgLoss * 1.5) return true;
    return false;
  }).length;
  const rrDisciplinePct = winningTrades > 0 ? Math.round((disciplinedWins / winningTrades) * 100) : (totalTrades === 0 ? 100 : 0);

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate: Number(winRate.toFixed(1)),
    lossRate: Number(lossRate.toFixed(1)),
    netPnL: Number(netPnL.toFixed(2)),
    totalWon: Number(totalWon.toFixed(2)),
    totalLost: Number(totalLost.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    profitFactor,
    expectancy: Number(expectancy.toFixed(2)),
    avgWinLossRatio: Number(avgWinLossRatio.toFixed(2)),
    maxDrawdownDollar: Number(maxDrawdownDollar.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
    currentDrawdownDollar: Number(currentDrawdownDollar.toFixed(2)),
    currentDrawdownPercent: Number(currentDrawdownPercent.toFixed(2)),
    avgDrawdownDollar: Number(avgDrawdownDollar.toFixed(2)),
    recoveryTradesCount: maxDrawdownLength,
    drawdownCurve,
    totalR,
    avgR,
    bestR,
    worstR,
    rDistribution,
    avgRiskPercent,
    maxRiskPercent,
    largestWin: Number(largestWin.toFixed(2)),
    largestLoss: Number(largestLoss.toFixed(2)),
    disciplineScore,
    tradesPerDay,
    activeDaysCount,
    bestDayOfWeek,
    worstDayOfWeek,
    dayOfWeekData,
    longPerformance,
    shortPerformance,
    sessions,
    instrumentStats,
    strategyStats,
    hasStrategyData: foundAnyStrategy,
    targetDisciplinePct,
    maxDailyLossRespected,
    rrDisciplinePct,
  };
}

// -------------------------------------------------------------
// UI COMPONENTS FOR ANALYTICS PAGE
// -------------------------------------------------------------

// 1. Performance Overview Grid
export function PerformanceOverviewSection({ stats }: { stats: AnalyticsStats }) {
  const isProfitable = stats.netPnL >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          Performance Overview
        </h2>
        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
          {stats.totalTrades} Real Trades Logged
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
        {/* Net P&L */}
        <Card className="hover:shadow-md transition-all duration-200 col-span-2 sm:col-span-1 xl:col-span-2">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Net P&L</span>
              <div className={`p-1.5 rounded-lg ${isProfitable ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {isProfitable ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              </div>
            </div>
            <p className={`text-xl sm:text-2xl font-black tracking-tight ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isProfitable ? '+' : '-'}${Math.abs(stats.netPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
              <span>Won: <span className="text-emerald-500 font-bold">+${stats.totalWon.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
              <span>Lost: <span className="text-rose-500 font-bold">-${stats.totalLost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
            </div>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Win Rate</span>
              <Target className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {stats.winRate}%
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-semibold">
              <span className="text-emerald-500">{stats.winningTrades}W</span> / <span className="text-rose-500">{stats.losingTrades}L</span>
            </p>
          </CardContent>
        </Card>

        {/* Total Trades */}
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Trades</span>
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {stats.totalTrades}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {stats.breakevenTrades > 0 ? `${stats.breakevenTrades} Break Even` : 'Completed trades'}
            </p>
          </CardContent>
        </Card>

        {/* Profit Factor */}
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Profit Factor</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className={`text-xl sm:text-2xl font-black tracking-tight ${stats.profitFactor >= 1.5 || stats.profitFactor === Infinity ? 'text-emerald-600 dark:text-emerald-400' : stats.profitFactor >= 1.0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatProfitFactor(stats.profitFactor)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {stats.profitFactor === Infinity ? 'All Winning Trades' : stats.profitFactor >= 1 ? 'Profitable' : stats.totalTrades === 0 ? 'No Trades' : 'Unprofitable'}
            </p>
          </CardContent>
        </Card>

        {/* Average Win */}
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Avg Win</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              +${stats.avgWin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Per winning trade</p>
          </CardContent>
        </Card>

        {/* Average Loss */}
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Avg Loss</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              -${stats.avgLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Per losing trade</p>
          </CardContent>
        </Card>

        {/* Expectancy */}
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Expectancy</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className={`text-xl sm:text-2xl font-black tracking-tight ${stats.expectancy >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {stats.expectancy >= 0 ? '+' : '-'}${Math.abs(stats.expectancy).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Expected EV/trade</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 3. Drawdown Analysis Section
export function DrawdownSection({ stats }: { stats: AnalyticsStats }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            Drawdown Analysis & Curve
          </CardTitle>
          <span className="text-xs text-gray-400 dark:text-slate-400">Peak-to-trough risk analytics</span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Drawdown Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Maximum Drawdown</p>
            <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
              -${stats.maxDrawdownDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-gray-400 font-semibold">{stats.maxDrawdownPercent.toFixed(2)}% of equity</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Current Drawdown</p>
            <p className={`text-base sm:text-lg font-black ${stats.currentDrawdownDollar === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
              {stats.currentDrawdownDollar === 0 ? '$0.00 (At Peak)' : `-$${stats.currentDrawdownDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
            <p className="text-[11px] text-gray-400 font-semibold">{stats.currentDrawdownPercent.toFixed(2)}% off peak</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Average Drawdown</p>
            <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
              -${stats.avgDrawdownDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-gray-400">Average pullback</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Recovery Time</p>
            <p className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
              {stats.recoveryTradesCount} Trades
            </p>
            <p className="text-[11px] text-gray-400">Max drawdown duration</p>
          </div>
        </div>

        {/* Drawdown Curve (Underwater Chart) */}
        <div className="h-[210px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={stats.drawdownCurve} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <defs>
                <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} dy={5} />
              <YAxis 
                stroke="#64748B" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(v) => v === 0 ? '$0' : `-$${Math.abs(v)}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#111722] border border-[#1E293B] p-2.5 rounded-lg shadow-xl text-xs space-y-1 z-50">
                        <p className="text-gray-400 font-medium">{data.date} ({data.name})</p>
                        <p className="text-rose-400 font-bold">
                          Drawdown: -${Math.abs(data.drawdown).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({Math.abs(data.drawdownPct).toFixed(2)}%)
                        </p>
                        <p className="text-gray-300 text-[11px]">
                          Balance: ${data.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Peak: ${data.peak.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="drawdown" 
                stroke="#EF4444" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#drawdownGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// 4. R-Multiple Analysis Section
export function RMultipleSection({ stats }: { stats: AnalyticsStats }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            R-Multiple Analysis & Distribution
          </CardTitle>
          <span className="text-xs text-gray-400 dark:text-slate-400">Risk-adjusted return tracking</span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* R-Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Average R</p>
            <p className={`text-base sm:text-lg font-black ${stats.avgR >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-500'}`}>
              {stats.avgR >= 0 ? '+' : ''}{stats.avgR}R
            </p>
            <p className="text-[11px] text-gray-400">Per trade return</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total R</p>
            <p className={`text-base sm:text-lg font-black ${stats.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {stats.totalR >= 0 ? '+' : ''}{stats.totalR}R
            </p>
            <p className="text-[11px] text-gray-400">Accumulated R units</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Best Trade R</p>
            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
              +{stats.bestR}R
            </p>
            <p className="text-[11px] text-gray-400">Largest winning trade</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Worst Trade R</p>
            <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
              {stats.worstR}R
            </p>
            <p className="text-[11px] text-gray-400">Maximum risk loss</p>
          </div>
        </div>

        {/* Distribution Bar Chart */}
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 mb-2">Trade Count by R-Multiple Band</p>
          <div className="h-[180px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={stats.rDistribution} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="band" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #1E293B', 
                    backgroundColor: '#111722',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val} Trades`, 'Frequency']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.rDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-r-${index}`} 
                      fill={entry.isPositive ? '#8B5CF6' : '#EF4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 6. Trading Behavior Section (Day of Week Performance)
export function TradingBehaviorSection({ stats }: { stats: AnalyticsStats }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Trading Behavior & Days
          </CardTitle>
          <span className="text-xs text-gray-400 dark:text-slate-400">
            Avg {stats.tradesPerDay} Trades/Day
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40">
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-0.5">Best Trading Day</p>
            <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{stats.bestDayOfWeek.day}</p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-bold">
              {stats.bestDayOfWeek.count > 0 
                ? `${stats.bestDayOfWeek.pnl >= 0 ? '+' : '-'}$${Math.abs(stats.bestDayOfWeek.pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${stats.bestDayOfWeek.count} trades)`
                : 'No trades yet'}
            </p>
          </div>

          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200/50 dark:border-rose-800/40">
            <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider mb-0.5">Worst Trading Day</p>
            <p className="text-base font-black text-rose-600 dark:text-rose-400">{stats.worstDayOfWeek.day}</p>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-bold">
              {stats.worstDayOfWeek.count > 0
                ? `${stats.worstDayOfWeek.pnl >= 0 ? '+' : '-'}$${Math.abs(stats.worstDayOfWeek.pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${stats.worstDayOfWeek.count} trades)`
                : 'No trades yet'}
            </p>
          </div>
        </div>

        {/* Weekday Matrix Bars */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 dark:text-slate-300">Weekday Performance Matrix</p>
          <div className="space-y-2">
            {stats.dayOfWeekData.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#182030] text-xs">
                <span className="font-bold text-gray-700 dark:text-slate-300 w-10">{d.shortDay}</span>
                <span className="text-gray-400 w-16 text-center">{d.trades} Trades</span>
                <span className="text-gray-500 dark:text-slate-400 w-16 text-center font-semibold">
                  {d.trades > 0 ? `${d.winRate}% WR` : '-'}
                </span>
                <span className={`font-black w-24 text-right ${d.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {d.trades > 0 
                    ? `${d.pnl >= 0 ? '+' : '-'}$${Math.abs(d.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                    : '$0.00'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Directional Bias Section (Long vs Short)
export function DirectionalBiasSection({ stats }: { stats: AnalyticsStats }) {
  const totalLongShort = stats.longPerformance.trades + stats.shortPerformance.trades;
  const longPct = totalLongShort > 0 ? (stats.longPerformance.trades / totalLongShort) * 100 : 50;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-500" />
            Directional Bias (Long vs Short)
          </CardTitle>
          <span className="text-xs text-gray-400 dark:text-slate-400">Position type efficiency</span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Visual distribution bar */}
        <div>
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="text-blue-600 dark:text-blue-400">Longs ({stats.longPerformance.trades})</span>
            <span className="text-indigo-600 dark:text-indigo-400">Shorts ({stats.shortPerformance.trades})</span>
          </div>
          <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-[#182030] overflow-hidden flex">
            <div 
              className="h-full bg-blue-500 transition-all duration-500" 
              style={{ width: `${longPct}%` }}
            />
            <div 
              className="h-full bg-indigo-500 transition-all duration-500" 
              style={{ width: `${100 - longPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Long Card */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">BUY (Long)</span>
              <span className="text-xs font-bold text-gray-600 dark:text-slate-300">{stats.longPerformance.trades} Trades</span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Net P&L</p>
              <p className={`text-base sm:text-lg font-black ${stats.longPerformance.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {stats.longPerformance.pnl >= 0 ? '+' : '-'}${Math.abs(stats.longPerformance.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-blue-100 dark:border-blue-900/40">
              <span className="text-gray-500 dark:text-slate-400">Win Rate:</span>
              <span className="font-bold text-gray-900 dark:text-white">{stats.longPerformance.winRate.toFixed(1)}%</span>
            </div>
          </div>

          {/* Short Card */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">SELL (Short)</span>
              <span className="text-xs font-bold text-gray-600 dark:text-slate-300">{stats.shortPerformance.trades} Trades</span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Net P&L</p>
              <p className={`text-base sm:text-lg font-black ${stats.shortPerformance.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {stats.shortPerformance.pnl >= 0 ? '+' : '-'}${Math.abs(stats.shortPerformance.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
              <span className="text-gray-500 dark:text-slate-400">Win Rate:</span>
              <span className="font-bold text-gray-900 dark:text-white">{stats.shortPerformance.winRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 7. Session Performance Section
export function SessionPerformanceSection({ stats }: { stats: AnalyticsStats }) {
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
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            Trading Sessions Performance
          </CardTitle>
          <span className="text-xs text-gray-400 dark:text-slate-400">Global market session breakdown</span>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.sessions.map((session, idx) => (
            <div 
              key={idx} 
              className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800 space-y-2.5 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-[#111722] shadow-xs border border-gray-200/50 dark:border-slate-700/50">
                    {getSessionIcon(session.id)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{session.name}</h4>
                    <p className="text-[10px] text-gray-400">{session.hours}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-md bg-gray-200/60 dark:bg-slate-800">
                  {session.trades} trades
                </span>
              </div>

              <div className="pt-1.5 border-t border-gray-200/60 dark:border-slate-700/60 flex items-baseline justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Net P&L</p>
                  <p className={`text-base font-black ${session.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {session.trades > 0 
                      ? `${session.pnl >= 0 ? '+' : '-'}$${Math.abs(session.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                      : '$0.00'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Win Rate</p>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {session.trades > 0 ? `${session.winRate}%` : '0%'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                <span>Avg R: <span className="font-bold text-purple-600 dark:text-purple-400">{session.trades > 0 ? `${session.avgR >= 0 ? '+' : ''}${session.avgR}R` : '0R'}</span></span>
                <span>Wins: <span className="font-bold text-emerald-500">{session.wins}</span></span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 8. Instrument Performance Table
export function InstrumentPerformanceSection({ stats }: { stats: AnalyticsStats }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-500" />
            Performance by Instrument / Symbol
          </CardTitle>
          <span className="text-xs text-gray-400 dark:text-slate-400">
            {stats.instrumentStats.length} Unique Symbols Detected
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-2 p-0 sm:p-4">
        {stats.instrumentStats.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-xs">
            No instrument data yet. Log trades with symbols (e.g., XAUUSD, EURUSD, US30) to see performance breakdowns.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-[#182030] text-gray-500 dark:text-slate-400 border-b border-gray-200/80 dark:border-slate-800 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3 text-center">Trades</th>
                  <th className="px-4 py-3 text-center">Win Rate</th>
                  <th className="px-4 py-3 text-right">Net P&L</th>
                  <th className="px-4 py-3 text-center">Avg R</th>
                  <th className="px-4 py-3 text-center">Profit Factor</th>
                  <th className="px-4 py-3 text-right">Best / Worst</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                {stats.instrumentStats.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-[#182030]/60 transition-colors">
                    <td className="px-4 py-3 font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-[#182030] text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-black">
                        {item.symbol.substring(0, 2).toUpperCase()}
                      </span>
                      {item.symbol}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-300 font-semibold">
                      {item.trades} <span className="text-[10px] text-gray-400 font-normal">({item.wins}W / {item.losses}L)</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-12 bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${item.winRate}%` }} />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">{item.winRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black">
                      <span className={item.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {item.pnl >= 0 ? '+' : '-'}${Math.abs(item.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-purple-600 dark:text-purple-400">
                      {item.avgR >= 0 ? '+' : ''}{item.avgR}R
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300">
                      {formatProfitFactor(item.profitFactor)}
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] whitespace-nowrap font-semibold">
                      <span className="text-emerald-500 font-bold">
                        {item.bestTrade >= 0 ? '+' : '-'}${Math.abs(item.bestTrade).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-gray-400 mx-1.5 font-normal">/</span>
                      {item.losses > 0 || item.worstTrade < 0 ? (
                        <span className="text-rose-500 font-bold">
                          -${Math.abs(item.worstTrade).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500 font-normal">
                          $0.00
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 9. Strategy Performance Section
export function StrategyPerformanceSection({ stats }: { stats: AnalyticsStats }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" />
            Strategy & Setup Performance
          </CardTitle>
          <span className="text-xs text-gray-400 dark:text-slate-400">Tagged setups analysis</span>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!stats.hasStrategyData ? (
          <div className="p-8 rounded-xl bg-gray-50/70 dark:bg-[#182030]/50 border border-dashed border-gray-200 dark:border-slate-800 text-center space-y-2">
            <Tag className="w-8 h-8 text-gray-400 mx-auto" />
            <h4 className="text-sm font-bold text-gray-700 dark:text-slate-200">No strategy data yet</h4>
            <p className="text-xs text-gray-400 dark:text-slate-400 max-w-md mx-auto">
              Tag your trade notes with hashtags (e.g. <code className="bg-gray-200 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-500">#Breakout</code>, <code className="bg-gray-200 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-500">#FVG</code>, <code className="bg-gray-200 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-500">#OrderBlock</code>) to automatically track and rank strategy profitability.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-[#182030] text-gray-500 dark:text-slate-400 border-b border-gray-200/80 dark:border-slate-800 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Strategy / Setup</th>
                  <th className="px-4 py-3 text-center">Trades</th>
                  <th className="px-4 py-3 text-center">Win Rate</th>
                  <th className="px-4 py-3 text-right">Net P&L</th>
                  <th className="px-4 py-3 text-center">Avg R</th>
                  <th className="px-4 py-3 text-center">Profit Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                {stats.strategyStats.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-[#182030]/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/50 dark:border-indigo-800/50">
                        #{item.strategy}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-300 font-semibold">
                      {item.trades} <span className="text-[10px] text-gray-400 font-normal">({item.wins}W / {item.losses}L)</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">{item.winRate}%</td>
                    <td className="px-4 py-3 text-right font-black">
                      <span className={item.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {item.pnl >= 0 ? '+' : '-'}${Math.abs(item.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-purple-600 dark:text-purple-400">
                      {item.avgR >= 0 ? '+' : ''}{item.avgR}R
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-slate-300">
                      {formatProfitFactor(item.profitFactor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
