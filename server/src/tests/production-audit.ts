import { config } from '../config/env';

const PROD_URL = process.env.TARGET_URL || 'https://pg-mangement.onrender.com/api';

interface TestResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'NOT TESTED';
  detail: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, status: 'PASS' | 'FAIL' | 'NOT TESTED', detail: string) {
  results.push({ category, name, status, detail });
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  console.log(`[${status}] ${category} > ${name}: ${detail}`);
}

async function runProductionAudit() {
  console.log('====================================================');
  console.log('  URBAN NEST — LIVE PRODUCTION AUDIT TEST SUITE    ');
  console.log('  Target Endpoint: ' + PROD_URL);
  console.log('====================================================\n');

  let ownerToken = '';
  let residentToken = '';

  // 1. Health Endpoint Audit
  try {
    const res = await fetch(`${PROD_URL}/health`);
    const data: any = await res.json();
    if (res.status === 200 && data.status === 'HEALTHY') {
      record('HEALTH', 'GET /api/health', 'PASS', `Status: 200, DB: ${data.database}`);
    } else {
      record('HEALTH', 'GET /api/health', 'FAIL', `Unexpected payload: ${JSON.stringify(data)}`);
    }
  } catch (err: any) {
    record('HEALTH', 'GET /api/health', 'FAIL', err.message);
  }

  // 2. Authentication: Owner Login
  try {
    const res = await fetch(`${PROD_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@pg.com', password: 'admin123' })
    });
    const data: any = await res.json();
    if (res.status === 200 && data.success && data.data?.token) {
      ownerToken = data.data.token;
      record('AUTH', 'Owner Login (admin123)', 'PASS', `JWT token retrieved for ${data.data.user?.email}`);
    } else {
      record('AUTH', 'Owner Login', 'FAIL', `Status ${res.status}: ${data?.message}`);
    }
  } catch (err: any) {
    record('AUTH', 'Owner Login', 'FAIL', err.message);
  }

  // 3. Authentication: Resident Login
  try {
    const res = await fetch(`${PROD_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aakash.v@gmail.com', password: 'admin123' })
    });
    const data: any = await res.json();
    if (res.status === 200 && data.success && data.data?.token) {
      residentToken = data.data.token;
      record('AUTH', 'Resident Login (admin123)', 'PASS', `JWT token retrieved for ${data.data.user?.email}`);
    } else {
      record('AUTH', 'Resident Login', 'FAIL', `Status ${res.status}: ${data?.message}`);
    }
  } catch (err: any) {
    record('AUTH', 'Resident Login', 'FAIL', err.message);
  }

  // 4. Authentication: Invalid Password
  try {
    const res = await fetch(`${PROD_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@pg.com', password: 'wrong_password_999' })
    });
    const data: any = await res.json();
    if (res.status === 401 && !data.success) {
      record('AUTH', 'Invalid Password Rejection', 'PASS', 'HTTP 401 returned properly');
    } else {
      record('AUTH', 'Invalid Password Rejection', 'FAIL', `Expected 401, got ${res.status}`);
    }
  } catch (err: any) {
    record('AUTH', 'Invalid Password Rejection', 'FAIL', err.message);
  }

  // 5. Authentication: /auth/me verification
  if (ownerToken) {
    try {
      const res = await fetch(`${PROD_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.data?.role === 'OWNER') {
        record('AUTH', 'GET /api/auth/me (Owner)', 'PASS', `Identified as ${data.data.email}`);
      } else {
        record('AUTH', 'GET /api/auth/me (Owner)', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('AUTH', 'GET /api/auth/me (Owner)', 'FAIL', err.message);
    }
  }

  // 6. RBAC & Security: Resident cannot access Owner Dashboard
  if (residentToken) {
    try {
      const res = await fetch(`${PROD_URL}/owner/dashboard`, {
        headers: { Authorization: `Bearer ${residentToken}` }
      });
      if (res.status === 403) {
        record('RBAC', 'Resident -> /api/owner/dashboard', 'PASS', 'HTTP 403 Forbidden strictly enforced');
      } else {
        record('RBAC', 'Resident -> /api/owner/dashboard', 'FAIL', `Expected 403 Forbidden, got ${res.status}`);
      }
    } catch (err: any) {
      record('RBAC', 'Resident -> /api/owner/dashboard', 'FAIL', err.message);
    }
  }

  // 7. Security: Unauthenticated request rejected
  try {
    const res = await fetch(`${PROD_URL}/owner/properties`);
    if (res.status === 401) {
      record('SECURITY', 'Unauthenticated Protected Route', 'PASS', 'HTTP 401 Unauthorized strictly enforced');
    } else {
      record('SECURITY', 'Unauthenticated Protected Route', 'FAIL', `Expected 401, got ${res.status}`);
    }
  } catch (err: any) {
    record('SECURITY', 'Unauthenticated Protected Route', 'FAIL', err.message);
  }

  // 8. Owner APIs Testing
  if (ownerToken) {
    // 8a. Dashboard
    try {
      const res = await fetch(`${PROD_URL}/owner/dashboard`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.data?.kpis) {
        record('OWNER_API', 'GET /api/owner/dashboard', 'PASS', `KPIs loaded: rooms=${data.data.kpis.totalRooms}, beds=${data.data.kpis.totalBeds}`);
      } else {
        record('OWNER_API', 'GET /api/owner/dashboard', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/dashboard', 'FAIL', err.message);
    }

    // 8b. Properties
    try {
      const res = await fetch(`${PROD_URL}/owner/properties`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/properties', 'PASS', `Loaded ${data.data.length} properties`);
      } else {
        record('OWNER_API', 'GET /api/owner/properties', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/properties', 'FAIL', err.message);
    }

    // 8c. Rooms
    try {
      const res = await fetch(`${PROD_URL}/owner/rooms`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/rooms', 'PASS', `Loaded ${data.data.length} rooms`);
      } else {
        record('OWNER_API', 'GET /api/owner/rooms', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/rooms', 'FAIL', err.message);
    }

    // 8d. Residents
    try {
      const res = await fetch(`${PROD_URL}/owner/residents`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/residents', 'PASS', `Loaded ${data.data.length} resident records`);
      } else {
        record('OWNER_API', 'GET /api/owner/residents', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/residents', 'FAIL', err.message);
    }

    // 8e. Payments
    try {
      const res = await fetch(`${PROD_URL}/owner/payments`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/payments', 'PASS', `Loaded ${data.data.length} payment records`);
      } else {
        record('OWNER_API', 'GET /api/owner/payments', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/payments', 'FAIL', err.message);
    }

    // 8f. Visitors
    try {
      const res = await fetch(`${PROD_URL}/owner/visitors`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/visitors', 'PASS', `Loaded ${data.data.length} visitor passes`);
      } else {
        record('OWNER_API', 'GET /api/owner/visitors', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/visitors', 'FAIL', err.message);
    }

    // 8g. Maintenance & Complaints
    try {
      const res = await fetch(`${PROD_URL}/owner/complaints`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/complaints', 'PASS', `Loaded ${data.data.length} complaints`);
      } else {
        record('OWNER_API', 'GET /api/owner/complaints', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/complaints', 'FAIL', err.message);
    }

    // 8h. Staff
    try {
      const res = await fetch(`${PROD_URL}/owner/staff`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/staff', 'PASS', `Loaded ${data.data.length} staff members`);
      } else {
        record('OWNER_API', 'GET /api/owner/staff', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/staff', 'FAIL', err.message);
    }

    // 8i. Inventory
    try {
      const res = await fetch(`${PROD_URL}/owner/inventory`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/inventory', 'PASS', `Loaded ${data.data.length} items`);
      } else {
        record('OWNER_API', 'GET /api/owner/inventory', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/inventory', 'FAIL', err.message);
    }

    // 8j. Expenses
    try {
      const res = await fetch(`${PROD_URL}/owner/expenses`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/expenses', 'PASS', `Loaded ${data.data.length} expenses`);
      } else {
        record('OWNER_API', 'GET /api/owner/expenses', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/expenses', 'FAIL', err.message);
    }

    // 8k. Leave Requests
    try {
      const res = await fetch(`${PROD_URL}/owner/leave`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/leave', 'PASS', `Loaded ${data.data.length} leave requests`);
      } else {
        record('OWNER_API', 'GET /api/owner/leave', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/leave', 'FAIL', err.message);
    }

    // 8l. SOS Events
    try {
      const res = await fetch(`${PROD_URL}/owner/sos`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/sos', 'PASS', `Loaded ${data.data.length} SOS events`);
      } else {
        record('OWNER_API', 'GET /api/owner/sos', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/sos', 'FAIL', err.message);
    }

    // 8m. Audit Logs
    try {
      const res = await fetch(`${PROD_URL}/owner/audit-logs`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('OWNER_API', 'GET /api/owner/audit-logs', 'PASS', `Loaded ${data.data.length} audit trail records`);
      } else {
        record('OWNER_API', 'GET /api/owner/audit-logs', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('OWNER_API', 'GET /api/owner/audit-logs', 'FAIL', err.message);
    }
  }

  // 9. Resident APIs Testing
  if (residentToken) {
    // 9a. Resident Dashboard
    try {
      const res = await fetch(`${PROD_URL}/resident/dashboard`, {
        headers: { Authorization: `Bearer ${residentToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        record('RESIDENT_API', 'GET /api/resident/dashboard', 'PASS', `Resident: ${data.data.resident?.name || data.data.resident?.fullName}`);
      } else {
        record('RESIDENT_API', 'GET /api/resident/dashboard', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('RESIDENT_API', 'GET /api/resident/dashboard', 'FAIL', err.message);
    }

    // 9b. Resident Room
    try {
      const res = await fetch(`${PROD_URL}/resident/room`, {
        headers: { Authorization: `Bearer ${residentToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        record('RESIDENT_API', 'GET /api/resident/room', 'PASS', `Room ${data.data.room?.roomNumber || data.data.room?.number}, Bed ${data.data.myBed?.bedNumber || data.data.bed?.bedNumber}`);
      } else {
        record('RESIDENT_API', 'GET /api/resident/room', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('RESIDENT_API', 'GET /api/resident/room', 'FAIL', err.message);
    }

    // 9c. Resident Payments
    try {
      const res = await fetch(`${PROD_URL}/resident/payments`, {
        headers: { Authorization: `Bearer ${residentToken}` }
      });
      const data: any = await res.json();
      const paymentList = Array.isArray(data.data) ? data.data : data.data?.payments;
      if (res.status === 200 && Array.isArray(paymentList)) {
        record('RESIDENT_API', 'GET /api/resident/payments', 'PASS', `Loaded ${paymentList.length} payments`);
      } else {
        record('RESIDENT_API', 'GET /api/resident/payments', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('RESIDENT_API', 'GET /api/resident/payments', 'FAIL', err.message);
    }

    // 9d. Resident Visitors
    try {
      const res = await fetch(`${PROD_URL}/resident/visitors`, {
        headers: { Authorization: `Bearer ${residentToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('RESIDENT_API', 'GET /api/resident/visitors', 'PASS', `Loaded ${data.data.length} visitor records`);
      } else {
        record('RESIDENT_API', 'GET /api/resident/visitors', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('RESIDENT_API', 'GET /api/resident/visitors', 'FAIL', err.message);
    }

    // 9e. Resident Complaints
    try {
      const res = await fetch(`${PROD_URL}/resident/complaints`, {
        headers: { Authorization: `Bearer ${residentToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('RESIDENT_API', 'GET /api/resident/complaints', 'PASS', `Loaded ${data.data.length} complaints`);
      } else {
        record('RESIDENT_API', 'GET /api/resident/complaints', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('RESIDENT_API', 'GET /api/resident/complaints', 'FAIL', err.message);
    }

    // 9f. Resident Documents
    try {
      const res = await fetch(`${PROD_URL}/resident/documents`, {
        headers: { Authorization: `Bearer ${residentToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('RESIDENT_API', 'GET /api/resident/documents', 'PASS', `Loaded ${data.data.length} documents`);
      } else {
        record('RESIDENT_API', 'GET /api/resident/documents', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('RESIDENT_API', 'GET /api/resident/documents', 'FAIL', err.message);
    }

    // 9g. Resident Notices
    try {
      const res = await fetch(`${PROD_URL}/resident/notices`, {
        headers: { Authorization: `Bearer ${residentToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && Array.isArray(data.data)) {
        record('RESIDENT_API', 'GET /api/resident/notices', 'PASS', `Loaded ${data.data.length} notices`);
      } else {
        record('RESIDENT_API', 'GET /api/resident/notices', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('RESIDENT_API', 'GET /api/resident/notices', 'FAIL', err.message);
    }

    // 9h. Resident Profile
    try {
      const res = await fetch(`${PROD_URL}/resident/profile`, {
        headers: { Authorization: `Bearer ${residentToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && (data.data?.email || data.data?.fullName || data.data?.user?.email)) {
        record('RESIDENT_API', 'GET /api/resident/profile', 'PASS', `Profile for ${data.data.fullName || data.data.name || data.data.email}`);
      } else {
        record('RESIDENT_API', 'GET /api/resident/profile', 'FAIL', `Status ${res.status}`);
      }
    } catch (err: any) {
      record('RESIDENT_API', 'GET /api/resident/profile', 'FAIL', err.message);
    }
  }

  // Summary
  console.log('\n====================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`PRODUCTION TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED, TOTAL: ${results.length}`);
  console.log('====================================================\n');
}

runProductionAudit();
