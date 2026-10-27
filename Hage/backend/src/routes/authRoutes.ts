import express from 'express';
import { 
  registerUser, 
  verifyRegistration,
  resendRegistrationOtp,
  loginUser, 
  getMe, 
  googleSignIn, 
  forgotPassword, 
  verifyResetOtp,
  resetPassword,
  getLatestOtp
} from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-registration', verifyRegistration);
router.post('/resend-registration-otp', resendRegistrationOtp);
router.get('/latest-otp', getLatestOtp);
router.post('/login', loginUser);
router.post('/google', googleSignIn);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

export default router;

