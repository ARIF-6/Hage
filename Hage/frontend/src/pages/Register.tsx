import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { GoogleLogin } from '@react-oauth/google';
import { ShieldCheck, ArrowLeft, RefreshCw, Check, Zap, Star, Shield, TrendingUp, BarChart2, Calendar, Sparkles } from 'lucide-react';
import axios from 'axios';
import { setUserPlan } from '../store/subscriptionRules';
import { loadPlanPricing, fetchRemotePricing } from '../store/pricingStore';
import { CryptoPaymentModal } from '../components/ui/CryptoPaymentModal';
import { switchActiveUser, getUserStorageKey } from '../store/useTradeStore';

// Strict RFC 5322 regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'guerrillamail.net', 'guerrillamail.org', 'yopmail.com', 'yopmail.net',
  'trashmail.com', 'trashmail.net', 'throwawaymail.com', 'sharklasers.com',
  'dispostable.com', 'getairmail.com', 'maildrop.cc', 'temp-mail.org',
  'fake.com', 'test.com', 'example.com', 'invalid.com'
]);

const DEFAULT_PRICING = { oneMonth: 2.99, threeMonths: 4.99, sixMonths: 9.99 };

const PLANS = [
  {
    key: 'oneMonth' as const,
    label: 'Starter', duration: '1 Month', planName: 'Starter',
    hint: 'ENTRY LEVEL', badge: null, months: 1,
    accountsLimit: '2 Accounts',
    borderClass: 'border-sky-500/40',
    activeBorderClass: 'border-sky-500 ring-2 ring-sky-500/30',
    gradientClass: 'from-sky-500/10 to-cyan-500/5',
    badgeClass: '',
  },
  {
    key: 'threeMonths' as const,
    label: 'Pro', duration: '3 Months', planName: 'Pro',
    hint: 'MOST POPULAR', badge: '🔥 Popular', months: 3,
    accountsLimit: '10 Accounts',
    borderClass: 'border-indigo-500/40',
    activeBorderClass: 'border-indigo-500 ring-2 ring-indigo-500/30',
    gradientClass: 'from-indigo-500/15 to-violet-500/10',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  },
  {
    key: 'sixMonths' as const,
    label: 'Premium', duration: '6 Months', planName: 'Premium',
    hint: 'BEST VALUE', badge: '⭐ Best Deal', months: 6,
    accountsLimit: 'Unlimited Accounts',
    borderClass: 'border-violet-500/40',
    activeBorderClass: 'border-violet-500 ring-2 ring-violet-500/30',
    gradientClass: 'from-violet-500/15 to-purple-500/10',
    badgeClass: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  },
];

