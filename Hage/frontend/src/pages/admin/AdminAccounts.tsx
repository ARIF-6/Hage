import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, CheckCircle2, XCircle, Shield,
  TrendingUp, Eye, RefreshCw, X, Search,
  DollarSign, Activity, AlertTriangle, Award,
  SlidersHorizontal, Check, ArrowUpRight, ArrowDownRight,
  RotateCcw
} from 'lucide-react';
import { adminApi, type AdminAccount } from '../../services/adminApi';

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'Active' | 'Passed' | 'Failed' | 'Funded' | 'Real'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection modal state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<any>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccessMsg, setStatusSuccessMsg] = useState('');

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAccounts(activeTab);
      setAccounts(res);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always clear stale admin cache so real accounts from trading store are picked up fresh
    localStorage.removeItem('hage_admin_db');
    fetchAccounts();
  }, [activeTab]);

  const handleOpenInspect = async (id: string) => {
    setSelectedAccountId(id);
    setInspectLoading(true);
    setStatusSuccessMsg('');
    try {
      const data = await adminApi.getAccountById(id);
      setInspectData(data);
    } catch (err) {
      console.error('Error fetching account details:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleIntervention = async (newStatus: 'Active' | 'Passed' | 'Failed' | 'Closed', reason?: string) => {
    if (!selectedAccountId) return;
    setUpdatingStatus(true);
    try {
      await adminApi.updateAccountStatus(selectedAccountId, newStatus, reason);
      setStatusSuccessMsg(`Account status changed to ${newStatus}`);
      const updated = await adminApi.getAccountById(selectedAccountId);
      setInspectData(updated);
      fetchAccounts();
      setTimeout(() => setStatusSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const isRealAccount = (acc: AdminAccount | undefined) => {
    return acc?.phase === 'Real Account' || acc?.accountType === 'Real Account';
  };

  // Filtered accounts
  const filtered = accounts.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.userName?.toLowerCase().includes(q) ||
      a.userEmail?.toLowerCase().includes(q) ||
      a.broker?.toLowerCase().includes(q) ||
      a.accountNumber?.toString().includes(q)
    );
  });

  // Aggregated quick stats
  const totalBalance = accounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  const activeCount = accounts.filter(a => a.status === 'Active').length;
  const passedCount = accounts.filter(a => a.status === 'Passed').length;
  const fundedCount = accounts.filter(a => a.phase === 'Funded').length;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            Account Management
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
              {accounts.length} Total
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor trader challenges, real accounts, drawdowns, and execute administrative interventions.
          </p>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('hage_admin_db');
            fetchAccounts();
          }}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 text-slate-300 hover:text-white transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Monitored Equity', val: `$${totalBalance.toLocaleString()}`, icon: DollarSign, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Active Trading', val: activeCount, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Challenge Passes', val: passedCount, icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Funded Traders', val: fundedCount, icon: Shield, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="p-4 rounded-2xl bg-[#0D1120] border border-white/6 hover:border-indigo-500/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{stat.val}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold custom-scrollbar">
          {[
            { id: 'all', label: 'All', icon: Layers },
            { id: 'Active', label: 'Active', icon: CheckCircle2 },
            { id: 'Passed', label: 'Passed', icon: Award },
            { id: 'Failed', label: 'Failed', icon: XCircle },
            { id: 'Funded', label: 'Funded', icon: Shield },
            { id: 'Real', label: 'Real', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/3 hover:bg-white/6 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts or traders..."
            className="w-full bg-[#0D1120] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all"
          />
        </div>
      </div>

      {/* Accounts List Table Card */}
      <div className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/6 bg-white/2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Account</th>
                <th className="py-3.5 px-4">Trader</th>
                <th className="py-3.5 px-4">Phase & Type</th>
                <th className="py-3.5 px-4">Broker / Platform</th>
                <th className="py-3.5 px-4">Balance & P&L</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading account records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No accounts found matching your query.
                  </td>
                </tr>
              ) : (
                filtered.map((a, idx) => {
                  const isReal = isRealAccount(a);
                  return (
                    <motion.tr
                      key={a._id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-white/2 transition-colors group"
                    >
                      {/* Account */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                            {a.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            #{a.accountNumber || '1001'}
                          </p>
                        </div>
                      </td>

                      {/* Trader */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-slate-200">{a.userName || 'Trader'}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{a.userEmail || a.user}</p>
                        </div>
                      </td>

                      {/* Phase & Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isReal
                              ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                              : 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                          }`}>
                            {isReal ? 'Real' : 'Prop Firm'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {a.phase}
                          </span>
                        </div>
                      </td>

                      {/* Broker */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {a.broker} <span className="text-slate-500">({a.platform || 'MT5'})</span>
                      </td>

                      {/* Balance & P&L */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-white tabular-nums">
                            ${Number(a.currentBalance || 0).toLocaleString()}
                          </p>
                          <p className={`text-[10px] font-semibold tabular-nums flex items-center gap-0.5 ${
                            a.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {a.netPnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {a.netPnl >= 0 ? `+$${a.netPnl.toLocaleString()}` : `-$${Math.abs(a.netPnl).toLocaleString()}`}
                            <span>({a.pnlPercent >= 0 ? `+${a.pnlPercent.toFixed(1)}%` : `${a.pnlPercent.toFixed(1)}%`})</span>
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          a.status === 'Active' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          a.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          a.status === 'Failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-white/5 text-slate-400 border border-white/10'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            a.status === 'Active' ? 'bg-indigo-400' :
                            a.status === 'Passed' ? 'bg-emerald-400' :
                            a.status === 'Failed' ? 'bg-rose-400' : 'bg-slate-400'
                          }`} />
                          {a.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenInspect(a._id)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/3 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center gap-1.5 ml-auto text-[11px] font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Details Inspector Modal */}
      <AnimatePresence>
        {selectedAccountId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0D1120] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/6 flex items-center justify-between bg-white/2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg ${
                    isRealAccount(inspectData?.account)
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                      : 'bg-gradient-to-br from-violet-600 to-indigo-700'
                  }`}>
                    {isRealAccount(inspectData?.account) ? <TrendingUp className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      {inspectData?.account?.name || 'Account Details'}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        inspectData?.account?.status === 'Active' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        inspectData?.account?.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {inspectData?.account?.status}
                      </span>
                    </h3>
                    <p className="text-slate-400 text-[11px]">
                      Trader: {inspectData?.account?.userName || 'User'} • {inspectData?.account?.broker} • {inspectData?.account?.platform || 'MT5'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAccountId(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
                {inspectLoading ? (
                  <div className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading account diagnostics...
                  </div>
                ) : (
                  <>
                    {/* Status Success Message */}
                    {statusSuccessMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-2"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        {statusSuccessMsg}
                      </motion.div>
                    )}

                    {/* Key Diagnostics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-white/2 border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Balance</span>
                        <p className="text-lg font-black text-white mt-1 tabular-nums">
                          ${Number(inspectData?.account?.currentBalance || 0).toLocaleString()}
                        </p>
                        <span className="text-[10px] text-slate-500">Starting: ${Number(inspectData?.account?.initialBalance || 0).toLocaleString()}</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/2 border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Net P&L</span>
                        <p className={`text-lg font-black mt-1 tabular-nums ${
                          (inspectData?.account?.netPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {(inspectData?.account?.netPnl || 0) >= 0 ? '+' : ''}${Number(inspectData?.account?.netPnl || 0).toLocaleString()}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {(inspectData?.account?.pnlPercent || 0).toFixed(2)}% Return
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/2 border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Profit Target</span>
                        <p className="text-lg font-black text-indigo-400 mt-1 tabular-nums">
                          ${Number(inspectData?.account?.profitTarget || 0).toLocaleString()}
                        </p>
                        <span className="text-[10px] text-slate-500">Target: {inspectData?.account?.profitTargetPercent || 10}%</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/2 border border-white/5">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Max Drawdown</span>
                        <p className="text-lg font-black text-rose-400 mt-1 tabular-nums">
                          ${Number(inspectData?.account?.maxDrawdown || 0).toLocaleString()}
                        </p>
                        <span className="text-[10px] text-slate-500">Daily: ${Number(inspectData?.account?.maxDailyDrawdown || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Breach Alert if any */}
                    {inspectData?.account?.failureReason && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-300">Account Failure Reason</p>
                          <p className="text-rose-400/90 text-[11px] mt-0.5">
                            {inspectData.account.failureReason}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Admin Action Interventions */}
                    <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                        <h4 className="font-bold text-white text-xs">Admin Interventions</h4>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Directly adjust this account's phase or status. All modifications are logged to the platform audit trail.
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          disabled={updatingStatus || inspectData?.account?.status === 'Passed'}
                          onClick={() => handleIntervention('Passed')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pass Challenge</span>
                        </button>

                        <button
                          disabled={updatingStatus || inspectData?.account?.status === 'Active'}
                          onClick={() => handleIntervention('Active')}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Re-activate / Reset</span>
                        </button>

                        <button
                          disabled={updatingStatus || inspectData?.account?.status === 'Failed'}
                          onClick={() => handleIntervention('Failed', 'Administrative Rule Breach Enforcement')}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Force Fail Account</span>
                        </button>
                      </div>
                    </div>

                    {/* Trade Records */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-white text-xs flex items-center justify-between">
                        <span>Trades Associated with Account ({inspectData?.trades?.length || 0})</span>
                      </h4>
                      {inspectData?.trades?.length === 0 ? (
                        <div className="p-4 rounded-xl bg-white/2 border border-white/5 text-center text-slate-500">
                          No trades executed on this account yet.
                        </div>
                      ) : (
                        <div className="rounded-xl border border-white/5 overflow-hidden">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="bg-white/2 text-slate-400 border-b border-white/5">
                                <th className="p-2.5">Pair</th>
                                <th className="p-2.5">Direction</th>
                                <th className="p-2.5">Lots</th>
                                <th className="p-2.5">Net P&L</th>
                                <th className="p-2.5 text-right">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/4">
                              {inspectData?.trades?.slice(0, 5).map((t: any) => (
                                <tr key={t.id || t._id} className="hover:bg-white/2">
                                  <td className="p-2.5 font-bold text-white">{t.pair}</td>
                                  <td className="p-2.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      t.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                    }`}>
                                      {t.direction}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-slate-300 tabular-nums">{t.lots}</td>
                                  <td className={`p-2.5 font-bold tabular-nums ${
                                    (t.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}>
                                    {(t.pnl || 0) >= 0 ? `+$${t.pnl}` : `-$${Math.abs(t.pnl)}`}
                                  </td>
                                  <td className="p-2.5 text-right text-slate-500">
                                    {new Date(t.date || t.openTime).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
