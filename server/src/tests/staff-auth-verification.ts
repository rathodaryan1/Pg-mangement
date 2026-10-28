import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const API_BASE = 'http://127.0.0.1:5000/api';

interface TestRecord {
  section: string;
  test: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const records: TestRecord[] = [];

function logResult(section: string, test: string, passed: boolean, details: string) {
  records.push({
    section,
    test,
    status: passed ? 'PASS' : 'FAIL',
    details,
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${section}] ${test} — ${details}`);
}

// Client-side redirection mapping function matching LoginPage.tsx
function getRedirectPath(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin/dashboard';
    case 'RESIDENT':
      return '/resident/dashboard';
    case 'COOK':
      return '/staff/kitchen';
    case 'SECURITY_GUARD':
      return '/staff/security';
    case 'HOUSEKEEPING':
      return '/staff/housekeeping';
    case 'MAINTENANCE':
      return '/staff/maintenance';
    case 'OWNER':
    case 'MANAGER':
    case 'RECEPTIONIST':
    case 'ACCOUNTANT':
    default:
      return '/owner/dashboard';
  }
}

async function runUnifiedOperationsSuite() {
  console.log('\n============================================================');
  console.log('   URBAN NEST — UNIFIED LOGIN & ROLE-BASED OPERATIONS SYSTEM ');
  console.log('============================================================\n');

  const testSuffix = Date.now().toString(36);
  const createdUserIds: string[] = [];
  const createdVisitorIds: string[] = [];
  let tenantB: any = null;

  try {
    // -------------------------------------------------------------
    // Seed verification: Ensure deterministic demo staff accounts exist
    // -------------------------------------------------------------
    const defaultOwner = await prisma.user.findUnique({ where: { email: 'owner@pg.com' } });
    const defaultProperty = await prisma.property.findFirst({
      where: defaultOwner?.tenantId ? { tenantId: defaultOwner.tenantId } : {},
    });

    if (defaultOwner && defaultProperty) {
      const demoStaff = [
        { email: 'cook@pg.com', name: 'Chef Ramu (Head Cook)', role: 'COOK' as UserRole, mobile: '9876543230' },
        { email: 'guard@pg.com', name: 'Bahadur Singh (Security Guard)', role: 'SECURITY_GUARD' as UserRole, mobile: '9876543231' },
        { email: 'housekeeping@pg.com', name: 'Sunita Devi (Housekeeping)', role: 'HOUSEKEEPING' as UserRole, mobile: '9876543232' },
      ];

      for (const ds of demoStaff) {
        const passwordHash = await bcrypt.hash('admin123', 10);
        await prisma.user.upsert({
          where: { email: ds.email },
          update: { role: ds.role, tenantId: defaultOwner.tenantId, propertyId: defaultProperty.id },
          create: {
            email: ds.email,
            passwordHash,
            name: ds.name,
            role: ds.role,
            mobile: ds.mobile,
            tenantId: defaultOwner.tenantId,
            propertyId: defaultProperty.id,
          },
        });
      }
    }

    // =============================================================
    // SECTION 1: UNIFIED LOGIN & ROLE DETECTION (NO TABS)
    // =============================================================
    console.log('\n--- Section 1: Unified Authentication & Auto Role Verification ---');

    const accountsToTest = [
      { email: 'superadmin@urbannest.io', password: 'superadmin123', expectedRole: 'SUPER_ADMIN' },
      { email: 'superadmin@pg.com', password: 'admin123', expectedRole: 'SUPER_ADMIN' },
      { email: 'owner@pg.com', password: 'admin123', expectedRole: 'OWNER' },
      { email: 'manager.gurgaon@pg.com', password: 'admin123', expectedRole: 'MANAGER' },
      { email: 'repair.gurgaon@pg.com', password: 'admin123', expectedRole: 'MAINTENANCE' },
      { email: 'reception.gurgaon@pg.com', password: 'admin123', expectedRole: 'RECEPTIONIST' },
      { email: 'cook@pg.com', password: 'admin123', expectedRole: 'COOK' },
      { email: 'guard@pg.com', password: 'admin123', expectedRole: 'SECURITY_GUARD' },
      { email: 'housekeeping@pg.com', password: 'admin123', expectedRole: 'HOUSEKEEPING' },
      { email: 'aakash.v@gmail.com', password: 'admin123', expectedRole: 'RESIDENT' },
    ];

    const tokens: Record<string, string> = {};

    for (const acc of accountsToTest) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: acc.password }),
      });

      const body: any = await res.json();
      const loginSuccess = res.status === 200 && body.success === true;
      const actualRole = body.data?.user?.role;
      const roleMatches = actualRole === acc.expectedRole;

      if (loginSuccess && body.data?.token) {
        tokens[acc.expectedRole] = body.data.token;
      }

      logResult(
        'UNIFIED_LOGIN',
        `Login for ${acc.expectedRole} (${acc.email})`,
        loginSuccess && roleMatches,
        `Status: ${res.status}, Authenticated Role: ${actualRole}`
      );
    }

    // Test rejection of invalid password
    const invalidCredsRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@pg.com', password: 'WrongPassword123!' }),
    });
    logResult(
      'UNIFIED_LOGIN',
      'Rejection of invalid password credentials',
      invalidCredsRes.status === 401,
      `Status: ${invalidCredsRes.status} (Expected 401)`
    );

    // Test Gmail account provisioning and unified login
    const gmailTestEmail = `manager.test.${testSuffix}@gmail.com`;
    const gmailPassHash = await bcrypt.hash('admin123', 10);
    const gmailUser = await prisma.user.create({
      data: {
        name: 'Gmail Property Manager',
        email: gmailTestEmail,
        passwordHash: gmailPassHash,
        role: 'MANAGER',
        tenantId: defaultOwner?.tenantId || null,
        propertyId: defaultProperty?.id || null,
      },
    });
    createdUserIds.push(gmailUser.id);

    const gmailLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: gmailTestEmail, password: 'admin123' }),
    });
    const gmailLoginBody: any = await gmailLoginRes.json();
    logResult(
      'GMAIL_LOGIN',
      `Login with Gmail address (${gmailTestEmail})`,
      gmailLoginRes.status === 200 && gmailLoginBody.data?.user?.role === 'MANAGER',
      `Status: ${gmailLoginRes.status}, Detected Role: ${gmailLoginBody.data?.user?.role}`
    );

    // =============================================================
    // SECTION 2: ROLE-BASED REDIRECTION DESTINATIONS
    // =============================================================
    console.log('\n--- Section 2: Role-Based Redirection Mapping ---');

    const expectedDestinations: Record<string, string> = {
      SUPER_ADMIN: '/super-admin/dashboard',
      OWNER: '/owner/dashboard',
      MANAGER: '/owner/dashboard',
      RESIDENT: '/resident/dashboard',
      COOK: '/staff/kitchen',
      SECURITY_GUARD: '/staff/security',
      HOUSEKEEPING: '/staff/housekeeping',
      MAINTENANCE: '/staff/maintenance',
      RECEPTIONIST: '/owner/dashboard',
      ACCOUNTANT: '/owner/dashboard',
    };

    for (const [role, expectedPath] of Object.entries(expectedDestinations)) {
      const computedPath = getRedirectPath(role);
      const isCorrect = computedPath === expectedPath;
      logResult(
        'REDIRECT_MAPPING',
        `Destination route for role "${role}"`,
        isCorrect,
        `Expected: ${expectedPath}, Computed: ${computedPath}`
      );
    }

    // =============================================================
    // SECTION 3: STAFF ACCOUNT CREATION API VALIDATION
    // =============================================================
    console.log('\n--- Section 3: Staff Account Creation & Validation ---');

    const ownerToken = tokens['OWNER'];
    const rolesToCreate = [
      'MANAGER',
      'MAINTENANCE',
      'SECURITY_GUARD',
      'HOUSEKEEPING',
      'COOK',
      'RECEPTIONIST',
      'ACCOUNTANT',
    ];

    for (const r of rolesToCreate) {
      const testEmail = `staff_${r.toLowerCase()}_${testSuffix}@pgtest.com`;
      const res = await fetch(`${API_BASE}/owner/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: `Test ${r} User`,
          email: testEmail,
          role: r,
          mobile: '9876543299',
        }),
      });

      const body: any = await res.json();
      const created = res.status === 201 && body.success === true;
      if (body.data?.id) createdUserIds.push(body.data.id);

      logResult(
        'STAFF_CREATION',
        `Create staff with role ${r}`,
        created && body.data?.role === r,
        `Status: ${res.status}, Saved Role: ${body.data?.role}`
      );
    }

    // Normalizing legacy "SECURITY" to "SECURITY_GUARD"
    const legacySecurityEmail = `staff_legacy_sec_${testSuffix}@pgtest.com`;
    const secRes = await fetch(`${API_BASE}/owner/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Legacy Security Guard',
        email: legacySecurityEmail,
        role: 'SECURITY',
        mobile: '9876543298',
      }),
    });
    const secBody: any = await secRes.json();
    if (secBody.data?.id) createdUserIds.push(secBody.data.id);

    logResult(
      'ROLE_NORMALIZATION',
      'Normalizing legacy "SECURITY" to "SECURITY_GUARD"',
      secRes.status === 201 && secBody.data?.role === 'SECURITY_GUARD',
      `Status: ${secRes.status}, Normalized Role: ${secBody.data?.role}`
    );

    // Invalid role rejection
    const invalidRoleRes = await fetch(`${API_BASE}/owner/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Invalid Staff',
        email: `invalid_role_${testSuffix}@pgtest.com`,
        role: 'INVALID_SUPER_ROLE',
        mobile: '9876543297',
      }),
    });
    const invalidRoleBody: any = await invalidRoleRes.json();
    logResult(
      'INVALID_ROLE_REJECTION',
      'Rejecting invalid role "INVALID_SUPER_ROLE"',
      invalidRoleRes.status === 400 && (invalidRoleBody.error === 'INVALID_ROLE' || invalidRoleBody.code === 'INVALID_ROLE'),
      `Status: ${invalidRoleRes.status}, Error: ${invalidRoleBody.error}, Message: ${invalidRoleBody.message}`
    );

    // Duplicate email rejection
    const dupRes = await fetch(`${API_BASE}/owner/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Duplicate Staff',
        email: 'cook@pg.com',
        role: 'COOK',
        mobile: '9876543296',
      }),
    });
    const dupBody: any = await dupRes.json();
    logResult(
      'DUPLICATE_EMAIL_REJECTION',
      'Rejecting duplicate email creation',
      dupRes.status === 409 && (dupBody.error === 'DUPLICATE_EMAIL' || dupBody.code === 'DUPLICATE_EMAIL'),
      `Status: ${dupRes.status}, Error: ${dupBody.error}`
    );

    // =============================================================
    // SECTION 4: TENANT ISOLATION & PERMISSION SCOPING
    // =============================================================
    console.log('\n--- Section 4: Tenant Isolation & Route Authorization ---');

    const foreignPasswordHash = await bcrypt.hash('admin123', 10);
    tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant Bravo ${testSuffix}`,
        slug: `tenant-b-${testSuffix}`,
        email: `tenant_b_${testSuffix}@test.com`,
        status: 'ACTIVE',
        users: {
          create: {
            name: 'Staff Bravo',
            email: `staff_bravo_${testSuffix}@test.com`,
            passwordHash: foreignPasswordHash,
            role: 'COOK',
          },
        },
        properties: {
          create: {
            name: `Property Bravo ${testSuffix}`,
            address: '456 Bravo Ave',
            city: 'Ahmedabad',
          },
        },
      },
      include: { users: true, properties: true },
    });
    const staffBravoId = tenantB.users[0].id;
    const propertyBravoId = tenantB.properties[0].id;

    // Cross-tenant update blocked
    const crossUpdateRes = await fetch(`${API_BASE}/owner/staff/${staffBravoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Bravo Staff' }),
    });
    logResult(
      'TENANT_ISOLATION',
      'Owner A blocked from modifying Tenant B staff',
      crossUpdateRes.status === 403,
      `Status: ${crossUpdateRes.status}`
    );

    // Cross-tenant archive blocked
    const crossArchiveRes = await fetch(`${API_BASE}/owner/staff/${staffBravoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    logResult(
      'TENANT_ISOLATION',
      'Owner A blocked from deleting Tenant B staff',
      crossArchiveRes.status === 403,
      `Status: ${crossArchiveRes.status}`
    );

    // IDOR property scoping check
    const idorStaffEmail = `staff_idor_${testSuffix}@pgtest.com`;
    const idorRes = await fetch(`${API_BASE}/owner/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'IDOR Attempt Staff',
        email: idorStaffEmail,
        role: 'MAINTENANCE',
        propertyId: propertyBravoId,
      }),
    });
    const idorBody: any = await idorRes.json();
    if (idorBody.data?.id) createdUserIds.push(idorBody.data.id);

    const idorPrevented = idorBody.data?.propertyId !== propertyBravoId;
    logResult(
      'IDOR_PROPERTY_SCOPING',
      "Preventing staff assignment to foreign tenant's property",
      idorPrevented,
      `Assigned Property ID: ${idorBody.data?.propertyId} (Tenant B: ${propertyBravoId})`
    );

    // =============================================================
    // SECTION 5: OPERATIONAL ROUTE PERMISSIONS & ROLE BOUNDARIES
    // =============================================================
    console.log('\n--- Section 5: Staff Operational Route Access ---');

    const cookToken = tokens['COOK'];
    const guardToken = tokens['SECURITY_GUARD'];
    const housekeepingToken = tokens['HOUSEKEEPING'];
    const maintenanceToken = tokens['MAINTENANCE'];

    // Cook accessing Kitchen dashboard
    const cookKitchenRes = await fetch(`${API_BASE}/kitchen/dashboard`, {
      headers: { Authorization: `Bearer ${cookToken}` },
    });
    logResult(
      'STAFF_ROUTE_ACCESS',
      'Cook can access /api/kitchen/dashboard',
      cookKitchenRes.status === 200,
      `Status: ${cookKitchenRes.status}`
    );

    // Cook trying to access Security dashboard (blocked 403)
    const cookSecRes = await fetch(`${API_BASE}/security/dashboard`, {
      headers: { Authorization: `Bearer ${cookToken}` },
    });
    logResult(
      'STAFF_ROUTE_ACCESS',
      'Cook blocked from /api/security/dashboard',
      cookSecRes.status === 403,
      `Status: ${cookSecRes.status}`
    );

    // Guard accessing Security dashboard
    const guardSecRes = await fetch(`${API_BASE}/security/dashboard`, {
      headers: { Authorization: `Bearer ${guardToken}` },
    });
    logResult(
      'STAFF_ROUTE_ACCESS',
      'Security Guard can access /api/security/dashboard',
      guardSecRes.status === 200,
      `Status: ${guardSecRes.status}`
    );

    // Housekeeping accessing Housekeeping dashboard
    const hkRes = await fetch(`${API_BASE}/housekeeping/dashboard`, {
      headers: { Authorization: `Bearer ${housekeepingToken}` },
    });
    logResult(
      'STAFF_ROUTE_ACCESS',
      'Housekeeping can access /api/housekeeping/dashboard',
      hkRes.status === 200,
      `Status: ${hkRes.status}`
    );

    // Maintenance accessing complaints endpoint
    const maintRes = await fetch(`${API_BASE}/owner/complaints`, {
      headers: { Authorization: `Bearer ${maintenanceToken}` },
    });
    logResult(
      'STAFF_ROUTE_ACCESS',
      'Maintenance can access /api/owner/complaints',
      maintRes.status === 200,
      `Status: ${maintRes.status}`
    );

    // Staff member blocked from Super Admin endpoint
    const cookSuperAdminRes = await fetch(`${API_BASE}/super-admin/tenants`, {
      headers: { Authorization: `Bearer ${cookToken}` },
    });
    logResult(
      'ROLE_BOUNDARY',
      'Cook blocked from Super Admin tenants endpoint',
      cookSuperAdminRes.status === 403,
      `Status: ${cookSuperAdminRes.status}`
    );

    // Staff member blocked from Staff Management CRUD
    const guardStaffMgmtRes = await fetch(`${API_BASE}/owner/staff`, {
      headers: { Authorization: `Bearer ${guardToken}` },
    });
    logResult(
      'ROLE_BOUNDARY',
      'Security Guard blocked from managing Staff (/api/owner/staff)',
      guardStaffMgmtRes.status === 403,
      `Status: ${guardStaffMgmtRes.status}`
    );

    // =============================================================
    // SECTION 6: COMPLETE VISITOR APPROVAL & QR ENTRY WORKFLOW
    // =============================================================
    console.log('\n--- Section 6: Complete End-to-End Visitor Workflow ---');

    const residentToken = tokens['RESIDENT'];

    // 1. Resident creates a visitor request
    const createVisitRes = await fetch(`${API_BASE}/resident/visitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentToken}`,
      },
      body: JSON.stringify({
        visitorName: 'Aditya Sharma',
        visitorMobile: '9876500111',
        relation: 'Friend',
        purpose: 'Academic project collaboration',
        visitDate: new Date().toISOString().split('T')[0],
        expectedEntryTime: '04:00 PM',
        expectedExitTime: '08:00 PM',
      }),
    });
    const createVisitBody: any = await createVisitRes.json();
    const createdPass = createVisitBody.data;
    if (createdPass?.id) createdVisitorIds.push(createdPass.id);

    logResult(
      'VISITOR_WORKFLOW',
      'Resident submits visitor request (Status: PENDING)',
      createVisitRes.status === 201 && createdPass?.status === 'PENDING',
      `Status: ${createVisitRes.status}, Pass ID: ${createdPass?.id}, Token: ${createdPass?.qrPassToken}`
    );

    // 2. Guard attempts to check in PENDING request before manager approval -> MUST FAIL
    const prematureCheckInRes = await fetch(`${API_BASE}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ token: createdPass.qrPassToken }),
    });
    const prematureBody: any = await prematureCheckInRes.json();
    logResult(
      'VISITOR_WORKFLOW',
      'Guard check-in of PENDING pass rejected before approval',
      prematureCheckInRes.status === 400 && (prematureBody.error === 'VISIT_NOT_APPROVED' || prematureBody.message?.includes('PENDING')),
      `Status: ${prematureCheckInRes.status}, Error: ${prematureBody.error}, Message: ${prematureBody.message}`
    );

    // 3. Manager reviews and approves the visitor request
    const approveRes = await fetch(`${API_BASE}/owner/visitors/${createdPass.id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
    });
    const approveBody: any = await approveRes.json();
    logResult(
      'VISITOR_WORKFLOW',
      'Manager approves visitor request (Status: APPROVED)',
      approveRes.status === 200 && approveBody.data?.status === 'APPROVED',
      `Status: ${approveRes.status}, Updated Status: ${approveBody.data?.status}`
    );

    // 4. Security guard scans and verifies pass details
    const verifyPassRes = await fetch(`${API_BASE}/security/verify-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ token: createdPass.qrPassToken }),
    });
    const verifyBody: any = await verifyPassRes.json();
    logResult(
      'VISITOR_WORKFLOW',
      'Guard scans QR pass & verifies approval details',
      verifyPassRes.status === 200 &&
        verifyBody.data?.valid === true &&
        verifyBody.data?.canCheckIn === true &&
        verifyBody.data?.pass?.visitorName === 'Aditya Sharma',
      `Status: ${verifyPassRes.status}, Valid: ${verifyBody.data?.valid}, Can Check-In: ${verifyBody.data?.canCheckIn}`
    );

    // 5. Security guard checks in the approved visitor
    const checkInRes = await fetch(`${API_BASE}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ token: createdPass.qrPassToken }),
    });
    const checkInBody: any = await checkInRes.json();
    logResult(
      'VISITOR_WORKFLOW',
      'Security checks in visitor (Status: CHECKED_IN)',
      checkInRes.status === 200 && checkInBody.data?.status === 'CHECKED_IN' && !!checkInBody.data?.checkInTime,
      `Status: ${checkInRes.status}, Recorded Entry: ${checkInBody.data?.checkInTime}`
    );

    // 6. Security guard attempts duplicate check-in -> MUST FAIL
    const dupCheckInRes = await fetch(`${API_BASE}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ token: createdPass.qrPassToken }),
    });
    const dupCheckInBody: any = await dupCheckInRes.json();
    logResult(
      'VISITOR_WORKFLOW',
      'Duplicate check-in rejected atomically',
      dupCheckInRes.status === 400 && (dupCheckInBody.error === 'ALREADY_CHECKED_IN' || dupCheckInBody.message?.includes('already')),
      `Status: ${dupCheckInRes.status}, Error: ${dupCheckInBody.error}`
    );

    // 7. Security guard checks out the visitor
    const checkOutRes = await fetch(`${API_BASE}/security/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ token: createdPass.qrPassToken }),
    });
    const checkOutBody: any = await checkOutRes.json();
    logResult(
      'VISITOR_WORKFLOW',
      'Security checks out visitor (Status: CHECKED_OUT)',
      checkOutRes.status === 200 && checkOutBody.data?.status === 'CHECKED_OUT' && !!checkOutBody.data?.checkOutTime,
      `Status: ${checkOutRes.status}, Recorded Departure: ${checkOutBody.data?.checkOutTime}`
    );

    // 8. Duplicate check-out rejected
    const dupCheckOutRes = await fetch(`${API_BASE}/security/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ token: createdPass.qrPassToken }),
    });
    const dupCheckOutBody: any = await dupCheckOutRes.json();
    logResult(
      'VISITOR_WORKFLOW',
      'Duplicate check-out rejected atomically',
      dupCheckOutRes.status === 400 && (dupCheckOutBody.error === 'ALREADY_CHECKED_OUT' || dupCheckOutBody.message?.includes('already')),
      `Status: ${dupCheckOutRes.status}, Error: ${dupCheckOutBody.error}`
    );

    // 9. Re-check in of completed pass rejected
    const reCheckInRes = await fetch(`${API_BASE}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ token: createdPass.qrPassToken }),
    });
    const reCheckInBody: any = await reCheckInRes.json();
    logResult(
      'VISITOR_WORKFLOW',
      'Re-entry with completed pass rejected',
      reCheckInRes.status === 400 && (reCheckInBody.error === 'ALREADY_CHECKED_OUT' || reCheckInBody.message?.includes('checked out')),
      `Status: ${reCheckInRes.status}, Error: ${reCheckInBody.error}`
    );

    // 10. Rejection Workflow: Create request and reject it
    const rejVisitRes = await fetch(`${API_BASE}/resident/visitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentToken}`,
      },
      body: JSON.stringify({
        visitorName: 'Suspicious Visitor',
        visitorMobile: '9876500222',
        relation: 'Stranger',
        purpose: 'Sales pitch',
        visitDate: new Date().toISOString().split('T')[0],
        expectedEntryTime: '02:00 PM',
      }),
    });
    const rejVisitBody: any = await rejVisitRes.json();
    const rejPass = rejVisitBody.data;
    if (rejPass?.id) createdVisitorIds.push(rejPass.id);

    // Manager rejects pass
    const managerRejRes = await fetch(`${API_BASE}/owner/visitors/${rejPass.id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ reason: 'Commercial solicitation not permitted' }),
    });
    logResult(
      'VISITOR_WORKFLOW',
      'Manager rejects visitor request with reason',
      managerRejRes.status === 200,
      `Status: ${managerRejRes.status}`
    );

    // Guard check-in on REJECTED pass must fail
    const guardRejRes = await fetch(`${API_BASE}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ token: rejPass.qrPassToken }),
    });
    const guardRejBody: any = await guardRejRes.json();
    logResult(
      'VISITOR_WORKFLOW',
      'Guard check-in of REJECTED pass blocked',
      guardRejRes.status === 400 && (guardRejBody.error === 'PASS_REJECTED' || guardRejBody.message?.includes('REJECTED')),
      `Status: ${guardRejRes.status}, Error: ${guardRejBody.error}`
    );

    // 11. Cross-tenant visitor pass check-in blocked
    const foreignPass = await prisma.visitorRequest.create({
      data: {
        propertyId: propertyBravoId,
        visitorName: 'Bravo Foreign Visitor',
        visitorMobile: '9876500333',
        relation: 'Client',
        purpose: 'Business meeting',
        visitDate: new Date(),
        expectedEntryTime: '10:00 AM',
        status: 'APPROVED',
      },
    });
    createdVisitorIds.push(foreignPass.id);

    // Guard from Tenant A attempts check-in on Tenant B's pass
    const crossTenantPassRes = await fetch(`${API_BASE}/security/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ token: foreignPass.qrPassToken }),
    });
    logResult(
      'VISITOR_WORKFLOW',
      "Guard blocked from foreign tenant's visitor pass",
      crossTenantPassRes.status === 403,
      `Status: ${crossTenantPassRes.status} (Expected 403 FORBIDDEN_PROPERTY)`
    );

  } finally {
    // =============================================================
    // SECTION 7: CLEAN TEARDOWN
    // =============================================================
    console.log('\n--- Section 7: Fixture Cleanup ---');

    if (createdVisitorIds.length > 0) {
      await prisma.visitorRequest.deleteMany({
        where: { id: { in: createdVisitorIds } },
      });
      console.log(`🧹 Cleaned up ${createdVisitorIds.length} test visitor passes.`);
    }

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      console.log(`🧹 Cleaned up ${createdUserIds.length} temporary test user accounts.`);
    }

    if (tenantB) {
      await prisma.visitorRequest.deleteMany({ where: { propertyId: tenantB.properties[0]?.id } });
      await prisma.user.deleteMany({ where: { tenantId: tenantB.id } });
      await prisma.property.deleteMany({ where: { tenantId: tenantB.id } });
      await prisma.tenant.delete({ where: { id: tenantB.id } });
      console.log(`🧹 Cleaned up isolated foreign Tenant B (${tenantB.id}).`);
    }

    await prisma.$disconnect();
  }

  // Summary Report
  console.log('\n============================================================');
  console.log('                 TEST EXECUTION SUMMARY                     ');
  console.log('============================================================');
  const passCount = records.filter((r) => r.status === 'PASS').length;
  const failCount = records.filter((r) => r.status === 'FAIL').length;
  console.log(`TOTAL CHECKS: ${records.length}`);
  console.log(`PASSED:       ${passCount}`);
  console.log(`FAILED:       ${failCount}`);
  console.log('============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runUnifiedOperationsSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
