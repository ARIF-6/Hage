import mongoose from 'mongoose';
import dns from 'dns';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { dbManager } from './dbManager';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hage_trading';
    if (mongoUri.includes('mongodb+srv://')) {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch (dnsErr) {
        // ignore if not supported in environment
      }
    }
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    dbManager.setMongoConnected(true);
    await dbManager.syncToMongoIfConnected();
    await seedAdmin();
  } catch (error) {
    console.warn(`MongoDB not reachable (${(error as Error).message}). Active resilient database persistence enabled.`);
    dbManager.setMongoConnected(false);
  }
};

/**
 * Ensures the admin account exists in MongoDB.
 * Uses ADMIN_EMAIL and ADMIN_PASSWORD environment variables.
 * Safe to run on every startup — only creates if not found.
 */
const seedAdmin = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'omardahir379@gmail.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'omar123';
    const adminName = process.env.ADMIN_NAME || 'Omar Dahir';

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      // If account exists but isn't admin role, upgrade it
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log(`[SEED] Upgraded ${adminEmail} to admin role.`);
      } else {
        console.log(`[SEED] Admin account (${adminEmail}) already exists. Skipping.`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'admin',
      isVerified: true,
      mt5Connected: false,
    });
    console.log(`[SEED] Admin account created: ${adminEmail}`);
  } catch (err) {
    console.error('[SEED] Failed to seed admin account:', err);
  }
};

export default connectDB;

