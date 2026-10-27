import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Target, BookOpen, BarChart2, 
  Calendar, Award, CreditCard, HelpCircle, 
  Settings, LogOut, ChevronLeft, ChevronRight, Plus,
  TrendingUp, DollarSign, Bell, Sun, Moon, Laptop, Check,
  Sparkles, Crown, Activity, MessageSquare, Lock, Headphones,
  X, Menu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { AddTradeModal } from '../ui/AddTradeModal';
import { UpgradeModal } from '../ui/UpgradeModal';
import {
  getUserPlan,
  type PlanType,
  triggerReadOnlyAlert,
  isDashboardReadOnly,
  hasUserPurchasedPlan
} from '../../store/subscriptionRules';
import { switchActiveUser } from '../../store/useTradeStore';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanType>(getUserPlan());
  const [userName, setUserName] = useState<string>('Trader');
  const [userInitial, setUserInitial] = useState<string>('T');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Listen for mobile sidebar toggle events
  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    const handleOpen = () => setIsMobileOpen(true);
    const handleClose = () => setIsMobileOpen(false);

    window.addEventListener('toggleMobileSidebar', handleToggle);
    window.addEventListener('openMobileSidebar', handleOpen);
    window.addEventListener('closeMobileSidebar', handleClose);

    return () => {
      window.removeEventListener('toggleMobileSidebar', handleToggle);
      window.removeEventListener('openMobileSidebar', handleOpen);
      window.removeEventListener('closeMobileSidebar', handleClose);
    };
  }, []);

  useEffect(() => {
    const handleChatState = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      setIsChatOpen(Boolean(customEvent.detail?.isOpen));
    };
    window.addEventListener('aiChatStateChanged', handleChatState);
    return () => window.removeEventListener('aiChatStateChanged', handleChatState);
  }, []);

  useEffect(() => {
    const updateProfile = () => {
      const firstName = localStorage.getItem('profile_firstName') || '';
      const lastName = localStorage.getItem('profile_lastName') || '';
      const email = localStorage.getItem('profile_email') || '';
      const fullName = (firstName + ' ' + lastName).trim() || email.split('@')[0] || 'Trader';
      setUserName(fullName);
      setUserInitial(fullName.charAt(0).toUpperCase() || 'T');
    };
    updateProfile();
    window.addEventListener('storage', updateProfile);
    window.addEventListener('profileUpdated', updateProfile);
    return () => {
      window.removeEventListener('storage', updateProfile);
      window.removeEventListener('profileUpdated', updateProfile);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('profile_role');
    localStorage.removeItem('profile_email');
    localStorage.removeItem('profile_firstName');
    localStorage.removeItem('profile_lastName');
    localStorage.removeItem('user_subscription_status');
    localStorage.removeItem('profile_status');
    localStorage.removeItem('profile_plan');
    localStorage.removeItem('hage_subscription_status');
    localStorage.removeItem('hage_user_subscription_tier');
    localStorage.removeItem('hage_subscription_expired');

    switchActiveUser('');
    window.dispatchEvent(new CustomEvent('planUpdated'));
    navigate('/login');
  };

  useEffect(() => {
    const handlePlanChange = () => setCurrentPlan(getUserPlan());
    window.addEventListener('planUpdated', handlePlanChange);
    window.addEventListener('subscriptionStatusChanged', handlePlanChange);
    window.addEventListener('storage', handlePlanChange);
    return () => {
      window.removeEventListener('planUpdated', handlePlanChange);
      window.removeEventListener('subscriptionStatusChanged', handlePlanChange);
      window.removeEventListener('storage', handlePlanChange);
    };
  }, []);

  const mainLinks = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Target, label: 'Campaigns', path: '/dashboard/campaigns' },
    { icon: BookOpen, label: 'Journal', path: '/dashboard/journal' },
    { icon: BarChart2, label: 'Trades', path: '/dashboard/trades' },
    { icon: TrendingUp, label: 'Analytics', path: '/dashboard/analytics' },
    { icon: Calendar, label: 'Calendar', path: '/dashboard/calendar' },
    { icon: DollarSign, label: 'Payouts', path: '/dashboard/payouts' },
    { icon: Award, label: 'Certificates', path: '/dashboard/certificates' },
    { icon: CreditCard, label: 'Subscription', path: '/dashboard/subscription' },
    { icon: MessageSquare, label: 'Community', path: '/dashboard/community' },
  ];

  const isUnsubscribed = !hasUserPurchasedPlan() && localStorage.getItem('user_role') !== 'admin';

  // Do not render sidebar until user has paid
  if (isUnsubscribed) {
    return null;
  }

  const renderNavLinks = (isDrawer: boolean) => (
    <div className="space-y-0.5">
      {mainLinks.map((link) => {
        const Icon = link.icon;
        const isLockedForNewUser = isUnsubscribed && link.path !== '/dashboard/subscription';
        return (
          <NavLink
            key={link.path}
            to={isLockedForNewUser ? '/dashboard/subscription?purchase_required=true' : link.path}
            end={link.path === '/dashboard'}
            onClick={() => isDrawer && setIsMobileOpen(false)}
            className={({ isActive }) => cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative",
              isActive 
                ? "bg-[#F0EEFF] text-[#5E51E6] font-semibold dark:bg-[#1E1B4B]/80 dark:text-[#A594FD]" 
                : isLockedForNewUser
                ? "text-slate-400 hover:text-slate-700 hover:bg-amber-50/50 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-[#161F30]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#182030]"
            )}
            title={collapsed && !isDrawer ? (isLockedForNewUser ? `${link.label} (Subscription Required)` : link.label) : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive 
                    ? "text-[#5E51E6] dark:text-[#A594FD]" 
                    : isLockedForNewUser
                    ? "text-slate-400 dark:text-slate-500"
                    : "text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200",
                  collapsed && !isDrawer ? "mx-auto" : ""
                )} />
                {(!collapsed || isDrawer) && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{link.label}</span>
                    {isLockedForNewUser && (
                      <Lock className="w-3 h-3 text-amber-500 shrink-0 ml-1 opacity-70" />
                    )}
                  </div>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR (Visible on lg+ screens) ── */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col transition-all duration-300 relative z-20 border-r border-gray-200/80 dark:border-[#1E293B] select-none shrink-0 bg-white dark:bg-[#0E131F] text-slate-700 dark:text-slate-300",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-5 bg-white dark:bg-[#161F30] border border-gray-200 dark:border-[#1e293b] rounded-full p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm z-30 transition-colors cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Quick Add Trade Button */}
        <div className="p-3 pb-2">
          <button 
            onClick={() => {
              if (isUnsubscribed) {
                navigate('/dashboard/subscription?purchase_required=true');
                return;
              }
              if (triggerReadOnlyAlert('add a new trade')) return;
              setIsTradeModalOpen(true);
            }}
            className={cn(
              "w-full text-white font-semibold rounded-lg shadow-sm flex items-center justify-center transition-all duration-200 active:scale-95 group cursor-pointer",
              isUnsubscribed
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-indigo-600/25"
                : isDashboardReadOnly()
                ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/25"
                : "bg-[#6355F6] hover:bg-[#5244E3] shadow-[#6355F6]/25",
              collapsed ? "h-10 px-0" : "h-9 px-3 gap-2"
            )}
            title={isUnsubscribed ? "Plan Activation Required" : isDashboardReadOnly() ? "Subscription Expired (Read-Only Mode)" : "Add New Trade"}
          >
            {isUnsubscribed ? (
              <Sparkles className="w-4 h-4 shrink-0" />
            ) : (
              <Plus className="w-4 h-4 shrink-0 group-hover:rotate-90 transition-transform duration-200" />
            )}
            {!collapsed && (
              <span className="text-xs font-bold tracking-wide">
                {isUnsubscribed ? "Activate Plan" : isDashboardReadOnly() ? "Add Trade (Locked)" : "Add Trade"}
              </span>
            )}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-0.5 custom-scrollbar">
          {renderNavLinks(false)}

          {/* 24/7 AI Live Chat Trigger in Sidebar */}
          <div className="pt-2 mt-auto border-t border-gray-100 dark:border-slate-800/60">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('toggleAiChat'))}
              className={cn(
                "w-full flex items-center rounded-lg text-xs font-semibold transition-all group relative cursor-pointer",
                isChatOpen
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
                  : "bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/30",
                collapsed ? "p-2 justify-center" : "px-3 py-2 gap-2.5"
              )}
              title={collapsed ? "24/7 Live AI Chat Support" : undefined}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <Headphones className="w-4 h-4 text-emerald-500 transition-transform group-hover:scale-110" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-white dark:ring-[#0E131F]" />
              </div>
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">Live Chat</span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                    24/7
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Area: Plan Card, User Profile & Logout */}
        <div className="p-2 border-t border-gray-200/80 dark:border-[#1e293b] space-y-2">
          {!collapsed ? (
            <>
              {/* Plan Card */}
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-purple-950/40 border border-blue-500/20 text-left space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    {currentPlan === 'Premium' ? (
                      <><Crown className="w-3.5 h-3.5 text-amber-500" /> Premium VIP</>
                    ) : currentPlan === 'Pro' ? (
                      <><Sparkles className="w-3.5 h-3.5 text-blue-500 fill-blue-500/30" /> Pro Member</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5 text-sky-500" /> Starter Plan</>
                    )}
                  </span>
                  {currentPlan === 'Free' ? (
                    <button 
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded-md shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                      Upgrade
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Manage
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Card */}
              <NavLink 
                to="/dashboard/profile"
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#182030] transition-colors group"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
                  {userInitial}
                </div>
                <div className="flex flex-col min-w-0 flex-1 text-left">
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {userName}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-400 truncate">
                    Trader Profile
                  </span>
                </div>
              </NavLink>

              {/* Logout */}
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors w-full cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            /* Collapsed Mode */
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  currentPlan === 'Premium' 
                    ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' 
                    : currentPlan === 'Pro' 
                    ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' 
                    : currentPlan === 'Starter'
                    ? 'text-sky-500 bg-sky-500/10 hover:bg-sky-500/20'
                    : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                }`}
                title={`Current Plan: ${currentPlan} - Click to upgrade`}
              >
                {currentPlan === 'Premium' ? <Crown className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </button>

              <NavLink 
                to="/dashboard/profile"
                className="p-1 rounded-full hover:ring-2 hover:ring-blue-500/30 transition-all"
                title={`Profile: ${userName}`}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {userInitial}
                </div>
              </NavLink>

              <button 
                onClick={handleLogout}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
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

            {/* Drawer Sidebar */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-[#0E131F] text-slate-700 dark:text-slate-300 flex flex-col z-10 shadow-2xl border-r border-gray-200 dark:border-slate-800"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-sm">
                    H
                  </div>
                  <div>
                    <span className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                      HAGE <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold rounded">PRO</span>
                    </span>
                    <span className="text-[10px] text-gray-400 block -mt-0.5">Trading Journal</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Quick Action */}
              <div className="p-3 pb-2">
                <button 
                  onClick={() => {
                    setIsMobileOpen(false);
                    if (isUnsubscribed) {
                      navigate('/dashboard/subscription?purchase_required=true');
                      return;
                    }
                    if (triggerReadOnlyAlert('add a new trade')) return;
                    setIsTradeModalOpen(true);
                  }}
                  className="w-full h-10 px-3 gap-2 bg-[#6355F6] hover:bg-[#5244E3] text-white font-semibold rounded-lg shadow-sm flex items-center justify-center transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-wide">Add New Trade</span>
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto py-2 px-3 flex flex-col gap-0.5 custom-scrollbar">
                {renderNavLinks(true)}

                {/* 24/7 AI Chat Link in Drawer */}
                <div className="pt-2 mt-auto border-t border-gray-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileOpen(false);
                      window.dispatchEvent(new CustomEvent('toggleAiChat'));
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                  >
                    <div className="flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-emerald-500" />
                      <span>24/7 AI Live Chat</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                      Live
                    </span>
                  </button>
                </div>
              </div>

              {/* Drawer Bottom Profile & Logout */}
              <div className="p-3 border-t border-gray-200 dark:border-slate-800 space-y-2">
                <NavLink 
                  to="/dashboard/profile"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#182030] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
                    {userInitial}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {userName}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate">
                      {currentPlan} Plan
                    </span>
                  </div>
                </NavLink>

                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors w-full cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── MOBILE BOTTOM NAVIGATION BAR (Visible on <lg screens) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0E131F]/95 border-t border-gray-200/80 dark:border-slate-800/80 backdrop-blur-md px-3 py-1.5 flex items-center justify-around shadow-lg">
        <NavLink 
          to="/dashboard" 
          end 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition-colors",
            isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </NavLink>
        <NavLink 
          to="/dashboard/campaigns" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition-colors",
            isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
          )}
        >
          <Target className="w-4 h-4" />
          <span>Accounts</span>
        </NavLink>
        <NavLink 
          to="/dashboard/trades" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition-colors",
            isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
          )}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Trades</span>
        </NavLink>
        <NavLink 
          to="/dashboard/journal" 
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 p-1 text-[10px] font-bold transition-colors",
            isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span>Journal</span>
        </NavLink>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex flex-col items-center gap-1 p-1 text-[10px] font-bold text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
        </button>
      </nav>

      <AddTradeModal 
        isOpen={isTradeModalOpen} 
        onClose={() => setIsTradeModalOpen(false)} 
      />

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        targetPlan={currentPlan === 'Free' ? 'Starter' : currentPlan === 'Starter' ? 'Pro' : 'Premium'}
      />
    </>
  );
}
