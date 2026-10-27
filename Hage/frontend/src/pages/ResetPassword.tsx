import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { ArrowLeft, KeyRound, Mail, ShieldCheck, CheckCircle2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  // Multi-step: 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  // If email was passed in router state, start at step 2
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      setStep(2);
    }
  }, [location.state]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // STEP 1: Send OTP to email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email: cleanEmail
      });

      setSuccessMsg('A 6-digit verification code has been sent to your email.');
      setCountdown(60);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No account found with this email address.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:5000/api/auth/verify-reset-otp', {
        email: email.trim().toLowerCase(),
        otp: cleanOtp
      });
      setError('');
      setSuccessMsg('Code verified! Please create your new password.');
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP in Step 2
  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });
      setSuccessMsg('A new verification code has been sent to your email.');
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:5000/api/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword: password
      });
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please check your OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 4: Success View
  if (step === 4) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full border-gray-200 dark:border-slate-800 text-center">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Password Reset Successful</CardTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              Your password has been successfully updated. You can now log in with your new password.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full border-gray-200 dark:border-slate-800">
        
        {/* Step Progress Indicators */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary dark:text-blue-400">
              Step {step} of 3
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {step === 1 && 'Enter Email'}
              {step === 2 && 'Verify Code'}
              {step === 3 && 'New Password'}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300 ease-out" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Enter Email Header */}
        {step === 1 && (
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 dark:bg-blue-950/60 rounded-full flex items-center justify-center mb-3 text-primary dark:text-blue-400">
              <Mail className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password</CardTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              Enter your email address and we'll send you a 6-digit code to reset your password.
            </p>
          </CardHeader>
        )}

        {/* STEP 2: Enter OTP Header */}
        {step === 2 && (
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 dark:bg-blue-950/60 rounded-full flex items-center justify-center mb-3 text-primary dark:text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Enter Verification Code</CardTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              We've sent a 6-digit code to <span className="font-semibold text-gray-900 dark:text-white">{email}</span>
            </p>
            <button 
              type="button"
              onClick={() => { setStep(1); setError(''); setSuccessMsg(''); }}
              className="text-xs text-primary dark:text-blue-400 hover:underline mt-1 font-medium"
            >
              Change email address
            </button>
          </CardHeader>
        )}

        {/* STEP 3: New Password Header */}
        {step === 3 && (
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 dark:bg-blue-950/60 rounded-full flex items-center justify-center mb-3 text-primary dark:text-blue-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Create New Password</CardTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              Enter and confirm your new password to regain access to your account.
            </p>
          </CardHeader>
        )}

        <CardContent>
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-rose-950/60 text-red-700 dark:text-rose-300 text-sm rounded-lg border border-red-200 dark:border-rose-900/60">
              {error}
            </div>
          )}

          {/* Success / Info Message */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-sm rounded-lg border border-emerald-200 dark:border-emerald-900/60">
              {successMsg}
            </div>
          )}


          {/* STEP 1 FORM: EMAIL */}
          {step === 1 && (
            <form onSubmit={handleSendEmail} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading ? 'Sending code...' : 'Continue'}
              </Button>
            </form>
          )}

          {/* STEP 2 FORM: 6-DIGIT OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 text-center tracking-[0.5em] text-xl font-mono border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || loading}
                  className="text-xs text-primary dark:text-blue-400 hover:underline disabled:text-gray-400 dark:disabled:text-slate-600 disabled:no-underline font-medium inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend verification code'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3 FORM: NEW PASSWORD & CONFIRM PASSWORD */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-2 pr-10 border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full px-4 py-2 pr-10 border border-gray-200 dark:border-slate-700 bg-white dark:bg-[#182030] text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? 'Resetting password...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center border-t border-gray-100 dark:border-slate-800/60 pt-4">
          <Link 
            to="/login" 
            className="flex items-center text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
