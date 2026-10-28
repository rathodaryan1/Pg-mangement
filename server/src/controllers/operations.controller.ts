import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { withDbRetry } from '../tests/db-helper';
import bcrypt from 'bcryptjs';

export class OperationsController {
  // =========================================================================
  // 1. CONNECTED RESIDENT LIFECYCLE (ENQUIRY -> BOOKING -> ADMISSION -> SETTLEMENT)
  // =========================================================================

  /**
   * Pipeline Overview: Grouped count and active items across all lifecycle stages
   */
  static async getLifecyclePipeline(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const [leads, bookings, pendingMoveIns, activeResidents, noticePeriodResidents, settlements] =
        await Promise.all([
          withDbRetry(() =>
            prisma.lead.findMany({
              where: { propertyId, status: { in: ['NEW', 'CONTACTED', 'VISIT_SCHEDULED'] } },
              orderBy: { createdAt: 'desc' },
              take: 20,
            })
          ),
          withDbRetry(() =>
            prisma.booking.findMany({
              where: { propertyId, status: { in: ['PENDING', 'CONFIRMED'] } },
              include: { lead: true },
              orderBy: { createdAt: 'desc' },
              take: 20,
            })
          ),
          withDbRetry(() =>
            prisma.resident.findMany({
              where: { propertyId, status: 'PENDING_MOVE_IN' },
              include: { bed: { include: { room: true } }, moveInChecklist: true },
              orderBy: { createdAt: 'desc' },
              take: 20,
            })
          ),
          withDbRetry(() =>
            prisma.resident.findMany({
              where: { propertyId, status: 'ACTIVE' },
              include: { bed: { include: { room: true } } },
              orderBy: { joiningDate: 'desc' },
              take: 20,
            })
          ),
          withDbRetry(() =>
            prisma.resident.findMany({
              where: { propertyId, status: 'NOTICE_PERIOD' },
              include: { bed: { include: { room: true } }, moveOutSettlement: true },
              orderBy: { expectedMoveOutDate: 'asc' },
              take: 20,
            })
          ),
          withDbRetry(() =>
            prisma.moveOutSettlement.findMany({
              where: { propertyId },
              include: { resident: true },
              orderBy: { updatedAt: 'desc' },
              take: 20,
            })
          ),
        ]);

      return sendSuccess(res, {
        summary: {
          activeLeadsCount: leads.length,
          confirmedBookingsCount: bookings.length,
          pendingMoveInsCount: pendingMoveIns.length,
          activeResidentsCount: activeResidents.length,
          noticePeriodCount: noticePeriodResidents.length,
          settlementsCount: settlements.length,
        },
        pipeline: {
          leads,
          bookings,
          pendingMoveIns,
          activeResidents,
          noticePeriodResidents,
          settlements,
        },
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch lifecycle pipeline', 500);
    }
  }

  /**
   * Atomic Admission: Converts Booking into Resident, Agreement, Deposit, Invoice, and Checklist
   */
  static async admitBooking(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        bookingId,
        propertyId,
        bedId,
        fullName,
        email,
        mobile,
        monthlyRent,
        depositAmount,
        leaseStartDate,
        leaseEndDate,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
      } = req.body;

      const targetPropertyId = propertyId || req.user?.propertyId;
      if (!targetPropertyId || !fullName || !email || !mobile || !bedId) {
        return sendError(res, 'Property, bed, full name, email, and mobile are required for admission.', 400);
      }

      // Check Bed status
      const bed = await prisma.bed.findUnique({
        where: { id: bedId },
        include: { room: true },
      });
      if (!bed) return sendError(res, 'Bed not found.', 404);
      if (bed.status === 'OCCUPIED') {
        return sendError(res, 'Selected bed is already occupied.', 400);
      }

      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash('UrbanNest@123', salt);

      const admissionResult = await prisma.$transaction(async (tx) => {
        // 1. Create or link user
        let user = await tx.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
          user = await tx.user.create({
            data: {
              email: email.toLowerCase().trim(),
              passwordHash: defaultHash,
              name: fullName.trim(),
              role: 'RESIDENT',
              mobile: mobile.trim(),
              tenantId: req.user?.tenantId || null,
              propertyId: targetPropertyId,
            },
          });
        }

        // 2. Create Resident Profile
        const resident = await tx.resident.create({
          data: {
            userId: user.id,
            propertyId: targetPropertyId,
            bedId,
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            mobile: mobile.trim(),
            emergencyContactName: emergencyContactName || 'Guardian',
            emergencyContactPhone: emergencyContactPhone || mobile.trim(),
            emergencyContactRelation: emergencyContactRelation || 'Parent',
            joiningDate: leaseStartDate ? new Date(leaseStartDate) : new Date(),
            status: 'PENDING_MOVE_IN',
            kycStatus: 'PENDING',
          },
        });

        // 3. Mark Bed Occupied
        await tx.bed.update({
          where: { id: bedId },
          data: {
            status: 'OCCUPIED',
            monthlyRent: monthlyRent ? parseFloat(monthlyRent) : bed.monthlyRent,
          },
        });

        // 4. Create Agreement
        const start = leaseStartDate ? new Date(leaseStartDate) : new Date();
        const end = leaseEndDate ? new Date(leaseEndDate) : new Date(Date.now() + 365 * 86400000);
        const agreement = await tx.agreement.create({
          data: {
            residentId: resident.id,
            propertyId: targetPropertyId,
            agreementNumber: `AGR-${Date.now().toString().slice(-6)}`,
            validFrom: start,
            validTill: end,
            status: 'ACTIVE',
          },
        });

        // 5. Create Security Deposit Record
        const depVal = parseFloat(depositAmount || '0');
        if (depVal > 0) {
          await tx.securityDeposit.create({
            data: {
              residentId: resident.id,
              propertyId: targetPropertyId,
              amount: depVal,
              status: 'PAID',
              paidAt: new Date(),
            },
          });
        }

        // 6. Create Initial Move-in Rent Invoice
        const rentVal = parseFloat(monthlyRent || bed.monthlyRent.toString());
        await tx.payment.create({
          data: {
            residentId: resident.id,
            propertyId: targetPropertyId,
            amount: rentVal,
            category: 'RENT',
            period: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(start),
            dueDate: new Date(Date.now() + 5 * 86400000), // Due in 5 days
            status: 'PENDING',
          },
        });

        // 7. Initialize Move-In Checklist
        const checklist = await tx.moveInChecklist.create({
          data: {
            residentId: resident.id,
            propertyId: targetPropertyId,
            keyHandedOver: false,
            roomInspected: false,
            bedPrepared: true,
            acRemoteGiven: false,
            rulesAccepted: false,
            notes: 'Move-in initiated upon admission approval',
          },
        });

        // 8. If bookingId provided, complete Booking & convert Lead
        if (bookingId) {
          const booking = await tx.booking.update({
            where: { id: bookingId },
            data: { status: 'COMPLETED' },
          });
          if (booking.leadId) {
            await tx.lead.update({
              where: { id: booking.leadId },
              data: { status: 'CONVERTED' },
            }).catch(() => {});
          }
        }

        return { resident, agreement, checklist };
      });

