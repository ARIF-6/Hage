import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Filter, RefreshCw, UserCheck, UserX,
  Shield, Crown, Mail, Calendar, ChevronDown, X,
  MoreVertical, AlertTriangle, CheckCircle, Eye, Edit2, Check, Sparkles
} from 'lucide-react';
import { adminApi, type AdminUser } from '../../services/adminApi';

const roleBadge = (role: string) =>
  role === 'admin'
    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
    : 'bg-indigo-500/8 text-indigo-400 border border-indigo-500/15';

const planBadge = (plan?: string) => {
  if (plan === 'Premium') return 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20';
  if (plan === 'Pro') return 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20';
  if (plan === 'Starter') return 'bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20';
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionUser, setActionUser] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState('');

  // Plan editing modal state
  const [editingPlanUser, setEditingPlanUser] = useState<AdminUser | null>(null);
  const [targetPlan, setTargetPlan] = useState<'Free' | 'Starter' | 'Pro' | 'Premium'>('Free');
  const [targetStatus, setTargetStatus] = useState<'Active' | 'Pending' | 'Expired'>('Active');
  const [planSaving, setPlanSaving] = useState(false);

  const handleOpenPlanModal = (user: AdminUser) => {
    setEditingPlanUser(user);
    setTargetPlan((user.subscriptionPlan as any) || 'Free');
    setTargetStatus((user.subscriptionStatus as any) || 'Active');
  };

  const handleSavePlan = async () => {
    if (!editingPlanUser) return;
    setPlanSaving(true);
    try {
      await adminApi.updateSubscription(editingPlanUser._id, targetPlan, targetStatus);
      showToast(`✅ ${editingPlanUser.name}'s plan updated to ${targetPlan}`);
      setUsers(prev => prev.map(u => u._id === editingPlanUser._id ? {
        ...u,
        subscriptionPlan: targetPlan,
        subscriptionStatus: targetStatus
      } : u));
      if (selectedUser?._id === editingPlanUser._id) {
        setSelectedUser(prev => prev ? {
          ...prev,
          subscriptionPlan: targetPlan,
          subscriptionStatus: targetStatus
        } : null);
      }
      setEditingPlanUser(null);
    } catch (err) {
      showToast('❌ Failed to update subscription plan');
    } finally {
      setPlanSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = async () => {
    try {
      const res = await adminApi.getUsers(search, roleFilter, statusFilter);
      setUsers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [search, roleFilter, statusFilter]);

  const handleSuspend = async (id: string, isSuspended: boolean) => {
    setActionLoading(id);
    try {
      if (isSuspended) {
        await adminApi.unsuspendUser(id);
        showToast('✅ User unsuspended successfully');
      } else {
        await adminApi.suspendUser(id);
        showToast('🚫 User suspended successfully');
      }
      load();
      setActionUser(null);
    } catch (e) {
      showToast('❌ Action failed. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  const refresh = () => { setRefreshing(true); load(); };

  const totalActive = users.filter(u => !u.isSuspended).length;
  const totalSuspended = users.filter(u => u.isSuspended).length;
  const totalAdmin = users.filter(u => u.role === 'admin').length;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl bg-[#0D1120] border border-white/10 shadow-2xl shadow-black/50 text-sm font-semibold text-white backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            User Management
          </motion.h1>
          <p className="text-sm text-slate-500 mt-1 ml-[52px]">Manage registered users, roles, and account access.</p>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 hover:border-indigo-500/30 text-slate-300 transition-all duration-200 active:scale-95">
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500' },
          { label: 'Active', value: totalActive, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500' },
          { label: 'Suspended', value: totalSuspended, icon: UserX, color: 'text-rose-400', bg: 'bg-rose-500' },
          { label: 'Admins', value: totalAdmin, icon: Shield, color: 'text-violet-400', bg: 'bg-violet-500' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="relative overflow-hidden rounded-2xl bg-[#0D1120] border border-white/6 p-4 group hover:border-white/12 transition-all duration-300">
              <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity ${s.bg}`} />
              <div className={`w-8 h-8 rounded-xl ${s.bg}/10 flex items-center justify-center mb-3 border border-white/5`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</div>
              <div className="text-2xl font-black text-white mt-0.5">{s.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Search & filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0D1120] border border-white/8 hover:border-white/12 focus:border-indigo-500/40 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
          />
        </div>

        {/* Role filter */}
        <div className="relative">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="appearance-none pl-3.5 pr-8 py-2.5 bg-[#0D1120] border border-white/8 hover:border-white/12 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500/40 transition-all cursor-pointer">
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none pl-3.5 pr-8 py-2.5 bg-[#0D1120] border border-white/8 hover:border-white/12 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500/40 transition-all cursor-pointer">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
        </div>
      </motion.div>

      {/* Users table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No users found.</p>
          </div>
        ) : (
          <>
            {/* Table head */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/4 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              <span>User</span>
              <span className="hidden md:block">Plan</span>
              <span className="hidden sm:block">Role</span>
              <span className="hidden lg:block">Joined</span>
              <span>Actions</span>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-white/3">
              {users.map((user, i) => (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-white/3 transition-colors group ${user.isSuspended ? 'opacity-60' : ''}`}
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black flex-shrink-0 ${
                      user.isSuspended ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15' :
                      user.role === 'admin' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/15' :
                      'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                    }`}>
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        {user.isSuspended && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/15 font-bold flex-shrink-0">
                            SUSPENDED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Plan */}
                  <div className="hidden md:flex">
                    <button
                      onClick={() => handleOpenPlanModal(user)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${planBadge(user.subscriptionPlan)} hover:ring-2 hover:ring-indigo-400/30 transition-all flex items-center gap-1.5 cursor-pointer`}
                      title="Click to edit user plan"
                    >
                      <span>{user.subscriptionPlan || 'Free'}</span>
                      <Edit2 className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  </div>

                  {/* Role */}
                  <div className="hidden sm:flex">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${roleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </div>

                  {/* Joined */}
                  <div className="hidden lg:block">
                    <p className="text-[11px] text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* View detail */}
                    <button onClick={() => setSelectedUser(user)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all duration-200 cursor-pointer"
                      title="View details">
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Plan / Grant Free Tier */}
                    <button
                      onClick={() => handleOpenPlanModal(user)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 transition-all duration-200 cursor-pointer"
                      title="Edit Plan / Grant Free or Custom Tier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Suspend/Unsuspend */}
                    <button
                      onClick={() => handleSuspend(user._id, user.isSuspended)}
                      disabled={actionLoading === user._id || user.role === 'admin'}
                      className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                        user.role === 'admin' ? 'opacity-30 cursor-not-allowed text-slate-400' :
                        user.isSuspended
                          ? 'text-emerald-500 hover:bg-emerald-500/10'
                          : 'text-slate-500 hover:text-rose-500 hover:bg-rose-500/10'
                      }`}
                      title={user.isSuspended ? 'Unsuspend user' : 'Suspend user'}
                    >
                      {actionLoading === user._id
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : user.isSuspended
                          ? <CheckCircle className="w-3.5 h-3.5" />
                          : <UserX className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* User detail modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-[#0D1120] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/6">
                <h3 className="font-bold text-slate-900 dark:text-white">User Details</h3>
                <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4">
                {/* Avatar + name */}
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${
                    selectedUser.role === 'admin' ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20' : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {selectedUser.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{selectedUser.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${roleBadge(selectedUser.role)}`}>{selectedUser.role}</span>
                      <button
                        onClick={() => handleOpenPlanModal(selectedUser)}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 hover:scale-105 transition-transform cursor-pointer ${planBadge(selectedUser.subscriptionPlan)}`}
                        title="Click to edit plan"
                      >
                        <span>{selectedUser.subscriptionPlan || 'Free'}</span>
                        <Edit2 className="w-2.5 h-2.5 opacity-70" />
                      </button>
                      {selectedUser.isSuspended && <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/15">Suspended</span>}
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Accounts', value: selectedUser.accountsCount || 0, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' },
                    { label: 'Trades', value: selectedUser.tradesCount || 0, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50/80 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20' },
                    { label: 'Total Paid Out', value: `$${(selectedUser.totalPaidOut || 0).toLocaleString()}`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' },
                    { label: 'Subscription', value: selectedUser.subscriptionStatus || 'Active', color: selectedUser.subscriptionStatus === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50/80 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20' },
                  ].map(item => (
                    <div key={item.label} className={`rounded-xl p-3 border ${item.bg}`}>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.label}</p>
                      <p className={`text-base font-black ${item.color} mt-0.5`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {new Date(selectedUser.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>

                {/* Action button */}
                {selectedUser.role !== 'admin' && (
                  <button
                    onClick={() => { handleSuspend(selectedUser._id, selectedUser.isSuspended); setSelectedUser(null); }}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      selectedUser.isSuspended
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                    }`}
                  >
                    {selectedUser.isSuspended ? '✓ Unsuspend User' : '🚫 Suspend User'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Plan & Tier Modal */}
      <AnimatePresence>
        {editingPlanUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingPlanUser(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-[#0D1120] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/6 bg-slate-50/50 dark:bg-white/2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Assign Plan &amp; Tier</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                      {editingPlanUser.name} ({editingPlanUser.email})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingPlanUser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                    Select Subscription Tier
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { key: 'Free', name: 'Free Tier', desc: 'Gift / Free tier ($0)', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', badge: '🎁 Free Tier' },
                      { key: 'Starter', name: 'Starter', desc: '1 Month access ($2.99)', color: 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400', badge: '1 Month' },
                      { key: 'Pro', name: 'Pro Plan', desc: '3 Months access ($4.99)', color: 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', badge: '🔥 Popular' },
                      { key: 'Premium', name: 'Premium', desc: '6 Months access ($9.99)', color: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400', badge: '⭐ VIP Deal' }
                    ].map(plan => {
                      const isSelected = targetPlan === plan.key;
                      return (
                        <button
                          key={plan.key}
                          type="button"
                          onClick={() => setTargetPlan(plan.key as any)}
                          className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                            isSelected
                              ? `${plan.color} ring-2 ring-indigo-500/30 font-bold shadow-sm`
                              : 'border-slate-200 dark:border-white/8 bg-slate-50/60 dark:bg-white/3 hover:border-slate-300 dark:hover:border-white/15 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black">{plan.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-white/60 dark:bg-black/30 border border-current opacity-80">
                              {plan.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                            {plan.desc}
                          </p>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-current flex items-center justify-center text-white">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                    Subscription Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Active', 'Pending', 'Expired'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setTargetStatus(status)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                          targetStatus === status
                            ? status === 'Active'
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                              : status === 'Pending'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-rose-500 text-white border-rose-500 shadow-sm'
                            : 'border-slate-200 dark:border-white/8 bg-slate-50/60 dark:bg-white/3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/6'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/6">
                  <button
                    type="button"
                    onClick={() => setEditingPlanUser(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/6 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePlan}
                    disabled={planSaving}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {planSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Grant &amp; Update Plan</span>
                      </>
                    )}
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
