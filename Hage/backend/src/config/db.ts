import mongoose from 'mongoose';
import dns from 'dns';
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
  } catch (error) {
    console.warn(`MongoDB not reachable (${(error as Error).message}). Active resilient database persistence enabled.`);
    dbManager.setMongoConnected(false);
  }
};

export default connectDB;
