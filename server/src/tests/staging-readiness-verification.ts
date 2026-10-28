import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, UserRole, ResidentStatus, BedStatus, RoomStatus, PaymentStatus, ChargeCategory } from '@prisma/client';
import { withDbRetry } from './db-helper';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma: any = new PrismaClient();
const API_BASE = 'http://127.0.0.1:5000/api';
const UPLOADS_BASE = 'http://127.0.0.1:5000/uploads';
const JWT_SECRET = process.env.JWT_SECRET || 'urbannest_jwt_secret_development_key_change_in_production_2026';

interface TestResult {
  category: string;
  test: string;
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];

async function recordTest(
  category: string,
  testName: string,
  fn: () => Promise<string | void>
) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({
      category,
      test: testName,
      status: 'PASSED',
      durationMs,
      details: details || undefined,
    });
    console.log(`  [PASS] [${category}] ${testName} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      category,
      test: testName,
      status: 'FAILED',
      durationMs,
      details: err.message,
    });
    console.error(`  [FAIL] [${category}] ${testName}: ${err.message}`);
  }
}

async function main() {
  console.log('\n================================================================================');
  console.log('  URBAN NEST — FINAL STAGING READINESS & SECURITY FORENSIC VERIFICATION         ');
  console.log('================================================================================\n');

  const runId = `staging_${Date.now()}`;

  // Tenant A Fixtures
  let tenantA: any = null;
  let propertyA: any = null;
  let ownerUserA: any = null;
  let ownerTokenA: string = '';
  let residentUserA: any = null;
  let residentProfileA: any = null;
  let residentTokenA: string = '';
  let docA: any = null;
  let leadA: any = null;

  // Tenant B Fixtures (Foreign Tenant for IDOR testing)
  let tenantB: any = null;
  let propertyB: any = null;
  let ownerUserB: any = null;
  let ownerTokenB: string = '';
  let residentUserB: any = null;
  let residentProfileB: any = null;
  let leadB: any = null;

  try {
    // --------------------------------------------------------------------------
    // 1. SETUP: Isolated Dual-Tenant Environments
    // --------------------------------------------------------------------------
    await recordTest('SETUP', 'Provision Isolated Dual-Tenant Test Enclaves', async () => {
      const pwHash = await bcrypt.hash('StagingPass123!', 10);

      // Provision Tenant A
      tenantA = await withDbRetry(() =>
        prisma.tenant.create({
          data: {
            name: `Enclave Alpha ${runId}`,
            slug: `enclave-alpha-${runId}`,
            email: `alpha_${runId}@urbannest.test`,
            plan: 'ENTERPRISE',
            subscriptionStatus: 'ACTIVE',
          },
        })
      );

      propertyA = await withDbRetry(() =>
        prisma.property.create({
          data: {
            tenantId: tenantA.id,
            name: `Alpha Heights ${runId}`,
            address: '100 Sector 15, Gurgaon',
            city: 'Gurugram',
          },
        })
      );

      ownerUserA = await withDbRetry(() =>
        prisma.user.create({
          data: {
            tenantId: tenantA.id,
            propertyId: propertyA.id,
            email: `owner_alpha_${runId}@urbannest.test`,
            passwordHash: pwHash,
            name: 'Anil Sharma (Owner A)',
            role: UserRole.OWNER,
          },
        })
      );

      ownerTokenA = jwt.sign(
        { userId: ownerUserA.id, email: ownerUserA.email, role: ownerUserA.role, tenantId: tenantA.id, propertyId: propertyA.id },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Provision Resident A in Room 101, Bed A
      const roomA: any = await withDbRetry(() =>
        prisma.room.create({
          data: {
            propertyId: propertyA.id,
            number: `A101-${runId.slice(-4)}`,
            type: 'DOUBLE_SHARING',
            capacity: 2,
            baseRent: 12000,
            deposit: 24000,
            amenities: 'AC, WiFi',
            status: RoomStatus.AVAILABLE,
          },
        })
      );

      const bedA: any = await withDbRetry(() =>
        prisma.bed.create({
          data: {
            roomId: roomA.id,
            bedNumber: `A-1`,
            monthlyRent: 12000,
            status: BedStatus.OCCUPIED,
          },
        })
      );

      residentUserA = await withDbRetry(() =>
        prisma.user.create({
          data: {
            tenantId: tenantA.id,
            email: `res_alpha_${runId}@urbannest.test`,
            passwordHash: pwHash,
            name: 'Rohan Mehta',
            role: UserRole.RESIDENT,
            mobile: '+919811122233',
          },
        })
      );

      residentProfileA = await withDbRetry(() =>
        prisma.resident.create({
          data: {
            propertyId: propertyA.id,
            userId: residentUserA.id,
            bedId: bedA.id,
            fullName: 'Rohan Mehta',
            email: residentUserA.email,
            mobile: '+919811122233',
            emergencyContactName: 'Sanjay Mehta',
            emergencyContactRelation: 'Father',
            emergencyContactPhone: '+919811100000',
            status: ResidentStatus.ACTIVE,
          },
        })
      );

      residentTokenA = jwt.sign(
        { userId: residentUserA.id, email: residentUserA.email, role: residentUserA.role, tenantId: tenantA.id, propertyId: propertyA.id },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Seed Document for Resident A
      docA = await withDbRetry(() =>
        prisma.document.create({
          data: {
            propertyId: propertyA.id,
            residentId: residentProfileA.id,
            title: 'Resident Aadhaar Proof',
            type: 'AADHAAR',
            fileUrl: `/uploads/aadhaar_proof_${runId}.pdf`,
            mimeType: 'application/pdf',
            status: 'PENDING',
          },
        })
      );

      // Seed Lead for Tenant A
      leadA = await withDbRetry(() =>
        prisma.lead.create({
          data: {
            tenantId: tenantA.id,
            propertyId: propertyA.id,
            name: 'Prospect Alpha',
            phone: '+919800011111',
            email: `prospect_alpha_${runId}@example.com`,
            source: 'WEBSITE',
            status: 'NEW',
            whatsappConsent: true,
            whatsappOptOut: false,
          },
        })
      );

      // Provision Tenant B (Foreign Enclave)
      tenantB = await withDbRetry(() =>
        prisma.tenant.create({
          data: {
            name: `Enclave Beta ${runId}`,
            slug: `enclave-beta-${runId}`,
            email: `beta_${runId}@urbannest.test`,
            plan: 'STARTER',
            subscriptionStatus: 'ACTIVE',
          },
        })
      );

      propertyB = await withDbRetry(() =>
        prisma.property.create({
          data: {
            tenantId: tenantB.id,
            name: `Beta Residency ${runId}`,
            address: '200 Sector 29, Gurgaon',
            city: 'Gurugram',
          },
        })
      );

      ownerUserB = await withDbRetry(() =>
        prisma.user.create({
          data: {
            tenantId: tenantB.id,
            propertyId: propertyB.id,
            email: `owner_beta_${runId}@urbannest.test`,
            passwordHash: pwHash,
            name: 'Vikram Patel (Owner B)',
            role: UserRole.OWNER,
          },
        })
      );

      ownerTokenB = jwt.sign(
        { userId: ownerUserB.id, email: ownerUserB.email, role: ownerUserB.role, tenantId: tenantB.id, propertyId: propertyB.id },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Seed Lead for Tenant B
      leadB = await withDbRetry(() =>
        prisma.lead.create({
          data: {
            tenantId: tenantB.id,
            propertyId: propertyB.id,
            name: 'Prospect Beta',
            phone: '+919800022222',
            email: `prospect_beta_${runId}@example.com`,
            source: 'REFERRAL',
            status: 'NEW',
            whatsappConsent: true,
            whatsappOptOut: false,
          },
        })
      );

      return `Enclave A (${tenantA.id}) & Enclave B (${tenantB.id}) initialized.`;
    });

    // --------------------------------------------------------------------------
    // 2. SECURITY REMEDIATION CHECKS
    // --------------------------------------------------------------------------
    await recordTest('SECURITY_REMEDIATION', 'Verify Unauthenticated Access to /uploads is Blocked (401)', async () => {
      const res = await fetch(`${UPLOADS_BASE}/sample_aadhaar.pdf`);
      if (res.status !== 401) {
        throw new Error(`Expected HTTP 401 Unauthorized for unauthenticated /uploads, got HTTP ${res.status}`);
      }
      return `Unauthenticated GET /uploads blocked with HTTP 401 (Protected by authenticateToken).`;
    });

    await recordTest('SECURITY_REMEDIATION', 'Verify Path Traversal on /uploads is Blocked', async () => {
      const res = await fetch(`${UPLOADS_BASE}/..%2fpackage.json`);
      if (res.status !== 401 && res.status !== 403 && res.status !== 400 && res.status !== 404) {
        throw new Error(`Path traversal returned unsafe status HTTP ${res.status}`);
      }
      return `Path traversal request rejected with HTTP ${res.status}.`;
    });

    await recordTest('SECURITY_REMEDIATION', 'Cross-Tenant Document Access Rejection (Owner B accessing Tenant A Doc)', async () => {
      // Owner B attempts to download Document of Tenant A
      const res = await fetch(`${API_BASE}/owner/documents/${docA.id}/download`, {
        headers: { Authorization: `Bearer ${ownerTokenB}` },
      });

      // Should return 404 / 403 because document does not belong to Owner B's property
      if (res.status !== 404 && res.status !== 403) {
        throw new Error(`IDOR Leak! Owner B accessed Tenant A document with status HTTP ${res.status}`);
      }
      return `Cross-tenant document access successfully rejected with HTTP ${res.status}.`;
    });

    await recordTest('SECURITY_REMEDIATION', 'Cross-Tenant Compliance Certificate Registration Blocked', async () => {
      // Owner B attempts to create a compliance record targeting Property A
      const res = await fetch(`${API_BASE}/owner/compliance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerTokenB}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: propertyA.id, // Foreign property!
          category: 'FIRE_SAFETY',
          title: 'Illicit Fire Audit Entry',
        }),
      });

      // OwnerController.resolvePropertyScope intercepts and maps to Owner B's property or rejects
      const json: any = await res.json();
      if (json.data && json.data.propertyId === propertyA.id) {
        throw new Error('IDOR Leak! Compliance record was saved to foreign property A');
      }
      return `resolvePropertyScope sanitized target property; foreign property ID was rejected/scoped correctly.`;
    });

    await recordTest('SECURITY_REMEDIATION', 'Cross-Tenant Lead Manipulation Blocked (Owner B modifying Lead A)', async () => {
      // Owner B attempts to update Lead A (Tenant A)
      const res = await fetch(`${API_BASE}/saas/leads/${leadA.id}/referral`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerTokenB}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referrerName: 'Attacker Referrer',
          referralCommission: 50000,
        }),
      });

      if (res.status !== 403 && res.status !== 404) {
        throw new Error(`IDOR Leak! Owner B modified Lead A with status HTTP ${res.status}`);
      }
      return `Cross-tenant lead modification rejected with HTTP ${res.status} (Unauthorized lead modification).`;
    });

    await recordTest('SECURITY_REMEDIATION', 'Cross-Tenant Agreement Generation Blocked (Owner B targeting Resident A)', async () => {
      // Owner B attempts to generate agreement for Resident A
      const res = await fetch(`${API_BASE}/owner/agreements/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ownerTokenB}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          residentId: residentProfileA.id,
        }),
      });

      if (res.status !== 403 && res.status !== 404) {
        throw new Error(`IDOR Leak! Owner B generated agreement for Resident A with status HTTP ${res.status}`);
      }
      return `Cross-tenant agreement generation rejected with HTTP ${res.status} (Unauthorized access to resident agreement).`;
    });

    // --------------------------------------------------------------------------
    // 3. FINANCIAL & MESSAGING CORRECTNESS CHECKS
    // --------------------------------------------------------------------------
    await recordTest('FINANCIAL_INTEGRITY', 'Validate Rent Aging Buckets & Unit Economics Calculations', async () => {
      // Seed Payment 1: Current (Due in 5 days)
      const futureDue = new Date();
      futureDue.setDate(futureDue.getDate() + 5);
      await withDbRetry(() =>
        prisma.payment.create({
          data: {
            propertyId: propertyA.id,
            residentId: residentProfileA.id,
            amount: 10000,
            status: PaymentStatus.PENDING,
            category: ChargeCategory.RENT,
            period: 'November 2026',
            dueDate: futureDue,
          },
        })
      );

      // Seed Payment 2: 1-30 Days Overdue (Due 15 days ago)
      const due15Days = new Date();
      due15Days.setDate(due15Days.getDate() - 15);
      await withDbRetry(() =>
        prisma.payment.create({
          data: {
            propertyId: propertyA.id,
            residentId: residentProfileA.id,
            amount: 12000,
            status: PaymentStatus.PENDING,
            category: ChargeCategory.RENT,
            period: 'October 2026',
            dueDate: due15Days,
          },
        })
      );

      // Seed Payment 3: 31-60 Days Overdue (Due 45 days ago)
      const due45Days = new Date();
      due45Days.setDate(due45Days.getDate() - 45);
      await withDbRetry(() =>
        prisma.payment.create({
          data: {
            propertyId: propertyA.id,
            residentId: residentProfileA.id,
            amount: 15000,
            status: PaymentStatus.PENDING,
            category: ChargeCategory.RENT,
            period: 'September 2026',
            dueDate: due45Days,
          },
        })
      );

      // Seed Payment 4: Paid Realized Revenue
      await withDbRetry(() =>
        prisma.payment.create({
          data: {
            propertyId: propertyA.id,
            residentId: residentProfileA.id,
            amount: 12000,
            status: PaymentStatus.PAID,
            category: ChargeCategory.RENT,
            period: 'August 2026',
            dueDate: new Date(),
            paidDate: new Date(),
          },
        })
      );

      // Fetch Reports via Owner API
      const res = await fetch(`${API_BASE}/owner/reports?propertyId=${propertyA.id}`, {
        headers: { Authorization: `Bearer ${ownerTokenA}` },
      });
      const json: any = await res.json();
      if (res.status !== 200 || !json.data) {
        throw new Error(`Failed to fetch owner reports: ${json?.message}`);
      }

      const { summary, aging } = json.data;
      if (summary.totalCollected !== 12000) {
        throw new Error(`Expected totalCollected of 12000, got ${summary.totalCollected}`);
      }
      if (aging.current.amount !== 10000) {
        throw new Error(`Aging Current bucket mismatch. Expected 10000, got ${aging.current.amount}`);
      }
      if (aging.days1To30.amount !== 12000) {
        throw new Error(`Aging 1-30d bucket mismatch. Expected 12000, got ${aging.days1To30.amount}`);
      }
      if (aging.days31To60.amount !== 15000) {
        throw new Error(`Aging 31-60d bucket mismatch. Expected 15000, got ${aging.days31To60.amount}`);
      }

      return `Aging buckets verified: Current ₹${aging.current.amount}, 1-30d ₹${aging.days1To30.amount}, 31-60d ₹${aging.days31To60.amount}.`;
    });

    await recordTest('MESSAGING_INTEGRITY', 'Validate WhatsApp Opt-Out State Machine & Outbound Block', async () => {
      // 1. Initial State: Opt-In
      const optInRes = await fetch(`${API_BASE}/saas/leads/${leadA.id}/whatsapp`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ consent: true }),
      });
      const optInJson: any = await optInRes.json();
      if (!optInJson.data?.whatsappConsent || optInJson.data?.whatsappOptOut) {
        throw new Error('Opt-in consent registration failed');
      }

      // 2. Transition: Opt-Out
      const optOutRes = await fetch(`${API_BASE}/saas/leads/${leadA.id}/whatsapp`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optOut: true }),
      });
      const optOutJson: any = await optOutRes.json();
      if (optOutJson.data?.whatsappConsent !== false || optOutJson.data?.whatsappOptOut !== true) {
        throw new Error('Opt-out failed to atomically set whatsappConsent: false and whatsappOptOut: true');
      }

      // 3. Provider Readiness Check
      const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
      const hasGupshup = Boolean(process.env.GUPSHUP_APP_NAME && process.env.GUPSHUP_API_KEY);
      const hasMetaCloud = Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

      const isConfigured = hasTwilio || hasGupshup || hasMetaCloud;
      const providerStatus = isConfigured
        ? 'Live Outbound BSP Configured'
        : 'Outbound Sending Paused (No External BSP Credentials Configured)';

      return `Consent atomicity verified. Outbound Dispatch Status: ${providerStatus}.`;
    });

    // --------------------------------------------------------------------------
    // 4. MULTI-ROLE OPERATIONAL WORKFLOW REGRESSION
    // --------------------------------------------------------------------------
    await recordTest('ROLE_REGRESSION', 'Verify Owner, Resident & Gate Workflows', async () => {
      // 1. Resident creates Visitor Request
      const visitorPassRes = await fetch(`${API_BASE}/resident/visitors`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitorName: 'Alok Gupta',
          visitorMobile: '+919876599999',
          relation: 'Friend',
          purpose: 'Study Session',
          visitDate: new Date().toISOString(),
          expectedEntryTime: '05:00 PM',
        }),
      });
      const visitorJson: any = await visitorPassRes.json();
      if (visitorPassRes.status !== 201 && visitorPassRes.status !== 200) {
        throw new Error(`Failed to create resident visitor pass: ${visitorJson?.message}`);
      }
      const token = visitorJson.data?.qrPassToken;
      const visitorId = visitorJson.data?.id;
      if (!token || !visitorId) throw new Error('Visitor request did not generate qrPassToken or id');

      // 2. Cross-Tenant IDOR: Foreign Owner B attempts to approve Tenant A's visitor pass
      const foreignApproveRes = await fetch(`${API_BASE}/owner/visitors/${visitorId}/approve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerTokenB}`,
          'Content-Type': 'application/json',
        },
      });
      if (foreignApproveRes.status !== 403) {
        throw new Error(`Expected 403 when foreign owner approves visitor pass, got ${foreignApproveRes.status}`);
      }

      // 3. Authorized Owner A approves the visitor pass
      const approveRes = await fetch(`${API_BASE}/owner/visitors/${visitorId}/approve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerTokenA}`,
          'Content-Type': 'application/json',
        },
      });
      if (approveRes.status !== 200) {
        const approveJson: any = await approveRes.json();
        throw new Error(`Failed to approve visitor pass: ${approveJson?.message}`);
      }

      // 4. Security Guard / Public Gate Verification Endpoint (/api/gate/verify)
      const verifyRes = await fetch(`${API_BASE}/gate/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrPassToken: token }),
      });
      const verifyJson: any = await verifyRes.json();
      if (verifyRes.status !== 200 || !verifyJson.data?.valid) {
        throw new Error(`Security QR pass verification failed: ${JSON.stringify(verifyJson)}`);
      }

      return `Resident visitor pass created, foreign approval rejected (403), approved by Owner A, and verified by Gate Scanner.`;
    });
  } finally {
    // --------------------------------------------------------------------------
    // 5. TEARDOWN: Clean Fixture Purge
    // --------------------------------------------------------------------------
    await recordTest('TEARDOWN', 'Purge All Synthetic Staging Test Enclaves', async () => {
      if (propertyA) {
        await prisma.visitorRequest.deleteMany({ where: { propertyId: propertyA.id } });
        await prisma.document.deleteMany({ where: { propertyId: propertyA.id } });
        await prisma.payment.deleteMany({ where: { propertyId: propertyA.id } });
        await prisma.lead.deleteMany({ where: { propertyId: propertyA.id } });
        await prisma.resident.deleteMany({ where: { propertyId: propertyA.id } });
        const roomsA = await prisma.room.findMany({ where: { propertyId: propertyA.id }, select: { id: true } });
        for (const r of roomsA) {
          await prisma.bed.deleteMany({ where: { roomId: r.id } });
        }
        await prisma.room.deleteMany({ where: { propertyId: propertyA.id } });
        await prisma.property.deleteMany({ where: { id: propertyA.id } });
      }
      if (propertyB) {
        await prisma.lead.deleteMany({ where: { propertyId: propertyB.id } });
        await prisma.property.deleteMany({ where: { id: propertyB.id } });
      }
      if (tenantA) {
        await prisma.user.deleteMany({ where: { tenantId: tenantA.id } });
        await prisma.tenant.deleteMany({ where: { id: tenantA.id } });
      }
      if (tenantB) {
        await prisma.user.deleteMany({ where: { tenantId: tenantB.id } });
        await prisma.tenant.deleteMany({ where: { id: tenantB.id } });
      }
      await prisma.$disconnect();
      return 'Synthetic enclaves cleanly purged from database.';
    });
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('  STAGING READINESS & SECURITY VERIFICATION SUMMARY                             ');
  console.log('================================================================================');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  console.log(`  Total Checks: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
