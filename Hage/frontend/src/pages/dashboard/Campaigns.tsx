import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Award, AlertTriangle, Plus, CheckCircle2, ShieldAlert, BarChart2,
  Wallet, ChevronDown, Check, Layers
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { ChallengeCard } from '../../components/dashboard/ChallengeCard';
import { RealAccountCard } from '../../components/dashboard/RealAccountCard';
import { AddCampaignModal } from '../../components/ui/AddCampaignModal';
import { useTradeStore } from '../../store/useTradeStore';
import { triggerReadOnlyAlert } from '../../store/subscriptionRules';
import { format } from 'date-fns';

type AccountCategory = 'active' | 'passed' | 'failed';

export default function Campaigns() {
  const { campaigns, setActiveCampaign, activeCampaignId, trades, setCertificateModalCampaign, updateCampaign } = useTradeStore();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<AccountCategory>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'challenge' | 'real'>('all');

  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenDropdownId(null);
    };
    if (openDropdownId) {
      window.addEventListener('click', handleGlobalClick);
    }
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [openDropdownId]);

  const handleOpenConnectModal = () => {
    if (triggerReadOnlyAlert('connect or create a trading account')) {
      return;
    }
    setIsModalOpen(true);
  };

  // Categorize accounts according to requirements:
  // A. ACTIVE ACCOUNTS: Phase 1, Phase 2, Funded currently being traded (status === 'Active' or not Failed/Passed)
  const activeAccounts = campaigns.filter(c => 
    c.status === 'Active' || (!c.status && c.status !== 'Failed' && c.status !== 'Passed')
  );

  // B. PASSED ACCOUNTS: Completed challenge/phase, reached required target
  const passedAccounts = campaigns.filter(c => c.status === 'Passed');

  // C. FAILED ACCOUNTS: Accounts that failed because they violated rules such as maximum drawdown
  const failedAccounts = campaigns.filter(c => c.status === 'Failed');

  return (
    <div className="max-w-[1680px] mx-auto w-full pb-16 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Header Bar with Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Target className="w-7 h-7 text-primary dark:text-blue-400" />
              Account Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              Track your prop firm evaluations across Active, Passed, and Failed challenge lifecycles.
            </p>
          </div>

          <button
            onClick={handleOpenConnectModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Connect New Account</span>
          </button>
        </div>



        {/* 3 Main Account Lifecycle Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 p-1.5 rounded-2xl bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          {/* Category A: ACTIVE ACCOUNTS */}
          <button
            onClick={() => setSelectedCategory('active')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
              selectedCategory === 'active'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:bg-blue-600 dark:text-white'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-[#182030]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Target className="w-4 h-4" />
              <span>ACTIVE ACCOUNTS</span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
              selectedCategory === 'active'
                ? 'bg-white/20 text-white'
                : 'bg-gray-200/60 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}>
              {activeAccounts.length}
            </span>
          </button>

          {/* Category B: PASSED ACCOUNTS */}
          <button
            onClick={() => setSelectedCategory('passed')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
              selectedCategory === 'passed'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 dark:bg-emerald-600 dark:text-white'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-[#182030]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>PASSED ACCOUNTS</span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
              selectedCategory === 'passed'
                ? 'bg-white/20 text-white'
                : 'bg-gray-200/60 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}>
              {passedAccounts.length}
            </span>
          </button>

          {/* Category C: FAILED ACCOUNTS */}
          <button
            onClick={() => setSelectedCategory('failed')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
              selectedCategory === 'failed'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20 dark:bg-rose-600 dark:text-white'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-[#182030]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4" />
              <span>FAILED ACCOUNTS</span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
              selectedCategory === 'failed'
                ? 'bg-white/20 text-white'
                : 'bg-gray-200/60 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}>
              {failedAccounts.length}
            </span>
          </button>
        </div>

        {/* Content Display by Category */}
        <AnimatePresence mode="wait">
          {/* CATEGORY A: ACTIVE ACCOUNTS */}
          {selectedCategory === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Filter Tabs for Active Accounts */}
              <div className="flex items-center justify-between flex-wrap gap-2.5">
                <div className="inline-flex items-center gap-1 p-1 bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-[#1E293B] shadow-xs text-xs font-semibold">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeFilter === 'all'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    All Active ({activeAccounts.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('challenge')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeFilter === 'challenge'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Challenge ({activeAccounts.filter(c => c.phase !== 'Real Account').length})</span>
                  </button>
                  <button
                    onClick={() => setActiveFilter('real')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeFilter === 'real'
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Real ({activeAccounts.filter(c => c.phase === 'Real Account').length})</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeAccounts
                  .filter(c => {
                    if (activeFilter === 'challenge') return c.phase !== 'Real Account';
                    if (activeFilter === 'real') return c.phase === 'Real Account';
                    return true;
                  })
                  .map(campaign => (
                  <div key={campaign.id} className="relative">
                    {campaign.phase === 'Real Account' ? (
                      <RealAccountCard campaign={campaign} />
                    ) : (
                      <ChallengeCard campaignId={campaign.id} onConnectNew={handleOpenConnectModal} />
                    )}

                    {/* Action Controls: Set Active & Real/Challenge Dropdown */}
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-20">
                      <button 
                        onClick={() => setActiveCampaign(campaign.id)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeCampaignId === campaign.id 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'bg-white/95 dark:bg-[#182030]/95 backdrop-blur-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/80 border border-gray-200 dark:border-slate-700 shadow-xs'
                        }`}
                      >
                        {activeCampaignId === campaign.id ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active Trading</span>
                          </>
                        ) : (
                          <span>Set Active</span>
                        )}
                      </button>

                      {/* Dropdown next to Set Active */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === campaign.id ? null : campaign.id);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer border ${
                            campaign.phase === 'Real Account'
                              ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/80'
                              : 'bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/80'
                          }`}
                          title="Switch or Change Account Type"
                        >
                          {campaign.phase === 'Real Account' ? (
                            <>
                              <Wallet className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                              <span>Real</span>
                            </>
                          ) : (
                            <>
                              <Target className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>Challenge</span>
                            </>
                          )}
                          <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${openDropdownId === campaign.id ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {openDropdownId === campaign.id && (
                          <div 
                            className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-[#161F30] rounded-2xl shadow-2xl border border-gray-200/90 dark:border-slate-700/80 py-2 z-50 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* SECTION 1: SWITCH ACTIVE ACCOUNT */}
                            <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                              Switch Active Account
                            </div>

                            {/* Challenge Accounts Group */}
                            <div className="px-2 py-1">
                              <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 flex items-center gap-1 uppercase">
                                <Target className="w-3 h-3" />
                                <span>Challenge Accounts</span>
                              </div>
                              {activeAccounts.filter(c => c.phase !== 'Real Account').map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setActiveCampaign(c.id);
                                    setOpenDropdownId(null);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                                    activeCampaignId === c.id 
                                      ? 'bg-blue-50 dark:bg-blue-950/60 font-bold text-blue-600 dark:text-blue-400' 
                                      : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200'
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <p className="truncate text-xs font-semibold">{c.name}</p>
                                    <p className="text-[10px] text-gray-400">{c.phase} • ${(c.accountSize || c.startingBalance || 0).toLocaleString()}</p>
                                  </div>
                                  {activeCampaignId === c.id && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                </button>
                              ))}
                            </div>

                            {/* Real Accounts Group */}
                            <div className="px-2 py-1 border-t border-gray-100 dark:border-slate-800">
                              <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 flex items-center gap-1 uppercase">
                                <Wallet className="w-3 h-3" />
                                <span>Real Accounts</span>
                              </div>
                              {activeAccounts.filter(c => c.phase === 'Real Account').map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setActiveCampaign(c.id);
                                    setOpenDropdownId(null);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                                    activeCampaignId === c.id 
                                      ? 'bg-purple-50 dark:bg-purple-950/60 font-bold text-purple-600 dark:text-purple-400' 
                                      : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200'
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <p className="truncate text-xs font-semibold">{c.name}</p>
                                    <p className="text-[10px] text-gray-400">{c.broker} • ${(c.currentBalance || c.startingBalance || 0).toLocaleString()}</p>
                                  </div>
                                  {activeCampaignId === c.id && <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                </button>
                              ))}
                            </div>

                            {/* SECTION 2: CHANGE THIS ACCOUNT TYPE */}
                            <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider border-t border-gray-100 dark:border-slate-800">
                              Change Account Type
                            </div>
                            <div className="px-2 space-y-0.5">
                              <button
                                onClick={() => {
                                  updateCampaign(campaign.id, { phase: 'Real Account' });
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-2 transition-colors cursor-pointer ${
                                  campaign.phase === 'Real Account'
                                    ? 'bg-purple-50 dark:bg-purple-950/60 font-bold text-purple-600 dark:text-purple-400'
                                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200'
                                }`}
                              >
                                <Wallet className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span>Switch to Real Account</span>
                              </button>

                              <button
                                onClick={() => {
                                  updateCampaign(campaign.id, { phase: 'Phase 1' });
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-2 transition-colors cursor-pointer ${
                                  campaign.phase === 'Phase 1'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 font-bold text-blue-600 dark:text-blue-400'
                                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200'
                                }`}
                              >
                                <Target className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span>Switch to Challenge (Phase 1)</span>
                              </button>

                              <button
                                onClick={() => {
                                  updateCampaign(campaign.id, { phase: 'Funded' });
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-2 transition-colors cursor-pointer ${
                                  campaign.phase === 'Funded'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 font-bold text-emerald-600 dark:text-emerald-400'
                                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200'
                                }`}
                              >
                                <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>Switch to Funded Account</span>
                              </button>
                            </div>

                            {/* SECTION 3: QUICK CONNECT */}
                            <div className="pt-1.5 mt-1 border-t border-gray-100 dark:border-slate-800 px-2">
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleOpenConnectModal();
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-bold transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                <span>Connect New Account</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Connect New Challenge Card */}
                <Card 
                  onClick={handleOpenConnectModal}
                  className="border-dashed border-2 border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-[#111722]/50 flex flex-col items-center justify-center text-center p-8 hover:bg-gray-100/80 dark:hover:bg-[#161F30]/60 transition-all cursor-pointer min-h-[300px] group"
                >
                  <div className="w-14 h-14 bg-white dark:bg-[#182030] rounded-2xl flex items-center justify-center shadow-xs mb-3 border border-gray-100 dark:border-slate-700 group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Connect New Account</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-[220px]">
                    Add a new Phase 1, Phase 2, Funded, or Real Account
                  </p>
                </Card>
              </div>
            </motion.div>
          )}

          {/* CATEGORY B: PASSED ACCOUNTS */}
          {selectedCategory === 'passed' && (
            <motion.div
              key="passed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {passedAccounts.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white/70 dark:bg-[#111722]/80 border border-gray-200/80 dark:border-[#1E293B]">
                  <Award className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Passed Accounts Yet</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                    When your active Phase 1 or Phase 2 challenge reaches its Profit Target, the completed evaluation will be preserved here in Passed Accounts history.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {passedAccounts.map(campaign => {
                    const campaignTrades = trades.filter(t => t.campaignId === campaign.id);
                    return (
                      <Card key={campaign.id} className="border-emerald-200 dark:border-emerald-900/50 shadow-xs">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400">
                                PASSED • Read-only account
                              </span>
                              <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1.5">{campaign.name}</h3>
                              <p className="text-xs text-gray-400 font-medium">{campaign.broker} • #{campaign.accountNumber}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-gray-400 text-[10px] uppercase font-bold block">Account Size</span>
                              <span className="font-extrabold text-gray-900 dark:text-white">${campaign.accountSize.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 text-[10px] uppercase font-bold block">Profit Target Hit</span>
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">+${(campaign.profitTarget || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 dark:border-[#1E293B] text-gray-500 dark:text-slate-400">
                            <span>{campaignTrades.length} Trades Completed</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Passed {campaign.passedDate ? format(new Date(campaign.passedDate), 'MMM d, yyyy') : 'Completed'}
                            </span>
                          </div>

                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => {
                                setActiveCampaign(campaign.id);
                                navigate('/dashboard/trades');
                              }}
                              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                              <span>View Trades</span>
                            </button>
                            <button
                              onClick={() => setCertificateModalCampaign(campaign)}
                              className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>View Certificate</span>
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* CATEGORY C: FAILED ACCOUNTS */}
          {selectedCategory === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {failedAccounts.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white/70 dark:bg-[#111722]/80 border border-gray-200/80 dark:border-[#1E293B]">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Failed Accounts</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                    Great discipline! None of your accounts have breached drawdown or challenge loss limits.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-xs">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Failed accounts are permanently preserved in history so you can review mistakes and learn from loss rules.</span>
                    </div>
                    <button
                      onClick={handleOpenConnectModal}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs transition-colors shrink-0 cursor-pointer"
                    >
                      Connect New Account
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {failedAccounts.map(campaign => {
                      return (
                        <Card key={campaign.id} className="border-rose-200 dark:border-rose-900/50 shadow-xs">
                          <CardContent className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-950/70 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400">
                                  FAILED • Account closed
                                </span>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1.5">{campaign.name}</h3>
                                <p className="text-xs text-gray-400 font-medium">{campaign.broker} • #{campaign.accountNumber}</p>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800/60 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-rose-500" />
                              </div>
                            </div>

                            {/* Failure Reason */}
                            <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 space-y-1">
                              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
                                Reason for Failure
                              </span>
                              <p className="text-xs text-rose-800 dark:text-rose-300/90 font-medium leading-relaxed">
                                {campaign.failureReason || `Exceeded maximum drawdown rule limit of $${(campaign.maxDrawdown || 0).toLocaleString()}.`}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-gray-400 text-[10px] uppercase font-bold block">Account Size</span>
                                <span className="font-extrabold text-gray-900 dark:text-white">${campaign.accountSize.toLocaleString()}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-400 text-[10px] uppercase font-bold block">Final Balance</span>
                                <span className="font-extrabold text-rose-600 dark:text-rose-400">${campaign.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>

                            {/* Obvious Action: Connect New Account */}
                            <button
                              onClick={handleOpenConnectModal}
                              className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Connect New Account</span>
                            </button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      <AddCampaignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
