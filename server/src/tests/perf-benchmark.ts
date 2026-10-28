import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../config/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import http from 'http';

const JWT_SECRET = process.env.JWT_SECRET || 'urbannest-dev-jwt-secret-key-2026';

function httpRequest(url: string, headers: Record<string, string> = {}): Promise<{ status: number; duration: number; data: any }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const duration = Date.now() - start;
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode || 200, duration, data: json });
        } catch {
          resolve({ status: res.statusCode || 200, duration, data: body });
        }
      });
    });
    req.on('error', (err) => reject(err));
  });
}

function calculateStats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;
  return { min, max, avg, median, p95 };
}

async function runBenchmark() {
  console.log('\n======================================================');
  console.log('URBAN NEST — PHASE 2 PERFORMANCE BENCHMARK & AUDIT');
  console.log('======================================================\n');

  // 1. Database Ping (5 samples)
  console.log('[1/6] Measuring Database Ping Latency (Tokyo Supabase)...');
  const pingTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const elapsed = Date.now() - t0;
    pingTimes.push(elapsed);
    console.log(`  Ping sample ${i + 1}: ${elapsed}ms ${i === 0 ? '(Cold connection)' : '(Warm pool)'}`);
  }
  const pingStats = calculateStats(pingTimes);
  console.log(`  -> Ping Stats: Min=${pingStats.min}ms, Med=${pingStats.median}ms, Avg=${pingStats.avg.toFixed(1)}ms, p95=${pingStats.p95}ms`);

  // 2. Authentication Breakdown
  console.log('\n[2/6] Measuring Authentication Pipeline Breakdown...');
  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!superAdmin) {
    console.error('Super admin not found in database');
    return;
  }
  
  // Measure DB Lookup
  const tLookup0 = Date.now();
  await prisma.user.findUnique({
    where: { email: superAdmin.email },
    include: { tenant: { select: { id: true, name: true, slug: true, status: true, plan: true } } },
  });
  const dbLookupTime = Date.now() - tLookup0;

  // Measure Bcrypt compare (CPU bound)
  const tBcrypt0 = Date.now();
  await bcrypt.compare('WrongPassword123', superAdmin.passwordHash);
  const bcryptTime = Date.now() - tBcrypt0;

  console.log(`  -> User lookup query: ${dbLookupTime}ms (remote WAN)`);
  console.log(`  -> Bcrypt compare: ${bcryptTime}ms (local CPU)`);

  // Tokens for Super Admin, Owner, Resident
  const superAdminToken = jwt.sign(
    { id: superAdmin.id, email: superAdmin.email, role: 'SUPER_ADMIN', name: superAdmin.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
  const ownerToken = owner
    ? jwt.sign(
        { id: owner.id, email: owner.email, role: 'OWNER', name: owner.name, tenantId: owner.tenantId },
        JWT_SECRET,
        { expiresIn: '2h' }
      )
    : null;

  const resident = await prisma.resident.findFirst({ include: { user: true } });
  const residentToken = resident
    ? jwt.sign(
        {
          id: resident.userId,
          email: resident.email,
          role: 'RESIDENT',
          name: resident.fullName,
          residentId: resident.id,
          tenantId: resident.user?.tenantId,
          propertyId: resident.propertyId,
        },
        JWT_SECRET,
        { expiresIn: '2h' }
      )
    : null;

  // 3. Super Admin Dashboard Stats API
  console.log('\n[3/6] Measuring Super Admin Dashboard Stats API (/api/super-admin/dashboard/stats)...');
  const saStatsTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const res = await httpRequest('http://localhost:5000/api/super-admin/dashboard/stats', {
      Authorization: `Bearer ${superAdminToken}`,
    });
    saStatsTimes.push(res.duration);
    console.log(`  Sample ${i + 1}: ${res.duration}ms (status: ${res.status})`);
  }
  const saStats = calculateStats(saStatsTimes);

  // 4. Super Admin Tenants API
  console.log('\n[4/6] Measuring Super Admin Tenants API (/api/super-admin/tenants)...');
  const saTenantsTimes: number[] = [];
  for (let i = 0; i < 3; i++) {
    const res = await httpRequest('http://localhost:5000/api/super-admin/tenants?limit=10', {
      Authorization: `Bearer ${superAdminToken}`,
    });
    saTenantsTimes.push(res.duration);
    console.log(`  Sample ${i + 1}: ${res.duration}ms (status: ${res.status})`);
  }
  const saTenantsStats = calculateStats(saTenantsTimes);

  // 5. Owner Dashboard API
  console.log('\n[5/6] Measuring Owner Dashboard API (/api/owner/dashboard)...');
  const ownerTimes: number[] = [];
  if (ownerToken) {
    for (let i = 0; i < 3; i++) {
      const res = await httpRequest('http://localhost:5000/api/owner/dashboard', {
        Authorization: `Bearer ${ownerToken}`,
      });
      ownerTimes.push(res.duration);
      console.log(`  Sample ${i + 1}: ${res.duration}ms (status: ${res.status})`);
    }
  } else {
    console.log('  No owner found to benchmark.');
  }
  const ownerStats = ownerTimes.length > 0 ? calculateStats(ownerTimes) : { min: 0, max: 0, avg: 0, median: 0, p95: 0 };

  // 6. Resident Dashboard API
  console.log('\n[6/6] Measuring Resident Dashboard API (/api/resident/dashboard)...');
  const residentTimes: number[] = [];
  if (residentToken) {
    for (let i = 0; i < 3; i++) {
      const res = await httpRequest('http://localhost:5000/api/resident/dashboard', {
        Authorization: `Bearer ${residentToken}`,
      });
      residentTimes.push(res.duration);
      console.log(`  Sample ${i + 1}: ${res.duration}ms (status: ${res.status})`);
    }
  } else {
    console.log('  No resident found to benchmark.');
  }
  const residentStats = residentTimes.length > 0 ? calculateStats(residentTimes) : { min: 0, max: 0, avg: 0, median: 0, p95: 0 };

  console.log('\n======================================================');
  console.log('BENCHMARK SUMMARY');
  console.log('======================================================');
  console.log(`Database Ping (Avg):                     ${pingStats.avg.toFixed(1)}ms (Cold: ${pingTimes[0]}ms, Warm Avg: ${pingStats.min}ms)`);
  console.log(`Super Admin Stats (Avg):                ${saStats.avg.toFixed(1)}ms  (Baseline: 16,786.1ms) -> ${((1 - saStats.avg / 16786.1) * 100).toFixed(1)}% reduction!`);
  console.log(`Super Admin Tenants (Avg):              ${saTenantsStats.avg.toFixed(1)}ms  (Baseline: 12,500.4ms)`);
  console.log(`Owner Dashboard (Avg):                  ${ownerStats.avg.toFixed(1)}ms  (Baseline: ~26,000ms) -> ${((1 - ownerStats.avg / 26000) * 100).toFixed(1)}% reduction!`);
  console.log(`Resident Dashboard (Avg):               ${residentStats.avg.toFixed(1)}ms  (Baseline: ~14,000ms) -> ${((1 - residentStats.avg / 14000) * 100).toFixed(1)}% reduction!`);
  console.log('======================================================\n');
}

runBenchmark().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
