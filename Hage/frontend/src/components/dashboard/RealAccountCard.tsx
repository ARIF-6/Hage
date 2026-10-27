import { useState } from 'react';
import { 
  Wallet, Building2, TrendingUp, TrendingDown, ArrowUpRight, 
  ArrowDownRight, History, Layers, Plus, Minus, AlertCircle, X, DollarSign, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useTradeStore, type Campaign } from '../../store/useTradeStore';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface RealAccountCardProps {
  campaign: Campaign;
}

export function RealAccountCard({ campaign }: RealAccountCardProps) {
  const { trades, transactions = [], addDeposit, addWithdrawal } = useTradeStore();

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');

  // Filter trades for this real account
  const accountTrades = trades.filter(t => t.campaignId === campaign.id);
  const totalTrades = accountTrades.length;
  const wins = accountTrades.filter(t => t.result === 'Win').length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const totalTradingPnl = accountTrades.reduce((sum, t) => sum + t.pnl, 0);

  // Filter transactions for this account
  const accountTransactions = transactions.filter(tx => tx.campaignId === campaign.id);
  const addedDeposits = accountTransactions
    .filter(tx => tx.type === 'Deposit')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalWithdrawals = accountTransactions
    .filter(tx => tx.type === 'Withdrawal')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const startingBalance = campaign.startingBalance || campaign.accountSize;
  const totalDeposits = startingBalance + addedDeposits;
  const currentBalance = campaign.currentBalance;
  const equity = currentBalance; // Live equity

  // Trading net P&L
  const netPnl = totalTradingPnl;
  const pnlPercent = totalDeposits > 0 ? (netPnl / totalDeposits) * 100 : 0;

  const isZeroBalance = currentBalance <= 0;

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;

    addDeposit(campaign.id, amount, depositNote.trim() || 'Account Deposit');
    setDepositAmount('');
    setDepositNote('');
    setIsDepositOpen(false);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || amount > currentBalance) return;

    addWithdrawal(campaign.id, amount, withdrawNote.trim() || 'Account Withdrawal');
    setWithdrawAmount('');
    setWithdrawNote('');
    setIsWithdrawOpen(false);
  };

  return (
    <>
      <Card className="border border-purple-200/80 dark:border-purple-900/40 shadow-xs bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md border bg-purple-50 dark:bg-purple-950/70 border-purple-200/60 dark:border-purple-800/60 text-purple-700 dark:text-purple-300">
                  <Wallet className="w-3 h-3" />
                  Real Account
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500">•</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-slate-400">
                  <Building2 className="w-3 h-3 text-blue-500" />
                  {campaign.broker}
                </span>
              </div>
              <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                {campaign.name}
              </CardTitle>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#182030] border border-gray-200/50 dark:border-slate-800 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-purple-500" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-3 pb-4 space-y-4">
          
          {/* ZERO BALANCE STATE: NOT FAILED (Rule 8) */}
          {isZeroBalance ? (
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Account Balance: $0.00 (Trading Paused)</span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                  Active Account
                </span>
              </div>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                This is a live personal trading account and is never marked Failed. Add a deposit below to resume trading.
              </p>
              <button
                onClick={() => setIsDepositOpen(true)}
                className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deposit to Resume Trading</span>
              </button>
            </div>
          ) : (
            /* Live Capital Status Banner */
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-purple-900 dark:text-purple-200 block text-xs">
                  Live Personal Trading Account
                </span>
                <span className="text-gray-500 dark:text-slate-400 text-[11px]">
                  Platform: {campaign.platform} • Active Real Capital
                </span>
              </div>
              <div className="text-right">
                <span className={`text-sm font-black font-mono block ${
                  netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {netPnl >= 0 ? '+' : '-'}${Math.abs(netPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-[10px] font-bold ${
                  netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}% net
                </span>
              </div>
            </div>
          )}

          {/* Quick Balance Actions: Add Deposit & Withdraw Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsDepositOpen(true)}
              className="py-2 px-3 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Add Deposit</span>
            </button>
            <button
              onClick={() => setIsWithdrawOpen(true)}
              disabled={currentBalance <= 0}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                currentBalance <= 0
                  ? 'bg-gray-100 dark:bg-[#182030] text-gray-400 dark:text-slate-600 border border-gray-200/50 dark:border-slate-800 cursor-not-allowed'
                  : 'bg-gray-50 dark:bg-[#182030] hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200/80 dark:border-slate-700 cursor-pointer'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>

          {/* Key Financial Metrics Grid — compact 2-col matching ChallengeCard height */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            
            {/* Current Balance */}
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
                Balance
              </span>
              <span className={`text-sm font-extrabold font-mono mt-0.5 block ${
                isZeroBalance ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'
              }`}>
                ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Net P&L */}
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
                Net P&L
              </span>
              <span className={`text-sm font-black font-mono mt-0.5 flex items-center gap-1 ${
                netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {netPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {netPnl >= 0 ? '+' : '-'}${Math.abs(netPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>


          </div>

          {/* Transactions Ledger Toggle & List */}
          {accountTransactions.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowTransactions(!showTransactions)}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 mb-2"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{showTransactions ? 'Hide' : 'View'} Account Transactions ({accountTransactions.length})</span>
              </button>

              {showTransactions && (
                <div className="p-2.5 rounded-xl bg-gray-50/70 dark:bg-[#182030]/60 border border-gray-200/60 dark:border-slate-800 space-y-2 max-h-48 overflow-y-auto custom-scrollbar text-xs">
                  {accountTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#111722] border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded-md text-[10px] font-black ${
                          tx.type === 'Deposit'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400'
                        }`}>
                          {tx.type === 'Deposit' ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        </span>
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white block text-xs">{tx.note || tx.type}</span>
                          <span className="text-[10px] text-gray-400">{format(new Date(tx.date), 'MMM d, yyyy HH:mm')}</span>
                        </div>
                      </div>
                      <span className={`font-mono font-bold ${
                        tx.type === 'Deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {tx.type === 'Deposit' ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Trade History Footer Summary */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1E293B] text-xs text-gray-500 dark:text-slate-400">
            <div className="flex items-center gap-2 font-medium">
              <History className="w-3.5 h-3.5 text-gray-400" />
              <span>{totalTrades} Trades Executed</span>
              <span>•</span>
              <span className="font-bold text-gray-900 dark:text-white">{winRate.toFixed(1)}% Win Rate</span>
            </div>

            <Link
              to="/dashboard/trades"
              className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline flex items-center gap-1"
            >
              <span>Trade History</span>
              <Layers className="w-3 h-3" />
            </Link>
          </div>

        </CardContent>
      </Card>

      {/* ADD DEPOSIT MODAL */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111722] rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Add Deposit</h4>
              </div>
              <button 
                onClick={() => setIsDepositOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Deposit Amount ($)
                </label>
                <input 
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 300, 500, 1000"
                  className="w-full px-3 py-2 text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Note / Reference (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Account Top-Up, Wire Transfer"
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-white rounded-xl"
                  value={depositNote}
                  onChange={e => setDepositNote(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDepositOpen(false)}
                  className="flex-1 py-2 px-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111722] rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Record Withdrawal</h4>
              </div>
              <button 
                onClick={() => setIsWithdrawOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-4 space-y-3.5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Withdrawal Amount ($)
                  </label>
                  <span className="text-[10px] text-gray-400">
                    Max: ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <input 
                  type="number"
                  min="1"
                  max={currentBalance}
                  step="any"
                  placeholder="e.g. 200"
                  className="w-full px-3 py-2 text-xs font-bold border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Note / Reference (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Profit Withdrawal"
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-white rounded-xl"
                  value={withdrawNote}
                  onChange={e => setWithdrawNote(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(false)}
                  className="flex-1 py-2 px-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
