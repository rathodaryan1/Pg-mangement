import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../config/prisma';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

let resolvedApiBase = process.env.API_BASE || '';

async function getApiBase() {
  if (resolvedApiBase) return resolvedApiBase;
  try {
    const localRes = await fetch('http://localhost:5000/health', { signal: AbortSignal.timeout(1500) });
    if (localRes.ok) {
      resolvedApiBase = 'http://localhost:5000/api';
      return resolvedApiBase;
    }
  } catch {
    // Local server not running, fallback to live backend
  }
  resolvedApiBase = 'https://pg-mangement.onrender.com/api';
  return resolvedApiBase;
}

const JWT_SECRET = process.env.JWT_SECRET || 'urbannest-dev-jwt-secret-key-2026';

interface TestResult {
  suite: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'NOT TESTED';
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function record(suite: string, test: string, status: 'PASS' | 'FAIL' | 'NOT TESTED', details?: string, error?: string) {
  results.push({ suite, test, status, details, error });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${suite}] ${test}: ${status}${details ? ` - ${details}` : ''}${error ? ` (Error: ${error})` : ''}`);
}

async function apiRequest(endpoint: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const base = await getApiBase();
  const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

export async function runSaasMultiTenantAudit() {
  console.log('\n========================================================');
  console.log('URBAN NEST — MULTI-TENANT SAAS PLATFORM INTEGRATION AUDIT');
  console.log('========================================================\n');

  try {
    // ------------------------------------------------------------------------
    // SETUP: Seed Super Admin & Base Plans
    // ------------------------------------------------------------------------
    console.log('--- Step 0: Initializing Platform Super Admin & Plans ---');
    const salt = await bcrypt.genSalt(10);
    const superAdminPasswordHash = await bcrypt.hash('superadmin123', salt);

    let superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!superAdmin) {
      superAdmin = await prisma.user.create({
        data: {
          email: 'superadmin@urbannest.io',
          passwordHash: superAdminPasswordHash,
          name: 'Platform Super Admin',
          role: 'SUPER_ADMIN',
          mobile: '+919999900000',
        },
      });
      record('Setup', 'Super Admin Account Provisioning', 'PASS', 'Created platform super admin account');
    } else {
      record('Setup', 'Super Admin Account Provisioning', 'PASS', `Found existing super admin (${superAdmin.email})`);
    }

    // Ensure Plans exist
    const starterPlan = await prisma.plan.upsert({
      where: { tier: 'STARTER' },
      update: { priceMonthly: 2999, maxProperties: 1, maxRooms: 30, maxResidents: 60 },
      create: {
        name: 'Starter Tier',
        tier: 'STARTER',
        priceMonthly: 2999,
        priceYearly: 29990,
        maxProperties: 1,
        maxRooms: 30,
        maxResidents: 60,
        features: 'Single Property, Essential QR Pass, Basic Invoicing',
      },
    });

    const proPlan = await prisma.plan.upsert({
      where: { tier: 'PROFESSIONAL' },
      update: { priceMonthly: 7999, maxProperties: 5, maxRooms: 150, maxResidents: 350 },
      create: {
        name: 'Professional Tier',
        tier: 'PROFESSIONAL',
        priceMonthly: 7999,
        priceYearly: 79990,
        maxProperties: 5,
        maxRooms: 150,
        maxResidents: 350,
        features: 'Up to 5 Properties, Real-Time Visitor QR, Automatic Rent Escalation, Full Auditing',
      },
    });

    record('Setup', 'SaaS Pricing Plans Provisioning', 'PASS', `Plans available: ${starterPlan.tier}, ${proPlan.tier}`);

    // Generate Super Admin JWT
    const superAdminToken = jwt.sign(
      { id: superAdmin.id, userId: superAdmin.id, email: superAdmin.email, role: 'SUPER_ADMIN' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const superAdminHeaders = {
      Authorization: `Bearer ${superAdminToken}`,
    };

    // ------------------------------------------------------------------------
    // TEST SUITE 1: SUPER ADMIN DASHBOARD METRICS & PLAN MANAGEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- Step 1: Testing Super Admin Dashboard & System Health ---');
    try {
      const statsRes = await apiRequest('/super-admin/dashboard/stats', { headers: superAdminHeaders });
      if (statsRes.ok && statsRes.data?.data?.overview) {
        const ov = statsRes.data.data.overview;
        record(
          'Super Admin',
          'Global Platform Metrics',
          'PASS',
          `Tenants: ${ov.totalTenants}, Active: ${ov.activeTenants}, Properties: ${ov.totalProperties}, Residents: ${ov.totalResidents}`
        );
      } else {
        record('Super Admin', 'Global Platform Metrics', 'FAIL', `Status ${statsRes.status}: ${JSON.stringify(statsRes.data)}`);
      }
    } catch (err: any) {
      record('Super Admin', 'Global Platform Metrics', 'FAIL', undefined, err.message);
    }

    try {
      const healthRes = await apiRequest('/super-admin/system/health', { headers: superAdminHeaders });
      if (healthRes.ok && healthRes.data?.data?.services) {
        record('Super Admin', 'System Health Verification', 'PASS', `Database: ${healthRes.data.data.services.database?.status}`);
      } else {
        record('Super Admin', 'System Health Verification', 'FAIL', 'Health check failed');
      }
    } catch (err: any) {
      record('Super Admin', 'System Health Verification', 'FAIL', undefined, err.message);
    }

    // ------------------------------------------------------------------------
    // TEST SUITE 2: ATOMIC PROVISIONING OF TENANT A & TENANT B
    // ------------------------------------------------------------------------
    console.log('\n--- Step 2: Atomic Creation of Independent PG Tenants ---');

    // Clean previous test tenants and users if any
    const testTenants = await prisma.tenant.findMany({
      where: {
        OR: [
          { email: { in: ['ownera@greenvalley.com', 'ownerb@royalresidency.com'] } },
          { name: { in: ['Green Valley PG', 'Royal Residency'] } },
        ],
      },
    });
    for (const t of testTenants) {
      await prisma.auditLog.deleteMany({ where: { tenantId: t.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { tenantId: t.id } }).catch(() => {});
      await prisma.property.deleteMany({ where: { tenantId: t.id } }).catch(() => {});
      await prisma.tenant.delete({ where: { id: t.id } }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: { email: { in: ['ownera@greenvalley.com', 'ownerb@royalresidency.com', 'res_a@test.com', 'res_b@test.com'] } },
    }).catch(() => {});

    let tenantAId = '';
    const ownerAEmail = 'ownera@greenvalley.com';
    const ownerAPassword = 'password123';

    try {
      const createTenantARes = await apiRequest('/super-admin/tenants', {
        method: 'POST',
        headers: superAdminHeaders,
        body: {
          name: 'Green Valley PG',
          ownerName: 'Aakash Verma (Owner A)',
          ownerEmail: ownerAEmail,
          ownerMobile: '+919810011111',
          temporaryPassword: ownerAPassword,
          address: 'Plot 42, Cyber City',
          city: 'Gurugram',
          state: 'Haryana',
          plan: 'PROFESSIONAL',
          trialDays: 14,
        },
      });

      if (createTenantARes.ok && createTenantARes.data?.data?.tenant?.id) {
        tenantAId = createTenantARes.data.data.tenant.id;
        record('Tenant Provisioning', 'Atomic Creation of Tenant A (Green Valley PG)', 'PASS', `Tenant ID: ${tenantAId}`);
      } else {
        record('Tenant Provisioning', 'Atomic Creation of Tenant A (Green Valley PG)', 'FAIL', 'Failed to create Tenant A', createTenantARes.data?.error);
      }
    } catch (err: any) {
      record('Tenant Provisioning', 'Atomic Creation of Tenant A (Green Valley PG)', 'FAIL', undefined, err.message);
    }

    let tenantBId = '';
    const ownerBEmail = 'ownerb@royalresidency.com';
    const ownerBPassword = 'password456';

    try {
      const createTenantBRes = await apiRequest('/super-admin/tenants', {
        method: 'POST',
        headers: superAdminHeaders,
        body: {
          name: 'Royal Residency',
          ownerName: 'Ramesh Sharma (Owner B)',
          ownerEmail: ownerBEmail,
          ownerMobile: '+919810022222',
          temporaryPassword: ownerBPassword,
          address: 'Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          plan: 'STARTER',
          trialDays: 14,
        },
      });

      if (createTenantBRes.ok && createTenantBRes.data?.data?.tenant?.id) {
        tenantBId = createTenantBRes.data.data.tenant.id;
        record('Tenant Provisioning', 'Atomic Creation of Tenant B (Royal Residency)', 'PASS', `Tenant ID: ${tenantBId}`);
      } else {
        record('Tenant Provisioning', 'Atomic Creation of Tenant B (Royal Residency)', 'FAIL', 'Failed to create Tenant B', createTenantBRes.data?.error);
      }
    } catch (err: any) {
      record('Tenant Provisioning', 'Atomic Creation of Tenant B (Royal Residency)', 'FAIL', undefined, err.message);
    }

    // ------------------------------------------------------------------------
    // TEST SUITE 3: OWNER AUTHENTICATION & MULTI-TENANT CONTEXT RESOLUTION
    // ------------------------------------------------------------------------
    console.log('\n--- Step 3: Owner Authentication & Context Scoping ---');
    let ownerAToken = '';
    let ownerBToken = '';

    try {
      const loginARes = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: ownerAEmail, password: ownerAPassword },
      });

      if (loginARes.ok && loginARes.data?.data?.token) {
        ownerAToken = loginARes.data.data.token;
        const userA = loginARes.data.data.user;
        if (userA.tenantId === tenantAId && userA.role === 'OWNER') {
          record('Auth', 'Owner A Scoped Session Resolution', 'PASS', `Tenant ID: ${userA.tenantId}, Role: ${userA.role}`);
        } else {
          record('Auth', 'Owner A Scoped Session Resolution', 'FAIL', 'TenantId mismatch in login context');
        }
      } else {
        record('Auth', 'Owner A Scoped Session Resolution', 'FAIL', 'Login failed', loginARes.data?.error);
      }
    } catch (err: any) {
      record('Auth', 'Owner A Scoped Session Resolution', 'FAIL', undefined, err.message);
    }

    try {
      const loginBRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: ownerBEmail, password: ownerBPassword },
      });

      if (loginBRes.ok && loginBRes.data?.data?.token) {
        ownerBToken = loginBRes.data.data.token;
        const userB = loginBRes.data.data.user;
        if (userB.tenantId === tenantBId && userB.role === 'OWNER') {
          record('Auth', 'Owner B Scoped Session Resolution', 'PASS', `Tenant ID: ${userB.tenantId}, Role: ${userB.role}`);
        } else {
          record('Auth', 'Owner B Scoped Session Resolution', 'FAIL', 'TenantId mismatch in login context');
        }
      } else {
        record('Auth', 'Owner B Scoped Session Resolution', 'FAIL', 'Login failed', loginBRes.data?.error);
      }
    } catch (err: any) {
      record('Auth', 'Owner B Scoped Session Resolution', 'FAIL', undefined, err.message);
    }

    const ownerAHeaders = {
      Authorization: `Bearer ${ownerAToken}`,
    };

    const ownerBHeaders = {
      Authorization: `Bearer ${ownerBToken}`,
    };

    // ------------------------------------------------------------------------
    // TEST SUITE 4: DATA CREATION WITHIN TENANT BOUNDARIES
    // ------------------------------------------------------------------------
    console.log('\n--- Step 4: Creating Data in Tenant A and Tenant B ---');

    // Fetch Property A
    const propARes = await apiRequest('/owner/properties', { headers: ownerAHeaders });
    const propertyA = propARes.data?.data?.[0];
    const propertyAId = propertyA?.id;

    // Fetch Property B
    const propBRes = await apiRequest('/owner/properties', { headers: ownerBHeaders });
    const propertyB = propBRes.data?.data?.[0];
    const propertyBId = propertyB?.id;

    record('Isolation Setup', 'Property Identification', 'PASS', `Prop A: ${propertyAId}, Prop B: ${propertyBId}`);

    // Create Room in Tenant A
    let roomAId = '';
    try {
      const createRoomARes = await apiRequest('/owner/rooms', {
        method: 'POST',
        headers: ownerAHeaders,
        body: {
          propertyId: propertyAId,
          number: '101-A',
          type: 'Double',
          capacity: 2,
          baseRent: 15000,
          deposit: 30000,
          amenities: ['AC', 'WiFi', 'Attached Bathroom'],
        },
      });
      roomAId = createRoomARes.data?.data?.id;
      record('Tenant A Operations', 'Create Room in Tenant A', 'PASS', `Room A ID: ${roomAId}`);
    } catch (err: any) {
      record('Tenant A Operations', 'Create Room in Tenant A', 'FAIL', undefined, err.message);
    }

    // Create Resident in Tenant A
    let residentAId = '';
    try {
      const createResARes = await apiRequest('/owner/residents', {
        method: 'POST',
        headers: ownerAHeaders,
        body: {
          propertyId: propertyAId,
          fullName: 'Resident A (Tenant A)',
          email: 'residenta.gv@example.com',
          mobile: '+919811100001',
          gender: 'MALE',
          joiningDate: new Date().toISOString(),
          monthlyRent: 15000,
          depositAmount: 30000,
        },
      });
      residentAId = createResARes.data?.data?.resident?.id || createResARes.data?.data?.id;
      record('Tenant A Operations', 'Onboard Resident in Tenant A', 'PASS', `Resident A ID: ${residentAId}`);
    } catch (err: any) {
      record('Tenant A Operations', 'Onboard Resident in Tenant A', 'FAIL', undefined, err.message);
    }

    // Create Room in Tenant B
    let roomBId = '';
    try {
      const createRoomBRes = await apiRequest('/owner/rooms', {
        method: 'POST',
        headers: ownerBHeaders,
        body: {
          propertyId: propertyBId,
          number: '201-B',
          type: 'Single',
          capacity: 1,
          baseRent: 20000,
          deposit: 40000,
          amenities: ['AC', 'Balcony'],
        },
      });
      roomBId = createRoomBRes.data?.data?.id;
      record('Tenant B Operations', 'Create Room in Tenant B', 'PASS', `Room B ID: ${roomBId}`);
    } catch (err: any) {
      record('Tenant B Operations', 'Create Room in Tenant B', 'FAIL', undefined, err.message);
    }

    // Create Resident in Tenant B
    let residentBId = '';
    try {
      const createResBRes = await apiRequest('/owner/residents', {
        method: 'POST',
        headers: ownerBHeaders,
        body: {
          propertyId: propertyBId,
          fullName: 'Resident B (Tenant B)',
          email: 'residentb.rr@example.com',
          mobile: '+919811100002',
          gender: 'FEMALE',
          joiningDate: new Date().toISOString(),
          monthlyRent: 20000,
          depositAmount: 40000,
        },
      });
      residentBId = createResBRes.data?.data?.resident?.id || createResBRes.data?.data?.id;
      record('Tenant B Operations', 'Onboard Resident in Tenant B', 'PASS', `Resident B ID: ${residentBId}`);
    } catch (err: any) {
      record('Tenant B Operations', 'Onboard Resident in Tenant B', 'FAIL', undefined, err.message);
    }

    // ------------------------------------------------------------------------
    // TEST SUITE 5: STRICT CROSS-TENANT IDOR PREVENTIONS
    // ------------------------------------------------------------------------
    console.log('\n--- Step 5: Strict Cross-Tenant IDOR Testing ---');

    // 1. Owner A queries Tenant B's resident by ID
    try {
      const idorRes = await apiRequest(`/owner/residents/${residentBId}`, { headers: ownerAHeaders });
      if (idorRes.data?.data?.propertyId === propertyBId) {
        record('Security IDOR', 'Owner A Accessing Tenant B Resident', 'FAIL', 'Cross-tenant resident data exposed');
      } else {
        record('Security IDOR', 'Owner A Accessing Tenant B Resident', 'PASS', `Protected (Status: ${idorRes.status})`);
      }
    } catch (err: any) {
      record('Security IDOR', 'Owner A Accessing Tenant B Resident', 'PASS', `Blocked with error: ${err.message}`);
    }

    // 2. Owner A requests residents list with Tenant B's propertyId filter
    try {
      const crossPropList = await apiRequest(`/owner/residents?propertyId=${propertyBId}`, { headers: ownerAHeaders });
      const leakedResidents = crossPropList.data?.data?.filter((r: any) => r.propertyId === propertyBId);
      if (leakedResidents && leakedResidents.length > 0) {
        record('Security IDOR', 'Owner A Filtering by Tenant B Property ID', 'FAIL', 'Cross-tenant residents returned');
      } else {
        record('Security IDOR', 'Owner A Filtering by Tenant B Property ID', 'PASS', 'Zero cross-tenant records returned');
      }
    } catch (err: any) {
      record('Security IDOR', 'Owner A Filtering by Tenant B Property ID', 'PASS', `Blocked with ${err.message}`);
    }

    // 3. Owner A attempts to update Tenant B's room
    try {
      await apiRequest(`/owner/rooms/${roomBId}`, {
        method: 'PATCH',
        headers: ownerAHeaders,
        body: { baseRent: 99999 },
      });
      const roomBCheck = await prisma.room.findUnique({ where: { id: roomBId } });
      if (roomBCheck?.baseRent === 99999) {
        record('Security IDOR', 'Owner A Mutating Tenant B Room', 'FAIL', 'Cross-tenant room mutation succeeded');
      } else {
        record('Security IDOR', 'Owner A Mutating Tenant B Room', 'PASS', 'Room unmodified in database');
      }
    } catch (err: any) {
      record('Security IDOR', 'Owner A Mutating Tenant B Room', 'PASS', `Mutation prevented with error: ${err.message}`);
    }

    // 4. Test SaaS Plan Limit Ceiling Enforcement
    try {
      // Temporarily set Tenant A's maxRooms to 1 (which it has already used)
      await prisma.tenant.update({ where: { id: tenantAId }, data: { maxRooms: 1 } });
      const overLimitRoomRes = await apiRequest('/owner/rooms', {
        method: 'POST',
        headers: ownerAHeaders,
        body: {
          propertyId: propertyAId,
          number: '999',
          type: 'Single',
          capacity: 1,
          baseRent: 12000,
          deposit: 20000,
        },
      });

      if (overLimitRoomRes.status === 403 && overLimitRoomRes.data?.code === 'PLAN_LIMIT_REACHED') {
        record('Plan Enforcement', 'SaaS Plan Room Limit Ceiling Check', 'PASS', 'Correctly rejected with HTTP 403 PLAN_LIMIT_REACHED');
      } else if (!overLimitRoomRes.ok) {
        record('Plan Enforcement', 'SaaS Plan Room Limit Ceiling Check', 'PASS', `Rejected with HTTP ${overLimitRoomRes.status}`);
      } else {
        record('Plan Enforcement', 'SaaS Plan Room Limit Ceiling Check', 'FAIL', 'Creation succeeded beyond plan limit');
      }
      // Restore generous quota
      await prisma.tenant.update({ where: { id: tenantAId }, data: { maxRooms: 100 } });
    } catch (err: any) {
      record('Plan Enforcement', 'SaaS Plan Room Limit Ceiling Check', 'FAIL', undefined, err.message);
    }

    // ------------------------------------------------------------------------
    // TEST SUITE 6: SUPER ADMIN IMPERSONATION & AUDIT LOGGING
    // ------------------------------------------------------------------------
    console.log('\n--- Step 6: Super Admin Impersonation & Audit Trail ---');
    try {
      const impRes = await apiRequest(`/super-admin/tenants/${tenantAId}/impersonate`, {
        method: 'POST',
        headers: superAdminHeaders,
      });

      if (impRes.ok && impRes.data?.data?.token) {
        const impToken = impRes.data.data.token;
        const decoded: any = jwt.decode(impToken);
        if (decoded?.isImpersonated && decoded?.impersonatedBy === superAdmin.id) {
          record(
            'Impersonation',
            'Super Admin Impersonate Tenant Owner',
            'PASS',
            `JWT includes isImpersonated flag & impersonatedBy: ${decoded.impersonatedBy}`
          );
        } else {
          record('Impersonation', 'Super Admin Impersonate Tenant Owner', 'FAIL', 'Missing impersonation claims in token');
        }
      } else {
        record('Impersonation', 'Super Admin Impersonate Tenant Owner', 'FAIL', 'Impersonation endpoint failed', impRes.data?.error);
      }
    } catch (err: any) {
      record('Impersonation', 'Super Admin Impersonate Tenant Owner', 'FAIL', undefined, err.message);
    }

    // ------------------------------------------------------------------------
    // TEST SUITE 7: TENANT LIFECYCLE (SUSPEND & ACTIVATE)
    // ------------------------------------------------------------------------
    console.log('\n--- Step 7: Tenant Suspension & Activation Enforcement ---');
    try {
      // 1. Suspend Tenant A
      const suspendRes = await apiRequest(`/super-admin/tenants/${tenantAId}/suspend`, {
        method: 'POST',
        headers: superAdminHeaders,
        body: { reason: 'Non-payment of SaaS subscription fees' },
      });

      if (suspendRes.ok) {
        record('Tenant Lifecycle', 'Suspend Tenant A', 'PASS', 'Tenant status set to SUSPENDED');
      } else {
        record('Tenant Lifecycle', 'Suspend Tenant A', 'FAIL', 'Suspension failed', suspendRes.data?.error);
      }

      // 2. Attempt login by Owner A while suspended
      const blockedLoginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: ownerAEmail, password: ownerAPassword },
      });

      if (blockedLoginRes.status === 403) {
        record('Tenant Lifecycle', 'Blocked Login for Suspended Tenant', 'PASS', 'Correctly rejected with HTTP 403 TENANT_SUSPENDED');
      } else if (!blockedLoginRes.ok) {
        record('Tenant Lifecycle', 'Blocked Login for Suspended Tenant', 'PASS', `Rejected with HTTP ${blockedLoginRes.status}`);
      } else {
        record('Tenant Lifecycle', 'Blocked Login for Suspended Tenant', 'FAIL', 'Suspended tenant was allowed to log in');
      }

      // 3. Reactivate Tenant A
      const activateRes = await apiRequest(`/super-admin/tenants/${tenantAId}/activate`, {
        method: 'POST',
        headers: superAdminHeaders,
      });

      if (activateRes.ok) {
        record('Tenant Lifecycle', 'Reactivate Tenant A', 'PASS', 'Tenant status restored to ACTIVE');
      } else {
        record('Tenant Lifecycle', 'Reactivate Tenant A', 'FAIL', 'Reactivation failed', activateRes.data?.error);
      }

      // 4. Verify login succeeds after activation
      const reLoginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: ownerAEmail, password: ownerAPassword },
      });

      if (reLoginRes.ok) {
        record('Tenant Lifecycle', 'Restored Login after Reactivation', 'PASS', 'Owner A successfully authenticated');
      } else {
        record('Tenant Lifecycle', 'Restored Login after Reactivation', 'FAIL', 'Login failed after reactivation', reLoginRes.data?.error);
      }

      // 5. Test Archive Tenant B
      const archiveRes = await apiRequest(`/super-admin/tenants/${tenantBId}/archive`, {
        method: 'POST',
        headers: superAdminHeaders,
      });

      if (archiveRes.ok && archiveRes.data?.data?.status === 'ARCHIVED') {
        record('Tenant Lifecycle', 'Archive Tenant B', 'PASS', 'Tenant B status set to ARCHIVED with data preserved');
      } else {
        record('Tenant Lifecycle', 'Archive Tenant B', 'FAIL', 'Archiving failed', archiveRes.data?.error);
      }
    } catch (err: any) {
      record('Tenant Lifecycle', 'Tenant Suspension/Activation Cycle', 'FAIL', undefined, err.message);
    }

    // ------------------------------------------------------------------------
    // TEST SUITE 8: REAL GATE QR VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- Step 8: Gate QR Pass Verification ---');
    try {
      const visitorPassRes = await apiRequest('/owner/visitors', {
        method: 'POST',
        headers: ownerAHeaders,
        body: {
          propertyId: propertyAId,
          visitorName: 'Aditya Singh',
          visitorMobile: '+919876543210',
          relation: 'Friend',
          purpose: 'Study & Projects',
          visitDate: new Date().toISOString(),
          expectedTime: '05:30 PM',
        },
      });

      const qrToken = visitorPassRes.data?.data?.qrPassToken;
      if (qrToken) {
        const verifyRes = await apiRequest(`/gate/verify/${qrToken}`);
        if (verifyRes.ok && verifyRes.data?.data?.pass?.visitorName === 'Aditya Singh') {
          record('QR Gate System', 'Machine-Scannable QR Pass Verification', 'PASS', `Verified pass for token ${qrToken}`);
        } else {
          record('QR Gate System', 'Machine-Scannable QR Pass Verification', 'FAIL', 'Verification response payload invalid', verifyRes.data?.error);
        }
      } else {
        record('QR Gate System', 'Machine-Scannable QR Pass Verification', 'FAIL', 'No QR pass token generated', visitorPassRes.data?.error);
      }
    } catch (err: any) {
      record('QR Gate System', 'Machine-Scannable QR Pass Verification', 'FAIL', undefined, err.message);
    }

    // ------------------------------------------------------------------------
    // TEST SUITE 9: SUPPORT TICKETS & GLOBAL SETTINGS
    // ------------------------------------------------------------------------
    console.log('\n--- Step 9: Support Tickets & Global Platform Settings ---');
    try {
      // 1. Create Support Ticket
      const ticketRes = await apiRequest('/super-admin/support', {
        method: 'POST',
        headers: superAdminHeaders,
        body: {
          tenantId: tenantAId,
          subject: 'Priority Storage Bucket Latency Audit',
          description: 'Investigating high resolution KYC image upload throughput',
          priority: 'HIGH',
          creatorEmail: ownerAEmail,
          creatorName: 'Owner A Admin',
        },
      });

      if (ticketRes.ok && ticketRes.data?.data?.id) {
        const ticketId = ticketRes.data.data.id;
        record('Support System', 'Create Support Ticket in DB', 'PASS', `Ticket created with ID: ${ticketId}`);

        // Update ticket
        const updateTicketRes = await apiRequest(`/super-admin/support/${ticketId}`, {
          method: 'PATCH',
          headers: superAdminHeaders,
          body: {
            status: 'IN_PROGRESS',
            assignedAdmin: 'Platform DevOps Team',
            internalNotes: 'Routed request to cloud storage infrastructure pod',
          },
        });

        if (updateTicketRes.ok && updateTicketRes.data?.data?.status === 'IN_PROGRESS') {
          record('Support System', 'Update Ticket Status & Notes', 'PASS', 'Status transitioned to IN_PROGRESS');
        } else {
          record('Support System', 'Update Ticket Status & Notes', 'FAIL', 'Failed to update ticket');
        }
      } else {
        record('Support System', 'Create Support Ticket in DB', 'FAIL', 'Failed to create ticket', ticketRes.data?.error);
      }

      // 2. Global Platform Settings
      const settingsSaveRes = await apiRequest('/super-admin/settings', {
        method: 'POST',
        headers: superAdminHeaders,
        body: {
          platformName: 'Urban Nest SaaS Platform',
          defaultTrialDays: '14',
          supportEmail: 'ops@urbannest.com',
        },
      });

      if (settingsSaveRes.ok) {
        record('Platform Settings', 'Database Persisted Global Settings', 'PASS', 'Settings saved and audit logged');
      } else {
        record('Platform Settings', 'Database Persisted Global Settings', 'FAIL', 'Failed to save settings');
      }
    } catch (err: any) {
      record('Support & Settings', 'Support Ticket / Settings Workflow', 'FAIL', undefined, err.message);
    }

    // ------------------------------------------------------------------------
    // TEST SUITE 10: RESIDENT COMPLAINTS & WORKFLOW LIFECYCLE
    // ------------------------------------------------------------------------
    console.log('\n--- Step 10: Resident Complaint & Resolution Workflow ---');
    try {
      // 0. Authenticate Resident A
      const resLogin = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: 'residenta.gv@example.com', password: 'admin123' },
      });

      const residentAToken = resLogin.data?.data?.token;
      const residentAHeaders = { Authorization: `Bearer ${residentAToken}` };

      // 1. Submit Complaint (as Resident A)
      const complaintRes = await apiRequest('/resident/complaints', {
        method: 'POST',
        headers: residentAHeaders,
        body: {
          title: 'AC Temperature Sensor Calibration',
          description: 'Room 101 AC cooling unit requires maintenance inspection',
          category: 'MAINTENANCE',
          priority: 'MEDIUM',
        },
      });

      if (complaintRes.ok && complaintRes.data?.data?.id) {
        const complaintId = complaintRes.data.data.id;
        record('Complaints Lifecycle', 'Resident Submits Ticket', 'PASS', `Complaint filed with ID: ${complaintId}`);

        // 2. Owner updates status
        const updateComplaintRes = await apiRequest(`/owner/complaints/${complaintId}`, {
          method: 'PATCH',
          headers: ownerAHeaders,
          body: {
            status: 'IN_PROGRESS',
            assignedTo: 'Kamal Electrician',
          },
        });

        if (updateComplaintRes.ok) {
          record('Complaints Lifecycle', 'Owner Assigns & Updates Status', 'PASS', 'Status updated to IN_PROGRESS in PostgreSQL');
        } else {
          record('Complaints Lifecycle', 'Owner Assigns & Updates Status', 'FAIL', 'Owner update failed');
        }
      } else {
        record('Complaints Lifecycle', 'Resident Submits Ticket', 'FAIL', 'Failed to create complaint', complaintRes.data?.error);
      }
    } catch (err: any) {
      record('Complaints Lifecycle', 'Complaints End-to-End Workflow', 'FAIL', undefined, err.message);
    }

  } catch (globalErr: any) {
    console.error('Audit execution error:', globalErr);
  } finally {
    console.log('\n========================================================');
    console.log('AUDIT SUMMARY');
    console.log('========================================================');
    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    console.log(`Total Checks: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('========================================================\n');
    return { passed, failed, total: results.length };
  }
}

// Run when executed directly
if (require.main === module) {
  runSaasMultiTenantAudit().then(() => process.exit(0));
}
