import { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, ChevronDown, Layers, Check, LogOut, Sun, Moon, Laptop, Lock,
  Bell, HelpCircle, Headphones, Settings, Menu
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTradeStore, switchActiveUser } from '../../store/useTradeStore';
import { hasUserPurchasedPlan } from '../../store/subscriptionRules';
import { useTheme, type Theme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

export function TopHeader() {
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { campaigns, activeCampaignId, setActiveCampaign } = useTradeStore();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isPaid, setIsPaid] = useState<boolean>(() => hasUserPurchasedPlan() || localStorage.getItem('user_role') === 'admin');

  const themeRef = useRef<HTMLDivElement>(null);

  const [userName, setUserName] = useState<string>(() => {
    const firstName = localStorage.getItem('profile_firstName') || '';
    const lastName = localStorage.getItem('profile_lastName') || '';
    const email = localStorage.getItem('profile_email') || '';
    return (firstName + ' ' + lastName).trim() || email.split('@')[0] || 'Trader';
  });
  const [userInitial, setUserInitial] = useState<string>(() => {
    const firstName = localStorage.getItem('profile_firstName') || '';
    const email = localStorage.getItem('profile_email') || '';
    return (firstName || email || 'T').charAt(0).toUpperCase();
  });

  useEffect(() => {
    const handleChatState = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      setIsChatOpen(Boolean(customEvent.detail?.isOpen));
    };
    window.addEventListener('aiChatStateChanged', handleChatState);
    return () => window.removeEventListener('aiChatStateChanged', handleChatState);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    if (showThemeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemeMenu]);

  useEffect(() => {
    const checkStatus = () => {
      setIsPaid(hasUserPurchasedPlan() || localStorage.getItem('user_role') === 'admin');
      const firstName = localStorage.getItem('profile_firstName') || '';
      const lastName = localStorage.getItem('profile_lastName') || '';
      const email = localStorage.getItem('profile_email') || '';
      const fullName = (firstName + ' ' + lastName).trim() || email.split('@')[0] || 'Trader';
      setUserName(fullName);
      setUserInitial(fullName.charAt(0).toUpperCase() || 'T');
    };

    window.addEventListener('planUpdated', checkStatus);
    window.addEventListener('subscriptionStatusChanged', checkStatus);
    window.addEventListener('storage', checkStatus);
    return () => {
      window.removeEventListener('planUpdated', checkStatus);
      window.removeEventListener('subscriptionStatusChanged', checkStatus);
      window.removeEventListener('storage', checkStatus);
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

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns[0];

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setLastSyncTime(new Date());
      setIsSyncing(false);
    }, 600);
  };

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
  ];

  return (
    <header className="h-16 bg-white dark:bg-[#111722] border-b border-gray-200/80 dark:border-[#1E293B] flex items-center justify-between px-3 sm:px-4 lg:px-6 shrink-0 z-30 w-full transition-colors duration-200">
      
      {/* Left side - Brand Logo & Mobile Toggle */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Button */}
        {isPaid && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('toggleMobileSidebar'))}
            className="lg:hidden p-2 -ml-1 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Open Menu"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
            H
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base sm:text-lg leading-tight tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
              HAGE <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold rounded tracking-normal border border-blue-200/60 dark:border-blue-800/60">PRO</span>
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-400 -mt-0.5 font-medium hidden xs:inline">Trading Journal</span>
          </div>
        </NavLink>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 text-xs">
        
        {/* Paid Users Account Management & Sync */}
        {isPaid && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Current Account / Campaign Selector Dropdown */}
            {campaigns.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  onBlur={() => setTimeout(() => setShowAccountMenu(false), 200)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-gray-100/90 hover:bg-gray-200/80 dark:bg-[#182030] dark:hover:bg-[#1f2a3f] border border-gray-200/80 dark:border-slate-700/60 text-xs font-semibold text-gray-800 dark:text-slate-200 transition-colors cursor-pointer"
                  title="Switch Active Account"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="max-w-[70px] sm:max-w-[160px] truncate font-bold text-gray-900 dark:text-white">
                    {activeCampaign?.name || 'All Accounts'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded font-bold shrink-0 hidden md:inline">
                    {activeCampaign?.phase || 'Funded'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </button>

                {showAccountMenu && (
                  <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#161F30] rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Active Campaign
                    </div>
                    {campaigns.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setActiveCampaign(c.id);
                          setShowAccountMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-slate-200 cursor-pointer"
                      >
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-[10px] text-gray-400">{c.broker} • ${c.startingBalance?.toLocaleString()}</p>
                        </div>
                        {c.id === (activeCampaignId || campaigns[0]?.id) && (
                          <Check className="w-4 h-4 text-blue-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Last Sync Indicator & Action */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-medium text-gray-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Last sync: <span className="font-bold text-gray-900 dark:text-white">{format(lastSyncTime, 'hh:mm a')}</span>
              </span>

              <button 
                onClick={handleSync}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 font-semibold p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                title="Synchronize Account Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="h-4 w-[1px] bg-gray-200 dark:bg-slate-700 hidden sm:block" />
          </div>
        )}

        {/* Unsubscribed subtle badge */}
        {!isPaid && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-semibold text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Subscription Required</span>
          </div>
        )}

        {/* ─── Moved Top Controls Toolbar: Theme, Notifications, Help, Live Chat, Settings ─── */}
        <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-1 bg-gray-50 dark:bg-[#121826] rounded-xl border border-gray-200/80 dark:border-slate-800 relative">
          
          {/* Light/Dark/System Theme Switcher */}
          <div className="relative" ref={themeRef}>
            <button 
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#182030] transition-colors cursor-pointer"
              title={`Theme: ${theme}`}
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {showThemeMenu && (
              <div className="absolute top-full mt-2 right-0 w-36 bg-white dark:bg-[#161F30] rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Theme
                </div>
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setTheme(opt.value);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                        isSelected ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button 
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#182030] transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#121826]" />
          </button>

          {/* Help & Support (visible on sm+) */}
          <NavLink 
            to="/dashboard/support"
            className={({ isActive }) => cn(
              "hidden sm:inline-flex p-1.5 rounded-lg transition-colors cursor-pointer",
              isActive 
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#182030]"
            )}
            title="Help & Support"
          >
            <HelpCircle className="w-4 h-4" />
          </NavLink>

          {/* 24/7 AI Live Chat */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('toggleAiChat'))}
            className={cn(
              "p-1.5 rounded-lg transition-colors relative cursor-pointer",
              isChatOpen
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#182030]"
            )}
            title="24/7 AI Live Chat"
          >
            <Headphones className="w-4 h-4 text-emerald-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-white dark:ring-[#121826] animate-pulse" />
          </button>

          {/* Settings (visible on sm+) */}
          <NavLink 
            to="/dashboard/settings"
            className={({ isActive }) => cn(
              "hidden sm:inline-flex p-1.5 rounded-lg transition-colors cursor-pointer",
              isActive 
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#182030]"
            )}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </NavLink>
        </div>

        {/* User profile avatar & name */}
        <NavLink
          to="/dashboard/profile"
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800/80 transition-colors"
          title="My Profile"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {userInitial}
          </div>
          <span className="font-semibold text-gray-800 dark:text-slate-200 text-xs hidden xl:inline max-w-[120px] truncate">
            {userName}
          </span>
        </NavLink>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>

      </div>
    </header>
  );
}
