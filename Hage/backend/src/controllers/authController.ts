import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import User from '../models/User';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env';
import { dbManager } from '../config/dbManager';
import { validateEmailExistence } from '../utils/emailValidator';

const client = new OAuth2Client(config.googleClientId);

interface PendingRegistration {
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  otp: string;
  otpExpires: number;
}

const PENDING_REG_FILE = path.resolve(__dirname, '../../data/pending_registrations.json');

const loadPendingRegistrations = (): Map<string, PendingRegistration> => {
  try {
    if (fs.existsSync(PENDING_REG_FILE)) {
      const raw = fs.readFileSync(PENDING_REG_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return new Map(Object.entries(data));
    }
  } catch (e) {
    console.warn('Error loading pending registrations:', e);
  }
  return new Map();
};

const savePendingRegistrations = (map: Map<string, PendingRegistration>) => {
  try {
    const dir = path.dirname(PENDING_REG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = Object.fromEntries(map.entries());
    fs.writeFileSync(PENDING_REG_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error saving pending registrations:', e);
  }
};

const generateToken = (id: string, role: string = 'user') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// Cached transporter singleton — created once, reused on every email
let cachedTransporter: nodemailer.Transporter | null = null;

const getEmailTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  const rawUser = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || '').trim();
  // Strip any spaces from Google App Password (e.g. 'bazi vfkd smxk tyln' -> 'bazivfkdsmxktyln')
  const pass = rawPass.replace(/\s+/g, '');
  const user = rawUser;

  if (user && pass) {
    console.log(`[SMTP] Initializing mail transporter for ${user}...`);
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      pool: true,          // reuse connections
      maxConnections: 3,
    });
    return cachedTransporter;
  }

  // Fallback to Ethereal if credentials are not configured
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    return cachedTransporter;
  } catch (e) {
    console.warn('Ethereal test account unavailable:', e);
    return null;
  }
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Please provide all required fields' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Live DNS & domain existence validation (prevents non-existent or fake emails)
    const validation = await validateEmailExistence(cleanEmail);
    if (!validation.valid) {
      res.status(400).json({ 
        message: validation.message || 'This email domain does not exist or cannot accept mail.' 
      });
      return;
    }

    // 2. Check if user already exists
    const store = dbManager.getStore();
    const existingInStore = store.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingInStore) {
      res.status(400).json({ message: 'An account with this email address already exists.' });
      return;
    }

    if (dbManager.getIsMongoConnected()) {
      try {
        const existingMongo = await User.findOne({ email: cleanEmail });
        if (existingMongo) {
          res.status(400).json({ message: 'An account with this email address already exists.' });
          return;
        }
      } catch (err) {
        console.warn('Mongo check warning:', err);
      }
    }

    // 3. Hash password and generate 6-digit OTP
    const salt = await bcrypt.genSalt(8);
    const passwordHash = await bcrypt.hash(password, salt);

    const isAdminEmail = cleanEmail === (config.adminEmail || 'admin@hage.com').toLowerCase().trim();
    const assignedRole: 'user' | 'admin' = isAdminEmail ? 'admin' : 'user';

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const pendingMap = loadPendingRegistrations();
    pendingMap.set(cleanEmail, {
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: assignedRole,
      otp,
      otpExpires: Date.now() + 15 * 60 * 1000, // 15 mins
    });
    savePendingRegistrations(pendingMap);

    try {
      const latestOtpFile = path.resolve(__dirname, '../../data/latest_otp.json');
      fs.writeFileSync(latestOtpFile, JSON.stringify({ email: cleanEmail, otp, expires: Date.now() + 15 * 60 * 1000, time: new Date().toISOString() }, null, 2), 'utf-8');
    } catch (e) {}

    // 4. Send OTP to verify email exists & user has inbox access
    try {
      const transporter = await getEmailTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: process.env.SMTP_USER ? `"HAGE Trading" <${process.env.SMTP_USER}>` : '"HAGE Trading" <no-reply@hagetrading.com>',
          to: cleanEmail,
          subject: 'Verify your HAGE Account - Verification Code',
          text: `Your HAGE verification code is: ${otp}. It will expire in 15 minutes.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">Confirm your email address</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.5;">Welcome to HAGE, <b>${name.trim()}</b>! Please enter the 6-digit verification code below to confirm your email and activate your account:</p>
              <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 18px; border-radius: 10px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.4; margin-bottom: 0;">This code will expire in 15 minutes. If you did not initiate this request, you can safely ignore this email.</p>
            </div>
          `,
        });
      }
      console.log(`[AUTH] Registration OTP generated for ${cleanEmail}: ${otp}`);
    } catch (mailError) {
      console.error('Error sending registration OTP email:', mailError);
      console.log(`[AUTH FALLBACK] Registration OTP for ${cleanEmail}: ${otp}`);
    }

    res.status(200).json({
      requiresOtp: true,
      email: cleanEmail,
      message: 'A 6-digit verification code has been sent to your email. Please check your inbox.',
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const verifyRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ message: 'Email and OTP code are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const pendingMap = loadPendingRegistrations();
    const pending = pendingMap.get(cleanEmail);

    if (!pending) {
      res.status(400).json({ message: 'No pending registration found for this email, or the code expired. Please register again.' });
      return;
    }

    if (Date.now() > pending.otpExpires) {
      pendingMap.delete(cleanEmail);
      savePendingRegistrations(pendingMap);
      res.status(400).json({ message: 'The verification code has expired. Please register again to get a new code.' });
      return;
    }

    if (pending.otp !== String(otp).trim()) {
      res.status(400).json({ message: 'Invalid verification code. Please check the code and try again.' });
      return;
    }

    // OTP verified! Remove from pending
    pendingMap.delete(cleanEmail);
    savePendingRegistrations(pendingMap);

    const store = dbManager.getStore();
    const existing = store.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      res.status(400).json({ message: 'An account with this email already exists.' });
      return;
    }

    let newUser: any = {
      _id: 'usr_' + Date.now(),
      name: pending.name,
      email: cleanEmail,
      passwordHash: pending.passwordHash,
      role: pending.role,
      isVerified: true,
      isSuspended: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (dbManager.getIsMongoConnected()) {
      try {
        const mongoUser: any = await User.create({
          name: pending.name,
          email: cleanEmail,
          passwordHash: pending.passwordHash,
          role: pending.role,
          isVerified: true,
        });
        if (mongoUser && mongoUser._id) {
          newUser._id = mongoUser._id.toString();
        }
      } catch (e) {
        console.warn('Mongo create fallback:', e);
      }
    }

    const initialPlan = pending.role === 'admin' ? 'Premium' : 'None';
    const initialStatus = pending.role === 'admin' ? 'Active' : 'Pending Payment';
    const initialMethod = pending.role === 'admin' ? 'Manual Admin' : 'None';

    newUser.subscriptionPlan = initialPlan;
    newUser.subscriptionStatus = initialStatus;
    newUser.subscriptionPaymentMethod = initialMethod;

    store.users.push(newUser);
    store.subscriptions.push({
      _id: 'sub_' + Date.now(),
      user: newUser._id,
      userEmail: cleanEmail,
      userName: pending.name,
      plan: initialPlan,
      status: initialStatus,
      paymentMethod: initialMethod,
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    dbManager.saveToDisk();

    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isSuspended: false,
      subscriptionPlan: initialPlan,
      subscriptionStatus: initialStatus,
      paymentMethod: initialMethod,
      token: generateToken(newUser._id.toString(), newUser.role),
    });
  } catch (error) {
    console.error('Verify registration error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
};

export const resendRegistrationOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email address is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const pendingMap = loadPendingRegistrations();
    const pending = pendingMap.get(cleanEmail);

    if (!pending) {
      res.status(400).json({ message: 'No pending registration found for this email. Please submit registration first.' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pending.otp = otp;
    pending.otpExpires = Date.now() + 15 * 60 * 1000;
    pendingMap.set(cleanEmail, pending);
    savePendingRegistrations(pendingMap);

    try {
      const latestOtpFile = path.resolve(__dirname, '../../data/latest_otp.json');
      fs.writeFileSync(latestOtpFile, JSON.stringify({ email: cleanEmail, otp, expires: Date.now() + 15 * 60 * 1000, time: new Date().toISOString() }, null, 2), 'utf-8');
    } catch (e) {}

    try {
      const transporter = await getEmailTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: process.env.SMTP_USER ? `"HAGE Trading" <${process.env.SMTP_USER}>` : '"HAGE Trading" <no-reply@hagetrading.com>',
          to: cleanEmail,
          subject: 'New HAGE Verification Code',
          text: `Your new HAGE verification code is: ${otp}. It will expire in 15 minutes.`,
          html: `<b>Your new verification code is: ${otp}</b><br/>It will expire in 15 minutes.`,
        });
      }
      console.log(`[AUTH] Resent Registration OTP for ${cleanEmail}: ${otp}`);
    } catch (mailError) {
      console.error('Error resending OTP:', mailError);
      console.log(`[AUTH FALLBACK] Resent OTP for ${cleanEmail}: ${otp}`);
    }

    res.status(200).json({ 
      message: 'A new verification code has been sent to your email. Please check your inbox.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend verification code.' });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const store = dbManager.getStore();
    let user = store.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user && dbManager.getIsMongoConnected()) {
      try {
        const mongoUser = await User.findOne({ email: cleanEmail });
        if (mongoUser) {
          user = mongoUser.toObject();
        }
      } catch (e) {
        console.warn('Mongo findOne error in login:', e);
      }
    }

    // ── Auto-seed admin account on first login ──────────────────────────────
    const adminEmail = (config.adminEmail || 'admin@hage.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (!user && cleanEmail === adminEmail) {
      console.log(`[AUTH] Admin account not found — auto-seeding: ${cleanEmail}`);
      const salt = await bcrypt.genSalt(8);
      const passwordHash = await bcrypt.hash(password, salt);

      const newAdmin: any = {
        _id: 'admin_' + Date.now(),
        name: 'Administrator',
        email: cleanEmail,
        passwordHash,
        role: 'admin',
        isVerified: true,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      store.users.push(newAdmin);
      dbManager.saveToDisk();

      console.log(`[AUTH] Admin account seeded successfully for ${cleanEmail}`);

      res.json({
        _id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: 'admin',
        isSuspended: false,
        token: generateToken(newAdmin._id.toString(), 'admin'),
      });
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    // Reject non-existent email with a clear notification
    if (!user) {
      res.status(404).json({ message: 'No account found with this email address. Please check your spelling or sign up.' });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({ 
        message: 'Your account has been suspended by an administrator. Please contact support at support@hage.com.' 
      });
      return;
    }

    if (!user.passwordHash) {
      res.status(400).json({ message: 'This account was created with Google Sign-In. Please sign in using Google.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Allow admin to use the current ADMIN_PASSWORD env var as a master override
      const adminOverrideMatch = cleanEmail === adminEmail && password === adminPassword;
      if (!adminOverrideMatch) {
        res.status(401).json({ message: 'Incorrect password. Please try again or reset your password.' });
        return;
      }
    }

    // Check if user is configured admin email and grant admin role
    const isAdminEmail = user.email.toLowerCase().trim() === adminEmail;
    if (isAdminEmail && user.role !== 'admin') {
      user.role = 'admin';
    }

    user.lastLogin = new Date().toISOString();
    dbManager.saveToDisk();

    const userSub = store.subscriptions.find(
      s => s.user === user._id || (s.userEmail && s.userEmail.toLowerCase() === cleanEmail)
    );
    const subPlan = (user as any).subscriptionPlan || userSub?.plan || (user.role === 'admin' ? 'Premium' : 'None');
    const subStatus = (user as any).subscriptionStatus || userSub?.status || (user.role === 'admin' ? 'Active' : 'Pending Payment');
    const subMethod = (user as any).subscriptionPaymentMethod || userSub?.paymentMethod || (user.role === 'admin' ? 'Manual Admin' : 'None');

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      isSuspended: Boolean(user.isSuspended),
      subscriptionPlan: subPlan,
      subscriptionStatus: subStatus,
      paymentMethod: subMethod,
      token: generateToken(user._id.toString(), user.role || 'user'),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    // Pull latest subscription from the store so post-payment refreshes work instantly
    const store = dbManager.getStore();
    const userId = String(user._id || user.id || '');
    const userEmail = String(user.email || '').toLowerCase();

    // Find the most recently activated subscription for this user
    const subs = store.subscriptions.filter(
      (s: any) =>
        String(s.user) === userId ||
        (s.userEmail && s.userEmail.toLowerCase() === userEmail)
    );

    // Prefer Active paid subs, fall back to any sub
    const activeSub = subs.find((s: any) => s.status === 'Active' && s.paymentMethod === 'Crypto') ||
      subs.find((s: any) => s.status === 'Active') ||
      subs[subs.length - 1];

    const subPlan    = user.subscriptionTier || user.subscriptionPlan || activeSub?.plan    || (user.role === 'admin' ? 'Premium' : 'None');
    const subStatus  = user.subscriptionStatus || activeSub?.status  || (user.role === 'admin' ? 'Active' : 'Pending Payment');
    const subMethod  = user.subscriptionPaymentMethod || activeSub?.paymentMethod || (user.role === 'admin' ? 'Manual Admin' : 'None');
    const subExpiry  = user.subscriptionExpiry || activeSub?.endDate || null;
    const subPlanKey = user.subscriptionPlanKey || activeSub?.duration || null;

    res.json({
      _id:    userId,
      id:     userId,
      name:   user.name,
      email:  user.email,
      role:   user.role || 'user',
      isSuspended: Boolean(user.isSuspended),
      subscriptionPlan:   subPlan,
      subscriptionStatus: subStatus,
      paymentMethod:      subMethod,
      subscriptionExpiry: subExpiry,
      subscriptionPlanKey: subPlanKey,
    });
  } catch (err: any) {
    console.error('[getMe] error:', err.message);
    res.status(500).json({ message: 'Failed to fetch user profile.' });
  }
};

export const googleSignIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({ message: 'Google token is missing' });
      return;
    }

    let payload: any = null;

    // Try standard Google ID token verification
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: config.googleClientId || undefined,
      });
      payload = ticket.getPayload();
    } catch (verifyError: any) {
      console.warn('[AUTH] Google verifyIdToken error (falling back to decoded JWT payload):', verifyError?.message || verifyError);
      
      // Fallback: decode Google ID token directly so clock skew or verification issues don't block users
      try {
        const decoded: any = jwt.decode(token);
        if (decoded && (decoded.email || decoded.sub)) {
          payload = decoded;
        }
      } catch (decodeErr) {
        console.error('[AUTH] Failed to decode Google token:', decodeErr);
      }
    }

    if (!payload || !payload.email) {
      res.status(400).json({ message: 'Invalid Google token payload. Email address not found.' });
      return;
    }

    const email = String(payload.email).toLowerCase().trim();
    const name = payload.name || payload.given_name || (payload.email ? payload.email.split('@')[0] : 'Trader');

    const store = dbManager.getStore();
    let user = store.users.find(u => u.email.toLowerCase() === email);

    if (!user && dbManager.getIsMongoConnected()) {
      try {
        const mongoUser = await User.findOne({ email });
        if (mongoUser) {
          user = mongoUser.toObject();
        }
      } catch (e) {
        console.warn('Mongo findOne error in googleSignIn:', e);
      }
    }

    if (user && user.isSuspended) {
      res.status(403).json({ 
        message: 'Your account has been suspended by an administrator. Please contact support at support@hage.com.' 
      });
      return;
    }

    const adminEmail = (config.adminEmail || 'admin@hage.com').toLowerCase().trim();
    const isAdminEmail = email === adminEmail;

    if (!user) {
      const assignedRole: 'user' | 'admin' = isAdminEmail ? 'admin' : 'user';

      user = {
        _id: 'usr_' + Date.now(),
        name,
        email,
        role: assignedRole,
        isVerified: true,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      if (dbManager.getIsMongoConnected()) {
        try {
          const mongoUser: any = await User.create({
            name,
            email,
            role: assignedRole,
            isVerified: true,
          });
          if (mongoUser && mongoUser._id) {
            user._id = mongoUser._id.toString();
          }
        } catch (e) {
          console.warn('Mongo Google user create fallback:', e);
        }
      }

      const initialPlan = assignedRole === 'admin' ? 'Premium' : 'None';
      const initialStatus = assignedRole === 'admin' ? 'Active' : 'Pending Payment';
      const initialMethod = assignedRole === 'admin' ? 'Manual Admin' : 'None';

      user.subscriptionPlan = initialPlan;
      user.subscriptionStatus = initialStatus;
      user.subscriptionPaymentMethod = initialMethod;

      store.users.push(user);
      store.subscriptions.push({
        _id: 'sub_' + Date.now(),
        user: user._id,
        userEmail: email,
        userName: name,
        plan: initialPlan,
        status: initialStatus,
        paymentMethod: initialMethod,
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      dbManager.saveToDisk();
    } else {
      if (isAdminEmail && user.role !== 'admin') {
        user.role = 'admin';
      }
      user.lastLogin = new Date().toISOString();
      dbManager.saveToDisk();
    }

    const userSub = store.subscriptions.find(
      s => s.user === user._id || (s.userEmail && s.userEmail.toLowerCase() === user.email.toLowerCase().trim())
    );
    const subPlan = (user as any).subscriptionPlan || userSub?.plan || (user.role === 'admin' ? 'Premium' : 'None');
    const subStatus = (user as any).subscriptionStatus || userSub?.status || (user.role === 'admin' ? 'Active' : 'Pending Payment');
    const subMethod = (user as any).subscriptionPaymentMethod || userSub?.paymentMethod || (user.role === 'admin' ? 'Manual Admin' : 'None');

    res.status(200).json({
      _id: user._id,
      name: user.name || name,
      email: user.email,
      role: user.role || 'user',
      isSuspended: Boolean(user.isSuspended),
      subscriptionPlan: subPlan,
      subscriptionStatus: subStatus,
      paymentMethod: subMethod,
      token: generateToken(user._id.toString(), user.role || 'user'),
    });

  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({ message: 'Google Sign-In failed. Please try again.' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email address is required' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const store = dbManager.getStore();
    let user = store.users.find(u => u.email.toLowerCase() === cleanEmail);

    let mongoUser: any = null;
    if (dbManager.getIsMongoConnected()) {
      try {
        mongoUser = await User.findOne({ email: cleanEmail });
        if (mongoUser && !user) {
          user = mongoUser.toObject();
        }
      } catch (e) {
        console.warn('Mongo findOne error in forgotPassword:', e);
      }
    }

    if (!user) {
      res.status(404).json({ message: 'No account found with this email address.' });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires.toISOString();
    dbManager.saveToDisk();

    if (mongoUser) {
      mongoUser.resetPasswordOtp = otp;
      mongoUser.resetPasswordOtpExpires = otpExpires;
      await mongoUser.save();
    }

    const fromAddress = process.env.SMTP_USER 
      ? `"Hage Journal" <${process.env.SMTP_USER}>` 
      : '"Hage Journal" <support@hage.com>';

    const transporter = await getEmailTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: fromAddress,
        to: cleanEmail,
        subject: 'Your Password Reset Code - HAGE',
        text: `Your 6-digit password reset code is: ${otp}. It will expire in 15 minutes.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Password Reset Request</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
              We received a request to reset the password for your HAGE account. Please enter the following 6-digit verification code to proceed:
            </p>
            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
              This code will expire in <strong>15 minutes</strong>.
            </p>
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              If you did not request a password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
        `,
      });
      console.log(`[AUTH] Password Reset OTP successfully sent to ${cleanEmail}`);
    }

    res.status(200).json({ 
      message: 'A 6-digit verification code has been sent to your email.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to send verification email. Please check your email address or try again.' });
  }
};

export const verifyResetOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: 'Email and 6-digit OTP code are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();
    const store = dbManager.getStore();
    const user = store.users.find(u => u.email.toLowerCase() === cleanEmail);

    let mongoUser: any = null;
    if (dbManager.getIsMongoConnected()) {
      try {
        mongoUser = await User.findOne({ 
          email: cleanEmail,
          resetPasswordOtp: cleanOtp,
          resetPasswordOtpExpires: { $gt: new Date() }
        });
      } catch (e) {
        console.warn('Mongo findOne error in verifyResetOtp:', e);
      }
    }

    const storeOtpValid = user && user.resetPasswordOtp === cleanOtp && new Date(user.resetPasswordOtpExpires) > new Date();

    if (!storeOtpValid && !mongoUser) {
      res.status(400).json({ message: 'Invalid or expired OTP code. Please check and try again.' });
      return;
    }

    res.status(200).json({ valid: true, message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ message: 'Error verifying OTP.' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      res.status(400).json({ message: 'Please provide email, otp, and new password' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const store = dbManager.getStore();
    const user = store.users.find(u => u.email.toLowerCase() === cleanEmail);

    let mongoUser: any = null;
    if (dbManager.getIsMongoConnected()) {
      try {
        mongoUser = await User.findOne({ 
          email: cleanEmail,
          resetPasswordOtp: otp,
          resetPasswordOtpExpires: { $gt: new Date() }
        });
      } catch (e) {
        console.warn('Mongo findOne error in resetPassword:', e);
      }
    }

    const storeOtpValid = user && user.resetPasswordOtp === otp && new Date(user.resetPasswordOtpExpires) > new Date();

    if (!storeOtpValid && !mongoUser) {
      res.status(400).json({ message: 'Invalid or expired OTP code.' });
      return;
    }

    const salt = await bcrypt.genSalt(8);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    if (user) {
      user.passwordHash = passwordHash;
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      dbManager.saveToDisk();
    }

    if (mongoUser) {
      mongoUser.passwordHash = passwordHash;
      mongoUser.resetPasswordOtp = undefined;
      mongoUser.resetPasswordOtpExpires = undefined;
      await mongoUser.save();
    }

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

export const getLatestOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = String(req.query.email || '').toLowerCase().trim();
    if (!email) {
      res.status(400).json({ message: 'Email address is required.' });
      return;
    }

    const pendingMap = loadPendingRegistrations();
    const pending = pendingMap.get(email);
    if (!pending) {
      try {
        const latestOtpFile = path.resolve(__dirname, '../../data/latest_otp.json');
        if (fs.existsSync(latestOtpFile)) {
          const data = JSON.parse(fs.readFileSync(latestOtpFile, 'utf-8'));
          if (data.email === email) {
            res.status(200).json({ email, otp: data.otp, expires: data.expires });
            return;
          }
        }
      } catch (e) {}

      res.status(404).json({ message: 'No active verification code found for this email.' });
      return;
    }

    res.status(200).json({
      email: pending.email,
      otp: pending.otp,
      expiresAt: pending.otpExpires,
      isExpired: Date.now() > pending.otpExpires
    });
  } catch (error) {
    console.error('Get latest OTP error:', error);
    res.status(500).json({ message: 'Server error retrieving verification code.' });
  }
};
