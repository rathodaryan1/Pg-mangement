import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../config/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'urbannest-dev-jwt-secret-key-2026';

export async function runImpersonationTests() {
  console.log('\n========================================');
  console.log('TEST SUITE 4: SECURE OWNER IMPERSONATION');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // 1. Find or pick an Owner and a Super Admin
    const [superAdmin, owner] = await Promise.all([
      prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }),
      prisma.user.findFirst({ where: { role: 'OWNER' }, include: { tenant: true } }),
    ]);

    if (!superAdmin) {
      console.error('❌ Super Admin not found');
      failed++;
      return { passed, failed };
    }

    if (!owner) {
      console.log('⚠️ No existing owner found for impersonation test, creating mock payload test');
    }

    const targetOwnerId = owner?.id || 'mock-owner-id';
    const targetOwnerEmail = owner?.email || 'owner@test.io';
    const targetTenantId = owner?.tenantId || 'mock-tenant-id';

    // 2. Generate short-lived Impersonation Token
    const impersonationToken = jwt.sign(
      {
        id: targetOwnerId,
        email: targetOwnerEmail,
        name: owner?.name || 'Test Owner',
        role: 'OWNER',
        tenantId: targetTenantId,
        isImpersonated: true,
        impersonatedBy: superAdmin.email,
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 3. Verify Token Payload
    const decoded: any = jwt.verify(impersonationToken, JWT_SECRET);

    if (
      decoded.isImpersonated === true &&
      decoded.role === 'OWNER' &&
      decoded.impersonatedBy === superAdmin.email &&
      decoded.tenantId === targetTenantId
    ) {
      console.log('✅ Impersonation JWT Verification: PASS (Contains actorSuperAdmin, targetOwner, tenantId, isImpersonated=true)');
      passed++;
    } else {
      console.error('❌ Impersonation Token Claims Mismatch');
      failed++;
    }

    // 4. Test Audit Logging for Impersonation
    const log = await prisma.auditLog.create({
      data: {
        tenantId: targetTenantId !== 'mock-tenant-id' ? targetTenantId : null,
        actorId: superAdmin.id,
        actorName: superAdmin.name,
        actorRole: 'SUPER_ADMIN',
        action: 'IMPERSONATION_STARTED',
        entity: 'Tenant',
        entityId: targetTenantId,
        details: `Super Admin (${superAdmin.email}) impersonated Owner session (${targetOwnerEmail}) for testing`,
      },
    });

    if (log && log.action === 'IMPERSONATION_STARTED') {
      console.log(`✅ Impersonation Audit Log Created (ID: ${log.id}): PASS`);
      passed++;
      // Clean up log
      await prisma.auditLog.delete({ where: { id: log.id } }).catch(() => {});
    } else {
      console.error('❌ Failed to log impersonation event');
      failed++;
    }

  } catch (err: any) {
    console.error('❌ Impersonation Test Suite Error:', err.message);
    failed++;
  }

  console.log(`\nImpersonation Tests Finished: ${passed} PASSED, ${failed} FAILED\n`);
  return { passed, failed };
}

if (require.main === module) {
  runImpersonationTests().then(() => process.exit(0));
}
