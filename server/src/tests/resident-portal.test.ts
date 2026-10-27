import app from '../index';
import { prisma } from '../config/prisma';

const BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:5000/api`;

export async function runResidentPortalTests() {
  console.log('====================================================');
  console.log('URBAN NEST — RESIDENT PORTAL E2E INTEGRATION SUITE');
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
    // -------------------------------------------------------------------------
    // 1. Resident Authentication
    // -------------------------------------------------------------------------
    console.log('1. Testing Resident Authentication & Token Issuance...');
    let residentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aakash.v@gmail.com', password: 'password123' }),
    });
    let residentJson = await residentLoginRes.json();
    let residentToken = residentJson?.data?.token;

    if (!residentToken) {
      residentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'aakash.v@gmail.com', password: 'admin123' }),
      });
      residentJson = await residentLoginRes.json();
      residentToken = residentJson?.data?.token;
    }
    assert(!!residentToken, 'Resident login successfully authenticates and receives JWT');

    // -------------------------------------------------------------------------
    // 2. Security Boundaries & RBAC
    // -------------------------------------------------------------------------
    console.log('\n2. Testing Resident Security Boundaries & RBAC...');
    const unauthRes = await fetch(`${BASE_URL}/resident/dashboard`);
    assert(unauthRes.status === 401, 'Unauthenticated request to resident dashboard returns 401 Unauthorized');

    const forbiddenOwnerRes = await fetch(`${BASE_URL}/owner/dashboard`, {
      headers: { Authorization: `Bearer ${residentToken}` },
    });
    assert(forbiddenOwnerRes.status === 403, 'Resident is strictly forbidden from accessing Owner dashboard (403)');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${residentToken}`,
    };

    // -------------------------------------------------------------------------
    // 3. Resident Dashboard
    // -------------------------------------------------------------------------
    console.log('\n3. Testing Resident Dashboard API...');
    const dashRes = await fetch(`${BASE_URL}/resident/dashboard`, { headers });
    assert(dashRes.status === 200, 'Resident dashboard returns HTTP 200');
    const dashData = (await dashRes.json()).data;
    assert(!!dashData.resident?.name, 'Resident dashboard includes resident name and profile');
    assert(dashData.financials !== undefined, 'Resident dashboard includes live financial breakdown');
    assert(Array.isArray(dashData.activeVisitors), 'Resident dashboard includes active visitors list');
    assert(Array.isArray(dashData.openComplaints), 'Resident dashboard includes open complaints list');
    assert(Array.isArray(dashData.recentNotices), 'Resident dashboard includes PG notices');

    // -------------------------------------------------------------------------
    // 4. Resident Room & Bed Details
    // -------------------------------------------------------------------------
    console.log('\n4. Testing Resident Room & Bed Details...');
    const roomRes = await fetch(`${BASE_URL}/resident/room`, { headers });
    assert(roomRes.status === 200, 'Resident room details returns HTTP 200');
    const roomData = (await roomRes.json()).data;
    assert(roomData.assigned === true, 'Resident has assigned room and bed');
    assert(!!roomData.room?.roomNumber, 'Assigned room number is returned');
    assert(Array.isArray(roomData.roommates), 'Roommates sharing room are listed');

    // -------------------------------------------------------------------------
    // 5. Resident Profile & Password Management
    // -------------------------------------------------------------------------
    console.log('\n5. Testing Profile & Password Management...');
    const profRes = await fetch(`${BASE_URL}/resident/profile`, { headers });
    assert(profRes.status === 200, 'Resident profile returns HTTP 200');
    const profile = (await profRes.json()).data;
    assert(profile.email === 'aakash.v@gmail.com', 'Profile matches authenticated resident email');

    // Update emergency contact
    const updateProfRes = await fetch(`${BASE_URL}/resident/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        emergencyContactName: 'Venkatesh Rao (Father)',
        emergencyContactRelation: 'Father',
        emergencyContactPhone: '+91 99887 76655',
      }),
    });
    assert(updateProfRes.status === 200, 'Resident can update emergency contacts successfully');

    // Test password change rejection on wrong current password
    const wrongPwdRes = await fetch(`${BASE_URL}/resident/change-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        currentPassword: 'wrongCurrentPassword123',
        newPassword: 'newValidPassword123',
      }),
    });
    assert(wrongPwdRes.status === 401, 'Password change with incorrect current password is rejected (401)');

    // Test password change rejection on too short password
    const shortPwdRes = await fetch(`${BASE_URL}/resident/change-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        currentPassword: 'password123',
        newPassword: '123',
      }),
    });
    assert(shortPwdRes.status === 400, 'Password change with short new password (<6 chars) is rejected (400)');

    // -------------------------------------------------------------------------
    // 6. Resident Payments
    // -------------------------------------------------------------------------
    console.log('\n6. Testing Resident Payments & Invoices...');
    const payRes = await fetch(`${BASE_URL}/resident/payments`, { headers });
    assert(payRes.status === 200, 'Resident payments API returns HTTP 200');
    const payData = (await payRes.json()).data;
    assert(Array.isArray(payData.payments), 'Payments array is returned');
    assert(payData.summary !== undefined, 'Payment financial summary is calculated');

    // -------------------------------------------------------------------------
    // 7. Resident Visitors & QR Pass
    // -------------------------------------------------------------------------
    console.log('\n7. Testing Visitor Pass Management & Cancellation...');
    const visListRes = await fetch(`${BASE_URL}/resident/visitors`, { headers });
    assert(visListRes.status === 200, 'Resident visitor list returns HTTP 200');

    // Create a new visitor request
    const createVisRes = await fetch(`${BASE_URL}/resident/visitors`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        visitorName: 'Aditya Sharma',
        relation: 'Friend',
        visitDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        expectedEntryTime: '18:00',
        expectedExitTime: '21:00',
        purpose: 'Study Group',
      }),
    });
    assert(createVisRes.status === 201, 'Visitor pass request created successfully (201)');
    const createdVisitor = (await createVisRes.json()).data;
    assert(!!createdVisitor.id, 'Created visitor pass has valid ID');
    assert(!!createdVisitor.qrPassToken, 'Created visitor pass has a cryptographic QR token');

    // Cancel visitor request
    const cancelVisRes = await fetch(`${BASE_URL}/resident/visitors/${createdVisitor.id}/cancel`, {
      method: 'PATCH',
      headers,
    });
    assert(cancelVisRes.status === 200, 'Visitor pass request can be cancelled by resident');

    // -------------------------------------------------------------------------
    // 8. Resident Complaints & Ticket Comments
    // -------------------------------------------------------------------------
    console.log('\n8. Testing Complaints / Tickets Lifecycle...');
    const createCompRes = await fetch(`${BASE_URL}/resident/complaints`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Geyser heating element issue',
        description: 'Hot water temperature is lukewarm in morning hours',
        category: 'ELECTRICAL',
        priority: 'MEDIUM',
      }),
    });
    assert(createCompRes.status === 201, 'Complaint created successfully (201)');
    const createdComplaint = (await createCompRes.json()).data;
    assert(!!createdComplaint.ticketNumber, 'Ticket number generated for complaint');

    // Add comment to complaint
    const addCommentRes = await fetch(`${BASE_URL}/resident/complaints/${createdComplaint.id}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ comment: 'Issue noticed around 7:30 AM today.' }),
    });
    assert(addCommentRes.status === 201, 'Comment added to complaint ticket (201)');

    // -------------------------------------------------------------------------
    // 9. Resident Leave Requests
    // -------------------------------------------------------------------------
    console.log('\n9. Testing Leave Request Management...');
    const fromDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
    const toDate = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
    const createLeaveRes = await fetch(`${BASE_URL}/resident/leave`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fromDate,
        toDate,
        reason: 'Going home for Diwali festival celebrations',
      }),
    });
    assert(createLeaveRes.status === 201, 'Leave request created successfully (201)');
    const createdLeave = (await createLeaveRes.json()).data;

    const cancelLeaveRes = await fetch(`${BASE_URL}/resident/leave/${createdLeave.id}/cancel`, {
      method: 'PATCH',
      headers,
    });
    assert(cancelLeaveRes.status === 200, 'Leave request cancelled successfully');

    // -------------------------------------------------------------------------
    // 10. Resident Notices & Notifications
    // -------------------------------------------------------------------------
    console.log('\n10. Testing Notices & Notification System...');
    const noticesRes = await fetch(`${BASE_URL}/resident/notices`, { headers });
    assert(noticesRes.status === 200, 'Notices retrieved successfully (200)');

    const notifsRes = await fetch(`${BASE_URL}/resident/notifications`, { headers });
    assert(notifsRes.status === 200, 'Notifications retrieved successfully (200)');

    const markAllReadRes = await fetch(`${BASE_URL}/resident/notifications/read-all`, {
      method: 'PATCH',
      headers,
    });
    assert(markAllReadRes.status === 200, 'Mark all notifications as read succeeded (200)');

    // -------------------------------------------------------------------------
    // 11. Resident Emergency SOS
    // -------------------------------------------------------------------------
    console.log('\n11. Testing Emergency SOS Alert Broadcast...');
    const sosRes = await fetch(`${BASE_URL}/resident/emergency/sos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notes: 'Testing emergency SOS alert button' }),
    });
    assert(sosRes.status === 201, 'Emergency SOS alert broadcasted and logged (201)');

    console.log('\n====================================================');
    console.log(`ALL RESIDENT TESTS PASSED: ${passedTests}/${totalTests}`);
    console.log('====================================================\n');

    return { passed: passedTests, failed: 0, total: totalTests };
  } catch (error: any) {
    console.error('\n❌ RESIDENT TEST RUN FAILED:', error.message);
    throw error;
  }
}

if (require.main === module) {
  runResidentPortalTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
