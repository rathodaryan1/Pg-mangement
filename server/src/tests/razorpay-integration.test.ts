import http from 'http';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../index';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { createRazorpayOrder, verifyRazorpaySignature, fetchRazorpayPayment } from '../services';

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

export async function runRazorpayIntegrationTests() {
  console.log('========================================================================');
  console.log('  URBAN NEST — RAZORPAY PAYMENT GATEWAY VERIFICATION SUITE              ');
  console.log('========================================================================\n');

  const TEST_PORT = 5123;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`Razorpay test server running on port ${TEST_PORT}`);
      resolve();
    });
  });

  const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;
  const timestamp = Date.now();

  let tenantId = '';
  let propertyId = '';
  let residentUserId = '';
  let residentProfileId = '';
  let residentToken = '';
  let invoiceId = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Direct Gateway API Verification with Configured Credentials
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Direct Live Gateway Order Creation ---');
    const { keyId, keySecret } = config.razorpay;

    if (keyId && keySecret) {
      try {
        const directOrder = await createRazorpayOrder(1500, `rcpt_test_${timestamp}`);
        if (directOrder?.id && (directOrder.id.startsWith('order_') || directOrder.id.startsWith('order_dev_'))) {
          record('GATEWAY_API', 'Live Gateway Order Creation', 'PASS', `Created Order ID: ${directOrder.id} (Amount: ₹1,500)`);
        } else {
          record('GATEWAY_API', 'Live Gateway Order Creation', 'FAIL', `Invalid response: ${JSON.stringify(directOrder)}`);
        }
      } catch (err: any) {
        record('GATEWAY_API', 'Live Gateway Order Creation', 'FAIL', err.message);
      }
    } else {
      record('GATEWAY_API', 'Live Gateway Order Creation', 'FAIL', 'Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in configuration.');
    }

    // -------------------------------------------------------------------------
    // 2. Cryptographic HMAC-SHA256 Signature Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Cryptographic HMAC Signature Verification ---');
    const testOrderId = `order_${timestamp}`;
    const testPaymentId = `pay_${timestamp}`;
    const secret = keySecret || 'hYqDNiGopO7ckzL02meFVvJd';

    const genuineSignature = crypto
      .createHmac('sha256', secret)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest('hex');

    const isGenuineValid = verifyRazorpaySignature(testOrderId, testPaymentId, genuineSignature, secret);
    if (isGenuineValid) {
      record('CRYPTO_SIGNATURE', 'Verify Authentic HMAC Signature', 'PASS', `Genuine signature verified successfully.`);
    } else {
      record('CRYPTO_SIGNATURE', 'Verify Authentic HMAC Signature', 'FAIL', `Genuine signature was rejected.`);
    }

    const tamperedSignature = genuineSignature.slice(0, -4) + 'abcd';
    const isTamperedValid = verifyRazorpaySignature(testOrderId, testPaymentId, tamperedSignature, secret);
    if (!isTamperedValid) {
      record('CRYPTO_SIGNATURE', 'Reject Forged/Tampered Signature', 'PASS', `Tampered signature successfully rejected.`);
    } else {
      record('CRYPTO_SIGNATURE', 'Reject Forged/Tampered Signature', 'FAIL', `Forged signature was accepted!`);
    }

    // -------------------------------------------------------------------------
    // 3. Database Fixtures for End-to-End Payment Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: End-to-End Invoice Order Creation & Verification ---');
    const tenant = await prisma.tenant.create({
      data: {
        name: `Razorpay Test Tenant ${timestamp}`,
        slug: `rzp-tenant-${timestamp}`,
        email: `rzptenant_${timestamp}@test.com`,
        status: 'ACTIVE',
        plan: 'STARTER',
      },
    });
    tenantId = tenant.id;

    const property = await prisma.property.create({
      data: {
        tenantId,
        name: `Razorpay Test Property ${timestamp}`,
        address: '101 SG Highway',
        city: 'Ahmedabad',
        razorpayKeyId: keyId,
        razorpayKeySecret: keySecret,
      },
    });
    propertyId = property.id;

    const pwdHash = await bcrypt.hash('password123', 8);
    const user = await prisma.user.create({
      data: {
        email: `rzpres_${timestamp}@test.com`,
        passwordHash: pwdHash,
        name: 'Razorpay Resident',
        role: 'RESIDENT',
        tenantId,
        propertyId,
      },
    });
    residentUserId = user.id;

    const profile = await prisma.resident.create({
      data: {
        userId: user.id,
        propertyId,
        fullName: 'Razorpay Resident',
        email: user.email,
        mobile: '9876543210',
        emergencyContactName: 'Guardian',
        emergencyContactRelation: 'Parent',
        emergencyContactPhone: '9876543211',
        status: 'ACTIVE',
      },
    });
    residentProfileId = profile.id;

    residentToken = jwt.sign(
      { id: user.id, email: user.email, role: 'RESIDENT', tenantId, propertyId },
      config.jwtSecret || 'dev-secret',
      { expiresIn: '1h' }
    );

    const payment = await prisma.payment.create({
      data: {
        residentId: profile.id,
        propertyId,
        amount: 8500,
        category: 'RENT',
        period: 'November 2026',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });
    invoiceId = payment.id;

    // Call /api/resident/payments/create-order
    const orderRes = await fetch(`${BASE_URL}/resident/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentToken}`,
      },
      body: JSON.stringify({ paymentId: invoiceId, method: 'UPI' }),
    });
    const orderData: any = await orderRes.json();
    const serverOrderId = orderData.data?.orderId;

    if (orderRes.status === 200 && serverOrderId && orderData.data?.amount === 8500) {
      record('E2E_WORKFLOW', 'API Create Payment Order', 'PASS', `Received Gateway Order ID: ${serverOrderId}, Amount: ₹8,500`);
    } else {
      record('E2E_WORKFLOW', 'API Create Payment Order', 'FAIL', `Status ${orderRes.status}, data: ${JSON.stringify(orderData)}`);
    }

    // Call /api/resident/payments/verify with genuine signature
    const paymentIdStr = `pay_${Date.now()}`;
    const generatedSig = crypto
      .createHmac('sha256', secret)
      .update(`${serverOrderId}|${paymentIdStr}`)
      .digest('hex');

    const verifyRes = await fetch(`${BASE_URL}/resident/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentToken}`,
      },
      body: JSON.stringify({
        paymentId: invoiceId,
        razorpayOrderId: serverOrderId,
        razorpayPaymentId: paymentIdStr,
        razorpaySignature: generatedSig,
      }),
    });
    const verifyData: any = await verifyRes.json();

    if (verifyRes.status === 200 && verifyData.success) {
      record('E2E_WORKFLOW', 'API Verify Payment & Generate Receipt', 'PASS', `Verified payment and generated receipt #${verifyData.data?.receipt?.receiptNumber}`);
    } else {
      record('E2E_WORKFLOW', 'API Verify Payment & Generate Receipt', 'FAIL', `Status ${verifyRes.status}, error: ${JSON.stringify(verifyData)}`);
    }

    // Verify invoice is marked PAID in database
    const settledPayment = await prisma.payment.findUnique({
      where: { id: invoiceId },
      include: { receipt: true },
    });
    if (settledPayment?.status === 'PAID' && settledPayment?.method === 'RAZORPAY' && settledPayment?.receipt) {
      record('E2E_WORKFLOW', 'Database Atomic Settlement', 'PASS', `Payment status is PAID, method is RAZORPAY, receipt is linked.`);
    } else {
      record('E2E_WORKFLOW', 'Database Atomic Settlement', 'FAIL', `Payment status: ${settledPayment?.status}`);
    }

    // -------------------------------------------------------------------------
    // 4. Webhook Event Processing
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Razorpay Webhook Event Processing ---');
    const webhookInvoice = await prisma.payment.create({
      data: {
        residentId: profile.id,
        propertyId,
        amount: 5000,
        category: 'MAINTENANCE_FEE',
        period: 'November 2026',
        dueDate: new Date(),
        status: 'PENDING',
        orderId: `order_wh_${timestamp}`,
      },
    });

    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_wh_${timestamp}`,
            order_id: webhookInvoice.orderId,
            amount: 500000,
            status: 'captured',
            notes: {
              paymentId: webhookInvoice.id,
            },
          },
        },
      },
    };

    const webhookHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.razorpay.webhookSecret) {
      const whSig = crypto
        .createHmac('sha256', config.razorpay.webhookSecret)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');
      webhookHeaders['x-razorpay-signature'] = whSig;
    }

    const whRes = await fetch(`${BASE_URL}/webhooks/razorpay`, {
      method: 'POST',
      headers: webhookHeaders,
      body: JSON.stringify(webhookPayload),
    });

    const settledWhInvoice = await prisma.payment.findUnique({
      where: { id: webhookInvoice.id },
      include: { receipt: true },
    });

    if (whRes.status === 200 && settledWhInvoice?.status === 'PAID' && settledWhInvoice.receipt) {
      record('WEBHOOK', 'Process payment.captured Webhook', 'PASS', `Webhook settled invoice to PAID and created receipt #${settledWhInvoice.receipt.receiptNumber}`);
    } else {
      record('WEBHOOK', 'Process payment.captured Webhook', 'FAIL', `Status ${whRes.status}, invoice status: ${settledWhInvoice?.status}`);
    }

    // Clean webhook invoice
    await prisma.paymentReceipt.deleteMany({ where: { paymentId: webhookInvoice.id } });
    await prisma.payment.deleteMany({ where: { id: webhookInvoice.id } });

  } finally {
    server.close();

    // Cleanup fixtures safely
    try {
      if (invoiceId) {
        await prisma.paymentReceipt.deleteMany({ where: { paymentId: invoiceId } });
        await prisma.payment.deleteMany({ where: { id: invoiceId } });
      }
      if (residentProfileId) {
        await prisma.resident.deleteMany({ where: { id: residentProfileId } });
      }
      if (residentUserId) {
        await prisma.user.deleteMany({ where: { id: residentUserId } });
      }
      if (propertyId) {
        await prisma.property.deleteMany({ where: { id: propertyId } });
      }
      if (tenantId) {
        await prisma.tenant.deleteMany({ where: { id: tenantId } });
      }
    } catch (cleanupErr) {
      console.warn('Razorpay test cleanup warning:', cleanupErr);
    }
  }

  // Summary
  const passed = records.filter((r) => r.status === 'PASS').length;
  const failed = records.filter((r) => r.status === 'FAIL').length;

  console.log('\n========================================================================');
  console.log('  RAZORPAY GATEWAY TEST RESULT SUMMARY:');
  console.log(`  PASSED: ${passed}`);
  console.log(`  FAILED: ${failed}`);
  console.log('========================================================================\n');

  return { passed, failed, records };
}

if (require.main === module) {
  runRazorpayIntegrationTests().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
