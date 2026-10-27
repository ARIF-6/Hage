import { useState, useEffect } from 'react';
import {
  X, Target, Building2, Wallet, Award, DollarSign, Sparkles, ShieldAlert, ArrowRight, Lock
} from 'lucide-react';
import { useTradeStore } from '../../store/useTradeStore';
import type { Campaign } from '../../store/useTradeStore';
import { canAddAccount, canTrackChallenges, getUserPlan, triggerReadOnlyAlert, isDashboardReadOnly, isAdminGrantedAccess } from '../../store/subscriptionRules';
import { UpgradeModal } from './UpgradeModal';

export interface AddCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhase?: 'Phase 1' | 'Phase 2' | 'Funded';
  initialPropFirm?: string;
  initialAccountSize?: number;
  initialPlatform?: Campaign['platform'];
  initialName?: string;
  initialCategory?: 'prop_firm' | 'real';
  sourceCampaignId?: string;
}

const PROP_FIRM_PRESETS = ['FTMO', 'FundedNext', 'Funding Pips', 'The Funded Trader', 'Alpha Capital', 'Topstep'];
const PROP_SIZE_PRESETS = [5000, 10000, 25000, 50000, 100000, 200000];
const TARGET_PCT_PRESETS = [5, 6, 8, 10, 12];

const REAL_BROKER_PRESETS = [
  'IC Markets',
  'Pepperstone',
  'OANDA',
  'Interactive Brokers',
  'Exness',
  'IG',
  'XM',
  'FXCM',
  'CMC Markets',
  'RoboForex',
  'FBS',
  'Vantage Markets',
  'AvaTrade',
  'Plus500',
  'FP Markets',
  'Charles Schwab'
];
const REAL_DEPOSIT_PRESETS = [100, 250, 500, 1000, 2500, 5000, 7500, 10000, 15000, 25000, 50000, 100000];

const PROP_PHASE_OPTIONS: { phase: 'Phase 1' | 'Phase 2' | 'Funded'; label: string; icon: typeof Award; desc: string }[] = [
  { phase: 'Phase 1', label: 'Challenge / Phase 1', icon: Award, desc: 'Initial challenge evaluation' },
  { phase: 'Phase 2', label: 'Challenge / Phase 2', icon: Target, desc: 'Verification phase evaluation' },
  { phase: 'Funded', label: 'Funded Account', icon: DollarSign, desc: 'Live funded prop firm capital' },
];

