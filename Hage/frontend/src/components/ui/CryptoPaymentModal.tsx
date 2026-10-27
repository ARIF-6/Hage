/**
 * CryptoPaymentModal.tsx
 *
 * Professional Web3 Crypto Checkout for USDT on BNB Smart Chain (BEP20).
 * Features:
 * - Institutional-grade styling & glassmorphism
 * - 2-Step interactive flow (Wallet Input → Invoice & Live Settlement)
 * - 1-Click Clipboard paste & copy
 * - Real-time address validation & BSC EVM format check
 * - High-contrast QR code for mobile wallet scanning
 * - Auto-polling on BNB Smart Chain via NOWPayments
 * - Dev simulation trigger for testing
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet,
  X,
  ArrowRight,
  ArrowLeft,
  Zap,
  ClipboardPaste,
} from 'lucide-react';
import {
  createPayment,
  fetchPaymentStatus,
  pollUntilSettled,
  simulatePaymentSuccess,
  statusLabel,
  isPaymentSuccess,
  type CreatePaymentResponse,
  type PaymentStatusResponse,
} from '../../services/paymentService';

interface Props {
  planKey: 'oneMonth' | 'threeMonths' | 'sixMonths';
  planLabel: string;
  usdAmount: number;
  onSuccess: (planKey: string) => void;
  onClose: () => void;
}

type Phase = 'address_input' | 'creating' | 'waiting' | 'success' | 'failed' | 'error';

export function CryptoPaymentModal({ planKey, planLabel, usdAmount, onSuccess, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('address_input');
  const [userWalletAddress, setUserWalletAddress] = useState('');
  const [addressError, setAddressError] = useState('');
  const [invoice, setInvoice] = useState<CreatePaymentResponse | null>(null);
  const [statusMsg, setStatusMsg] = useState('Generating payment invoice…');
  const [latestStatus, setLatestStatus] = useState<PaymentStatusResponse | null>(null);
  const [copied, setCopied] = useState<'address' | 'amount' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [checkingNow, setCheckingNow] = useState(false);

  const token = localStorage.getItem('token') || '';

  // ── Close on Escape key ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ── Address validation ─────────────────────────────────────────────────────
  const isAddressValid = (addr: string): boolean => {
    const trimmed = addr.trim();
    return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  };

  // ── Handle Address Submission & Create Invoice ─────────────────────────────
  const handleProceedToInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = userWalletAddress.trim();

    if (!trimmed) {
      setAddressError('Please enter your crypto wallet address.');
      return;
    }

    if (!trimmed.startsWith('0x')) {
      setAddressError('BEP20 addresses must start with "0x".');
      return;
    }

    if (trimmed.length !== 42 || !/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setAddressError('Please enter a valid 42-character BSC wallet address.');
      return;
    }

    setAddressError('');
    setPhase('creating');
    setStatusMsg('Creating secure invoice on BNB Smart Chain…');

    try {
      const inv = await createPayment(planKey, token, trimmed);
      setInvoice(inv);
      setPhase('waiting');
      setStatusMsg(statusLabel('waiting'));
    } catch (err: any) {
      setPhase('error');
      setErrorMsg(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create payment invoice. Please try again.'
      );
    }
  };

  // ── Paste from clipboard helper ────────────────────────────────────────────
  const handlePasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUserWalletAddress(text.trim());
        setAddressError('');
      }
    } catch (_) {
      // Browser blocked clipboard permission — user can still type/paste manually
    }
  };

  // ── Start polling once invoice is waiting ───────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting' || !invoice) return;
    let cancelled = false;

    pollUntilSettled(
      invoice.paymentId,
      token,
      (status) => {
        if (cancelled) return;
        setLatestStatus(status);
        setStatusMsg(statusLabel(status.paymentStatus));
        if (isPaymentSuccess(status.paymentStatus)) {
          setPhase('success');
        } else if (status.paymentStatus === 'failed' || status.paymentStatus === 'expired') {
          setPhase('failed');
        }
      },
      8000,
      90
    ).then((finalStatus) => {
      if (cancelled) return;
      if (!isPaymentSuccess(finalStatus) && finalStatus !== 'failed') {
        setPhase('failed');
        setStatusMsg('Payment window expired. Please try again.');
      }
    });

    return () => { cancelled = true; };
  }, [phase, invoice, token]);

  // ── Elapsed timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting') return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ── Trigger success callback ────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'success') {
      const t = setTimeout(() => {
        onSuccess(planKey);
      }, 1600);
      return () => clearTimeout(t);
    }
  }, [phase, planKey, onSuccess]);

  // ── Manual Real Blockchain Status Check ───────────────────────────────────────
  const handleCheckNow = async () => {
    if (!invoice || checkingNow) return;
    setCheckingNow(true);
    try {
      const status = await fetchPaymentStatus(invoice.paymentId, token);
      setLatestStatus(status);
      setStatusMsg(statusLabel(status.paymentStatus));
      if (isPaymentSuccess(status.paymentStatus)) {
        setPhase('success');
      } else if (status.paymentStatus === 'waiting') {
        setStatusMsg('Awaiting deposit on BNB Smart Chain. Please verify your transfer.');
      } else if (status.paymentStatus === 'confirming') {
        setStatusMsg('Transaction detected on blockchain! Confirming blocks…');
      }
    } catch (e: any) {
      console.warn('Manual check error:', e);
    } finally {
      setCheckingNow(false);
    }
  };

  // ── Copy helper ─────────────────────────────────────────────────────────────
  const copyText = useCallback((text: string, field: 'address' | 'amount') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, '0')}`;
  };

  const qrUrl = invoice?.payAddress
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invoice.payAddress)}&margin=4`
    : null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-[#0b0f19] border border-slate-800 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden max-h-[92vh] flex flex-col">

        {/* ─── Top Header (Always Visible & Pinned) ─────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-800/80 bg-[#0d1322] shrink-0 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Dual Token / Network Badge */}
              <div className="relative flex items-center">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                  <span className="text-emerald-400 font-extrabold text-xs tracking-tight">₮</span>
                </div>
                <div className="w-5 h-5 -ml-2.5 -mt-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-300 font-bold">
                  B
                </div>
              </div>
              <div>
                <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
                  Crypto Checkout
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    USDT • BEP20
                  </span>
                </h3>
                <p className="text-slate-400 text-xs">BNB Smart Chain — Powered by NOWPayments</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {phase === 'waiting' && (
                <button
                  type="button"
                  onClick={() => setPhase('address_input')}
                  className="text-slate-200 hover:text-white transition-colors rounded-xl px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title="Go back to wallet input"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors rounded-xl p-2 hover:bg-slate-800/80 cursor-pointer"
                aria-label="Close"
                title="Cancel & Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-2 flex-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                phase === 'address_input'
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-500 text-white'
              }`}>
                {phase === 'address_input' ? '1' : <Check className="w-3 h-3" />}
              </div>
              <span className={`text-xs font-semibold ${
                phase === 'address_input' ? 'text-white' : 'text-slate-400'
              }`}>
                Your Wallet
              </span>
            </div>

            <div className="w-8 h-px bg-slate-800" />

            <div className="flex items-center gap-2 flex-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                phase === 'address_input'
                  ? 'bg-slate-800 text-slate-500'
                  : phase === 'success'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-blue-600 text-white'
              }`}>
                {phase === 'success' ? <Check className="w-3 h-3" /> : '2'}
              </div>
              <span className={`text-xs font-semibold ${
                phase === 'address_input' ? 'text-slate-500' : 'text-white'
              }`}>
                Transfer & Confirm
              </span>
            </div>
          </div>
        </div>

        {/* ─── Body Content (Scrollable within modal only) ─────────────────────── */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 overscroll-contain">

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 1: Enter Crypto Address Form
             ═════════════════════════════════════════════════════════════════════ */}
          {phase === 'address_input' && (
            <form onSubmit={handleProceedToInvoice} className="space-y-6">

              {/* Order Summary Glass Card */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Subscription Plan</span>
                    <p className="text-white font-bold text-base tracking-tight">{planLabel}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">Total Due</span>
                    <p className="text-2xl font-black text-white tracking-tight leading-none mt-0.5">
                      ${usdAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Fixed Exchange Rate (1:1)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {usdAmount.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              {/* Wallet Address Input Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    Your Sender Wallet Address
                    <span className="text-rose-400 text-xs">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteAddress}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    Paste
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={userWalletAddress}
                    onChange={(e) => {
                      setUserWalletAddress(e.target.value.trim());
                      if (addressError) setAddressError('');
                    }}
                    placeholder="0x..."
                    autoFocus
                    spellCheck={false}
                    className={`w-full py-3.5 pl-11 pr-24 rounded-2xl bg-slate-900/80 border text-slate-100 placeholder-slate-600 text-sm font-mono transition-all outline-none ${
                      addressError
                        ? 'border-rose-500/70 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : isAddressValid(userWalletAddress)
                        ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        : 'border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Wallet className="w-4 h-4" />
                  </div>

                  {/* Validation status badge inside input */}
                  {userWalletAddress && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      {isAddressValid(userWalletAddress) ? (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Check className="w-3 h-3" /> Valid BSC
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">
                          {userWalletAddress.length}/42
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {addressError ? (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {addressError}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 leading-relaxed pt-0.5">
                    Enter the address you will transfer from (MetaMask, Trust Wallet, Binance, etc.) for instant automated settlement.
                  </p>
                )}
              </div>



              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700/80 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-blue-900/25 transition-all cursor-pointer active:scale-[0.99]"
                >
                  Continue to Payment Invoice
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 2: Creating State
             ═════════════════════════════════════════════════════════════════════ */}
          {phase === 'creating' && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-400">
                  ₮
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white text-base font-bold">{statusMsg}</p>
                <p className="text-slate-400 text-xs">Generating your unique NOWPayments deposit address…</p>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 3: Error State
             ═════════════════════════════════════════════════════════════════════ */}
          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-1">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h4 className="text-white font-bold text-lg">Unable to Create Invoice</h4>
              <p className="text-rose-300 text-xs max-w-sm leading-relaxed">{errorMsg}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setPhase('address_input')}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 4: Success State
             ═════════════════════════════════════════════════════════════════════ */}
          {phase === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-white font-black text-2xl tracking-tight">Payment Verified! 🎉</h4>
                <p className="text-emerald-300 text-sm font-semibold">Your {planLabel} plan is now fully active.</p>
                <p className="text-slate-400 text-xs pt-1">Redirecting to your trading dashboard…</p>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 5: Failed State
             ═════════════════════════════════════════════════════════════════════ */}
          {phase === 'failed' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-1">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h4 className="text-white font-bold text-lg">Payment Expired or Incomplete</h4>
              <p className="text-amber-300 text-xs max-w-sm leading-relaxed">{statusMsg}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setPhase('address_input')}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                >
                  Start Over
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              STEP 6: Waiting for Payment (Invoice Details & Live Checking)
             ═════════════════════════════════════════════════════════════════════ */}
          {phase === 'waiting' && invoice && (
            <div className="space-y-5">

              {/* Live Status Pill */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <p className="text-white text-xs font-bold tracking-tight">{statusMsg}</p>
                    <p className="text-slate-400 text-[10px]">Listening to BNB Smart Chain blocks…</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300 text-xs font-mono bg-slate-800/70 px-2.5 py-1 rounded-lg border border-slate-700/50">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  {formatElapsed(elapsed)}
                </div>
              </div>

              {/* QR Code and Mobile Instructions */}
              <div className="flex flex-col items-center justify-center gap-2 py-1">
                {qrUrl && (
                  <div className="p-3.5 bg-white rounded-3xl shadow-2xl shadow-black/80">
                    <img src={qrUrl} alt="Deposit QR Code" className="w-40 h-40" />
                  </div>
                )}
                <span className="text-[11px] text-slate-400 font-medium pt-1">
                  Scan with MetaMask, Binance, or Trust Wallet
                </span>
              </div>

              {/* Amount to Send Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>Exact Amount to Transfer</span>
                  <span className="text-emerald-400 font-semibold normal-case">USDT (BEP20)</span>
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-slate-900/80 border border-emerald-500/30 rounded-2xl">
                  <span className="text-emerald-400 font-mono font-extrabold text-xl flex-1 tracking-tight">
                    {invoice.payAmount} USDT
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(String(invoice.payAmount), 'amount')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  >
                    {copied === 'amount' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Copied
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" /> Copy Amount
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Deposit Address Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>Send to Deposit Address</span>
                  <span className="text-amber-400 font-semibold normal-case">BNB Smart Chain</span>
                </div>
                <div className="flex items-center gap-2 p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                  <span className="text-slate-200 text-xs font-mono break-all flex-1 select-all leading-relaxed">
                    {invoice.payAddress}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(invoice.payAddress, 'address')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  >
                    {copied === 'address' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Copied
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" /> Copy Address
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Sender Wallet verification */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs">
                <span className="text-slate-400">Your Sender Wallet:</span>
                <span className="text-slate-300 font-mono text-[11px] truncate max-w-[220px]">
                  {userWalletAddress}
                </span>
              </div>

              {/* Action Button: Real Blockchain Checkup */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCheckNow}
                  disabled={checkingNow}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingNow ? 'animate-spin' : ''}`} />
                  {checkingNow ? 'Verifying Payment…' : 'Submit Payment'}
                </button>

                {/* Back and Cancel Navigation Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPhase('address_input')}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700/80 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Wallet
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 font-semibold text-xs border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel & Exit
                  </button>
                </div>
              </div>

              {/* Network Warning Box */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Only send USDT via BEP20 (Binance Smart Chain)</span>
                </div>
                <p className="text-[11px] text-amber-300/70 leading-relaxed pl-5">
                  Do not send via Tron (TRC20), Ethereum (ERC20), or Solana. Transactions sent on the wrong network cannot be recovered.
                </p>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
