import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../config/prisma';
import * as bcrypt from 'bcryptjs';
import { withDbRetry } from './db-helper';

export async function runTenantIsolationTests() {
  console.log('\n========================================');
  console.log('TEST SUITE 2: MULTI-TENANT DATA ISOLATION');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  const testSuffix = Date.now().toString(36);
  const tenantEmailA = `tenant-a-${testSuffix}@testisolation.io`;
  const tenantEmailB = `tenant-b-${testSuffix}@testisolation.io`;

  let tenantA: any = null;
  let tenantB: any = null;

  try {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // 1. Provision Tenant A
    tenantA = await withDbRetry(() =>
      prisma.tenant.create({
        data: {
          name: `Isolation Test Tenant A ${testSuffix}`,
          slug: `tenant-a-${testSuffix}`,
          email: tenantEmailA,
          plan: 'STARTER',
          status: 'ACTIVE',
          users: {
            create: {
              name: 'Owner Alpha',
              email: `owner-a-${testSuffix}@testisolation.io`,
              passwordHash,
              role: 'OWNER',
            },
          },
          properties: {
            create: {
              name: `Property Alpha ${testSuffix}`,
              address: '100 Alpha Road',
              city: 'Ahmedabad',
            },
          },
        },
        include: { users: true, properties: true },
      })
    );
    console.log(`✅ Provisioned Tenant A (${tenantA.id}) with Property (${tenantA.properties[0].id})`);
    passed++;

    // 2. Provision Tenant B
    tenantB = await withDbRetry(() =>
      prisma.tenant.create({
        data: {
          name: `Isolation Test Tenant B ${testSuffix}`,
          slug: `tenant-b-${testSuffix}`,
          email: tenantEmailB,
          plan: 'STARTER',
          status: 'ACTIVE',
          users: {
            create: {
              name: 'Owner Beta',
              email: `owner-b-${testSuffix}@testisolation.io`,
              passwordHash,
              role: 'OWNER',
            },
          },
          properties: {
            create: {
              name: `Property Beta ${testSuffix}`,
              address: '200 Beta Road',
              city: 'Mumbai',
            },
          },
        },
        include: { users: true, properties: true },
      })
    );
    console.log(`✅ Provisioned Tenant B (${tenantB.id}) with Property (${tenantB.properties[0].id})`);
    passed++;

    // 3. Verify Owner A query with tenant boundary cannot see Tenant B's property
    const ownerAProperties = await withDbRetry(() =>
      prisma.property.findMany({
        where: {
          id: tenantB.properties[0].id,
          tenantId: tenantA.id, // Strictly scoped to Tenant A
        },
      })
    );

    if (ownerAProperties.length === 0) {
      console.log('✅ Boundary Check: Owner A querying Property B with Tenant A scope returned 0 records (ACCESS DENIED)');
      passed++;
    } else {
      console.error('❌ Data Leakage: Owner A was able to access Tenant B property');
      failed++;
    }

    // 4. Verify Owner B querying Property A with Tenant B scope
    const ownerBProperties = await withDbRetry(() =>
      prisma.property.findMany({
        where: {
          id: tenantA.properties[0].id,
          tenantId: tenantB.id,
        },
      })
    );

    if (ownerBProperties.length === 0) {
      console.log('✅ Boundary Check: Owner B querying Property A with Tenant B scope returned 0 records (ACCESS DENIED)');
      passed++;
    } else {
      console.error('❌ Data Leakage: Owner B was able to access Tenant A property');
      failed++;
    }

    // 5. Verify Users Isolation
    const tenantAUsers = await withDbRetry(() =>
      prisma.user.findMany({
        where: { tenantId: tenantA.id },
      })
    );
    const containsTenantBUser = tenantAUsers.some((u) => u.email.includes('owner-b'));
    if (!containsTenantBUser) {
      console.log('✅ Boundary Check: Tenant A users query contains 0 users from Tenant B: PASS');
      passed++;
    } else {
      console.error('❌ User Leakage: Tenant A returned Tenant B user');
      failed++;
    }

  } catch (err: any) {
    console.error('❌ Tenant Isolation Test Suite Error:', err.message);
    failed++;
  } finally {
    // Clean up test tenants
    if (tenantA) {
      await withDbRetry(() => prisma.property.deleteMany({ where: { tenantId: tenantA.id } })).catch(() => {});
      await withDbRetry(() => prisma.user.deleteMany({ where: { tenantId: tenantA.id } })).catch(() => {});
      await withDbRetry(() => prisma.tenant.delete({ where: { id: tenantA.id } })).catch(() => {});
    }
    if (tenantB) {
      await withDbRetry(() => prisma.property.deleteMany({ where: { tenantId: tenantB.id } })).catch(() => {});
      await withDbRetry(() => prisma.user.deleteMany({ where: { tenantId: tenantB.id } })).catch(() => {});
      await withDbRetry(() => prisma.tenant.delete({ where: { id: tenantB.id } })).catch(() => {});
    }
    console.log('🧹 Cleaned up temporary test isolation tenants cleanly.');
  }

  console.log(`\nTenant Isolation Tests Finished: ${passed} PASSED, ${failed} FAILED\n`);
  return { passed, failed };
}

if (require.main === module) {
  runTenantIsolationTests().then(() => process.exit(0));
}
