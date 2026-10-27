import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Hash, Plus, Trash2, Users, CheckCircle2, XCircle,
  Clock, MessageSquare, RefreshCw, Lock, Globe, Loader2, AlertTriangle
} from 'lucide-react';

const API = 'http://localhost:5000/api/community';

interface Group {
  id: string; name: string; description: string;
  icon: string; color: string; isPrivate: boolean;
  createdAt: string; memberCount: number;
}
interface JoinRequest {
  id: string; groupId: string; groupName: string;
  username: string; status: 'pending' | 'accepted' | 'rejected';
  requestedAt: string; resolvedAt: string | null;
}

const COLOR_OPTIONS = [
  { label: 'Blue',    value: 'text-blue-400'    },
  { label: 'Emerald', value: 'text-emerald-400' },
  { label: 'Violet',  value: 'text-violet-400'  },
  { label: 'Amber',   value: 'text-amber-400'   },
  { label: 'Rose',    value: 'text-rose-400'    },
  { label: 'Cyan',    value: 'text-cyan-400'    },
];

export default function AdminCommunityGroups() {
  const [groups, setGroups]       = useState<Group[]>([]);
  const [requests, setRequests]   = useState<JoinRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [actionId, setActionId]   = useState<string | null>(null);
  const [tab, setTab]             = useState<'groups' | 'requests'>('groups');

  // Create form
  const [form, setForm] = useState({
    name: '', description: '', color: 'text-blue-400', isPrivate: false,
  });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [g, r] = await Promise.all([
        fetch(`${API}/groups`).then(r => r.json()),
        fetch(`${API}/join-requests`).then(r => r.json()),
      ]);
      setGroups(Array.isArray(g) ? g : []);
      setRequests(Array.isArray(r) ? r : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const g = await res.json();
        setGroups(prev => [...prev, g]);
        setForm({ name: '', description: '', color: 'text-blue-400', isPrivate: false });
        setShowForm(false);
      }
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this group and all its messages?')) return;
    setActionId(id);
    await fetch(`${API}/groups/${id}`, { method: 'DELETE' });
    setGroups(prev => prev.filter(g => g.id !== id));
    setRequests(prev => prev.filter(r => r.groupId !== id));
    setActionId(null);
  };

  const handleResolve = async (reqId: string, action: 'accept' | 'reject') => {
    setActionId(reqId);
    const res = await fetch(`${API}/join-requests/${reqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === reqId ? updated : r));
      if (action === 'accept') {
        setGroups(prev => prev.map(g =>
          g.id === updated.groupId ? { ...g, memberCount: g.memberCount + 1 } : g
        ));
      }
    }
    setActionId(null);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto w-full pb-16 space-y-6">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111722] p-5 rounded-2xl border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Community Groups</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">Create groups, manage join requests</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> New Group
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#111722] p-5 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 shadow-xs">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" /> Create New Group
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Group Name *</label>
                  <input
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Gold Traders"
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#182030] text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Description</label>
                  <input
                    value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="What's this group about?"
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#182030] text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Color</label>
                  <div className="flex gap-1.5">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c.value} type="button" onClick={() => setForm(p => ({ ...p, color: c.value }))}
                        className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${c.value.replace('text-', 'bg-').replace('-400', '-500')} ${form.color === c.value ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-3">
                  <input type="checkbox" checked={form.isPrivate} onChange={e => setForm(p => ({ ...p, isPrivate: e.target.checked }))}
                    className="rounded accent-indigo-600" />
                  <span className="text-xs text-gray-700 dark:text-slate-300 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Private group (requires join request)
                  </span>
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-60">
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Group'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#182030] rounded-xl w-fit border border-gray-200/60 dark:border-slate-700/60">
          {(['groups', 'requests'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer relative ${
                tab === t ? 'bg-white dark:bg-[#111722] text-gray-900 dark:text-white shadow-xs font-bold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}>
              {t}
              {t === 'requests' && pendingCount > 0 && (
                <span className="ml-1.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : tab === 'groups' ? (
          /* ── Groups List ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No groups yet. Create your first one!</p>
              </div>
            ) : groups.map(g => (
              <div key={g.id} className="bg-white dark:bg-[#111722] rounded-2xl border border-gray-200/80 dark:border-[#1E293B] p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#182030] flex items-center justify-center`}>
                    <Hash className={`w-5 h-5 ${g.color}`} />
                  </div>
                  <button onClick={() => handleDelete(g.id)} disabled={actionId === g.id}
                    className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer disabled:opacity-40">
                    {actionId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{g.name}</h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-3 line-clamp-2">{g.description || 'No description'}</p>
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.memberCount} members</span>
                  <span className={`flex items-center gap-1 font-semibold ${g.isPrivate ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {g.isPrivate ? <><Lock className="w-3 h-3" /> Private</> : <><Globe className="w-3 h-3" /> Public</>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Join Requests List ── */
          <div className="bg-white dark:bg-[#111722] rounded-2xl border border-gray-200/80 dark:border-[#1E293B] overflow-hidden">
            {requests.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No join requests yet</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-[#182030] border-b border-gray-100 dark:border-[#1E293B] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Group</th>
                    <th className="px-4 py-3 text-left">Requested</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1E293B]">
                  {requests.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-[#0D1120]/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-[10px]">
                            {r.username[0].toUpperCase()}
                          </div>
                          {r.username}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                        <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{r.groupName}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(r.requestedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.status === 'pending'  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400' :
                          r.status === 'accepted' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400' :
                                                    'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400'
                        }`}>
                          {r.status === 'pending'  ? <Clock className="w-2.5 h-2.5" /> :
                           r.status === 'accepted' ? <CheckCircle2 className="w-2.5 h-2.5" /> :
                                                     <XCircle className="w-2.5 h-2.5" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleResolve(r.id, 'accept')} disabled={actionId === r.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer transition-all disabled:opacity-50">
                              {actionId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Accept
                            </button>
                            <button onClick={() => handleResolve(r.id, 'reject')} disabled={actionId === r.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer transition-all disabled:opacity-50">
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px]">
                            {r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString() : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
