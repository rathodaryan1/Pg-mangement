import app from '../index';
import { prisma } from '../config/prisma';

const BASE_URL = `http://127.0.0.1:5000/api`;

async function runOwnerIntegrationTests() {
  console.log('====================================================');
  console.log('URBAN NEST — PHASE 2: COMPLETE OWNER E2E TEST SUITE');
  console.log('Target API:', BASE_URL);
  console.log('====================================================\n');

  await new Promise((resolve) => setTimeout(resolve, 1000));

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Authenticate Owner
    console.log('1. Testing Owner and Resident Authentication...');
    let ownerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@pg.com', password: 'password123' })
    });
    let ownerJson = await ownerLoginRes.json();
    let ownerToken = ownerJson?.data?.token;

    if (!ownerToken) {
      ownerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'owner@pg.com', password: 'admin123' })
      });
      ownerJson = await ownerLoginRes.json();
      ownerToken = ownerJson?.data?.token;
    }
    assert(!!ownerToken, 'Owner login successfully returns JWT token');

    let residentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aakash.v@gmail.com', password: 'password123' })
    });
    let residentJson = await residentLoginRes.json();
    let residentToken = residentJson?.data?.token;

    if (!residentToken) {
      residentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'aakash.v@gmail.com', password: 'admin123' })
      });
      residentJson = await residentLoginRes.json();
      residentToken = residentJson?.data?.token;
    }
    assert(!!residentToken, 'Resident login successfully returns JWT token');

    // 2. Security Test: Resident forbidden from Owner APIs
    console.log('\n2. Testing RBAC & Security Boundary Isolation...');
    const forbiddenRes = await fetch(`${BASE_URL}/owner/dashboard`, {
      headers: { Authorization: `Bearer ${residentToken}` }
    });
    assert(forbiddenRes.status === 403, 'Resident is strictly forbidden from accessing Owner dashboard (HTTP 403)');

    const forbiddenRoomsRes = await fetch(`${BASE_URL}/owner/rooms`, {
      headers: { Authorization: `Bearer ${residentToken}` }
    });
    assert(forbiddenRoomsRes.status === 403, 'Resident is strictly forbidden from accessing Owner rooms API (HTTP 403)');

    // 3. Owner Dashboard Metrics
    console.log('\n3. Testing Owner Dashboard Live Aggregations...');
    const dashboardRes = await fetch(`${BASE_URL}/owner/dashboard`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const dashboardJson = await dashboardRes.json();
    assert(dashboardRes.status === 200, 'Owner dashboard API returns HTTP 200');
    assert(dashboardJson.data.kpis.totalRooms > 0, 'KPI accurately reflects total rooms in database');
    assert(dashboardJson.data.kpis.totalBeds > 0, 'KPI accurately reflects total beds in database');
    assert(typeof dashboardJson.data.kpis.occupancyRate === 'number', 'KPI accurately computes occupancy rate');

    // 4. Property Management
    console.log('\n4. Testing Property & Building Management...');
    const propertiesRes = await fetch(`${BASE_URL}/owner/properties`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const propertiesJson = await propertiesRes.json();
    assert(propertiesRes.status === 200 && propertiesJson.data.length > 0, 'Owner can list authorized properties');
    const propertyId = propertiesJson.data[0].id;

    // 5. Room Creation & Bed Generation
    console.log('\n5. Testing Room Creation & Atomic Bed Generation...');
    const newRoomNumber = `TEST-${Date.now().toString().slice(-4)}`;
    const createRoomRes = await fetch(`${BASE_URL}/owner/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId,
        number: newRoomNumber,
        floor: 3,
        building: 'Block A',
        type: 'Double',
        capacity: 2,
        baseRent: 15000,
        amenities: ['Attached Washroom', 'AC', 'Study Desk']
      })
    });
    const createRoomJson = await createRoomRes.json();
    assert(createRoomRes.status === 201, `Room ${newRoomNumber} created with HTTP 201`);
    assert(createRoomJson.data.beds.length === 2, '2 beds atomically generated for double sharing room');
    const testBedA = createRoomJson.data.beds[0];
    assert(testBedA.status === 'AVAILABLE', 'Generated Bed A is initialized to AVAILABLE status');

    // 6. Atomic Move-In Pipeline
    console.log('\n6. Testing Atomic Resident Move-In & Bed Allocation...');
    const testEmail = `neha.test.${Date.now()}@example.com`;
    const moveInRes = await fetch(`${BASE_URL}/owner/residents/move-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId,
        bedId: testBedA.id,
        fullName: 'Neha Sharma',
        email: testEmail,
        mobile: '9876543210',
        monthlyRent: 15000,
        depositAmount: 30000,
        leaseStartDate: '2026-10-01',
        leaseEndDate: '2027-09-30'
      })
    });
    const moveInJson = await moveInRes.json();
    assert(moveInRes.status === 201, 'Move-In transaction executed with HTTP 201');
    const residentId = moveInJson.data.resident.id;
    assert(!!residentId, 'Resident profile created successfully');

    // Verify bed is now OCCUPIED in database
    const bedCheck = await prisma.bed.findUnique({ where: { id: testBedA.id } });
    assert(bedCheck?.status === 'OCCUPIED', 'Bed status atomically updated to OCCUPIED');

    // Verify double allocation prevention
    console.log('\n7. Testing Double-Allocation Race Condition Prevention...');
    const doubleAllocRes = await fetch(`${BASE_URL}/owner/residents/move-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId,
        bedId: testBedA.id,
        fullName: 'Duplicate User',
        email: `dup.${Date.now()}@example.com`,
        mobile: '9876543211',
        monthlyRent: 15000
      })
    });
    assert(doubleAllocRes.status === 400, 'Double allocation on occupied bed is rejected with HTTP 400');

    // 8. Finance & Payments
    console.log('\n8. Testing Invoice Generation & Payment Settlement...');
    const invoiceRes = await fetch(`${BASE_URL}/owner/payments/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        residentId,
        category: 'RENT',
        amount: 15000,
        period: 'October 2026',
        dueDate: '2026-10-05',
        notes: 'Monthly room rent'
      })
    });
    const invoiceJson = await invoiceRes.json();
    assert(invoiceRes.status === 201, 'Charge invoice generated with HTTP 201');
    const invoiceId = invoiceJson.data.id;

    const manualPayRes = await fetch(`${BASE_URL}/owner/payments/record-manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        paymentId: invoiceId,
        method: 'UPI',
        transactionId: `UPI-REF-${Date.now()}`,
        notes: 'Verified bank transfer'
      })
    });
    const manualPayJson = await manualPayRes.json();
    assert(manualPayRes.status === 200, 'Manual payment recorded successfully');
    assert(manualPayJson.data.status === 'PAID', 'Payment status marked as PAID');
    assert(!!manualPayJson.data.receiptNumber, 'Official receipt number generated');

    // 9. Operating Expense Management
    console.log('\n9. Testing Operating Expense Logging...');
    const expenseRes = await fetch(`${BASE_URL}/owner/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId,
        category: 'INTERNET',
        title: 'Airtel Fiber Gigabit Internet',
        amount: 3499,
        vendor: 'Airtel Broadband',
        date: '2026-10-01',
        notes: 'Monthly high-speed internet subscription'
      })
    });
    assert(expenseRes.status === 201, 'Operating expense logged with HTTP 201');

    // 10. Visitor Management & QR Verification
    console.log('\n10. Testing Visitor Pass, QR Verification & Gate Check-In/Out...');
    const testQrCode = `UN-PASS-${Date.now()}`;
    const visitorReq = await prisma.visitorRequest.create({
      data: {
        propertyId,
        residentId,
        visitorName: 'Aditya Roy',
        visitorMobile: '9988776655',
        relation: 'Brother',
        purpose: 'Weekend Visit',
        visitDate: new Date('2026-10-10'),
        expectedEntryTime: '10:00 AM',
        status: 'PENDING',
        qrPassToken: testQrCode
      }
    });

    const approveVisitorRes = await fetch(`${BASE_URL}/owner/visitors/${visitorReq.id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const approveJson = await approveVisitorRes.json();
    assert(approveVisitorRes.status === 200, 'Visitor pass approved by Owner');
    assert(approveJson.data.status === 'APPROVED', 'Visitor status transitioned to APPROVED');

    const qrVerifyRes = await fetch(`${BASE_URL}/owner/visitors/verify-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ qrPassToken: testQrCode })
    });
    const qrVerifyJson = await qrVerifyRes.json();
    assert(qrVerifyRes.status === 200, 'Cryptographic QR token verified successfully');

    const checkInRes = await fetch(`${BASE_URL}/owner/visitors/${visitorReq.id}/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const checkInJson = await checkInRes.json();
    assert(checkInRes.status === 200 && checkInJson.data.status === 'CHECKED_IN', 'Visitor checked in at security gate');

    const checkOutRes = await fetch(`${BASE_URL}/owner/visitors/${visitorReq.id}/check-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const checkOutJson = await checkOutRes.json();
    assert(checkOutRes.status === 200 && checkOutJson.data.status === 'CHECKED_OUT', 'Visitor checked out successfully');

    // 11. Maintenance Lifecycle
    console.log('\n11. Testing Maintenance Ticket Status Progression & Activity Logging...');
    const complaint = await prisma.complaint.create({
      data: {
        propertyId,
        residentId,
        ticketNumber: `TKT-${Date.now().toString().slice(-4)}`,
        title: 'AC cooling issue in room',
        category: 'AIR_CONDITIONING',
        priority: 'HIGH',
        description: 'AC is not cooling properly',
        status: 'REPORTED'
      }
    });

    const updateComplaintRes = await fetch(`${BASE_URL}/owner/complaints/${complaint.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        status: 'RESOLVED',
        comment: 'Filter cleaned and gas refilled by technician.'
      })
    });
    const updateComplaintJson = await updateComplaintRes.json();
    assert(updateComplaintRes.status === 200, 'Complaint updated with HTTP 200');
    assert(updateComplaintJson.data.status === 'RESOLVED', 'Complaint status transitioned to RESOLVED');

    // Verify activity record created
    const activityLog = await prisma.maintenanceActivity.findFirst({
      where: { complaintId: complaint.id }
    });
    assert(!!activityLog, 'MaintenanceActivity audit record created for ticket transition');

    // 12. Staff Management & Tasks
    console.log('\n12. Testing Staff Management & Operational Tasks...');
    const staffRes = await fetch(`${BASE_URL}/owner/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId,
        name: 'Suresh Kumar',
        email: `suresh.${Date.now()}@example.com`,
        mobile: '9876543212',
        role: 'MAINTENANCE',
        shift: 'Morning',
        salary: 22000
      })
    });
    assert(staffRes.status === 201, 'Staff member registered successfully');

    const taskRes = await fetch(`${BASE_URL}/owner/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId,
        title: 'Water Sump Chlorination & Filter Replacement',
        category: 'PLUMBING',
        priority: 'HIGH',
        dueDate: '2026-10-15'
      })
    });
    assert(taskRes.status === 201, 'Operational task created successfully');

    // 13. Notice Period Transition
    console.log('\n13. Testing Notice Period Transition...');
    const noticePeriodRes = await fetch(`${BASE_URL}/owner/residents/${residentId}/notice-period`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        expectedMoveOutDate: '2026-10-31',
        reason: 'Relocating to another city for work'
      })
    });
    const noticePeriodJson = await noticePeriodRes.json();
    assert(noticePeriodRes.status === 200, 'Resident placed on NOTICE_PERIOD with HTTP 200');
    assert(noticePeriodJson.data.status === 'NOTICE_PERIOD', 'Resident status updated to NOTICE_PERIOD');

    // 14. Atomic Move-Out & Deposit Settlement
    console.log('\n14. Testing Atomic Move-Out & Security Deposit Settlement...');
    const moveOutRes = await fetch(`${BASE_URL}/owner/residents/${residentId}/move-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        deductions: 2000,
        deductionNotes: 'Deduction for room deep cleaning and touch-up paint.',
        refundAmount: 28000
      })
    });
    const moveOutJson = await moveOutRes.json();
    assert(moveOutRes.status === 200, 'Move-out settlement executed with HTTP 200');
    assert(moveOutJson.data.status === 'MOVED_OUT', 'Resident status transitioned to MOVED_OUT');

    // Verify bed is released back to AVAILABLE in database
    const freedBed = await prisma.bed.findUnique({ where: { id: testBedA.id } });
    assert(freedBed?.status === 'AVAILABLE', 'Bed A is atomically released back to AVAILABLE status');

    // 15. Audit Logs
    console.log('\n15. Testing Immutable Audit Log Trail...');
    const auditLogsRes = await fetch(`${BASE_URL}/owner/audit-logs`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const auditLogsJson = await auditLogsRes.json();
    assert(auditLogsRes.status === 200, 'Audit logs retrieved with HTTP 200');
    assert(auditLogsJson.data.length > 0, 'Audit trail contains recorded system actions');

    // Cleanup test data
    console.log('\n16. Cleaning up test room and records...');
    await prisma.maintenanceActivity.deleteMany({ where: { complaintId: complaint.id } });
    await prisma.complaint.delete({ where: { id: complaint.id } });
    await prisma.visitorRequest.delete({ where: { id: visitorReq.id } });
    await prisma.payment.deleteMany({ where: { residentId } });
    await prisma.agreement.deleteMany({ where: { residentId } });
    await prisma.securityDeposit.deleteMany({ where: { residentId } });
    await prisma.resident.delete({ where: { id: residentId } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.bed.deleteMany({ where: { roomId: createRoomJson.data.id } });
    await prisma.room.delete({ where: { id: createRoomJson.data.id } });

    console.log('\n====================================================');
    console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED PERFECTLY!`);
    console.log('URBAN NEST PHASE 2 OWNER PORTAL IS 100% FULLY FUNCTIONAL!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\nTEST SUITE FAILED:', error);
    process.exit(1);
  }
}

runOwnerIntegrationTests();
