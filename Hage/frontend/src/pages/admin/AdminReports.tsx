import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Users, Layers, TrendingUp,
  DollarSign, CreditCard, RefreshCw, CheckCircle2,
  Award, ArrowUpRight, Download, ShieldCheck,
  Percent, ArrowDownRight, Activity
} from 'lucide-react';
import { adminApi, type AdminReportsData } from '../../services/adminApi';

export default function AdminReports() {
  const [reports, setReports] = useState<AdminReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getReports();
      setReports(res);
    } catch (err) {
      console.error('Error fetching admin reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const csvContent = "data:text/csv;charset=utf-8," + 
        "Metric Category,Metric Name,Value\n" +
        `Users,Total Users,${reports?.userStats?.totalUsers || 0}\n` +
        `Users,Active Users,${reports?.userStats?.activeUsers || 0}\n` +
        `Users,Suspended Users,${reports?.userStats?.suspendedUsers || 0}\n` +
        `Accounts,Total Accounts,${reports?.accountStats?.totalAccounts || 0}\n` +
        `Accounts,Pass Rate,${reports?.accountStats?.passRate || 0}%\n` +
        `Accounts,Funded Accounts,${reports?.accountStats?.fundedAccounts || 0}\n` +
        `Trades,Win Rate,${reports?.tradeStats?.winRate || 0}%\n` +
        `Trades,Profit Factor,${reports?.tradeStats?.profitFactor || 0}\n` +
        `Trades,Total Profit,${reports?.tradeStats?.totalProfit || 0}\n` +
        `Payouts,Total Paid Out,${reports?.payoutStats?.totalPaidOut || 0}\n` +
        `Payouts,Approved Payouts,${reports?.payoutStats?.approvedCount || 0}\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `hage_platform_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-500">Aggregating platform intelligence...</p>
        </div>
      </div>
    );
  }

  const u = reports?.userStats;
  const a = reports?.accountStats;
  const t = reports?.tradeStats;
  const s = reports?.subscriptionStats;
  const p = reports?.payoutStats;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            Platform Analytics & Intelligence
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Analytics
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Aggregated metrics across user registrations, prop firm pass rates, trade profitability, and payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 text-slate-300 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={fetchReports}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 5 Deep Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. User Growth & Demographics */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 p-5 space-y-4 hover:border-indigo-500/20 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">User Metrics</h3>
                <p className="text-[10px] text-slate-400">Account status & verification</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-400">{u?.totalUsers || 0} Registered</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Total Registered</span>
              <span className="font-black text-white text-base">{u?.totalUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Active Traders</span>
              <span className="font-black text-emerald-400 text-base">{u?.activeUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Suspended Users</span>
              <span className="font-black text-rose-400 text-base">{u?.suspendedUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Verified Email Status</span>
              <span className="font-black text-indigo-400 text-base">{u?.verifiedUsers || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* 2. Challenge & Account Performance */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 p-5 space-y-4 hover:border-indigo-500/20 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Account Performance</h3>
                <p className="text-[10px] text-slate-400">Pass rate & account distribution</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400">{a?.passRate || 0}% Pass Rate</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Total Accounts</span>
              <span className="font-black text-white text-base">{a?.totalAccounts || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Challenge Pass Rate</span>
              <div className="flex items-center gap-2">
                <span className="font-black text-emerald-400 text-base">{a?.passRate || 0}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Funded Accounts</span>
              <span className="font-black text-indigo-400 text-base">{a?.fundedAccounts || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Real Personal Accounts</span>
              <span className="font-black text-violet-400 text-base">{a?.realAccounts || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* 3. Trade Profitability & Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 p-5 space-y-4 hover:border-indigo-500/20 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Trade Intelligence</h3>
                <p className="text-[10px] text-slate-400">Aggregated trading metrics</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400">{t?.winRate || 0}% Win Rate</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Overall Win Rate</span>
              <span className="font-black text-emerald-400 text-base">{t?.winRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Profit Factor</span>
              <span className="font-black text-indigo-400 text-base">{t?.profitFactor || '1.0'}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Total Net Profit</span>
              <span className="font-black text-emerald-400 text-base">+${t?.totalProfit?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Total Executed Trades</span>
              <span className="font-black text-white text-base">{t?.totalTrades || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* 4. Subscriptions & Tier Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 p-5 space-y-4 hover:border-indigo-500/20 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Tier Distribution</h3>
                <p className="text-[10px] text-slate-400">Active membership breakdown</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Free Tier Members</span>
              <span className="font-black text-slate-300 text-base">{s?.freeCount || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Pro Subscriptions</span>
              <span className="font-black text-indigo-400 text-base">{s?.proCount || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Premium Subscriptions</span>
              <span className="font-black text-violet-400 text-base">{s?.premiumCount || 0}</span>
            </div>
          </div>
        </motion.div>

        {/* 5. Payout Distributions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 p-5 space-y-4 hover:border-indigo-500/20 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Payout Disbursements</h3>
                <p className="text-[10px] text-slate-400">Trader rewards & withdrawals</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Total Disbursed</span>
              <span className="font-black text-emerald-400 text-base">${Number(p?.totalPaidOut || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Approved Payouts Count</span>
              <span className="font-black text-indigo-400 text-base">{p?.approvedCount || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/4">
              <span className="text-slate-400">Average Payout Size</span>
              <span className="font-black text-white text-base">${Number(p?.avgPayout || 0).toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
