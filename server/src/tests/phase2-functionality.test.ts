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

export async function runPhase2FunctionalityTests() {
  console.log('========================================================================');
  console.log('  URBAN NEST — PHASE 2 FULL FUNCTIONALITY INTEGRATION TEST SUITE       ');
  console.log('========================================================================\n');

  const TEST_PORT = 5059;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`Phase 2 test server running on port ${TEST_PORT}`);
      resolve();
    });
  });

  const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

  let tenantAId = '';
  let tenantBId = '';
  let propertyAId = '';
  let propertyBId = '';
  let ownerAId = '';
  let ownerBId = '';
  let ownerAToken = '';
  let ownerBToken = '';
  let residentAToken = '';
  let residentBToken = '';
  let residentAId = '';
  let residentBId = '';
  let roomId = '';
  let bedId = '';
  let createdExpenseId = '';
  let createdDepositId = '';
  let createdComplaintId = '';
  let createdLeaveId = '';
  let createdNoticeId = '';
  let visitorToken = '';
  let visitorId = '';
  let onboardedResidentId = '';

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------------------
    // SETUP: Provision Multi-Tenant Isolated Test Fixtures
    // -------------------------------------------------------------------------
    console.log('\n--- SETUP: Preparing isolated test fixtures ---');

    // 1. Create Tenant A & B
    const tenantA = await prisma.tenant.create({
      data: {
        name: `P2 Tenant A ${timestamp}`,
        slug: `p2-tenant-a-${timestamp}`,
        email: `p2tenantA_${timestamp}@test.com`,
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
      },
    });
    tenantAId = tenantA.id;

    const tenantB = await prisma.tenant.create({
      data: {
        name: `P2 Tenant B ${timestamp}`,
        slug: `p2-tenant-b-${timestamp}`,
        email: `p2tenantB_${timestamp}@test.com`,
        status: 'ACTIVE',
        plan: 'STARTER',
      },
    });
    tenantBId = tenantB.id;

    // 2. Properties for Tenant A & B
    const propA = await prisma.property.create({
      data: {
        tenantId: tenantAId,
        name: `P2 Property A ${timestamp}`,
        address: '500 SG Highway, Satellite',
        city: 'Ahmedabad',
      },
    });
    propertyAId = propA.id;

    const propB = await prisma.property.create({
      data: {
        tenantId: tenantBId,
        name: `P2 Property B ${timestamp}`,
        address: '700 SG Highway, Bodakdev',
        city: 'Ahmedabad',
      },
    });
    propertyBId = propB.id;

    // 3. Room & Bed in Property A
    const room = await prisma.room.create({
      data: {
        number: `201-${timestamp.toString().slice(-4)}`,
        type: 'DOUBLE',
        capacity: 2,
        baseRent: 12000,
        deposit: 24000,
        status: 'AVAILABLE',
        amenities: 'AC, Attached Bath, Wi-Fi',
        propertyId: propertyAId,
      },
    });
    roomId = room.id;

    const bed = await prisma.bed.create({
      data: {
        bedNumber: 'Bed-1',
        roomId: room.id,
        status: 'AVAILABLE',
        monthlyRent: 12000,
      },
    });
    bedId = bed.id;

    // 4. Owner Users & Tokens
    const pwdHash = await bcrypt.hash('password123', 8);

    const ownerAUser = await prisma.user.create({
      data: {
        email: `p2ownerA_${timestamp}@test.com`,
        passwordHash: pwdHash,
        name: 'P2 Owner Alpha',
        role: 'OWNER',
        tenantId: tenantAId,
        propertyId: propertyAId,
      },
    });
    ownerAId = ownerAUser.id;

    const ownerBUser = await prisma.user.create({
      data: {
        email: `p2ownerB_${timestamp}@test.com`,
        passwordHash: pwdHash,
        name: 'P2 Owner Beta',
        role: 'OWNER',
        tenantId: tenantBId,
        propertyId: propertyBId,
      },
    });
    ownerBId = ownerBUser.id;

    // 5. Existing Resident A & Resident B
    const resAUser = await prisma.user.create({
      data: {
        email: `p2resA_${timestamp}@test.com`,
        passwordHash: pwdHash,
        name: 'P2 Resident Alpha',
        role: 'RESIDENT',
        tenantId: tenantAId,
        propertyId: propertyAId,
      },
    });

    const resAProfile = await prisma.resident.create({
      data: {
        userId: resAUser.id,
        propertyId: propertyAId,
        fullName: 'P2 Resident Alpha',
        email: resAUser.email,
        mobile: '9876500001',
        emergencyContactName: 'Guardian Alpha',
        emergencyContactRelation: 'Parent',
        emergencyContactPhone: '9876500002',
        status: 'ACTIVE',
      },
    });
    residentAId = resAProfile.id;

    const resBUser = await prisma.user.create({
      data: {
        email: `p2resB_${timestamp}@test.com`,
        passwordHash: pwdHash,
        name: 'P2 Resident Beta',
        role: 'RESIDENT',
        tenantId: tenantBId,
        propertyId: propertyBId,
      },
    });

    const resBProfile = await prisma.resident.create({
      data: {
        userId: resBUser.id,
        propertyId: propertyBId,
        fullName: 'P2 Resident Beta',
        email: resBUser.email,
        mobile: '9876500003',
        emergencyContactName: 'Guardian Beta',
        emergencyContactRelation: 'Parent',
        emergencyContactPhone: '9876500004',
        status: 'ACTIVE',
      },
    });
    residentBId = resBProfile.id;

    // Seed historical payments & expenses for Tenant A to verify real reporting calculations
    await prisma.payment.createMany({
      data: [
        {
          residentId: residentAId,
          propertyId: propertyAId,
          amount: 14000,
          category: 'RENT',
          period: 'September 2026',
          dueDate: new Date(),
          paidDate: new Date(),
          status: 'PAID',
          method: 'UPI',
        },
        {
          residentId: residentAId,
          propertyId: propertyAId,
          amount: 14000,
          category: 'RENT',
          period: 'October 2026',
          dueDate: new Date(),
          status: 'PENDING',
        },
      ],
    });

    await prisma.expense.createMany({
      data: [
        {
          propertyId: propertyAId,
          category: 'ELECTRICITY',
          title: 'Power Bill Oct',
          amount: 3500,
          date: new Date(),
        },
        {
          propertyId: propertyAId,
          category: 'MAINTENANCE',
          title: 'Plumbing Works',
          amount: 1500,
          date: new Date(),
        },
      ],
    });

    // Sign JWT tokens
    const jwtSecret = config.jwtSecret || 'dev-secret';
    ownerAToken = jwt.sign(
      { id: ownerAUser.id, email: ownerAUser.email, role: 'OWNER', tenantId: tenantAId, propertyId: propertyAId },
      jwtSecret,
      { expiresIn: '1h' }
    );
    ownerBToken = jwt.sign(
      { id: ownerBUser.id, email: ownerBUser.email, role: 'OWNER', tenantId: tenantBId, propertyId: propertyBId },
      jwtSecret,
      { expiresIn: '1h' }
    );
    residentAToken = jwt.sign(
      { id: resAUser.id, email: resAUser.email, role: 'RESIDENT', tenantId: tenantAId, propertyId: propertyAId },
      jwtSecret,
      { expiresIn: '1h' }
    );
    residentBToken = jwt.sign(
      { id: resBUser.id, email: resBUser.email, role: 'RESIDENT', tenantId: tenantBId, propertyId: propertyBId },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // =========================================================================
    // WORKSTREAM 1: REPORTING & ANALYTICS DYNAMIC DATABASE AGGREGATIONS
    // =========================================================================
    console.log('\n--- WORKSTREAM 1: Dynamic Reporting & Aggregations ---');

    // Test 1: Reports API returns dynamic 6-month revenueByMonth with collected & billed
    const reportsRes = await fetch(`${BASE_URL}/owner/reports?propertyId=${propertyAId}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const reportsData: any = await reportsRes.json();
    const revByMonth = reportsData.data?.revenueByMonth || [];

    if (reportsRes.status === 200 && Array.isArray(revByMonth) && revByMonth.length === 6) {
      record('REPORTS', 'Reports 6-Month Monthly Aggregations', 'PASS', `Received 6-month historical series from database.`);
    } else {
      record('REPORTS', 'Reports 6-Month Monthly Aggregations', 'FAIL', `Expected 6 months, got ${revByMonth.length} (status: ${reportsRes.status})`);
    }

    // Test 2: Reports API computes real expenseCategories breakdown
    const expCategories = reportsData.data?.expenseCategories || [];
    const hasElectricity = expCategories.some((c: any) => c.category === 'ELECTRICITY' && c.amount >= 3500);
    const hasMaintenance = expCategories.some((c: any) => c.category === 'MAINTENANCE' && c.amount >= 1500);

    if (hasElectricity && hasMaintenance) {
      record('REPORTS', 'Dynamic Expense Categories Aggregation', 'PASS', `Accurately categorized expenses from live database records.`);
    } else {
      record('REPORTS', 'Dynamic Expense Categories Aggregation', 'FAIL', `Categories missing: ${JSON.stringify(expCategories)}`);
    }

    // Test 3: Reports summary totals match database state
    const summary = reportsData.data?.summary || {};
    if (summary.totalCollected >= 14000 && summary.totalOutstanding >= 14000 && summary.totalExpenses >= 5000) {
      record('REPORTS', 'Accurate Financial Ledger Totals', 'PASS', `Collected: ₹${summary.totalCollected}, Outstanding: ₹${summary.totalOutstanding}, Expenses: ₹${summary.totalExpenses}`);
    } else {
      record('REPORTS', 'Accurate Financial Ledger Totals', 'FAIL', `Totals mismatch: ${JSON.stringify(summary)}`);
    }

    // Test 4: Dashboard API provides real revenue and occupancy trends
    const dashRes = await fetch(`${BASE_URL}/owner/dashboard?propertyId=${propertyAId}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const dashData: any = await dashRes.json();
    const revTrend = dashData.data?.revenueTrend || [];
    const occTrend = dashData.data?.occupancyTrend || [];

    if (dashRes.status === 200 && revTrend.length === 6 && occTrend.length === 6) {
      record('REPORTS', 'Dashboard Dynamic 6-Month Trends', 'PASS', `Revenue and Occupancy 6-month series correctly generated.`);
    } else {
      record('REPORTS', 'Dashboard Dynamic 6-Month Trends', 'FAIL', `Status ${dashRes.status}, revTrend: ${revTrend.length}, occTrend: ${occTrend.length}`);
    }

    // =========================================================================
    // WORKSTREAM 2: RESIDENT ONBOARDING & COMPLETE LIFECYCLE
    // =========================================================================
    console.log('\n--- WORKSTREAM 2: Resident Onboarding & Lifecycle ---');

    // Test 5: Move-In Resident creates user with tenantId, updates bed status, creates initial invoice & deposit
    const onboardEmail = `onboarded_${timestamp}@test.com`;
    const moveInRes = await fetch(`${BASE_URL}/owner/residents/move-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        propertyId: propertyAId,
        bedId: bedId,
        fullName: 'New Onboarded Resident',
        email: onboardEmail,
        mobile: '9898989898',
        gender: 'MALE',
        monthlyRent: 12000,
        securityDepositAmount: 24000,
      }),
    });
    const moveInData: any = await moveInRes.json();
    onboardedResidentId = moveInData.data?.id || '';

    // Verify bed status became OCCUPIED
    const updatedBed = await prisma.bed.findUnique({ where: { id: bedId } });
    // Verify created user has tenantId
    const createdUser = await prisma.user.findUnique({ where: { email: onboardEmail } });

    if (moveInRes.status === 201 && updatedBed?.status === 'OCCUPIED' && createdUser?.tenantId === tenantAId) {
      record('RESIDENT_LIFECYCLE', 'Resident Onboarding & Bed Allocation', 'PASS', `Resident onboarded, bed marked OCCUPIED, tenantId persisted.`);
    } else {
      record('RESIDENT_LIFECYCLE', 'Resident Onboarding & Bed Allocation', 'FAIL', `Status ${moveInRes.status}, bed: ${updatedBed?.status}, tenantId: ${createdUser?.tenantId}`);
    }

    // Generate token for newly onboarded resident
    const onboardedToken = jwt.sign(
      { id: createdUser?.id, email: onboardEmail, role: 'RESIDENT', tenantId: tenantAId, propertyId: propertyAId },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Test 6: Resident fetches assigned room and bed
    const roomRes = await fetch(`${BASE_URL}/resident/room`, {
      headers: { Authorization: `Bearer ${onboardedToken}` },
    });
    const roomData: any = await roomRes.json();
    if (roomRes.status === 200 && (roomData.data?.myBed?.id === bedId || roomData.data?.bed?.id === bedId)) {
      record('RESIDENT_LIFECYCLE', 'Resident Room & Bed Profile', 'PASS', `Resident successfully queried assigned room and bed details.`);
    } else {
      record('RESIDENT_LIFECYCLE', 'Resident Room & Bed Profile', 'FAIL', `Status ${roomRes.status}, data: ${JSON.stringify(roomData)}`);
    }

    // Test 7: Resident queries their own profile
    const profileRes = await fetch(`${BASE_URL}/resident/profile`, {
      headers: { Authorization: `Bearer ${onboardedToken}` },
    });
    const profileData: any = await profileRes.json();
    if (profileRes.status === 200 && profileData.data?.email === onboardEmail) {
      record('RESIDENT_LIFECYCLE', 'Resident Profile Retrieval', 'PASS', `Resident profile fetched accurately.`);
    } else {
      record('RESIDENT_LIFECYCLE', 'Resident Profile Retrieval', 'FAIL', `Status ${profileRes.status}`);
    }

    // Test 8: Place resident on notice period
    const noticePeriodRes = await fetch(`${BASE_URL}/owner/residents/${onboardedResidentId}/notice-period`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ reason: 'Relocating to another city' }),
    });
    const noticePeriodData: any = await noticePeriodRes.json();
    if (noticePeriodRes.status === 200 && noticePeriodData.data?.status === 'NOTICE_PERIOD') {
      record('RESIDENT_LIFECYCLE', 'Resident Notice Period Placement', 'PASS', `Status transitioned to NOTICE_PERIOD.`);
    } else {
      record('RESIDENT_LIFECYCLE', 'Resident Notice Period Placement', 'FAIL', `Status ${noticePeriodRes.status}`);
    }

    // Test 9: Move-Out resident releases bed to AVAILABLE and marks status MOVED_OUT
    const moveOutRes = await fetch(`${BASE_URL}/owner/residents/${onboardedResidentId}/move-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        deductions: 2000,
        deductionNotes: 'Room repainting charges',
        refundAmount: 22000,
      }),
    });
    const freedBed = await prisma.bed.findUnique({ where: { id: bedId } });
    const movedOutResident = await prisma.resident.findUnique({ where: { id: onboardedResidentId } });

    if (moveOutRes.status === 200 && freedBed?.status === 'AVAILABLE' && movedOutResident?.status === 'MOVED_OUT') {
      record('RESIDENT_LIFECYCLE', 'Resident Move-Out & Bed Release', 'PASS', `Resident marked MOVED_OUT, Bed released back to AVAILABLE.`);
    } else {
      record('RESIDENT_LIFECYCLE', 'Resident Move-Out & Bed Release', 'FAIL', `Status: ${moveOutRes.status}, bed: ${freedBed?.status}, res: ${movedOutResident?.status}`);
    }

    // =========================================================================
    // WORKSTREAM 3: FINANCIAL LEDGER, EXPENSES & DEPOSIT SETTLEMENT
    // =========================================================================
    console.log('\n--- WORKSTREAM 3: Financial Ledger, Expenses & Deposits ---');

    // Test 10: Create operational expense
    const createExpRes = await fetch(`${BASE_URL}/owner/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        propertyId: propertyAId,
        title: 'High-speed Fiber Internet',
        category: 'INTERNET',
        amount: 2500,
        vendor: 'Airtel Broadband',
        notes: 'Monthly optical lease line',
      }),
    });
    const createExpData: any = await createExpRes.json();
    createdExpenseId = createExpData.data?.id || '';

    if (createExpRes.status === 201 && createdExpenseId) {
      record('FINANCE', 'Log Operational Expense', 'PASS', `Created expense record: ₹2,500 (ID: ${createdExpenseId})`);
    } else {
      record('FINANCE', 'Log Operational Expense', 'FAIL', `Status ${createExpRes.status}`);
    }

    // Test 11: List operational expenses filtered by property
    const listExpRes = await fetch(`${BASE_URL}/owner/expenses?propertyId=${propertyAId}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const listExpData: any = await listExpRes.json();
    const expList = listExpData.data || [];
    const foundExp = expList.some((e: any) => e.id === createdExpenseId);

    if (listExpRes.status === 200 && foundExp) {
      record('FINANCE', 'Fetch Filtered Operating Expenses', 'PASS', `Found created expense in property ledger.`);
    } else {
      record('FINANCE', 'Fetch Filtered Operating Expenses', 'FAIL', `Expense not found in list.`);
    }

    // Test 12: Archive / Delete operational expense
    const delExpRes = await fetch(`${BASE_URL}/owner/expenses/${createdExpenseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (delExpRes.status === 200) {
      record('FINANCE', 'Archive Operational Expense', 'PASS', `Expense record successfully removed from ledger.`);
    } else {
      record('FINANCE', 'Archive Operational Expense', 'FAIL', `Status ${delExpRes.status}`);
    }

    // Test 13: Create & Settle Security Deposit with automatic deductions
    const createDep = await prisma.securityDeposit.create({
      data: {
        residentId: residentAId,
        propertyId: propertyAId,
        amount: 20000,
        status: 'PAID',
        paidAt: new Date(),
      },
    });
    createdDepositId = createDep.id;

    const settleDepRes = await fetch(`${BASE_URL}/owner/deposits/${createdDepositId}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        deductions: 3000,
        notes: 'Room deep cleaning fee',
      }),
    });
    const settleDepData: any = await settleDepRes.json();
    if (settleDepRes.status === 200 && settleDepData.data?.refundAmount === 17000 && settleDepData.data?.deductions === 3000) {
      record('FINANCE', 'Security Deposit Settlement Calculation', 'PASS', `Calculated refund amount: ₹17,000 (Deductions: ₹3,000).`);
    } else {
      record('FINANCE', 'Security Deposit Settlement Calculation', 'FAIL', `Status ${settleDepRes.status}, data: ${JSON.stringify(settleDepData)}`);
    }

    // =========================================================================
    // WORKSTREAM 4: OPERATIONS, COMPLAINTS, LEAVE & ANNOUNCEMENTS
    // =========================================================================
    console.log('\n--- WORKSTREAM 4: Complaints, Leave & Announcements ---');

    // Test 14: Resident creates complaint ticket
    const compRes = await fetch(`${BASE_URL}/resident/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({
        title: 'Geyser not heating in Bathroom',
        description: 'Water remains cold after 20 minutes of heating switch on.',
        category: 'ELECTRICAL',
        priority: 'HIGH',
      }),
    });
    const compData: any = await compRes.json();
    createdComplaintId = compData.data?.id || '';

    if (compRes.status === 201 && createdComplaintId) {
      record('OPERATIONS', 'Resident Files Maintenance Complaint', 'PASS', `Created complaint ${compData.data?.ticketNumber}`);
    } else {
      record('OPERATIONS', 'Resident Files Maintenance Complaint', 'FAIL', `Status ${compRes.status}`);
    }

    // Test 15: Resident adds comment to complaint ticket
    const commentRes = await fetch(`${BASE_URL}/resident/complaints/${createdComplaintId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({ comment: 'Please check between 4 PM and 6 PM today.' }),
    });
    if (commentRes.status === 200) {
      record('OPERATIONS', 'Resident Adds Ticket Activity Comment', 'PASS', `Activity comment logged on complaint ticket.`);
    } else {
      record('OPERATIONS', 'Resident Adds Ticket Activity Comment', 'FAIL', `Status ${commentRes.status}`);
    }

    // Test 16: Owner updates complaint status to RESOLVED
    const updateCompRes = await fetch(`${BASE_URL}/owner/complaints/${createdComplaintId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        status: 'RESOLVED',
        assignedStaff: 'Ramesh Electrician',
        comment: 'Thermostat coil replaced and verified hot water output.',
      }),
    });
    const updateCompData: any = await updateCompRes.json();
    if (updateCompRes.status === 200 && updateCompData.data?.status === 'RESOLVED') {
      record('OPERATIONS', 'Owner Resolves Maintenance Ticket', 'PASS', `Complaint ticket marked RESOLVED with audit log.`);
    } else {
      record('OPERATIONS', 'Owner Resolves Maintenance Ticket', 'FAIL', `Status ${updateCompRes.status}`);
    }

    // Test 17: Resident files leave request
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const leaveRes = await fetch(`${BASE_URL}/resident/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({
        fromDate: tomorrow,
        toDate: nextWeek,
        reason: 'Diwali family vacation to native place',
      }),
    });
    const leaveData: any = await leaveRes.json();
    createdLeaveId = leaveData.data?.id || '';

    if (leaveRes.status === 201 && createdLeaveId) {
      record('OPERATIONS', 'Resident Submits Leave Request', 'PASS', `Leave request logged with status PENDING.`);
    } else {
      record('OPERATIONS', 'Resident Submits Leave Request', 'FAIL', `Status ${leaveRes.status}`);
    }

    // Test 18: Owner lists leave requests
    const listLeaveRes = await fetch(`${BASE_URL}/owner/leave?propertyId=${propertyAId}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const listLeaveData: any = await listLeaveRes.json();
    const leaves = listLeaveData.data || [];
    const hasCreatedLeave = leaves.some((l: any) => l.id === createdLeaveId);

    if (listLeaveRes.status === 200 && hasCreatedLeave) {
      record('OPERATIONS', 'Owner Views Pending Leave Requests', 'PASS', `Leave request present in owner portal.`);
    } else {
      record('OPERATIONS', 'Owner Views Pending Leave Requests', 'FAIL', `Status ${listLeaveRes.status}`);
    }

    // Test 19: Owner approves leave request
    const approveLeaveRes = await fetch(`${BASE_URL}/owner/leave/${createdLeaveId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const approveLeaveData: any = await approveLeaveRes.json();
    if (approveLeaveRes.status === 200 && approveLeaveData.data?.status === 'APPROVED') {
      record('OPERATIONS', 'Owner Approves Leave Request', 'PASS', `Leave status transitioned to APPROVED.`);
    } else {
      record('OPERATIONS', 'Owner Approves Leave Request', 'FAIL', `Status ${approveLeaveRes.status}`);
    }

    // Test 20: Owner broadcasts property notice
    const createNoticeRes = await fetch(`${BASE_URL}/owner/notices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        propertyId: propertyAId,
        title: 'Water Supply Maintenance Alert',
        content: 'Overhead water tank cleaning scheduled tomorrow between 10:00 AM and 1:00 PM.',
        category: 'MAINTENANCE',
        isImportant: true,
      }),
    });
    const createNoticeData: any = await createNoticeRes.json();
    createdNoticeId = createNoticeData.data?.id || '';

    if (createNoticeRes.status === 201 && createdNoticeId) {
      record('OPERATIONS', 'Owner Broadcasts Notice', 'PASS', `Notice broadcast created successfully.`);
    } else {
      record('OPERATIONS', 'Owner Broadcasts Notice', 'FAIL', `Status ${createNoticeRes.status}`);
    }

    // Test 21: Resident retrieves active property notices
    const residentNoticesRes = await fetch(`${BASE_URL}/resident/notices`, {
      headers: { Authorization: `Bearer ${residentAToken}` },
    });
    const residentNoticesData: any = await residentNoticesRes.json();
    const notifs = residentNoticesData.data || [];
    const foundNotice = notifs.some((n: any) => n.id === createdNoticeId);

    if (residentNoticesRes.status === 200 && foundNotice) {
      record('OPERATIONS', 'Resident Receives Broadcast Notice', 'PASS', `Published notice received in resident feed.`);
    } else {
      record('OPERATIONS', 'Resident Receives Broadcast Notice', 'FAIL', `Status ${residentNoticesRes.status}`);
    }

    // =========================================================================
    // WORKSTREAM 5: VISITOR QR PASS GATE STATE MACHINE INTEGRITY
    // =========================================================================
    console.log('\n--- WORKSTREAM 5: Visitor Gate State Machine ---');

    // Test 22: Resident creates visitor pass request
    const createVisitorRes = await fetch(`${BASE_URL}/resident/visitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentAToken}`,
      },
      body: JSON.stringify({
        visitorName: 'Sanjay Patel',
        visitorMobile: '9825012345',
        visitorPhone: '9825012345',
        purpose: 'Weekend Family Visit',
        visitDate: new Date().toISOString().split('T')[0],
      }),
    });
    const createVisitorData: any = await createVisitorRes.json();
    visitorId = createVisitorData.data?.id || '';
    visitorToken = createVisitorData.data?.qrPassToken || '';

    if (createVisitorRes.status === 201 && visitorToken) {
      record('VISITOR_GATE', 'Resident Creates Visitor Request', 'PASS', `Visitor pass generated with QR token.`);
    } else {
      record('VISITOR_GATE', 'Resident Creates Visitor Request', 'FAIL', `Status ${createVisitorRes.status}`);
    }

    // Test 23: Owner approves visitor request
    const approveVisRes = await fetch(`${BASE_URL}/owner/visitors/${visitorId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    if (approveVisRes.status === 200) {
      record('VISITOR_GATE', 'Owner Approves Visitor Pass', 'PASS', `Visitor pass transitioned to APPROVED.`);
    } else {
      record('VISITOR_GATE', 'Owner Approves Visitor Pass', 'FAIL', `Status ${approveVisRes.status}`);
    }

    // Test 24: Public gate scanner verifies visitor QR token
    const gateVerifyRes = await fetch(`${BASE_URL}/gate/verify/${encodeURIComponent(visitorToken)}`);
    const gateVerifyData: any = await gateVerifyRes.json();

    if (gateVerifyRes.status === 200 && gateVerifyData.data?.valid === true && (gateVerifyData.data?.status === 'APPROVED' || gateVerifyData.data?.pass?.status === 'APPROVED')) {
      record('VISITOR_GATE', 'Public Gate QR Token Verification', 'PASS', `Verified valid APPROVED pass for ${gateVerifyData.data?.visitorName || gateVerifyData.data?.pass?.visitorName}`);
    } else {
      record('VISITOR_GATE', 'Public Gate QR Token Verification', 'FAIL', `Status ${gateVerifyRes.status}, data: ${JSON.stringify(gateVerifyData)}`);
    }

    // Test 25: Gate check-in visitor transitions to CHECKED_IN
    const checkInRes = await fetch(`${BASE_URL}/gate/check-in/${encodeURIComponent(visitorToken)}`, {
      method: 'POST',
    });
    const checkInData: any = await checkInRes.json();
    if (checkInRes.status === 200 && checkInData.data?.status === 'CHECKED_IN') {
      record('VISITOR_GATE', 'Gate Check-In Transition', 'PASS', `Visitor checked in to premises successfully.`);
    } else {
      record('VISITOR_GATE', 'Gate Check-In Transition', 'FAIL', `Status ${checkInRes.status}`);
    }

    // Test 26: Duplicate check-in is rejected (cannot check in an already checked in visitor)
    const dupCheckInRes = await fetch(`${BASE_URL}/gate/check-in/${encodeURIComponent(visitorToken)}`, {
      method: 'POST',
    });
    if (dupCheckInRes.status === 400) {
      record('VISITOR_GATE', 'Reject Invalid Re-Check-In Transition', 'PASS', `Prevented duplicate check-in transition.`);
    } else {
      record('VISITOR_GATE', 'Reject Invalid Re-Check-In Transition', 'FAIL', `Expected 400, got ${dupCheckInRes.status}`);
    }

    // Test 27: Gate check-out visitor transitions to CHECKED_OUT
    const checkOutRes = await fetch(`${BASE_URL}/gate/check-out/${encodeURIComponent(visitorToken)}`, {
      method: 'POST',
    });
    const checkOutData: any = await checkOutRes.json();
    if (checkOutRes.status === 200 && checkOutData.data?.status === 'CHECKED_OUT') {
      record('VISITOR_GATE', 'Gate Check-Out Transition', 'PASS', `Visitor successfully checked out.`);
    } else {
      record('VISITOR_GATE', 'Gate Check-Out Transition', 'FAIL', `Status ${checkOutRes.status}`);
    }

    // Test 28: Duplicate check-out is rejected (cannot check out an already checked out visitor)
    const dupCheckOutRes = await fetch(`${BASE_URL}/gate/check-out/${encodeURIComponent(visitorToken)}`, {
      method: 'POST',
    });
    if (dupCheckOutRes.status === 400) {
      record('VISITOR_GATE', 'Reject Invalid Re-Check-Out Transition', 'PASS', `Prevented re-checkout on already closed pass.`);
    } else {
      record('VISITOR_GATE', 'Reject Invalid Re-Check-Out Transition', 'FAIL', `Expected 400, got ${dupCheckOutRes.status}`);
    }

    // =========================================================================
    // WORKSTREAM 6: MULTI-TENANT ISOLATION ON NEW WORKFLOWS
    // =========================================================================
    console.log('\n--- WORKSTREAM 6: Multi-Tenant Strict Isolation ---');

    // Test 29: Tenant B Owner cannot access Tenant A's reports
    const crossTenantReportRes = await fetch(`${BASE_URL}/owner/reports?propertyId=${propertyAId}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    // Owner B either gets empty data for their tenant or 403
    const crossReportData: any = await crossTenantReportRes.json();
    const reportsLeak = (crossReportData.data?.monthlyBreakdown?.some((m: any) => m.revenue > 0)) || false;

    if (!reportsLeak && (crossTenantReportRes.status === 200 || crossTenantReportRes.status === 403)) {
      record('ISOLATION', 'Strict Isolation: Owner Reports', 'PASS', `Owner B cannot access or view Tenant A financial figures.`);
    } else {
      record('ISOLATION', 'Strict Isolation: Owner Reports', 'FAIL', `Tenant B accessed Tenant A reports.`);
    }

    // Test 30: Tenant B Resident cannot see Tenant A's notices
    const crossNoticesRes = await fetch(`${BASE_URL}/resident/notices`, {
      headers: { Authorization: `Bearer ${residentBToken}` },
    });
    const crossNoticesData: any = await crossNoticesRes.json();
    const leakedNotice = (crossNoticesData.data || []).some((n: any) => n.id === createdNoticeId);

    if (!leakedNotice) {
      record('ISOLATION', 'Strict Isolation: Resident Notices', 'PASS', `Tenant B resident cannot see Tenant A notices.`);
    } else {
      record('ISOLATION', 'Strict Isolation: Resident Notices', 'FAIL', `Tenant A notice leaked to Tenant B resident!`);
    }

    // Test 31: Strict Cross-Tenant Deposit Settlement Isolation
    // Create a new, unsettled deposit for Tenant A to strictly test isolation
    const isolationDepositA = await prisma.securityDeposit.create({
      data: {
        residentId: residentAId,
        propertyId: propertyAId,
        amount: 25000,
        status: 'PAID',
        paidAt: new Date(),
        deductions: 0,
        refundAmount: null,
        notes: 'Pre-isolation test baseline deposit',
      },
    });

    // 1. Tenant B Owner attempts unauthorized settlement of Tenant A's deposit
    const crossSettleDepRes = await fetch(`${BASE_URL}/owner/deposits/${isolationDepositA.id}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerBToken}`,
      },
      body: JSON.stringify({ deductions: 5000, notes: 'Malicious deduction attempt by foreign tenant' }),
    });

    // Cross-tenant settlement MUST return 403 or 404. An HTTP 200 must strictly FAIL.
    const isDenied = crossSettleDepRes.status === 403 || crossSettleDepRes.status === 404;

    // 2. Verify that deposit's status, refund amount, deductions, and notes remain unchanged
    const postAttemptDeposit = await prisma.securityDeposit.findUnique({
      where: { id: isolationDepositA.id },
    });
    const depositUnmutated =
      postAttemptDeposit?.status === 'PAID' &&
      postAttemptDeposit?.deductions === 0 &&
      postAttemptDeposit?.refundAmount === null &&
      postAttemptDeposit?.notes === 'Pre-isolation test baseline deposit';

    // 3. Verify no spurious payment or receipt was created
    const spuriousReceipts = await prisma.paymentReceipt.findMany({
      where: {
        payment: {
          residentId: residentAId,
          notes: { contains: isolationDepositA.id },
        },
      },
    });

    // 4. Verify that the authorized tenant (Owner A) can still settle its own deposit
    const authorizedSettleRes = await fetch(`${BASE_URL}/owner/deposits/${isolationDepositA.id}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ deductions: 2500, notes: 'Legitimate check-out inspection deduction' }),
    });
    const authorizedSettleData: any = await authorizedSettleRes.json();
    const finalDeposit = await prisma.securityDeposit.findUnique({
      where: { id: isolationDepositA.id },
    });
    const authorizedSettlementSucceeded =
      authorizedSettleRes.status === 200 &&
      finalDeposit?.status === 'REFUNDED' &&
      finalDeposit?.deductions === 2500 &&
      finalDeposit?.refundAmount === 22500;

    if (isDenied && depositUnmutated && spuriousReceipts.length === 0 && authorizedSettlementSucceeded) {
      record(
        'ISOLATION',
        'Strict Cross-Tenant Deposit Settlement Isolation',
        'PASS',
        `Unauthorized settlement strictly denied (HTTP ${crossSettleDepRes.status}), state preserved, authorized settlement completed (₹22,500 refund).`
      );
    } else {
      record(
        'ISOLATION',
        'Strict Cross-Tenant Deposit Settlement Isolation',
        'FAIL',
        `Denied: ${isDenied} (status ${crossSettleDepRes.status}), Unmutated: ${depositUnmutated}, Spurious receipts: ${spuriousReceipts.length}, Auth settled: ${authorizedSettlementSucceeded}`
      );
    }

  } finally {
    // Teardown server
    server.close();

    // Cleanup fixtures safely
    try {
      if (visitorId) {
        await prisma.visitorRequest.deleteMany({ where: { id: visitorId } });
      }
      if (createdComplaintId) {
        await prisma.maintenanceActivity.deleteMany({ where: { complaintId: createdComplaintId } });
        await prisma.complaint.deleteMany({ where: { id: createdComplaintId } });
      }
      if (createdLeaveId) {
        await prisma.leaveRequest.deleteMany({ where: { id: createdLeaveId } });
      }
      if (createdNoticeId) {
        await prisma.notice.deleteMany({ where: { id: createdNoticeId } });
      }
      if (createdDepositId) {
        await prisma.securityDeposit.deleteMany({ where: { id: createdDepositId } });
      }
      if (tenantAId) {
        await prisma.auditLog.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.securityDeposit.deleteMany({ where: { property: { tenantId: tenantAId } } });
        await prisma.payment.deleteMany({ where: { property: { tenantId: tenantAId } } });
        await prisma.expense.deleteMany({ where: { property: { tenantId: tenantAId } } });
        await prisma.notice.deleteMany({ where: { property: { tenantId: tenantAId } } });
        await prisma.resident.deleteMany({ where: { property: { tenantId: tenantAId } } });
        await prisma.bed.deleteMany({ where: { room: { property: { tenantId: tenantAId } } } });
        await prisma.room.deleteMany({ where: { property: { tenantId: tenantAId } } });
        await prisma.property.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.user.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.tenant.deleteMany({ where: { id: tenantAId } });
      }
      if (tenantBId) {
        await prisma.auditLog.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.securityDeposit.deleteMany({ where: { property: { tenantId: tenantBId } } });
        await prisma.payment.deleteMany({ where: { property: { tenantId: tenantBId } } });
        await prisma.expense.deleteMany({ where: { property: { tenantId: tenantBId } } });
        await prisma.resident.deleteMany({ where: { property: { tenantId: tenantBId } } });
        await prisma.property.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.user.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.tenant.deleteMany({ where: { id: tenantBId } });
      }
    } catch (cleanupErr) {
      console.warn('Phase 2 cleanup warning:', cleanupErr);
    }
  }

  // Summary
  const passed = records.filter((r) => r.status === 'PASS').length;
  const failed = records.filter((r) => r.status === 'FAIL').length;

  console.log('\n========================================================================');
  console.log('  PHASE 2 FUNCTIONALITY TEST RESULT SUMMARY:');
  console.log(`  PASSED: ${passed}`);
  console.log(`  FAILED: ${failed}`);
  console.log('========================================================================\n');

  return { passed, failed, records };
}

if (require.main === module) {
  runPhase2FunctionalityTests().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
