import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized, please log in' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: Admin access required' });
    return;
  }

  if (req.user.isSuspended) {
    res.status(403).json({ message: 'Account suspended. Admin access revoked.' });
    return;
  }

  next();
};
