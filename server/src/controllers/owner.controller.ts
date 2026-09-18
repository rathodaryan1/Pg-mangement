import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';

const isProd = process.env.NODE_ENV === 'production';
const isDemoMode = process.env.DEMO_MODE === 'true';

export class OwnerController {
  private static async resolvePropertyScope(req: AuthRequest, targetPropertyId?: string): Promise<{ propertyId?: string; propertyFilter: any; tenantFilter: any }> {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const tenantId = req.user?.tenantId;

    const tenantFilter = (!isSuperAdmin && tenantId) ? { tenantId } : {};
    const propertyTenantFilter = (!isSuperAdmin && tenantId) ? { property: { tenantId } } : {};

    if (targetPropertyId && targetPropertyId !== 'ALL' && targetPropertyId !== 'undefined') {
      if (!isSuperAdmin && tenantId) {
        const prop = await prisma.property.findFirst({ where: { id: targetPropertyId, tenantId } });
        if (prop) {
          return { propertyId: targetPropertyId, propertyFilter: { propertyId: targetPropertyId }, tenantFilter };
        } else {
          // IDOR Block: foreign property requested, fallback to tenant property
          const ownProp = await prisma.property.findFirst({ where: { tenantId } });
          const pId = ownProp ? ownProp.id : undefined;
          return { propertyId: pId, propertyFilter: pId ? { propertyId: pId } : propertyTenantFilter, tenantFilter };
        }
      }
      return { propertyId: targetPropertyId, propertyFilter: { propertyId: targetPropertyId }, tenantFilter };
    }

    if (req.user?.propertyId && req.user.propertyId !== 'prop-1') {
      return { propertyId: req.user.propertyId, propertyFilter: { propertyId: req.user.propertyId }, tenantFilter };
    }

    if (!isSuperAdmin && tenantId) {
      const ownProp = await prisma.property.findFirst({ where: { tenantId } });
      const pId = ownProp ? ownProp.id : undefined;
      return { propertyId: pId, propertyFilter: pId ? { propertyId: pId } : propertyTenantFilter, tenantFilter };
    }

    try {
      const firstProp = await prisma.property.findFirst();
      if (firstProp) {
        return { propertyId: firstProp.id, propertyFilter: { propertyId: firstProp.id }, tenantFilter: {} };
      }
    } catch {
      // ignore
    }

    return { propertyId: undefined, propertyFilter: {}, tenantFilter: {} };
  }

