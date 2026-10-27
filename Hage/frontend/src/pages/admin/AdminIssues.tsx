import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LifeBuoy, CheckCircle2, Clock,
  AlertCircle, RefreshCw, X, MessageSquare,
  FileText, Save, Search, Check, AlertTriangle,
  User, Send, Mail
} from 'lucide-react';
import { adminApi, type SupportIssue } from '../../services/adminApi';

export default function AdminIssues() {
  const [issues, setIssues] = useState<SupportIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'In Progress' | 'Resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected issue for investigation modal
  const [activeIssue, setActiveIssue] = useState<SupportIssue | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getIssues(statusFilter);
      setIssues(res);
    } catch (err) {
      console.error('Error fetching support issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter]);

  const handleOpenInvestigate = (issue: SupportIssue) => {
    setActiveIssue(issue);
    setAdminNotes(issue.adminNotes || '');
    setSaveSuccess(false);
  };

  const handleStatusChange = async (newStatus: 'Open' | 'In Progress' | 'Resolved') => {
    if (!activeIssue) return;
    try {
      await adminApi.updateIssue(activeIssue._id, newStatus, adminNotes);
      setActiveIssue({ ...activeIssue, status: newStatus, adminNotes });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      fetchIssues();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeIssue) return;
    setSavingNotes(true);
    try {
      await adminApi.updateIssue(activeIssue._id, undefined, adminNotes);
      setActiveIssue({ ...activeIssue, adminNotes });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      fetchIssues();
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Filtered issues
  const filtered = issues.filter(i => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.title?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.userName?.toLowerCase().includes(q) ||
      i.userEmail?.toLowerCase().includes(q)
    );
  });

  const openCount = issues.filter(i => i.status === 'Open').length;
  const inProgressCount = issues.filter(i => i.status === 'In Progress').length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved').length;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            Support & Issue Center
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
              {issues.length} Tickets
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Resolve trader inquiries, technical complaints, and platform support tickets.
          </p>
        </div>

        <button
          onClick={fetchIssues}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 text-slate-300 hover:text-white transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Tickets</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tickets', val: issues.length, icon: LifeBuoy, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Open Issues', val: openCount, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'In Progress', val: inProgressCount, icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Resolved Tickets', val: resolvedCount, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
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
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold custom-scrollbar">
          {[
            { id: 'all', label: 'All Tickets' },
            { id: 'Open', label: 'Open', count: openCount },
            { id: 'In Progress', label: 'In Progress', count: inProgressCount },
            { id: 'Resolved', label: 'Resolved', count: resolvedCount },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/3 hover:bg-white/6 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
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
            placeholder="Search issues or users..."
            className="w-full bg-[#0D1120] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all"
          />
        </div>
      </div>

      {/* Issues Table Card */}
      <div className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/6 bg-white/2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Submitted By</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Admin Notes</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading support tickets...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No support tickets found in this category.
                  </td>
                </tr>
              ) : (
                filtered.map((issue, idx) => (
                  <motion.tr
                    key={issue._id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-white/2 transition-colors group"
                  >
                    {/* Subject */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {((issue as any).category === 'Contact Message' || issue.title?.toLowerCase().includes('contact')) && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Contact
                            </span>
                          )}
                          <p className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                            {issue.title}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {issue.description}
                        </p>
                      </div>
                    </td>

                    {/* Submitted By */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                          {(issue.userName || 'T')[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200">{issue.userName || 'Trader'}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{issue.userEmail || issue.user}</p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(issue.date || issue.createdAt).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        issue.status === 'Open' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        issue.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          issue.status === 'Open' ? 'bg-rose-400' :
                          issue.status === 'In Progress' ? 'bg-indigo-400' : 'bg-emerald-400'
                        }`} />
                        {issue.status}
                      </span>
                    </td>

                    {/* Admin Notes Preview */}
                    <td className="py-3.5 px-4">
                      <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {issue.adminNotes || '—'}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenInvestigate(issue)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/3 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center gap-1.5 ml-auto text-[11px] font-semibold"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investigation & Resolution Modal */}
      <AnimatePresence>
        {activeIssue && (
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
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <LifeBuoy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      Support Ticket Management
                    </h3>
                    <p className="text-slate-400 text-[11px]">
                      Ticket #{activeIssue._id.slice(-6).toUpperCase()} • Submitted {new Date(activeIssue.date || activeIssue.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveIssue(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
                {/* Success Alert */}
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    Ticket updated successfully!
                  </motion.div>
                )}

                {/* User Info Bar */}
                <div className="p-3.5 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">
                      {(activeIssue.userName || 'T')[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white">{activeIssue.userName || 'Trader'}</p>
                      <p className="text-[10px] text-slate-400">{activeIssue.userEmail || activeIssue.user}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeIssue.userEmail && (
                      <a
                        href={`mailto:${activeIssue.userEmail}?subject=Re: ${encodeURIComponent(activeIssue.title)}`}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Reply via Email"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Reply Email</span>
                      </a>
                    )}

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      activeIssue.status === 'Open' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      activeIssue.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {activeIssue.status}
                    </span>
                  </div>
                </div>

                {/* Issue Details */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs">Issue Description</h4>
                  <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                    <p className="font-bold text-white text-sm">{activeIssue.title}</p>
                    <p className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-wrap">
                      {activeIssue.description}
                    </p>
                  </div>
                </div>

                {/* Status Switcher Buttons */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs">Update Status</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Open', 'In Progress', 'Resolved'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`p-2.5 rounded-xl font-bold border transition-all text-center ${
                          activeIssue.status === st
                            ? st === 'Resolved'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                              : st === 'In Progress'
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
                  <h4 className="font-bold text-white text-xs flex items-center justify-between">
                    <span>Admin Resolution & Internal Notes</span>
                    <span className="text-[10px] text-slate-500 font-normal">Internal only</span>
                  </h4>
                  <textarea
                    rows={4}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter investigation notes, root cause, or resolution steps..."
                    className="w-full bg-white/3 border border-white/8 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all resize-none"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingNotes ? 'Saving Notes...' : 'Save Internal Notes'}</span>
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
