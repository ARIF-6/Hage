import { useState } from 'react';
import { X, Lock, AlertTriangle, AlertCircle, Building2, Wallet, Sparkles, TrendingUp, Calendar, Hash } from 'lucide-react';
import { useTradeStore } from '../../store/useTradeStore';
import { canAddTrade, getUserPlan, triggerReadOnlyAlert, isDashboardReadOnly } from '../../store/subscriptionRules';
import { UpgradeModal } from './UpgradeModal';

interface AddTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillTrade?: {
    id: string;
    symbol: string;
    type: 'Buy' | 'Sell';
    lotSize: number;
    risk: number;
    result: 'Win' | 'Loss' | 'Break Even' | 'Pending';
    pnl: number;
    session: string;
    date: string;
  } | null;
}

export function AddTradeModal({ isOpen, onClose, prefillTrade }: AddTradeModalProps) {
  const { trades, addTrade, campaigns, activeCampaignId, setActiveCampaign } = useTradeStore();
  
  const targetCampaign = campaigns.find(c => c.id === activeCampaignId) || (campaigns.length > 0 ? campaigns[0] : null);

  const [symbol, setSymbol] = useState(prefillTrade?.symbol || '');
  const [type, setType] = useState<'Buy'|'Sell'>(prefillTrade?.type || 'Buy');
  const [lotSize, setLotSize] = useState(prefillTrade?.lotSize?.toString() || '');
  const [risk, setRisk] = useState(prefillTrade?.risk?.toString() || '');
  const [result, setResult] = useState<'Win' | 'Loss' | 'Break Even' | 'Pending'>(prefillTrade?.result || 'Pending');
  const [pnl, setPnl] = useState(prefillTrade?.pnl?.toString() || '');
  const [imageUrl, setImageUrl] = useState('');
  const [session, setSession] = useState<'London' | 'New York' | 'Asia' | 'London / New York Overlap'>(
    (prefillTrade?.session as any) || 'London'
  );
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [date, setDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  if (!isOpen) return null;

  const now = new Date();
  const tradesThisMonth = trades.filter(t => {
    const d = new Date(t.date);
    return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const tradeCheck = canAddTrade(tradesThisMonth);
  const userPlan = getUserPlan();

  const isPassed = targetCampaign?.status === 'Passed';
  const isFailed = targetCampaign?.status === 'Failed';
  const isZeroBalanceReal = targetCampaign?.phase === 'Real Account' && targetCampaign.currentBalance <= 0;
  const isLocked = isPassed || isFailed || isZeroBalanceReal || !tradeCheck.allowed;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (triggerReadOnlyAlert('add or log a trade')) { onClose(); return; }
    if (!tradeCheck.allowed) { setIsUpgradeModalOpen(true); return; }
    if (isLocked) return;
    
    let finalPnl = parseFloat(pnl) || 0;
    if (result === 'Loss' && finalPnl > 0) finalPnl = -finalPnl;

    addTrade({
      date: new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }),
      symbol: symbol.toUpperCase(),
      type,
      lotSize: parseFloat(lotSize) || 0,
      risk: parseFloat(risk) || 0,
      result,
      pnl: finalPnl,
      imageUrl: imageUrl || undefined,
      session
    });
    
    setSymbol(''); setLotSize(''); setRisk(''); setPnl(''); setImageUrl(''); setSession('London');
    const n = new Date();
    const pad = (x: number) => x.toString().padStart(2, '0');
    setDate(`${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`);
    onClose();
  };

  const inputCls = `w-full px-3 py-2 text-xs font-medium border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#0D1420] text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed`;
  const labelCls = `block text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#111722] rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-[#1E293B] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">Log New Trade</h3>
                {userPlan !== 'Free' ? (
                  <span className="text-[10px] text-blue-200 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Unlimited trades
                  </span>
                ) : (
                  <span className="text-[10px] text-blue-200">{tradesThisMonth}/50 this month</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">

          {/* Limit alert */}
          {!tradeCheck.allowed && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="font-bold text-gray-800 dark:text-white">50/50 limit reached</span>
              </div>
              <button type="button" onClick={() => setIsUpgradeModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] shrink-0 cursor-pointer">
                Upgrade
              </button>
            </div>
          )}

          {/* Account selector */}
          {campaigns.length > 0 && (
            <div className="p-2.5 bg-gray-50 dark:bg-[#182030] rounded-xl border border-gray-200/60 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account</span>
                {targetCampaign && (
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                    targetCampaign.phase === 'Real Account'
                      ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800'
                      : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800'
                  }`}>
                    {targetCampaign.phase}
                  </span>
                )}
              </div>
              {campaigns.length === 1 ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-slate-200">
                  {targetCampaign?.phase === 'Real Account' ? <Wallet className="w-3 h-3 text-purple-500" /> : <Building2 className="w-3 h-3 text-blue-500" />}
                  <span className="truncate">{targetCampaign?.name}</span>
                  <span className="text-gray-400 font-normal shrink-0">(${targetCampaign?.currentBalance.toLocaleString()})</span>
                </div>
              ) : (
                <select
                  className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#111722] text-gray-900 dark:text-white"
                  value={targetCampaign?.id}
                  onChange={e => setActiveCampaign(e.target.value)}
                >
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phase} – ${c.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Lock banners */}
          {isPassed && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs">
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">PASSED — Account is read-only</span>
            </div>
          )}
          {isFailed && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="font-semibold text-rose-800 dark:text-rose-300">FAILED — Account is closed</span>
            </div>
          )}
          {isZeroBalanceReal && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold text-amber-800 dark:text-amber-300">Balance $0 — Add deposit to trade</span>
            </div>
          )}

          {/* Date & Symbol row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>
                <Calendar className="w-3 h-3 inline mr-1" />Date
              </label>
              <input type="datetime-local" disabled={isLocked} className={inputCls} value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>
                <Hash className="w-3 h-3 inline mr-1" />Symbol
              </label>
              <input type="text" disabled={isLocked} placeholder="EURUSD" className={inputCls} value={symbol} onChange={e => setSymbol(e.target.value)} required />
            </div>
          </div>

          {/* Type & Session */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>Type</label>
              <select disabled={isLocked} className={inputCls} value={type} onChange={e => setType(e.target.value as any)}>
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Session</label>
              <select disabled={isLocked} className={inputCls} value={session} onChange={e => setSession(e.target.value as any)}>
                <option value="London">London</option>
                <option value="New York">New York</option>
                <option value="Asia">Asia</option>
                <option value="London / New York Overlap">LDN/NY Overlap</option>
              </select>
            </div>
          </div>

          {/* Lot Size & Risk */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>Lot Size</label>
              <input type="number" disabled={isLocked} step="0.01" placeholder="1.00" className={inputCls} value={lotSize} onChange={e => setLotSize(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Risk %</label>
              <input type="number" disabled={isLocked} step="0.1" placeholder="1.5" className={inputCls} value={risk} onChange={e => setRisk(e.target.value)} />
            </div>
          </div>

          {/* Result & P&L */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>Result</label>
              <select disabled={isLocked} className={inputCls} value={result} onChange={e => setResult(e.target.value as any)}>
                <option value="Pending">Pending</option>
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
                <option value="Break Even">Break Even</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>P&L ($)</label>
              <input type="number" disabled={isLocked} step="0.01" placeholder="0.00" className={inputCls} value={pnl} onChange={e => setPnl(e.target.value)} />
            </div>
          </div>

          {/* Screenshot */}
          <div>
            <label className={labelCls}>Screenshot (optional)</label>
            <input
              type="file"
              disabled={isLocked}
              accept="image/*"
              onChange={handleImageUpload}
              className={`${inputCls} file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 dark:file:bg-blue-950/80 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer`}
            />
            {imageUrl && (
              <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Image attached</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLocked}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
            >
              {isLocked ? (tradeCheck.allowed ? 'Locked' : 'Limit Reached') : 'Save Trade'}
            </button>
          </div>
        </form>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        targetPlan="Pro"
        reason="Upgrade to Pro for Unlimited Trades, Advanced Analytics, 10 Trading Accounts, and Challenge Tracking."
      />
    </div>
  );
}
