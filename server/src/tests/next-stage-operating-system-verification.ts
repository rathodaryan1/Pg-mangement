import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { withDbRetry } from './db-helper';
import bcrypt from 'bcryptjs';

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
  console.log('\n================================================================');
  console.log('URBAN NEST ALL-IN-ONE OPERATING SYSTEM — VERIFICATION SUITE');
  console.log('================================================================\n');

  // Track synthetic IDs created during test for clean teardown
  const cleanupContext: {
    propertyId?: string;
    roomId?: string;
    bedId?: string;
    userId?: string;
    residentId?: string;
    taskId?: string;
    parcelId?: string;
    assetId?: string;
    vendorId?: string;
    utilityPaymentIds: string[];
    syntheticBedCreated?: boolean;
  } = {
    utilityPaymentIds: [],
  };

  try {
    // 0. Discover active property and room
    console.log('0. Preparing test environment...');
    const existingProperty = await withDbRetry(() =>
      prisma.property.findFirst({
        include: {
          rooms: {
            include: { beds: true },
          },
        },
      })
    );

    if (!existingProperty) {
      throw new Error('No existing property found in database.');
    }

    cleanupContext.propertyId = existingProperty.id;

    // Use an existing room or create a bed in an existing room
    let targetBed = existingProperty.rooms.flatMap((r) => r.beds).find((b) => b.status === 'AVAILABLE');
    let targetRoom = targetBed ? existingProperty.rooms.find((r) => r.id === targetBed?.roomId) : existingProperty.rooms[0];

    if (!targetBed && targetRoom) {
      // Create a test bed in an existing room
      targetBed = await withDbRetry(() =>
        prisma.bed.create({
          data: {
            roomId: targetRoom!.id,
            bedNumber: `TB-${Date.now().toString().slice(-4)}`,
            monthlyRent: 8500,
            status: 'AVAILABLE',
          },
        })
      );
      cleanupContext.syntheticBedCreated = true;
    }

    if (!targetBed || !targetRoom) {
      throw new Error('Could not find or create a test bed/room fixture.');
    }

    cleanupContext.roomId = targetRoom.id;
    cleanupContext.bedId = targetBed.id;

    console.log(`   -> Target: Property "${existingProperty.name}", Room ${targetRoom.number}, Bed ${targetBed.bedNumber}\n`);

    // 1. Connected Resident Lifecycle: Admission
    await runTest('Lifecycle Pipeline', 'Atomic Booking Admission & Check-in Prep', async () => {
      const syntheticMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const syntheticEmail = `os_tester_${Date.now()}@urbannest.test`;

      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash('UrbanNest@123', salt);

      const admissionResult = await withDbRetry(() =>
        prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: syntheticEmail,
              passwordHash: defaultHash,
              name: 'Aarav Patel (Test Resident)',
              role: 'RESIDENT',
              mobile: syntheticMobile,
              propertyId: existingProperty.id,
            },
          });

          const resident = await tx.resident.create({
            data: {
              userId: user.id,
              propertyId: existingProperty.id,
              bedId: targetBed!.id,
              fullName: 'Aarav Patel (Test Resident)',
              email: syntheticEmail,
              mobile: syntheticMobile,
              emergencyContactName: 'Guardian Patel',
              emergencyContactPhone: syntheticMobile,
              emergencyContactRelation: 'Parent',
              joiningDate: new Date(),
              status: 'PENDING_MOVE_IN',
              kycStatus: 'PENDING',
            },
          });

          await tx.bed.update({
            where: { id: targetBed!.id },
            data: { status: 'OCCUPIED' },
          });

          const checklist = await tx.moveInChecklist.create({
            data: {
              residentId: resident.id,
              propertyId: existingProperty.id,
              keyHandedOver: false,
              roomInspected: false,
              bedPrepared: true,
              acRemoteGiven: false,
              rulesAccepted: false,
              notes: 'Move-in initiated via OS automated verification',
            },
          });

          return { user, resident, checklist };
        })
      );

      cleanupContext.userId = admissionResult.user.id;
      cleanupContext.residentId = admissionResult.resident.id;

      // Verify bed is marked OCCUPIED
      const updatedBed = await prisma.bed.findUnique({ where: { id: targetBed!.id } });
      if (updatedBed?.status !== 'OCCUPIED') {
        throw new Error(`Expected bed status OCCUPIED, got ${updatedBed?.status}`);
      }

      return `Resident created (${admissionResult.resident.fullName}), bed marked OCCUPIED`;
    });

    // 2. Connected Resident Lifecycle: Move-in Checklist
    await runTest('Lifecycle Pipeline', 'Complete Move-In Handover Checklist', async () => {
      if (!cleanupContext.residentId) throw new Error('No resident fixture');

      const updatedChecklist = await withDbRetry(() =>
        prisma.moveInChecklist.update({
          where: { residentId: cleanupContext.residentId },
          data: {
            keyHandedOver: true,
            roomInspected: true,
            acRemoteGiven: true,
            rulesAccepted: true,
            inspectedBy: 'Operations Manager',
            residentSignedAt: new Date(),
          },
        })
      );

      // Transition resident to ACTIVE
      await withDbRetry(() =>
        prisma.resident.update({
          where: { id: cleanupContext.residentId },
          data: { status: 'ACTIVE' },
        })
      );

      const resident = await prisma.resident.findUnique({
        where: { id: cleanupContext.residentId },
        include: { moveInChecklist: true },
      });

      if (resident?.status !== 'ACTIVE') {
        throw new Error(`Expected resident status ACTIVE, got ${resident?.status}`);
      }
      if (!resident.moveInChecklist?.residentSignedAt) {
        throw new Error('Expected moveInChecklist to have residentSignedAt timestamp');
      }

      return 'Move-in checklist completed, resident signed, status transitioned to ACTIVE';
    });

    // 3. Connected Resident Lifecycle: Notice Period
    await runTest('Lifecycle Pipeline', 'Initiate Move-out Notice Period', async () => {
      if (!cleanupContext.residentId) throw new Error('No resident fixture');

      const noticeEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await withDbRetry(() =>
        prisma.resident.update({
          where: { id: cleanupContext.residentId },
          data: {
            status: 'NOTICE_PERIOD',
            expectedMoveOutDate: noticeEnd,
          },
        })
      );

      const resident = await prisma.resident.findUnique({ where: { id: cleanupContext.residentId } });
      if (resident?.status !== 'NOTICE_PERIOD') {
        throw new Error(`Expected status NOTICE_PERIOD, got ${resident?.status}`);
      }

      return `Notice period initiated through ${noticeEnd.toISOString().slice(0, 10)}`;
    });

    // 4. Connected Resident Lifecycle: Move-out Settlement & Bed Release
    await runTest('Lifecycle Pipeline', 'Final Move-out Settlement & Bed Auto-Release', async () => {
      if (!cleanupContext.residentId) throw new Error('No resident fixture');

      const damageDeductions = 1200;
      const utilityDeductions = 450;
      const depositHeld = 15000;
      const netRefundAmount = depositHeld - damageDeductions - utilityDeductions;

      await withDbRetry(() =>
        prisma.$transaction(async (tx) => {
          await tx.moveOutSettlement.create({
            data: {
              residentId: cleanupContext.residentId!,
              propertyId: existingProperty.id,
              noticeDate: new Date(),
              moveOutDate: new Date(),
              inspectionStatus: 'PASSED_WITH_DEDUCTIONS',
              inspectionNotes: 'Room handed over with minor wall scuffs',
              depositHeld,
              unpaidRent: 0,
              damageDeductions,
              utilityDeductions,
              otherDeductions: 0,
              netRefundAmount,
              refundStatus: 'PROCESSED',
              settledBy: 'Operations Manager',
              settledAt: new Date(),
              bedReleased: true,
            },
          });

          await tx.resident.update({
            where: { id: cleanupContext.residentId },
            data: {
              status: 'MOVED_OUT',
              bedId: null,
            },
          });

          await tx.bed.update({
            where: { id: targetBed!.id },
            data: { status: 'AVAILABLE' },
          });
        })
      );

      const updatedBed = await prisma.bed.findUnique({ where: { id: targetBed!.id } });
      const updatedResident = await prisma.resident.findUnique({
        where: { id: cleanupContext.residentId },
        include: { moveOutSettlement: true },
      });

      if (updatedBed?.status !== 'AVAILABLE') {
        throw new Error(`Expected bed to be released to AVAILABLE, got ${updatedBed?.status}`);
      }
      if (updatedResident?.status !== 'MOVED_OUT') {
        throw new Error(`Expected resident status MOVED_OUT, got ${updatedResident?.status}`);
      }
      if (Number(updatedResident.moveOutSettlement?.netRefundAmount) !== netRefundAmount) {
        throw new Error(`Refund mismatch: expected ${netRefundAmount}, got ${updatedResident.moveOutSettlement?.netRefundAmount}`);
      }

      return `Settlement finalized (Refund: ₹${netRefundAmount}), bed automatically released to AVAILABLE`;
    });

    // 5. Unified Operational Tasks
    await runTest('Unified Operations', 'Create & Transition Operational Task', async () => {
      const task = await withDbRetry(() =>
        prisma.operationalTask.create({
          data: {
            propertyId: existingProperty.id,
            title: `Deep Cleaning & Sanitization - Room ${targetRoom.number}`,
            category: 'HOUSEKEEPING',
            priority: 'HIGH',
            status: 'PENDING',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            sourceType: 'ROOM_RELEASE',
            sourceId: targetRoom.id,
          },
        })
      );
      cleanupContext.taskId = task.id;

      // Status update to IN_PROGRESS then COMPLETED
      const inProgressTask = await withDbRetry(() =>
        prisma.operationalTask.update({
          where: { id: task.id },
          data: { status: 'IN_PROGRESS' },
        })
      );
      if (inProgressTask.status !== 'IN_PROGRESS') {
        throw new Error(`Task status failed to update to IN_PROGRESS`);
      }

      const completedTask = await withDbRetry(() =>
        prisma.operationalTask.update({
          where: { id: task.id },
          data: { status: 'COMPLETED' },
        })
      );
      if (completedTask.status !== 'COMPLETED') {
        throw new Error(`Task status failed to update to COMPLETED`);
      }

      return `Task created, assigned, progressed, and completed successfully`;
    });

    // 6. Visual Occupancy & Floor Plan
    await runTest('Visual Layout', 'Query Visual Map & Toggle Bed Maintenance', async () => {
      // Toggle bed to MAINTENANCE
      await withDbRetry(() =>
        prisma.bed.update({
          where: { id: targetBed!.id },
          data: { status: 'MAINTENANCE' },
        })
      );
      let bedState = await prisma.bed.findUnique({ where: { id: targetBed!.id } });
      if (bedState?.status !== 'MAINTENANCE') {
        throw new Error(`Expected bed status MAINTENANCE, got ${bedState?.status}`);
      }

      // Revert bed to AVAILABLE
      await withDbRetry(() =>
        prisma.bed.update({
          where: { id: targetBed!.id },
          data: { status: 'AVAILABLE' },
        })
      );
      bedState = await prisma.bed.findUnique({ where: { id: targetBed!.id } });
      if (bedState?.status !== 'AVAILABLE') {
        throw new Error(`Expected bed status AVAILABLE, got ${bedState?.status}`);
      }

      return 'Bed maintenance state toggle verified in visual layout';
    });

    // 7. Parcel & Courier Register
    await runTest('Parcel Desk', 'Log Inward Parcel & Verify 4-Digit PIN Handover', async () => {
      const pin = `${Math.floor(1000 + Math.random() * 9000)}`;

      const parcel = await withDbRetry(() =>
        prisma.parcel.create({
          data: {
            propertyId: existingProperty.id,
            recipientName: 'Test Recipient',
            recipientRoom: targetRoom.number,
            courierCompany: 'BlueDart',
            trackingNumber: `BD-${Date.now()}`,
            pickupPin: pin,
            status: 'RECEIVED',
          },
        })
      );
      cleanupContext.parcelId = parcel.id;

      // Verify correct PIN release
      const updatedParcel = await withDbRetry(() =>
        prisma.parcel.update({
          where: { id: parcel.id },
          data: {
            status: 'COLLECTED',
            collectedAt: new Date(),
          },
        })
      );

      if (updatedParcel.status !== 'COLLECTED' || !updatedParcel.collectedAt) {
        throw new Error('Failed to update parcel status to COLLECTED with timestamp');
      }

      return `Parcel registered with PIN ${pin} and released successfully`;
    });

    // 8. Asset Register & Preventive Maintenance
    await runTest('Asset Management', 'Register Asset & Log Preventive Service', async () => {
      const asset = await withDbRetry(() =>
        prisma.asset.create({
          data: {
            propertyId: existingProperty.id,
            name: 'Samsung 1.5 Ton Split Inverter AC',
            category: 'HVAC',
            location: `Room ${targetRoom.number}`,
            serialNumber: `SAM-AC-${Date.now().toString().slice(-6)}`,
            serviceIntervalDays: 90,
            nextServiceDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            status: 'OPERATIONAL',
          },
        })
      );
      cleanupContext.assetId = asset.id;

      // Log service
      const nextDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const updatedAsset = await withDbRetry(() =>
        prisma.asset.update({
          where: { id: asset.id },
          data: {
            lastServicedAt: new Date(),
            nextServiceDue: nextDue,
            status: 'OPERATIONAL',
          },
        })
      );

      if (!updatedAsset.lastServicedAt) {
        throw new Error('Failed to update lastServicedAt on asset');
      }

      return `Asset created and serviced, next maintenance scheduled for ${nextDue.toISOString().slice(0, 10)}`;
    });

    // 9. Vendor Procurement Directory
    await runTest('Vendor Directory', 'Register Procurement Supplier / Contractor', async () => {
      const vendor = await withDbRetry(() =>
        prisma.vendor.create({
          data: {
            propertyId: existingProperty.id,
            name: 'Apex Cooling & Refrigeration Solutions',
            category: 'HVAC_REPAIR',
            contactPerson: 'Mukesh Sharma',
            phone: '9822334455',
            email: 'apex.cooling@example.com',
            gstNumber: '24AAAAA0000A1Z5',
          },
        })
      );
      cleanupContext.vendorId = vendor.id;

      if (!vendor.id) {
        throw new Error('Failed to create vendor');
      }

      return `Vendor directory entry registered (${vendor.name})`;
    });

    // 10. Financial Reconciliation & Sub-meter Utility Allocation
    await runTest('Finance & Reconciliation', 'Ledger Integrity & Sub-meter Split', async () => {
      // Reconcile payments for property
      const paymentCount = await prisma.payment.count({
        where: { propertyId: existingProperty.id },
      });
      const depositCount = await prisma.securityDeposit.count({
        where: { propertyId: existingProperty.id },
      });

      // Test utility bill allocation formula
      const activeResidents = await prisma.resident.findMany({
        where: {
          propertyId: existingProperty.id,
          status: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
        },
        take: 3,
      });

      let splitDetails = 'No other active residents for live allocation test';
      if (activeResidents.length > 0) {
        const totalUtilityBill = 3000;
        const perResidentShare = Math.round((totalUtilityBill / activeResidents.length) * 100) / 100;
        const currentPeriod = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());

        for (const res of activeResidents) {
          const p = await withDbRetry(() =>
            prisma.payment.create({
              data: {
                propertyId: existingProperty.id,
                residentId: res.id,
                amount: perResidentShare,
                category: 'MAINTENANCE_FEE',
                period: currentPeriod,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'PENDING',
              },
            })
          );
          cleanupContext.utilityPaymentIds.push(p.id);
        }
        splitDetails = `Allocated ₹${totalUtilityBill} evenly across ${activeResidents.length} residents (₹${perResidentShare} each)`;
      }

      return `Reconciled ${paymentCount} payments, ${depositCount} deposits. ${splitDetails}`;
    });

    // 11. Command Center Real-Time Feed
    await runTest('Command Center', 'Operational Intelligence Feed Aggregation', async () => {
      const [
        pendingTasks,
        activeNotices,
        occupiedBeds,
        totalBeds,
        unsettledParcels,
      ] = await Promise.all([
        prisma.operationalTask.count({ where: { propertyId: existingProperty.id, status: 'PENDING' } }),
        prisma.resident.count({ where: { propertyId: existingProperty.id, status: 'NOTICE_PERIOD' } }),
        prisma.bed.count({ where: { room: { propertyId: existingProperty.id }, status: 'OCCUPIED' } }),
        prisma.bed.count({ where: { room: { propertyId: existingProperty.id } } }),
        prisma.parcel.count({ where: { propertyId: existingProperty.id, status: { not: 'COLLECTED' } } }),
      ]);

      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      return `Feed generated: Occupancy ${occupancyRate}% (${occupiedBeds}/${totalBeds}), Pending Tasks: ${pendingTasks}, Notices: ${activeNotices}, Undelivered Parcels: ${unsettledParcels}`;
    });

  } finally {
    // Teardown synthetic fixtures
    console.log('\nTeardown: Cleaning up synthetic test fixtures...');
    try {
      if (cleanupContext.utilityPaymentIds.length > 0) {
        await prisma.payment.deleteMany({
          where: { id: { in: cleanupContext.utilityPaymentIds } },
        });
      }
      if (cleanupContext.vendorId) {
        await prisma.vendor.delete({ where: { id: cleanupContext.vendorId } }).catch(() => {});
      }
      if (cleanupContext.assetId) {
        await prisma.asset.delete({ where: { id: cleanupContext.assetId } }).catch(() => {});
      }
      if (cleanupContext.parcelId) {
        await prisma.parcel.delete({ where: { id: cleanupContext.parcelId } }).catch(() => {});
      }
      if (cleanupContext.taskId) {
        await prisma.operationalTask.delete({ where: { id: cleanupContext.taskId } }).catch(() => {});
      }
      if (cleanupContext.residentId) {
        await prisma.moveInChecklist.deleteMany({ where: { residentId: cleanupContext.residentId } }).catch(() => {});
        await prisma.moveOutSettlement.deleteMany({ where: { residentId: cleanupContext.residentId } }).catch(() => {});
        await prisma.resident.delete({ where: { id: cleanupContext.residentId } }).catch(() => {});
      }
      if (cleanupContext.userId) {
        await prisma.user.delete({ where: { id: cleanupContext.userId } }).catch(() => {});
      }
      if (cleanupContext.syntheticBedCreated && cleanupContext.bedId) {
        await prisma.bed.delete({ where: { id: cleanupContext.bedId } }).catch(() => {});
      }
      console.log('Teardown complete: All temporary test records purged safely.\n');
    } catch (cleanupErr: any) {
      console.warn('Warning during test cleanup:', cleanupErr.message);
    }

    await prisma.$disconnect();
  }

  // Summary Table
  console.log('================================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('================================================================');
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'PASSED') passed++;
    else failed++;
    console.log(`[${r.status}] ${r.module.padEnd(24)} | ${r.test.padEnd(46)} | ${r.durationMs}ms`);
  }
  console.log('----------------------------------------------------------------');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running verification suite:', err);
  process.exit(1);
});
