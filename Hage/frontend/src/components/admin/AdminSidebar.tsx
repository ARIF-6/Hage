import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Layers, LifeBuoy,
  CreditCard, DollarSign, BarChart3, AlertTriangle,
  History, Settings, ChevronLeft, ChevronRight,
  Sun, Moon, Laptop, LayoutGrid, LogOut, Mail, MessagesSquare, X, ShieldCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { useTheme, type Theme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const adminLinks = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin', color: 'text-indigo-400', glow: 'shadow-indigo-500/20' },
  { icon: Users, label: 'Users', path: '/admin/users', color: 'text-blue-400', glow: 'shadow-blue-500/20' },
  { icon: Layers, label: 'Accounts', path: '/admin/accounts', color: 'text-violet-400', glow: 'shadow-violet-500/20' },
  { icon: LifeBuoy, label: 'Support', path: '/admin/issues', color: 'text-amber-400', glow: 'shadow-amber-500/20' },
  { icon: CreditCard, label: 'Subscriptions', path: '/admin/subscriptions', color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  { icon: DollarSign, label: 'Payouts', path: '/admin/payouts', color: 'text-green-400', glow: 'shadow-green-500/20' },
  { icon: BarChart3, label: 'Reports', path: '/admin/reports', color: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  { icon: AlertTriangle, label: 'System Errors', path: '/admin/errors', color: 'text-rose-400', glow: 'shadow-rose-500/20' },
  { icon: History, label: 'Activity', path: '/admin/activity', color: 'text-purple-400', glow: 'shadow-purple-500/20' },
  { icon: Mail, label: 'Email Notify', path: '/admin/email', color: 'text-violet-400', glow: 'shadow-violet-500/20' },
  { icon: MessagesSquare, label: 'Community Groups', path: '/admin/community-groups', color: 'text-blue-400', glow: 'shadow-blue-500/20' },
  { icon: Settings, label: 'Settings', path: '/admin/settings', color: 'text-slate-400', glow: 'shadow-slate-500/20' },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Listen to mobile toggle events
  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    const handleClose = () => setIsMobileOpen(false);

    window.addEventListener('toggleAdminMobileSidebar', handleToggle);
    window.addEventListener('closeAdminMobileSidebar', handleClose);

    return () => {
      window.removeEventListener('toggleAdminMobileSidebar', handleToggle);
      window.removeEventListener('closeAdminMobileSidebar', handleClose);
    };
  }, []);

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
  ];

  const renderNavLinks = (isDrawer: boolean) => (
    <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 overflow-x-hidden custom-scrollbar">
      {adminLinks.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === '/admin'}
            onClick={() => isDrawer && setIsMobileOpen(false)}
            title={collapsed && !isDrawer ? link.label : undefined}
            className={({ isActive }) => cn(
              'group relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 overflow-hidden',
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-white border border-indigo-200/80 dark:border-indigo-500/20 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/4 border border-transparent',
              collapsed && !isDrawer && 'justify-center'
            )}
          >
            {({ isActive }) => (
              <>
                {/* Active pill indicator */}
                {isActive && (
                  <motion.div
                    layoutId={isDrawer ? "admin-mobile-active-pill" : "admin-active-pill"}
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-indigo-600 dark:bg-indigo-500"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={cn(
                  'w-4 h-4 flex-shrink-0 transition-colors duration-200',
                  isActive ? link.color : 'text-slate-500 dark:text-slate-600 group-hover:text-slate-800 dark:group-hover:text-slate-300',
                  collapsed && !isDrawer && 'mx-auto'
                )} />
                {(!collapsed || isDrawer) && (
                  <span className={cn(
                    'font-medium truncate transition-colors duration-200',
                    isActive ? 'text-indigo-600 dark:text-white' : 'text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-200'
                  )}>
                    {link.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR (Visible on lg+ screens) ── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col transition-all duration-300 relative z-20 flex-shrink-0 bg-white dark:bg-[#0D1120] border-r border-slate-200/80 dark:border-indigo-500/8 text-slate-700 dark:text-slate-300 select-none',
          collapsed ? 'w-[60px]' : 'w-[220px]'
        )}
      >
        {/* Subtle left glow */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent" />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white dark:bg-[#0D1120] border border-slate-200 dark:border-indigo-500/20 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:border-indigo-500/50 shadow-md shadow-black/10 z-30 transition-all duration-200 group cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight size={11} className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            : <ChevronLeft size={11} className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />}
        </button>

        {/* Status badge */}
        <div className={cn('p-3 pb-2', collapsed && 'px-2')}>
          <div className={cn(
            'rounded-xl border border-indigo-500/20 bg-indigo-50/80 dark:bg-indigo-500/5 flex items-center py-2 transition-all duration-300',
            collapsed ? 'justify-center px-1' : 'px-3 gap-2'
          )}>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse flex-shrink-0 shadow-sm shadow-indigo-500" />
            {!collapsed && (
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Admin Console
              </span>
            )}
          </div>
        </div>

        {/* Nav links */}
        {renderNavLinks(false)}

        {/* Divider */}
        <div className="mx-3 h-px bg-slate-200 dark:bg-white/5 my-1" />

        {/* Bottom actions */}
        <div className={cn('p-2 space-y-0.5', collapsed && 'px-1')}>
          {/* Portal */}
          <button
            onClick={() => navigate('/portal')}
            className={cn(
              'group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/4 transition-all duration-200 border border-transparent cursor-pointer',
              collapsed && 'justify-center'
            )}
            title="Workspace Portal"
          >
            <LayoutGrid className="w-4 h-4 flex-shrink-0 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
            {!collapsed && <span>Workspace Portal</span>}
          </button>

          {/* Logout */}
          <button
            onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user_role'); navigate('/login'); }}
            className={cn(
              'group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/8 transition-all duration-200 border border-transparent cursor-pointer',
              collapsed && 'justify-center'
            )}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 transition-colors" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          {/* Theme switcher */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={cn(
                'group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/4 transition-all duration-200 cursor-pointer',
                collapsed && 'justify-center'
              )}
              title="Theme"
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 flex-shrink-0 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 flex-shrink-0 text-amber-500" />
              )}
              {!collapsed && <span className="capitalize">{theme} mode</span>}
            </button>

            <AnimatePresence>
              {showThemeMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'absolute bottom-full mb-2 bg-white dark:bg-[#0D1120] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl py-1 z-50 overflow-hidden',
                    collapsed ? 'left-full ml-2 w-32' : 'left-0 right-0'
                  )}
                >
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => { setTheme(opt.value); setShowThemeMenu(false); }}
                        className={cn(
                          'w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer',
                          theme === opt.value 
                            ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/60 dark:bg-indigo-500/10' 
                            : 'text-slate-700 dark:text-slate-400'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ── MOBILE DRAWER OVERLAY (Visible on <lg screens when opened) ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            />

            {/* Mobile Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-[#0D1120] text-slate-700 dark:text-slate-300 flex flex-col z-10 shadow-2xl border-r border-slate-200 dark:border-indigo-500/15"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-slate-900 dark:text-white font-black text-sm tracking-tight block">HAGE</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[9px] uppercase tracking-widest block">Admin Console</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status pill */}
              <div className="p-3 pb-1">
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-50/80 dark:bg-indigo-500/5 flex items-center px-3 py-2 gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse flex-shrink-0 shadow-sm shadow-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    Admin Navigation
                  </span>
                </div>
              </div>

              {/* Links */}
              {renderNavLinks(true)}

              {/* Bottom Actions in Drawer */}
              <div className="p-3 border-t border-slate-200/80 dark:border-white/10 space-y-1">
                <button
                  onClick={() => { setIsMobileOpen(false); navigate('/portal'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <LayoutGrid className="w-4 h-4 text-indigo-500" />
                  <span>Workspace Portal</span>
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user_role');
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
