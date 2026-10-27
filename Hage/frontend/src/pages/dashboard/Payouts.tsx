import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Clock, Plus, 
  ShieldCheck, FileText, X, CheckCircle2,
  AlertCircle, RotateCcw, Check, Ban, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useTradeStore, type Payout } from '../../store/useTradeStore';
import { triggerReadOnlyAlert } from '../../store/subscriptionRules';
import { format } from 'date-fns';

const REJECTION_REASONS_PRESETS = [
  'Minimum trading days not met',
  'Open trade positions detected during payout request',
  'KYC verification document expired / update required',
  'Prop firm news trading rule restriction violated',
  'Weekend holding rule violation under review'
];

export default function Payouts() {
  const { campaigns, payouts, addPayout, approvePayout, rejectPayout } = useTradeStore();
  
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [activeRejectPayout, setActiveRejectPayout] = useState<Payout | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Pending' | 'Rejected'>('All');

  // Filter funded or real accounts eligible for payouts (fallback to all active accounts if none yet)
  // Only Funded and Real accounts can request payouts — no Phase 1 / Phase 2 fallback
  const eligibleAccounts = campaigns.filter(
    c => (c.phase === 'Funded' || c.phase === 'Real Account') && c.status !== 'Failed'
  );

  // Form State for Requesting Payout
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    eligibleAccounts.length > 0 ? eligibleAccounts[0].id : ''
  );
  const [amount, setAmount] = useState<string>('2000');
  const [payoutDate, setPayoutDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<'Pending' | 'Approved'>('Pending');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [proofName, setProofName] = useState<string>('');
  const [hasQrCode, setHasQrCode] = useState<boolean>(true);
  const [viewingProofPayout, setViewingProofPayout] = useState<Payout | null>(null);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || eligibleAccounts[0];

  // REAL ACCOUNT ELIGIBILITY RULES (Requirement 2 & 6)
  const startingBal = selectedCampaign ? (selectedCampaign.startingBalance || selectedCampaign.accountSize) : 0;
  const currentBal = selectedCampaign ? selectedCampaign.currentBalance : 0;
  const netProfit = currentBal - startingBal;

  const isDrawdown = netProfit < 0;
  const isBreakEven = netProfit === 0;
  const isProfitPositive = netProfit > 0;
  const isChallengePhase = selectedCampaign?.phase === 'Phase 1' || selectedCampaign?.phase === 'Phase 2';

  // Eligible ONLY when funded/real and has strictly positive net profit
  const isPayoutEligible = isProfitPositive && !isChallengePhase;
  const maxEligiblePayout = Math.max(0, netProfit);

  // Payout Summary Statistics (Requirement 10)
  const allPayouts = payouts || [];
  
  // 1. Total Payouts (all recorded requests)
  const totalPayoutsCount = allPayouts.length;

  // 2. Total Paid Out (ONLY Approved/Completed count toward this!)
  const approvedPayouts = allPayouts.filter(p => p.status === 'Approved' || p.status === 'Completed');
  const totalPaidOut = approvedPayouts.reduce((sum, p) => sum + p.amount, 0);

  // 3. Pending Payouts
  const pendingPayouts = allPayouts.filter(p => p.status === 'Pending');
  const pendingPayoutsCount = pendingPayouts.length;

  // 4. Rejected Payouts
  const rejectedPayouts = allPayouts.filter(p => p.status === 'Rejected');
  const rejectedPayoutsCount = rejectedPayouts.length;

  // 5. Latest Payout
  const latestPayout = allPayouts.length > 0 ? allPayouts[0] : null;

  // Form balance calculations
  const numAmount = parseFloat(amount) || 0;
  const currentBalance = selectedCampaign?.currentBalance || 0;
  const balanceAfterIfApproved = Math.max(0, currentBalance - numAmount);
  const remainingProfit = Math.max(0, netProfit - numAmount);

  // Filtered list for display
  const displayedPayouts = allPayouts.filter(p => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Approved') return p.status === 'Approved' || p.status === 'Completed';
    return p.status === statusFilter;
  });


  const handleOpenRequestModal = (preselectedCampaignId?: string, prefillAmount?: number) => {
    if (triggerReadOnlyAlert('request a payout')) return;
    let targetCampaignId = preselectedCampaignId;
    if (!targetCampaignId) {
      // Prefer an account that currently has positive eligible profit
      const firstInProfit = eligibleAccounts.find(c => (c.currentBalance - (c.startingBalance || c.accountSize)) > 0);
      targetCampaignId = firstInProfit ? firstInProfit.id : (eligibleAccounts.length > 0 ? eligibleAccounts[0].id : '');
    }
    
    setSelectedCampaignId(targetCampaignId);

    const targetCampaign = campaigns.find(c => c.id === targetCampaignId);
    const targetProfit = targetCampaign ? targetCampaign.currentBalance - (targetCampaign.startingBalance || targetCampaign.accountSize) : 0;
    
    if (prefillAmount) {
      setAmount(prefillAmount.toString());
    } else if (targetProfit > 0) {
      setAmount(Math.min(2000, targetProfit).toString());
    } else {
      setAmount('0');
    }

    setProofUrl('');
    setProofName('');
    setError('');
    setStatus('Pending');
    setIsRequestModalOpen(true);
  };

  const handleRecordPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) {
      setError('Please select an account for the payout.');
      return;
    }

    // Eligibility check
    if (isChallengePhase) {
      setError('Payout unavailable for evaluation challenge accounts. Only Funded and Real accounts are eligible.');
      return;
    }
    if (isDrawdown) {
      setError('Payout unavailable while the account is in drawdown.');
      return;
    }
    if (isBreakEven || !isProfitPositive) {
      setError('Payout unavailable. Your account must be in profit to request a payout.');
      return;
    }
    if (numAmount <= 0) {
      setError('Payout amount must be greater than $0.');
      return;
    }
    if (numAmount > maxEligiblePayout) {
      setError(`Payout amount cannot exceed available profit ($${maxEligiblePayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}). Initial capital must remain intact.`);
      return;
    }
    addPayout({
      campaignId: selectedCampaign.id,
      amount: numAmount,
      date: new Date(payoutDate).toISOString(),
      status,
      notes,
      proofUrl: proofUrl || undefined,
      proofName: proofName || undefined,
      proofDate: payoutDate,
      hasQrCode
    });

    setIsRequestModalOpen(false);
    setAmount('0');
    setNotes('');
    setProofUrl('');
    setProofName('');
    setError('');
  };

  const handleOpenRejectModal = (payout: Payout) => {
    setActiveRejectPayout(payout);
    setRejectionReasonText('Minimum trading days not met');
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = () => {
    if (!activeRejectPayout) return;
    rejectPayout(activeRejectPayout.id, rejectionReasonText || 'Payout criteria not met.');
    setIsRejectModalOpen(false);
    setActiveRejectPayout(null);
  };

  return (
    <div className="max-w-[1680px] mx-auto w-full pb-16 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <DollarSign className="w-7 h-7 text-emerald-500" />
              Payouts Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              Connected to Funded accounts. Track withdrawals, approvals, and balance adjustments in real time.
            </p>
          </div>

          <button
            onClick={() => handleOpenRequestModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Request New Payout</span>
          </button>
        </div>

        {/* 5 Summary KPI Cards (Requirement 10) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* 1. Total Payouts */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Payouts</span>
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <FileText className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {totalPayoutsCount}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                Total requests submitted
              </p>
            </CardContent>
          </Card>

          {/* 2. Total Paid Out (Approved Only) */}
          <Card className="hover:shadow-md transition-all duration-200 border-emerald-200/60 dark:border-emerald-900/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Paid Out</span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ${totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 font-medium">
                {approvedPayouts.length} Approved payouts
              </p>
            </CardContent>
          </Card>

          {/* 3. Pending Payouts */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending Payouts</span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                {pendingPayoutsCount}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                Awaiting approval review
              </p>
            </CardContent>
          </Card>

          {/* 4. Rejected Payouts */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Rejected Payouts</span>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                  <Ban className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                {rejectedPayoutsCount}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                Zero balance deducted
              </p>
            </CardContent>
          </Card>

          {/* 5. Latest Payout */}
          <Card className="hover:shadow-md transition-all duration-200 col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Latest Payout</span>
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                {latestPayout ? `$${latestPayout.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'No Payouts'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium truncate">
                {latestPayout ? `${format(new Date(latestPayout.date), 'MMM d, yyyy')} (${latestPayout.status})` : 'Awaiting first withdrawal'}
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Main Payouts Table Card */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Payout History & Financial Ledger
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Approved withdrawals deduct from account balance. Rejected payouts maintain full original balance.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-[#182030] rounded-xl border border-gray-200/50 dark:border-slate-800 text-xs">
              {(['All', 'Approved', 'Pending', 'Rejected'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-white dark:bg-[#111722] text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {displayedPayouts.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-[#182030] rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <DollarSign className="w-6 h-6 text-gray-400 dark:text-slate-500" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                  {allPayouts.length === 0 ? 'No Payouts Recorded Yet' : `No ${statusFilter} Payouts Found`}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                  Funded accounts can request withdrawals here. Deductions take effect upon approval.
                </p>
                <button
                  onClick={() => handleOpenRequestModal()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Request First Payout
                </button>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#1E293B] text-gray-400 uppercase text-[10px] tracking-wider bg-gray-50/50 dark:bg-[#141B26]">
                    <th className="py-3.5 px-4 font-semibold">Request Date</th>
                    <th className="py-3.5 px-4 font-semibold">Funded Account</th>
                    <th className="py-3.5 px-4 font-semibold">Prop Firm</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Proof / Certificate</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Balance Before</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Balance After</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Details / Notes</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1E293B]">
                  {displayedPayouts.map(p => {
                    const isApproved = p.status === 'Approved' || p.status === 'Completed';
                    const isRejected = p.status === 'Rejected';
                    const isPending = p.status === 'Pending';

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-[#182030]/50 transition-colors">
                        {/* Date */}
                        <td className="py-3.5 px-4 font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                          {format(new Date(p.date), 'MMM d, yyyy')}
                        </td>

                        {/* Account */}
                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                          {p.accountName}
                          <span className="text-[10px] text-gray-400 block font-mono font-normal">#{p.accountNumber}</span>
                        </td>

                        {/* Prop Firm */}
                        <td className="py-3.5 px-4 font-semibold text-gray-600 dark:text-slate-400 whitespace-nowrap">
                          {p.broker}
                        </td>

                        {/* Payout Amount */}
                        <td className="py-3.5 px-4 text-right font-black text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          +${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Payout Proof / Certificate */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {p.proofUrl ? (
                            <button
                              onClick={() => setViewingProofPayout(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer shadow-xs"
                              title="View uploaded prop firm payout certificate"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Proof</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">None</span>
                          )}
                        </td>

                        {/* Balance Before */}
                        <td className="py-3.5 px-4 text-right font-mono text-gray-500 dark:text-slate-400 whitespace-nowrap">
                          ${p.balanceBefore.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Balance After */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                          <span className={isApproved ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400'}>
                            ${p.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isApproved
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border-emerald-200/50'
                              : isPending
                              ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border-amber-200/50'
                              : 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border-rose-200/50'
                          }`}>
                            {isApproved ? 'Approved' : p.status}
                          </span>
                        </td>

                        {/* Details / Rejection Reason */}
                        <td className="py-3.5 px-4 max-w-xs">
                          {isRejected ? (
                            <div className="flex items-start gap-1 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>Rejection Reason: {p.rejectionReason || 'Requirements not met.'}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-slate-400 text-[11px]">
                              {p.notes || (isApproved ? 'Balance deducted and paid out.' : 'Awaiting admin / firm approval.')}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => approvePayout(p.id)}
                                  title="Approve Payout (Deducts Balance)"
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <Check className="w-3 h-3" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleOpenRejectModal(p)}
                                  title="Reject Payout (Balance Untouched)"
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <Ban className="w-3 h-3" />
                                  Reject
                                </button>
                              </>
                            )}

                            {isRejected && (
                              <button
                                onClick={() => handleOpenRequestModal(p.campaignId, p.amount)}
                                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Request Payout Again
                              </button>
                            )}

                            {isApproved && (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Completed
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

      </motion.div>

      {/* 1. Request / Record Payout Interactive Modal */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111722] border border-gray-200 dark:border-[#1E293B] rounded-2xl max-w-md w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[#1E293B] shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">Request Payout</h3>
                    <p className="text-[10px] text-gray-400">Withdraw profit from your funded account</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRequestModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Form with Fixed Footer */}
              <form onSubmit={handleRecordPayout} className="flex-1 min-h-0 flex flex-col">
                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto px-4 py-2.5 space-y-2 custom-scrollbar">
                  {error && (
                    <div className="p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-lg text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                      {error}
                    </div>
                  )}

                  {/* Account Selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-0.5">
                      Select Funded or Real Account
                    </label>
                    {eligibleAccounts.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-700 dark:text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>No Funded or Real accounts found. Complete a challenge to unlock payouts.</span>
                      </div>
                    ) : (
                      <select
                        value={selectedCampaignId}
                        onChange={(e) => {
                          const newId = e.target.value;
                          setSelectedCampaignId(newId);
                          const target = campaigns.find(c => c.id === newId);
                          const p = target ? target.currentBalance - (target.startingBalance || target.accountSize) : 0;
                          setAmount(p > 0 ? Math.min(2000, p).toString() : '0');
                          setError('');
                        }}
                        className="w-full px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      >
                        {eligibleAccounts.map(c => {
                          const cProfit = c.currentBalance - (c.startingBalance || c.accountSize);
                          const statusTag = cProfit > 0
                            ? `+$${cProfit.toLocaleString()} Profit (Eligible)`
                            : cProfit < 0
                            ? `-$${Math.abs(cProfit).toLocaleString()} Drawdown (Ineligible)`
                            : 'Break-Even (Ineligible)';
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.phase}) — ${c.currentBalance.toLocaleString()} [{statusTag}]
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  {/* REAL-TIME ELIGIBILITY STATUS BANNER */}
                  {isChallengePhase ? (
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[11px]">Payout unavailable for Challenge accounts.</p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 leading-tight">
                          This account is currently in {selectedCampaign?.phase}. Only live Funded accounts and Real accounts are eligible for profit payouts.
                        </p>
                      </div>
                    </div>
                  ) : isDrawdown ? (
                    <div className="p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[11px]">Payout unavailable while in drawdown.</p>
                        <p className="text-[10px] text-rose-700 dark:text-rose-400 mt-0.5 leading-tight">
                          The account is -${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })} below starting balance (${startingBal.toLocaleString()}).
                        </p>
                      </div>
                    </div>
                  ) : isBreakEven ? (
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[11px]">Payout unavailable (At break-even).</p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 leading-tight">
                          Account balance is at break-even (${startingBal.toLocaleString()}). Zero profit to withdraw.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="font-bold text-[11px]">Account is Eligible for Payout</p>
                          <p className="text-[9px] text-emerald-700 dark:text-emerald-400 font-normal">
                            Available net profit above initial capital:
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                        +${maxEligiblePayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {/* Payout Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300">
                        Payout Amount ($)
                      </label>
                      {isPayoutEligible && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          Max: ${maxEligiblePayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={isPayoutEligible ? maxEligiblePayout : 0}
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={!isPayoutEligible}
                      placeholder={isPayoutEligible ? 'Enter payout amount' : 'Unavailable (Not in profit)'}
                      className={`w-full px-2.5 py-1 text-xs font-bold rounded-lg border text-gray-900 dark:text-white transition-all ${
                        !isPayoutEligible
                          ? 'bg-gray-100 dark:bg-slate-800/50 border-gray-200 dark:border-slate-800 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-50 dark:bg-[#182030] border-gray-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500'
                      }`}
                      required
                    />

                    {/* Quick Percentage Chips */}
                    {isPayoutEligible && (
                      <div className="flex gap-1 mt-1">
                        {[0.25, 0.5, 0.75, 1.0].map(fraction => {
                          const val = Math.round(maxEligiblePayout * fraction);
                          return (
                            <button
                              key={fraction}
                              type="button"
                              onClick={() => setAmount(val.toString())}
                              className="flex-1 px-1 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-[#182030] text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                            >
                              {fraction === 1.0 ? '100%' : `${fraction * 100}%`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Payout Date & Status */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-0.5">
                        Request Date
                      </label>
                      <input
                        type="date"
                        value={payoutDate}
                        onChange={(e) => setPayoutDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-medium rounded-lg bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-0.5">
                        Initial Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-2 py-1 text-xs font-bold rounded-lg bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Pending">Pending (Review)</option>
                        <option value="Approved">Approved (Instant)</option>
                      </select>
                    </div>
                  </div>

                  {/* Payout Breakdown Summary */}
                  <div className="rounded-xl border border-gray-200/80 dark:border-slate-700/60 overflow-hidden text-[11px]">
                    {/* Header */}
                    <div className="bg-gray-100 dark:bg-[#161f2e] px-3 py-1.5 flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">Payout Breakdown</span>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                      {/* Row 1: Starting Capital */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-[#111722]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                          <span className="text-gray-500 dark:text-slate-400">Starting Capital</span>
                        </div>
                        <span className="font-semibold text-gray-700 dark:text-slate-300 tabular-nums">
                          ${startingBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Row 2: Current Balance */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-[#111722]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                          <span className="text-gray-500 dark:text-slate-400">Current Balance</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                          ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Row 3: Net Profit */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-[#111722]">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${netProfit > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <span className="text-gray-500 dark:text-slate-400">Net Profit</span>
                        </div>
                        <span className={`font-bold tabular-nums ${netProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Divider with label */}
                      <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 dark:bg-rose-950/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                        <span className="flex-1 text-rose-600 dark:text-rose-400 font-semibold">You are requesting to withdraw</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          −${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Row 4: Remaining Profit After */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-[#111722]">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${remainingProfit > 0 ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                          <span className="text-gray-500 dark:text-slate-400">Remaining Profit</span>
                        </div>
                        <span className={`font-semibold tabular-nums ${remainingProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                          ${remainingProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Final Result */}
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-t-2 border-emerald-200 dark:border-emerald-800/60">
                      <div>
                        <p className="font-black text-[11px] text-emerald-800 dark:text-emerald-300">
                          {status === 'Approved' ? '✓ New Account Balance' : '📋 Balance If Approved'}
                        </p>
                        <p className="text-[9px] text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">
                          {status === 'Pending' ? 'Balance only changes upon approval' : 'Balance deducted immediately'}
                        </p>
                      </div>
                      <span className="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                        ${balanceAfterIfApproved.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-0.5">
                      Notes / Method (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Bank Wire / Deel / Crypto USDT"
                      className="w-full px-2 py-1 text-xs font-medium rounded-lg bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Fixed Action Footer - Always visible outside scroll container */}
                <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-2.5 bg-gray-50/90 dark:bg-[#0d131f] border-t border-gray-100 dark:border-[#1E293B]">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isPayoutEligible || numAmount <= 0 || numAmount > maxEligiblePayout}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                      !isPayoutEligible || numAmount <= 0 || numAmount > maxEligiblePayout
                        ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 active:scale-95 cursor-pointer'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {!isPayoutEligible
                        ? isDrawdown
                          ? 'In Drawdown'
                          : isBreakEven
                          ? 'No Profit'
                          : 'Unavailable'
                        : numAmount > maxEligiblePayout
                        ? 'Exceeds Profit'
                        : `Submit Request ($${numAmount.toLocaleString()})`}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Reject Payout Dialog (Requirements 7 & 9) */}
      <AnimatePresence>
        {isRejectModalOpen && activeRejectPayout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#111722] border border-rose-200 dark:border-rose-900/60 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1E293B]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Reject Payout Request</h3>
                    <p className="text-xs text-rose-500">Balance remains unchanged ($ {activeRejectPayout.balanceBefore.toLocaleString()})</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRejectModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-[#182030] rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Account:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{activeRejectPayout.accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Requested Amount:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">${activeRejectPayout.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                  Select or Enter Rejection Reason
                </label>
                <input
                  type="text"
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:border-rose-500"
                  required
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {REJECTION_REASONS_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReasonText(preset)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer text-left ${
                        rejectionReasonText === preset
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-gray-100 dark:bg-[#182030] text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payout Proof Certificate Document Modal (Requirement 8) */}
      {viewingProofPayout && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setViewingProofPayout(null)}
        >
          <div 
            className="bg-white dark:bg-[#111722] rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-[#1E293B] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#1E293B]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Prop Firm Payout Proof Document
                </h3>
              </div>
              <button 
                onClick={() => setViewingProofPayout(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Certificate Metadata Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Account</span>
                  <span className="font-bold text-gray-900 dark:text-white truncate block">{viewingProofPayout.accountName}</span>
                  <span className="text-[10px] text-gray-400 font-mono font-normal">#{viewingProofPayout.accountNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Prop Firm</span>
                  <span className="font-bold text-gray-900 dark:text-white truncate block">{viewingProofPayout.broker}</span>
                  <span className="text-[10px] text-gray-400 font-normal">Verified Broker</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Payout Amount</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 block">${viewingProofPayout.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-gray-400 font-normal">{format(new Date(viewingProofPayout.date), 'MMM d, yyyy')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Status</span>
                  <span className={`font-black uppercase text-[11px] block mt-0.5 ${
                    viewingProofPayout.status === 'Approved' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : viewingProofPayout.status === 'Pending' 
                      ? 'text-amber-600 dark:text-amber-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {viewingProofPayout.status}
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {viewingProofPayout.status === 'Approved' ? 'Deducted' : 'Not Deducted'}
                  </span>
                </div>
              </div>

              {/* Proof Document Image / Preview */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-[#0B0E14] overflow-hidden flex items-center justify-center min-h-[220px] max-h-[380px]">
                {viewingProofPayout.proofUrl ? (
                  <img 
                    src={viewingProofPayout.proofUrl} 
                    alt={viewingProofPayout.proofName || 'Payout Proof Document'} 
                    className="max-h-[360px] w-auto object-contain mx-auto"
                  />
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No preview available for this document.</p>
                  </div>
                )}
              </div>

              {viewingProofPayout.hasQrCode && (
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Contains official Prop Firm verification QR code & digital disbursement voucher.</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-[#1E293B] flex justify-end">
              <button
                onClick={() => setViewingProofPayout(null)}
                className="px-4 py-2 bg-gray-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
