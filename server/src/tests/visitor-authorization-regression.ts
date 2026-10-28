import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const API_URL = 'http://127.0.0.1:5000/api';

async function waitForServer() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Server did not become ready');
}

async function loginUser(email: string, pass = 'admin123') {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const data = await res.json() as any;
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.data.token, user: data.data.user };
}

async function runRegressionTests() {
  await waitForServer();
  console.log('===============================================================');
  console.log('  URBAN NEST — VISITOR AUTHORIZATION REGRESSION TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, details || '');
      failed++;
    }
  }

  // 1. Setup Test Data
  const defaultTenant = await prisma.tenant.findFirst({
    where: { slug: 'urban-nest-network' },
  });
  const foreignTenant = await prisma.tenant.findFirst({
    where: { slug: 'green-valley-pg-ccxd' },
  });

  const propNavrangpura = await prisma.property.findFirst({
    where: { tenantId: defaultTenant?.id, name: { contains: 'Navrangpura' } },
  });
  const propSGHighway = await prisma.property.findFirst({
    where: { tenantId: defaultTenant?.id, name: { contains: 'SG Highway' } },
  });
  const propForeign = await prisma.property.findFirst({
    where: { tenantId: foreignTenant?.id },
  });

  if (!defaultTenant || !foreignTenant || !propNavrangpura || !propSGHighway || !propForeign) {
    throw new Error('Required test tenants/properties not found in DB');
  }

  // Logins
  const ownerAuth = await loginUser('owner@pg.com', 'admin123');
  const managerAuth = await loginUser('manager.gurgaon@pg.com', 'admin123');
  const residentAuth = await loginUser('aakash.v@gmail.com', 'admin123');
  const foreignOwnerAuth = await loginUser('ownera@greenvalley.com', 'password123');

  // Test Visitor 1: for Prop Navrangpura (Manager's assigned property)
  const v1 = await prisma.visitorRequest.create({
    data: {
      propertyId: propNavrangpura.id,
      visitorName: 'Regression Guest 1 (Approve Test)',
      visitorMobile: '9876543210',
      relation: 'Friend',
      purpose: 'Verification',
      visitDate: new Date(),
      expectedEntryTime: '02:00 PM',
      status: 'PENDING',
      qrPassToken: `VPASS-REG1-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    },
  });

  // Test Visitor 2: for Prop Navrangpura (Manager's assigned property, Reject Test)
  const v2 = await prisma.visitorRequest.create({
    data: {
      propertyId: propNavrangpura.id,
      visitorName: 'Regression Guest 2 (Reject Test)',
      visitorMobile: '9876543211',
      relation: 'Colleague',
      purpose: 'Meeting',
      visitDate: new Date(),
      expectedEntryTime: '03:00 PM',
      status: 'PENDING',
      qrPassToken: `VPASS-REG2-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    },
  });

  // Test Visitor 3: for Prop SG Highway (Same tenant, but Manager is ONLY assigned to Navrangpura)
  const v3 = await prisma.visitorRequest.create({
    data: {
      propertyId: propSGHighway.id,
      visitorName: 'Regression Guest 3 (Second Property Test)',
      visitorMobile: '9876543212',
      relation: 'Guest',
      purpose: 'Tour',
      visitDate: new Date(),
      expectedEntryTime: '04:00 PM',
      status: 'PENDING',
      qrPassToken: `VPASS-REG3-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    },
  });

  // Test Visitor 4: for Foreign Tenant Property
  const v4Foreign = await prisma.visitorRequest.create({
    data: {
      propertyId: propForeign.id,
      visitorName: 'Foreign Tenant Guest',
      visitorMobile: '9876543213',
      relation: 'Guest',
      purpose: 'Foreign Visit',
      visitDate: new Date(),
      expectedEntryTime: '05:00 PM',
      status: 'PENDING',
      qrPassToken: `VPASS-REG4-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    },
  });

  try {
    // -------------------------------------------------------------------------
    // Scenario 1: Manager approves a request within an authorized property
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Manager approves a request within an authorized property ---');
    const approveV1Res = await fetch(`${API_URL}/owner/visitors/${v1.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerAuth.token}`,
      },
    });
    const approveV1Data = await approveV1Res.json() as any;
    assert(
      approveV1Res.status === 200 && approveV1Data.success === true && approveV1Data.data.status === 'APPROVED',
      'Manager successfully approves visitor request in authorized property',
      approveV1Data
    );

    // -------------------------------------------------------------------------
    // Scenario 2: Manager rejects a request within an authorized property
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Manager rejects a request within an authorized property ---');
    const rejectV2Res = await fetch(`${API_URL}/owner/visitors/${v2.id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerAuth.token}`,
      },
    });
    const rejectV2Data = await rejectV2Res.json() as any;
    assert(
      rejectV2Res.status === 200 && rejectV2Data.success === true && rejectV2Data.data.status === 'REJECTED',
      'Manager successfully rejects visitor request in authorized property',
      rejectV2Data
    );

    // -------------------------------------------------------------------------
    // Scenario 3: Manager can manage a second property only if explicitly authorized
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Manager property scoping (unassigned vs assigned) ---');
    // First: manager is NOT authorized for SG Highway property -> should fail (403)
    const approveV3UnassignedRes = await fetch(`${API_URL}/owner/visitors/${v3.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerAuth.token}`,
      },
    });
    const approveV3UnassignedData = await approveV3UnassignedRes.json() as any;
    assert(
      approveV3UnassignedRes.status === 403 &&
        approveV3UnassignedData.message.includes('not authorized to manage visitor requests for this property'),
      'Manager blocked from approving visitor in unassigned property',
      approveV3UnassignedData
    );

    // Now: Owner (who owns the whole tenant) CAN approve SG Highway visitor request
    const approveV3ByOwnerRes = await fetch(`${API_URL}/owner/visitors/${v3.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAuth.token}`,
      },
    });
    const approveV3ByOwnerData = await approveV3ByOwnerRes.json() as any;
    assert(
      approveV3ByOwnerRes.status === 200 && approveV3ByOwnerData.data.status === 'APPROVED',
      'Owner can approve visitor in any property under their tenant',
      approveV3ByOwnerData
    );

    // -------------------------------------------------------------------------
    // Scenario 4: Manager cannot approve another tenant's request
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Manager cannot approve another tenant\'s request ---');
    const managerForeignRes = await fetch(`${API_URL}/owner/visitors/${v4Foreign.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerAuth.token}`,
      },
    });
    const managerForeignData = await managerForeignRes.json() as any;
    assert(
      managerForeignRes.status === 403 && managerForeignData.message.includes('foreign tenant visitor request'),
      'Manager strictly blocked with 403 on foreign tenant visitor request',
      managerForeignData
    );

    // -------------------------------------------------------------------------
    // Scenario 5: Owner cannot access a foreign tenant's request
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Owner cannot access a foreign tenant\'s request ---');
    const ownerForeignRes = await fetch(`${API_URL}/owner/visitors/${v4Foreign.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAuth.token}`,
      },
    });
    const ownerForeignData = await ownerForeignRes.json() as any;
    assert(
      ownerForeignRes.status === 403 && ownerForeignData.message.includes('foreign tenant visitor request'),
      'Owner strictly blocked with 403 on foreign tenant visitor request',
      ownerForeignData
    );

    // Foreign Owner CAN approve their own tenant's visitor request
    const foreignOwnerOwnRes = await fetch(`${API_URL}/owner/visitors/${v4Foreign.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${foreignOwnerAuth.token}`,
      },
    });
    const foreignOwnerOwnData = await foreignOwnerOwnRes.json() as any;
    assert(
      foreignOwnerOwnRes.status === 200 && foreignOwnerOwnData.data.status === 'APPROVED',
      'Foreign Owner successfully approves their own tenant\'s visitor request',
      foreignOwnerOwnData
    );

    // -------------------------------------------------------------------------
    // Scenario 6: Resident cannot approve their own request
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Resident cannot approve their own request ---');
    const residentSelfApproveRes = await fetch(`${API_URL}/owner/visitors/${v1.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAuth.token}`,
      },
    });
    const residentSelfApproveData = await residentSelfApproveRes.json() as any;
    assert(
      residentSelfApproveRes.status === 403,
      'Resident strictly blocked with 403 from approving visitor requests',
      residentSelfApproveData
    );

    // -------------------------------------------------------------------------
    // Scenario 7: Invalid visitor status transitions are rejected
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Invalid visitor status transitions are rejected ---');
    // Attempt to re-approve an already approved visitor (v1)
    const reApproveRes = await fetch(`${API_URL}/owner/visitors/${v1.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerAuth.token}`,
      },
    });
    const reApproveData = await reApproveRes.json() as any;
    assert(
      reApproveRes.status === 400 && reApproveData.message.includes('already been approved'),
      'Repeated approval of already APPROVED request returns 400',
      reApproveData
    );

    // Attempt to re-reject an already rejected visitor (v2)
    const reRejectRes = await fetch(`${API_URL}/owner/visitors/${v2.id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerAuth.token}`,
      },
    });
    const reRejectData = await reRejectRes.json() as any;
    assert(
      reRejectRes.status === 400 && reRejectData.message.includes('already been rejected'),
      'Repeated rejection of already REJECTED request returns 400',
      reRejectData
    );

    // -------------------------------------------------------------------------
    // Scenario 8: Successful approval generates/preserves valid QR pass
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: QR Pass Token verification & integrity ---');
    const approvedVisitorFromDb = await prisma.visitorRequest.findUnique({
      where: { id: v1.id },
    });
    assert(
      !!approvedVisitorFromDb?.qrPassToken && approvedVisitorFromDb.qrPassToken.startsWith('VPASS-'),
      'Approved visitor has valid VPASS QR pass token',
      approvedVisitorFromDb?.qrPassToken
    );

    // -------------------------------------------------------------------------
    // Scenario 9: Audit log recorded on approval and rejection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Audit log verification ---');
    const auditEntries = await prisma.auditLog.findMany({
      where: { entityId: { in: [v1.id, v2.id] } },
    });
    assert(
      auditEntries.length >= 2,
      'Audit log entries recorded for both visitor approval and rejection transactions',
      auditEntries.map((a) => ({ actor: a.actorName, details: a.details }))
    );

    // -------------------------------------------------------------------------
    // Scenario 10: Existing visitor QR verification, check-in, and check-out workflows
    // -------------------------------------------------------------------------
    console.log('\n--- Test 10: Gate Desk verification, Check-In, and Check-Out workflows ---');
    // Verify QR pass
    const verifyRes = await fetch(`${API_URL}/owner/visitors/verify-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerAuth.token}`,
      },
      body: JSON.stringify({ qrPassToken: approvedVisitorFromDb?.qrPassToken }),
    });
    const verifyData = await verifyRes.json() as any;
    assert(
      verifyRes.status === 200 && verifyData.success === true,
      'Gate QR verification succeeds for approved pass',
      verifyData
    );

    // Check-In
    const checkInRes = await fetch(`${API_URL}/owner/visitors/${v1.id}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerAuth.token}`,
      },
    });
    const checkInData = await checkInRes.json() as any;
    assert(
      checkInRes.status === 200 && checkInData.data.status === 'CHECKED_IN',
      'Visitor check-in succeeds and status updates to CHECKED_IN',
      checkInData
    );

    // Check-Out
    const checkOutRes = await fetch(`${API_URL}/owner/visitors/${v1.id}/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerAuth.token}`,
      },
    });
    const checkOutData = await checkOutRes.json() as any;
    assert(
      checkOutRes.status === 200 && checkOutData.data.status === 'CHECKED_OUT',
      'Visitor check-out succeeds and status updates to CHECKED_OUT',
      checkOutData
    );

  } finally {
    // Clean up test records
    await prisma.visitorRequest.deleteMany({
      where: { id: { in: [v1.id, v2.id, v3.id, v4Foreign.id] } },
    });
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: [v1.id, v2.id, v3.id, v4Foreign.id] } },
    });
  }

  console.log('\n===============================================================');
  console.log(`  REGRESSION TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests().catch((err) => {
  console.error('Test Suite Failed with Error:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
