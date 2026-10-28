import http from 'http';
import app from '../index';
import { prisma } from '../config/prisma';

interface TestStep {
  name: string;
  passed: boolean;
  message: string;
}

const steps: TestStep[] = [];

function assertStep(name: string, condition: boolean, message: string) {
  steps.push({ name, passed: condition, message });
  const icon = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: [${name}] - ${message}`);
  if (!condition) {
    console.error(`   Error details: ${message}`);
  }
}

async function runWorkflowAudit() {
  console.log('\n================================================================');
  console.log('  URBAN NEST — RESIDENT QR & VISITOR APPROVAL WORKFLOW AUDIT    ');
  console.log('================================================================\n');

  const PORT = 5098;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  const BASE_URL = `http://127.0.0.1:${PORT}/api`;

  try {
    // -------------------------------------------------------------
    // SETUP: LOGIN ACCOUNTS
    // -------------------------------------------------------------
    console.log('--- Step 0: Authentication of Test Personas ---');
    
    // 1. Resident (Aakash)
    const resLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aakash.v@gmail.com', password: 'admin123' })
    });
    const resAuth = await resLogin.json();
    const residentToken = resAuth.data?.token;
    assertStep('Auth: Resident', !!residentToken, `Resident token obtained (${resAuth.data?.user?.email})`);

    // 2. Security Guard
    const guardLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'guard@pg.com', password: 'admin123' })
    });
    const guardAuth = await guardLogin.json();
    const guardToken = guardAuth.data?.token;
    assertStep('Auth: Security Guard', !!guardToken, `Guard token obtained (${guardAuth.data?.user?.email})`);

    // 3. Property Owner
    const ownerLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@pg.com', password: 'admin123' })
    });
    const ownerAuth = await ownerLogin.json();
    const ownerToken = ownerAuth.data?.token;
    assertStep('Auth: Property Owner', !!ownerToken, `Owner token obtained (${ownerAuth.data?.user?.email})`);

    // 4. Foreign Owner (Tenant 2)
    const foreignLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'foreign.owner@pgtest.com', password: 'password123' })
    });
    const foreignAuth = await foreignLogin.json();
    const foreignOwnerToken = foreignAuth.data?.token;
    assertStep('Auth: Foreign Owner', !!foreignOwnerToken, `Foreign Owner token obtained`);

    // -------------------------------------------------------------
    // WORKFLOW 1: ACTIVE RESIDENT PERSONAL QR PASS
    // -------------------------------------------------------------
    console.log('\n--- Workflow 1: Resident Personal QR Pass ---');
    const qrPassRes = await fetch(`${BASE_URL}/resident/qr-pass`, {
      headers: { Authorization: `Bearer ${residentToken}` }
    });
    const qrPassData = await qrPassRes.json();

    assertStep(
      'Resident QR: Active Allocation Check',
      qrPassRes.status === 200 && qrPassData.data?.hasActiveAllocation === true,
      `hasActiveAllocation: ${qrPassData.data?.hasActiveAllocation}, Room: ${qrPassData.data?.roomNumber}, Bed: ${qrPassData.data?.bedNumber}`
    );

    assertStep(
      'Resident QR: Distinct Token Format (RQRPASS-)',
      qrPassData.data?.type === 'RESIDENT' && qrPassData.data?.token.startsWith('RQRPASS-'),
      `Token: ${qrPassData.data?.token}`
    );

    const residentPassToken = qrPassData.data?.token;

    // -------------------------------------------------------------
    // WORKFLOW 2: RESIDENT WITHOUT ACTIVE ALLOCATION
    // -------------------------------------------------------------
    console.log('\n--- Workflow 2: Resident Without Active Allocation ---');
    // Temporarily unassign bed for testing
    const aakashResident = await prisma.resident.findFirst({
      where: { email: 'aakash.v@gmail.com' }
    });
    const originalBedId = aakashResident?.bedId;

    if (aakashResident && originalBedId) {
      await prisma.resident.update({
        where: { id: aakashResident.id },
        data: { bedId: null }
      });

      const unallocatedRes = await fetch(`${BASE_URL}/resident/qr-pass`, {
        headers: { Authorization: `Bearer ${residentToken}` }
      });
      const unallocatedData = await unallocatedRes.json();

      assertStep(
        'Resident QR: Inactive Allocation Denial',
        unallocatedData.data?.hasActiveAllocation === false && !unallocatedData.data?.token,
        `Pass denied cleanly: "${unallocatedData.data?.message}"`
      );

      // Restore bed allocation
      await prisma.resident.update({
        where: { id: aakashResident.id },
        data: { bedId: originalBedId }
      });
    }

    // -------------------------------------------------------------
    // WORKFLOW 3: RESIDENT CREATES VISITOR REQUEST (PENDING)
    // -------------------------------------------------------------
    console.log('\n--- Workflow 3: Visitor Request Lifecycle ---');
    const createVisitorRes = await fetch(`${BASE_URL}/resident/visitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentToken}`
      },
      body: JSON.stringify({
        visitorName: 'Rohan Deshmukh',
        visitorMobile: '9820098200',
        relation: 'Colleague',
        purpose: 'Work discussion & project review',
        visitDate: new Date().toISOString(),
        expectedEntryTime: '05:00 PM',
        expectedExitTime: '09:00 PM'
      })
    });
    const createVisitorData = await createVisitorRes.json();
    const visitorRecord = createVisitorData.data;

    assertStep(
      'Visitor: Creation with PENDING status',
      createVisitorRes.status === 201 && visitorRecord?.status === 'PENDING',
      `Created Visitor ID: ${visitorRecord?.id}, Status: ${visitorRecord?.status}`
    );

    assertStep(
      'Visitor: Distinct Token Format (VPASS-)',
      visitorRecord?.qrPassToken.startsWith('VPASS-'),
      `Visitor Token: ${visitorRecord?.qrPassToken}`
    );

    const visitorToken = visitorRecord?.qrPassToken;
    const visitorId = visitorRecord?.id;

    // -------------------------------------------------------------
    // WORKFLOW 4: SECURITY SCANS VISITOR PASS (PENDING)
    // -------------------------------------------------------------
    console.log('\n--- Workflow 4: Security Gate Scan of PENDING Pass ---');
    const guardScanPendingRes = await fetch(`${BASE_URL}/security/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`
      },
      body: JSON.stringify({ token: visitorToken })
    });
    const guardScanPendingData = await guardScanPendingRes.json();

    assertStep(
      'Security: Detect PENDING status and prevent check-in',
      guardScanPendingData.data?.status === 'PENDING' &&
      guardScanPendingData.data?.canCheckIn === false &&
      guardScanPendingData.data?.valid === false,
      `Guard preview: ${guardScanPendingData.data?.message}`
    );

    // -------------------------------------------------------------
    // WORKFLOW 5: PREMATURE CHECK-IN STRICTLY BLOCKED
    // -------------------------------------------------------------
    console.log('\n--- Workflow 5: Premature Check-in Prevention ---');
    const prematureCheckInRes = await fetch(`${BASE_URL}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`
      },
      body: JSON.stringify({ token: visitorToken })
    });
    const prematureCheckInData = await prematureCheckInRes.json();

    assertStep(
      'Security: Block Check-in for PENDING Visitor',
      prematureCheckInRes.status === 400 && prematureCheckInData.success === false,
      `Blocked with 400: "${prematureCheckInData.error || prematureCheckInData.message}"`
    );

    // -------------------------------------------------------------
    // WORKFLOW 6: RESIDENT PASS SCAN AT SECURITY GATE
    // -------------------------------------------------------------
    console.log('\n--- Workflow 6: Resident Gate Verification ---');
    const guardScanResidentRes = await fetch(`${BASE_URL}/security/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`
      },
      body: JSON.stringify({ token: residentPassToken })
    });
    const guardScanResidentData = await guardScanResidentRes.json();

    assertStep(
      'Security: Resident Pass Verification (Active Resident)',
      guardScanResidentData.data?.type === 'RESIDENT' &&
      guardScanResidentData.data?.valid === true &&
      guardScanResidentData.data?.status === 'ACTIVE',
      `Resident gate verified: Room ${guardScanResidentData.data?.resident?.roomNumber}, Bed ${guardScanResidentData.data?.resident?.bedNumber}`
    );

    const residentVisitorCheckInRes = await fetch(`${BASE_URL}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`
      },
      body: JSON.stringify({ token: residentPassToken })
    });
    assertStep(
      'Security: Block Resident Pass from Visitor Check-In',
      residentVisitorCheckInRes.status === 400,
      `Resident token rejected from visitor check-in endpoint with 400`
    );

    // -------------------------------------------------------------
    // WORKFLOW 7: OWNER APPROVES VISITOR REQUEST
    // -------------------------------------------------------------
    console.log('\n--- Workflow 7: Owner/Manager Approval ---');
    const approveRes = await fetch(`${BASE_URL}/owner/visitors/${visitorId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      }
    });
    const approveData = await approveRes.json();

    assertStep(
      'Owner: Approve Visitor Request',
      approveRes.status === 200 && approveData.data?.status === 'APPROVED',
      `Status updated to APPROVED by ${approveData.data?.approvedBy}`
    );

    // Duplicate approval test
    const duplicateApproveRes = await fetch(`${BASE_URL}/owner/visitors/${visitorId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`
      }
    });
    assertStep(
      'Owner: Prevent Duplicate Approvals',
      duplicateApproveRes.status === 400,
      `Duplicate approval attempt rejected cleanly`
    );

    // -------------------------------------------------------------
    // WORKFLOW 8: SECURITY CHECKS IN APPROVED VISITOR
    // -------------------------------------------------------------
    console.log('\n--- Workflow 8: Gate Check-In & Departure ---');
    const guardScanApprovedRes = await fetch(`${BASE_URL}/security/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`
      },
      body: JSON.stringify({ token: visitorToken })
    });
    const guardScanApprovedData = await guardScanApprovedRes.json();

    assertStep(
      'Security: Scan recognizes APPROVED pass',
      guardScanApprovedData.data?.status === 'APPROVED' &&
      guardScanApprovedData.data?.canCheckIn === true &&
      guardScanApprovedData.data?.valid === true,
      `canCheckIn: true, message: "${guardScanApprovedData.data?.message}"`
    );

    // Confirm check in
    const checkInRes = await fetch(`${BASE_URL}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`
      },
      body: JSON.stringify({ token: visitorToken })
    });
    const checkInData = await checkInRes.json();

    assertStep(
      'Security: Check-in Execution',
      checkInRes.status === 200 && checkInData.data?.status === 'CHECKED_IN',
      `Visitor status updated to CHECKED_IN. Entry time logged.`
    );

    // Duplicate check-in attempt
    const duplicateCheckInRes = await fetch(`${BASE_URL}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`
      },
      body: JSON.stringify({ token: visitorToken })
    });
    assertStep(
      'Security: Anti-Passback / Prevent Duplicate Check-In',
      duplicateCheckInRes.status === 400,
      `Duplicate check-in rejected: ALREADY_CHECKED_IN`
    );

    // Check Out
    const checkOutRes = await fetch(`${BASE_URL}/security/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`
      },
      body: JSON.stringify({ visitorId })
    });
    const checkOutData = await checkOutRes.json();

    assertStep(
      'Security: Check-out Execution',
      checkOutRes.status === 200 && checkOutData.data?.status === 'CHECKED_OUT',
      `Visitor status updated to CHECKED_OUT. Departure logged.`
    );

    // Re-use check
    const reuseCheckInRes = await fetch(`${BASE_URL}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`
      },
      body: JSON.stringify({ token: visitorToken })
    });
    assertStep(
      'Security: Prevent Reuse of Checked-Out Pass',
      reuseCheckInRes.status === 400,
      `Pass reuse rejected with 400: ALREADY_CHECKED_OUT`
    );

    // -------------------------------------------------------------
    // WORKFLOW 9: TENANT ISOLATION ON PASS ACCESS
    // -------------------------------------------------------------
    console.log('\n--- Workflow 9: Strict Multi-Tenant Isolation ---');
    const foreignApproveRes = await fetch(`${BASE_URL}/owner/visitors/${visitorId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${foreignOwnerToken}`
      }
    });
    assertStep(
      'Tenant Isolation: Foreign Owner Denied Access',
      foreignApproveRes.status === 403,
      `Foreign tenant access denied with 403`
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    assertStep('Suite Execution', false, err.message);
  } finally {
    server.close();
    await prisma.$disconnect();

    const passedCount = steps.filter((s) => s.passed).length;
    const totalCount = steps.length;
    console.log('\n================================================================');
    console.log(`  AUDIT SUMMARY: ${passedCount}/${totalCount} TEST STEPS PASSED`);
    console.log('================================================================\n');

    if (passedCount === totalCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

runWorkflowAudit();
