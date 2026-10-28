import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      propertyId: true,
      property: {
        select: {
          id: true,
          name: true,
          tenantId: true
        }
      }
    }
  });
  console.log('\n--- ALL USERS WITH PROPERTY & TENANT ---');
  console.table(users.map(u => ({
    email: u.email,
    role: u.role,
    userTenantId: u.tenantId,
    userPropertyId: u.propertyId,
    propertyTenantId: u.property?.tenantId,
    propName: u.property?.name
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
