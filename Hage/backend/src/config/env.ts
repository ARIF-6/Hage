import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  get port() { return process.env.PORT || 5000; },
  get mongoUri() { return process.env.MONGO_URI || ''; },
  get jwtSecret() { return process.env.JWT_SECRET || ''; },
  get nodeEnv() { return process.env.NODE_ENV || 'development'; },
  get googleClientId() { return process.env.GOOGLE_CLIENT_ID || ''; },
  get googleClientSecret() { return process.env.GOOGLE_CLIENT_SECRET || ''; },
  get adminEmail() { return process.env.ADMIN_EMAIL || 'admin@hage.com'; },
  // NOWPayments (always reads live process.env)
  get nowPaymentsApiKey() { return process.env.NOWPAYMENTS_API_KEY || ''; },
  get nowPaymentsIpnSecret() { return process.env.NOWPAYMENTS_IPN_SECRET || ''; },
  get nowPaymentsSandbox() { return process.env.NOWPAYMENTS_SANDBOX === 'true'; },
  get frontendUrl() { return process.env.FRONTEND_URL || 'http://localhost:5173'; },
};

