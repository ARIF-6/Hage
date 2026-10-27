import mongoose from 'mongoose';
import { dbManager } from './dbManager';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hage_trading';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    dbManager.setMongoConnected(true);
    await dbManager.syncToMongoIfConnected();
  } catch (error) {
    console.warn(`Local MongoDB daemon not reachable (${(error as Error).message}). Active resilient database persistence enabled.`);
    dbManager.setMongoConnected(false);
  }
};

export default connectDB;