export function AddCampaignModal({
  isOpen,
  onClose,
  initialPhase,
  initialPropFirm,
  initialAccountSize,
  initialPlatform,
  initialName,
  initialCategory,
  sourceCampaignId
}: AddCampaignModalProps) {
  const campaigns = useTradeStore(state => state.campaigns);
  const addCampaign = useTradeStore(state => state.addCampaign);
  const updateCampaign = useTradeStore(state => state.updateCampaign);

  const isConnectingNextPhase = Boolean(sourceCampaignId && campaigns.some(c => c.id === sourceCampaignId));
  const accountCheck = canAddAccount(campaigns, isConnectingNextPhase);
  const userPlan = getUserPlan();
  // Admin-granted users (any tier, including Free) always have challenge tracking
  const hasChallengeTracking = canTrackChallenges() || isAdminGrantedAccess() || localStorage.getItem('user_role') === 'admin';

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  // High-level category: Prop Firm vs Real Account
  const [accountCategory, setAccountCategory] = useState<'prop_firm' | 'real'>(initialCategory || 'prop_firm');

  // Prop Firm specific state
  const [propFirm, setPropFirm] = useState(initialPropFirm || 'FTMO');
  const [customPropFirm, setCustomPropFirm] = useState('');
  const [propAccountSize, setPropAccountSize] = useState(initialAccountSize ? initialAccountSize.toString() : '10000');
  const [customPropAccountSize, setCustomPropAccountSize] = useState('');
  const [phase, setPhase] = useState<'Phase 1' | 'Phase 2' | 'Funded'>(initialPhase || 'Phase 1');
  const [profitTargetPct, setProfitTargetPct] = useState<string>(initialPhase === 'Phase 2' ? '5' : '8');
  const [customProfitTargetPct, setCustomProfitTargetPct] = useState('');
  const [dailyDrawdownPct, setDailyDrawdownPct] = useState<string>('5');
  const [maxDrawdownPct, setMaxDrawdownPct] = useState<string>('10');

  // Real Account specific state
  const [realBroker, setRealBroker] = useState('IC Markets');
  const [customRealBroker, setCustomRealBroker] = useState('');
  const [startingDeposit, setStartingDeposit] = useState('500');
  const [customStartingDeposit, setCustomStartingDeposit] = useState('');

  // Shared state
  const [name, setName] = useState(initialName || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [platform, setPlatform] = useState<Campaign['platform']>(initialPlatform || 'MT5');

  useEffect(() => {
    if (isOpen) {
      if (initialPhase) {
        setPhase(initialPhase);
        if (initialPhase === 'Phase 2') {
          setProfitTargetPct('5');
        } else if (initialPhase === 'Phase 1') {
          setProfitTargetPct('8');
        } else {
          setProfitTargetPct('0');
        }
      } else {
        setPhase('Phase 1');
        setProfitTargetPct('8');
      }

      setAccountCategory(initialCategory || 'prop_firm');
      if (initialPropFirm) setPropFirm(initialPropFirm);
      setCustomPropFirm('');
      if (initialAccountSize) setPropAccountSize(initialAccountSize.toString());
      setCustomPropAccountSize('');
      setCustomProfitTargetPct('');
      if (initialPlatform) setPlatform(initialPlatform);
      setName(initialName || '');
      setAccountNumber('');
      setCustomRealBroker('');
      setCustomStartingDeposit('');
      setDailyDrawdownPct('5');
      setMaxDrawdownPct('10');
    }
  }, [isOpen, initialPhase, initialPropFirm, initialAccountSize, initialPlatform, initialName, initialCategory]);

  if (!isOpen) return null;

  const parsedPropSize = propAccountSize === 'Other' ? (parseFloat(customPropAccountSize) || 0) : (parseFloat(propAccountSize) || 0);
  const parsedTargetPct = profitTargetPct === 'Other' ? (parseFloat(customProfitTargetPct) || 0) : (parseFloat(profitTargetPct) || 0);
  const parsedDailyDDPct = parseFloat(dailyDrawdownPct) || 0;
  const parsedMaxDDPct = parseFloat(maxDrawdownPct) || 0;
  const parsedDeposit = startingDeposit === 'Other' ? (parseFloat(customStartingDeposit) || 0) : (parseFloat(startingDeposit) || 0);

  const isChallenge = phase === 'Phase 1' || phase === 'Phase 2';
  const propTargetDollar = !isChallenge ? 0 : Math.round(parsedPropSize * (parsedTargetPct / 100));
  const dailyDDDollar = Math.round(parsedPropSize * (parsedDailyDDPct / 100));
  const maxDDDollar = Math.round(parsedPropSize * (parsedMaxDDPct / 100));

  const handlePropPhaseChange = (newPhase: 'Phase 1' | 'Phase 2' | 'Funded') => {
    setPhase(newPhase);
    if (newPhase === 'Phase 1') {
      setProfitTargetPct('8');
    } else if (newPhase === 'Phase 2') {
      setProfitTargetPct('5');
    } else {
      setProfitTargetPct('0');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (triggerReadOnlyAlert('connect or create a trading account')) {
      onClose();
      return;
    }

    if (!accountCheck.allowed) {
      setUpgradeReason(accountCheck.message || 'Trading Account Limit Reached.');
      setIsUpgradeModalOpen(true);
      return;
    }

    // Challenge tracking gate — only block if user genuinely lacks it (never block admin-granted users)
    if (accountCategory === 'prop_firm' && (phase === 'Phase 1' || phase === 'Phase 2') && !hasChallengeTracking) {
      setUpgradeReason('Challenge Tracking (Phase 1 & Phase 2 evaluation) is a Pro feature. Upgrade to Pro to track evaluation targets and pass certificates.');
      setIsUpgradeModalOpen(true);
      return;
    }

    if (accountCategory === 'real') {
      // Real Trading Account: Live personal capital with zero challenge mechanics
      if (realBroker === 'Other' && !customRealBroker.trim()) {
        alert('Please enter your custom broker name.');
        return;
      }
      if (startingDeposit === 'Other' && (!parsedDeposit || parsedDeposit <= 0)) {
        alert('Please enter a valid starting deposit amount.');
        return;
      }

      const deposit = Math.max(1, parsedDeposit || 500);
      const brokerName = realBroker === 'Other' ? customRealBroker.trim() : (realBroker.trim() || 'IC Markets');
      const finalName = name.trim() || `${brokerName} $${deposit.toLocaleString()} Real`;

      addCampaign({
        name: finalName,
        broker: brokerName,
        accountSize: deposit,
        accountNumber: accountNumber.trim() || `${Math.floor(100000 + Math.random() * 900000)}`,
        platform,
        phase: 'Real Account',
        status: 'Active',
        startingBalance: deposit,
        currentBalance: deposit,
        profitTarget: 0,
        profitTargetPercent: 0,
        maxDailyDrawdown: 0,
        maxDailyDrawdownPercent: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        startDate: new Date().toISOString()
      });
    } else {
      // Prop Firm Account: Phase 1, Phase 2, or Funded
      if (propFirm === 'Other' && !customPropFirm.trim()) {
        alert('Please enter your custom prop firm name.');
        return;
      }
      if (propAccountSize === 'Other' && (!parsedPropSize || parsedPropSize <= 0)) {
        alert('Please enter a valid custom account size.');
        return;
      }
      if (isChallenge && profitTargetPct === 'Other' && (!parsedTargetPct || parsedTargetPct <= 0)) {
        alert('Please enter a valid custom profit target percentage.');
        return;
      }

      const size = Math.max(100, parsedPropSize || 10000);
      const firmName = propFirm === 'Other' ? customPropFirm.trim() : (propFirm.trim() || 'FTMO');
      const isChallengePhase = phase === 'Phase 1' || phase === 'Phase 2';
      const targetPct = isChallengePhase ? parsedTargetPct : 0;
      const targetDollar = isChallengePhase ? Math.round(size * (targetPct / 100)) : 0;

      const sizeLabel = size >= 1000 ? `${(size / 1000).toFixed(0)}k` : `${size}`;
      const finalName = name.trim() || `${firmName} $${sizeLabel} ${phase}`;

      addCampaign({
        name: finalName,
        broker: firmName,
        accountSize: size,
        accountNumber: accountNumber.trim() || `${Math.floor(100000 + Math.random() * 900000)}`,
        platform,
        phase,
        status: 'Active',
        startingBalance: size,
        currentBalance: size,
        profitTarget: targetDollar,
        profitTargetPercent: targetPct,
        maxDailyDrawdown: dailyDDDollar,
        maxDailyDrawdownPercent: parsedDailyDDPct,
        maxDrawdown: maxDDDollar,
        maxDrawdownPercent: parsedMaxDDPct,
        startDate: new Date().toISOString(),
        parentCampaignId: sourceCampaignId
      });

      if (sourceCampaignId) {
        updateCampaign(sourceCampaignId, { nextPhaseConnected: true });
      }
    }

    // Reset state & close
    setName('');
    setAccountNumber('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className="bg-white/95 dark:bg-[#111722]/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200/80 dark:border-[#1E293B] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200/80 dark:border-[#1E293B] bg-gray-50/50 dark:bg-[#141B26]/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs border ${accountCategory === 'real'
                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200/60 dark:border-purple-900/60'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/60'
              }`}>
              {accountCategory === 'real' ? <Wallet className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {accountCategory === 'real' ? 'Connect Real Trading Account' : 'Connect Prop Firm Account'}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold border uppercase ${accountCategory === 'real'
                    ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/60'
                    : 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/60'
                  }`}>
                  {accountCategory === 'real' ? 'Live Capital' : 'Prop Evaluation'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {accountCategory === 'real'
                  ? 'Connect your personal live broker account to track real deposits and live balance.'
                  : 'Configure your prop firm challenge evaluation or funded account.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-[#182030] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body or Limit Screen */}
        {!accountCheck.allowed ? (
          <div className="p-6 sm:p-8 text-center space-y-5 my-auto flex-1 flex flex-col items-center justify-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/10">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                {userPlan} Plan Limit Reached ({accountCheck.billableCount}/{accountCheck.maxAllowed} Accounts)
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                Trading Account Limit Reached
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {accountCheck.message}
              </p>
            </div>

            {/* Plan comparison pill */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#141B26] border border-gray-200 dark:border-slate-800 max-w-md w-full text-left space-y-2">
              <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Trading Account Rules:</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 font-bold">
                  <span>Starter (1 Month):</span>
                  <span>2 Accounts</span>
                </div>
                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold">
                  <span>Pro (3 Months):</span>
                  <span>10 Accounts (Most Popular)</span>
                </div>
                <div className="flex items-center justify-between text-violet-600 dark:text-violet-400 font-bold">
                  <span>Premium (6 Months):</span>
                  <span>Unlimited Accounts</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 pt-1 border-t border-gray-200/60 dark:border-slate-800/80">
                * Passing Phase 1 and connecting Phase 2 counts as <strong>1 account</strong>.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
              <button
                type="button"
                onClick={() => {
                  setUpgradeReason(accountCheck.message || 'Upgrade to unlock more trading accounts');
                  setIsUpgradeModalOpen(true);
                }}
                className="w-full sm:w-auto flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Upgrade to {accountCheck.nextPlan}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">

            {/* PRIMARY TOGGLE: PROP FIRM ACCOUNT vs REAL ACCOUNT */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-[#141B26] rounded-xl border border-gray-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAccountCategory('prop_firm')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${accountCategory === 'prop_firm'
                    ? 'bg-white dark:bg-[#182030] text-blue-600 dark:text-blue-400 shadow-xs border border-gray-200/60 dark:border-slate-700'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Building2 className="w-4 h-4" />
                <span>PROP FIRM ACCOUNT</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountCategory('real')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${accountCategory === 'real'
                    ? 'bg-white dark:bg-[#182030] text-purple-600 dark:text-purple-400 shadow-xs border border-gray-200/60 dark:border-slate-700'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Wallet className="w-4 h-4" />
                <span>REAL ACCOUNT (LIVE)</span>
              </button>
            </div>

            {/* Challenge Tracking Banner for Free Users */}
            {!hasChallengeTracking && accountCategory === 'prop_firm' && (phase === 'Phase 1' || phase === 'Phase 2') && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Challenge Tracking is a <strong>Pro</strong> feature. Upgrade to Pro for automated challenge evaluation tracking, or select a Funded account.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeReason('Challenge Tracking is included with Pro and Premium memberships.');
                    setIsUpgradeModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] shrink-0 cursor-pointer text-center"
                >
                  Upgrade to Pro
                </button>
              </div>
            )}

          {/* ========================================================================= */}
          {/* SECTION A: PROP FIRM ACCOUNT FORM */}
          {/* ========================================================================= */}
          {accountCategory === 'prop_firm' && (
            <div className="space-y-4">

              {/* Prop Firm Phase Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-500" />
                  Prop Firm Phase
                </label>
                <select
                  value={phase}
                  onChange={e => handlePropPhaseChange(e.target.value as 'Phase 1' | 'Phase 2' | 'Funded')}
                  className="w-full px-3 py-2.5 text-xs font-semibold border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {PROP_PHASE_OPTIONS.map(opt => (
                    <option key={opt.phase} value={opt.phase}>{opt.label} — {opt.desc}</option>
                  ))}
                </select>
              </div>

              {/* Prop Firm & Account Size */}
              <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-[#141B26]/60 border border-gray-200/70 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Account Size */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Account Size ($)</label>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                        ${parsedPropSize > 0 ? parsedPropSize.toLocaleString() : '0'}
                      </span>
                    </div>
                    <select
                      value={propAccountSize}
                      onChange={e => setPropAccountSize(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-semibold border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      required
                    >
                      {PROP_SIZE_PRESETS.map(size => (
                        <option key={size} value={size}>${size >= 1000 ? `${size / 1000}k` : size} (${size.toLocaleString()})</option>
                      ))}
                      <option value="Other">Other (Custom Size)</option>
                    </select>
                    {propAccountSize === 'Other' && (
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">$</span>
                        <input
                          type="number"
                          min="100"
                          step="any"
                          value={customPropAccountSize}
                          onChange={e => setCustomPropAccountSize(e.target.value)}
                          placeholder="Type custom account size (e.g. 15000)..."
                          className="w-full pl-6 pr-3 py-2 text-xs font-semibold border border-blue-500 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-gray-400"
                          required
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* Prop Firm Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">Prop Firm</label>
                    <select
                      value={propFirm}
                      onChange={e => setPropFirm(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-semibold border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      required
                    >
                      {PROP_FIRM_PRESETS.map(firm => (
                        <option key={firm} value={firm}>{firm}</option>
                      ))}
                      <option value="Other">Other (Custom)</option>
                    </select>
                    {propFirm === 'Other' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={customPropFirm}
                          onChange={e => setCustomPropFirm(e.target.value)}
                          placeholder="Type custom prop firm name..."
                          className="w-full px-3 py-2 text-xs font-semibold border border-blue-500 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-gray-400"
                          required
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                </div>

                {/* Profit Target % (For Phase 1 and Phase 2 challenges) */}
                {isChallenge ? (
                  <div className="pt-3 border-t border-gray-200/60 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-emerald-500" />
                        Profit Target %
                      </label>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        Target: +${propTargetDollar.toLocaleString()}
                      </span>
                    </div>

                    <select
                      value={profitTargetPct}
                      onChange={e => setProfitTargetPct(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                      required
                    >
                      {TARGET_PCT_PRESETS.map(pct => (
                        <option key={pct} value={pct}>{pct}% — ${Math.round(parsedPropSize * (pct / 100)).toLocaleString()} target</option>
                      ))}
                      <option value="15">15%</option>
                      <option value="20">20%</option>
                      <option value="Other">Other (Custom %)</option>
                    </select>
                    {profitTargetPct === 'Other' && (
                      <div className="relative mt-2">
                        <input
                          type="number"
                          min="0.5"
                          max="100"
                          step="0.5"
                          value={customProfitTargetPct}
                          onChange={e => setCustomProfitTargetPct(e.target.value)}
                          placeholder="Type custom profit target % (e.g. 7)..."
                          className="w-full pr-7 pl-3 py-2 text-xs font-semibold border border-emerald-500 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none placeholder:text-gray-400"
                          required
                          autoFocus
                        />
                        <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">%</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">
                      Funded Account (Live prop firm capital)
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      No profit target requirement
                    </span>
                  </div>
                )}

                {/* Configurable Prop Firm Drawdown Rules (Rule 4) */}
                <div className="pt-3 border-t border-gray-200/60 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                      Prop Firm Drawdown Rules
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">Configurable per prop firm</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Daily Drawdown % */}
                    <div className="p-3 bg-white dark:bg-[#182030] rounded-xl border border-gray-200/80 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                          Daily Drawdown %
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                          ${dailyDDDollar.toLocaleString()} limit
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          step="0.5"
                          className="w-full px-3 py-1.5 text-xs font-bold border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-[#111722] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500/20"
                          value={dailyDrawdownPct}
                          onChange={e => setDailyDrawdownPct(e.target.value)}
                          placeholder="5"
                          required
                        />
                        <span className="absolute right-3 top-1.5 text-xs font-bold text-gray-400">%</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono block">
                        Limit: ${parsedPropSize.toLocaleString()} × {parsedDailyDDPct}% = ${dailyDDDollar.toLocaleString()}
                      </span>
                    </div>

                    {/* Max Drawdown % */}
                    <div className="p-3 bg-white dark:bg-[#182030] rounded-xl border border-gray-200/80 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                          Maximum Drawdown %
                        </span>
                        <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                          ${maxDDDollar.toLocaleString()} limit
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          step="0.5"
                          className="w-full px-3 py-1.5 text-xs font-bold border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-[#111722] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-rose-500/20"
                          value={maxDrawdownPct}
                          onChange={e => setMaxDrawdownPct(e.target.value)}
                          placeholder="10"
                          required
                        />
                        <span className="absolute right-3 top-1.5 text-xs font-bold text-gray-400">%</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono block">
                        Limit: ${parsedPropSize.toLocaleString()} × {parsedMaxDDPct}% = ${maxDDDollar.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Label, Account # & Platform */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200/60 dark:border-slate-800">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                      Account Name / Label
                    </label>
                    <input
                      type="text"
                      placeholder={`e.g. ${propFirm === 'Other' ? (customPropFirm || 'Custom Firm') : propFirm} $${parsedPropSize >= 1000 ? (parsedPropSize / 1000).toFixed(0) + 'k' : parsedPropSize} ${phase}`}
                      className="w-full px-3 py-2 text-xs border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                      Account Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 589201"
                      className="w-full px-3 py-2 text-xs border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                      Trading Platform
                    </label>
                    <select
                      className="w-full px-3 py-2 text-xs font-semibold border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl"
                      value={platform}
                      onChange={e => setPlatform(e.target.value as any)}
                    >
                      <option value="MT5">MetaTrader 5 (MT5)</option>
                      <option value="MT4">MetaTrader 4 (MT4)</option>
                      <option value="cTrader">cTrader</option>
                      <option value="DXTrade">DXTrade</option>
                      <option value="Match-Trader">Match-Trader</option>
                    </select>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION B: REAL ACCOUNT FORM (ZERO CHALLENGE MECHANICS) */}
          {/* ========================================================================= */}
          {accountCategory === 'real' && (
            <div className="space-y-4">

              {/* Real Account Live Capital Banner */}
              <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/50 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                    Live Personal Trading Account
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-purple-200/60 dark:bg-purple-800/60 text-purple-800 dark:text-purple-200">
                      Real Money
                    </span>
                  </h4>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300/80 mt-0.5">
                    Track your actual starting deposit, live balance, equity, and trade performance. No challenge rules, phases, or profit targets.
                  </p>
                </div>
              </div>

              {/* Real Account Configuration Box */}
              <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-[#141B26]/60 border border-gray-200/70 dark:border-slate-800 space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Actual Starting Balance / Deposit */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                        Actual Starting Deposit / Balance ($)
                      </label>
                      <span className="text-xs font-black text-purple-600 dark:text-purple-400 font-mono">
                        ${parsedDeposit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <select
                      value={startingDeposit}
                      onChange={e => setStartingDeposit(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-semibold border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                      required
                    >
                      {REAL_DEPOSIT_PRESETS.map(dep => (
                        <option key={dep} value={dep}>
                          ${dep >= 1000 ? `${(dep / 1000).toLocaleString()}k` : dep} (${dep.toLocaleString()})
                        </option>
                      ))}
                      <option value="Other">Other (Custom Amount)</option>
                    </select>
                    {startingDeposit === 'Other' && (
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">$</span>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={customStartingDeposit}
                          onChange={e => setCustomStartingDeposit(e.target.value)}
                          placeholder="Type custom starting deposit (e.g. 750)..."
                          className="w-full pl-6 pr-3 py-2 text-xs font-semibold border border-purple-500 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:outline-none placeholder:text-gray-400"
                          required
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* Broker Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                      Broker Name
                    </label>
                    <select
                      value={realBroker}
                      onChange={e => setRealBroker(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-semibold border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                      required
                    >
                      {REAL_BROKER_PRESETS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="Other">Other (Custom Broker)</option>
                    </select>
                    {realBroker === 'Other' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={customRealBroker}
                          onChange={e => setCustomRealBroker(e.target.value)}
                          placeholder="Type custom broker name..."
                          className="w-full px-3 py-2 text-xs font-semibold border border-purple-500 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:outline-none placeholder:text-gray-400"
                          required
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                </div>

                {/* Account Label, Account # & Platform */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200/60 dark:border-slate-800">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                      Account Name / Label
                    </label>
                    <input
                      type="text"
                      placeholder={`e.g. ${realBroker} $${parsedDeposit} Real`}
                      className="w-full px-3 py-2 text-xs border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 placeholder:text-gray-400"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                      Account Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 982014"
                      className="w-full px-3 py-2 text-xs border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                      Trading Platform
                    </label>
                    <select
                      className="w-full px-3 py-2 text-xs font-semibold border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-xl"
                      value={platform}
                      onChange={e => setPlatform(e.target.value as any)}
                    >
                      <option value="MT5">MetaTrader 5 (MT5)</option>
                      <option value="MT4">MetaTrader 4 (MT4)</option>
                      <option value="cTrader">cTrader</option>
                      <option value="TradingView">TradingView</option>
                      <option value="Match-Trader">Match-Trader</option>
                    </select>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-200/80 dark:border-[#1E293B] flex items-center justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-gray-100/80 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-700/60 cursor-pointer transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md active:scale-95 cursor-pointer flex items-center gap-2 transition-all ${accountCategory === 'real'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20'
                }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {accountCategory === 'real'
                  ? 'Connect Real Account'
                  : `Connect Prop Firm Account (${phase})`}
              </span>
            </button>
          </div>
        </form>
        )}
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        targetPlan={accountCheck.nextPlan}
        reason={upgradeReason}
      />
    </div>
  );
}
