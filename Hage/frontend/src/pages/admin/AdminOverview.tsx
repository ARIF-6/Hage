import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, Layers, CheckCircle,
  XCircle, TrendingUp, DollarSign, CreditCard,
  Award, AlertCircle, RefreshCw, Shield, ArrowUpRight,
  Wallet, Activity, UserX
} from 'lucide-react';
import { adminApi, type OverviewData } from '../../services/adminApi';
import { Link } from 'react-router-dom';

// Reusable stat card
function StatCard({
  label, value, icon: Icon, color, bgGradient, delay = 0, trend
}: {
  label: string; value: string | number; icon: any; color: string;
  bgGradient: string; delay?: number; trend?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="group relative overflow-hidden rounded-2xl bg-[#0D1120] border border-white/6 hover:border-indigo-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 cursor-default"
    >
      {/* BG Glow Orb */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${bgGradient}`} />

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgGradient} bg-opacity-10 shadow-lg`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          {trend && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {trend}
            </span>
          )}
        </div>
        <div className="space-y-0.5">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-black text-white tracking-tight">{value}</div>
        </div>
      </div>
    </motion.div>
  );
}

// Activity row
function ActivityRow({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center justify-between p-3 rounded-xl bg-white/3 hover:bg-white/6 border border-white/4 hover:border-white/8 transition-all duration-200 group"
    >
      {children}
    </motion.div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await adminApi.getOverview();
      setData(res);
    } catch (err) {
      console.error('Error fetching admin overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOverview(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchOverview(); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading platform data...</p>
        </div>
      </div>
    );
  }

  const m = data?.metrics || {
    totalUsers: 0, activeUsers: 0, totalAccounts: 0, activeAccounts: 0,
    passedAccounts: 0, failedAccounts: 0, fundedAccounts: 0, realAccounts: 0,
    totalTrades: 0, totalPayoutRecords: 0, totalPaidOut: 0,
    freeUsers: 0, proUsers: 0, premiumUsers: 0
  };

  const mainStats = [
    { label: 'Total Users', value: m.totalUsers, icon: Users, color: 'text-indigo-400', bgGradient: 'bg-indigo-500' },
    { label: 'Active Users', value: m.activeUsers, icon: UserCheck, color: 'text-emerald-400', bgGradient: 'bg-emerald-500' },
    { label: 'Total Accounts', value: m.totalAccounts, icon: Layers, color: 'text-violet-400', bgGradient: 'bg-violet-500' },
    { label: 'Active Accounts', value: m.activeAccounts, icon: CheckCircle, color: 'text-blue-400', bgGradient: 'bg-blue-500' },
    { label: 'Funded Accounts', value: m.fundedAccounts, icon: Shield, color: 'text-amber-400', bgGradient: 'bg-amber-500' },
    { label: 'Passed', value: m.passedAccounts, icon: Award, color: 'text-green-400', bgGradient: 'bg-green-500' },
    { label: 'Failed', value: m.failedAccounts, icon: XCircle, color: 'text-rose-400', bgGradient: 'bg-rose-500' },
    { label: 'Total Trades', value: m.totalTrades, icon: TrendingUp, color: 'text-cyan-400', bgGradient: 'bg-cyan-500' },
    { label: 'Payout Records', value: m.totalPayoutRecords, icon: DollarSign, color: 'text-purple-400', bgGradient: 'bg-purple-500' },
    { label: 'Total Paid Out', value: `$${m.totalPaidOut.toLocaleString()}`, icon: Wallet, color: 'text-emerald-400', bgGradient: 'bg-emerald-500', trend: 'Revenue' },
  ];

  const planData = [
    { label: 'Free', count: m.freeUsers, color: 'bg-slate-500', percent: m.totalUsers > 0 ? (m.freeUsers / m.totalUsers) * 100 : 0 },
    { label: 'Pro', count: m.proUsers, color: 'bg-indigo-500', percent: m.totalUsers > 0 ? (m.proUsers / m.totalUsers) * 100 : 0 },
    { label: 'Premium', count: m.premiumUsers, color: 'bg-violet-500', percent: m.totalUsers > 0 ? (m.premiumUsers / m.totalUsers) * 100 : 0 },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-12">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-black text-white tracking-tight"
          >
            Platform Overview
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-slate-500 mt-1"
          >
            Real-time metrics across users, accounts, trades, and operations.
          </motion.p>
        </div>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 hover:border-indigo-500/30 text-slate-300 hover:text-white transition-all duration-200 active:scale-95 shadow-lg"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </motion.button>
      </div>

      {/* Main stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {mainStats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.04} />
        ))}
      </div>

      {/* Subscription breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl bg-[#0D1120] border border-white/6 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Subscription Distribution</h2>
              <p className="text-[11px] text-slate-500">{m.totalUsers} total users across all plans</p>
            </div>
          </div>
          <Link to="/admin/subscriptions" className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            Manage <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-3">
          {planData.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + i * 0.08 }}
              className="flex items-center gap-4"
            >
              <div className="w-16 text-right">
                <span className="text-xs font-semibold text-slate-400">{p.label}</span>
              </div>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${p.percent}%` }}
                  transition={{ delay: 0.7 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${p.color}`}
                />
              </div>
              <div className="w-16 flex items-center justify-between">
                <span className="text-xs font-bold text-white">{p.count}</span>
                <span className="text-[10px] text-slate-500">{p.percent.toFixed(0)}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Activity feeds — 2×2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">Recent Users</span>
            </div>
            <Link to="/admin/users" className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {(!data?.recentUserActivity || data.recentUserActivity.length === 0) ? (
              <p className="text-xs text-slate-600 py-6 text-center">No recent user activity.</p>
            ) : (
              data.recentUserActivity.map((u, i) => (
                <ActivityRow key={u.id} delay={0.65 + i * 0.05}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                      {(u.user || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white leading-none">{u.user}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                      u.action?.includes('Suspend') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                    }`}>
                      {u.action}
                    </span>
                    <p className="text-[9px] text-slate-600 mt-1">{new Date(u.date).toLocaleDateString()}</p>
                  </div>
                </ActivityRow>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold text-white">Recent Accounts</span>
            </div>
            <Link to="/admin/accounts" className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {(!data?.recentAccountActivity || data.recentAccountActivity.length === 0) ? (
              <p className="text-xs text-slate-600 py-6 text-center">No recent account activity.</p>
            ) : (
              data.recentAccountActivity.map((a, i) => (
                <ActivityRow key={a.id} delay={0.7 + i * 0.05}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-white">{a.name}</p>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-white/6 text-slate-400">{a.broker}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{a.user} · {a.phase}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                      a.status === 'Active' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15' :
                      a.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                    }`}>
                      {a.status}
                    </span>
                    <p className="text-[10px] font-bold text-white mt-1">${Number(a.currentBalance || 0).toLocaleString()}</p>
                  </div>
                </ActivityRow>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Payouts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">Recent Payouts</span>
            </div>
            <Link to="/admin/payouts" className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {(!data?.recentPayoutActivity || data.recentPayoutActivity.length === 0) ? (
              <p className="text-xs text-slate-600 py-6 text-center">No payout records.</p>
            ) : (
              data.recentPayoutActivity.map((p, i) => (
                <ActivityRow key={p.id} delay={0.75 + i * 0.05}>
                  <div>
                    <p className="text-xs font-semibold text-white">{p.user}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[160px]">{p.account}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-400">${Number(p.amount || 0).toLocaleString()}</p>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold mt-1 inline-block ${
                      (p.status === 'Approved' || p.status === 'Completed') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                      p.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </ActivityRow>
              ))
            )}
          </div>
        </motion.div>

        {/* Support Issues */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-white">Open Support Tickets</span>
            </div>
            <Link to="/admin/issues" className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Manage <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {(!data?.recentSystemIssues || data.recentSystemIssues.length === 0) ? (
              <div className="py-6 text-center">
                <CheckCircle className="w-6 h-6 text-emerald-500/40 mx-auto mb-2" />
                <p className="text-xs text-slate-600">All systems operational! No open tickets.</p>
              </div>
            ) : (
              data.recentSystemIssues.map((issue, i) => (
                <ActivityRow key={issue.id} delay={0.8 + i * 0.05}>
                  <div className="max-w-[65%]">
                    <p className="text-xs font-semibold text-white truncate">{issue.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">By {issue.user}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                      issue.status === 'Open' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                    }`}>
                      {issue.status}
                    </span>
                    <p className="text-[9px] text-slate-600 mt-1">{new Date(issue.date).toLocaleDateString()}</p>
                  </div>
                </ActivityRow>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
