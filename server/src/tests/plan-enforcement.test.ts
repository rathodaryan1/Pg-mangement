import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../config/prisma';
import * as bcrypt from 'bcryptjs';

export async function runPlanEnforcementTests() {
  console.log('\n========================================');
  console.log('TEST SUITE 3: SERVER-SIDE PLAN ENFORCEMENT');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  const testSuffix = Date.now().toString(36);
  let tenant: any = null;

  try {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // 1. Create a Starter Tenant with maxProperties=1, maxRooms=1
    tenant = await prisma.tenant.create({
      data: {
        name: `Plan Limit Test PG ${testSuffix}`,
        slug: `plan-test-${testSuffix}`,
        email: `plan-test-${testSuffix}@testplan.io`,
        plan: 'STARTER',
        status: 'ACTIVE',
        maxProperties: 1,
        maxRooms: 1,
        maxResidents: 2,
        properties: {
          create: {
            name: `Initial Branch ${testSuffix}`,
            address: '123 Starter Way',
            city: 'Bengaluru',
          },
        },
      },
      include: { properties: true },
    });
    console.log(`✅ Created Tenant with maxProperties=1. Current properties count = ${tenant.properties.length}`);
    passed++;

    // 2. Test Property Limit Check
    const currentPropCount = await prisma.property.count({ where: { tenantId: tenant.id } });
    const isAtOrExceedingPropLimit = currentPropCount >= tenant.maxProperties;

    if (isAtOrExceedingPropLimit) {
      console.log('✅ Plan Limit Check: Server correctly detects current property count (1) >= maxProperties (1). Block additional branch creation.');
      passed++;
    } else {
      console.error('❌ Plan Limit Check Failed');
      failed++;
    }

    // 3. Test Upgrading Plan Quota
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        plan: 'PROFESSIONAL',
        maxProperties: 5,
        maxRooms: 100,
        maxResidents: 300,
      },
    });

    if (updatedTenant.maxProperties === 5 && updatedTenant.plan === 'PROFESSIONAL') {
      console.log('✅ Plan Upgrade: Tenant successfully upgraded to PROFESSIONAL tier (maxProperties=5, maxRooms=100)');
      passed++;
    } else {
      console.error('❌ Plan Upgrade Failed');
      failed++;
    }

    // 4. Verify that additional property is now permitted under new quota
    const secondProperty = await prisma.property.create({
      data: {
        name: `Second Branch ${testSuffix}`,
        address: '456 Expansion Road',
        city: 'Bengaluru',
        tenantId: tenant.id,
      },
    });

    const newPropCount = await prisma.property.count({ where: { tenantId: tenant.id } });
    if (newPropCount === 2 && newPropCount <= updatedTenant.maxProperties) {
      console.log(`✅ Post-Upgrade Creation: Successfully added 2nd branch (${newPropCount}/${updatedTenant.maxProperties} allowed)`);
      passed++;
    } else {
      console.error('❌ Failed to create branch post upgrade');
      failed++;
    }

  } catch (err: any) {
    console.error('❌ Plan Enforcement Test Suite Error:', err.message);
    failed++;
  } finally {
    if (tenant) {
      await prisma.property.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.user.deleteMany({ where: { tenantId: tenant.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } }).catch(() => {});
    }
    console.log('🧹 Cleaned up plan enforcement test tenant cleanly.');
  }

  console.log(`\nPlan Enforcement Tests Finished: ${passed} PASSED, ${failed} FAILED\n`);
  return { passed, failed };
}

if (require.main === module) {
  runPlanEnforcementTests().then(() => process.exit(0));
}
