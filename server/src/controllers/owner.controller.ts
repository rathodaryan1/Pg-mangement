import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { StorageService } from '../utils/supabase';

export class OwnerController {
  /**
   * Helper to determine property scope for current owner/staff user.
   */
  private static async resolvePropertyScope(req: AuthRequest, targetPropertyId?: string): Promise<string | undefined> {
    if (targetPropertyId) {
      return targetPropertyId;
    }
    if (req.user?.propertyId) {
      return req.user.propertyId;
    }
    const firstProp = await prisma.property.findFirst();
    return firstProp?.id;
  }

  // ============================================================================
  // 1. DASHBOARD & AGGREGATED KPIS
  // ============================================================================
  static async getDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

      const propertyFilter = propertyId ? { propertyId } : {};
      const directPropertyFilter = propertyId ? { id: propertyId } : {};

      const [
        properties,
        totalBuildings,
        rooms,
        beds,
        residents,
        payments,
        deposits,
        complaints,
        visitors,
        inventoryItems,
        staffMembers,
        recentNotices,
        tasks,
      ] = await Promise.all([
        prisma.property.findMany({
          where: directPropertyFilter,
          include: {
            buildings: true,
          },
        }),
        prisma.building.count({ where: propertyFilter }),
        prisma.room.findMany({
          where: propertyFilter,
          include: { beds: true },
        }),
        prisma.bed.findMany({
          where: propertyId ? { room: { propertyId } } : {},
        }),
        prisma.resident.findMany({
          where: propertyFilter,
          include: { bed: { include: { room: true } } },
        }),
        prisma.payment.findMany({
          where: propertyFilter,
          include: { resident: true, receipt: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.securityDeposit.findMany({
          where: propertyFilter,
        }),
        prisma.complaint.findMany({
          where: propertyFilter,
          include: { resident: true, room: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.visitorRequest.findMany({
          where: propertyFilter,
          include: { resident: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.inventoryItem.findMany({
          where: propertyFilter,
        }),
        prisma.user.findMany({
          where: {
            role: { in: ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE'] },
            ...(propertyId ? { propertyId } : {}),
          },
        }),
        prisma.notice.findMany({
          where: propertyFilter,
          orderBy: { publishedAt: 'desc' },
          take: 5,
        }),
        prisma.operationalTask.findMany({
          where: propertyFilter,
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      // Calculate Occupancy
      const totalBedsCount = beds.length;
      const occupiedBedsCount = beds.filter((b) => b.status === 'OCCUPIED').length;
      const availableBedsCount = beds.filter((b) => b.status === 'AVAILABLE').length;
      const occupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

      // Calculate Revenue & Payments
      const paidPayments = payments.filter((p) => p.status === 'PAID');
      const pendingPayments = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
      const overduePayments = payments.filter((p) => p.status === 'OVERDUE');

      const totalRevenueCollected = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalOutstandingRent = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalSecurityDeposits = deposits
        .filter((d) => d.status === 'PAID')
        .reduce((sum, d) => sum + d.amount, 0);

      // Operations & Alerts
      const openComplaintsList = complaints.filter(
        (c) => c.status === 'REPORTED' || c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS' || c.status === 'WAITING'
      );
      const pendingVisitorsList = visitors.filter((v) => v.status === 'PENDING');
      const activeVisitorPasses = visitors.filter((v) => v.status === 'APPROVED' || v.status === 'CHECKED_IN');
      const lowStockInventory = inventoryItems.filter((item) => item.quantity <= item.minQuantity || item.status === 'LOW_STOCK');

      return sendSuccess(res, {
        kpis: {
          totalProperties: properties.length,
          totalBuildings,
          totalRooms: rooms.length,
          totalBeds: totalBedsCount,
          occupiedBeds: occupiedBedsCount,
          availableBeds: availableBedsCount,
          occupancyRate,
          activeResidentsCount: residents.filter((r) => r.status === 'ACTIVE').length,
          pendingMoveInsCount: residents.filter((r) => r.status === 'PENDING_MOVE_IN').length,
          noticePeriodCount: residents.filter((r) => r.status === 'NOTICE_PERIOD').length,
          totalRevenueCollected,
          totalOutstandingRent,
          totalSecurityDeposits,
          overdueInvoicesCount: overduePayments.length,
          openComplaintsCount: openComplaintsList.length,
          pendingVisitorsCount: pendingVisitorsList.length,
          activeVisitorPassesCount: activeVisitorPasses.length,
          lowStockAlertsCount: lowStockInventory.length,
          staffCount: staffMembers.length,
        },
        recentPayments: payments.slice(0, 6).map((p) => ({
          id: p.id,
          residentName: p.resident?.fullName || 'Resident',
          amount: p.amount,
          period: p.period,
          category: p.category,
          status: p.status,
          date: p.paidDate || p.dueDate,
          receiptNumber: p.receipt?.receiptNumber,
        })),
        recentComplaints: complaints.slice(0, 5).map((c) => ({
          id: c.id,
          ticketNumber: c.ticketNumber,
          title: c.title,
          category: c.category,
          priority: c.priority,
          status: c.status,
          residentName: c.resident?.fullName,
          roomNumber: c.room?.number,
          createdAt: c.createdAt,
        })),
        recentVisitors: visitors.slice(0, 5).map((v) => ({
          id: v.id,
          visitorName: v.visitorName,
          visitorMobile: v.visitorMobile,
          relation: v.relation,
          status: v.status,
          hostName: v.resident?.fullName,
          visitDate: v.visitDate,
          expectedEntryTime: v.expectedEntryTime,
        })),
        recentNotices,
        recentTasks: tasks,
        actionRequired: {
          overduePaymentsCount: overduePayments.length,
          openComplaintsCount: openComplaintsList.length,
          pendingVisitorsCount: pendingVisitorsList.length,
          lowStockCount: lowStockInventory.length,
        },
      });
    } catch (error: any) {
      console.error('[OwnerController.getDashboard] Error:', error);
      return sendError(res, error.message || 'Failed to load owner dashboard', 500);
    }
  }

  // ============================================================================
  // 2. PROPERTIES MANAGEMENT
  // ============================================================================
  static async getProperties(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const properties = await prisma.property.findMany({
        include: {
          buildings: {
            include: {
              floors: {
                include: {
                  rooms: {
                    include: { beds: true },
                  },
                },
              },
            },
          },
          rooms: {
            include: { beds: true },
          },
          residents: {
            where: { status: 'ACTIVE' },
          },
          payments: {
            where: { status: 'PAID' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const formatted = properties.map((p) => {
        const totalRooms = p.rooms.length;
        const totalBeds = p.rooms.reduce((sum, r) => sum + r.beds.length, 0);
        const occupiedBeds = p.rooms.reduce(
          (sum, r) => sum + r.beds.filter((b) => b.status === 'OCCUPIED').length,
          0
        );
        const monthlyRevenue = p.payments.reduce((sum, pay) => sum + pay.amount, 0);

        return {
          id: p.id,
          name: p.name,
          address: p.address,
          city: p.city,
          phone: p.phone || '',
          email: p.email || '',
          upiId: p.upiId || '',
          gstNumber: p.gstNumber || '',
          totalRooms,
          totalBeds,
          occupiedBeds,
          activeResidentsCount: p.residents.length,
          monthlyRevenue,
          buildings: p.buildings.map((b) => ({
            id: b.id,
            name: b.name,
            floorsCount: b.floors.length,
          })),
        };
      });

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getProperties] Error:', error);
      return sendError(res, error.message || 'Failed to fetch properties', 500);
    }
  }

  static async getPropertyById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: req.params.id },
        include: {
          buildings: {
            include: {
              floors: {
                include: {
                  rooms: {
                    include: { beds: true },
                  },
                },
              },
            },
          },
          rooms: {
            include: {
              beds: {
                include: { resident: true },
              },
            },
          },
        },
      });

      if (!property) {
        return sendError(res, 'Property not found', 404);
      }

      return sendSuccess(res, property);
    } catch (error: any) {
      console.error('[OwnerController.getPropertyById] Error:', error);
      return sendError(res, error.message || 'Failed to fetch property details', 500);
    }
  }

  static async createProperty(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, address, city, phone, email, upiId, gstNumber } = req.body;

      if (!name || !address) {
        return sendError(res, 'Property name and address are required.', 400);
      }

      const property = await prisma.property.create({
        data: {
          name: name.trim(),
          address: address.trim(),
          city: city || 'Bengaluru',
          phone: phone || null,
          email: email || null,
          upiId: upiId || null,
          gstNumber: gstNumber || null,
        },
      });

      await AuditService.log({
        propertyId: property.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'PROPERTY_CREATED',
        entity: 'Property',
        entityId: property.id,
        ipAddress: req.ip,
        details: `Created new PG branch property: "${property.name}"`,
      });

      return sendSuccess(res, property, 'Property created successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.createProperty] Error:', error);
      return sendError(res, error.message || 'Failed to create property', 500);
    }
  }

  static async updateProperty(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, address, city, phone, email, upiId, gstNumber } = req.body;

      const updated = await prisma.property.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name: name.trim() }),
          ...(address && { address: address.trim() }),
          ...(city && { city: city.trim() }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(upiId !== undefined && { upiId }),
          ...(gstNumber !== undefined && { gstNumber }),
        },
      });

      await AuditService.log({
        propertyId: updated.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'PROPERTY_UPDATED',
        entity: 'Property',
        entityId: updated.id,
        ipAddress: req.ip,
        details: `Updated details for PG branch: "${updated.name}"`,
      });

      return sendSuccess(res, updated, 'Property updated successfully');
    } catch (error: any) {
      console.error('[OwnerController.updateProperty] Error:', error);
      return sendError(res, error.message || 'Failed to update property', 500);
    }
  }

  // ============================================================================
  // 3. BUILDINGS & FLOORS
  // ============================================================================
  static async getBuildings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

      const buildings = await prisma.building.findMany({
        where: propertyId ? { propertyId } : {},
        include: {
          floors: {
            include: {
              rooms: {
                include: { beds: true },
              },
            },
            orderBy: { floorNumber: 'asc' },
          },
        },
      });

      return sendSuccess(res, buildings);
    } catch (error: any) {
      console.error('[OwnerController.getBuildings] Error:', error);
      return sendError(res, error.message || 'Failed to fetch buildings', 500);
    }
  }

