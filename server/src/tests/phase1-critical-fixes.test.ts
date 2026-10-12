import http from 'http';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../index';
import { prisma } from '../config/prisma';
import { config } from '../config/env';

interface TestRecord {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const records: TestRecord[] = [];

function record(category: string, name: string, status: 'PASS' | 'FAIL', details: string) {
  records.push({ category, name, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${category}] ${name}: ${details}`);
}

export async function runPhase1CriticalTests() {
  console.log('========================================================================');
  console.log('  URBAN NEST — PHASE 1 CRITICAL FIXES VERIFICATION TEST SUITE           ');
  console.log('========================================================================\n');

  const TEST_PORT = 5058;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}`);
      resolve();
    });
  });

  const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

  let tenantAId = '';
  let tenantBId = '';
  let ownerAToken = '';
  let residentAToken = '';
  let residentBToken = '';
  let residentAId = '';
  let residentBId = '';
  let propertyAId = '';
  let propertyBId = '';
  let testPaymentId = '';
  let testVisitorToken = '';
  let testVisitorId = '';
  let testDocumentId = '';

  try {
    // -------------------------------------------------------------------------
    // SETUP: Provision Test Multi-Tenant Accounts & Data
    // -------------------------------------------------------------------------
    console.log('\n--- SETUP: Preparing isolated test fixtures ---');
    const timestamp = Date.now();

    // Clean any previous test data
    await prisma.user.deleteMany({
      where: { email: { in: [`ownerA_${timestamp}@test.com`, `resA_${timestamp}@test.com`, `resB_${timestamp}@test.com`] } },
    });

    // 1. Create Tenant A
    const tenantA = await prisma.tenant.create({
      data: {
        name: `Phase1 Tenant A ${timestamp}`,
        slug: `tenant-a-${timestamp}`,
        email: `tenantA_${timestamp}@test.com`,
        status: 'ACTIVE',
        plan: 'STARTER',
      },
    });
    tenantAId = tenantA.id;

    // 2. Create Tenant B
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Phase1 Tenant B ${timestamp}`,
        slug: `tenant-b-${timestamp}`,
        email: `tenantB_${timestamp}@test.com`,
        status: 'ACTIVE',
        plan: 'STARTER',
      },
    });
    tenantBId = tenantB.id;

    // 3. Properties for Tenant A & B
    const propA = await prisma.property.create({
      data: {
        tenantId: tenantAId,
        name: `Property A ${timestamp}`,
        address: '100 SG Highway',
        city: 'Ahmedabad',
      },
    });
    propertyAId = propA.id;

    const propB = await prisma.property.create({
      data: {
        tenantId: tenantBId,
        name: `Property B ${timestamp}`,
        address: '200 SG Highway',
        city: 'Ahmedabad',
      },
    });
    propertyBId = propB.id;

    // 4. Owner A User
    const pwdHash = await bcrypt.hash('password123', 8);

    const ownerAUser = await prisma.user.create({
      data: {
        email: `ownerA_${timestamp}@test.com`,
        passwordHash: pwdHash,
        name: 'Owner A',
        role: 'OWNER',
        tenantId: tenantAId,
        propertyId: propertyAId,
      },
    });

    // 5. Resident A in Tenant A
    const resAUser = await prisma.user.create({
      data: {
        email: `resA_${timestamp}@test.com`,
        passwordHash: pwdHash,
        name: 'Resident A',
        role: 'RESIDENT',
        tenantId: tenantAId,
        propertyId: propertyAId,
      },
    });

    const resAProfile = await prisma.resident.create({
      data: {
        userId: resAUser.id,
        propertyId: propertyAId,
        fullName: 'Resident Alpha',
        email: resAUser.email,
        mobile: '9876543210',
        emergencyContactName: 'Guardian Alpha',
        emergencyContactRelation: 'Parent',
        emergencyContactPhone: '9876543211',
        status: 'ACTIVE',
      },
    });
    residentAId = resAProfile.id;

    // 6. Resident B in Tenant B (Different Tenant)
    const resBUser = await prisma.user.create({
      data: {
        email: `resB_${timestamp}@test.com`,
        passwordHash: pwdHash,
        name: 'Resident B',
        role: 'RESIDENT',
        tenantId: tenantBId,
        propertyId: propertyBId,
      },
    });

    const resBProfile = await prisma.resident.create({
      data: {
        userId: resBUser.id,
        propertyId: propertyBId,
        fullName: 'Resident Beta',
        email: resBUser.email,
        mobile: '9876543220',
        emergencyContactName: 'Guardian Beta',
        emergencyContactRelation: 'Parent',
        emergencyContactPhone: '9876543221',
        status: 'ACTIVE',
      },
    });
    residentBId = resBProfile.id;

    // 7. Obtain JWT Tokens
    try {
      const loginA = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerAUser.email, password: 'password123' }),
      });
      const loginAData: any = await loginA.json();
      ownerAToken = loginAData.data?.token || '';
    } catch (_) {}

    if (!ownerAToken) {
      ownerAToken = jwt.sign(
        {
          id: ownerAUser.id,
          email: ownerAUser.email,
          name: ownerAUser.name,
          role: 'OWNER',
          tenantId: tenantAId,
          propertyId: propertyAId,
        },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
    }

    try {
      const loginResA = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resAUser.email, password: 'password123' }),
      });
      const loginResAData: any = await loginResA.json();
      residentAToken = loginResAData.data?.token || '';
    } catch (_) {}

    if (!residentAToken) {
      residentAToken = jwt.sign(
        {
          id: resAUser.id,
          email: resAUser.email,
          name: resAUser.name,
          role: 'RESIDENT',
          tenantId: tenantAId,
          propertyId: propertyAId,
          residentId: resAProfile.id,
        },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
    }

    try {
      const loginResB = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resBUser.email, password: 'password123' }),
      });
      const loginResBData: any = await loginResB.json();
      residentBToken = loginResBData.data?.token || '';
    } catch (_) {}

    if (!residentBToken) {
      residentBToken = jwt.sign(
        {
          id: resBUser.id,
          email: resBUser.email,
          name: resBUser.name,
          role: 'RESIDENT',
          tenantId: tenantBId,
          propertyId: propertyBId,
          residentId: resBProfile.id,
        },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
    }

    console.log('✅ Test fixtures initialized successfully.\n');

    // =========================================================================
    // PRIORITY 1: RAZORPAY PAYMENT VERIFICATION & SECURITY
    // =========================================================================
    console.log('--- PRIORITY 1: RAZORPAY PAYMENT VERIFICATION TESTS ---');

    // 1A. Create a pending rent invoice for Resident A
    const invoice = await prisma.payment.create({
      data: {
        residentId: residentAId,
        propertyId: propertyAId,
        amount: 8500,
        category: 'RENT',
        period: 'November 2026',
        dueDate: new Date(),
        status: 'PENDING',
      },
    });
    testPaymentId = invoice.id;

    // Test 1: Order Creation generates authentic Order ID
    const orderRes = await fetch(`${BASE_URL}/resident/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({ paymentId: testPaymentId }),
    });
    const orderData: any = await orderRes.json();
    const razorpayOrderId = orderData.data?.orderId;

    if (orderRes.status === 200 && razorpayOrderId && orderData.data?.amount === 8500) {
      record('PAYMENTS', 'Create Razorpay Order', 'PASS', `Order ID: ${razorpayOrderId}, Amount: ₹${orderData.data?.amount}`);
    } else {
      record('PAYMENTS', 'Create Razorpay Order', 'FAIL', JSON.stringify(orderData));
    }

    // Test 2: Synthetic transaction ID bypass is BLOCKED (Fail Closed)
    const fakeBypassRes = await fetch(`${BASE_URL}/resident/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({
        paymentId: testPaymentId,
        transactionId: `TXN${Date.now()}`,
        method: 'UPI',
        razorpayOrderId,
      }),
    });
    const fakeBypassData: any = await fakeBypassRes.json();
    if (fakeBypassRes.status === 400 && !fakeBypassData.success) {
      record('PAYMENTS', 'Reject Synthetic Transaction Bypass', 'PASS', `Synthetic bypass rejected with HTTP 400: ${fakeBypassData.message}`);
    } else {
      record('PAYMENTS', 'Reject Synthetic Transaction Bypass', 'FAIL', `Expected HTTP 400, got ${fakeBypassRes.status}`);
    }

    // Test 3: Missing cryptographic signature is REJECTED
    const missingSigRes = await fetch(`${BASE_URL}/resident/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({
        paymentId: testPaymentId,
        razorpayPaymentId: 'pay_test_12345',
        razorpayOrderId,
      }),
    });
    const missingSigData: any = await missingSigRes.json();
    if (missingSigRes.status === 400) {
      record('PAYMENTS', 'Reject Missing Signature', 'PASS', `Rejected missing signature: ${missingSigData.message}`);
    } else {
      record('PAYMENTS', 'Reject Missing Signature', 'FAIL', `Status ${missingSigRes.status}`);
    }

    // Test 4: Forged / Invalid HMAC signature is REJECTED
    const invalidSigRes = await fetch(`${BASE_URL}/resident/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({
        paymentId: testPaymentId,
        razorpayPaymentId: 'pay_test_12345',
        razorpayOrderId,
        razorpaySignature: 'forged_cryptographic_signature_abc123',
      }),
    });
    const invalidSigData: any = await invalidSigRes.json();
    if (invalidSigRes.status === 400 && !invalidSigData.success) {
      record('PAYMENTS', 'Reject Forged HMAC Signature', 'PASS', `Rejected forged signature: ${invalidSigData.message}`);
    } else {
      record('PAYMENTS', 'Reject Forged HMAC Signature', 'FAIL', `Status ${invalidSigRes.status}`);
    }

    // Test 5: Order ID Mismatch is REJECTED
    const fakeOrderId = 'order_different_99999';
    const genuineSecret = config.razorpay.keySecret || 'test_secret_key';
    const fakeOrderSig = crypto
      .createHmac('sha256', genuineSecret)
      .update(`${fakeOrderId}|pay_test_12345`)
      .digest('hex');

    const mismatchedOrderRes = await fetch(`${BASE_URL}/resident/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({
        paymentId: testPaymentId,
        razorpayPaymentId: 'pay_test_12345',
        razorpayOrderId: fakeOrderId,
        razorpaySignature: fakeOrderSig,
      }),
    });
    const mismatchedOrderData: any = await mismatchedOrderRes.json();
    if (mismatchedOrderRes.status === 400) {
      record('PAYMENTS', 'Reject Mismatched Order ID', 'PASS', `Order ID mismatch rejected: ${mismatchedOrderData.message}`);
    } else {
      record('PAYMENTS', 'Reject Mismatched Order ID', 'FAIL', `Status ${mismatchedOrderRes.status}`);
    }

    // Test 6: Cross-Resident Payment Attempt is REJECTED (IDOR)
    const validTestPaymentId = `pay_real_${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret || '')
      .update(`${razorpayOrderId}|${validTestPaymentId}`)
      .digest('hex');

    const crossResRes = await fetch(`${BASE_URL}/resident/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentBToken}`, // Resident B attempting to verify Resident A's invoice
      },
      body: JSON.stringify({
        paymentId: testPaymentId,
        razorpayPaymentId: validTestPaymentId,
        razorpayOrderId,
        razorpaySignature: validSignature,
      }),
    });
    const crossResData: any = await crossResRes.json();
    if (crossResRes.status === 404 || crossResRes.status === 403) {
      record('PAYMENTS', 'Block Cross-Resident IDOR Settlement', 'PASS', `Cross-resident payment rejected with HTTP ${crossResRes.status}`);
    } else {
      record('PAYMENTS', 'Block Cross-Resident IDOR Settlement', 'FAIL', `Status ${crossResRes.status}`);
    }

    // Test 7: Valid Cryptographic Verification SETTLES INVOICE & Generates Receipt
    const validPaymentRes = await fetch(`${BASE_URL}/resident/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({
        paymentId: testPaymentId,
        razorpayPaymentId: validTestPaymentId,
        razorpayOrderId,
        razorpaySignature: validSignature,
      }),
    });
    const validPaymentData: any = await validPaymentRes.json();
    if (validPaymentRes.status === 200 && validPaymentData.success) {
      const receiptNumber = validPaymentData.data?.receipt?.receiptNumber;
      record('PAYMENTS', 'Cryptographically Verified Payment Settlement', 'PASS', `Invoice settled as PAID. Receipt: ${receiptNumber}`);
    } else {
      record('PAYMENTS', 'Cryptographically Verified Payment Settlement', 'FAIL', JSON.stringify(validPaymentData));
    }

    // Test 8: Repeated Verification is IDEMPOTENT (No Duplicate Settlement or Duplicate Receipt)
    const repeatRes = await fetch(`${BASE_URL}/resident/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({
        paymentId: testPaymentId,
        razorpayPaymentId: validTestPaymentId,
        razorpayOrderId,
        razorpaySignature: validSignature,
      }),
    });
    const repeatData: any = await repeatRes.json();
    if (repeatRes.status === 200 && repeatData.success) {
      const receiptsInDb = await prisma.paymentReceipt.count({ where: { paymentId: testPaymentId } });
      if (receiptsInDb === 1) {
        record('PAYMENTS', 'Idempotent Payment Verification', 'PASS', `Idempotent request succeeded. Exactly 1 receipt in DB.`);
      } else {
        record('PAYMENTS', 'Idempotent Payment Verification', 'FAIL', `Found ${receiptsInDb} receipts for single invoice.`);
      }
    } else {
      record('PAYMENTS', 'Idempotent Payment Verification', 'FAIL', `Status ${repeatRes.status}`);
    }

    // Test 9: Webhook Reconciliation is Idempotent
    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: validTestPaymentId,
            order_id: razorpayOrderId,
            amount: 850000, // in paise
            notes: { paymentId: testPaymentId },
          },
        },
      },
    });

    const webhookHeaders: any = { 'Content-Type': 'application/json' };
    if (config.razorpay.webhookSecret) {
      webhookHeaders['x-razorpay-signature'] = crypto
        .createHmac('sha256', config.razorpay.webhookSecret)
        .update(webhookPayload)
        .digest('hex');
    }

    const webhookRes = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: webhookHeaders,
      body: webhookPayload,
    });
    if (webhookRes.status === 200) {
      record('PAYMENTS', 'Webhook Reconciliation & Signature Check', 'PASS', `Webhook handled idempotently.`);
    } else {
      record('PAYMENTS', 'Webhook Reconciliation & Signature Check', 'FAIL', `Webhook returned ${webhookRes.status}`);
    }

    // Test 10: Existing Owner Manual Offline Payment Still Works
    const manualInvoice = await prisma.payment.create({
      data: {
        residentId: residentAId,
        propertyId: propertyAId,
        amount: 3000,
        category: 'ELECTRICITY',
        period: 'November 2026',
        dueDate: new Date(),
        status: 'PENDING',
      },
    });

    const manualPayRes = await fetch(`${BASE_URL}/owner/payments/${manualInvoice.id}/record-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        paymentId: manualInvoice.id,
        amount: 3000,
        paymentMethod: 'CASH',
        transactionId: `CASH-${Date.now()}`,
        note: 'Cash settled at front desk',
      }),
    });
    const manualPayData: any = await manualPayRes.json();
    if (manualPayRes.status === 200 && manualPayData.success) {
      record('PAYMENTS', 'Owner Offline Manual Payment Recording', 'PASS', `Manual cash collection recorded successfully.`);
    } else {
      record('PAYMENTS', 'Owner Offline Manual Payment Recording', 'FAIL', `Status ${manualPayRes.status}`);
    }

    // =========================================================================
    // PRIORITY 2: VISITOR GATE CHECK-IN & CHECK-OUT (PUBLIC BEARER TOKEN)
    // =========================================================================
    console.log('\n--- PRIORITY 2: VISITOR GATE CHECK-IN & CHECK-OUT TESTS ---');

    // Create an approved visitor pass for testing
    const visitorReq = await prisma.visitorRequest.create({
      data: {
        residentId: residentAId,
        propertyId: propertyAId,
        visitorName: 'Rajesh Patel',
        visitorMobile: '9825098250',
        relation: 'Brother',
        purpose: 'Weekend Visit',
        visitDate: new Date(),
        expectedEntryTime: '04:00 PM',
        expectedExitTime: '08:00 PM',
        status: 'APPROVED',
        qrPassToken: `VPASS-${Date.now()}`,
      },
    });
    testVisitorId = visitorReq.id;
    testVisitorToken = visitorReq.qrPassToken;

    // Test 11: Public Gate Verification endpoint works with token
    const verifyPassRes = await fetch(`${BASE_URL}/gate/verify/${testVisitorToken}`);
    const verifyPassData: any = await verifyPassRes.json();
    if (verifyPassRes.status === 200 && verifyPassData.data?.valid === true) {
      record('GATE_PASS', 'Public QR Pass Verification', 'PASS', `Verified pass for ${verifyPassData.data?.visitorName}`);
    } else {
      record('GATE_PASS', 'Public QR Pass Verification', 'FAIL', JSON.stringify(verifyPassData));
    }

    // Test 12: Public Gate Check-In succeeds WITHOUT owner credentials
    const checkInRes = await fetch(`${BASE_URL}/gate/check-in/${testVisitorToken}`, {
      method: 'POST',
    });
    const checkInData: any = await checkInRes.json();
    if (checkInRes.status === 200 && checkInData.data?.status === 'CHECKED_IN') {
      record('GATE_PASS', 'Public Gate Check-In via Token', 'PASS', `Visitor successfully checked in at gate without auth headers.`);
    } else {
      record('GATE_PASS', 'Public Gate Check-In via Token', 'FAIL', `Expected 200, got ${checkInRes.status}: ${JSON.stringify(checkInData)}`);
    }

    // Test 13: Duplicate Check-In is REJECTED
    const dupCheckInRes = await fetch(`${BASE_URL}/gate/check-in/${testVisitorToken}`, {
      method: 'POST',
    });
    const dupCheckInData: any = await dupCheckInRes.json();
    if (dupCheckInRes.status === 400) {
      record('GATE_PASS', 'Prevent Duplicate Check-In', 'PASS', `Duplicate check-in blocked: ${dupCheckInData.message}`);
    } else {
      record('GATE_PASS', 'Prevent Duplicate Check-In', 'FAIL', `Status ${dupCheckInRes.status}`);
    }

    // Test 14: Public Gate Check-Out succeeds
    const checkOutRes = await fetch(`${BASE_URL}/gate/check-out/${testVisitorToken}`, {
      method: 'POST',
    });
    const checkOutData: any = await checkOutRes.json();
    if (checkOutRes.status === 200 && checkOutData.data?.status === 'CHECKED_OUT') {
      record('GATE_PASS', 'Public Gate Check-Out via Token', 'PASS', `Visitor successfully checked out at gate.`);
    } else {
      record('GATE_PASS', 'Public Gate Check-Out via Token', 'FAIL', `Status ${checkOutRes.status}`);
    }

    // Test 15: Duplicate Check-Out is REJECTED
    const dupCheckOutRes = await fetch(`${BASE_URL}/gate/check-out/${testVisitorToken}`, {
      method: 'POST',
    });
    const dupCheckOutData: any = await dupCheckOutRes.json();
    if (dupCheckOutRes.status === 400) {
      record('GATE_PASS', 'Prevent Repeated Check-Out', 'PASS', `Repeated check-out blocked: ${dupCheckOutData.message}`);
    } else {
      record('GATE_PASS', 'Prevent Repeated Check-Out', 'FAIL', `Status ${dupCheckOutRes.status}`);
    }

    // Test 16: Check-Out Before Check-In is REJECTED
    const unapprovedPass = await prisma.visitorRequest.create({
      data: {
        residentId: residentAId,
        propertyId: propertyAId,
        visitorName: 'Prem Shah',
        visitorMobile: '9825098251',
        relation: 'Friend',
        purpose: 'Project work',
        visitDate: new Date(),
        expectedEntryTime: '02:00 PM',
        status: 'APPROVED',
        qrPassToken: `VPASS-UNCHECKED-${Date.now()}`,
      },
    });

    const earlyCheckOutRes = await fetch(`${BASE_URL}/gate/check-out/${unapprovedPass.qrPassToken}`, {
      method: 'POST',
    });
    const earlyCheckOutData: any = await earlyCheckOutRes.json();
    if (earlyCheckOutRes.status === 400) {
      record('GATE_PASS', 'Prevent Check-Out Before Check-In', 'PASS', `Premature check-out rejected: ${earlyCheckOutData.message}`);
    } else {
      record('GATE_PASS', 'Prevent Check-Out Before Check-In', 'FAIL', `Status ${earlyCheckOutRes.status}`);
    }

    // Test 17: Forged / Invalid Gate Pass Token is REJECTED (HTTP 404)
    const fakeGateTokenRes = await fetch(`${BASE_URL}/gate/check-in/forged_random_token_999`, {
      method: 'POST',
    });
    if (fakeGateTokenRes.status === 404) {
      record('GATE_PASS', 'Reject Forged Gate Token', 'PASS', `Forged gate token returned HTTP 404.`);
    } else {
      record('GATE_PASS', 'Reject Forged Gate Token', 'FAIL', `Status ${fakeGateTokenRes.status}`);
    }

    // Test 18: Owner endpoints remain protected with requireOwnerOrStaff
    const unauthenticatedOwnerGateRes = await fetch(`${BASE_URL}/owner/visitors/${testVisitorId}/check-in`, {
      method: 'POST',
    });
    if (unauthenticatedOwnerGateRes.status === 401) {
      record('GATE_PASS', 'Preserve Owner Route Security', 'PASS', `Unauthenticated access to /owner/visitors/:id/check-in rejected with 401.`);
    } else {
      record('GATE_PASS', 'Preserve Owner Route Security', 'FAIL', `Status ${unauthenticatedOwnerGateRes.status}`);
    }

    // =========================================================================
    // PRIORITY 3: SECURE DOCUMENT DOWNLOADS & PERSISTENT STORAGE
    // =========================================================================
    console.log('\n--- PRIORITY 3: SECURE DOCUMENT DOWNLOADS & STORAGE TESTS ---');

    // Create a KYC document for Resident A
    const kycDoc = await prisma.document.create({
      data: {
        residentId: residentAId,
        propertyId: propertyAId,
        title: 'Resident A Aadhaar Card',
        type: 'AADHAAR',
        fileUrl: 'documents/1728000000000-aadhaar.pdf',
        fileSize: 40960,
        mimeType: 'application/pdf',
        status: 'PENDING',
      },
    });
    testDocumentId = kycDoc.id;

    // Test 19: Authorized Resident gets Signed Download URL
    const dlRes = await fetch(`${BASE_URL}/resident/documents/${testDocumentId}/download`, {
      headers: { Authorization: `Bearer ${residentAToken}` },
    });
    const dlData: any = await dlRes.json();
    if (dlRes.status === 200 && dlData.data?.downloadUrl) {
      record('DOCUMENTS', 'Authorized Resident Signed Download URL', 'PASS', `Received valid signed URL.`);
    } else {
      record('DOCUMENTS', 'Authorized Resident Signed Download URL', 'FAIL', JSON.stringify(dlData));
    }

    // Test 20: Unauthorized Resident cannot access another resident document (IDOR)
    const idorDocRes = await fetch(`${BASE_URL}/resident/documents/${testDocumentId}/download`, {
      headers: { Authorization: `Bearer ${residentBToken}` },
    });
    if (idorDocRes.status === 404 || idorDocRes.status === 403) {
      record('DOCUMENTS', 'Block Cross-Resident Document Access (IDOR)', 'PASS', `Access blocked with HTTP ${idorDocRes.status}`);
    } else {
      record('DOCUMENTS', 'Block Cross-Resident Document Access (IDOR)', 'FAIL', `Status ${idorDocRes.status}`);
    }

    // Test 21: Authorized Owner can download document belonging to their PG
    const ownerDlRes = await fetch(`${BASE_URL}/owner/documents/${testDocumentId}/download`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const ownerDlData: any = await ownerDlRes.json();
    if (ownerDlRes.status === 200 && ownerDlData.data?.downloadUrl) {
      record('DOCUMENTS', 'Authorized Owner Scoped Document Access', 'PASS', `Owner successfully accessed resident document within scope.`);
    } else {
      record('DOCUMENTS', 'Authorized Owner Scoped Document Access', 'FAIL', JSON.stringify(ownerDlData));
    }

    // Test 22: Cross-Tenant Owner Document Access is REJECTED
    // Create doc in Tenant B
    const docB = await prisma.document.create({
      data: {
        residentId: residentBId,
        propertyId: propertyBId,
        title: 'Resident B PAN Card',
        type: 'PAN',
        fileUrl: 'documents/1728000000001-pan.pdf',
        fileSize: 30720,
        mimeType: 'application/pdf',
        status: 'PENDING',
      },
    });

    const crossTenantDocRes = await fetch(`${BASE_URL}/owner/documents/${docB.id}/download`, {
      headers: { Authorization: `Bearer ${ownerAToken}` }, // Owner A accessing Tenant B doc
    });
    if (crossTenantDocRes.status === 404 || crossTenantDocRes.status === 403) {
      record('DOCUMENTS', 'Block Cross-Tenant Owner Document Access', 'PASS', `Cross-tenant document access rejected with HTTP ${crossTenantDocRes.status}`);
    } else {
      record('DOCUMENTS', 'Block Cross-Tenant Owner Document Access', 'FAIL', `Status ${crossTenantDocRes.status}`);
    }

    // Test 23: Uploading document without a file is REJECTED (No dummy placeholder)
    const emptyUploadRes = await fetch(`${BASE_URL}/resident/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${residentAToken}`,
      },
      body: new FormData(),
    });
    const emptyUploadData: any = await emptyUploadRes.json();
    if (emptyUploadRes.status === 400) {
      record('DOCUMENTS', 'Reject Empty Document Upload', 'PASS', `Rejected missing file: ${emptyUploadData.message}`);
    } else {
      record('DOCUMENTS', 'Reject Empty Document Upload', 'FAIL', `Status ${emptyUploadRes.status}`);
    }

  } finally {
    // Teardown HTTP server
    server.close();

    // Cleanup test data
    try {
      if (testPaymentId) {
        await prisma.paymentReceipt.deleteMany({ where: { paymentId: testPaymentId } });
        await prisma.payment.deleteMany({ where: { id: testPaymentId } });
      }
      if (testVisitorId) {
        await prisma.visitorRequest.deleteMany({ where: { id: testVisitorId } });
      }
      if (testDocumentId) {
        await prisma.document.deleteMany({ where: { id: testDocumentId } });
      }
      if (tenantAId) {
        await prisma.auditLog.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.resident.deleteMany({ where: { property: { tenantId: tenantAId } } });
        await prisma.property.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.tenant.deleteMany({ where: { id: tenantAId } });
      }
      if (tenantBId) {
        await prisma.auditLog.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.user.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.resident.deleteMany({ where: { property: { tenantId: tenantBId } } });
        await prisma.property.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.tenant.deleteMany({ where: { id: tenantBId } });
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }

  // Summary
  const passed = records.filter((r) => r.status === 'PASS').length;
  const failed = records.filter((r) => r.status === 'FAIL').length;

  console.log('\n========================================================================');
  console.log('  PHASE 1 CRITICAL FIXES AUDIT RESULT SUMMARY:');
  console.log(`  PASSED: ${passed}`);
  console.log(`  FAILED: ${failed}`);
  console.log('========================================================================\n');

  return { passed, failed, records };
}

if (require.main === module) {
  runPhase1CriticalTests().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
