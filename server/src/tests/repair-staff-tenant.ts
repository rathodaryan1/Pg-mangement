import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Running safe, narrowly scoped repair for staff tenantId consistency...');
  const res = await prisma.user.updateMany({
    where: {
      email: {
        in: ['manager.gurgaon@pg.com', 'repair.gurgaon@pg.com', 'reception.gurgaon@pg.com']
      },
      tenantId: null
    },
    data: {
      tenantId: 'b9c179bf-34ed-49d2-8c0b-0092eb986dbe'
    }
  });
  console.log(`Updated ${res.count} staff records to match their assigned property tenant.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