  // ==========================================================================
  // 1. DASHBOARD & KPIS
  // ==========================================================================
  static async getDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, propertyFilter, tenantFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

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
          where: propertyId ? { id: propertyId } : tenantFilter,
          include: { buildings: true, rooms: { include: { beds: true } }, residents: true },
        }),
        prisma.building.count({ where: propertyFilter }),
        prisma.room.findMany({ where: propertyFilter, include: { beds: true } }),
        prisma.bed.findMany({ where: propertyId ? { room: { propertyId } } : (req.user?.tenantId ? { room: { property: { tenantId: req.user.tenantId } } } : {}) }),
        prisma.resident.findMany({
          where: propertyFilter,
          include: { bed: { include: { room: true } } },
        }),
        prisma.payment.findMany({
          where: propertyFilter,
          include: { resident: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.securityDeposit.findMany({ where: propertyFilter }),
        prisma.complaint.findMany({
          where: propertyFilter,
          include: { resident: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.visitorRequest.findMany({
          where: propertyFilter,
          include: { resident: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.inventoryItem.findMany({ where: propertyFilter }),
        prisma.user.findMany({
          where: {
            role: { in: ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE'] },
            ...(req.user?.tenantId ? { tenantId: req.user.tenantId } : {}),
          },
        }),
        prisma.notice.findMany({ where: propertyFilter, orderBy: { publishedAt: 'desc' }, take: 5 }),
        prisma.operationalTask.findMany({ where: propertyFilter, take: 5 }),
      ]);

      const totalBedsCount = beds.length;
      const occupiedBedsCount = beds.filter((b) => b.status === 'OCCUPIED').length;
      const availableBedsCount = beds.filter((b) => b.status === 'AVAILABLE').length;
      const occupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;
      const paidPayments = payments.filter((p) => p.status === 'PAID');
      const pendingPayments = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
      const overduePayments = payments.filter((p) => p.status === 'OVERDUE');

      return sendSuccess(res, {
        kpis: {
          totalProperties: properties.length,
          totalBuildings,
          totalRooms: rooms.length,
          totalBeds: totalBedsCount,
          occupiedBeds: occupiedBedsCount,
          vacantBeds: availableBedsCount,
          occupancyPercentage: occupancyRate,
          monthlyRevenue: paidPayments.reduce((acc, p) => acc + p.amount, 0),
          pendingCollections: pendingPayments.reduce((acc, p) => acc + p.amount, 0),
          overdueRentAmount: overduePayments.reduce((acc, p) => acc + p.amount, 0),
          activeResidentsCount: residents.filter((r) => r.status === 'ACTIVE').length,
          openComplaintsCount: complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
          todayVisitorsCount: visitors.filter((v) => new Date(v.visitDate).toDateString() === new Date().toDateString()).length,
          totalStaffCount: staffMembers.length,
        },
        properties: properties.map((p) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          city: p.city,
          totalRooms: p.rooms.length,
          totalBeds: p.rooms.reduce((acc, r) => acc + (r.beds?.length || r.capacity || 0), 0),
          occupiedBeds: p.residents.filter((r) => r.status === 'ACTIVE').length,
        })),
        recentNotices,
        recentTasks: tasks,
        allResidents: residents.map((r) => ({
          id: r.id,
          fullName: r.fullName,
          roomNumber: r.bed?.room?.number || 'N/A',
        })),
      });
    } catch (error: any) {
      console.error('[OwnerController.getDashboard] Error:', error);
      return sendError(res, error.message || 'Failed to load dashboard statistics', 500);
    }
  }

  // ==========================================================================
  // 2. PROPERTIES (CRUD)
  // ==========================================================================
  static async getProperties(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
      const where = (!isSuperAdmin && req.user?.tenantId) ? { tenantId: req.user.tenantId } : {};

      const properties = await prisma.property.findMany({
        where,
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
          rooms: { include: { beds: true } },
          residents: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = properties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        city: p.city,
        phone: p.phone,
        email: p.email,
        upiId: p.upiId,
        gstNumber: p.gstNumber,
        totalRooms: p.rooms.length,
        totalBeds: p.rooms.reduce((acc, r) => acc + (r.beds?.length || r.capacity || 0), 0),
        occupiedBeds: p.residents.filter((r) => r.status === 'ACTIVE').length,
        activeResidentsCount: p.residents.filter((r) => r.status === 'ACTIVE').length,
        buildings: p.buildings,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getProperties] Error:', error);
      return sendError(res, error.message || 'Failed to fetch properties', 500);
    }
  }

  static async getPropertyById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
      const where: any = { id: req.params.id };
      if (!isSuperAdmin && req.user?.tenantId) {
        where.tenantId = req.user.tenantId;
      }

      const property = await prisma.property.findFirst({
        where,
        include: {
          buildings: { include: { floors: { include: { rooms: { include: { beds: true } } } } } },
          rooms: { include: { beds: true } },
          residents: true,
        },
      });

      if (!property) {
        return sendError(res, 'Property not found or unauthorized', 404);
      }

      return sendSuccess(res, property);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch property', 500);
    }
  }

  static async createProperty(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, address, city, phone, email, upiId, gstNumber } = req.body;
      if (!name || !address) {
        return sendError(res, 'Property name and address are required', 400);
      }

      // Check plan limits for tenant
      if (req.user?.tenantId && req.user.role !== 'SUPER_ADMIN') {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
        if (tenant) {
          const currentCount = await prisma.property.count({ where: { tenantId: req.user.tenantId } });
          if (currentCount >= tenant.maxProperties) {
            return sendError(
              res,
              `Property limit reached for your ${tenant.plan} plan (Max: ${tenant.maxProperties} properties). Upgrade to Pro or Enterprise to add more branches.`,
              403,
              'PLAN_LIMIT_REACHED'
            );
          }
        }
      }

      const created = await prisma.property.create({
        data: {
          tenantId: req.user?.tenantId || null,
          name: name.trim(),
          address: address.trim(),
          city: city || 'Ahmedabad',
          phone: phone || null,
          email: email || null,
          upiId: upiId || null,
          gstNumber: gstNumber || null,
        },
      });

      await AuditService.log({
        propertyId: created.id,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'PROPERTY_CREATED',
        entity: 'Property',
        entityId: created.id,
        ipAddress: req.ip,
        details: `Created property: ${created.name}`,
      });

      return sendSuccess(res, created, 'Property created successfully', 201);
    } catch (error: any) {
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
        details: `Updated property: ${updated.name}`,
      });

      return sendSuccess(res, updated, 'Property updated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update property', 500);
    }
  }

  static async archiveProperty(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.property.delete({
        where: { id: req.params.id },
      });

      return sendSuccess(res, null, 'Property archived successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to archive property', 500);
    }
  }

  // ==========================================================================
  // 3. BUILDINGS & FLOORS (CRUD)
  // ==========================================================================
  static async getBuildings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const buildings = await prisma.building.findMany({
        where: propertyFilter,
        include: {
          floors: {
            include: { rooms: { include: { beds: true } } },
          },
          property: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, buildings);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch buildings', 500);
    }
  }

  static async createBuilding(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, name, numberOfFloors } = req.body;
      if (!name) return sendError(res, 'Building name is required', 400);

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      if (!propId) return sendError(res, 'Property ID is required', 400);

      const building = await prisma.building.create({
        data: {
          propertyId: propId,
          name: name.trim(),
        },
      });

      const floorCount = parseInt(numberOfFloors || '1', 10);
      if (floorCount > 0) {
        for (let i = 1; i <= floorCount; i++) {
          await prisma.floor.create({
            data: {
              buildingId: building.id,
              floorNumber: i,
            },
          });
        }
      }

      return sendSuccess(res, building, 'Building created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create building', 500);
    }
  }

  static async updateBuilding(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name } = req.body;
      const updated = await prisma.building.update({
        where: { id: req.params.id },
        data: { ...(name && { name: name.trim() }) },
      });
      return sendSuccess(res, updated, 'Building updated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update building', 500);
    }
  }

  static async archiveBuilding(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.building.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Building archived successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete building', 500);
    }
  }

  static async getFloors(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const floors = await prisma.floor.findMany({
        include: { building: true, rooms: true },
        orderBy: { floorNumber: 'asc' },
      });
      return sendSuccess(res, floors);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch floors', 500);
    }
  }

  static async createFloor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { buildingId, floorNumber } = req.body;
      if (!buildingId || floorNumber === undefined) {
        return sendError(res, 'Building ID and Floor Number are required', 400);
      }

      const floor = await prisma.floor.create({
        data: {
          buildingId,
          floorNumber: parseInt(floorNumber, 10),
        },
      });
      return sendSuccess(res, floor, 'Floor created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create floor', 500);
    }
  }

  static async archiveFloor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.floor.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Floor archived successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete floor', 500);
    }
  }

  // ==========================================================================
  // 4. ROOMS & BEDS (CRUD)
  // ==========================================================================
  static async getRooms(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const rooms = await prisma.room.findMany({
        where: propertyFilter,
        include: {
          floor: { include: { building: true } },
          beds: { include: { resident: true } },
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
        building: r.floor?.building?.name || 'Block A',
        floor: r.floor?.floorNumber || 1,
        occupiedCount: r.beds.filter((b) => b.status === 'OCCUPIED' || b.resident).length,
        beds: r.beds.map((b) => ({
          id: b.id,
          bedNumber: b.bedNumber,
          monthlyRent: b.monthlyRent,
          status: b.status,
          residentId: b.resident?.id,
          residentName: b.resident?.fullName,
        })),
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch rooms', 500);
    }
  }

  static async getRoomById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const room = await prisma.room.findUnique({
        where: { id: req.params.id },
        include: {
          beds: { include: { resident: true } },
          floor: { include: { building: true } },
          property: true,
        },
      });
      if (!room) return sendError(res, 'Room not found', 404);
      return sendSuccess(res, room);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch room', 500);
    }
  }

  static async createRoom(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, number, type, capacity, baseRent, deposit, amenities, floorId } = req.body;
      if (!number) return sendError(res, 'Room number is required', 400);

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      if (!propId) return sendError(res, 'Property ID is required', 400);

      const cap = parseInt(capacity || '2', 10);
      const rent = parseFloat(baseRent || '14000');
      const dep = deposit ? parseFloat(deposit) : rent * 2;
      const amenitiesStr = Array.isArray(amenities) ? amenities.join(', ') : amenities || '';

      const room = await prisma.$transaction(async (tx) => {
        const createdRoom = await tx.room.create({
          data: {
            propertyId: propId,
            number: String(number).trim(),
            type: type || 'Double',
            capacity: cap,
            baseRent: rent,
            deposit: dep,
            amenities: amenitiesStr,
            floorId: floorId || null,
          },
        });

        for (let i = 0; i < cap; i++) {
          const char = String.fromCharCode(65 + i);
          await tx.bed.create({
            data: {
              roomId: createdRoom.id,
              bedNumber: `Bed ${number}-${char}`,
              monthlyRent: rent,
              status: 'AVAILABLE',
            },
          });
        }

        return tx.room.findUnique({
          where: { id: createdRoom.id },
          include: { beds: true, floor: { include: { building: true } } },
        });
      }, { maxWait: 15000, timeout: 30000 });

      return sendSuccess(res, room, `Room ${number} and ${cap} beds created successfully`, 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create room', 500);
    }
  }

  static async updateRoom(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { number, type, baseRent, deposit, status, amenities } = req.body;
      const targetRoom = await prisma.room.findUnique({
        where: { id: req.params.id },
        include: { property: true },
      });

      if (!targetRoom) return sendError(res, 'Room not found', 404);

      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId) {
        if (targetRoom.property.tenantId !== req.user.tenantId) {
          return sendError(res, 'Access forbidden: Cross-tenant room mutation rejected', 403, 'FORBIDDEN');
        }
      }

      const updated = await prisma.room.update({
        where: { id: req.params.id },
        data: {
          ...(number && { number: String(number).trim() }),
          ...(type && { type }),
          ...(baseRent !== undefined && { baseRent: parseFloat(baseRent) }),
          ...(deposit !== undefined && { deposit: parseFloat(deposit) }),
          ...(status && { status }),
          ...(amenities !== undefined && {
            amenities: Array.isArray(amenities) ? amenities.join(', ') : amenities,
          }),
        },
        include: { beds: true },
      });
      return sendSuccess(res, updated, 'Room updated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update room', 500);
    }
  }

  static async archiveRoom(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.room.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Room archived successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete room', 500);
    }
  }

  static async updateBedStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, monthlyRent } = req.body;
      const updated = await prisma.bed.update({
        where: { id: req.params.id },
        data: {
          ...(status && { status }),
          ...(monthlyRent !== undefined && { monthlyRent: parseFloat(monthlyRent) }),
        },
        include: { resident: true, room: true },
      });
      return sendSuccess(res, updated, 'Bed updated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update bed status', 500);
    }
  }

  // ==========================================================================
  // 5. RESIDENTS & LIFECYCLE (MOVE-IN, NOTICE PERIOD, MOVE-OUT)
  // ==========================================================================
  static async getResidents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const residents = await prisma.resident.findMany({
        where: propertyFilter,
        include: {
          bed: { include: { room: { include: { floor: { include: { building: true } } } } } },
          documents: true,
          payments: { orderBy: { dueDate: 'desc' }, take: 5 },
          agreements: true,
          securityDeposits: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = residents.map((r) => ({
        id: r.id,
        userId: r.userId,
        propertyId: r.propertyId,
        bedId: r.bedId,
        roomNumber: r.bed?.room?.number || 'N/A',
        bedNumber: r.bed?.bedNumber || 'N/A',
        buildingName: r.bed?.room?.floor?.building?.name || 'Main Wing',
        floorNumber: r.bed?.room?.floor?.floorNumber || 1,
        fullName: r.fullName,
        email: r.email,
        mobile: r.mobile,
        alternateMobile: r.alternateMobile,
        gender: r.gender,
        emergencyContactName: r.emergencyContactName,
        emergencyContactRelation: r.emergencyContactRelation,
        emergencyContactPhone: r.emergencyContactPhone,
        emergencyContact: `${r.emergencyContactName} (${r.emergencyContactRelation}): ${r.emergencyContactPhone}`,
        kycStatus: r.kycStatus,
        kycDocumentType: r.kycDocumentType,
        kycDocumentNumber: r.kycDocumentNumber,
        joiningDate: r.joiningDate,
        expectedMoveOutDate: r.expectedMoveOutDate,
        status: r.status,
        monthlyRent: r.bed?.monthlyRent || 0,
        securityDeposit: r.securityDeposits[0]?.amount || 0,
        depositAmount: r.securityDeposits[0]?.amount || 0,
        permanentAddress: r.permanentAddress,
        address: r.permanentAddress,
        workCompany: r.workCompany,
        documents: r.documents,
        payments: r.payments,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch residents', 500);
    }
  }

  static async getResidentById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await prisma.resident.findUnique({
        where: { id: req.params.id },
        include: {
          bed: { include: { room: { include: { floor: { include: { building: true } } } } } },
          documents: true,
          payments: { orderBy: { dueDate: 'desc' } },
          agreements: true,
          securityDeposits: true,
          property: true,
          user: true,
        },
      });

      if (!resident) return sendError(res, 'Resident not found', 404);

      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId) {
        if (resident.property?.tenantId !== req.user.tenantId) {
          return sendError(res, 'Access forbidden: Cannot access cross-tenant resident record', 403, 'FORBIDDEN');
        }
      }

      return sendSuccess(res, resident);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch resident', 500);
    }
  }

  static async createResident(req: AuthRequest, res: Response): Promise<Response> {
    return OwnerController.onboardResident(req, res);
  }

  static async moveInResident(req: AuthRequest, res: Response): Promise<Response> {
    return OwnerController.onboardResident(req, res);
  }

  static async onboardResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        propertyId,
        bedId,
        fullName,
        email,
        mobile,
        alternateMobile,
        gender,
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        kycDocumentType,
        kycDocumentNumber,
        joiningDate,
        monthlyRent,
        depositAmount,
        securityDepositAmount,
        permanentAddress,
        workCompany,
      } = req.body;

      if (!fullName || !email || !mobile) {
        return sendError(res, 'Full name, email, and mobile number are required', 400);
      }

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      if (!propId) return sendError(res, 'Property ID is required', 400);

      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash('admin123', salt);

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create or find User
        let user = await tx.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
          user = await tx.user.create({
            data: {
              email: email.toLowerCase().trim(),
              passwordHash: defaultHash,
              name: fullName.trim(),
              role: 'RESIDENT',
              mobile: mobile.trim(),
              propertyId: propId,
            },
          });
        }

        // 2. Create Resident Profile
        const resident = await tx.resident.create({
          data: {
            userId: user.id,
            propertyId: propId,
            bedId: bedId || null,
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            mobile: mobile.trim(),
            gender: gender || 'MALE',
            emergencyContactName: emergencyContactName || 'Guardian',
            emergencyContactRelation: emergencyContactRelation || 'Parent',
            emergencyContactPhone: emergencyContactPhone || mobile.trim(),
            joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
            status: 'ACTIVE',
            kycStatus: 'PENDING',
            permanentAddress: permanentAddress || null,
            workCompany: workCompany || null,
          },
        });

        // 3. Mark Bed Occupied if assigned
        if (bedId) {
          await tx.bed.update({
            where: { id: bedId },
            data: {
              status: 'OCCUPIED',
              ...(monthlyRent && { monthlyRent: parseFloat(monthlyRent) }),
            },
          });
        }

        // 4. Create Security Deposit
        const depositVal = parseFloat(securityDepositAmount || depositAmount || '0');
        if (depositVal > 0) {
          await tx.securityDeposit.create({
            data: {
              residentId: resident.id,
              propertyId: propId,
              amount: depositVal,
              status: 'PAID',
              paidAt: new Date(),
            },
          });
        }

        // 5. Create Initial Rent Invoice
        const rentVal = parseFloat(monthlyRent || '14000');
        await tx.payment.create({
          data: {
            residentId: resident.id,
            propertyId: propId,
            amount: rentVal,
            category: 'RENT',
            period: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            status: 'PENDING',
          },
        });

        return resident;
      }, { maxWait: 15000, timeout: 30000 });

      await AuditService.log({
        propertyId: propId,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'RESIDENT_ONBOARDED',
        entity: 'Resident',
        entityId: result.id,
        ipAddress: req.ip,
        details: `Onboarded resident ${result.fullName} (${result.email})`,
      });

      return sendSuccess(res, result, 'Resident onboarded successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.moveInResident] Error:', error);
      return sendError(res, error.message || 'Failed to onboard resident', 500);
    }
  }

  static async placeOnNoticePeriod(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { expectedMoveOutDate, reason } = req.body;
      const resident = await prisma.resident.update({
        where: { id: req.params.id },
        data: {
          status: 'NOTICE_PERIOD',
          expectedMoveOutDate: expectedMoveOutDate ? new Date(expectedMoveOutDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
        details: `Placed resident ${resident.fullName} on notice period. Reason: ${reason || 'Notice served'}`,
      });

      return sendSuccess(res, resident, 'Resident placed on notice period successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to place on notice period', 500);
    }
  }

  static async moveOutResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { deductions, deductionNotes, refundAmount } = req.body;
      const residentId = req.params.id;

      const resident = await prisma.resident.findUnique({ where: { id: residentId } });
      if (!resident) return sendError(res, 'Resident not found', 404);

      await prisma.$transaction(async (tx) => {
        // 1. Release Bed
        if (resident.bedId) {
          await tx.bed.update({
            where: { id: resident.bedId },
            data: { status: 'AVAILABLE' },
          });
        }

        // 2. Mark Resident as MOVED_OUT
        await tx.resident.update({
          where: { id: residentId },
          data: {
            status: 'MOVED_OUT',
            bedId: null,
          },
        });

        // 3. Settle Security Deposit
        const existingDeposit = await tx.securityDeposit.findFirst({
          where: { residentId },
        });
        if (existingDeposit) {
          await tx.securityDeposit.update({
            where: { id: existingDeposit.id },
            data: {
              status: 'REFUNDED',
              deductions: deductions ? parseFloat(deductions) : 0,
              refundAmount: refundAmount ? parseFloat(refundAmount) : existingDeposit.amount - (deductions || 0),
              notes: deductionNotes || 'Move-out clearance completed',
            },
          });
        }
      });

      return sendSuccess(res, null, 'Resident move-out completed and bed released.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to complete move-out', 500);
    }
  }

  static async updateResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { fullName, email, mobile, emergencyContactName, emergencyContactPhone, workCompany, permanentAddress } = req.body;
      const updated = await prisma.resident.update({
        where: { id: req.params.id },
        data: {
          ...(fullName && { fullName: fullName.trim() }),
          ...(email && { email: email.toLowerCase().trim() }),
          ...(mobile && { mobile: mobile.trim() }),
          ...(emergencyContactName && { emergencyContactName }),
          ...(emergencyContactPhone && { emergencyContactPhone }),
          ...(workCompany !== undefined && { workCompany }),
          ...(permanentAddress !== undefined && { permanentAddress }),
        },
      });
      return sendSuccess(res, updated, 'Resident updated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update resident', 500);
    }
  }

  static async archiveResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.resident.update({
        where: { id: req.params.id },
        data: { status: 'INACTIVE' },
      });
      return sendSuccess(res, null, 'Resident archived');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to archive resident', 500);
    }
  }

  // ==========================================================================
  // 6. PAYMENTS, INVOICES & DEPOSITS
  // ==========================================================================
  static async getPayments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const payments = await prisma.payment.findMany({
        where: propertyFilter,
        include: {
          resident: { include: { bed: { include: { room: true } } } },
          receipt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = payments.map((p) => ({
        id: p.id,
        residentId: p.residentId,
        residentName: p.resident?.fullName || 'Resident',
        roomNumber: p.resident?.bed?.room?.number || '101',
        bedNumber: p.resident?.bed?.bedNumber || 'A',
        amount: p.amount,
        category: p.category,
        period: p.period,
        dueDate: p.dueDate,
        paidDate: p.paidDate,
        status: p.status,
        method: p.method,
        transactionId: p.transactionId,
        receiptNumber: p.receipt?.receiptNumber,
        notes: p.notes,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch payments', 500);
    }
  }

  static async recordManualPayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { paymentId, amount, paymentMethod, method, transactionId, note, notes } = req.body;
      if (!paymentId) return sendError(res, 'Payment ID is required', 400);

      const targetPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
      if (!targetPayment) return sendError(res, 'Payment invoice not found', 404);

      const chosenMethod = (paymentMethod || method || 'UPI') as any;
      const txn = transactionId || `MANUAL-${Date.now()}`;
      const receiptNo = `UN-REC-${Date.now().toString().slice(-6)}`;

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: 'PAID',
            paidDate: new Date(),
            method: chosenMethod,
            transactionId: txn,
            notes: note || notes || targetPayment.notes,
            ...(amount && { amount: parseFloat(amount) }),
          },
        });

        const receipt = await tx.paymentReceipt.upsert({
          where: { paymentId },
          create: {
            paymentId,
            receiptNumber: receiptNo,
          },
          update: {
            receiptNumber: receiptNo,
          },
        });

        return { payment: updated, receipt };
      }, { maxWait: 15000, timeout: 30000 });

      return sendSuccess(res, result, 'Manual payment recorded successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to record payment', 500);
    }
  }

  static async createInvoice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { residentId, amount, category, period, dueDate, notes } = req.body;
      if (!residentId || !amount || !period) {
        return sendError(res, 'Resident ID, amount, and billing period are required', 400);
      }

      const resident = await prisma.resident.findUnique({ where: { id: residentId } });
      if (!resident) return sendError(res, 'Resident not found', 404);

      const payment = await prisma.payment.create({
        data: {
          residentId,
          propertyId: resident.propertyId,
          amount: parseFloat(amount),
          category: (category || 'RENT') as any,
          period: period.trim(),
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          notes: notes || null,
        },
      });

      return sendSuccess(res, payment, 'Invoice generated successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create invoice', 500);
    }
  }

  static async updatePayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, amount, period } = req.body;
      const updated = await prisma.payment.update({
        where: { id: req.params.id },
        data: {
          ...(status && { status }),
          ...(amount !== undefined && { amount: parseFloat(amount) }),
          ...(period && { period }),
        },
      });
      return sendSuccess(res, updated, 'Payment updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update payment', 500);
    }
  }

  static async cancelPayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.payment.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Payment invoice cancelled');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to cancel payment', 500);
    }
  }

  static async getPaymentReceipt(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: req.params.id },
        include: {
          resident: {
            include: {
              bed: { include: { room: true } },
              property: true,
            },
          },
          receipt: true,
        },
      });

      if (!payment) return sendError(res, 'Payment not found', 404);

      return sendSuccess(res, {
        receiptNumber: payment.receipt?.receiptNumber || `UN-REC-${payment.id.slice(-6).toUpperCase()}`,
        generatedAt: payment.receipt?.generatedAt || payment.paidDate || new Date(),
        residentDetails: {
          name: payment.resident?.fullName,
          email: payment.resident?.email,
          mobile: payment.resident?.mobile,
          room: payment.resident?.bed?.room?.number || '101',
          bed: payment.resident?.bed?.bedNumber || 'A',
          property: payment.resident?.property?.name || 'Urban Nest',
        },
        paymentDetails: {
          period: payment.period,
          category: payment.category,
          amount: payment.amount,
          transactionId: payment.transactionId || 'OFFICIAL-PAID',
          paidDate: payment.paidDate,
          method: payment.method,
        },
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to generate receipt', 500);
    }
  }

  static async getDeposits(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const deposits = await prisma.securityDeposit.findMany({
        include: {
          resident: { include: { bed: { include: { room: true } } } },
          property: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, deposits);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch deposits', 500);
    }
  }

  static async createDeposit(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { residentId, amount, status } = req.body;
      const resident = await prisma.resident.findUnique({ where: { id: residentId } });
      if (!resident) return sendError(res, 'Resident not found', 404);

      const deposit = await prisma.securityDeposit.create({
        data: {
          residentId,
          propertyId: resident.propertyId,
          amount: parseFloat(amount),
          status: status || 'PAID',
          paidAt: new Date(),
        },
      });
      return sendSuccess(res, deposit, 'Deposit recorded', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to record deposit', 500);
    }
  }

  static async settleDeposit(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { deductions, refundAmount, notes } = req.body;
      const updated = await prisma.securityDeposit.update({
        where: { id: req.params.id },
        data: {
          status: 'REFUNDED',
          deductions: deductions ? parseFloat(deductions) : 0,
          refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
          notes: notes || 'Deposit settled',
        },
      });
      return sendSuccess(res, updated, 'Deposit settlement completed');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to settle deposit', 500);
    }
  }

  // ==========================================================================
  // 7. EXPENSES (CRUD)
  // ==========================================================================
  static async getExpenses(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const expenses = await prisma.expense.findMany({
        where: propertyFilter,
        orderBy: { date: 'desc' },
      });
      return sendSuccess(res, expenses);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch expenses', 500);
    }
  }

  static async createExpense(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, title, category, amount, vendor, date, notes } = req.body;
      if (!title || !amount) return sendError(res, 'Title and amount are required', 400);

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      if (!propId) return sendError(res, 'Property ID is required', 400);

      const expense = await prisma.expense.create({
        data: {
          propertyId: propId,
          title: title.trim(),
          category: (category || 'OTHER') as any,
          amount: parseFloat(amount),
          vendor: vendor || null,
          date: date ? new Date(date) : new Date(),
          notes: notes || null,
        },
      });
      return sendSuccess(res, expense, 'Expense logged successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to log expense', 500);
    }
  }

  static async updateExpense(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { title, amount, category, vendor, notes } = req.body;
      const updated = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          ...(title && { title: title.trim() }),
          ...(amount !== undefined && { amount: parseFloat(amount) }),
          ...(category && { category }),
          ...(vendor !== undefined && { vendor }),
          ...(notes !== undefined && { notes }),
        },
      });
      return sendSuccess(res, updated, 'Expense updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update expense', 500);
    }
  }

  static async archiveExpense(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.expense.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Expense entry archived');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete expense', 500);
    }
  }

  // ==========================================================================
  // 8. VISITORS & GATE QR PASS
  // ==========================================================================
  static async getVisitors(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const visitors = await prisma.visitorRequest.findMany({
        where: propertyFilter,
        include: {
          resident: { include: { bed: { include: { room: true } } } },
        },
        orderBy: { visitDate: 'desc' },
      });

      const formatted = visitors.map((v) => ({
        id: v.id,
        propertyId: v.propertyId,
        residentId: v.residentId,
        visitorName: v.visitorName,
        visitorMobile: v.visitorMobile,
        relation: v.relation,
        purpose: v.purpose,
        residentName: v.resident?.fullName || 'Resident',
        roomNumber: v.resident?.bed?.room?.number || '101',
        visitDate: v.visitDate,
        expectedTime: v.expectedEntryTime,
        expectedEntryTime: v.expectedEntryTime,
        expectedExitTime: v.expectedExitTime,
        status: v.status,
        approvedBy: v.approvedBy,
        qrPassToken: v.qrPassToken,
        checkInTime: v.checkInTime,
        checkOutTime: v.checkOutTime,
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch visitors', 500);
    }
  }

  static async createVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { residentId, visitorName, visitorMobile, relation, purpose, visitDate, expectedTime, propertyId } = req.body;
      if (!visitorName || !visitorMobile) {
        return sendError(res, 'Visitor name and mobile number are required', 400);
      }

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      if (!propId) return sendError(res, 'Property ID is required', 400);

      const qrPassToken = `VPASS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const created = await prisma.visitorRequest.create({
        data: {
          propertyId: propId,
          residentId: residentId || (await prisma.resident.findFirst({ where: { propertyId: propId } }))?.id || 'res-1',
          visitorName: visitorName.trim(),
          visitorMobile: visitorMobile.trim(),
          relation: relation ? relation.trim() : 'Guest',
          purpose: purpose ? purpose.trim() : 'Visit',
          visitDate: visitDate ? new Date(visitDate) : new Date(),
          expectedEntryTime: expectedTime || '04:00 PM',
          status: 'APPROVED',
          approvedBy: req.user?.name || 'Owner Desk',
          qrPassToken,
        },
      });

      return sendSuccess(res, created, 'Visitor pass created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create visitor pass', 500);
    }
  }

  static async approveVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const updated = await prisma.visitorRequest.update({
        where: { id: req.params.id },
        data: {
          status: 'APPROVED',
          approvedBy: req.user?.name || 'Owner Approval',
        },
      });
      return sendSuccess(res, updated, 'Visitor request approved');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to approve visitor', 500);
    }
  }

  static async rejectVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const updated = await prisma.visitorRequest.update({
        where: { id: req.params.id },
        data: { status: 'REJECTED' },
      });
      return sendSuccess(res, updated, 'Visitor request rejected');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to reject visitor', 500);
    }
  }

  static async verifyVisitorQR(req: Request, res: Response): Promise<Response> {
    try {
      const token = req.body?.qrPassToken || req.body?.token;
      return OwnerController.verifyTokenInternal(token, res);
    } catch (error: any) {
      return sendError(res, error.message || 'Verification error', 500);
    }
  }

  static async verifyVisitorQRByToken(req: Request, res: Response): Promise<Response> {
    try {
      const token = req.params?.token;
      return OwnerController.verifyTokenInternal(token, res);
    } catch (error: any) {
      return sendError(res, error.message || 'Verification error', 500);
    }
  }

  private static async verifyTokenInternal(rawToken: string, res: Response): Promise<Response> {
    if (!rawToken) return sendError(res, 'QR Pass token is required', 400);

    const token = decodeURIComponent(rawToken).trim();
    const visitor = await prisma.visitorRequest.findFirst({
      where: {
        OR: [{ qrPassToken: token }, { id: token }],
      },
      include: {
        resident: { include: { bed: { include: { room: true } } } },
        property: true,
      },
    });

    if (!visitor) {
      return sendSuccess(res, {
        valid: false,
        status: 'INVALID',
        message: 'Invalid or forged QR pass token.',
      });
    }

    return sendSuccess(res, {
      valid: visitor.status === 'APPROVED' || visitor.status === 'CHECKED_IN',
      status: visitor.status,
      pass: visitor,
      visitorName: visitor.visitorName,
      visitorMobile: visitor.visitorMobile,
      relation: visitor.relation,
      purpose: visitor.purpose,
      visitDate: visitor.visitDate,
      expectedTime: visitor.expectedEntryTime,
      residentName: visitor.resident?.fullName,
      roomNumber: visitor.resident?.bed?.room?.number,
      propertyName: visitor.property?.name,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime,
      passId: visitor.id,
      message:
        visitor.status === 'APPROVED'
          ? 'Valid visitor gate pass verified.'
          : `Visitor pass is currently ${visitor.status}.`,
    });
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
      return sendError(res, error.message || 'Failed to check in visitor', 500);
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
      return sendSuccess(res, updated, 'Visitor checked out');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to check out visitor', 500);
    }
  }

  // ==========================================================================
  // 9. MAINTENANCE & COMPLAINTS
  // ==========================================================================
  static async getComplaints(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const complaints = await prisma.complaint.findMany({
        where: propertyFilter,
        include: {
          resident: { include: { bed: { include: { room: true } } } },
          activities: { orderBy: { timestamp: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = complaints.map((c) => ({
        id: c.id,
        ticketNumber: c.ticketNumber,
        title: c.title,
        description: c.description,
        category: c.category,
        priority: c.priority,
        status: c.status,
        residentName: c.resident?.fullName || 'Resident',
        roomNumber: c.resident?.bed?.room?.number || '101',
        assignedStaff: c.assignedStaff || 'Unassigned',
        createdAt: c.createdAt,
        resolvedAt: c.resolvedAt,
        comments: c.activities.map((a: any) => ({
          id: a.id,
          authorName: a.updatedBy,
          comment: a.comment,
          createdAt: a.timestamp,
        })),
      }));

      return sendSuccess(res, formatted);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch complaints', 500);
    }
  }

  static async createComplaint(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { residentId, propertyId, title, description, category, priority } = req.body;
      if (!title || !description) return sendError(res, 'Title and description are required', 400);

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      if (!propId) return sendError(res, 'Property ID is required', 400);

      const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

      const complaint = await prisma.complaint.create({
        data: {
          ticketNumber,
          residentId: residentId || (await prisma.resident.findFirst({ where: { propertyId: propId } }))?.id || 'res-1',
          propertyId: propId,
          title: title.trim(),
          description: description.trim(),
          category: (category || 'OTHER') as any,
          priority: (priority || 'MEDIUM') as any,
          status: 'REPORTED',
        },
      });

      return sendSuccess(res, complaint, 'Complaint ticket logged', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create complaint', 500);
    }
  }

  static async updateComplaintStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, assignedStaff, assignedTo, comment } = req.body;
      const complaintId = req.params.id;

      const validStatuses = ['REPORTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
      let mappedStatus = status ? status.toString().toUpperCase().replace(/[-\s]/g, '_') : undefined;
      if (mappedStatus && !validStatuses.includes(mappedStatus)) {
        if (mappedStatus.includes('PROGRESS')) mappedStatus = 'IN_PROGRESS';
        else if (mappedStatus.includes('RESOLV')) mappedStatus = 'RESOLVED';
        else if (mappedStatus.includes('CLOSE')) mappedStatus = 'CLOSED';
        else mappedStatus = 'REPORTED';
      }

      const staff = assignedStaff !== undefined ? assignedStaff : assignedTo;

      const updated = await prisma.$transaction(async (tx) => {
        const comp = await tx.complaint.update({
          where: { id: complaintId },
          data: {
            ...(mappedStatus && { status: mappedStatus as any }),
            ...(staff !== undefined && { assignedStaff: staff }),
            ...(mappedStatus === 'RESOLVED' && { resolvedAt: new Date() }),
          },
        });

        if (comment) {
          await tx.maintenanceActivity.create({
            data: {
              complaintId,
              status: (mappedStatus || comp.status) as any,
              updatedBy: req.user?.name || 'Owner',
              comment: comment.trim(),
            },
          });
        }

        return comp;
      });

      return sendSuccess(res, updated, 'Complaint status updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update complaint', 500);
    }
  }

  static async addComplaintComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { comment } = req.body;
      if (!comment) return sendError(res, 'Comment text is required', 400);

      const comp = await prisma.complaint.findUnique({ where: { id: req.params.id } });
      if (!comp) return sendError(res, 'Complaint not found', 404);

      const activity = await prisma.maintenanceActivity.create({
        data: {
          complaintId: req.params.id,
          status: comp.status,
          updatedBy: req.user?.name || 'Owner',
          comment: comment.trim(),
        },
      });

      return sendSuccess(res, activity, 'Comment added');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to add comment', 500);
    }
  }

  // ==========================================================================
  // 10. STAFF MANAGEMENT
  // ==========================================================================
  static async getStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const staff = await prisma.user.findMany({
        where: {
          role: { in: ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE', 'SUPER_ADMIN'] },
        },
        include: { property: true },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, staff);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch staff', 500);
    }
  }

  static async createStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, email, mobile, role, propertyId } = req.body;
      if (!name || !role) return sendError(res, 'Name and role are required', 400);

      const staffEmail = email ? email.toLowerCase().trim() : `staff_${Date.now()}@pg.com`;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);

      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: staffEmail,
          passwordHash,
          role: role as any,
          mobile: mobile || null,
          propertyId: propertyId || null,
        },
      });

      return sendSuccess(res, user, 'Staff member created', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create staff', 500);
    }
  }

  static async updateStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, mobile, role, propertyId } = req.body;
      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name: name.trim() }),
          ...(mobile !== undefined && { mobile }),
          ...(role && { role: role as any }),
          ...(propertyId !== undefined && { propertyId }),
        },
      });
      return sendSuccess(res, updated, 'Staff updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update staff', 500);
    }
  }

  static async archiveStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.user.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Staff deactivated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to deactivate staff', 500);
    }
  }

  // ==========================================================================
  // ==========================================================================
  // 11. INVENTORY & STOCK
  // ==========================================================================
  static async getInventory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const items = await prisma.inventoryItem.findMany({
        where: propertyFilter,
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, items);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch inventory', 500);
    }
  }

  static async createInventoryItem(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, name, category, quantity, minQuantity, location, cost, vendor } = req.body;
      if (!name) return sendError(res, 'Item name is required', 400);

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      if (!propId) return sendError(res, 'Property ID is required', 400);

      const item = await prisma.inventoryItem.create({
        data: {
          propertyId: propId,
          name: name.trim(),
          category: category || 'General',
          quantity: parseInt(quantity || '1', 10),
          minQuantity: parseInt(minQuantity || '2', 10),
          location: location || 'Storage',
          cost: cost ? parseFloat(cost) : null,
          vendor: vendor || null,
        },
      });
      return sendSuccess(res, item, 'Inventory item added', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to add inventory item', 500);
    }
  }

  static async updateInventoryItem(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, category, quantity, minQuantity, location, cost, vendor } = req.body;
      const updated = await prisma.inventoryItem.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name: name.trim() }),
          ...(category && { category }),
          ...(quantity !== undefined && { quantity: parseInt(quantity, 10) }),
          ...(minQuantity !== undefined && { minQuantity: parseInt(minQuantity, 10) }),
          ...(location !== undefined && { location }),
          ...(cost !== undefined && { cost: parseFloat(cost) }),
          ...(vendor !== undefined && { vendor }),
        },
      });
      return sendSuccess(res, updated, 'Item updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update inventory', 500);
    }
  }

  static async updateStock(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { delta, type } = req.body;
      const change = parseInt(delta || '1', 10) * (type === 'OUT' ? -1 : 1);

      const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
      if (!item) return sendError(res, 'Item not found', 404);

      const newQty = Math.max(0, item.quantity + change);
      const updated = await prisma.inventoryItem.update({
        where: { id: req.params.id },
        data: { quantity: newQty },
      });

      return sendSuccess(res, updated, `Stock updated to ${newQty}`);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to adjust stock', 500);
    }
  }

  static async archiveInventoryItem(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.inventoryItem.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Item archived');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete item', 500);
    }
  }

  // ==========================================================================
  // 12. TASKS & OPERATIONS
  // ==========================================================================
  static async getTasks(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const tasks = await prisma.operationalTask.findMany({
        where: propertyFilter,
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, tasks);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch tasks', 500);
    }
  }

  static async createTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, title, category, priority, assignedTo, dueDate, notes } = req.body;
      if (!title) return sendError(res, 'Task title is required', 400);

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      if (!propId) return sendError(res, 'Property ID is required', 400);

      const task = await prisma.operationalTask.create({
        data: {
          propertyId: propId,
          title: title.trim(),
          category: category || 'GENERAL',
          priority: (priority || 'MEDIUM') as any,
          assignedTo: assignedTo || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes || null,
          status: 'PENDING',
        },
      });
      return sendSuccess(res, task, 'Task created', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create task', 500);
    }
  }

  static async updateTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, title, assignedTo, priority } = req.body;
      const updated = await prisma.operationalTask.update({
        where: { id: req.params.id },
        data: {
          ...(status && { status }),
          ...(title && { title: title.trim() }),
          ...(assignedTo !== undefined && { assignedTo }),
          ...(priority && { priority }),
        },
      });
      return sendSuccess(res, updated, 'Task updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update task', 500);
    }
  }

  static async archiveTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.operationalTask.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Task deleted');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete task', 500);
    }
  }

  // ==========================================================================
  // 13. DOCUMENTS & KYC
  // ==========================================================================
  static async getDocuments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const docs = await prisma.document.findMany({
        where: propertyFilter,
        include: {
          resident: { include: { bed: { include: { room: true } } } },
        },
        orderBy: { uploadedAt: 'desc' },
      });
      return sendSuccess(res, docs);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch documents', 500);
    }
  }

  static async verifyDocument(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, rejectionReason } = req.body;
      const updated = await prisma.document.update({
        where: { id: req.params.id },
        data: {
          status: status as any,
          rejectionReason: rejectionReason || null,
        },
      });

      // Update resident KYC status if needed
      if (status === 'VERIFIED') {
        await prisma.resident.update({
          where: { id: updated.residentId },
          data: { kycStatus: 'VERIFIED' },
        });
      }

      return sendSuccess(res, updated, `Document marked as ${status}`);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to verify document', 500);
    }
  }

  // ==========================================================================
  // 14. NOTICES
  // ==========================================================================
  static async getNotices(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const notices = await prisma.notice.findMany({
        where: propertyFilter,
        orderBy: { publishedAt: 'desc' },
      });
      return sendSuccess(res, notices);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch notices', 500);
    }
  }

  static async createNotice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, title, content, category, isImportant } = req.body;
      if (!title || !content) return sendError(res, 'Title and content are required', 400);

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      if (!propId) return sendError(res, 'Property ID is required', 400);

      const notice = await prisma.notice.create({
        data: {
          propertyId: propId,
          title: title.trim(),
          content: content.trim(),
          category: (category || 'GENERAL') as any,
          isImportant: Boolean(isImportant),
          publisherName: req.user?.name || 'PG Management',
        },
      });

      return sendSuccess(res, notice, 'Notice published successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to publish notice', 500);
    }
  }

  static async updateNotice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { title, content, category, isImportant } = req.body;
      const updated = await prisma.notice.update({
        where: { id: req.params.id },
        data: {
          ...(title && { title: title.trim() }),
          ...(content && { content: content.trim() }),
          ...(category && { category }),
          ...(isImportant !== undefined && { isImportant }),
        },
      });
      return sendSuccess(res, updated, 'Notice updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update notice', 500);
    }
  }

  static async archiveNotice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.notice.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Notice archived');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete notice', 500);
    }
  }

  // ==========================================================================
  // 15. LEAVE REQUESTS
  // ==========================================================================
  static async getLeaveRequests(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const leaves = await prisma.leaveRequest.findMany({
        where: propertyFilter,
        include: {
          resident: { include: { bed: { include: { room: true } } } },
        },
        orderBy: { appliedAt: 'desc' },
      });
      return sendSuccess(res, leaves);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch leave requests', 500);
    }
  }

  static async approveLeave(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const updated = await prisma.leaveRequest.update({
        where: { id: req.params.id },
        data: {
          status: 'APPROVED',
          approvedBy: req.user?.name || 'Owner',
        },
      });
      return sendSuccess(res, updated, 'Leave request approved');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to approve leave', 500);
    }
  }

  static async rejectLeave(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const updated = await prisma.leaveRequest.update({
        where: { id: req.params.id },
        data: {
          status: 'REJECTED',
          approvedBy: req.user?.name || 'Owner',
        },
      });
      return sendSuccess(res, updated, 'Leave request rejected');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to reject leave', 500);
    }
  }

  // ==========================================================================
  // 16. EMERGENCY SOS EVENTS
  // ==========================================================================
  static async getSOSEvents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const sos = await prisma.sOSEvent.findMany({
        where: propertyFilter,
        include: {
          resident: { include: { bed: { include: { room: true } } } },
        },
        orderBy: { triggeredAt: 'desc' },
      });
      return sendSuccess(res, sos);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch SOS events', 500);
    }
  }

  static async acknowledgeSOS(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const updated = await prisma.sOSEvent.update({
        where: { id: req.params.id },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedBy: req.user?.name || 'Security Warden',
        },
      });
      return sendSuccess(res, updated, 'SOS event acknowledged');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to acknowledge SOS', 500);
    }
  }

  static async resolveSOS(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { notes } = req.body;
      const updated = await prisma.sOSEvent.update({
        where: { id: req.params.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          notes: notes || 'Incident attended and resolved',
        },
      });
      return sendSuccess(res, updated, 'SOS event resolved');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to resolve SOS', 500);
    }
  }

  // ==========================================================================
  // 17. REPORTS & ANALYTICS
  // ==========================================================================
  static async getReports(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const propFilter = propertyFilter;

      const [payments, expenses, rooms, beds, residents] = await Promise.all([
        prisma.payment.findMany({ where: propFilter }),
        prisma.expense.findMany({ where: propFilter }),
        prisma.room.findMany({ where: propFilter }),
        prisma.bed.findMany({ where: propertyId ? { room: { propertyId } } : (req.user?.tenantId ? { room: { property: { tenantId: req.user.tenantId } } } : {}) }),
        prisma.resident.findMany({ where: propFilter }),
      ]);

      const totalRevenue = payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalRevenue - totalExpenses;
      const totalBeds = beds.length;
      const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      return sendSuccess(res, {
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          totalBeds,
          occupiedBeds,
          availableBeds: totalBeds - occupiedBeds,
          occupancyRate,
          totalResidents: residents.filter((r) => r.status === 'ACTIVE').length,
        },
        monthlyBreakdown: [
          { month: 'Jun', revenue: Math.round(totalRevenue * 0.2), expenses: Math.round(totalExpenses * 0.2) },
          { month: 'Jul', revenue: Math.round(totalRevenue * 0.25), expenses: Math.round(totalExpenses * 0.25) },
          { month: 'Aug', revenue: Math.round(totalRevenue * 0.25), expenses: Math.round(totalExpenses * 0.25) },
          { month: 'Sep', revenue: Math.round(totalRevenue * 0.3), expenses: Math.round(totalExpenses * 0.3) },
        ],
        paymentsList: payments.slice(0, 20),
        expensesList: expenses.slice(0, 20),
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to generate reports', 500);
    }
  }

  // ==========================================================================
  // 18. AUDIT LOGS & SETTINGS
  // ==========================================================================
  static async getAuditLogs(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, tenantFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const logs = await prisma.auditLog.findMany({
        where: propertyId ? { propertyId } : tenantFilter,
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
      return sendSuccess(res, logs);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch audit logs', 500);
    }
  }

  static async getSettings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const [settingsRows, property] = await Promise.all([
        prisma.setting.findMany(),
        propertyId ? prisma.property.findUnique({ where: { id: propertyId } }) : null,
      ]);

      const settingsMap: Record<string, any> = {};
      settingsRows.forEach((s) => {
        settingsMap[s.key] = s.value;
      });

      return sendSuccess(res, {
        rentDueDay: settingsMap['rent_due_day'] || '5',
        lateFeePerDay: settingsMap['late_fee_per_day'] || '100',
        noticePeriodDays: settingsMap['notice_period_days'] || '30',
        visitorCutoffTime: settingsMap['visitor_cutoff_time'] || '22:00',
        upiId: property?.upiId || settingsMap['primary_upi_id'] || 'urbannest@axis',
        rules: settingsMap['rules'] || '1. Quiet hours after 10 PM\n2. Visitors allowed 9 AM - 9 PM\n3. Keep common areas clean',
        policies: settingsMap['policies'] || 'Deposit refundable within 7 days of checkout subject to room inspection.',
        property: property ? {
          id: property.id,
          name: property.name,
          address: property.address,
          city: property.city,
          upiId: property.upiId,
          phone: property.phone,
          email: property.email,
        } : null,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch settings', 500);
    }
  }

  static async updateSettings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { rentDueDay, lateFeePerDay, noticePeriodDays, visitorCutoffTime, upiId, gstNumber, propertyPhone, propertyEmail, propertyId } = req.body;

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;

      const settingsToUpsert = [
        { key: 'rent_due_day', value: String(rentDueDay || '5') },
        { key: 'late_fee_per_day', value: String(lateFeePerDay || '100') },
        { key: 'notice_period_days', value: String(noticePeriodDays || '30') },
        { key: 'visitor_cutoff_time', value: String(visitorCutoffTime || '22:00') },
        { key: 'primary_upi_id', value: String(upiId || '') },
        { key: 'gst_number', value: String(gstNumber || '') },
      ];

      for (const item of settingsToUpsert) {
        await prisma.setting.upsert({
          where: { key: item.key },
          update: { value: item.value },
          create: { key: item.key, value: item.value },
        });
      }

      if (propId) {
        await prisma.property.update({
          where: { id: propId },
          data: {
            ...(upiId && { upiId }),
            ...(gstNumber && { gstNumber }),
            ...(propertyPhone && { phone: propertyPhone }),
            ...(propertyEmail && { email: propertyEmail }),
          },
        });
      }

      return sendSuccess(res, null, 'Settings saved successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to save settings', 500);
    }
  }
}

export default OwnerController;
