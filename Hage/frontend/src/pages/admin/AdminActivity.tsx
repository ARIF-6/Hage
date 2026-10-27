import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  History, ShieldCheck, RefreshCw,
  User, CheckCircle2, FileText, AlertTriangle,
  Search, Shield, Layers, DollarSign, Filter
} from 'lucide-react';
import { adminApi, type AdminActivityLog } from '../../services/adminApi';

export default function AdminActivity() {
  const [activities, setActivities] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getActivityLogs();
      setActivities(res);
    } catch (err) {
      console.error('Error fetching admin activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filtered = activities.filter(act => {
    if (typeFilter !== 'all' && act.targetType !== typeFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      act.action?.toLowerCase().includes(q) ||
      act.details?.toLowerCase().includes(q) ||
      act.adminName?.toLowerCase().includes(q) ||
      act.targetType?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            Admin Activity Audit Log
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
              {activities.length} Recorded Actions
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Chronological, immutable audit trail recording all administrative interventions on HAGE.
          </p>
        </div>

        <button
          onClick={fetchActivities}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 text-slate-300 hover:text-white transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Target Type Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold custom-scrollbar">
          {(['all', 'User', 'Account', 'Payout', 'SupportIssue'] as const).map((t) => {
            const isSelected = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/3 hover:bg-white/6 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{t === 'all' ? 'All Activities' : t}</span>
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
            placeholder="Search action, details or admin..."
            className="w-full bg-[#0D1120] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all"
          />
        </div>
      </div>

      {/* Activity Table Card */}
      <div className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/6 bg-white/2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Admin</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Action Details</th>
                <th className="py-3.5 px-4 text-right">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading admin audit log...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No administrative actions found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((act, idx) => {
                  const isDanger = act.action?.toLowerCase().includes('suspend') || act.action?.toLowerCase().includes('reject') || act.action?.toLowerCase().includes('fail');
                  const isSuccess = act.action?.toLowerCase().includes('approv') || act.action?.toLowerCase().includes('unsuspend') || act.action?.toLowerCase().includes('pass') || act.action?.toLowerCase().includes('resolv');

                  return (
                    <motion.tr
                      key={act._id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-white/2 transition-colors group"
                    >
                      {/* Admin */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                              {act.adminName}
                            </p>
                            <p className="text-[10px] text-slate-500">{act.adminEmail}</p>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                          isDanger ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isDanger ? 'bg-rose-400' : isSuccess ? 'bg-emerald-400' : 'bg-indigo-400'
                          }`} />
                          {act.action}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4 font-semibold text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-white/4 border border-white/6 text-[10px] text-slate-300">
                          {act.targetType}
                        </span>
                      </td>

                      {/* Action Details */}
                      <td className="py-3.5 px-4 text-slate-300 max-w-md">
                        <p className="line-clamp-2">{act.details || '—'}</p>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(act.date).toLocaleString()}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
