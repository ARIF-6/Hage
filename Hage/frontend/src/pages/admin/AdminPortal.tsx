import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ShieldCheck, ArrowRight,
  LogOut, TrendingUp, Users, CheckCircle2,
  Sparkles, Shield
} from 'lucide-react';

export default function AdminPortal() {
  const navigate = useNavigate();
  const adminName = localStorage.getItem('profile_firstName') || 'Administrator';
  const adminEmail = localStorage.getItem('profile_email') || 'admin@hage.com';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('profile_role');
    navigate('/login');
  };

  return (
    <div className="admin-root min-h-screen bg-slate-50 dark:bg-[#080C16] text-slate-800 dark:text-slate-100 flex flex-col font-sans relative overflow-hidden transition-colors duration-200">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="h-[60px] bg-white/95 dark:bg-[#0D1120]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-indigo-500/10 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30 w-full relative transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/30">
            H
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm leading-tight tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              HAGE <span className="text-[9px] px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-full tracking-widest border border-indigo-500/20">PORTAL GATEWAY</span>
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Workspace Switcher</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-2.5 pl-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
              {adminName[0] || 'A'}
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs text-slate-900 dark:text-white leading-tight">{adminName}</span>
              <span className="text-[10px] text-slate-500 leading-tight truncate max-w-[160px]">{adminEmail}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 font-semibold transition-colors border border-transparent hover:border-rose-500/20"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Selection */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 max-w-5xl mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center max-w-xl mx-auto mb-8 sm:mb-12"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-[11px] border border-indigo-500/20 mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Authorized Administrator Privileges</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Choose Your Destination
          </h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Your account holds elevated rights. Select which console you wish to launch.
          </p>
        </motion.div>

        {/* 2 Big Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Option 1: User Dashboard */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            whileHover={{ y: -4 }}
            className="h-full"
          >
            <div
              onClick={() => navigate('/dashboard')}
              className="h-full cursor-pointer group rounded-2xl border border-white/6 hover:border-indigo-500/40 bg-[#0D1120] shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden flex flex-col justify-between p-6 sm:p-8"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-lg border border-indigo-500/20">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                    Trader Experience
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                    Trader Dashboard
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                    Access personal trading journals, performance analytics, drawdown trackers, and account challenges.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Trading Journal, Daily Logs & Trade Calendar</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Real-time Prop Firm & Account Drawdown Analytics</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Payout Requests, Certificates & Stats</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="w-full py-3 px-4 rounded-xl bg-white/4 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white font-bold text-xs sm:text-sm flex items-center justify-between transition-all duration-300 border border-white/5 group-hover:border-transparent">
                  <span>Open Trader Experience</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Option 2: Admin Dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            whileHover={{ y: -4 }}
            className="h-full"
          >
            <div
              onClick={() => navigate('/admin')}
              className="h-full cursor-pointer group rounded-2xl border border-white/6 hover:border-violet-500/40 bg-[#0D1120] shadow-xl hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-300 overflow-hidden flex flex-col justify-between p-6 sm:p-8"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-lg border border-violet-500/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                    Full Platform Control
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-violet-400 transition-colors">
                    Admin Command Console
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                    Comprehensive platform management suite to audit users, approve payouts, monitor accounts, and inspect system telemetry.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span>User Management, Suspensions & Role Management</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span>Payout Approvals, Rejections & Receipt Uploads</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span>Support Ticket Resolution & Error Diagnostics</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="w-full py-3 px-4 rounded-xl bg-white/4 group-hover:bg-violet-600 text-slate-300 group-hover:text-white font-bold text-xs sm:text-sm flex items-center justify-between transition-all duration-300 border border-white/5 group-hover:border-transparent">
                  <span>Enter Admin Command Console</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
