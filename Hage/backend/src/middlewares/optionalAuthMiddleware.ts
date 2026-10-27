import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from './authMiddleware';
import User from '../models/User';
import { dbManager } from '../config/dbManager';

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;

      if (dbManager.getIsMongoConnected()) {
        try {
          req.user = await User.findById(decoded.id).select('-passwordHash');
        } catch (e) {
          // ignore
        }
      }

      if (!req.user) {
        const storeUser = dbManager.getStore().users.find(u => u._id === decoded.id);
        if (storeUser) {
          const { passwordHash, ...sanitized } = storeUser;
          req.user = sanitized;
        }
      }
    } catch (e) {
      // Token expired or invalid, continue as guest
    }
  }
  next();
};
