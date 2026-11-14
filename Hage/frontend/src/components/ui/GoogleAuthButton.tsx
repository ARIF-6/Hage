import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { AUTH_API } from '../../config/api';

interface GoogleAuthButtonProps {
  text?: string;
  onSuccess: (data: any) => void | Promise<void>;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  text = 'Sign in with Google',
  onSuccess,
  onError,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);

        // 1. Fetch user profile from Google UserInfo endpoint using the access token
        let userInfo: any = null;
        try {
          const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          });
          userInfo = userRes.data;
        } catch (uiErr) {
          console.warn('[GoogleAuth] Failed to fetch direct userinfo, delegating to server:', uiErr);
        }

        // 2. Post to backend auth endpoint
        const res = await axios.post(`${AUTH_API}/google`, {
          accessToken: tokenResponse.access_token,
          userInfo: userInfo ? {
            email: userInfo.email,
            name: userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
            sub: userInfo.sub,
            picture: userInfo.picture,
          } : undefined,
        });

        await onSuccess(res.data);
      } catch (err: any) {
        console.error('[GoogleAuth] Authentication error:', err);
        const serverMsg = err.response?.data?.message;
        onError(serverMsg || 'Failed to authenticate with Google. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    onError: (err: any) => {
      console.warn('[GoogleAuth] Popup closed or error:', err);
      if (err?.error && err.error !== 'popup_closed_by_user') {
        onError('Google Sign-In failed or was blocked by your browser. Please check popup settings.');
      }
    },
  });

  return (
    <button
      type="button"
      onClick={() => login()}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-[#182030] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1f293d] hover:border-gray-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      )}
      <span>{loading ? 'Connecting with Google...' : text}</span>
    </button>
  );
};
