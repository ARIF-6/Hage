import crypto from 'crypto';
import {
  handleIpn,
  calculateIpnSignature,
  sortObjectKeys,
  activateSubscription,
  processingPayments,
} from '../controllers/paymentController';
import { dbManager } from '../config/dbManager';
import { config } from '../config/env';

// Helper to create mock Express Request and Response
function createMockReqRes(headers: Record<string, string>, body: any) {
  const req: any = {
    headers: { ...headers },
    body,
  };

  let statusCode = 200;
  let responseData: any = null;

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    send(data: any) {
      responseData = data;
      return res;
    },
    getStatusCode() {
      return statusCode;
    },
    getResponseData() {
      return responseData;
    },
  };

  return { req, res };
}

async function runIpnTestSuite() {
  console.log('====================================================');
  console.log('🔒 RUNNING HAGE NOWPAYMENTS IPN TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${detail || ''}`);
      throw new Error(`Test failed: ${testName} - ${detail || ''}`);
    }
  }

  // Ensure test secret
  const TEST_SECRET = 'test_ipn_secret_key_hage_2026_secure';
  // Mock config secret getter
  const originalSecretGetter = Object.getOwnPropertyDescriptor(config, 'nowPaymentsIpnSecret');
  Object.defineProperty(config, 'nowPaymentsIpnSecret', {
    get: () => TEST_SECRET,
    configurable: true,
  });

  const testUserId = `test_user_${Date.now()}`;
  const testPaymentId = `pay_np_${Date.now()}`;
  const testOrderId = `hage_${testUserId}_threeMonths_${Date.now()}`;
  const testAmount = 4.99;

  // Initialize test user and pending subscription in dbManager store
  const store = dbManager.getStore();
  store.users = store.users || [];
  store.subscriptions = store.subscriptions || [];

  store.users.push({
    _id: testUserId,
    name: 'Test Trader',
    email: 'trader@example.com',
    role: 'user',
    subscriptionStatus: 'Pending Payment',
    subscriptionTier: 'None',
  });

  store.subscriptions.push({
    _id: `pay_${testPaymentId}`,
    user: testUserId,
    plan: 'Pro (3 Months)',
    duration: 'threeMonths',
    tier: 'Pro',
    status: 'Pending',
    paymentMethod: 'Crypto',
    nowPaymentId: testPaymentId,
    nowOrderId: testOrderId,
    amount: testAmount,
    priceCurrency: 'usd',
    payCurrency: 'usdtbsc',
    startDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const basePayload = {
    payment_id: testPaymentId,
    payment_status: 'finished',
    order_id: testOrderId,
    order_description: 'HAGE Trading Journal — Pro (3 Months)',
    price_amount: testAmount,
    price_currency: 'usd',
    pay_amount: testAmount,
    actually_paid: testAmount,
    pay_currency: 'usdtbsc',
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Key Sorting & Signature Generation
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- Phase 1: HMAC-SHA512 Signature & Sorting ---');
  {
    const unsortedObj = { z_field: 1, a_field: 2, m_field: { y: 'b', b: 'a' } };
    const sorted = sortObjectKeys(unsortedObj);
    const keys = Object.keys(sorted);
    assert(keys[0] === 'a_field' && keys[1] === 'm_field' && keys[2] === 'z_field', 'Keys are sorted alphabetically in ascending order');

    const sig = calculateIpnSignature(basePayload, TEST_SECRET);
    assert(typeof sig === 'string' && sig.length === 128, 'HMAC-SHA512 produces valid 128-hex-character signature');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Reject Missing Signature Header
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Phase 2: Security & Header Validation ---');
  {
    const { req, res } = createMockReqRes({}, basePayload);
    await handleIpn(req, res);
    assert(res.getStatusCode() === 400, 'Rejects IPN with missing x-nowpayments-sig header (400)');
    assert(res.getResponseData()?.error?.includes('Missing'), 'Response explains missing signature header');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Reject Tampered / Invalid Signature
  // ─────────────────────────────────────────────────────────────────────────
  {
    const invalidSig = 'a'.repeat(128);
    const { req, res } = createMockReqRes({ 'x-nowpayments-sig': invalidSig }, basePayload);
    await handleIpn(req, res);
    assert(res.getStatusCode() === 401, 'Rejects IPN with invalid signature (401 Unauthorized)');
    assert(res.getResponseData()?.error?.includes('Invalid IPN signature'), 'Response error specifies Invalid IPN signature');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Reject If IPN Secret Is Missing on Server
  // ─────────────────────────────────────────────────────────────────────────
  {
    Object.defineProperty(config, 'nowPaymentsIpnSecret', {
      get: () => '',
      configurable: true,
    });
    const sig = calculateIpnSignature(basePayload, TEST_SECRET);
    const { req, res } = createMockReqRes({ 'x-nowpayments-sig': sig }, basePayload);
    await handleIpn(req, res);
    assert(res.getStatusCode() === 503, 'Rejects IPN when server secret is not configured (503 Service Unavailable)');

    // Restore test secret
    Object.defineProperty(config, 'nowPaymentsIpnSecret', {
      get: () => TEST_SECRET,
      configurable: true,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: Database Verification - Payment ID Not Found
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Phase 3: Database Integrity Verification ---');
  {
    const unknownPayload = {
      ...basePayload,
      payment_id: 'unknown_payment_999999',
      order_id: `hage_${testUserId}_threeMonths_${Date.now()}`,
    };
    const sig = calculateIpnSignature(unknownPayload, TEST_SECRET);
    const { req, res } = createMockReqRes({ 'x-nowpayments-sig': sig }, unknownPayload);
    await handleIpn(req, res);
    assert(res.getStatusCode() === 404, 'Rejects IPN when payment_id is not in database (404)');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: Database Verification - Order ID Mismatch
  // ─────────────────────────────────────────────────────────────────────────
  {
    const mismatchedOrderPayload = {
      ...basePayload,
      order_id: `hage_fraudster_threeMonths_${Date.now()}`,
    };
    const sig = calculateIpnSignature(mismatchedOrderPayload, TEST_SECRET);
    const { req, res } = createMockReqRes({ 'x-nowpayments-sig': sig }, mismatchedOrderPayload);
    await handleIpn(req, res);
    assert(res.getStatusCode() === 400, 'Rejects IPN when order_id does not match database record (400)');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7: Database Verification - Underpayment / Amount Mismatch
  // ─────────────────────────────────────────────────────────────────────────
  {
    const underpaidPayload = {
      ...basePayload,
      price_amount: 1.00, // Expected 4.99
    };
    const sig = calculateIpnSignature(underpaidPayload, TEST_SECRET);
    const { req, res } = createMockReqRes({ 'x-nowpayments-sig': sig }, underpaidPayload);
    await handleIpn(req, res);
    assert(res.getStatusCode() === 400, 'Rejects IPN on underpayment (expected 4.99, sent 1.00)');
    assert(res.getResponseData()?.error?.includes('Amount mismatch'), 'Error message details amount mismatch');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 8: Database Verification - Currency Mismatch
  // ─────────────────────────────────────────────────────────────────────────
  {
    const badCurrencyPayload = {
      ...basePayload,
      price_currency: 'eur', // Expected usd
    };
    const sig = calculateIpnSignature(badCurrencyPayload, TEST_SECRET);
    const { req, res } = createMockReqRes({ 'x-nowpayments-sig': sig }, badCurrencyPayload);
    await handleIpn(req, res);
    assert(res.getStatusCode() === 400, 'Rejects IPN when currency is invalid (expected usd, sent eur)');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 9: Non-Terminal Status - Does NOT Activate Subscription
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Phase 4: Lifecycle & Activation Rules ---');
  {
    const waitingPayload = {
      ...basePayload,
      payment_status: 'confirming',
    };
    const sig = calculateIpnSignature(waitingPayload, TEST_SECRET);
    const { req, res } = createMockReqRes({ 'x-nowpayments-sig': sig }, waitingPayload);
    await handleIpn(req, res);

    assert(res.getStatusCode() === 200, 'Acknowledges intermediate status with 200 OK');
    assert(res.getResponseData()?.activated === false, 'Intermediate status ("confirming") does NOT activate subscription');

    const sub = store.subscriptions.find((s: any) => s.nowPaymentId === testPaymentId);
    assert(sub?.status === 'Pending', 'Database subscription record remains in "Pending" status');

    const user = store.users.find((u: any) => u._id === testUserId);
    assert(user?.subscriptionStatus === 'Pending Payment', 'User profile status remains "Pending Payment"');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 10: Terminal "finished" Status - Activates Subscription
  // ─────────────────────────────────────────────────────────────────────────
  {
    const finishedPayload = {
      ...basePayload,
      payment_status: 'finished',
    };
    const sig = calculateIpnSignature(finishedPayload, TEST_SECRET);
    const { req, res } = createMockReqRes({ 'x-nowpayments-sig': sig }, finishedPayload);
    await handleIpn(req, res);

    assert(res.getStatusCode() === 200, 'Terminal finished status returns 200 OK');
    assert(res.getResponseData()?.activated === true, 'Response confirms subscription is activated');

    const sub = store.subscriptions.find((s: any) => s.nowPaymentId === testPaymentId);
    assert(sub?.status === 'Active', 'Database subscription status successfully set to "Active"');
    assert(sub?.plan === 'Pro', 'Subscription plan tier set to "Pro"');

    const user = store.users.find((u: any) => u._id === testUserId);
    assert(user?.subscriptionStatus === 'Active', 'User subscription status updated to "Active"');
    assert(user?.subscriptionTier === 'Pro', 'User subscription tier updated to "Pro"');
    assert(Boolean(user?.subscriptionExpiry), 'User subscription expiry date is set');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 11: Idempotency - Prevent Duplicate Webhook Processing
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- Phase 5: Idempotency & Deduplication ---');
  {
    const duplicatePayload = {
      ...basePayload,
      payment_status: 'finished',
    };
    const sig = calculateIpnSignature(duplicatePayload, TEST_SECRET);
    const { req, res } = createMockReqRes({ 'x-nowpayments-sig': sig }, duplicatePayload);
    await handleIpn(req, res);

    assert(res.getStatusCode() === 200, 'Returns 200 OK on duplicate webhook delivery');
    assert(res.getResponseData()?.alreadyProcessed === true, 'Flags response as alreadyProcessed');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup test artifacts from in-memory store
  // ─────────────────────────────────────────────────────────────────────────
  store.subscriptions = store.subscriptions.filter((s: any) => s.nowPaymentId !== testPaymentId);
  store.users = store.users.filter((u: any) => u._id !== testUserId);

  // Restore original getter
  if (originalSecretGetter) {
    Object.defineProperty(config, 'nowPaymentsIpnSecret', originalSecretGetter);
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL IPN TESTS PASSED (${passed}/${total})`);
  console.log('====================================================\n');
}

runIpnTestSuite().catch((err) => {
  console.error('Fatal IPN test suite error:', err);
  process.exit(1);
});
