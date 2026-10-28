import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://127.0.0.1:5000/api';

async function waitForServer() {
  console.log('Checking server availability...');
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        console.log('Server is healthy and ready!');
        return;
      }
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Server did not become ready in 20s');
}

async function main() {
  await waitForServer();
  console.log('=== TRACING VISITOR APPROVAL/REJECTION REQUESTS ===');

  let pendingVisitor = await prisma.visitorRequest.findFirst({
    where: { status: 'PENDING' },
    include: {
      property: true,
      resident: true,
    }
  });

  if (!pendingVisitor) {
    console.log('No pending visitor found, checking first available visitor request...');
    pendingVisitor = await prisma.visitorRequest.findFirst({
      include: {
        property: true,
        resident: true,
      }
    });
  }

  console.log('Visitor Request under test:');
  console.log({
    id: pendingVisitor?.id,
    visitorName: pendingVisitor?.visitorName,
    status: pendingVisitor?.status,
    propertyId: pendingVisitor?.propertyId,
    propertyTenantId: pendingVisitor?.property?.tenantId,
    propertyName: pendingVisitor?.property?.name,
    residentId: pendingVisitor?.residentId,
  });

  const testUsers = [
    { email: 'owner@pg.com', pass: 'admin123', label: 'Owner (owner@pg.com)' },
    { email: 'manager.gurgaon@pg.com', pass: 'admin123', label: 'Manager with admin123' },
  ];

  for (const tu of testUsers) {
    try {
      console.log(`\n--- Attempting login for ${tu.label} ---`);
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tu.email, password: tu.pass })
      });

      const loginData = await loginRes.json() as any;
      if (!loginRes.ok) {
        console.log(`Login failed (${loginRes.status}):`, loginData);
        continue;
      }

      const token = loginData.data?.token;
      const user = loginData.data?.user;
      console.log('Login successful! User context returned:');
      console.log({
        id: user?.id,
        email: user?.email,
        role: user?.role,
        tenantId: user?.tenantId,
        propertyId: user?.propertyId,
      });

      // Now fetch visitors as this user
      console.log(`Fetching visitors via GET /api/owner/visitors...`);
      const getVisRes = await fetch(`${API_URL}/owner/visitors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const getVisData = await getVisRes.json() as any;
      const visitorsFound = getVisData.data || [];
      console.log(`Fetched ${visitorsFound.length} visitors.`);
      const hasTarget = visitorsFound.some((v: any) => v.id === pendingVisitor?.id);
      console.log(`Is target visitor visible in list? ${hasTarget}`);

      // Now try to approve this visitor
      console.log(`Calling PATCH /api/owner/visitors/${pendingVisitor?.id}/approve...`);
      const approveRes = await fetch(
        `${API_URL}/owner/visitors/${pendingVisitor?.id}/approve`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      const approveData = await approveRes.json();
      console.log(`Approve Response (${approveRes.status}):`, approveData);

    } catch (err: any) {
      console.log(`Error testing ${tu.label}:`, err.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