      return sendSuccess(res, admissionResult, 'Resident admitted and onboarding initialized.');
    } catch (error: any) {
      return sendError(res, error.message || 'Admission failed', 500);
    }
  }

  /**
   * Move-In Checklist: Fetch or update verification items
   */
  static async updateMoveInChecklist(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { residentId } = req.params;
      const { keyHandedOver, roomInspected, bedPrepared, acRemoteGiven, rulesAccepted, notes, inspectedBy } =
        req.body;

      if (!residentId) return sendError(res, 'Resident ID required.', 400);

      const checklist = await withDbRetry(() =>
        prisma.moveInChecklist.upsert({
          where: { residentId },
          update: {
            keyHandedOver: keyHandedOver ?? undefined,
            roomInspected: roomInspected ?? undefined,
            bedPrepared: bedPrepared ?? undefined,
            acRemoteGiven: acRemoteGiven ?? undefined,
            rulesAccepted: rulesAccepted ?? undefined,
            notes: notes ?? undefined,
            inspectedBy: inspectedBy || req.user?.name,
            residentSignedAt: rulesAccepted ? new Date() : undefined,
          },
          create: {
            residentId,
            propertyId: req.user?.propertyId || '',
            keyHandedOver: !!keyHandedOver,
            roomInspected: !!roomInspected,
            bedPrepared: !!bedPrepared,
            acRemoteGiven: !!acRemoteGiven,
            rulesAccepted: !!rulesAccepted,
            inspectedBy: inspectedBy || req.user?.name,
            notes,
          },
        })
      );

      // If key handed over and rules accepted, activate resident
      if (checklist.keyHandedOver && checklist.rulesAccepted) {
        await prisma.resident.update({
          where: { id: residentId },
          data: { status: 'ACTIVE' },
        });
      }

      return sendSuccess(res, checklist, 'Move-in checklist updated.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update move-in checklist', 500);
    }
  }

  /**
   * Initiate Move-Out & Notice Period
   */
  static async initiateMoveOutNotice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { residentId, noticeEndDate, reason } = req.body;
      if (!residentId || !noticeEndDate) {
        return sendError(res, 'Resident ID and notice end date are required.', 400);
      }

      const resident = await prisma.resident.findUnique({
        where: { id: residentId },
        include: { securityDeposits: true, bed: true },
      });
      if (!resident) return sendError(res, 'Resident not found.', 404);

      const depositHeld = resident.securityDeposits.reduce((acc, d) => acc + d.amount, 0);

      const result = await prisma.$transaction(async (tx) => {
        // 1. Update resident status to NOTICE_PERIOD
        await tx.resident.update({
          where: { id: residentId },
          data: {
            status: 'NOTICE_PERIOD',
            expectedMoveOutDate: new Date(noticeEndDate),
          },
        });

        // 2. Initialize MoveOutSettlement
        const settlement = await tx.moveOutSettlement.upsert({
          where: { residentId },
          update: {
            noticeDate: new Date(),
            moveOutDate: new Date(noticeEndDate),
            depositHeld,
            inspectionNotes: reason || 'Notice period initiated',
          },
          create: {
            residentId,
            propertyId: resident.propertyId,
            noticeDate: new Date(),
            moveOutDate: new Date(noticeEndDate),
            depositHeld,
            unpaidRent: 0,
            damageDeductions: 0,
            utilityDeductions: 0,
            otherDeductions: 0,
            netRefundAmount: depositHeld,
            inspectionNotes: reason || 'Notice period initiated',
          },
        });

        return settlement;
      });

      return sendSuccess(res, result, 'Resident placed on notice period.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to initiate notice period', 500);
    }
  }

  /**
   * Finalize Move-Out Settlement & Atomically Release Bed
   */
  static async finalizeMoveOutSettlement(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        residentId,
        damageDeductions = 0,
        utilityDeductions = 0,
        otherDeductions = 0,
        inspectionStatus = 'PASSED',
        inspectionNotes,
      } = req.body;

      if (!residentId) return sendError(res, 'Resident ID is required.', 400);

      const resident = await prisma.resident.findUnique({
        where: { id: residentId },
        include: {
          bed: true,
          securityDeposits: true,
          payments: { where: { status: 'PENDING' } },
        },
      });
      if (!resident) return sendError(res, 'Resident not found.', 404);

      const depositHeld = resident.securityDeposits.reduce((acc, d) => acc + d.amount, 0);
      const unpaidRent = resident.payments.reduce((acc, p) => acc + p.amount, 0);

      const totalDeductions =
        parseFloat(damageDeductions) +
        parseFloat(utilityDeductions) +
        parseFloat(otherDeductions) +
        unpaidRent;

      const netRefundAmount = Math.max(0, depositHeld - totalDeductions);

      const settlementResult = await prisma.$transaction(async (tx) => {
        // 1. Update or create MoveOutSettlement
        const settlement = await tx.moveOutSettlement.upsert({
          where: { residentId },
          update: {
            inspectionStatus,
            inspectionNotes: inspectionNotes || 'Final inspection completed',
            depositHeld,
            unpaidRent,
            damageDeductions: parseFloat(damageDeductions),
            utilityDeductions: parseFloat(utilityDeductions),
            otherDeductions: parseFloat(otherDeductions),
            netRefundAmount,
            refundStatus: netRefundAmount > 0 ? 'PROCESSED' : 'COMPLETED',
            settledBy: req.user?.name || 'Owner / Manager',
            settledAt: new Date(),
            bedReleased: true,
          },
          create: {
            residentId,
            propertyId: resident.propertyId,
            noticeDate: new Date(),
            moveOutDate: new Date(),
            inspectionStatus,
            inspectionNotes: inspectionNotes || 'Final inspection completed',
            depositHeld,
            unpaidRent,
            damageDeductions: parseFloat(damageDeductions),
            utilityDeductions: parseFloat(utilityDeductions),
            otherDeductions: parseFloat(otherDeductions),
            netRefundAmount,
            refundStatus: netRefundAmount > 0 ? 'PROCESSED' : 'COMPLETED',
            settledBy: req.user?.name || 'Owner / Manager',
            settledAt: new Date(),
            bedReleased: true,
          },
        });

        // 2. Release Bed
        if (resident.bedId) {
          await tx.bed.update({
            where: { id: resident.bedId },
            data: { status: 'AVAILABLE' },
          });
        }

        // 3. Mark Resident MOVED_OUT
        await tx.resident.update({
          where: { id: residentId },
          data: {
            status: 'MOVED_OUT',
            bedId: null,
          },
        });

        // 4. Update Security Deposit status
        if (resident.securityDeposits.length > 0) {
          await tx.securityDeposit.updateMany({
            where: { residentId },
            data: {
              status: netRefundAmount === depositHeld ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
              deductions: totalDeductions,
              refundAmount: netRefundAmount,
              notes: inspectionNotes || 'Settlement processed and bed released',
            },
          });
        }

        return settlement;
      });

      return sendSuccess(res, settlementResult, 'Move-out settled successfully. Bed released for new bookings.');
    } catch (error: any) {
      return sendError(res, error.message || 'Settlement failed', 500);
    }
  }

  // =========================================================================
  // 2. UNIFIED OPERATIONS & STAFF TASK CENTER
  // =========================================================================

  /**
   * Unified Operational Tasks Feed
   */
  static async getOperationalTasks(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      const { category, priority, status } = req.query;

      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const whereClause: any = { propertyId };
      if (category && category !== 'ALL') whereClause.category = category;
      if (priority && priority !== 'ALL') whereClause.priority = priority;
      if (status && status !== 'ALL') whereClause.status = status;

      const [tasks, complaints, housekeeping] = await Promise.all([
        withDbRetry(() =>
          prisma.operationalTask.findMany({
            where: whereClause,
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
            take: 50,
          })
        ),
        withDbRetry(() =>
          prisma.complaint.findMany({
            where: { propertyId, status: { in: ['REPORTED', 'ASSIGNED', 'IN_PROGRESS'] } },
            include: { resident: { select: { fullName: true } }, room: { select: { number: true } } },
            orderBy: { createdAt: 'desc' },
            take: 30,
          })
        ),
        withDbRetry(() =>
          prisma.housekeepingTask.findMany({
            where: { propertyId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
            orderBy: { scheduledAt: 'asc' },
            take: 30,
          })
        ),
      ]);

      return sendSuccess(res, {
        tasks,
        activeComplaints: complaints,
        pendingHousekeeping: housekeeping,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch operational tasks', 500);
    }
  }

  /**
   * Create an Operational Task / Work Order
   */
  static async createOperationalTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, title, category, priority, assignedTo, dueDate, notes, sourceType, sourceId } =
        req.body;

      const targetPropertyId = propertyId || req.user?.propertyId;
      if (!targetPropertyId || !title) {
        return sendError(res, 'Property and task title are required.', 400);
      }

      const task = await withDbRetry(() =>
        prisma.operationalTask.create({
          data: {
            propertyId: targetPropertyId,
            title,
            category: category || 'MAINTENANCE',
            priority: priority || 'MEDIUM',
            assignedTo: assignedTo || null,
            dueDate: dueDate ? new Date(dueDate) : null,
            notes: notes || null,
            sourceType: sourceType || 'MANUAL',
            sourceId: sourceId || null,
            status: 'PENDING',
          },
        })
      );

      return sendSuccess(res, task, 'Operational task dispatched.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create task', 500);
    }
  }

  /**
   * Update Task Status & Activity History
   */
  static async updateTaskStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status, notes, assignedTo } = req.body;

      if (!id || !status) return sendError(res, 'Task ID and status are required.', 400);

      const task = await withDbRetry(() =>
        prisma.operationalTask.update({
          where: { id },
          data: {
            status,
            notes: notes || undefined,
            assignedTo: assignedTo || undefined,
          },
        })
      );

      return sendSuccess(res, task, 'Task updated.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update task', 500);
    }
  }

  // =========================================================================
  // 3. VISUAL ROOM, FLOOR & BED MANAGEMENT
  // =========================================================================

  /**
   * Visual Occupancy Map: Buildings -> Floors -> Rooms -> Beds with status
   */
  static async getVisualOccupancyMap(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const property = await withDbRetry(() =>
        prisma.property.findUnique({
          where: { id: propertyId },
          include: {
            buildings: {
              include: {
                floors: {
                  include: {
                    rooms: {
                      include: {
                        beds: {
                          include: {
                            resident: {
                              select: {
                                id: true,
                                fullName: true,
                                mobile: true,
                                status: true,
                                expectedMoveOutDate: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            rooms: {
              where: { floorId: null },
              include: {
                beds: {
                  include: {
                    resident: {
                      select: {
                        id: true,
                        fullName: true,
                        mobile: true,
                        status: true,
                        expectedMoveOutDate: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
      );

      if (!property) return sendError(res, 'Property not found.', 404);

      // Summarize beds
      let totalBeds = 0;
      let occupiedBeds = 0;
      let availableBeds = 0;
      let reservedBeds = 0;
      let maintenanceBeds = 0;

      const allRooms = [
        ...property.rooms,
        ...property.buildings.flatMap((b) => b.floors.flatMap((f) => f.rooms)),
      ];

      allRooms.forEach((r) => {
        r.beds.forEach((b) => {
          totalBeds++;
          if (b.status === 'OCCUPIED') occupiedBeds++;
          else if (b.status === 'AVAILABLE') availableBeds++;
          else if (b.status === 'RESERVED') reservedBeds++;
          else if (b.status === 'MAINTENANCE') maintenanceBeds++;
        });
      });

      return sendSuccess(res, {
        summary: {
          totalRooms: allRooms.length,
          totalBeds,
          occupiedBeds,
          availableBeds,
          reservedBeds,
          maintenanceBeds,
          occupancyPercentage: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        },
        property: {
          id: property.id,
          name: property.name,
          buildings: property.buildings,
          unassignedRooms: property.rooms,
        },
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch visual occupancy map', 500);
    }
  }

  /**
   * Atomic Bed Transfer
   */
  static async transferResidentBed(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { residentId, targetBedId, reason } = req.body;
      if (!residentId || !targetBedId) {
        return sendError(res, 'Resident ID and target bed ID are required.', 400);
      }

      const targetBed = await prisma.bed.findUnique({ where: { id: targetBedId } });
      if (!targetBed) return sendError(res, 'Target bed not found.', 404);
      if (targetBed.status === 'OCCUPIED') {
        return sendError(res, 'Target bed is already occupied.', 400);
      }

      const resident = await prisma.resident.findUnique({ where: { id: residentId } });
      if (!resident) return sendError(res, 'Resident not found.', 404);

      const oldBedId = resident.bedId;

      await prisma.$transaction(async (tx) => {
        // 1. Release old bed
        if (oldBedId) {
          await tx.bed.update({
            where: { id: oldBedId },
            data: { status: 'AVAILABLE' },
          });
        }

        // 2. Occupy new bed
        await tx.bed.update({
          where: { id: targetBedId },
          data: { status: 'OCCUPIED' },
        });

        // 3. Update resident bedId
        await tx.resident.update({
          where: { id: residentId },
          data: { bedId: targetBedId },
        });

        // 4. Log transfer task/history
        await tx.operationalTask.create({
          data: {
            propertyId: resident.propertyId,
            title: `Room Transfer: ${resident.fullName}`,
            category: 'INSPECTION',
            priority: 'LOW',
            status: 'COMPLETED',
            notes: `Transferred to Bed ${targetBed.bedNumber}. Reason: ${reason || 'Requested by resident'}`,
          },
        });
      });

      return sendSuccess(res, null, 'Resident transferred to new bed successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Bed transfer failed', 500);
    }
  }

  /**
   * Block / Unblock Bed for Maintenance
   */
  static async toggleBedMaintenance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { bedId, isMaintenance, reason } = req.body;
      if (!bedId) return sendError(res, 'Bed ID is required.', 400);

      const newStatus = isMaintenance ? 'MAINTENANCE' : 'AVAILABLE';
      const updated = await withDbRetry(() =>
        prisma.bed.update({
          where: { id: bedId },
          data: { status: newStatus },
        })
      );

      return sendSuccess(res, updated, `Bed status updated to ${newStatus}.`);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update bed status', 500);
    }
  }

  // =========================================================================
  // 4. PARCEL & COURIER DELIVERY WORKFLOW
  // =========================================================================

  /**
   * List Parcels
   */
  static async getParcels(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const parcels = await withDbRetry(() =>
        prisma.parcel.findMany({
          where: { propertyId },
          include: {
            resident: { select: { fullName: true, mobile: true, bed: { select: { bedNumber: true } } } },
          },
          orderBy: { receivedAt: 'desc' },
          take: 50,
        })
      );

      return sendSuccess(res, parcels);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch parcels', 500);
    }
  }

  /**
   * Register Inbound Parcel (Guard Console)
   */
  static async registerParcel(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, residentId, recipientName, recipientRoom, courierCompany, trackingNumber, notes } =
        req.body;

      const targetPropertyId = propertyId || req.user?.propertyId;
      if (!targetPropertyId || !recipientName || !courierCompany) {
        return sendError(res, 'Property, recipient name, and courier company are required.', 400);
      }

      // Generate 4-digit pickup pin
      const pickupPin = Math.floor(1000 + Math.random() * 9000).toString();

      const parcel = await withDbRetry(() =>
        prisma.parcel.create({
          data: {
            propertyId: targetPropertyId,
            residentId: residentId || null,
            recipientName,
            recipientRoom: recipientRoom || null,
            courierCompany,
            trackingNumber: trackingNumber || null,
            pickupPin,
            status: 'RECEIVED',
            receivedByGuard: req.user?.name || 'Security Desk',
            notes: notes || null,
          },
        })
      );

      return sendSuccess(res, parcel, `Parcel logged with pickup PIN: ${pickupPin}`);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to log parcel', 500);
    }
  }

  /**
   * Hand Over / Collect Parcel with Verification PIN
   */
  static async collectParcel(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { pickupPin, collectedBy } = req.body;

      const parcel = await prisma.parcel.findUnique({ where: { id } });
      if (!parcel) return sendError(res, 'Parcel not found.', 404);

      if (pickupPin && parcel.pickupPin !== pickupPin.trim()) {
        return sendError(res, 'Invalid pickup PIN.', 400);
      }

      const updated = await withDbRetry(() =>
        prisma.parcel.update({
          where: { id },
          data: {
            status: 'COLLECTED',
            collectedAt: new Date(),
            collectedBy: collectedBy || parcel.recipientName,
          },
        })
      );

      return sendSuccess(res, updated, 'Parcel handed over successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to hand over parcel', 500);
    }
  }

  // =========================================================================
  // 5. ASSET REGISTER & PREVENTIVE MAINTENANCE
  // =========================================================================

  /**
   * List Assets with Service Status
   */
  static async getAssets(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const assets = await withDbRetry(() =>
        prisma.asset.findMany({
          where: { propertyId },
          orderBy: { nextServiceDue: 'asc' },
        })
      );

      return sendSuccess(res, assets);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch assets', 500);
    }
  }

  /**
   * Register Equipment / Asset
   */
  static async createAsset(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        propertyId,
        name,
        category,
        serialNumber,
        location,
        purchaseDate,
        warrantyExpiry,
        vendorName,
        vendorContact,
        serviceIntervalDays = 90,
        notes,
      } = req.body;

      const targetPropertyId = propertyId || req.user?.propertyId;
      if (!targetPropertyId || !name || !category || !location) {
        return sendError(res, 'Property, asset name, category, and location are required.', 400);
      }

      const nextServiceDue = new Date(Date.now() + parseInt(serviceIntervalDays) * 86400000);

      const asset = await withDbRetry(() =>
        prisma.asset.create({
          data: {
            propertyId: targetPropertyId,
            name,
            category,
            serialNumber: serialNumber || null,
            location,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
            warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
            vendorName: vendorName || null,
            vendorContact: vendorContact || null,
            serviceIntervalDays: parseInt(serviceIntervalDays) || 90,
            nextServiceDue,
            status: 'OPERATIONAL',
            notes: notes || null,
          },
        })
      );

      return sendSuccess(res, asset, 'Asset registered.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to register asset', 500);
    }
  }

  /**
   * Log Service Completion on Asset
   */
  static async logAssetService(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { notes, serviceCost } = req.body;

      const asset = await prisma.asset.findUnique({ where: { id } });
      if (!asset) return sendError(res, 'Asset not found.', 404);

      const nextServiceDue = new Date(Date.now() + asset.serviceIntervalDays * 86400000);

      const updated = await withDbRetry(() =>
        prisma.asset.update({
          where: { id },
          data: {
            lastServicedAt: new Date(),
            nextServiceDue,
            status: 'OPERATIONAL',
            notes: notes ? `${asset.notes || ''}\n[${new Date().toISOString().split('T')[0]}] Serviced: ${notes}` : asset.notes,
          },
        })
      );

      // Create preventive maintenance log in OperationalTask
      await prisma.operationalTask.create({
        data: {
          propertyId: asset.propertyId,
          title: `Preventive Maintenance Done: ${asset.name}`,
          category: 'MAINTENANCE',
          priority: 'LOW',
          status: 'COMPLETED',
          notes: `Serviced on ${new Date().toISOString().split('T')[0]}. Next due: ${nextServiceDue.toISOString().split('T')[0]}. Cost: ₹${serviceCost || 0}`,
          sourceType: 'PREVENTIVE_MAINTENANCE',
          sourceId: asset.id,
        },
      });

      return sendSuccess(res, updated, 'Service recorded and next service date scheduled.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to log service', 500);
    }
  }

  // =========================================================================
  // 6. VENDOR & PROCUREMENT DIRECTORY
  // =========================================================================

  /**
   * List Vendors
   */
  static async getVendors(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const vendors = await withDbRetry(() =>
        prisma.vendor.findMany({
          where: { propertyId },
          orderBy: { name: 'asc' },
        })
      );

      return sendSuccess(res, vendors);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch vendors', 500);
    }
  }

  /**
   * Create Vendor
   */
  static async createVendor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, name, category, contactPerson, phone, email, address, gstNumber, notes } = req.body;

      const targetPropertyId = propertyId || req.user?.propertyId;
      if (!targetPropertyId || !name || !phone) {
        return sendError(res, 'Property, vendor name, and phone are required.', 400);
      }

      const vendor = await withDbRetry(() =>
        prisma.vendor.create({
          data: {
            propertyId: targetPropertyId,
            name,
            category: category || 'GROCERY',
            contactPerson: contactPerson || null,
            phone,
            email: email || null,
            address: address || null,
            gstNumber: gstNumber || null,
            notes: notes || null,
          },
        })
      );

      return sendSuccess(res, vendor, 'Vendor added to procurement directory.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to add vendor', 500);
    }
  }

  // =========================================================================
  // 7. FINANCIAL RECONCILIATION & UTILITY ALLOCATION
  // =========================================================================

  /**
   * Payment Reconciliation Center
   */
  static async getPaymentReconciliation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const [payments, deposits, utilityReadings] = await Promise.all([
        withDbRetry(() =>
          prisma.payment.findMany({
            where: { propertyId },
            include: {
              resident: { select: { fullName: true, mobile: true, bed: { select: { bedNumber: true } } } },
              receipt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 60,
          })
        ),
        withDbRetry(() =>
          prisma.securityDeposit.findMany({
            where: { propertyId },
            include: { resident: { select: { fullName: true } } },
            orderBy: { createdAt: 'desc' },
            take: 30,
          })
        ),
        withDbRetry(() =>
          prisma.utilityReading.findMany({
            where: { propertyId },
            orderBy: { readingDate: 'desc' },
            take: 20,
          })
        ),
      ]);

      const matchedPayments = payments.filter((p) => p.status === 'PAID' && p.transactionId);
      const pendingApprovalPayments = payments.filter((p) => p.status === 'APPROVAL_PENDING');
      const overduePayments = payments.filter((p) => p.status === 'OVERDUE' || (p.status === 'PENDING' && new Date(p.dueDate) < new Date()));
      const unverifiedPayments = payments.filter((p) => p.status === 'PAID' && !p.transactionId);

      return sendSuccess(res, {
        summary: {
          totalBilled: payments.reduce((acc, p) => acc + p.amount, 0),
          totalCollected: payments.filter((p) => p.status === 'PAID').reduce((acc, p) => acc + p.amount, 0),
          totalOutstanding: payments.filter((p) => p.status !== 'PAID').reduce((acc, p) => acc + p.amount, 0),
          matchedCount: matchedPayments.length,
          pendingApprovalCount: pendingApprovalPayments.length,
          overdueCount: overduePayments.length,
          unverifiedCount: unverifiedPayments.length,
        },
        transactions: {
          pendingApproval: pendingApprovalPayments,
          overdue: overduePayments,
          unverified: unverifiedPayments,
          all: payments,
        },
        deposits,
        utilityReadings,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch reconciliation data', 500);
    }
  }

  /**
   * Allocate Utility Reading Charges to Resident Rent Invoices
   */
  static async allocateUtilityToInvoices(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, utilityReadingId, description, billingPeriod } = req.body;
      const targetPropertyId = propertyId || req.user?.propertyId;

      if (!targetPropertyId || !utilityReadingId) {
        return sendError(res, 'Property ID and utility reading ID required.', 400);
      }

      const reading = await prisma.utilityReading.findUnique({ where: { id: utilityReadingId } });
      if (!reading) return sendError(res, 'Utility reading not found.', 404);

      // Find all active residents in property
      const activeResidents = await prisma.resident.findMany({
        where: { propertyId: targetPropertyId, status: 'ACTIVE' },
      });

      if (activeResidents.length === 0) {
        return sendError(res, 'No active residents found in this property to split utility charge.', 400);
      }

      // Split equally among active residents
      const sharePerResident = Math.round((reading.totalAmount / activeResidents.length) * 100) / 100;

      await prisma.$transaction(async (tx) => {
        for (const resident of activeResidents) {
          await tx.payment.create({
            data: {
              residentId: resident.id,
              propertyId: targetPropertyId,
              amount: sharePerResident,
              category: 'MAINTENANCE_FEE',
              period: billingPeriod || reading.billingPeriod,
              dueDate: new Date(Date.now() + 7 * 86400000), // Due in 7 days
              status: 'PENDING',
              notes: `${description || 'Sub-meter utility charge'}: ${reading.type} (${reading.unitsConsumed} units @ ₹${reading.unitRate}/unit). Split among ${activeResidents.length} residents.`,
            },
          });
        }
      });

      return sendSuccess(
        res,
        { activeResidentsCount: activeResidents.length, sharePerResident, totalAmount: reading.totalAmount },
        `Successfully allocated ₹${reading.totalAmount} across ${activeResidents.length} residents (₹${sharePerResident}/resident).`
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to allocate utility charges', 500);
    }
  }

  // =========================================================================
  // 8. OPERATIONAL INTELLIGENCE & COMMAND CENTER
  // =========================================================================

  /**
   * Actionable Operations Command Center
   */
  static async getCommandCenterFeed(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const now = new Date();
      const inFifteenDays = new Date(Date.now() + 15 * 86400000);

      const [
        upcomingVacancies,
        pendingBookings,
        uncontactedLeads,
        overdueRent,
        overdueTasks,
        assetsDueService,
        unclaimedParcels,
        lowStockItems,
      ] = await Promise.all([
        // 1. Upcoming vacancies (notice period ending soon)
        withDbRetry(() =>
          prisma.resident.findMany({
            where: {
              propertyId,
              status: 'NOTICE_PERIOD',
              expectedMoveOutDate: { lte: inFifteenDays },
            },
            include: { bed: { include: { room: true } } },
            take: 10,
          })
        ),
        // 2. Pending bookings needing admission
        withDbRetry(() =>
          prisma.booking.findMany({
            where: { propertyId, status: 'CONFIRMED' },
            take: 10,
          })
        ),
        // 3. Uncontacted leads
        withDbRetry(() =>
          prisma.lead.findMany({
            where: { propertyId, status: 'NEW' },
            take: 10,
          })
        ),
        // 4. Overdue rent payments
        withDbRetry(() =>
          prisma.payment.findMany({
            where: {
              propertyId,
              status: 'PENDING',
              dueDate: { lt: now },
            },
            include: { resident: { select: { fullName: true, mobile: true } } },
            take: 10,
          })
        ),
        // 5. Overdue staff tasks
        withDbRetry(() =>
          prisma.operationalTask.findMany({
            where: {
              propertyId,
              status: { in: ['PENDING', 'IN_PROGRESS'] },
              dueDate: { lt: now },
            },
            take: 10,
          })
        ),
        // 6. Assets due for preventive service
        withDbRetry(() =>
          prisma.asset.findMany({
            where: {
              propertyId,
              nextServiceDue: { lte: inFifteenDays },
            },
            take: 10,
          })
        ),
        // 7. Unclaimed parcels > 24 hours
        withDbRetry(() =>
          prisma.parcel.findMany({
            where: {
              propertyId,
              status: 'RECEIVED',
              receivedAt: { lt: new Date(Date.now() - 24 * 3600000) },
            },
            take: 10,
          })
        ),
        // 8. Low kitchen stock
        withDbRetry(() =>
          prisma.kitchenIngredient.findMany({
            where: { propertyId },
            take: 50,
          })
        ),
      ]);

      const lowStock = lowStockItems.filter((i) => i.currentStock <= i.minStock);

      const actionableFeed = [
        ...uncontactedLeads.map((l) => ({
          type: 'UNCONTACTED_LEAD',
          priority: 'HIGH',
          title: `New Enquiry: ${l.name}`,
          description: `Received for ${l.roomTypePreference || 'PG accommodation'}. Phone: ${l.phone}`,
          actionLink: '/owner/leads',
          timestamp: l.createdAt,
        })),
        ...pendingBookings.map((b) => ({
          type: 'PENDING_ADMISSION',
          priority: 'URGENT',
          title: `Booking Ready for Admission: ${b.name}`,
          description: `Check-in scheduled for ${new Date(b.checkInDate).toISOString().split('T')[0]}. Room/Bed assignment ready.`,
          actionLink: '/owner/lifecycle',
          timestamp: b.createdAt,
        })),
        ...upcomingVacancies.map((v) => ({
          type: 'UPCOMING_VACANCY',
          priority: 'MEDIUM',
          title: `Move-Out Approaching: Room ${v.bed?.room?.number || ''} Bed ${v.bed?.bedNumber || ''}`,
          description: `${v.fullName} moves out on ${v.expectedMoveOutDate ? new Date(v.expectedMoveOutDate).toISOString().split('T')[0] : 'soon'}.`,
          actionLink: '/owner/lifecycle',
          timestamp: v.expectedMoveOutDate || now,
        })),
        ...overdueRent.map((r) => ({
          type: 'OVERDUE_RENT',
          priority: 'URGENT',
          title: `Overdue Rent: ₹${r.amount} (${r.resident?.fullName})`,
          description: `Due date was ${new Date(r.dueDate).toISOString().split('T')[0]}. Follow-up required.`,
          actionLink: '/owner/payments',
          timestamp: r.dueDate,
        })),
        ...overdueTasks.map((t) => ({
          type: 'OVERDUE_TASK',
          priority: 'HIGH',
          title: `Overdue Task: ${t.title}`,
          description: `Assigned: ${t.assignedTo || 'Unassigned'}. Due: ${t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'Overdue'}.`,
          actionLink: '/owner/maintenance',
          timestamp: t.dueDate || now,
        })),
        ...assetsDueService.map((a) => ({
          type: 'PREVENTIVE_MAINTENANCE_DUE',
          priority: 'MEDIUM',
          title: `Service Due: ${a.name}`,
          description: `Location: ${a.location}. Next service due: ${a.nextServiceDue ? new Date(a.nextServiceDue).toISOString().split('T')[0] : 'Now'}.`,
          actionLink: '/owner/maintenance',
          timestamp: a.nextServiceDue || now,
        })),
        ...lowStock.map((s) => ({
          type: 'KITCHEN_STOCK_SHORTAGE',
          priority: 'HIGH',
          title: `Low Stock: ${s.name} (${s.currentStock} ${s.unit} remaining)`,
          description: `Below minimum threshold of ${s.minStock} ${s.unit}. Reorder recommended.`,
          actionLink: '/owner/kitchen',
          timestamp: s.updatedAt,
        })),
        ...unclaimedParcels.map((p) => ({
          type: 'UNCLAIMED_PARCEL',
          priority: 'LOW',
          title: `Uncollected Delivery: ${p.recipientName}`,
          description: `${p.courierCompany} package awaiting pickup at gate.`,
          actionLink: '/owner/visitors',
          timestamp: p.receivedAt,
        })),
      ];

      return sendSuccess(res, {
        totalActionableCount: actionableFeed.length,
        feed: actionableFeed,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch command center feed', 500);
    }
  }
}