  static async createBuilding(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, name, numberOfFloors } = req.body;

      if (!propertyId || !name) {
        return sendError(res, 'propertyId and building name are required.', 400);
      }

      const numFloors = parseInt(numberOfFloors || '2', 10);

      const result = await prisma.$transaction(async (tx) => {
        const building = await tx.building.create({
          data: {
            propertyId,
            name: name.trim(),
          },
        });

        // Auto create floors
        for (let f = 1; f <= numFloors; f++) {
          await tx.floor.create({
            data: {
              buildingId: building.id,
              floorNumber: f,
            },
          });
        }

        return building;
      });

      return sendSuccess(res, result, `Building created with ${numFloors} floors`, 201);
    } catch (error: any) {
      console.error('[OwnerController.createBuilding] Error:', error);
      return sendError(res, error.message || 'Failed to create building', 500);
    }
  }

  // ============================================================================
  // 4. ROOMS & BEDS MANAGEMENT
  // ============================================================================
  static async getRooms(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const { status, type, search } = req.query;

      const where: any = {};
      if (propertyId) where.propertyId = propertyId;
      if (status) where.status = status;
      if (type) where.type = { contains: String(type), mode: 'insensitive' };
      if (search) where.number = { contains: String(search), mode: 'insensitive' };

      const rooms = await prisma.room.findMany({
        where,
        include: {
          floor: {
            include: { building: true },
          },
          beds: {
            include: {
              resident: {
                select: {
                  id: true,
                  fullName: true,
                  mobile: true,
                  joiningDate: true,
                  status: true,
                },
              },
            },
            orderBy: { bedNumber: 'asc' },
          },
        },
        orderBy: { number: 'asc' },
      });

      const formatted = rooms.map((r) => ({
        id: r.id,
        number: r.number,
        type: r.type,
        capacity: r.capacity,
        baseRent: r.baseRent,
        deposit: r.deposit,
        status: r.status,
        amenities: r.amenities ? r.amenities.split(',').map((a) => a.trim()).filter(Boolean) : [],
        propertyId: r.propertyId,
        buildingName: r.floor?.building?.name || 'Main Block',
        floorNumber: r.floor?.floorNumber || 1,
        occupiedCount: r.beds.filter((b) => b.status === 'OCCUPIED' || b.resident).length,
        beds: r.beds.map((b) => ({
          id: b.id,
          bedNumber: b.bedNumber,
          monthlyRent: b.monthlyRent,
          status: b.status,
          residentId: b.resident?.id,
          residentName: b.resident?.fullName,
          residentMobile: b.resident?.mobile,
        })),
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getRooms] Error:', error);
      return sendError(res, error.message || 'Failed to fetch rooms', 500);
    }
  }

  static async getRoomById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const room = await prisma.room.findUnique({
        where: { id: req.params.id },
        include: {
          floor: { include: { building: true } },
          beds: {
            include: { resident: true },
          },
          property: true,
        },
      });

      if (!room) {
        return sendError(res, 'Room not found', 404);
      }

      return sendSuccess(res, room);
    } catch (error: any) {
      console.error('[OwnerController.getRoomById] Error:', error);
      return sendError(res, error.message || 'Failed to fetch room', 500);
    }
  }

  static async createRoom(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, number, type, capacity, baseRent, deposit, amenities, floorId } = req.body;

      if (!propertyId || !number || !capacity || !baseRent) {
        return sendError(res, 'propertyId, room number, capacity, and base rent are required.', 400);
      }

      const cap = parseInt(capacity, 10);
      const rent = parseFloat(baseRent);
      const dep = deposit ? parseFloat(deposit) : rent;

      // Create room & its beds in transaction
      const room = await prisma.$transaction(async (tx) => {
        const newRoom = await tx.room.create({
          data: {
            propertyId,
            number: String(number).trim(),
            type: type || (cap === 1 ? 'Single' : `${cap}-Sharing`),
            capacity: cap,
            baseRent: rent,
            deposit: dep,
            status: 'AVAILABLE',
            amenities: Array.isArray(amenities) ? amenities.join(', ') : (amenities || 'AC, High-Speed Wi-Fi, Attached Bath'),
            floorId: floorId || null,
          },
        });

        // Auto create beds (Bed A, Bed B, etc.)
        for (let i = 0; i < cap; i++) {
          const char = String.fromCharCode(65 + i); // 'A', 'B', 'C'
          await tx.bed.create({
            data: {
              roomId: newRoom.id,
              bedNumber: `Bed ${newRoom.number}-${char}`,
              monthlyRent: rent,
              status: 'AVAILABLE',
            },
          });
        }

        return newRoom;
      });

      await AuditService.log({
        propertyId,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'ROOM_CREATED',
        entity: 'Room',
        entityId: room.id,
        ipAddress: req.ip,
        details: `Created Room ${room.number} (${cap} beds, ₹${rent}/mo)`,
      });

      return sendSuccess(res, room, `Room ${room.number} and ${cap} beds created successfully`, 201);
    } catch (error: any) {
      console.error('[OwnerController.createRoom] Error:', error);
      return sendError(res, error.message || 'Failed to create room', 500);
    }
  }

  static async updateRoom(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { type, baseRent, deposit, status, amenities } = req.body;

      const updated = await prisma.room.update({
        where: { id: req.params.id },
        data: {
          ...(type && { type }),
          ...(baseRent && { baseRent: parseFloat(baseRent) }),
          ...(deposit && { deposit: parseFloat(deposit) }),
          ...(status && { status }),
          ...(amenities && {
            amenities: Array.isArray(amenities) ? amenities.join(', ') : amenities,
          }),
        },
      });

      return sendSuccess(res, updated, 'Room updated successfully');
    } catch (error: any) {
      console.error('[OwnerController.updateRoom] Error:', error);
      return sendError(res, error.message || 'Failed to update room', 500);
    }
  }

  static async updateBedStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, monthlyRent } = req.body;

      const updated = await prisma.bed.update({
        where: { id: req.params.bedId },
        data: {
          ...(status && { status }),
          ...(monthlyRent && { monthlyRent: parseFloat(monthlyRent) }),
        },
      });

      return sendSuccess(res, updated, 'Bed updated successfully');
    } catch (error: any) {
      console.error('[OwnerController.updateBedStatus] Error:', error);
      return sendError(res, error.message || 'Failed to update bed status', 500);
    }
  }

  // ============================================================================
  // 5. RESIDENTS & FULL TRANSACTIONAL LIFECYCLE
  // ============================================================================
  static async getResidents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const { status, search } = req.query;

      const where: any = {};
      if (propertyId) where.propertyId = propertyId;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { fullName: { contains: String(search), mode: 'insensitive' } },
          { mobile: { contains: String(search) } },
          { email: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const residents = await prisma.resident.findMany({
        where,
        include: {
          property: { select: { id: true, name: true } },
          bed: {
            include: {
              room: {
                include: {
                  floor: {
                    include: { building: true },
                  },
                },
              },
            },
          },
          agreements: { where: { status: 'ACTIVE' }, take: 1 },
          securityDeposits: { take: 1 },
          payments: {
            orderBy: { dueDate: 'desc' },
            take: 3,
          },
          documents: true,
        },
        orderBy: { joiningDate: 'desc' },
      });

      const formatted = residents.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        mobile: r.mobile,
        alternateMobile: r.alternateMobile,
        gender: r.gender,
        status: r.status,
        kycStatus: r.kycStatus,
        joiningDate: r.joiningDate,
        expectedMoveOutDate: r.expectedMoveOutDate,
        workCompany: r.workCompany,
        permanentAddress: r.permanentAddress,
        propertyId: r.propertyId,
        propertyName: r.property?.name,
        roomId: r.bed?.roomId,
        roomNumber: r.bed?.room?.number,
        bedId: r.bedId,
        bedNumber: r.bed?.bedNumber,
        monthlyRent: r.bed?.monthlyRent || r.bed?.room?.baseRent || 15000,
        securityDeposit: r.securityDeposits[0]?.amount || 0,
        depositPaid: r.securityDeposits[0]?.status === 'PAID',
        emergencyContact: {
          name: r.emergencyContactName,
          relationship: r.emergencyContactRelation,
          phone: r.emergencyContactPhone,
        },
        documentsCount: r.documents.length,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getResidents] Error:', error);
      return sendError(res, error.message || 'Failed to fetch residents', 500);
    }
  }

  static async getResidentById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await prisma.resident.findUnique({
        where: { id: req.params.id },
        include: {
          property: true,
          bed: {
            include: {
              room: {
                include: {
                  floor: {
                    include: { building: true },
                  },
                },
              },
            },
          },
          agreements: { orderBy: { createdAt: 'desc' } },
          securityDeposits: { orderBy: { createdAt: 'desc' } },
          payments: {
            include: { receipt: true },
            orderBy: { dueDate: 'desc' },
          },
          visitorRequests: { orderBy: { visitDate: 'desc' } },
          complaints: {
            include: { activities: true },
            orderBy: { createdAt: 'desc' },
          },
          leaveRequests: { orderBy: { appliedAt: 'desc' } },
          documents: { orderBy: { uploadedAt: 'desc' } },
        },
      });

      if (!resident) {
        return sendError(res, 'Resident record not found', 404);
      }

      return sendSuccess(res, resident);
    } catch (error: any) {
      console.error('[OwnerController.getResidentById] Error:', error);
      return sendError(res, error.message || 'Failed to fetch resident dossier', 500);
    }
  }

  /**
   * POST /api/owner/residents/move-in
   * TRANSACTIONAL COMPLETE RESIDENT MOVE-IN
   */
  static async moveInResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        propertyId,
        bedId,
        fullName,
        email,
        mobile,
        gender,
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        joiningDate,
        monthlyRent,
        securityDepositAmount,
        depositPaid,
        permanentAddress,
        workCompany,
      } = req.body;

      if (!propertyId || !bedId || !fullName || !email || !mobile) {
        return sendError(res, 'Property, bed, full name, email, and mobile are required for move-in.', 400);
      }

      // 1. Verify Bed Availability
      const targetBed = await prisma.bed.findUnique({
        where: { id: bedId },
        include: { room: true },
      });

      if (!targetBed) {
        return sendError(res, 'Selected bed does not exist.', 404);
      }

      if (targetBed.status === 'OCCUPIED') {
        return sendError(res, 'This bed is already occupied by another active resident.', 409, 'BED_ALREADY_OCCUPIED');
      }

      // Check if user account already exists
      const cleanEmail = email.toLowerCase().trim();
      let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

      const salt = await bcrypt.genSalt(10);
      const defaultPasswordHash = await bcrypt.hash('admin123', salt);

      const parsedRent = monthlyRent ? parseFloat(monthlyRent) : targetBed.monthlyRent;
      const parsedDeposit = securityDepositAmount ? parseFloat(securityDepositAmount) : targetBed.room.deposit;
      const parsedJoiningDate = joiningDate ? new Date(joiningDate) : new Date();

      // Complete atomic move-in transaction
      const result = await prisma.$transaction(async (tx) => {
        if (!user) {
          user = await tx.user.create({
            data: {
              email: cleanEmail,
              passwordHash: defaultPasswordHash,
              name: fullName.trim(),
              role: 'RESIDENT',
              mobile: mobile.trim(),
              propertyId,
            },
          });
        }

        // Create Resident Profile
        const resident = await tx.resident.create({
          data: {
            userId: user.id,
            propertyId,
            bedId: targetBed.id,
            fullName: fullName.trim(),
            email: cleanEmail,
            mobile: mobile.trim(),
            gender: gender || 'MALE',
            emergencyContactName: emergencyContactName ? emergencyContactName.trim() : 'Guardian',
            emergencyContactRelation: emergencyContactRelation ? emergencyContactRelation.trim() : 'Parent',
            emergencyContactPhone: emergencyContactPhone ? emergencyContactPhone.trim() : mobile.trim(),
            joiningDate: parsedJoiningDate,
            permanentAddress: permanentAddress ? permanentAddress.trim() : null,
            workCompany: workCompany ? workCompany.trim() : null,
            status: 'ACTIVE',
            kycStatus: 'PENDING',
          },
        });

        // Occupy Bed
        await tx.bed.update({
          where: { id: targetBed.id },
          data: { status: 'OCCUPIED' },
        });

        // Create Lease Agreement (11 Months)
        const validTill = new Date(parsedJoiningDate);
        validTill.setMonth(validTill.getMonth() + 11);

        const agreementNumber = `AGR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await tx.agreement.create({
          data: {
            residentId: resident.id,
            propertyId,
            agreementNumber,
            validFrom: parsedJoiningDate,
            validTill,
            status: 'ACTIVE',
          },
        });

        // Create Security Deposit Record
        await tx.securityDeposit.create({
          data: {
            residentId: resident.id,
            propertyId,
            amount: parsedDeposit,
            status: depositPaid ? 'PAID' : 'PENDING',
            paidAt: depositPaid ? new Date() : null,
            notes: 'Move-in initial security deposit',
          },
        });

        // Generate First Month Rent Invoice
        const periodName = parsedJoiningDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const dueDate = new Date(parsedJoiningDate);
        dueDate.setDate(dueDate.getDate() + 5);

        await tx.payment.create({
          data: {
            residentId: resident.id,
            propertyId,
            amount: parsedRent,
            category: 'RENT',
            period: periodName,
            dueDate,
            status: 'PENDING',
          },
        });

        return resident;
      });

      await AuditService.log({
        propertyId,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'RESIDENT_MOVE_IN',
        entity: 'Resident',
        entityId: result.id,
        ipAddress: req.ip,
        details: `Completed move-in for ${result.fullName} into Bed ${targetBed.bedNumber} (Rm ${targetBed.room.number})`,
      });

      return sendSuccess(res, result, 'Resident move-in completed successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.moveInResident] Error:', error);
      return sendError(res, error.message || 'Move-in failed', 500);
    }
  }

  /**
   * POST /api/owner/residents/:id/notice-period
   */
  static async placeOnNoticePeriod(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { expectedMoveOutDate, reason } = req.body;

      const resident = await prisma.resident.findUnique({
        where: { id: req.params.id },
      });

      if (!resident) {
        return sendError(res, 'Resident not found', 404);
      }

      const moveOutDate = expectedMoveOutDate ? new Date(expectedMoveOutDate) : new Date(Date.now() + 30 * 24 * 3600 * 1000);

      const updated = await prisma.resident.update({
        where: { id: resident.id },
        data: {
          status: 'NOTICE_PERIOD',
          expectedMoveOutDate: moveOutDate,
        },
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'RESIDENT_NOTICE_PERIOD',
        entity: 'Resident',
        entityId: resident.id,
        ipAddress: req.ip,
        details: `Placed resident ${resident.fullName} on notice period until ${moveOutDate.toDateString()}. Note: ${reason || 'N/A'}`,
      });

      return sendSuccess(res, updated, 'Resident placed on notice period');
    } catch (error: any) {
      console.error('[OwnerController.placeOnNoticePeriod] Error:', error);
      return sendError(res, error.message || 'Failed to update notice period', 500);
    }
  }

  /**
   * POST /api/owner/residents/:id/move-out
   * TRANSACTIONAL RESIDENT MOVE-OUT & SECURITY DEPOSIT SETTLEMENT
   */
  static async moveOutResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { deductions, deductionNotes, refundAmount } = req.body;

      const resident = await prisma.resident.findUnique({
        where: { id: req.params.id },
        include: {
          bed: true,
          securityDeposits: { where: { status: 'PAID' }, take: 1 },
          agreements: { where: { status: 'ACTIVE' } },
        },
      });

      if (!resident) {
        return sendError(res, 'Resident not found', 404);
      }

      const originalDeposit = resident.securityDeposits[0]?.amount || 0;
      const parsedDeductions = deductions ? parseFloat(deductions) : 0;
      const finalRefund = refundAmount !== undefined ? parseFloat(refundAmount) : Math.max(0, originalDeposit - parsedDeductions);

      // Complete atomic move-out settlement
      const result = await prisma.$transaction(async (tx) => {
        // 1. Settle Security Deposit
        if (resident.securityDeposits[0]) {
          await tx.securityDeposit.update({
            where: { id: resident.securityDeposits[0].id },
            data: {
              status: parsedDeductions > 0 ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
              deductions: parsedDeductions,
              refundAmount: finalRefund,
              notes: deductionNotes ? `Move-out settlement: ${deductionNotes}` : 'Full refund cleared',
            },
          });
        }

        // 2. Free Bed and mark AVAILABLE
        if (resident.bedId) {
          await tx.bed.update({
            where: { id: resident.bedId },
            data: { status: 'AVAILABLE' },
          });
        }

        // 3. Terminate Active Agreements
        for (const agr of resident.agreements) {
          await tx.agreement.update({
            where: { id: agr.id },
            data: { status: 'TERMINATED' },
          });
        }

        // 4. Update Resident Status to MOVED_OUT
        const updatedResident = await tx.resident.update({
          where: { id: resident.id },
          data: {
            status: 'MOVED_OUT',
            bedId: null,
          },
        });

        return updatedResident;
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'RESIDENT_MOVE_OUT',
        entity: 'Resident',
        entityId: resident.id,
        ipAddress: req.ip,
        details: `Move-out settlement completed for ${resident.fullName}. Deposit: ₹${originalDeposit}, Deductions: ₹${parsedDeductions}, Refund: ₹${finalRefund}. Bed freed.`,
      });

      return sendSuccess(res, result, 'Resident move-out settlement completed and bed released.');
    } catch (error: any) {
      console.error('[OwnerController.moveOutResident] Error:', error);
      return sendError(res, error.message || 'Move-out failed', 500);
    }
  }

  // ============================================================================
  // 6. FINANCE & PAYMENTS MANAGEMENT
  // ============================================================================
  static async getPayments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const { status, search } = req.query;

      const where: any = {};
      if (propertyId) where.propertyId = propertyId;
      if (status) where.status = status;
      if (search) {
        where.resident = {
          fullName: { contains: String(search), mode: 'insensitive' },
        };
      }

      const payments = await prisma.payment.findMany({
        where,
        include: {
          resident: {
            include: {
              bed: {
                include: { room: true },
              },
            },
          },
          receipt: true,
        },
        orderBy: { dueDate: 'desc' },
      });

      const formatted = payments.map((p) => ({
        id: p.id,
        residentId: p.residentId,
        residentName: p.resident?.fullName || 'Unknown',
        roomNumber: p.resident?.bed?.room?.number || 'N/A',
        propertyId: p.propertyId,
        category: p.category,
        period: p.period,
        amount: p.amount,
        dueDate: p.dueDate,
        paidDate: p.paidDate,
        status: p.status,
        method: p.method,
        transactionId: p.transactionId,
        receiptNumber: p.receipt?.receiptNumber,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getPayments] Error:', error);
      return sendError(res, error.message || 'Failed to fetch payments', 500);
    }
  }

  static async recordManualPayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { paymentId, method, transactionId, notes } = req.body;

      if (!paymentId) {
        return sendError(res, 'paymentId is required', 400);
      }

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { resident: true },
      });

      if (!payment) {
        return sendError(res, 'Payment invoice not found', 404);
      }

      const finalTxn = transactionId || `MANUAL-${Date.now()}`;
      const receiptNumber = `RCP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paidDate: new Date(),
            method: method || 'CASH',
            transactionId: finalTxn,
            notes: notes || 'Admin recorded manual payment',
          },
        });

        const receipt = await tx.paymentReceipt.create({
          data: {
            paymentId: updated.id,
            receiptNumber,
          },
        });

        // Notify Resident
        if (payment.resident) {
          await tx.notification.create({
            data: {
              userId: payment.resident.userId,
              residentId: payment.resident.id,
              title: 'Payment Confirmed by PG Admin',
              message: `Your rent payment of ₹${payment.amount} for ${payment.period} has been received. Receipt #${receiptNumber}.`,
              type: 'PAYMENT',
              linkUrl: '/resident/payments',
            },
          });
        }

        return { payment: updated, receipt };
      });

      await AuditService.log({
        propertyId: payment.propertyId,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'PAYMENT_RECORDED_MANUAL',
        entity: 'Payment',
        entityId: payment.id,
        ipAddress: req.ip,
        details: `Admin recorded manual payment ₹${payment.amount} for ${payment.resident?.fullName} (${payment.period})`,
      });

      return sendSuccess(res, result, 'Manual payment recorded successfully');
    } catch (error: any) {
      console.error('[OwnerController.recordManualPayment] Error:', error);
      return sendError(res, error.message || 'Failed to record payment', 500);
    }
  }

  static async createInvoice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { residentId, amount, category, period, dueDate, notes } = req.body;

      if (!residentId || !amount || !period) {
        return sendError(res, 'residentId, amount, and period are required.', 400);
      }

      const resident = await prisma.resident.findUnique({
        where: { id: residentId },
      });

      if (!resident) {
        return sendError(res, 'Resident not found', 404);
      }

      const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 5 * 24 * 3600 * 1000);

      const invoice = await prisma.payment.create({
        data: {
          residentId: resident.id,
          propertyId: resident.propertyId,
          amount: parseFloat(amount),
          category: category || 'RENT',
          period: period.trim(),
          dueDate: due,
          status: 'PENDING',
          notes: notes || null,
        },
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'INVOICE_CREATED',
        entity: 'Payment',
        entityId: invoice.id,
        ipAddress: req.ip,
        details: `Generated ${category || 'RENT'} invoice ₹${amount} for ${resident.fullName} (${period})`,
      });

      return sendSuccess(res, invoice, 'Invoice generated successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.createInvoice] Error:', error);
      return sendError(res, error.message || 'Failed to create invoice', 500);
    }
  }

  // ============================================================================
  // 7. EXPENSES MANAGEMENT
  // ============================================================================
  static async getExpenses(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

      const expenses = await prisma.expense.findMany({
        where: propertyId ? { propertyId } : {},
        orderBy: { date: 'desc' },
      });

      return sendSuccess(res, expenses);
    } catch (error: any) {
      console.error('[OwnerController.getExpenses] Error:', error);
      return sendError(res, error.message || 'Failed to fetch expenses', 500);
    }
  }

  static async createExpense(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, title, category, amount, vendor, date, notes } = req.body;

      if (!propertyId || !title || !amount) {
        return sendError(res, 'propertyId, title, and amount are required.', 400);
      }

      const expense = await prisma.expense.create({
        data: {
          propertyId,
          title: title.trim(),
          category: category || 'OTHER',
          amount: parseFloat(amount),
          vendor: vendor ? vendor.trim() : null,
          date: date ? new Date(date) : new Date(),
          notes: notes ? notes.trim() : null,
        },
      });

      return sendSuccess(res, expense, 'Expense recorded successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.createExpense] Error:', error);
      return sendError(res, error.message || 'Failed to record expense', 500);
    }
  }

  // ============================================================================
  // 8. VISITOR MANAGEMENT & QR VERIFICATION
  // ============================================================================
  static async getVisitors(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const { status } = req.query;

      const where: any = {};
      if (propertyId) where.propertyId = propertyId;
      if (status) where.status = status;

      const visitors = await prisma.visitorRequest.findMany({
        where,
        include: {
          resident: {
            include: {
              bed: { include: { room: true } },
            },
          },
        },
        orderBy: { visitDate: 'desc' },
      });

      const formatted = visitors.map((v) => ({
        id: v.id,
        visitorName: v.visitorName,
        visitorMobile: v.visitorMobile,
        relation: v.relation,
        purpose: v.purpose,
        residentId: v.residentId,
        residentName: v.resident?.fullName || 'Resident',
        roomNumber: v.resident?.bed?.room?.number || 'N/A',
        propertyId: v.propertyId,
        visitDate: v.visitDate,
        expectedTime: v.expectedEntryTime,
        expectedExitTime: v.expectedExitTime,
        status: v.status,
        approvedBy: v.approvedBy,
        qrPassCode: v.qrPassToken,
        checkInTime: v.checkInTime,
        checkOutTime: v.checkOutTime,
        createdTime: v.createdAt,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getVisitors] Error:', error);
      return sendError(res, error.message || 'Failed to fetch visitor logs', 500);
    }
  }

  static async approveVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const visitor = await prisma.visitorRequest.findUnique({
        where: { id: req.params.id },
        include: { resident: true },
      });

      if (!visitor) {
        return sendError(res, 'Visitor request not found', 404);
      }

      const updated = await prisma.visitorRequest.update({
        where: { id: visitor.id },
        data: {
          status: 'APPROVED',
          approvedBy: req.user?.name || 'Owner / Warden',
        },
      });

      // Notify resident
      if (visitor.resident) {
        await prisma.notification.create({
          data: {
            userId: visitor.resident.userId,
            residentId: visitor.resident.id,
            title: 'Visitor Pass Approved',
            message: `Your visitor pass request for ${visitor.visitorName} on ${new Date(visitor.visitDate).toLocaleDateString()} has been approved.`,
            type: 'VISITOR',
            linkUrl: '/resident/visitors',
          },
        });
      }

      return sendSuccess(res, updated, 'Visitor request approved');
    } catch (error: any) {
      console.error('[OwnerController.approveVisitor] Error:', error);
      return sendError(res, error.message || 'Failed to approve visitor', 500);
    }
  }

  static async rejectVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const visitor = await prisma.visitorRequest.update({
        where: { id: req.params.id },
        data: {
          status: 'REJECTED',
          approvedBy: req.user?.name || 'Management',
        },
      });

      return sendSuccess(res, visitor, 'Visitor request rejected');
    } catch (error: any) {
      console.error('[OwnerController.rejectVisitor] Error:', error);
      return sendError(res, error.message || 'Failed to reject visitor', 500);
    }
  }

  static async verifyVisitorQR(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { qrPassToken } = req.body;

      if (!qrPassToken) {
        return sendError(res, 'qrPassToken is required for verification.', 400);
      }

      const visitor = await prisma.visitorRequest.findUnique({
        where: { qrPassToken: qrPassToken.trim() },
        include: {
          resident: {
            include: {
              bed: { include: { room: true } },
            },
          },
          property: true,
        },
      });

      if (!visitor) {
        return sendError(res, 'Invalid QR Pass Token. No matching gate pass found.', 404, 'INVALID_QR_PASS');
      }

      return sendSuccess(res, visitor, 'QR Pass verified successfully');
    } catch (error: any) {
      console.error('[OwnerController.verifyVisitorQR] Error:', error);
      return sendError(res, error.message || 'Failed to verify QR pass', 500);
    }
  }

  static async checkInVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const updated = await prisma.visitorRequest.update({
        where: { id: req.params.id },
        data: {
          status: 'CHECKED_IN',
          checkInTime: new Date(),
        },
      });

      return sendSuccess(res, updated, 'Visitor checked in successfully');
    } catch (error: any) {
      console.error('[OwnerController.checkInVisitor] Error:', error);
      return sendError(res, error.message || 'Check-in failed', 500);
    }
  }

  static async checkOutVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const updated = await prisma.visitorRequest.update({
        where: { id: req.params.id },
        data: {
          status: 'CHECKED_OUT',
          checkOutTime: new Date(),
        },
      });

      return sendSuccess(res, updated, 'Visitor checked out successfully');
    } catch (error: any) {
      console.error('[OwnerController.checkOutVisitor] Error:', error);
      return sendError(res, error.message || 'Check-out failed', 500);
    }
  }

  // ============================================================================
  // 9. MAINTENANCE & COMPLAINTS
  // ============================================================================
  static async getComplaints(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const { status, priority } = req.query;

      const where: any = {};
      if (propertyId) where.propertyId = propertyId;
      if (status) where.status = status;
      if (priority) where.priority = priority;

      const complaints = await prisma.complaint.findMany({
        where,
        include: {
          resident: true,
          room: true,
          activities: {
            orderBy: { timestamp: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = complaints.map((c) => ({
        id: c.id,
        ticketNumber: c.ticketNumber,
        title: c.title,
        category: c.category,
        priority: c.priority,
        status: c.status,
        residentId: c.residentId,
        residentName: c.resident?.fullName || 'Resident',
        roomNumber: c.room?.number || '101',
        propertyId: c.propertyId,
        description: c.description,
        assignedStaffName: c.assignedStaff,
        createdAt: c.createdAt,
        resolvedAt: c.resolvedAt,
        history: c.activities.map((a) => ({
          id: a.id,
          status: a.status,
          updatedBy: a.updatedBy,
          timestamp: a.timestamp,
          comment: a.comment,
        })),
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getComplaints] Error:', error);
      return sendError(res, error.message || 'Failed to fetch complaints', 500);
    }
  }

  static async updateComplaintStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, comment, assignedStaff } = req.body;

      const complaint = await prisma.complaint.findUnique({
        where: { id: req.params.id },
        include: { resident: true },
      });

      if (!complaint) {
        return sendError(res, 'Complaint ticket not found', 404);
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.complaint.update({
          where: { id: complaint.id },
          data: {
            status,
            ...(assignedStaff && { assignedStaff }),
            ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
          },
        });

        await tx.maintenanceActivity.create({
          data: {
            complaintId: complaint.id,
            status,
            updatedBy: req.user?.name || 'Staff Member',
            comment: comment || `Ticket status transitioned to ${status}`,
          },
        });

        // Notify resident
        if (complaint.resident) {
          await tx.notification.create({
            data: {
              userId: complaint.resident.userId,
              residentId: complaint.resident.id,
              title: `Complaint Status Updated (${complaint.ticketNumber})`,
              message: `Your complaint "${complaint.title}" has been updated to ${status}.`,
              type: 'COMPLAINT',
              linkUrl: '/resident/complaints',
            },
          });
        }

        return updated;
      });

      return sendSuccess(res, result, 'Complaint status updated successfully');
    } catch (error: any) {
      console.error('[OwnerController.updateComplaintStatus] Error:', error);
      return sendError(res, error.message || 'Failed to update complaint', 500);
    }
  }

  // ============================================================================
  // 10. STAFF MANAGEMENT
  // ============================================================================
  static async getStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

      const staff = await prisma.user.findMany({
        where: {
          role: { in: ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE', 'SUPER_ADMIN'] },
          ...(propertyId ? { propertyId } : {}),
        },
        orderBy: { name: 'asc' },
      });

      const formatted = staff.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role === 'MAINTENANCE' ? 'MAINTENANCE_TECH' : s.role === 'MANAGER' ? 'WARDEN' : 'SECURITY',
        mobile: s.mobile || '+91 98765 00000',
        propertyId: s.propertyId || 'prop-01',
        status: 'ACTIVE',
        shift: 'FULL_DAY',
        salary: s.role === 'MANAGER' ? 35000 : 20000,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getStaff] Error:', error);
      return sendError(res, error.message || 'Failed to fetch staff members', 500);
    }
  }

  static async createStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, email, mobile, role, propertyId } = req.body;

      if (!name || !email || !role) {
        return sendError(res, 'Name, email, and role are required.', 400);
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);

      const staff = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          mobile: mobile ? mobile.trim() : null,
          role: role || 'MAINTENANCE',
          propertyId: propertyId || null,
          passwordHash,
        },
      });

      return sendSuccess(res, staff, 'Staff member added successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.createStaff] Error:', error);
      return sendError(res, error.message || 'Failed to add staff member', 500);
    }
  }

  // ============================================================================
  // 11. INVENTORY & ASSET MANAGEMENT
  // ============================================================================
  static async getInventory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

      const items = await prisma.inventoryItem.findMany({
        where: propertyId ? { propertyId } : {},
        orderBy: { name: 'asc' },
      });

      const formatted = items.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        minQuantity: i.minQuantity,
        propertyId: i.propertyId,
        condition: i.status,
        status: i.status,
        location: i.location,
        purchaseDate: i.purchaseDate,
        vendorName: i.vendor,
        cost: i.cost,
        serviceHistoryCount: 1,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getInventory] Error:', error);
      return sendError(res, error.message || 'Failed to fetch inventory', 500);
    }
  }

  static async createInventoryItem(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, name, category, quantity, minQuantity, condition, location, vendor, cost } = req.body;

      if (!propertyId || !name) {
        return sendError(res, 'propertyId and item name are required.', 400);
      }

      const item = await prisma.inventoryItem.create({
        data: {
          propertyId,
          name: name.trim(),
          category: category || 'Furniture',
          quantity: parseInt(quantity || '1', 10),
          minQuantity: parseInt(minQuantity || '2', 10),
          status: condition || 'GOOD',
          location: location ? location.trim() : null,
          vendor: vendor ? vendor.trim() : null,
          cost: cost ? parseFloat(cost) : null,
        },
      });

      return sendSuccess(res, item, 'Inventory item added successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.createInventoryItem] Error:', error);
      return sendError(res, error.message || 'Failed to add inventory item', 500);
    }
  }

  // ============================================================================
  // 12. TASKS & HOUSEKEEPING
  // ============================================================================
  static async getTasks(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

      const tasks = await prisma.operationalTask.findMany({
        where: propertyId ? { propertyId } : {},
        orderBy: { createdAt: 'desc' },
      });

      const formatted = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        priority: t.priority,
        assignedStaffName: t.assignedTo || 'Housekeeping',
        dueDate: t.dueDate,
        status: t.status,
        notes: t.notes,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getTasks] Error:', error);
      return sendError(res, error.message || 'Failed to fetch tasks', 500);
    }
  }

  static async createTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, title, category, priority, assignedTo, dueDate, notes } = req.body;

      if (!propertyId || !title) {
        return sendError(res, 'propertyId and task title are required.', 400);
      }

      const task = await prisma.operationalTask.create({
        data: {
          propertyId,
          title: title.trim(),
          category: category || 'CLEANING',
          priority: priority || 'MEDIUM',
          assignedTo: assignedTo || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes || null,
        },
      });

      return sendSuccess(res, task, 'Task created successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.createTask] Error:', error);
      return sendError(res, error.message || 'Failed to create task', 500);
    }
  }

  // ============================================================================
  // 13. DOCUMENTS & KYC VERIFICATION
  // ============================================================================
  static async getDocuments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

      const docs = await prisma.document.findMany({
        where: propertyId ? { propertyId } : {},
        include: {
          resident: {
            include: { bed: { include: { room: true } } },
          },
        },
        orderBy: { uploadedAt: 'desc' },
      });

      return sendSuccess(res, docs);
    } catch (error: any) {
      console.error('[OwnerController.getDocuments] Error:', error);
      return sendError(res, error.message || 'Failed to fetch documents', 500);
    }
  }

  static async verifyDocument(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, rejectionReason } = req.body;

      const doc = await prisma.document.findUnique({
        where: { id: req.params.id },
        include: { resident: true },
      });

      if (!doc) {
        return sendError(res, 'Document not found', 404);
      }

      const updated = await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: status || 'VERIFIED',
          rejectionReason: status === 'REJECTED' ? rejectionReason || 'Document unreadable or invalid' : null,
        },
      });

      // Update resident KYC status if verified
      if (status === 'VERIFIED' && doc.residentId) {
        await prisma.resident.update({
          where: { id: doc.residentId },
          data: { kycStatus: 'VERIFIED' },
        });
      }

      return sendSuccess(res, updated, `Document status marked as ${status}`);
    } catch (error: any) {
      console.error('[OwnerController.verifyDocument] Error:', error);
      return sendError(res, error.message || 'Failed to verify document', 500);
    }
  }

  // ============================================================================
  // 14. NOTICES
  // ============================================================================
  static async getNotices(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

      const notices = await prisma.notice.findMany({
        where: propertyId ? { propertyId } : {},
        orderBy: { publishedAt: 'desc' },
      });

      return sendSuccess(res, notices);
    } catch (error: any) {
      console.error('[OwnerController.getNotices] Error:', error);
      return sendError(res, error.message || 'Failed to fetch notices', 500);
    }
  }

  static async createNotice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, title, content, category, isImportant } = req.body;

      if (!propertyId || !title || !content) {
        return sendError(res, 'propertyId, title, and content are required.', 400);
      }

      const notice = await prisma.notice.create({
        data: {
          propertyId,
          title: title.trim(),
          content: content.trim(),
          category: category || 'GENERAL',
          isImportant: Boolean(isImportant),
          publisherName: req.user?.name || 'Urban Nest Management',
        },
      });

      return sendSuccess(res, notice, 'Notice published successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.createNotice] Error:', error);
      return sendError(res, error.message || 'Failed to create notice', 500);
    }
  }

  // ============================================================================
  // 15. AUDIT LOGS & SYSTEM SETTINGS
  // ============================================================================
  static async getAuditLogs(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

      const logs = await prisma.auditLog.findMany({
        where: propertyId ? { propertyId } : {},
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      const formatted = logs.map((l) => ({
        id: l.id,
        actorName: l.actorName,
        actorRole: l.actorRole,
        action: l.action,
        targetEntity: l.entity,
        timestamp: l.timestamp,
        ipAddress: l.ipAddress,
        details: l.details,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getAuditLogs] Error:', error);
      return sendError(res, error.message || 'Failed to fetch audit logs', 500);
    }
  }

  static async getSettings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const settings = await prisma.setting.findMany();
      return sendSuccess(res, settings);
    } catch (error: any) {
      console.error('[OwnerController.getSettings] Error:', error);
      return sendError(res, error.message || 'Failed to fetch settings', 500);
    }
  }
}
