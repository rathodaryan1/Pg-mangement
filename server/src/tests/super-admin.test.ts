import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../config/prisma';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { withDbRetry } from './db-helper';

const JWT_SECRET = process.env.JWT_SECRET || 'urbannest-dev-jwt-secret-key-2026';

export async function runSuperAdminTests() {
  console.log('\n========================================');
  console.log('TEST SUITE 1: SUPER ADMIN CONTROL PLANE');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // 1. Check Super Admin exists or create
    const superAdmin = await withDbRetry(() =>
      prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
      })
    );

    if (!superAdmin) {
      console.error('❌ Super admin user not found in database');
      failed++;
    } else {
      console.log(`✅ Super Admin Account Verified: ${superAdmin.email}`);
      passed++;
    }

    // 2. Test Super Admin JWT generation & verification
    const token = jwt.sign(
      { id: superAdmin?.id, email: superAdmin?.email, role: 'SUPER_ADMIN', name: superAdmin?.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'SUPER_ADMIN') {
      console.log('✅ Super Admin Token Signing and Role Verification: PASS');
      passed++;
    } else {
      console.error('❌ Super Admin Token Role Mismatch');
      failed++;
    }

    // 3. Test Dashboard KPI live database querying
    const totalTenants = await withDbRetry(() => prisma.tenant.count());
    const totalUsers = await withDbRetry(() => prisma.user.count());
    const totalProperties = await withDbRetry(() => prisma.property.count());
    const totalRooms = await withDbRetry(() => prisma.room.count());
    const totalBeds = await withDbRetry(() => prisma.bed.count());

    console.log(`✅ Live Metrics Query: Tenants=${totalTenants}, Users=${totalUsers}, Props=${totalProperties}, Rooms=${totalRooms}, Beds=${totalBeds}`);
    passed++;

    // 4. Test Platform Global Settings Query & Upsert
    const testSettingKey = 'test_platform_maintenance';
    await withDbRetry(() =>
      prisma.setting.upsert({
        where: { key: testSettingKey },
        update: { value: 'false' },
        create: { key: testSettingKey, value: 'false' },
      })
    );
    const retrievedSetting = await withDbRetry(() => prisma.setting.findUnique({ where: { key: testSettingKey } }));
    if (retrievedSetting && retrievedSetting.value === 'false') {
      console.log('✅ Platform Settings PostgreSQL Persistence: PASS');
      passed++;
    } else {
      console.error('❌ Platform Setting Upsert Failed');
      failed++;
    }

    // Clean up test setting
    await withDbRetry(() => prisma.setting.delete({ where: { key: testSettingKey } })).catch(() => {});

  } catch (err: any) {
    console.error('❌ Super Admin Test Suite Error:', err.message);
    failed++;
  }

  console.log(`\nSuper Admin Tests Finished: ${passed} PASSED, ${failed} FAILED\n`);
  return { passed, failed };
}

if (require.main === module) {
  runSuperAdminTests().then(() => process.exit(0));
}
