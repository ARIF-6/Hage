import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import {
  ShieldCheck, LogOut, ArrowUpRight, Bell, Search,
  Zap, ChevronRight, Menu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const routeTitles: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/users': 'User Management',
  '/admin/accounts': 'Account Monitor',
  '/admin/issues': 'Support Issues',
  '/admin/subscriptions': 'Subscriptions',
  '/admin/payouts': 'Payout Management',
  '/admin/reports': 'Platform Reports',
  '/admin/errors': 'System Errors',
  '/admin/activity': 'Admin Activity',
  '/admin/settings': 'Settings',
  '/admin/email': 'Email Notifications',
};

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const adminEmail = localStorage.getItem('profile_email') || 'admin@hage.com';
  const adminName = localStorage.getItem('profile_firstName') || 'Admin';
  const [time, setTime] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('profile_role');
    navigate('/login');
  };

  const currentTitle = routeTitles[location.pathname] || 'Admin Panel';

  return (
    <div className="admin-root h-screen flex flex-col font-sans overflow-hidden bg-slate-50 dark:bg-[#080C16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="h-[60px] flex-shrink-0 bg-white/95 dark:bg-[#0D1120]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-indigo-500/10 flex items-center justify-between px-4 lg:px-6 z-50 relative transition-colors duration-200">
        {/* Subtle top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

        {/* Left: Brand + Breadcrumb + Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('toggleAdminMobileSidebar'))}
            className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Open Admin Menu"
            aria-label="Toggle admin navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <NavLink to="/admin" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-200">
              <ShieldCheck className="w-4 h-4 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-slate-900 dark:text-white font-black text-[13px] tracking-tight">HAGE</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[9px] uppercase tracking-widest">Admin Console</span>
            </div>
          </NavLink>

          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">{currentTitle}</span>
          </div>
        </div>

        {/* Center: Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/3 border border-slate-200/80 dark:border-white/5 transition-colors">
          <Zap className="w-3 h-3 text-emerald-500 dark:text-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 tabular-nums font-semibold">
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">LIVE</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/8 transition-all duration-200"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <button 
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/8 transition-all duration-200"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 ring-1 ring-white dark:ring-[#0D1120]" />
          </button>

          {/* Trader View */}
          <NavLink
            to="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:bg-white/4 dark:hover:bg-white/8 border border-slate-200 dark:border-white/6 transition-all duration-200"
          >
            <span>Trader View</span>
            <ArrowUpRight className="w-3 h-3" />
          </NavLink>

          {/* Admin profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/8 ml-1">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-[11px] uppercase shadow-md shadow-indigo-500/20">
              {adminName[0] || 'A'}
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-slate-900 dark:text-white font-semibold text-[11px]">{adminName}</span>
              <span className="text-slate-500 text-[9px] truncate max-w-[100px]">{adminEmail}</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-all duration-200"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Search bar overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[60px] left-0 right-0 z-40 px-4 py-2 bg-white/98 dark:bg-[#0D1120]/98 border-b border-slate-200 dark:border-indigo-500/10 backdrop-blur-xl shadow-lg"
          >
            <input
              autoFocus
              placeholder="Search users, accounts, payouts... (press Esc to close)"
              onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/8 transition-all"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50 dark:bg-[#080C16] transition-colors duration-200" style={{ scrollbarGutter: 'stable' }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="p-4 sm:p-6 lg:p-8 min-h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
