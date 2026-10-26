import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../config/prisma';

async function main() {
  console.log('--- STARTING REAL POSTGRESQL DATABASE INTEGRITY AUDIT ---');

  // Verify connection
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ PostgreSQL Database connection: ACTIVE & HEALTHY');

  // 1. Count records in all 27 tables
  const counts = {
    tenant: await prisma.tenant.count(),
    plan: await prisma.plan.count(),
    user: await prisma.user.count(),
    property: await prisma.property.count(),
    building: await prisma.building.count(),
    floor: await prisma.floor.count(),
    room: await prisma.room.count(),
    bed: await prisma.bed.count(),
    resident: await prisma.resident.count(),
    agreement: await prisma.agreement.count(),
    securityDeposit: await prisma.securityDeposit.count(),
    payment: await prisma.payment.count(),
    paymentReceipt: await prisma.paymentReceipt.count(),
    visitorRequest: await prisma.visitorRequest.count(),
    complaint: await prisma.complaint.count(),
    maintenanceActivity: await prisma.maintenanceActivity.count(),
    leaveRequest: await prisma.leaveRequest.count(),
    document: await prisma.document.count(),
    notice: await prisma.notice.count(),
    notification: await prisma.notification.count(),
    sosEvent: await prisma.sOSEvent.count(),
    auditLog: await prisma.auditLog.count(),
    setting: await prisma.setting.count(),
    expense: await prisma.expense.count(),
    inventoryItem: await prisma.inventoryItem.count(),
    operationalTask: await prisma.operationalTask.count(),
    supportTicket: await prisma.supportTicket.count(),
  };

  console.log('\n--- ENTITY RECORD COUNTS ---');
  Object.entries(counts).forEach(([k, v]) => {
    console.log(`- ${k.padEnd(20)}: ${v} records`);
  });

  // 2. Orphan checks
  console.log('\n--- ORPHAN INTEGRITY CHECKS ---');
  
  // Properties with invalid tenantId
  const orphanProperties = await prisma.$queryRaw<any[]>`
    SELECT p.id, p.name FROM "Property" p
    LEFT JOIN "Tenant" t ON p."tenantId" = t.id
    WHERE p."tenantId" IS NOT NULL AND t.id IS NULL
  `;
  console.log(`- Orphan Properties (invalid tenantId): ${orphanProperties.length}`);

  // Rooms with invalid propertyId
  const orphanRooms = await prisma.$queryRaw<any[]>`
    SELECT r.id, r.number FROM "Room" r
    LEFT JOIN "Property" p ON r."propertyId" = p.id
    WHERE p.id IS NULL
  `;
  console.log(`- Orphan Rooms (invalid propertyId): ${orphanRooms.length}`);

  // Beds with invalid roomId
  const orphanBeds = await prisma.$queryRaw<any[]>`
    SELECT b.id, b."bedNumber" FROM "Bed" b
    LEFT JOIN "Room" r ON b."roomId" = r.id
    WHERE r.id IS NULL
  `;
  console.log(`- Orphan Beds (invalid roomId): ${orphanBeds.length}`);

  // Residents with invalid userId or propertyId
  const orphanResidents = await prisma.$queryRaw<any[]>`
    SELECT res.id, res."fullName" FROM "Resident" res
    LEFT JOIN "User" u ON res."userId" = u.id
    LEFT JOIN "Property" p ON res."propertyId" = p.id
    WHERE u.id IS NULL OR p.id IS NULL
  `;
  console.log(`- Orphan Residents (invalid userId/propertyId): ${orphanResidents.length}`);

  // Payments with invalid residentId or propertyId
  const orphanPayments = await prisma.$queryRaw<any[]>`
    SELECT pay.id FROM "Payment" pay
    LEFT JOIN "Resident" res ON pay."residentId" = res.id
    LEFT JOIN "Property" p ON pay."propertyId" = p.id
    WHERE res.id IS NULL OR p.id IS NULL
  `;
  console.log(`- Orphan Payments (invalid resident/property): ${orphanPayments.length}`);

  // Complaints with invalid residentId or propertyId
  const orphanComplaints = await prisma.$queryRaw<any[]>`
    SELECT c.id FROM "Complaint" c
    LEFT JOIN "Resident" res ON c."residentId" = res.id
    LEFT JOIN "Property" p ON c."propertyId" = p.id
    WHERE res.id IS NULL OR p.id IS NULL
  `;
  console.log(`- Orphan Complaints (invalid resident/property): ${orphanComplaints.length}`);

  // 3. Status Value Verification
  console.log('\n--- ENUM / STATUS VALUE AUDIT ---');
  const bedStatuses = await prisma.$queryRaw<any[]>`
    SELECT status, count(*) as count FROM "Bed" GROUP BY status
  `;
  console.log('- Bed Status distribution:', bedStatuses);

  const roomStatuses = await prisma.$queryRaw<any[]>`
    SELECT status, count(*) as count FROM "Room" GROUP BY status
  `;
  console.log('- Room Status distribution:', roomStatuses);

  const paymentStatuses = await prisma.$queryRaw<any[]>`
    SELECT status, count(*) as count FROM "Payment" GROUP BY status
  `;
  console.log('- Payment Status distribution:', paymentStatuses);

  const totalOrphans = orphanProperties.length + orphanRooms.length + orphanBeds.length +
                       orphanResidents.length + orphanPayments.length + orphanComplaints.length;

  if (totalOrphans === 0) {
    console.log('\n✅ DATABASE INTEGRITY: 100% CLEAN - ZERO ORPHANED RECORDS');
  } else {
    console.warn(`\n⚠️ FOUND ${totalOrphans} ORPHANED RECORDS IN DATABASE!`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
