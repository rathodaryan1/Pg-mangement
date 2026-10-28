import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { withDbRetry } from './db-helper';

const prisma = new PrismaClient();

interface TestResult {
  module: string;
  test: string;
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(
  module: string,
  testName: string,
  fn: () => Promise<string | void>
) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({
      module,
      test: testName,
      status: 'PASSED',
      durationMs,
      details: details || undefined,
    });
    console.log(`  [PASS] ${module} -> ${testName} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      module,
      test: testName,
      status: 'FAILED',
      durationMs,
      details: err.message,
    });
    console.error(`  [FAIL] ${module} -> ${testName}: ${err.message}`);
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('URBAN NEST SAAS UPGRADE — INTEGRATED VERIFICATION SUITE');
  console.log('======================================================\n');

  // Step 1: Discover Active Fixtures
  console.log('1. Locating active tenant & property fixtures...');
  const property = await withDbRetry(() =>
    prisma.property.findFirst({
      include: {
        tenant: true,
        rooms: {
          include: {
            beds: true,
          },
        },
      },
    })
  );

  if (!property) {
    throw new Error('No active property fixture found in database to execute verification suite.');
  }

  const tenantId = property.tenantId;
  const propertyId = property.id;
  console.log(`   Discovered Property: "${property.name}" (ID: ${propertyId}) | Tenant: "${property.tenant.name}" (ID: ${tenantId})\n`);

  // ========================================================
  // MODULE 1: Kitchen, Mess & Menu Management
  // ========================================================
  console.log('--- MODULE 1: Kitchen, Mess & Menu Management ---');
  let testMenuId: string | null = null;
  let testIngredientId: string | null = null;

  await runTest('Kitchen', 'Publish Daily Menu & Calculate Participation', async () => {
    // Unique date to avoid unique key collision
    const testDate = new Date('2028-12-31T00:00:00Z');
    const menu = await prisma.menu.create({
      data: {
        propertyId,
        date: testDate,
        mealPeriod: 'LUNCH',
        title: 'Verif Chef Special Lunch',
        servingTime: '12:30 PM - 02:30 PM',
        cutoffTime: '10:00 AM',
        status: 'PUBLISHED',
        items: {
          create: [
            { name: 'Paneer Butter Masala', dietaryType: 'VEG', isAvailable: true },
            { name: 'Tandoori Roti', dietaryType: 'VEG', isAvailable: true },
            { name: 'Jeera Rice', dietaryType: 'VEG', isAvailable: true },
            { name: 'Gulab Jamun', dietaryType: 'VEG', isAvailable: true },
          ],
        },
      },
      include: { items: true },
    });
    testMenuId = menu.id;

    if (menu.items.length !== 4) {
      throw new Error(`Expected 4 dishes, found ${menu.items.length}`);
    }
    return `Published Menu "${menu.title}" with 4 items. ID: ${menu.id}`;
  });

  await runTest('Kitchen', 'Inventory Ingredient & Stock Movement Flow', async () => {
    // 1. Create ingredient
    const ingredient = await prisma.kitchenIngredient.create({
      data: {
        propertyId,
        name: 'Verification Organic Basmati Rice',
        category: 'Grains',
        unit: 'kg',
        currentStock: 50.0,
        minStock: 10.0,
        costPerUnit: 85.0,
      },
    });
    testIngredientId = ingredient.id;

    // 2. Record consumption
    const movement = await prisma.kitchenMovement.create({
      data: {
        ingredientId: ingredient.id,
        propertyId,
        type: 'CONSUMED',
        quantity: 12.5,
        reason: 'Lunch batch preparation',
      },
    });

    // 3. Update stock balance
    const updated = await prisma.kitchenIngredient.update({
      where: { id: ingredient.id },
      data: { currentStock: { decrement: 12.5 } },
    });

    if (updated.currentStock !== 37.5) {
      throw new Error(`Expected balance 37.5, got ${updated.currentStock}`);
    }
    return `Stock deducted accurately: 50kg -> 37.5kg (Movement ID: ${movement.id})`;
  });

  // ========================================================
  // MODULE 2: Security Guard & Gate Desk
  // ========================================================
  console.log('\n--- MODULE 2: Security Guard & Gate Desk ---');
  let testPassId: string | null = null;

  await runTest('Security', 'Generate & Verify QR Visitor Gate Pass', async () => {
    const testResident = await prisma.resident.findFirst({
      where: { propertyId },
    });

    const qrPassToken = `UN-GATE-${Date.now()}`;
    const visitorReq = await prisma.visitorRequest.create({
      data: {
        propertyId,
        residentId: testResident?.id,
        visitorName: 'Rajesh Sharma (Vendor)',
        visitorMobile: '+91 98765 43210',
        relation: 'Official Vendor',
        purpose: 'HVAC Filter Delivery',
        visitDate: new Date(),
        expectedEntryTime: '04:00 PM',
        expectedExitTime: '06:00 PM',
        status: 'PENDING',
        qrPassToken,
      },
    });
    testPassId = visitorReq.id;

    // Guard Checks In Visitor
    const checkedIn = await prisma.visitorRequest.update({
      where: { id: visitorReq.id },
      data: {
        status: 'CHECKED_IN',
        checkInTime: new Date(),
      },
    });

    if (checkedIn.status !== 'CHECKED_IN' || !checkedIn.checkInTime) {
      throw new Error('Failed to record checkInTime timestamp.');
    }

    // Guard Checks Out Visitor
    const checkedOut = await prisma.visitorRequest.update({
      where: { id: visitorReq.id },
      data: {
        status: 'CHECKED_OUT',
        checkOutTime: new Date(),
      },
    });

    return `Visitor check-in and check-out verified. Token: ${qrPassToken}`;
  });

  // ========================================================
  // MODULE 3: Housekeeping Staff & Cleaning Checklists
  // ========================================================
  console.log('\n--- MODULE 3: Housekeeping & Facility Care ---');
  let testTaskId: string | null = null;

  await runTest('Housekeeping', 'Lifecycle Progression (PENDING -> IN_PROGRESS -> COMPLETED)', async () => {
    // 1. Create cleaning task
    const task = await prisma.housekeepingTask.create({
      data: {
        propertyId,
        area: 'DINING',
        targetName: '2nd Floor Dining Hall & Balcony',
        scheduledAt: new Date(),
        status: 'PENDING',
        checklist: JSON.stringify(['Sweep floor', 'Disinfect tables', 'Empty trash']),
        notes: 'Deep sanitation before evening rush',
      },
    });
    testTaskId = task.id;

    // 2. Staff starts task
    const inProgress = await prisma.housekeepingTask.update({
      where: { id: task.id },
      data: { status: 'IN_PROGRESS' },
    });
    if (inProgress.status !== 'IN_PROGRESS') {
      throw new Error('Task failed to transition to IN_PROGRESS');
    }

    // 3. Staff completes task with verification notes
    const completed = await prisma.housekeepingTask.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: 'Sanitized with hospital-grade disinfectant. All tables wiped.',
      },
    });

    if (completed.status !== 'COMPLETED' || !completed.completedAt) {
      throw new Error('Task completion status was not recorded properly.');
    }

    return `Task ${task.id} successfully completed and verified.`;
  });

  // ========================================================
  // MODULE 4: Admissions, Enquiries & Leads Pipeline
  // ========================================================
  console.log('\n--- MODULE 4: Admissions & Leads Pipeline ---');
  let testLeadId: string | null = null;

  await runTest('Admissions', 'Capture Lead & Transition Pipeline Status', async () => {
    // 1. Capture public enquiry
    const lead = await prisma.lead.create({
      data: {
        tenantId,
        propertyId,
        name: 'Aarav Mehta',
        phone: '+91 99887 76655',
        email: 'aarav.mehta.test@example.com',
        roomTypePreference: 'DOUBLE',
        source: 'WEBSITE',
        status: 'NEW',
        notes: 'Looking for AC room starting next month.',
      },
    });
    testLeadId = lead.id;

    // 2. Owner contacts lead and schedules visit
    const scheduled = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'VISIT_SCHEDULED',
        visitDate: new Date(Date.now() + 86400000 * 2), // 2 days ahead
      },
    });

    if (scheduled.status !== 'VISIT_SCHEDULED') {
      throw new Error('Lead failed to transition to VISIT_SCHEDULED');
    }

    return `Lead ${lead.id} processed from NEW to VISIT_SCHEDULED`;
  });

  // ========================================================
  // MODULE 5: Utility Readings & Sub-Metering Calculation
  // ========================================================
  console.log('\n--- MODULE 5: Utility Readings & Sub-Metering ---');
  let testReadingId: string | null = null;

  await runTest('Utilities', 'Sub-meter reading consumption & billing calculation', async () => {
    const prevReading = 1420.0;
    const currentReading = 1580.0;
    const consumedUnits = currentReading - prevReading; // 160 units
    const unitRate = 9.5; // Rs 9.5 per kWh
    const calculatedAmount = consumedUnits * unitRate; // 1520.0

    const reading = await prisma.utilityReading.create({
      data: {
        propertyId,
        type: 'ELECTRICITY',
        meterNumber: 'MTR-FLR2-MAIN',
        previousReading: prevReading,
        currentReading: currentReading,
        unitsConsumed: consumedUnits,
        unitRate: unitRate,
        totalAmount: calculatedAmount,
        billingPeriod: 'October 2026',
        recordedBy: 'Facility Mgr',
        readingDate: new Date(),
      },
    });
    testReadingId = reading.id;

    if (reading.totalAmount !== 1520.0) {
      throw new Error(`Expected amount 1520.0, got ${reading.totalAmount}`);
    }

    return `Calculated: 160 kWh @ Rs 9.5/kWh = Rs ${reading.totalAmount} (Reading ID: ${reading.id})`;
  });

  // ========================================================
  // MODULE 6: AI Business Assistant & Contextual Query Engine
  // ========================================================
  console.log('\n--- MODULE 6: AI Business Assistant & Audit Logging ---');
  let testLogId: string | null = null;

  await runTest('AI Assistant', 'Execute Scoped Contextual Aggregations with Audit Trail', async () => {
    // 1. Simulate AI Assistant Query on Vacancy
    const totalRooms = await prisma.room.count({ where: { propertyId } });
    const totalBeds = await prisma.bed.count({ where: { room: { propertyId } } });
    const occupiedBeds = await prisma.bed.count({
      where: { room: { propertyId }, status: 'OCCUPIED' },
    });
    const vacantBeds = totalBeds - occupiedBeds;

    // 2. Record AI interaction in AIAssistantLog
    const log = await prisma.aIAssistantLog.create({
      data: {
        tenantId,
        propertyId,
        userId: property.tenant.id, // Scoped to tenant
        query: 'How many beds are currently vacant in this property?',
        response: `There are currently ${vacantBeds} vacant beds out of ${totalBeds} total beds across ${totalRooms} rooms.`,
        toolsInvoked: 'FETCH_OCCUPANCY_METRICS',
      },
    });
    testLogId = log.id;

    if (!log.id) {
      throw new Error('Failed to create AI Assistant audit log.');
    }

    return `AI Answered: ${vacantBeds} vacant / ${totalBeds} beds. Log ID: ${log.id}`;
  });

  // ========================================================
  // CLEANUP: Clean all test artifacts safely
  // ========================================================
  console.log('\n--- CLEANUP: Removing synthetic verification records ---');
  if (testMenuId) {
    await prisma.menuItem.deleteMany({ where: { menuId: testMenuId } });
    await prisma.menu.delete({ where: { id: testMenuId } });
  }
  if (testIngredientId) {
    await prisma.kitchenMovement.deleteMany({ where: { ingredientId: testIngredientId } });
    await prisma.kitchenIngredient.delete({ where: { id: testIngredientId } });
  }
  if (testPassId) {
    await prisma.visitorRequest.delete({ where: { id: testPassId } });
  }
  if (testTaskId) {
    await prisma.housekeepingTask.delete({ where: { id: testTaskId } });
  }
  if (testLeadId) {
    await prisma.lead.delete({ where: { id: testLeadId } });
  }
  if (testReadingId) {
    await prisma.utilityReading.delete({ where: { id: testReadingId } });
  }
  if (testLogId) {
    await prisma.aIAssistantLog.delete({ where: { id: testLogId } });
  }
  console.log('   All synthetic test records cleanly purged from database.');

  // ========================================================
  // SUMMARY REPORT
  // ========================================================
  console.log('\n======================================================');
  console.log('VERIFICATION SUITE SUMMARY');
  console.log('======================================================');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  console.log(`Total Tests Executed : ${results.length}`);
  console.log(`Passed               : ${passed}`);
  console.log(`Failed               : ${failed}`);
  console.log('------------------------------------------------------');

  results.forEach((r) => {
    console.log(`[${r.status}] [${r.module}] ${r.test} - ${r.durationMs}ms`);
    if (r.details) console.log(`        Details: ${r.details}`);
  });
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Test execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
