import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { createPayment, getPaymentStatus, handleIpn, simulatePaymentSuccess, getMySubscription } from '../controllers/paymentController';

const router = express.Router();

// GET /api/payments/my-subscription — authenticated user fetches their subscription
router.get('/my-subscription', protect, getMySubscription);

// POST /api/payments/create — authenticated user initiates a payment
router.post('/create', protect, createPayment);

// GET /api/payments/status/:paymentId — authenticated user polls status
router.get('/status/:paymentId', protect, getPaymentStatus);

// POST /api/payments/simulate-success/:paymentId — for testing / demo sandbox
router.post('/simulate-success/:paymentId', protect, simulatePaymentSuccess);

// POST /api/payments/ipn — NOWPayments webhook (NO auth — verified by HMAC)
// express.json() is applied here explicitly so IPN body is parsed correctly
router.post('/ipn', express.json(), handleIpn);

export default router;
