import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Send, Users, CheckCircle, XCircle, AlertCircle,
  RefreshCw, Search, Clock, ChevronDown, X, Sparkles,
  MailCheck, Filter, UserCheck, History
} from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: token ? `Bearer ${token}` : '' } };
};

interface Recipient {
  _id: string;
  name: string;
  email: string;
  subscriptionPlan: string;
  role: string;
}

interface LogEntry {
  id: string;
  adminName: string;
  action: string;
  subject: string;
  recipientCount: number;
  failedCount: number;
  sentAt: string;
}

const planColor: Record<string, string> = {
  Premium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Pro: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Starter: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Free: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function AdminEmailNotifications() {
  // ── Form state
  const [recipientMode, setRecipientMode] = useState<'all' | 'selected'>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  // ── Recipients
  const [allUsers, setAllUsers] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // ── Send state
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    successCount?: number;
    failedCount?: number;
  } | null>(null);

  // ── History
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // Load recipients and logs
  useEffect(() => {
    loadRecipients();
    loadLogs();
  }, []);

  const loadRecipients = async () => {
    setUsersLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/email/recipients`, getAuthHeaders());
      setAllUsers(res.data);
    } catch (e) {
      console.error('Failed to load recipients:', e);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/email/logs`, getAuthHeaders());
      setLogs(res.data);
    } catch (e) {
      console.error('Failed to load logs:', e);
    } finally {
      setLogsLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch =
      !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesPlan = planFilter === 'all' || u.subscriptionPlan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map(u => u._id));
    }
  };

  const toggleUser = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!subject.trim()) { setResult({ success: false, message: 'Please enter a subject.' }); return; }
    if (!body.trim()) { setResult({ success: false, message: 'Please write your message.' }); return; }
    if (recipientMode === 'selected' && selectedIds.length === 0) {
      setResult({ success: false, message: 'Please select at least one recipient.' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const payload = {
        recipients: recipientMode,
        selectedUserIds: recipientMode === 'selected' ? selectedIds : [],
        subject: subject.trim(),
        body: body.trim(),
      };
      const res = await axios.post(`${API_BASE}/admin/email/send`, payload, getAuthHeaders());
      setResult({
        success: true,
        message: res.data.message,
        successCount: res.data.successCount,
        failedCount: res.data.failedCount,
      });
      // Refresh logs after successful send
      loadLogs();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.message || 'Failed to send emails. Please check your SMTP configuration.',
      });
    } finally {
      setSending(false);
    }
  };

  const recipientCount =
    recipientMode === 'all' ? allUsers.length : selectedIds.length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-violet-400" />
            </div>
            Email Notifications
          </motion.h1>
          <p className="text-sm text-slate-500 mt-1 ml-[52px]">
            Send announcements and notifications directly to your users.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#0D1120] border border-white/6 rounded-xl p-1">
          {[
            { id: 'compose', label: 'Compose', icon: Send },
            { id: 'history', label: 'History', icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ══ COMPOSE TAB ══ */}
        {activeTab === 'compose' && (
          <motion.div
            key="compose"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5"
          >
            {/* ── Left: Compose form ── */}
            <div className="space-y-4">
              {/* Result banner */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-sm font-medium ${
                      result.success
                        ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/8 border-rose-500/20 text-rose-400'
                    }`}
                  >
                    {result.success
                      ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    }
                    <div>
                      <p>{result.message}</p>
                      {result.successCount !== undefined && (
                        <p className="text-xs mt-1 opacity-70">
                          ✓ {result.successCount} delivered
                          {result.failedCount ? ` · ✗ ${result.failedCount} failed` : ''}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setResult(null)} className="ml-auto shrink-0">
                      <X className="w-4 h-4 opacity-60 hover:opacity-100" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Compose card */}
              <div className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden">
                {/* Recipient Mode */}
                <div className="p-5 border-b border-white/5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-3">
                    Recipients
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'all', label: 'All Users', icon: Users, desc: `${allUsers.length} recipients` },
                      { value: 'selected', label: 'Selected Users', icon: UserCheck, desc: `${selectedIds.length} selected` },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const active = recipientMode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setRecipientMode(opt.value as any)}
                          className={`flex-1 flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            active
                              ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                              : 'bg-white/2 border-white/6 text-slate-400 hover:border-white/12 hover:text-slate-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-violet-500/20' : 'bg-white/5'}`}>
                            <Icon className={`w-4 h-4 ${active ? 'text-violet-400' : 'text-slate-500'}`} />
                          </div>
                          <div>
                            <p className="text-xs font-bold">{opt.label}</p>
                            <p className="text-[10px] opacity-70 mt-0.5">{opt.desc}</p>
                          </div>
                          {active && (
                            <div className="ml-auto w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div className="p-5 border-b border-white/5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
                    Subject
                  </label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    maxLength={120}
                    placeholder="e.g. Important update to your HAGE account"
                    className="w-full bg-[#151B2E] border border-white/8 hover:border-white/12 focus:border-violet-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                  />
                  <p className="text-right text-[10px] text-slate-600 mt-1.5">{subject.length}/120</p>
                </div>

                {/* Body */}
                <div className="p-5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
                    Message Body
                  </label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={10}
                    placeholder="Write your message here. You can use multiple paragraphs — each will be separated properly in the email."
                    className="w-full bg-[#151B2E] border border-white/8 hover:border-white/12 focus:border-violet-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-all resize-none leading-relaxed"
                  />
                  <p className="text-right text-[10px] text-slate-600 mt-1.5">{body.length} characters</p>
                </div>
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !body.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-violet-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.99]"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending to {recipientCount} user{recipientCount !== 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send to {recipientCount} user{recipientCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>

            {/* ── Right: Recipient list ── */}
            <div className="rounded-2xl bg-[#0D1120] border border-white/6 flex flex-col overflow-hidden" style={{ maxHeight: '700px' }}>
              <div className="p-4 border-b border-white/5 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-violet-400" />
                    Recipients
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-[9px] font-bold">{allUsers.length}</span>
                  </h3>
                  {recipientMode === 'selected' && (
                    <button
                      onClick={toggleSelectAll}
                      className="text-[10px] font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      {selectedIds.length === filteredUsers.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-9 pr-3 py-2 bg-[#151B2E] border border-white/8 focus:border-violet-500/30 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition-all"
                  />
                </div>

                {/* Plan filter */}
                <div className="relative">
                  <select
                    value={planFilter}
                    onChange={e => setPlanFilter(e.target.value)}
                    className="w-full appearance-none pl-3 pr-7 py-2 bg-[#151B2E] border border-white/8 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-violet-500/30 transition-all cursor-pointer"
                  >
                    <option value="all">All Plans</option>
                    <option value="Free">Free</option>
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Premium">Premium</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Users list */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/3">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-600">No users match filters.</div>
                ) : (
                  filteredUsers.map(user => {
                    const isSelected = selectedIds.includes(user._id);
                    return (
                      <div
                        key={user._id}
                        onClick={() => recipientMode === 'selected' && toggleUser(user._id)}
                        className={`flex items-center gap-3 px-4 py-3 transition-all ${
                          recipientMode === 'selected'
                            ? `cursor-pointer ${isSelected ? 'bg-violet-500/5' : 'hover:bg-white/2'}`
                            : ''
                        }`}
                      >
                        {/* Checkbox (selected mode) */}
                        {recipientMode === 'selected' && (
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-violet-500 border-violet-500'
                              : 'border-white/15 bg-white/3'
                          }`}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        )}

                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 ${
                          user.role === 'admin'
                            ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                        }`}>
                          {user.name?.[0]?.toUpperCase() || 'U'}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                        </div>

                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold border shrink-0 ${planColor[user.subscriptionPlan] || planColor.Free}`}>
                          {user.subscriptionPlan}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected counter */}
              {recipientMode === 'selected' && (
                <div className="px-4 py-3 border-t border-white/5 shrink-0 text-[11px] text-slate-500 font-medium">
                  {selectedIds.length} of {allUsers.length} selected
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══ HISTORY TAB ══ */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MailCheck className="w-4 h-4 text-violet-400" />
                  Notification History
                </h3>
                <button
                  onClick={loadLogs}
                  disabled={logsLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {logsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="py-20 text-center">
                  <MailCheck className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">No emails sent yet.</p>
                  <p className="text-xs text-slate-700 mt-1">Use the Compose tab to send your first notification.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/3">
                  {/* Table head */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    <span>Campaign</span>
                    <span className="hidden sm:block">Sent By</span>
                    <span>Delivered</span>
                    <span className="hidden md:block">Date</span>
                  </div>

                  {logs.map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-white/2 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                            <Mail className="w-3.5 h-3.5 text-violet-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{log.subject}</p>
                            <p className="text-[10px] text-slate-500">{log.action}</p>
                          </div>
                        </div>
                      </div>

                      <div className="hidden sm:block">
                        <p className="text-xs text-slate-400 font-medium">{log.adminName}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/8 text-emerald-400 text-[11px] font-bold border border-emerald-500/15">
                          <CheckCircle className="w-2.5 h-2.5" />
                          {log.recipientCount}
                        </span>
                        {log.failedCount > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/8 text-rose-400 text-[11px] font-bold border border-rose-500/15">
                            <XCircle className="w-2.5 h-2.5" />
                            {log.failedCount}
                          </span>
                        )}
                      </div>

                      <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        {new Date(log.sentAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
