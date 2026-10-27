import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, RefreshCw, CheckCircle, X, AlertTriangle, Wallet, Clock, XCircle, ArrowUpRight } from 'lucide-react';
import { adminApi, type PayoutRecord } from '../../services/adminApi';

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectModal, setRejectModal] = useState<PayoutRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    try {
      const res = await adminApi.getPayouts(statusFilter);
      setPayouts(res.payouts || []);
      setSummary(res.summary || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await adminApi.approvePayout(id);
      showToast('✅ Payout approved!');
      load();
    } catch { showToast('❌ Action failed'); }
    finally { setActionLoading(''); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal._id);
    try {
      await adminApi.rejectPayout(rejectModal._id, rejectReason || 'No reason provided');
      showToast('🚫 Payout rejected');
      setRejectModal(null);
      setRejectReason('');
      load();
    } catch { showToast('❌ Action failed'); }
    finally { setActionLoading(''); }
  };

  const statusBadge = (s: string) => ({
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  }[s] || 'bg-slate-500/10 text-slate-400 border-slate-500/20');

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl bg-[#0D1120] border border-white/10 shadow-2xl text-sm font-semibold text-white">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            Payout Management
          </motion.h1>
          <p className="text-sm text-slate-500 mt-1 ml-[52px]">Review, approve, and manage trader payout requests.</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-slate-300 transition-all active:scale-95">
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Paid Out', value: `$${(summary.totalPaidOut || 0).toLocaleString()}`, icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500' },
          { label: 'Pending', value: summary.pendingCount || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500' },
          { label: 'Approved', value: summary.approvedCount || 0, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500' },
          { label: 'Rejected', value: summary.rejectedCount || 0, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="relative overflow-hidden rounded-2xl bg-[#0D1120] border border-white/6 p-4 group hover:border-white/12 transition-all">
              <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity ${s.bg}`} />
              <div className={`w-8 h-8 rounded-xl ${s.bg}/10 flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</div>
              <div className="text-2xl font-black text-white mt-0.5">{s.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'Pending', 'Approved', 'Completed', 'Rejected'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
              statusFilter === f
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                : 'bg-white/3 text-slate-500 border-white/6 hover:bg-white/6 hover:text-slate-300'
            }`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Payouts list */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" /></div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-20">
            <DollarSign className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No payout records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/3">
            {payouts.map((p, i) => (
              <motion.div key={p._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 hover:bg-white/2 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{p.userName || 'Trader'}</p>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${statusBadge(p.status)}`}>{p.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{p.accountName} · {p.broker}</p>
                    {p.rejectionReason && (
                      <p className="text-[10px] text-rose-400 mt-1">Reason: {p.rejectionReason}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-12 sm:ml-0">
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-400">${p.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500">{new Date(p.date).toLocaleDateString()}</p>
                  </div>

                  {p.status === 'Pending' && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleApprove(p._id)} disabled={actionLoading === p._id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold transition-all">
                        {actionLoading === p._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Approve
                      </button>
                      <button onClick={() => setRejectModal(p)} disabled={actionLoading === p._id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition-all">
                        <XCircle className="w-3 h-3" />Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setRejectModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#0D1120] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
                <h3 className="font-bold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400" />Reject Payout</h3>
                <button onClick={() => setRejectModal(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-all"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-slate-400">Rejecting <span className="text-white font-semibold">${rejectModal.amount.toLocaleString()}</span> payout for <span className="text-white font-semibold">{rejectModal.userName}</span>.</p>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection (optional)..."
                  rows={3}
                  className="w-full bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/40 transition-all resize-none" />
                <div className="flex gap-3">
                  <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 rounded-xl border border-white/8 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                  <button onClick={handleReject} disabled={actionLoading !== ''}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm font-semibold transition-all">
                    {actionLoading ? 'Processing...' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
