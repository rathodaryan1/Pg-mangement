import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const API_URL = 'http://127.0.0.1:5000/api';

async function waitForServer() {
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) return;
    } catch {
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw new Error('Server did not become ready at ' + API_URL);
}

async function loginUser(email: string, pass = 'admin123') {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.data.token, user: data.data.user };
}

async function runComprehensiveAudit() {
  await waitForServer();
  console.log('=============================================================================');
  console.log('  URBAN NEST — COMPREHENSIVE PLATFORM AUDIT & SECURITY TEST SUITE');
  console.log('=============================================================================\n');

  let passed = 0;
  let failed = 0;
  const results: Array<{ phase: string; test: string; status: 'PASS' | 'FAIL'; note?: string }> = [];

  function assert(condition: boolean, phase: string, testName: string, note?: string) {
    if (condition) {
      console.log(`  ✅ [${phase}] PASS: ${testName}`);
      passed++;
      results.push({ phase, test: testName, status: 'PASS', note });
    } else {
      console.error(`  ❌ [${phase}] FAIL: ${testName} ${note || ''}`);
      failed++;
      results.push({ phase, test: testName, status: 'FAIL', note });
    }
  }

  // --------------------------------------------------------------------------
  // Fixtures Setup
  // --------------------------------------------------------------------------
  const defaultTenant = await prisma.tenant.findFirst({ where: { slug: 'urban-nest-network' } });
  if (!defaultTenant) throw new Error('Default tenant not found');

  // Ensure a secondary foreign tenant exists for rigorous isolation testing
  let foreignTenant = await prisma.tenant.findFirst({ where: { slug: 'foreign-audit-tenant' } });
  if (!foreignTenant) {
    foreignTenant = await prisma.tenant.create({
      data: {
        name: 'Foreign Isolation PG Tenant',
        slug: 'foreign-audit-tenant',
        email: 'foreign.isolation@pgtest.com',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'ACTIVE',
        plan: 'STARTER',
      },
    });
  }

  // Ensure foreign property exists
  let foreignProp = await prisma.property.findFirst({ where: { tenantId: foreignTenant.id } });
  if (!foreignProp) {
    foreignProp = await prisma.property.create({
      data: {
        tenantId: foreignTenant.id,
        name: 'Foreign Heights PG Mumbai',
        address: '404 Foreign Express Way',
        city: 'Mumbai',
        phone: '+91 9988776655',
      },
    });
  }

  // Find or create foreign owner
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash('password123', 10);
  let foreignOwner = await prisma.user.findFirst({ where: { email: 'foreign.owner@pgtest.com' } });
  if (!foreignOwner) {
    foreignOwner = await prisma.user.create({
      data: {
        email: 'foreign.owner@pgtest.com',
        passwordHash,
        name: 'Foreign PG Owner',
        role: 'OWNER',
        tenantId: foreignTenant.id,
      },
    });
  }

  // Find or create foreign manager
  let foreignManager = await prisma.user.findFirst({ where: { email: 'foreign.manager@pgtest.com' } });
  if (!foreignManager) {
    foreignManager = await prisma.user.create({
      data: {
        email: 'foreign.manager@pgtest.com',
        passwordHash,
        name: 'Foreign PG Manager',
        role: 'MANAGER',
        tenantId: foreignTenant.id,
        propertyId: foreignProp.id,
      },
    });
  }

  // Primary tenant properties
  const propNavrangpura = await prisma.property.findFirst({
    where: { tenantId: defaultTenant.id, name: { contains: 'Navrangpura' } },
  });
  // Ensure accountant user exists
  let accountant = await prisma.user.findFirst({ where: { email: 'accounts.gurgaon@pg.com' } });
  if (!accountant) {
    accountant = await prisma.user.create({
      data: {
        email: 'accounts.gurgaon@pg.com',
        passwordHash,
        name: 'Accounts Specialist',
        role: 'ACCOUNTANT',
        tenantId: defaultTenant.id,
        propertyId: propNavrangpura?.id,
      },
    });
  }

  // --------------------------------------------------------------------------
  // PHASE 2: Unified Login & Authentication For Every Role
  // --------------------------------------------------------------------------
  console.log('\n--- PHASE 2: Unified Login & Role Dispatch ---');

  const testAccounts = [
    { role: 'SUPER_ADMIN', email: 'superadmin@pg.com', pass: 'admin123' },
    { role: 'OWNER', email: 'owner@pg.com', pass: 'admin123' },
    { role: 'MANAGER', email: 'manager.gurgaon@pg.com', pass: 'admin123' },
    { role: 'RESIDENT', email: 'aakash.v@gmail.com', pass: 'admin123' },
    { role: 'COOK', email: 'cook@pg.com', pass: 'admin123' },
    { role: 'SECURITY_GUARD', email: 'guard@pg.com', pass: 'admin123' },
    { role: 'HOUSEKEEPING', email: 'housekeeping@pg.com', pass: 'admin123' },
    { role: 'MAINTENANCE', email: 'repair.gurgaon@pg.com', pass: 'admin123' },
    { role: 'RECEPTIONIST', email: 'reception.gurgaon@pg.com', pass: 'admin123' },
    { role: 'ACCOUNTANT', email: 'accounts.gurgaon@pg.com', pass: 'password123' },
  ];

  const authTokens: Record<string, string> = {};

  for (const acc of testAccounts) {
    try {
      const loginRes = await loginUser(acc.email, acc.pass);
      authTokens[acc.role] = loginRes.token;
      assert(
        loginRes.user.role === acc.role,
        'Phase 2 - Unified Login',
        `Role ${acc.role} authenticated with verified server-side claims (${acc.email})`
      );
    } catch (err: any) {
      assert(false, 'Phase 2 - Unified Login', `Role ${acc.role} login failed: ${err.message}`);
    }
  }

  // Invalid password test
  const invalidLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@pg.com', password: 'wrongpassword' }),
  });
  assert(
    invalidLoginRes.status === 401,
    'Phase 2 - Security',
    'Invalid password rejected with 401 Unauthorized'
  );

  // Tampered JWT rejection
  const tamperedRes = await fetch(`${API_URL}/owner/properties`, {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature' },
  });
  assert(
    tamperedRes.status === 401,
    'Phase 2 - Security',
    'Forged/tampered JWT rejected with 401 Unauthorized'
  );

  // Foreign owner login
  const foreignOwnerLogin = await loginUser('foreign.owner@pgtest.com', 'password123');
  authTokens['FOREIGN_OWNER'] = foreignOwnerLogin.token;

  const foreignManagerLogin = await loginUser('foreign.manager@pgtest.com', 'password123');
  authTokens['FOREIGN_MANAGER'] = foreignManagerLogin.token;

  // --------------------------------------------------------------------------
  // PHASE 3: Tenant & Property Isolation Checks
  // --------------------------------------------------------------------------
  console.log('\n--- PHASE 3: Tenant & Property Boundary Isolation ---');

  // Test 3.1: Foreign owner querying primary tenant's property in Security Visitor Log
  const foreignVisitorLogRes = await fetch(`${API_URL}/security/visitors?propertyId=${propNavrangpura?.id}`, {
    headers: { Authorization: `Bearer ${authTokens['FOREIGN_OWNER']}` },
  });
  assert(
    foreignVisitorLogRes.status === 403,
    'Phase 3 - Tenant Isolation',
    'Cross-tenant visitor log query rejected with 403 Forbidden',
    `Status: ${foreignVisitorLogRes.status}`
  );

  // Test 3.2: Foreign owner querying primary tenant's menus
  const foreignMenuRes = await fetch(`${API_URL}/kitchen/menus?propertyId=${propNavrangpura?.id}`, {
    headers: { Authorization: `Bearer ${authTokens['FOREIGN_OWNER']}` },
  });
  assert(
    foreignMenuRes.status === 403,
    'Phase 3 - Tenant Isolation',
    'Cross-tenant kitchen menus query rejected with 403 Forbidden',
    `Status: ${foreignMenuRes.status}`
  );

  // Test 3.3: Foreign owner querying primary tenant's housekeeping tasks
  const foreignHousekeepingRes = await fetch(`${API_URL}/housekeeping/tasks?propertyId=${propNavrangpura?.id}`, {
    headers: { Authorization: `Bearer ${authTokens['FOREIGN_OWNER']}` },
  });
  assert(
    foreignHousekeepingRes.status === 403,
    'Phase 3 - Tenant Isolation',
    'Cross-tenant housekeeping tasks query rejected with 403 Forbidden',
    `Status: ${foreignHousekeepingRes.status}`
  );

  // Test 3.4: Foreign owner querying primary tenant's lifecycle pipeline
  const foreignPipelineRes = await fetch(`${API_URL}/operations/lifecycle/pipeline?propertyId=${propNavrangpura?.id}`, {
    headers: { Authorization: `Bearer ${authTokens['FOREIGN_OWNER']}` },
  });
  assert(
    foreignPipelineRes.status === 403,
    'Phase 3 - Tenant Isolation',
    'Cross-tenant lifecycle pipeline query rejected with 403 Forbidden',
    `Status: ${foreignPipelineRes.status}`
  );

  // Test 3.5: Foreign owner querying primary tenant's utility readings
  const foreignUtilityRes = await fetch(`${API_URL}/saas/utilities?propertyId=${propNavrangpura?.id}`, {
    headers: { Authorization: `Bearer ${authTokens['FOREIGN_OWNER']}` },
  });
  assert(
    foreignUtilityRes.status === 403,
    'Phase 3 - Tenant Isolation',
    'Cross-tenant utility readings query rejected with 403 Forbidden',
    `Status: ${foreignUtilityRes.status}`
  );

  // --------------------------------------------------------------------------
  // PHASE 4: End-to-End Visitor Approval & QR Pass Lifecycle
  // --------------------------------------------------------------------------
  console.log('\n--- PHASE 4: Visitor Approval & QR Pass Workflow ---');

  // Step 1: Resident creates visitor pass request
  const residentToken = authTokens['RESIDENT'];
  const createPassRes = await fetch(`${API_URL}/resident/visitors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${residentToken}`,
    },
    body: JSON.stringify({
      visitorName: 'Audit Test Visitor Rohan',
      visitorMobile: '9876543210',
      relation: 'Cousin',
      purpose: 'Weekend Visit',
      visitDate: new Date().toISOString(),
      expectedEntryTime: '05:00 PM',
      expectedExitTime: '09:00 PM',
    }),
  });
  const createPassData = (await createPassRes.json()) as any;
  assert(
    createPassRes.ok && createPassData.data?.status === 'PENDING',
    'Phase 4 - Visitor Lifecycle',
    'Step 1: Resident submitted visitor request in PENDING status',
    `Pass ID: ${createPassData.data?.id}`
  );

  const visitorPass = createPassData.data;
  const qrToken = visitorPass?.qrPassToken;
  assert(
    Boolean(qrToken && qrToken.startsWith('VPASS-')),
    'Phase 4 - QR Pass Token',
    `Generated cryptographically secure pass token format (${qrToken})`
  );

  // Step 2: Security checks pass BEFORE approval (must indicate NOT approved / canCheckIn: false)
  const securityToken = authTokens['SECURITY_GUARD'];
  const verifyBeforeApprovalRes = await fetch(`${API_URL}/security/verify-pass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${securityToken}`,
    },
    body: JSON.stringify({ token: qrToken }),
  });
  const verifyBeforeData = (await verifyBeforeApprovalRes.json()) as any;
  assert(
    verifyBeforeData.data?.canCheckIn === false && verifyBeforeData.data?.status === 'PENDING',
    'Phase 4 - Gate Security Desk',
    'Step 2: Gate verification correctly flags PENDING pass as NOT eligible for check-in'
  );

  // Step 3: Security check-in attempt on PENDING pass (must be strictly REJECTED)
  const prematureCheckInRes = await fetch(`${API_URL}/security/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${securityToken}`,
    },
    body: JSON.stringify({ token: qrToken }),
  });
  assert(
    prematureCheckInRes.status === 400,
    'Phase 4 - Gate Security Desk',
    'Step 3: Premature gate check-in on unapproved pass strictly blocked with 400',
    `Status: ${prematureCheckInRes.status}`
  );

  // Step 4: Foreign tenant manager attempts to approve visitor pass (must be REJECTED with 403)
  const foreignApprovalRes = await fetch(`${API_URL}/owner/visitors/${visitorPass.id}/approve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authTokens['FOREIGN_MANAGER']}`,
    },
  });
  assert(
    foreignApprovalRes.status === 403,
    'Phase 4 - Tenant Security',
    'Step 4: Cross-tenant manager visitor approval blocked with 403 Forbidden'
  );

  // Step 5: Legitimate Manager approves visitor pass
  const managerToken = authTokens['MANAGER'];
  const legitimateApprovalRes = await fetch(`${API_URL}/owner/visitors/${visitorPass.id}/approve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${managerToken}`,
    },
  });
  const approvalData = (await legitimateApprovalRes.json()) as any;
  assert(
    legitimateApprovalRes.ok && approvalData.data?.status === 'APPROVED',
    'Phase 4 - Manager Approval',
    'Step 5: Authorized PG Manager approved visitor pass (status: APPROVED)'
  );

  // Step 6: Security scans pass AFTER approval (must indicate eligible for entry)
  const verifyAfterApprovalRes = await fetch(`${API_URL}/security/verify-pass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${securityToken}`,
    },
    body: JSON.stringify({ token: qrToken }),
  });
  const verifyAfterData = (await verifyAfterApprovalRes.json()) as any;
  assert(
    verifyAfterData.data?.canCheckIn === true && verifyAfterData.data?.status === 'APPROVED',
    'Phase 4 - Gate Security Desk',
    'Step 6: Gate verification confirms APPROVED pass is valid and ready for check-in'
  );

  // Step 7: Security confirms visitor gate check-in
  const checkInRes = await fetch(`${API_URL}/security/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${securityToken}`,
    },
    body: JSON.stringify({ token: qrToken }),
  });
  const checkInData = (await checkInRes.json()) as any;
  assert(
    checkInRes.ok && checkInData.data?.status === 'CHECKED_IN' && Boolean(checkInData.data?.checkInTime),
    'Phase 4 - Check-In Execution',
    'Step 7: Security confirmed gate entry (status: CHECKED_IN, checkInTime recorded)',
    `Status: ${checkInRes.status}, Body: ${JSON.stringify(checkInData)}`
  );

  // Step 8: Duplicate check-in attempt (must be REJECTED with 400)
  const duplicateCheckInRes = await fetch(`${API_URL}/security/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${securityToken}`,
    },
    body: JSON.stringify({ token: qrToken }),
  });
  const duplicateData = (await duplicateCheckInRes.json().catch(() => ({}))) as any;
  assert(
    duplicateCheckInRes.status === 400,
    'Phase 4 - Anti-Passback',
    'Step 8: Duplicate gate check-in rejected with 400 ALREADY_CHECKED_IN',
    `Status: ${duplicateCheckInRes.status}, Body: ${JSON.stringify(duplicateData)}`
  );

  // Step 9: Security confirms visitor check-out
  const checkOutRes = await fetch(`${API_URL}/security/check-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${securityToken}`,
    },
    body: JSON.stringify({ token: qrToken }),
  });
  const checkOutData = (await checkOutRes.json()) as any;
  assert(
    checkOutRes.ok && checkOutData.data?.status === 'CHECKED_OUT' && Boolean(checkOutData.data?.checkOutTime),
    'Phase 4 - Check-Out Execution',
    'Step 9: Security confirmed gate exit (status: CHECKED_OUT, checkOutTime recorded)'
  );

  // Step 10: Re-entry using completed pass (must be REJECTED with 400)
  const reEntryRes = await fetch(`${API_URL}/security/check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${securityToken}`,
    },
    body: JSON.stringify({ token: qrToken }),
  });
  assert(
    reEntryRes.status === 400,
    'Phase 4 - Pass Revocation',
    'Step 10: Re-entry attempt using completed/checked-out pass strictly rejected'
  );

  // --------------------------------------------------------------------------
  // PHASE 5: Operational Workflows (Kitchen, Housekeeping, Security Walk-in)
  // --------------------------------------------------------------------------
  console.log('\n--- PHASE 5: Operational Staff Workflows ---');

  // Test 5.1: Cook Dashboard retrieval
  const cookDashboardRes = await fetch(`${API_URL}/kitchen/dashboard`, {
    headers: { Authorization: `Bearer ${authTokens['COOK']}` },
  });
  assert(
    cookDashboardRes.ok,
    'Phase 5 - Cook Workflow',
    'Chef / Cook successfully fetched kitchen operations dashboard'
  );

  // Test 5.2: Housekeeping task creation & status transition
  const housekeepingToken = authTokens['HOUSEKEEPING'];
  const createTaskRes = await fetch(`${API_URL}/housekeeping/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${housekeepingToken}`,
    },
    body: JSON.stringify({
      targetName: 'Audit Deep Clean Room 101',
      area: 'ROOM',
      scheduledAt: new Date().toISOString(),
      notes: 'Automated platform audit verification task',
    }),
  });
  const taskData = (await createTaskRes.json()) as any;
  assert(
    createTaskRes.ok && taskData.data?.status === 'PENDING',
    'Phase 5 - Housekeeping Workflow',
    'Housekeeping task scheduled successfully (status: PENDING)'
  );

  if (taskData.data?.id) {
    const updateTaskRes = await fetch(`${API_URL}/housekeeping/tasks/${taskData.data.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${housekeepingToken}`,
      },
      body: JSON.stringify({ status: 'COMPLETED', notes: 'Inspection verified clean' }),
    });
    const updatedData = (await updateTaskRes.json()) as any;
    assert(
      updateTaskRes.ok && updatedData.data?.status === 'COMPLETED',
      'Phase 5 - Housekeeping Workflow',
      'Housekeeping task transition to COMPLETED verified'
    );
  }

  // Test 5.3: Security direct gate walk-in registration
  const walkInRes = await fetch(`${API_URL}/security/direct-entry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${securityToken}`,
    },
    body: JSON.stringify({
      visitorName: 'Swiggy Delivery Partner',
      visitorMobile: '9988112233',
      purpose: 'Food Delivery',
      expectedExitTime: '06:30 PM',
    }),
  });
  const walkInData = (await walkInRes.json()) as any;
  assert(
    walkInRes.ok && walkInData.data?.status === 'CHECKED_IN',
    'Phase 5 - Security Desk',
    'Security direct walk-in/delivery entry registered and checked in at gate'
  );

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n=============================================================================');
  console.log(`  AUDIT SUITE EXECUTION COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('=============================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveAudit()
  .catch((err) => {
    console.error('Audit execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