const FEATURES = [
  { icon: BarChart2,  text: 'Full Advanced Analytics Dashboard' },
  { icon: TrendingUp, text: 'Unlimited Trade Journal Entries' },
  { icon: Shield,     text: 'Multi-Account Challenge Tracking' },
  { icon: Zap,        text: 'Real-Time P&L & Drawdown Alerts' },
  { icon: Star,       text: 'Payout Management & Certificates' },
  { icon: Calendar,   text: 'Trade Calendar & Performance Reports' },
];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'otp' | 'plans'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Plan selection state
  const [selectedPlan, setSelectedPlan] = useState<'oneMonth' | 'threeMonths' | 'sixMonths'>('threeMonths');
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [activating, setActivating] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Load pricing when showing the plans step
  useEffect(() => {
    if (step !== 'plans') return;
    try {
      const local = loadPlanPricing();
      if (local) setPricing({
        oneMonth: local.Starter?.monthly ?? DEFAULT_PRICING.oneMonth,
        threeMonths: local.Pro?.monthly ?? DEFAULT_PRICING.threeMonths,
        sixMonths: local.Premium?.monthly ?? DEFAULT_PRICING.sixMonths,
      });
    } catch (_) {}
    fetchRemotePricing().then((remote) => {
      if (remote) setPricing({
        oneMonth: remote.Starter?.monthly ?? DEFAULT_PRICING.oneMonth,
        threeMonths: remote.Pro?.monthly ?? DEFAULT_PRICING.threeMonths,
        sixMonths: remote.Premium?.monthly ?? DEFAULT_PRICING.sixMonths,
      });
    }).catch(() => {});
  }, [step]);

  const validateClientEmail = (val: string): string | null => {
    const clean = val.trim().toLowerCase();
    if (!EMAIL_REGEX.test(clean)) {
      return 'Please enter a valid email address (e.g. name@domain.com).';
    }
    const domain = clean.split('@')[1];
    if (!domain || !domain.includes('.') || domain.split('.').pop()!.length < 2) {
      return 'The email domain format is invalid.';
    }
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return 'Disposable or temporary email addresses are not permitted. Please use a permanent email address.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const emailErr = validateClientEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setSubmitting(true);

    try {
      // 1. Try real backend API
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        name,
        email: email.trim().toLowerCase(),
        password
      });

      if (res.data.requiresOtp) {
        setStep('otp');
        setSuccessMsg(res.data.message || `Verification code sent to ${email.trim()}`);
        setCountdown(60);
        return;
      }

      // If backend directly returned token (OTP disabled)
      const { token, role, name: userName, email: userEmail } = res.data;
      localStorage.setItem('token', token);
      const userRole = role || 'user';
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('profile_role', userRole);
      localStorage.setItem('profile_email', userEmail || email);
      localStorage.setItem('profile_firstName', (userName || name).split(' ')[0]);
      localStorage.setItem('profile_lastName', (userName || name).split(' ')[1] || '');

      localStorage.removeItem('hage_subscription_status');
      localStorage.removeItem('hage_user_subscription_tier');
      localStorage.removeItem('hage_subscription_expired');
      const cleanTargetEmail = (userEmail || email).toLowerCase().trim();
      localStorage.removeItem(getUserStorageKey(cleanTargetEmail));
      switchActiveUser(cleanTargetEmail);

      if (userRole === 'admin') {
        navigate('/portal');
      } else {
        setStep('plans');
      }
    } catch (err: any) {
      // If the backend returned an explicit validation error, show it!
      if (err.response) {
        setError(err.response.data?.message || 'Registration failed. Please check your details.');
        setSubmitting(false);
        return;
      }

      // 2. Offline fallback ONLY if backend server is unreachable
      setError('Unable to reach the authentication server. Please ensure the backend server is running on port 5000.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-registration', {
        email: email.trim().toLowerCase(),
        otp: otp.trim()
      });

      const { token, role, name: userName, email: userEmail } = res.data;
      localStorage.setItem('token', token);
      const userRole = role || 'user';
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('profile_role', userRole);
      localStorage.setItem('profile_email', userEmail || email);
      localStorage.setItem('profile_firstName', (userName || name).split(' ')[0]);
      localStorage.setItem('profile_lastName', (userName || name).split(' ')[1] || '');

      localStorage.removeItem('hage_subscription_status');
      localStorage.removeItem('hage_user_subscription_tier');
      localStorage.removeItem('hage_subscription_expired');
      localStorage.setItem('user_subscription_status', 'Pending Payment');
      localStorage.setItem('profile_status', 'Pending Payment');
      localStorage.setItem('profile_plan', 'None');
      localStorage.setItem('profile_paymentMethod', 'None');
      localStorage.setItem('hage_user_subscription_tier', 'None');
      const cleanTargetEmail = (userEmail || email).toLowerCase().trim();
      localStorage.removeItem(getUserStorageKey(cleanTargetEmail));
      switchActiveUser(cleanTargetEmail);

      if (userRole === 'admin') {
        navigate('/portal');
      } else {
        // Show plan selection inline — no navigation needed
        setStep('plans');
        setError('');
        setSuccessMsg('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/resend-registration-otp', {
        email: email.trim().toLowerCase()
      });
      setSuccessMsg(res.data?.message || 'A new verification code has been sent to your email.');
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const { credential } = credentialResponse;
      if (!credential) {
        setError('No Google credentials received. Please try again.');
        return;
      }
      const res = await axios.post('http://localhost:5000/api/auth/google', {
        token: credential
      });
      
      localStorage.setItem('token', res.data.token);
      const userRole = res.data.role || 'user';
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('profile_role', userRole);
      localStorage.setItem('profile_email', res.data.email);
      const fullName = (res.data.name || '').trim();
      const nameParts = fullName.split(' ');
      localStorage.setItem('profile_firstName', nameParts[0] || 'User');
      localStorage.setItem('profile_lastName', nameParts.slice(1).join(' ') || '');
      
      localStorage.removeItem('hage_subscription_status');
      localStorage.removeItem('hage_user_subscription_tier');
      localStorage.removeItem('hage_subscription_expired');
      localStorage.setItem('user_subscription_status', 'Pending Payment');
      localStorage.setItem('profile_status', 'Pending Payment');
      localStorage.setItem('profile_plan', 'None');
      localStorage.setItem('profile_paymentMethod', 'None');
      localStorage.setItem('hage_user_subscription_tier', 'None');
      switchActiveUser(res.data.email);

      if (userRole === 'admin') {
        navigate('/portal');
      } else {
        setName(res.data.name || '');
        setEmail(res.data.email || '');
        setStep('plans');
      }
    } catch (err: any) {
      console.error('Google register error:', err);
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || 'Failed to sign up with Google. Please try again.');
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-Up was unsuccessful.');
  };

  const handleActivatePlan = () => {
    setShowCryptoModal(true);
  };

  const handlePaymentSuccess = (paidPlanKey: string) => {
    setShowCryptoModal(false);
    setActivating(true);
    const plan = PLANS.find(p => p.key === paidPlanKey) || PLANS.find(p => p.key === selectedPlan)!;
    const price = pricing[plan.key];
    const expiryDate = new Date(Date.now() + plan.months * 30 * 24 * 60 * 60 * 1000).toISOString();
    const planTier = plan.key === 'sixMonths' ? 'Premium' : plan.key === 'threeMonths' ? 'Pro' : 'Starter';
    setUserPlan(planTier as any);
    localStorage.setItem('hage_subscription_status', JSON.stringify({
      active: true, status: 'Active', plan: plan.label,
      duration: plan.key, expiry: expiryDate,
      subscribedAt: new Date().toISOString(), price,
      paymentMethod: 'Crypto (USDT BEP20)',
    }));
    localStorage.setItem('hage_user_subscription_tier', planTier);
    window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: planTier } }));
    window.dispatchEvent(new CustomEvent('subscriptionStatusChanged'));
    setTimeout(() => { setActivating(false); navigate('/dashboard'); }, 900);
  };

  const selectedMeta = PLANS.find(p => p.key === selectedPlan)!;
  const selectedPrice = pricing[selectedPlan];
  const perMonth = (selectedPrice / selectedMeta.months).toFixed(2);

  // ─── Plans Step ───────────────────────────────────────────────────────────────
  if (step === 'plans') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0f1629] to-slate-950 flex flex-col items-center justify-center py-10 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <Check className="w-3.5 h-3.5" />
            Account Created Successfully
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">HAGE</span>
            {name ? `, ${name.split(' ')[0]}` : ''}! 🎉
          </h1>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Choose a plan to unlock your trading journal and start tracking your performance.
          </p>
        </div>

        <div className="w-full max-w-5xl">
          <div className="flex items-center justify-center gap-2 mb-8">
            {['Account', 'Verify', 'Plan'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
                  i < 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {i < 2 ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                  {s}
                </div>
                {i < 2 && <div className="w-8 h-px bg-slate-700" />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {PLANS.map((plan) => {
              const price = pricing[plan.key];
              const ppm = (price / plan.months).toFixed(2);
              const isSelected = selectedPlan === plan.key;
              return (
                <button
                  key={plan.key}
                  onClick={() => setSelectedPlan(plan.key)}
                  className={`relative text-left p-5 rounded-2xl border bg-gradient-to-br transition-all duration-200 cursor-pointer ${plan.gradientClass} ${
                    isSelected ? plan.activeBorderClass + ' bg-slate-800/60' : plan.borderClass + ' bg-slate-900/40 hover:bg-slate-800/30'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 left-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                  {plan.badge && (
                    <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full ${plan.badgeClass}`}>
                      {plan.badge}
                    </span>
                  )}
                  <div className="mb-3 mt-1">
                    <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">{plan.hint}</p>
                    <h3 className="text-lg font-bold text-white">{plan.label} <span className="text-slate-400 font-normal text-sm">({plan.duration})</span></h3>
                  </div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-white">${price.toFixed(2)}</span>
                    <span className="text-slate-400 text-sm mb-1">total</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-700/40">
                    <span className="text-slate-400">≈ ${ppm}/mo</span>
                    <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                      {plan.accountsLimit}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mb-6 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
            💡 <strong className="text-slate-300">Challenge Accounts:</strong> When you pass Phase 1 and advance to Phase 2, both phases belong to the same challenge and count as <strong className="text-emerald-400">1 single account</strong>.
          </div>

          <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 mb-6">
            <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Everything Included</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-2.5 text-slate-300 text-sm">
                  <f.icon className="w-4 h-4 text-blue-400 shrink-0" />
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold">HAGE {selectedMeta.planName}</p>
                <p className="text-slate-400 text-sm">{selectedMeta.duration} subscription</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs">${perMonth}/mo</p>
                <p className="text-2xl font-extrabold text-blue-400">${selectedPrice.toFixed(2)}</p>
              </div>
            </div>
            <div className="border-t border-slate-700/50 pt-3 mb-4 flex items-center justify-between">
              <span className="text-white font-semibold">Total Due</span>
              <span className="text-2xl font-extrabold text-blue-400">${selectedPrice.toFixed(2)}</span>
            </div>
            <p className="text-slate-500 text-xs mb-4 text-center">
              Access expires {selectedMeta.months} month{selectedMeta.months > 1 ? 's' : ''} after purchase. No auto-renewal. One-time payment.
            </p>
            <button
              onClick={handleActivatePlan}
              disabled={activating}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/30 disabled:opacity-70 text-base cursor-pointer"
            >
              {activating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Activating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Activate Plan — Pay ${selectedPrice.toFixed(2)}</>
              )}
            </button>
          </div>
        </div>

        {showCryptoModal && (
          <CryptoPaymentModal
            planKey={selectedPlan}
            planLabel={`HAGE ${selectedMeta.label} (${selectedMeta.duration})`}
            usdAmount={selectedPrice}
            onSuccess={handlePaymentSuccess}
            onClose={() => setShowCryptoModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full border-gray-200 dark:border-slate-800 shadow-xl">
        {step === 'form' ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Create an account</CardTitle>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                Start tracking your trades today
              </p>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-rose-950/60 text-red-700 dark:text-rose-300 text-sm rounded-lg border border-red-200 dark:border-rose-900/60">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-sm rounded-lg border border-emerald-200 dark:border-emerald-900/60">
                  {successMsg}
                </div>
              )}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <div>
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="Enter your email (e.g. name@domain.com)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Must be a real email address. We verify active mail servers and send a confirmation code.
                  </p>
                </div>

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                <Button type="submit" className="w-full mt-4" disabled={submitting}>
                  {submitting ? 'Verifying email & sending code...' : 'Continue with Email'}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-[#111722] text-gray-500 dark:text-slate-400">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <div className="w-full flex justify-center">
                    <GoogleLogin 
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      theme="outline"
                      size="large"
                      text="signup_with"
                      width="350"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-center">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-primary dark:text-blue-400 hover:text-primary-dark dark:hover:text-blue-300">
                  Log in
                </Link>
              </p>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 dark:bg-blue-950/60 rounded-full flex items-center justify-center mb-3 text-primary dark:text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Verify your email</CardTitle>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                We sent a 6-digit verification code to
              </p>
              <p className="font-semibold text-gray-900 dark:text-slate-200 text-sm">
                {email}
              </p>
            </CardHeader>
            <CardContent>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-rose-950/60 text-red-700 dark:text-rose-300 text-sm rounded-lg border border-red-200 dark:border-rose-900/60">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-sm rounded-lg border border-emerald-200 dark:border-emerald-900/60">
                  {successMsg}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleVerifyOtp}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 text-center">
                    Enter 6-digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3 px-4 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-2">
                    Check your inbox and spam folder. Code expires in 15 minutes.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={submitting || otp.length < 6}>
                  {submitting ? 'Verifying...' : 'Verify & Create Account'}
                </Button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || resending}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary dark:text-blue-400 hover:text-primary-dark dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend verification code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change email address
                </button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
