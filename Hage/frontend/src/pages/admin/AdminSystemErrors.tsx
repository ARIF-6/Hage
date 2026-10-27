import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Clock,
  RefreshCw, X, ShieldAlert, FileText, Check,
  Search, Shield, Terminal, ArrowUpRight
} from 'lucide-react';
import { adminApi, type SystemErrorItem } from '../../services/adminApi';

export default function AdminSystemErrors() {
  const [errors, setErrors] = useState<SystemErrorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Investigation modal state
  const [activeError, setActiveError] = useState<SystemErrorItem | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [bulkResolving, setBulkResolving] = useState(false);

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSystemErrors(typeFilter, statusFilter);
      setErrors(res);
    } catch (err) {
      console.error('Error fetching system errors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [typeFilter, statusFilter]);

  const handleOpenInspect = (item: SystemErrorItem) => {
    setActiveError(item);
    setAdminNotes(item.adminNotes || '');
    setSaveSuccess(false);
  };

  const handleQuickResolve = async (id: string) => {
    try {
      await adminApi.resolveSystemError(id, 'Resolved', 'Marked resolved by administrator');
      fetchErrors();
    } catch (err) {
      console.error('Error resolving error:', err);
    }
  };

  const handleResolveAll = async () => {
    setBulkResolving(true);
    try {
      await adminApi.resolveAllSystemErrors('Resolved', 'Bulk resolved: JSON parsing & endpoint safeguards verified');
      await fetchErrors();
    } catch (err) {
      console.error('Error bulk resolving:', err);
    } finally {
      setBulkResolving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'Unresolved' | 'Investigating' | 'Resolved') => {
    if (!activeError) return;
    setActionLoading(true);
    try {
      await adminApi.resolveSystemError(activeError._id, newStatus, adminNotes);
      setActiveError({ ...activeError, status: newStatus, adminNotes });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      fetchErrors();
    } catch (err) {
      console.error('Error updating system error status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered errors
  const filtered = errors.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.description?.toLowerCase().includes(q) ||
      e.errorType?.toLowerCase().includes(q) ||
      e.endpoint?.toLowerCase().includes(q)
    );
  });

  const unresolvedCount = errors.filter(e => e.status === 'Unresolved').length;
  const investigatingCount = errors.filter(e => e.status === 'Investigating').length;
  const resolvedCount = errors.filter(e => e.status === 'Resolved').length;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            System Error Diagnostics
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
              {unresolvedCount} Unresolved
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time backend exception tracking, database issues, and API error logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unresolvedCount > 0 && (
            <button
              onClick={handleResolveAll}
              disabled={bulkResolving}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{bulkResolving ? 'Resolving...' : `Resolve All (${unresolvedCount})`}</span>
            </button>
          )}

          <button
            onClick={fetchErrors}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Error Log</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Errors Logged', val: errors.length, icon: ShieldAlert, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Unresolved Errors', val: unresolvedCount, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Investigating', val: investigatingCount, icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Resolved Exceptions', val: resolvedCount, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
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
        {/* Type and status filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold custom-scrollbar">
          {(['all', 'Unresolved', 'Investigating', 'Resolved'] as const).map((st) => {
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/3 hover:bg-white/6 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{st === 'all' ? 'All Statuses' : st}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search error description or endpoint..."
            className="w-full bg-[#0D1120] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all"
          />
        </div>
      </div>

      {/* Error Table Card */}
      <div className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/6 bg-white/2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Error Type</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Endpoint</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Scanning error diagnostic records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No system errors match the current criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((err, idx) => (
                  <motion.tr
                    key={err._id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-white/2 transition-colors group"
                  >
                    {/* Error Type */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {err.errorType}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1 max-w-[340px]">
                        {err.description}
                      </p>
                    </td>

                    {/* Endpoint */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {err.endpoint || 'Internal Worker'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        err.status === 'Unresolved' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        err.status === 'Investigating' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          err.status === 'Unresolved' ? 'bg-rose-400' :
                          err.status === 'Investigating' ? 'bg-indigo-400' : 'bg-emerald-400'
                        }`} />
                        {err.status}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(err.date).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {err.status !== 'Resolved' && (
                          <button
                            onClick={() => handleQuickResolve(err._id)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            title="Mark as Resolved"
                          >
                            <Check className="w-3 h-3" />
                            <span>Resolve</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenInspect(err)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/3 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect & Resolve Error Modal */}
      <AnimatePresence>
        {activeError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0D1120] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/6 flex items-center justify-between bg-white/2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Exception Diagnostics</h3>
                    <p className="text-slate-400 text-[11px]">
                      {activeError.errorType} Exception • {new Date(activeError.date).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveError(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    Error status updated successfully!
                  </motion.div>
                )}

                {/* Exception Info */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs">Error Description</h4>
                  <div className="p-4 rounded-xl bg-white/2 border border-white/5 font-mono text-[11px] text-rose-300 whitespace-pre-wrap">
                    {activeError.description}
                  </div>
                </div>

                {/* Endpoint & Status Code */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Endpoint</span>
                    <p className="font-mono text-white text-[11px] mt-1">{activeError.endpoint || 'N/A'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/2 border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Status Code</span>
                    <p className="font-mono text-rose-400 text-[11px] mt-1 font-bold">{activeError.statusCode || 500}</p>
                  </div>
                </div>

                {/* Status Switcher Buttons */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs">Resolution Status</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Unresolved', 'Investigating', 'Resolved'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(st)}
                        disabled={actionLoading}
                        className={`p-2.5 rounded-xl font-bold border transition-all text-center ${
                          activeError.status === st
                            ? st === 'Resolved'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                              : st === 'Investigating'
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                              : 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                            : 'bg-white/2 hover:bg-white/5 border-white/6 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Resolution Notes */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs">Resolution Notes</h4>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter patch details or resolution steps..."
                    className="w-full bg-white/3 border border-white/8 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all resize-none"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleUpdateStatus(activeError.status)}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
