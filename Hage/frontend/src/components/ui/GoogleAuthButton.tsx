import React, { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
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

  const handleCredentialSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      onError('Google did not return a valid credential. Please try again.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${AUTH_API}/google`, {
        token: credentialResponse.credential,
      });
      await onSuccess(res.data);
    } catch (err: any) {
      console.error('[GoogleAuth] Authentication error:', err);
      const serverMsg = err.response?.data?.message;
      onError(serverMsg || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const buttonText = text.toLowerCase().includes('up') ? 'signup_with' : 'signin_with';

  return (
    <div className={`w-full flex flex-col items-center ${disabled || loading ? 'opacity-60 pointer-events-none' : ''}`}>
      {loading ? (
        <div className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-[#182030] text-sm font-medium text-gray-700 dark:text-slate-200">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Connecting with Google...</span>
        </div>
      ) : (
        <div className="w-full flex justify-center overflow-hidden rounded-lg">
          <GoogleLogin
            onSuccess={handleCredentialSuccess}
            onError={() => {
              console.warn('[GoogleAuth] GoogleLogin failed');
              onError('Google Sign-In failed. Please try again or use email & password.');
            }}
            text={buttonText}
            size="large"
            width="380"
            shape="rectangular"
            logo_alignment="center"
          />
        </div>
      )}
    </div>
  );
};
