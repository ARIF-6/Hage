import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { GoogleAuthButton } from '../components/ui/GoogleAuthButton';
import axios from 'axios';
import { AUTH_API } from '../config/api';
import { useState, useEffect } from 'react';
import { hasUserPurchasedPlan } from '../store/subscriptionRules';
import { switchActiveUser } from '../store/useTradeStore';
import { refreshSubscriptionFromBackend } from '../services/paymentService';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [wakeStatus, setWakeStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('error') === 'suspended') {
      setError('Your account has been suspended by an administrator. Please contact support.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWakeStatus('');
    setSubmitting(true);

    const attemptLogin = async (attempt: number = 1): Promise<any> => {
      try {
        if (attempt > 1) {
          setWakeStatus('Connecting to server, please wait a moment...');
        }
        return await axios.post(`${AUTH_API}/login`, {
          email: email.trim().toLowerCase(),
          password
        }, { timeout: 40000 });
      } catch (err: any) {
        // Only retry on network errors (backend asleep or spinning up), NOT 400/401/404 credentials errors
        if (!err.response && attempt < 3) {
          setWakeStatus('Still connecting... Please hold on.');
          await new Promise((r) => setTimeout(r, 4000));
          return attemptLogin(attempt + 1);
        }
        throw err;
      }
    };

    try {
      // 1. Try real backend API with auto-retry for cold starts
      const res = await attemptLogin(1);

      const { token, role, isSuspended, name, email: userEmail, subscriptionPlan, subscriptionStatus } = res.data;

      if (isSuspended) {
        setError('Your account has been suspended by an administrator. Please contact support.');
        setSubmitting(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user_role', role || 'user');
      localStorage.setItem('profile_role', role || 'user');
      localStorage.setItem('profile_email', userEmail);
      localStorage.setItem('profile_firstName', (name || '').split(' ')[0]);
      localStorage.setItem('profile_lastName', (name || '').split(' ')[1] || '');

      const plan          = subscriptionPlan || 'None';
      const subStatus     = subscriptionStatus || 'Pending Payment';
      const paymentMethod = res.data.paymentMethod || '';
      localStorage.setItem('user_subscription_status', subStatus);
      localStorage.setItem('profile_status', subStatus);
      localStorage.setItem('profile_plan', plan);
      localStorage.setItem('profile_paymentMethod', paymentMethod);

      const isPaidPlan     = plan === 'Starter' || plan === 'Pro' || plan === 'Premium';
      const isAdminGranted = paymentMethod === 'Manual Admin' || paymentMethod === 'Active Access';

      if (subStatus === 'Active' && (isPaidPlan || isAdminGranted)) {
        localStorage.setItem('hage_user_subscription_tier', isPaidPlan ? plan : 'Free');
        localStorage.removeItem('hage_subscription_expired');
        const durationKey =
          plan === 'Premium' ? 'sixMonths' :
          plan === 'Pro'     ? 'threeMonths' :
          plan === 'Starter' ? 'oneMonth' : 'free';
        localStorage.setItem('hage_subscription_status', JSON.stringify({
          active: true,
          status: 'Active',
          plan: plan,
          duration: durationKey,
          subscribedAt: new Date().toISOString(),
          paymentMethod: paymentMethod || 'Active Access'
        }));
      } else {
        localStorage.setItem('hage_user_subscription_tier', 'None');
        localStorage.removeItem('hage_subscription_status');
        if (subStatus === 'Expired') {
          localStorage.setItem('hage_subscription_expired', 'true');
        }
      }

      // Load this user's personal trading store
      switchActiveUser(userEmail);

      // Sync authoritative subscription data from backend (catches post-payment updates)
      await refreshSubscriptionFromBackend(token);

      if (role === 'admin') {
        navigate('/portal');
      } else if (!hasUserPurchasedPlan()) {
        navigate('/dashboard/subscription?purchase_required=true');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setWakeStatus('');
      if (err.response) {
        if (err.response.status === 404) {
          setError('No account found with this email address. Please click "Sign up" below to create your account.');
        } else {
          setError(err.response.data?.message || 'Invalid email or password.');
        }
        setSubmitting(false);
        return;
      }

      // Offline fallback only if server is completely unreachable
      const cleanEmail = email.toLowerCase().trim();
      const localUsersRaw = localStorage.getItem('hage_registered_users');
      let localUsers: any[] = [];
      if (localUsersRaw) {
        try { localUsers = JSON.parse(localUsersRaw); } catch (e) {}
      }

      const matchedUser = localUsers.find(u => u.email?.toLowerCase().trim() === cleanEmail);
      if (!matchedUser) {
        setError('Unable to connect. Please wait a moment and try again.');
        setSubmitting(false);
        return;
      }

      if (matchedUser.isSuspended) {
        setError('Your account has been suspended by an administrator.');
        setSubmitting(false);
        return;
      }

      const userRole = matchedUser.role || 'user';
      localStorage.setItem('token', 'hage_auth_token_' + (matchedUser._id || matchedUser.id || 'usr_local'));
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('profile_role', userRole);
      localStorage.setItem('profile_email', matchedUser.email);
      localStorage.setItem('profile_firstName', matchedUser.name?.split(' ')[0] || 'User');
      localStorage.setItem('profile_lastName', matchedUser.name?.split(' ')[1] || '');

      const plan = matchedUser.subscriptionPlan || 'Free';
      const subStatus = matchedUser.subscriptionStatus || 'Active';
      localStorage.setItem('user_subscription_status', subStatus);
      localStorage.setItem('profile_status', subStatus);
      localStorage.setItem('profile_plan', plan);
      localStorage.setItem('hage_user_subscription_tier', plan);

      if (subStatus === 'Active') {
        localStorage.removeItem('hage_subscription_expired');
        localStorage.setItem('hage_subscription_status', JSON.stringify({
          active: true,
          status: 'Active',
          plan: plan,
          duration: plan === 'Premium' ? 'sixMonths' : plan === 'Pro' ? 'threeMonths' : 'free',
          subscribedAt: new Date().toISOString(),
          paymentMethod: 'Active Access'
        }));
      }

      // Load this user's personal trading store
      switchActiveUser(matchedUser.email);

      if (userRole === 'admin') {
        navigate('/portal');
      } else if (!hasUserPurchasedPlan()) {
        navigate('/dashboard/subscription?purchase_required=true');
      } else {
        navigate('/dashboard');
      }
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuthSuccess = async (authData: any) => {
    try {
      localStorage.setItem('token', authData.token);
      const userRole = authData.role || 'user';
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('profile_role', userRole);
      localStorage.setItem('profile_email', authData.email);
      const fullName = (authData.name || '').trim();
      const nameParts = fullName.split(' ');
      localStorage.setItem('profile_firstName', nameParts[0] || 'User');
      localStorage.setItem('profile_lastName', nameParts.slice(1).join(' ') || '');
      
      const plan          = authData.subscriptionPlan || 'None';
      const subStatus     = authData.subscriptionStatus || 'Pending Payment';
      const paymentMethod = authData.paymentMethod || '';
      localStorage.setItem('user_subscription_status', subStatus);
      localStorage.setItem('profile_status', subStatus);
      localStorage.setItem('profile_plan', plan);
      localStorage.setItem('profile_paymentMethod', paymentMethod);

      const isPaidPlan     = plan === 'Starter' || plan === 'Pro' || plan === 'Premium';
      const isAdminGranted = paymentMethod === 'Manual Admin' || paymentMethod === 'Active Access';

      if (subStatus === 'Active' && (isPaidPlan || isAdminGranted)) {
        localStorage.setItem('hage_user_subscription_tier', isPaidPlan ? plan : 'Free');
        localStorage.removeItem('hage_subscription_expired');
        const durationKey =
          plan === 'Premium' ? 'sixMonths' :
          plan === 'Pro'     ? 'threeMonths' :
          plan === 'Starter' ? 'oneMonth' : 'free';
        localStorage.setItem('hage_subscription_status', JSON.stringify({
          active: true,
          status: 'Active',
          plan: plan,
          duration: durationKey,
          subscribedAt: new Date().toISOString(),
          paymentMethod: paymentMethod || 'Active Access'
        }));
      } else {
        localStorage.setItem('hage_user_subscription_tier', 'None');
        localStorage.removeItem('hage_subscription_status');
        if (subStatus === 'Expired') {
          localStorage.setItem('hage_subscription_expired', 'true');
        }
      }

      // Load this user's personal trading store
      switchActiveUser(authData.email);

      // Sync authoritative subscription data from backend
      await refreshSubscriptionFromBackend(authData.token);

      if (userRole === 'admin') {
        navigate('/portal');
      } else if (!hasUserPurchasedPlan()) {
        navigate('/dashboard/subscription?purchase_required=true');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Google auth processing error:', err);
      setError('Failed to complete Google Sign-In.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full border-gray-200 dark:border-slate-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</CardTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            Log in to access your trading journal or management console
          </p>
        </CardHeader>
        <CardContent>
          {wakeStatus && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-900/60 flex items-center gap-2 leading-relaxed">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping shrink-0" />
              <span>{wakeStatus}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-rose-950/60 text-red-700 dark:text-rose-300 text-xs font-semibold rounded-lg border border-red-200 dark:border-rose-900/60 leading-relaxed">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <Input
              label="Email address"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-sm font-medium text-primary dark:text-blue-400 hover:text-primary-dark dark:hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-[#182030]"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-slate-300">
                Remember me
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
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
                <GoogleAuthButton 
                  text="Sign in with Google"
                  onSuccess={handleGoogleAuthSuccess}
                  onError={(msg) => setError(msg)}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary dark:text-blue-400 hover:text-primary-dark dark:hover:text-blue-300">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
