import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { dbManager } from '../config/dbManager';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;

      if (dbManager.getIsMongoConnected()) {
        try {
          req.user = await User.findById(decoded.id).select('-passwordHash');
        } catch (e) {
          // fallback to memory
        }
      }

      if (!req.user) {
        const storeUser = dbManager.getStore().users.find(u => u._id === decoded.id);
        if (storeUser) {
          const { passwordHash, ...sanitized } = storeUser;
          req.user = sanitized;
        }
      }
      
      if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user not found' });
        return;
      }

      if (req.user.isSuspended) {
        res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        return;
      }

      next();
      return;
    } catch (error) {
      console.error('Auth Error:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};
