import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== DIAGNOSTIC INSPECTION: USERS, PROPERTIES, VISITOR REQUESTS ===');

  const users = await prisma.user.findMany({
    where: {
      role: { in: ['OWNER', 'MANAGER', 'SUPER_ADMIN'] }
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      propertyId: true
    }
  });
  console.log('\n--- OWNERS / MANAGERS ---');
  console.table(users);

  const properties = await prisma.property.findMany({
    select: {
      id: true,
      name: true,
      tenantId: true
    }
  });
  console.log('\n--- PROPERTIES ---');
  console.table(properties);

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true
    }
  });
  console.log('\n--- TENANTS ---');
  console.table(tenants);

  const visitorRequests = await prisma.visitorRequest.findMany({
    take: 15,
    include: {
      property: {
        select: {
          id: true,
          name: true,
          tenantId: true
        }
      },
      resident: {
        select: {
          id: true,
          fullName: true,
          propertyId: true
        }
      }
    }
  });

  console.log('\n--- VISITOR REQUESTS (first 15) ---');
  console.log(visitorRequests.map(v => ({
    id: v.id,
    visitorName: v.visitorName,
    status: v.status,
    propertyId: v.propertyId,
    propName: v.property?.name,
    propTenantId: v.property?.tenantId,
    residentId: v.residentId,
    resPropId: v.resident?.propertyId,
    qrPassToken: v.qrPassToken ? 'PRESENT' : 'NONE'
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
