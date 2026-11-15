/**
 * CryptoPaymentModal.tsx
 *
 * Professional Web3 Crypto Checkout for USDT on BNB Smart Chain (BEP20).
 * Strict Design System: Navy Blue (#0F172A) | Pure White (#FFFFFF) | Accent Blue (#3B82F6)
 *
 * Features:
 * - 2-Step interactive flow (Wallet Input → Invoice & Live Settlement)
 * - 1-Click Clipboard paste & copy
 * - Real-time address validation & BSC EVM format check
 * - High-contrast QR code for mobile wallet scanning
 * - Auto-polling on BNB Smart Chain via NOWPayments
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
  ClipboardPaste,
} from 'lucide-react';
import {
  createPayment,
  fetchPaymentStatus,
  pollUntilSettled,
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
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden max-h-[92vh] flex flex-col"
        style={{
          backgroundColor: '#0F172A',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >

        {/* ─── Top Header ──────────────────────────────────────────────────── */}
        <div
          className="px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Token Badge */}
              <div
                className="relative flex items-center"
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1.5px solid rgba(255, 255, 255, 0.25)' }}
                >
                  <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 14 }}>₮</span>
                </div>
                <div
                  className="w-5 h-5 -ml-2.5 -mt-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: '#2563EB', border: '1px solid #60A5FA', color: '#FFFFFF' }}
                >
                  B
                </div>
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                  Crypto Checkout
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)' }}
                  >
                    USDT • BEP20
                  </span>
                </h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>BNB Smart Chain — Powered by NOWPayments</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {phase === 'waiting' && (
                <button
                  type="button"
                  onClick={() => setPhase('address_input')}
                  className="transition-all rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)' }}
                  title="Go back to wallet input"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="transition-colors rounded-xl p-2 cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                aria-label="Close"
                onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-2 flex-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              >
                {phase === 'address_input' ? '1' : <Check className="w-3 h-3" />}
              </div>
              <span className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>Your Wallet</span>
            </div>

            <div className="w-8 h-px" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

            <div className="flex items-center gap-2 flex-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: phase === 'address_input'
                    ? 'rgba(255,255,255,0.1)'
                    : '#FFFFFF',
                  color: phase === 'address_input' ? 'rgba(255,255,255,0.4)' : '#0F172A',
                }}
              >
                {phase === 'success' ? <Check className="w-3 h-3" /> : '2'}
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: phase === 'address_input' ? 'rgba(255,255,255,0.4)' : '#FFFFFF' }}
              >
                Transfer & Confirm
              </span>
            </div>
          </div>
        </div>

        {/* ─── Body Content (Scrollable) ──────────────────────────────────── */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 overscroll-contain">

          {/* ══ STEP 1: Enter Crypto Address Form ══════════════════════════ */}
          {phase === 'address_input' && (
            <form onSubmit={handleProceedToInvoice} className="space-y-6">

              {/* Order Summary Card */}
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <div
                  className="flex items-center justify-between pb-3"
                  style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                  <div className="space-y-0.5">
                    <span
                      className="text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.6)' }}
                    >
                      Subscription Plan
                    </span>
                    <p className="font-bold text-base tracking-tight" style={{ color: '#FFFFFF' }}>
                      {planLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Total Due</span>
                    <p className="text-2xl font-black tracking-tight leading-none mt-0.5" style={{ color: '#FFFFFF' }}>
                      ${usdAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 text-xs">
                  <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#60A5FA' }} />
                    <span>Fixed Exchange Rate (1:1)</span>
                  </div>
                  <span
                    className="font-mono font-bold px-2.5 py-0.5 rounded-full"
                    style={{ color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}
                  >
                    {usdAmount.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              {/* Wallet Address Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#FFFFFF' }}>
                    Your Sender Wallet Address
                    <span className="text-xs" style={{ color: '#60A5FA' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteAddress}
                    className="text-xs flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                    style={{ color: '#FFFFFF' }}
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
                    className="w-full py-3.5 pl-11 pr-24 rounded-2xl text-sm font-mono transition-all outline-none"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: addressError
                        ? '1.5px solid #F87171'
                        : isAddressValid(userWalletAddress)
                        ? '1.5px solid #60A5FA'
                        : '1.5px solid rgba(255, 255, 255, 0.2)',
                      color: '#FFFFFF',
                    }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    <Wallet className="w-4 h-4" />
                  </div>

                  {userWalletAddress && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      {isAddressValid(userWalletAddress) ? (
                        <span
                          className="text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ color: '#FFFFFF', backgroundColor: 'rgba(59,130,246,0.3)', border: '1px solid rgba(59,130,246,0.5)' }}
                        >
                          <Check className="w-3 h-3" /> Valid BSC
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {userWalletAddress.length}/42
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {addressError ? (
                  <p className="text-xs flex items-center gap-1.5 pt-1" style={{ color: '#F87171' }}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {addressError}
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed pt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Enter the address you will transfer from (MetaMask, Trust Wallet, Binance, etc.) for instant automated settlement.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl font-extrabold text-sm transition-all cursor-pointer active:scale-[0.99]"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                  }}
                >
                  Continue to Payment Invoice
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ══ STEP 2: Creating State ════════════════════════════════════ */}
          {phase === 'creating' && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-full border-4 animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#FFFFFF' }}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                  style={{ color: '#FFFFFF' }}
                >
                  ₮
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-bold" style={{ color: '#FFFFFF' }}>{statusMsg}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Generating your unique NOWPayments deposit address…</p>
              </div>
            </div>
          )}

          {/* ══ STEP 3: Error State ══════════════════════════════════════ */}
          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.3)' }}
              >
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <h4 className="font-bold text-lg" style={{ color: '#FFFFFF' }}>Unable to Create Invoice</h4>
              <p className="text-xs max-w-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{errorMsg}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setPhase('address_input')}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 4: Success State ════════════════════════════════════ */}
          {phase === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  border: '2px solid rgba(255,255,255,0.5)',
                  boxShadow: '0 0 32px rgba(255,255,255,0.25)',
                }}
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-2xl tracking-tight" style={{ color: '#FFFFFF' }}>Payment Verified! 🎉</h4>
                <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>Your {planLabel} plan is now fully active.</p>
                <p className="text-xs pt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Redirecting to your trading dashboard…</p>
              </div>
            </div>
          )}

          {/* ══ STEP 5: Failed State ════════════════════════════════════ */}
          {phase === 'failed' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.3)' }}
              >
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <h4 className="font-bold text-lg" style={{ color: '#FFFFFF' }}>Payment Expired or Incomplete</h4>
              <p className="text-xs max-w-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{statusMsg}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setPhase('address_input')}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                >
                  Start Over
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 6: Waiting for Payment (Invoice + Live Checking) ══ */}
          {phase === 'waiting' && invoice && (
            <div className="space-y-5">

              {/* Live Status Pill */}
              <div
                className="flex items-center justify-between p-3.5 rounded-2xl"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', border: '1.5px solid rgba(255, 255, 255, 0.18)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: '#60A5FA' }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2.5 w-2.5"
                      style={{ backgroundColor: '#60A5FA' }}
                    />
                  </span>
                  <div>
                    <p className="text-xs font-bold tracking-tight" style={{ color: '#FFFFFF' }}>{statusMsg}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Listening to BNB Smart Chain blocks…</p>
                  </div>
                </div>

                <div
                  className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {formatElapsed(elapsed)}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center gap-2 py-1">
                {qrUrl && (
                  <div className="p-3.5 bg-white rounded-3xl shadow-2xl">
                    <img src={qrUrl} alt="Deposit QR Code" className="w-40 h-40" />
                  </div>
                )}
                <span className="text-[11px] font-medium pt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Scan with MetaMask, Binance, or Trust Wallet
                </span>
              </div>

              {/* Amount to Send Box */}
              <div className="space-y-1.5">
                <div
                  className="flex items-center justify-between text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <span>Exact Amount to Transfer</span>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>USDT (BEP20)</span>
                </div>
                <div
                  className="flex items-center gap-3 p-3.5 rounded-2xl"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', border: '1.5px solid rgba(255, 255, 255, 0.2)' }}
                >
                  <span className="font-mono font-extrabold text-xl flex-1 tracking-tight" style={{ color: '#FFFFFF' }}>
                    {invoice.payAmount} USDT
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(String(invoice.payAmount), 'amount')}
                    className="px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)' }}
                  >
                    {copied === 'amount' ? (
                      <span className="flex items-center gap-1">
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
                <div
                  className="flex items-center justify-between text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <span>Send to Deposit Address</span>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>BNB Smart Chain</span>
                </div>
                <div
                  className="flex items-center gap-2 p-3.5 rounded-2xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255, 255, 255, 0.18)' }}
                >
                  <span
                    className="text-xs font-mono break-all flex-1 select-all leading-relaxed"
                    style={{ color: '#FFFFFF' }}
                  >
                    {invoice.payAddress}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(invoice.payAddress, 'address')}
                    className="px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)' }}
                  >
                    {copied === 'address' ? (
                      <span className="flex items-center gap-1">
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
              <div
                className="flex items-center justify-between p-3 rounded-xl text-xs"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Your Sender Wallet:</span>
                <span className="font-mono text-[11px] truncate max-w-[220px]" style={{ color: '#FFFFFF' }}>
                  {userWalletAddress}
                </span>
              </div>

              {/* Check Now / Submit Button */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCheckNow}
                  disabled={checkingNow}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                  }}
                >
                  <RefreshCw className={`w-4 h-4 ${checkingNow ? 'animate-spin' : ''}`} />
                  {checkingNow ? 'Verifying Payment…' : 'Check Payment Status'}
                </button>

                {/* Back and Cancel Navigation Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPhase('address_input')}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Wallet
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel & Exit
                  </button>
                </div>
              </div>

              {/* Network Warning Box */}
              <div
                className="p-3.5 rounded-2xl text-xs space-y-1"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
              >
                <div className="flex items-center gap-1.5 font-bold" style={{ color: '#60A5FA' }}>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Only send USDT via BEP20 (Binance Smart Chain)</span>
                </div>
                <p className="text-[11px] leading-relaxed pl-5" style={{ color: 'rgba(255,255,255,0.65)' }}>
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
