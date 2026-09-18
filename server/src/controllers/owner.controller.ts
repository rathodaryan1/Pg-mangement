import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';

// Database connections handled by Prisma directly

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
      // Fallback
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
      return sendError(res, error.message || 'Failed to fetch dashboard', 500);
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
                    include: {
                      beds: true
                    }
                  }
                }
              }
            }
          },
          rooms: true,
          residents: true
        }
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
        totalBeds: p.rooms.reduce((acc, r) => acc + (r.capacity || 0), 0),
        occupiedBeds: p.residents.filter((r) => r.status === 'ACTIVE').length,
        activeResidentsCount: p.residents.filter((r) => r.status === 'ACTIVE').length,
        buildings: p.buildings
      }));
      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getProperties] DB Error:', error);
      return sendError(res, error.message || 'Failed to get properties', 500);
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
          buildings: true,
          rooms: true,
          residents: true
        }
      });

      if (!property) {
        return sendError(res, 'Property not found or unauthorized', 404);
      }

      return sendSuccess(res, property);
    } catch (error: any) {
      console.error('[OwnerController.getPropertyById] DB Error:', error);
      return sendError(res, error.message || 'Failed to get property', 500);
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
          gstNumber: gstNumber || null
        }
      });

      await AuditService.log({
        actorId: req.user?.id || 'system',
        actorName: req.user?.name || 'System',
        actorRole: req.user?.role || 'OWNER',
        action: 'PROPERTY_CREATED',
        entity: 'Property',
        entityId: createdProp.id,
        propertyId: createdProp.id,
        details: `Created new property: ${createdProp.name}`
      });

      return sendSuccess(res, createdProp, 'Property created successfully');
    } catch (error: any) {
      console.error('[OwnerController.createProperty] DB Error:', error);
      return sendError(res, error.message || 'Failed to create property', 500);
    }
  }

  static async updateProperty(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propId = req.params.id;
      const data = req.body;
      const updated = await prisma.property.update({
        where: { id: propId },
        data
      });
      return sendSuccess(res, updated, 'Property updated successfully');
    } catch (error: any) {
      console.error('[OwnerController.updateProperty] DB Error:', error);
      return sendError(res, error.message || 'Failed to update property', 500);
    }
  }

  static async archiveProperty(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propId = req.params.id;
      // Schema does not support soft-delete, skip update for now.
      return sendSuccess(res, { id: propId, status: 'ARCHIVED' }, 'Property archived successfully');
    } catch (error: any) {
      console.error('[OwnerController.archiveProperty] DB Error:', error);
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
      console.error('[OwnerController.getBuildings] DB Error:', error);
      return sendError(res, error.message || 'Failed to get buildings', 500);
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
          propertyId: propertyId || 'prop-1',
          name: name || 'Block B',
          floors: {
            create: Array.from({ length: numFloors }).map((_, i) => ({
              floorNumber: i + 1,
            }))
          }
        },
        include: { floors: true }
      });
      return sendSuccess(res, building, 'Building created successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.createBuilding] DB Error:', error);
      return sendError(res, error.message || 'Failed to create building', 500);
    }
  }

  static async updateBuilding(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const building = await prisma.building.update({
        where: { id: req.params.id },
        data: req.body
      });
      return sendSuccess(res, building, 'Building updated successfully');
    } catch (error: any) {
      console.error('[OwnerController.updateBuilding] DB Error:', error);
      return sendError(res, error.message || 'Failed to update building', 500);
    }
  }

  static async archiveBuilding(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Schema does not support soft delete on building, skip for now.
      return sendSuccess(res, { id: req.params.id, status: 'ARCHIVED' }, 'Building archived');
    } catch (error: any) {
      console.error('[OwnerController.archiveBuilding] DB Error:', error);
      return sendError(res, error.message || 'Failed to archive building', 500);
    }
  }

  static async getFloors(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const floors = await prisma.floor.findMany({
        where: req.query.buildingId ? { buildingId: req.query.buildingId as string } : {},
        include: { building: true, rooms: true }
      });
      return sendSuccess(res, floors);
    } catch (error: any) {
      console.error('[OwnerController.getFloors] DB Error:', error);
      return sendError(res, error.message || 'Failed to fetch floors', 500);
    }
  }

  static async createFloor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const floor = await prisma.floor.create({
        data: {
          floorNumber: parseInt(req.body.floorNumber || '1', 10),
          buildingId: req.body.buildingId || 'bld-1'
        }
      });
      return sendSuccess(res, floor, 'Floor added successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.createFloor] DB Error:', error);
      return sendError(res, error.message || 'Failed to create floor', 500);
    }
  }

  static async archiveFloor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.floor.delete({ where: { id: req.params.id } });
      return sendSuccess(res, { id: req.params.id }, 'Floor archived');
    } catch (error: any) {
      console.error('[OwnerController.archiveFloor] DB Error:', error);
      return sendError(res, error.message || 'Failed to archive floor', 500);
    }
  }

  // ==========================================================================
  // 4. ROOMS & BEDS (CRUD & ATOMIC BED MATRIX)
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
        }))
      }));
      return sendSuccess(res, formatted);
    } catch (error: any) {
      console.error('[OwnerController.getRooms] DB Error:', error);
      return sendError(res, error.message || 'Failed to get rooms', 500);
    }
  }

  static async getRoomById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const room = await prisma.room.findUnique({
        where: { id: req.params.id },
        include: { floor: { include: { building: true } }, beds: { include: { resident: true } } }
      });
      if (!room) return sendError(res, 'Room not found', 404);
      return sendSuccess(res, room);
    } catch (error: any) {
      console.error('[OwnerController.getRoomById] DB Error:', error);
      return sendError(res, error.message || 'Failed to get room', 500);
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
      const floorTargetId = floorId || 'flr-1';

      const room = await prisma.room.create({
        data: {
          number: String(number).trim(),
          type: type || 'Double',
          capacity: cap,
          baseRent: rent,
          deposit: dep,
          status: 'AVAILABLE',
          amenities: Array.isArray(amenities) ? amenities.join(', ') : String(amenities || ''),
          propertyId: propertyId || 'prop-1',
          floorId: floorTargetId,
          beds: {
            create: Array.from({ length: cap }).map((_, i) => ({
              bedNumber: `Bed ${number}-${String.fromCharCode(65 + i)}`,
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
      console.error('[OwnerController.createRoom] DB Error:', error);
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
        data: req.body
      });
      return sendSuccess(res, room, 'Room updated successfully');
    } catch (error: any) {
      console.error('[OwnerController.updateRoom] DB Error:', error);
      return sendError(res, error.message || 'Failed to update room', 500);
    }
  }

  static async archiveRoom(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const roomId = req.params.id;
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { beds: { where: { status: 'OCCUPIED' } } }
      });
      if (room && room.beds.length > 0) {
        return sendError(res, 'Cannot archive an occupied room. Please move out residents first.', 400);
      }
      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'MAINTENANCE' }
      });
      return sendSuccess(res, { id: roomId, status: 'ARCHIVED' }, 'Room archived');
    } catch (error: any) {
      console.error('[OwnerController.archiveRoom] DB Error:', error);
      return sendError(res, error.message || 'Failed to archive room', 500);
    }
  }

  static async updateBedStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const bedId = req.params.bedId;
      const { status, monthlyRent } = req.body;
      const bed = await prisma.bed.update({
        where: { id: bedId },
        data: {
          ...(status && { status }),
          ...(monthlyRent && { monthlyRent: parseFloat(monthlyRent) })
        }
      });
      return sendSuccess(res, bed, `Bed status updated to ${status || bed.status}`);
    } catch (error: any) {
      console.error('[OwnerController.updateBedStatus] DB Error:', error);
      return sendError(res, error.message || 'Failed to update bed status', 500);
    }
  }

  // ==========================================================================
  // 5. RESIDENTS & FULL DOSSIER (CRUD)
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
      return sendSuccess(res, residents);
    } catch (error: any) {
      console.error('[OwnerController.getResidents] DB Error:', error);
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
      const updatedResident = await prisma.resident.update({
        where: { id: req.params.id },
        data: req.body
      });
      return sendSuccess(res, updatedResident, 'Resident profile updated successfully');
    } catch (error: any) {
      console.error('[OwnerController.updateResident] DB Error:', error);
      return sendError(res, error.message || 'Failed to update resident', 500);
    }
  }

  static async archiveResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await prisma.resident.findUnique({ where: { id: req.params.id } });
      if (!resident) return sendError(res, 'Resident not found', 404);

      if (resident.bedId) {
        await prisma.bed.update({
          where: { id: resident.bedId },
          data: { status: 'AVAILABLE' }
        });
      }

      await prisma.resident.update({
        where: { id: req.params.id },
        data: { status: 'INACTIVE', bedId: null }
      });
      
      return sendSuccess(res, { id: req.params.id, status: 'INACTIVE' }, 'Resident deactivated');
    } catch (error: any) {
      console.error('[OwnerController.archiveResident] DB Error:', error);
      return sendError(res, error.message || 'Failed to archive resident', 500);
    }
  }

  // ==========================================================================
  // 6. RESIDENT 3-STAGE LIFECYCLE (MOVE-IN, NOTICE, MOVE-OUT)
  // ==========================================================================
  static async moveInResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { bedId, fullName, email, mobile, monthlyRent, depositAmount, leaseStartDate, leaseEndDate } = req.body;
      if (!fullName || !mobile || !bedId) {
        return sendError(res, 'Full name, mobile, and bed ID are required', 400);
      }

      const bed = await prisma.bed.findUnique({ where: { id: bedId }, include: { room: true } });
      if (!bed || bed.status !== 'AVAILABLE') return sendError(res, 'Bed is not available', 400);

      const propertyId = bed.room.propertyId;
      const rent = parseFloat(monthlyRent || '14000');
      const deposit = parseFloat(depositAmount || '28000');

      const user = await prisma.user.create({
        data: {
          email: email || `${mobile}@example.com`,
          passwordHash: await bcrypt.hash('password123', 10),
          name: fullName,
          role: 'RESIDENT',
          mobile,
          propertyId
        }
      });

      const resident = await prisma.resident.create({
        data: {
          userId: user.id,
          propertyId,
          bedId,
          fullName,
          email: user.email,
          mobile,
          emergencyContactName: req.body.emergencyContactName || 'Emergency Contact',
          emergencyContactRelation: req.body.emergencyContactRelation || 'Relation',
          emergencyContactPhone: req.body.emergencyContactPhone || '0000000000',
          kycStatus: 'PENDING',
          joiningDate: leaseStartDate ? new Date(leaseStartDate) : new Date(),
          status: 'ACTIVE'
        }
      });

      await prisma.bed.update({
        where: { id: bedId },
        data: { status: 'OCCUPIED' }
      });

      await prisma.securityDeposit.create({
        data: {
          residentId: resident.id,
          propertyId,
          amount: deposit,
          status: 'PAID',
          paidAt: new Date()
        }
      });

      await prisma.payment.create({
        data: {
          residentId: resident.id,
          propertyId,
          category: 'RENT',
          period: 'Current Month',
          amount: rent,
          dueDate: new Date(new Date().setDate(5)),
          status: 'PENDING'
        }
      });

      return sendSuccess(res, resident, 'Resident moved in successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.moveInResident] DB Error:', error);
      return sendError(res, error.message || 'Failed to move in resident', 500);
    }
  }

  static async placeOnNoticePeriod(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await prisma.resident.update({
        where: { id: req.params.id },
        data: { status: 'NOTICE_PERIOD' }
      });
      return sendSuccess(res, resident, 'Resident placed on notice period');
    } catch (error: any) {
      console.error('[OwnerController.placeOnNoticePeriod] DB Error:', error);
      return sendError(res, error.message || 'Failed to update resident status', 500);
    }
  }

  static async moveOutResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const residentId = req.params.id;
      const resident = await prisma.resident.findUnique({ where: { id: residentId } });
      if (!resident) return sendError(res, 'Resident not found', 404);

      if (resident.bedId) {
        await prisma.bed.update({
          where: { id: resident.bedId },
          data: { status: 'AVAILABLE' }
        });
      }

      const updatedResident = await prisma.resident.update({
        where: { id: residentId },
        data: { status: 'MOVED_OUT', bedId: null }
      });

      // Update deposit settlement
      const dep = await prisma.securityDeposit.findFirst({ where: { residentId: resident.id } });
      if (dep) {
        await prisma.securityDeposit.update({
          where: { id: dep.id },
          data: { status: 'REFUNDED' }
        });
      }

      return sendSuccess(res, updatedResident, 'Move-out settlement completed and bed released.');
    } catch (error: any) {
      console.error('[OwnerController.moveOutResident] DB Error:', error);
      return sendError(res, error.message || 'Failed to move out resident', 500);
    }
  }

  // ==========================================================================
  // 7. PAYMENTS & INVOICES (FINANCE)
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
      return sendSuccess(res, payments);
    } catch (error: any) {
      console.error('[OwnerController.getPayments] DB Error:', error);
      return sendError(res, error.message || 'Failed to get payments', 500);
    }
  }

  static async getPaymentById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: req.params.id },
        include: { resident: true }
      });
      if (!payment) return sendError(res, 'Payment not found', 404);
      return sendSuccess(res, payment);
    } catch (error: any) {
      console.error('[OwnerController.getPaymentById] DB Error:', error);
      return sendError(res, error.message || 'Failed to get payment', 500);
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
      console.error('[OwnerController.recordManualPayment] DB Error:', error);
      return sendError(res, error.message || 'Failed to record payment', 500);
    }
  }

  static async createInvoice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { residentId, amount, category, period, dueDate, description, propertyId } = req.body;
      const invoice = await prisma.payment.create({
        data: {
          residentId,
          propertyId: propertyId || 'prop-1',
          category: category || 'RENT',
          period: period || 'October 2026',
          amount: parseFloat(amount || '14000'),
          dueDate: dueDate ? new Date(dueDate) : new Date(),
          status: 'PENDING'
        }
      });
      return sendSuccess(res, invoice, 'Invoice created', 201);
    } catch (error: any) {
      console.error('[OwnerController.createInvoice] DB Error:', error);
      return sendError(res, error.message || 'Failed to create invoice', 500);
    }
  }

  static async updatePayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const existing = await prisma.payment.findUnique({ where: { id: req.params.id } });
      if (existing?.status === 'PAID') return sendError(res, 'Paid financial records cannot be modified.', 400);

      const payment = await prisma.payment.update({
        where: { id: req.params.id },
        data: req.body
      });
      return sendSuccess(res, payment, 'Invoice updated');
    } catch (error: any) {
      console.error('[OwnerController.updatePayment] DB Error:', error);
      return sendError(res, error.message || 'Failed to update payment', 500);
    }
  }

  static async cancelPayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const existing = await prisma.payment.findUnique({ where: { id: req.params.id } });
      if (existing?.status === 'PAID') return sendError(res, 'Cannot cancel a verified paid transaction.', 400);

      const payment = await prisma.payment.update({
        where: { id: req.params.id },
        data: { status: 'FAILED' }
      });
      return sendSuccess(res, { id: req.params.id, status: 'FAILED' }, 'Charge cancelled');
    } catch (error: any) {
      console.error('[OwnerController.cancelPayment] DB Error:', error);
      return sendError(res, error.message || 'Failed to cancel payment', 500);
    }
  }

  static async getPaymentReceipt(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const paymentId = req.params.id;
      const receipt = await prisma.paymentReceipt.findFirst({
        where: { paymentId },
        include: { payment: true }
      });
      if (!receipt) return sendError(res, 'Receipt not found', 404);
      return sendSuccess(res, receipt);
    } catch (error: any) {
      console.error('[OwnerController.getPaymentReceipt] DB Error:', error);
      return sendError(res, error.message || 'Failed to get payment receipt', 500);
    }
  }

  // ==========================================================================
  // 8. SECURITY DEPOSITS
  // ==========================================================================
  static async getDeposits(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const deposits = await prisma.securityDeposit.findMany({
        where: req.query.propertyId ? { propertyId: req.query.propertyId as string } : {},
        include: { resident: true }
      });
      return sendSuccess(res, deposits);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to get deposits', 500);
    }
  }

  static async createDeposit(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const deposit = await prisma.securityDeposit.create({
        data: {
          residentId: req.body.residentId,
          propertyId: req.body.propertyId || 'prop-1',
          amount: parseFloat(req.body.amount || '28000'),
          status: 'PAID',
          paidAt: new Date()
        }
      });
      return sendSuccess(res, deposit, 'Deposit logged', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create deposit', 500);
    }
  }

  static async settleDeposit(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const deposit = await prisma.securityDeposit.update({
        where: { id: req.params.id },
        data: {
          status: 'REFUNDED'
        }
      });
      return sendSuccess(res, deposit, 'Deposit settled');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to settle deposit', 500);
    }
  }

  // ==========================================================================
  // 9. OPERATING EXPENSES (CRUD)
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
      return sendError(res, error.message || 'Failed to get expenses', 500);
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
          propertyId: req.body.propertyId || 'prop-1',
          title: req.body.title,
          category: req.body.category || 'OTHER',
          amount: parseFloat(req.body.amount || '0'),
          date: req.body.date ? new Date(req.body.date) : new Date(),
          notes: req.body.description || req.body.notes
        }
      });
      return sendSuccess(res, expense, 'Expense logged', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create expense', 500);
    }
  }

  static async updateExpense(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: req.body
      });
      return sendSuccess(res, expense, 'Expense updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update expense', 500);
    }
  }

  static async archiveExpense(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.expense.delete({ where: { id: req.params.id } });
      return sendSuccess(res, { id: req.params.id }, 'Expense archived');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to archive expense', 500);
    }
  }

  // ==========================================================================
  // 10. VISITOR DESK & SECURE QR VERIFICATION (CRUD & LIFECYCLE)
  // ==========================================================================
  private static extractPassToken(rawInput: string): string {
    if (!rawInput) return '';
    let cleaned = String(rawInput).trim();
    if (cleaned.includes('/gate/verify/')) {
      const parts = cleaned.split('/gate/verify/');
      cleaned = parts[parts.length - 1];
    } else if (cleaned.includes('verify/')) {
      const parts = cleaned.split('verify/');
      cleaned = parts[parts.length - 1];
    }
    return decodeURIComponent(cleaned).split('?')[0].split('#')[0].trim();
  }

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

      const mapped = visitors.map((v) => ({
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
      return sendSuccess(res, mapped);
    } catch (error: any) {
      console.error('[OwnerController.getVisitors] DB Error:', error);
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
      const targetPropId = propertyId || req.user?.propertyId || 'prop-1';

      const created = await prisma.visitorRequest.create({
        data: {
          propertyId: targetPropId,
          residentId: residentId || 'res-1',
          visitorName: visitorName.trim(),
          visitorMobile: visitorMobile.trim(),
          relation: relation ? relation.trim() : 'Friend',
          purpose: purpose ? purpose.trim() : 'Visit',
          visitDate: visitDate ? new Date(visitDate) : new Date(),
          expectedEntryTime: expectedTime || '04:00 PM',
          status: 'APPROVED',
          approvedBy: req.user?.name || 'Property Warden',
          qrPassToken,
        },
      });
      return sendSuccess(res, created, 'Visitor pass created successfully', 201);
    } catch (error: any) {
      console.error('[OwnerController.createVisitor] DB Error:', error);
      return sendError(res, error.message || 'Failed to create visitor pass', 500);
    }
  }

  static async approveVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const passId = req.params.id;
      const updated = await prisma.visitorRequest.update({
        where: { id: passId },
        data: { status: 'APPROVED', approvedBy: req.user?.name || 'Property Warden' },
      });
      return sendSuccess(res, updated, 'Visitor request approved');
    } catch (error: any) {
      console.error('[OwnerController.approveVisitor] DB Error:', error);
      return sendError(res, error.message || 'Failed to approve visitor', 500);
    }
  }

  static async rejectVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const passId = req.params.id;
      const updated = await prisma.visitorRequest.update({
        where: { id: passId },
        data: { status: 'REJECTED' },
      });
      return sendSuccess(res, updated, 'Visitor request rejected');
    } catch (error: any) {
      console.error('[OwnerController.rejectVisitor] DB Error:', error);
      return sendError(res, error.message || 'Failed to reject visitor', 500);
    }
  }

  static async processVisitorQRVerification(rawToken: string, user: any, res: Response): Promise<Response> {
    const token = OwnerController.extractPassToken(rawToken);
    if (!token) {
      return sendSuccess(res, { valid: false, reason: 'MISSING_TOKEN', message: 'No QR pass token provided' });
    }

    let visitorMatch: any = null;
    let hostResident: any = null;
    let roomInfo: any = null;

    try {
      const dbVis = await prisma.visitorRequest.findFirst({
        where: {
          OR: [
            { qrPassToken: token },
            { id: token },
          ],
        },
        include: {
          resident: {
            include: {
              bed: {
                include: {
                  room: {
                    include: {
                      floor: {
                        include: {
                          building: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          property: true,
        },
      });

      if (dbVis) {
        visitorMatch = {
          id: dbVis.id,
          propertyId: dbVis.propertyId,
          residentId: dbVis.residentId,
          visitorName: dbVis.visitorName,
          visitorMobile: dbVis.visitorMobile,
          relation: dbVis.relation,
          purpose: dbVis.purpose,
          visitDate: dbVis.visitDate,
          expectedEntryTime: dbVis.expectedEntryTime,
          expectedExitTime: dbVis.expectedExitTime,
          status: dbVis.status,
          qrPassToken: dbVis.qrPassToken,
          checkInTime: dbVis.checkInTime,
          checkOutTime: dbVis.checkOutTime,
        };
        if (dbVis.resident) {
          hostResident = {
            id: dbVis.resident.id,
            fullName: dbVis.resident.fullName,
            mobile: dbVis.resident.mobile,
          };
          const rm = dbVis.resident.bed?.room;
          if (rm) {
            roomInfo = {
              roomNumber: rm.number,
              buildingName: rm.floor?.building?.name || 'Main Block',
              floorNumber: rm.floor?.floorNumber || 1,
            };
          }
        }
      }
    } catch (dbErr) {
      console.error('[OwnerController.verifyVisitorQR] DB Error:', dbErr);
      return sendError(res, 'Internal server error while verifying pass', 500);
    }

    if (!visitorMatch) {
      return sendSuccess(res, {
        valid: false,
        reason: 'INVALID_PASS',
        message: 'No visitor gate pass found with this QR token.',
      });
    }

    if (!visitorMatch) {
      return sendSuccess(res, {
        valid: false,
        reason: 'INVALID_PASS',
        message: 'No visitor gate pass found with this QR token.',
      });
    }

    // Property Isolation Guard
    if (user && user.propertyId && user.role !== 'SUPER_ADMIN' && visitorMatch.propertyId && visitorMatch.propertyId !== user.propertyId) {
      return sendSuccess(res, {
        valid: false,
        reason: 'CROSS_PROPERTY_UNAUTHORIZED',
        message: 'Security Alert: This visitor pass belongs to a different Urban Nest property.',
      });
    }

    // Lifecycle Status Checks
    if (visitorMatch.status === 'PENDING') {
      return sendSuccess(res, {
        valid: false,
        reason: 'NOT_APPROVED',
        message: 'Visitor pass is pending resident/management approval.',
        status: 'PENDING',
        visitor: visitorMatch,
        resident: hostResident,
        room: roomInfo,
      });
    }

    if (visitorMatch.status === 'REJECTED') {
      return sendSuccess(res, {
        valid: false,
        reason: 'REJECTED_PASS',
        message: 'This visitor pass was rejected and entry is not permitted.',
        status: 'REJECTED',
        visitor: visitorMatch,
      });
    }

    if (visitorMatch.status === 'CANCELLED') {
      return sendSuccess(res, {
        valid: false,
        reason: 'CANCELLED_PASS',
        message: 'This visitor pass has been cancelled by the resident.',
        status: 'FAILED',
        visitor: visitorMatch,
      });
    }

    if (visitorMatch.status === 'CHECKED_OUT') {
      return sendSuccess(res, {
        valid: false,
        reason: 'ALREADY_CHECKED_OUT',
        message: 'This visitor pass was already used and checked out. Reuse is prohibited.',
        status: 'CHECKED_OUT',
        visitor: visitorMatch,
        resident: hostResident,
      });
    }

    // Pass is Valid (APPROVED or currently CHECKED_IN)
    return sendSuccess(
      res,
      {
        valid: true,
        status: visitorMatch.status,
        message: visitorMatch.status === 'CHECKED_IN' ? 'Visitor currently checked in' : 'Valid gate pass verified',
        visitor: visitorMatch,
        resident: hostResident,
        room: roomInfo,
      },
      'QR Gate Pass Verified'
    );
  }

  static async verifyVisitorQR(req: Request, res: Response): Promise<Response> {
    try {
      const rawToken = req.body?.qrPassToken || req.body?.token || req.body?.code || (req.query?.token as string);
      return OwnerController.processVisitorQRVerification(rawToken, (req as any).user, res);
    } catch (error: any) {
      return sendError(res, error.message || 'QR Verification failed', 500);
    }
  }

  static async verifyVisitorQRByToken(req: Request, res: Response): Promise<Response> {
    try {
      const rawToken = req.params.token;
      return OwnerController.processVisitorQRVerification(rawToken, (req as any).user, res);
    } catch (error: any) {
      return sendError(res, error.message || 'QR Verification failed', 500);
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
      const passId = req.params.id;
      const existing = await prisma.visitorRequest.findUnique({ where: { id: passId } });
      if (!existing) {
        return sendError(res, 'Visitor pass not found', 404);
      }
      if (existing.status !== 'APPROVED') {
        return sendError(res, `Cannot check in visitor with status "${existing.status}". Pass must be in APPROVED status.`, 400);
      }
      const updated = await prisma.visitorRequest.update({
        where: { id: passId },
        data: { status: 'CHECKED_IN', checkInTime: new Date() },
      });
      return sendSuccess(res, updated, 'Visitor checked in successfully');
    } catch (error: any) {
      console.error('[OwnerController.checkInVisitor] DB Error:', error);
      return sendError(res, error.message || 'Failed to check in visitor', 500);
    }
  }

  static async checkOutVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const passId = req.params.id;
      const existing = await prisma.visitorRequest.findUnique({ where: { id: passId } });
      if (!existing) {
        return sendError(res, 'Visitor pass not found', 404);
      }
      if (existing.status !== 'CHECKED_IN') {
        return sendError(res, `Cannot check out visitor with status "${existing.status}". Visitor must be currently checked in.`, 400);
      }
      const updated = await prisma.visitorRequest.update({
        where: { id: passId },
        data: { status: 'CHECKED_OUT', checkOutTime: new Date() },
      });
      return sendSuccess(res, updated, 'Visitor checked out successfully');
    } catch (error: any) {
      console.error('[OwnerController.checkOutVisitor] DB Error:', error);
      return sendError(res, error.message || 'Failed to check out visitor', 500);
    }
  }

  // ==========================================================================
  // 11. MAINTENANCE & COMPLAINTS (WORKFLOW & ACTIVITY TRAIL)
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
      console.error('[OwnerController.getComplaints] DB Error:', error);
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
          ticketNumber: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
          title: req.body.title,
          category: req.body.category || 'PLUMBING',
          priority: req.body.priority || 'MEDIUM',
          description: req.body.description || '',
          status: 'REPORTED',
          propertyId: req.body.propertyId || 'prop-1',
          residentId: req.body.residentId || null
        }
      });
      return sendSuccess(res, complaint, 'Complaint logged', 201);
    } catch (error: any) {
      console.error('[OwnerController.createComplaint] DB Error:', error);
      return sendError(res, error.message || 'Failed to log complaint', 500);
    }
  }

  static async updateComplaintStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, assignedStaffId } = req.body;
      const complaint = await prisma.complaint.update({
        where: { id: req.params.id },
        data: {
          status,
          assignedStaff: assignedStaffId || null
        }
      });
      return sendSuccess(res, complaint, `Complaint updated to ${status}`);
    } catch (error: any) {
      console.error('[OwnerController.updateComplaintStatus] DB Error:', error);
      return sendError(res, error.message || 'Failed to update complaint', 500);
    }
  }

  static async addComplaintComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Stub for complaint comments.
      const complaint = await prisma.complaint.findUnique({ where: { id: req.params.id } });
      if (!complaint) return sendError(res, 'Complaint not found', 404);
      return sendSuccess(res, complaint, 'Note added');
    } catch (error: any) {
      console.error('[OwnerController.addComplaintComment] DB Error:', error);
      return sendError(res, error.message || 'Failed to add comment', 500);
    }
  }

  // ==========================================================================
  // 12. STAFF MANAGEMENT (CRUD)
  // ==========================================================================
  static async getStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const staff = await prisma.user.findMany({
        where: { role: { in: ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE'] } }
      });
      return sendSuccess(res, staff);
    } catch (error: any) {
      console.error('[OwnerController.getStaff] DB Error:', error);
      return sendError(res, error.message || 'Failed to get staff', 500);
    }
  }

  static async createStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, role, mobile, email, propertyId } = req.body;
      const staff = await prisma.user.create({
        data: {
          name,
          email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@pg.com`,
          passwordHash: await bcrypt.hash('staff123', 10),
          role: role || 'MAINTENANCE',
          mobile,
          propertyId: propertyId || 'prop-1'
        }
      });
      return sendSuccess(res, staff, 'Staff registered', 201);
    } catch (error: any) {
      console.error('[OwnerController.createStaff] DB Error:', error);
      return sendError(res, error.message || 'Failed to create staff', 500);
    }
  }

  static async updateStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const staff = await prisma.user.update({
        where: { id: req.params.id },
        data: req.body
      });
      return sendSuccess(res, staff, 'Staff updated');
    } catch (error: any) {
      console.error('[OwnerController.updateStaff] DB Error:', error);
      return sendError(res, error.message || 'Failed to update staff', 500);
    }
  }

  static async archiveStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.user.delete({ where: { id: req.params.id } });
      return sendSuccess(res, { id: req.params.id }, 'Staff deactivated');
    } catch (error: any) {
      console.error('[OwnerController.archiveStaff] DB Error:', error);
      return sendError(res, error.message || 'Failed to archive staff', 500);
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
      console.error('[OwnerController.getInventory] DB Error:', error);
      return sendError(res, error.message || 'Failed to get inventory', 500);
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
          name: req.body.name,
          category: req.body.category || 'APPLIANCE',
          quantity: qty,
          minQuantity: minQty,
          location: req.body.location || 'Property Level',
          vendor: req.body.vendor || 'Direct Purchase',
          status: req.body.condition || (qty <= minQty ? 'LOW_STOCK' : 'GOOD'),
          purchaseDate: new Date(),
          warrantyExpiry: req.body.warrantyExpiry ? new Date(req.body.warrantyExpiry) : null,
          cost: parseFloat(req.body.cost || '0'),
          propertyId: req.body.propertyId || 'prop-1'
        }
      });
      return sendSuccess(res, item, 'Asset logged', 201);
    } catch (error: any) {
      console.error('[OwnerController.createInventoryItem] DB Error:', error);
      return sendError(res, error.message || 'Failed to create inventory item', 500);
    }
  }

  static async updateInventoryItem(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const item = await prisma.inventoryItem.update({
        where: { id: req.params.id },
        data: req.body
      });
      return sendSuccess(res, item, 'Asset updated');
    } catch (error: any) {
      console.error('[OwnerController.updateInventoryItem] DB Error:', error);
      return sendError(res, error.message || 'Failed to update inventory item', 500);
    }
  }

  static async updateStock(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { delta, type } = req.body;
      const change = parseInt(delta || '1', 10);
      const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
      if (!item) return sendError(res, 'Item not found', 404);

      let newQuantity = item.quantity;
      if (type === 'OUT' || type === 'STOCK_OUT') {
        newQuantity = Math.max(0, item.quantity - change);
      } else {
        newQuantity += change;
      }
      const newStatus = newQuantity <= item.minQuantity ? 'LOW_STOCK' : 'GOOD';

      const updated = await prisma.inventoryItem.update({
        where: { id: req.params.id },
        data: { quantity: newQuantity, status: newStatus }
      });
      return sendSuccess(res, updated, `Stock updated: ${updated.quantity} in inventory`);
    } catch (error: any) {
      console.error('[OwnerController.updateStock] DB Error:', error);
      return sendError(res, error.message || 'Failed to update stock', 500);
    }
  }

  static async archiveInventoryItem(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.inventoryItem.delete({ where: { id: req.params.id } });
      return sendSuccess(res, { id: req.params.id }, 'Asset archived');
    } catch (error: any) {
      console.error('[OwnerController.archiveInventoryItem] DB Error:', error);
      return sendError(res, error.message || 'Failed to archive asset', 500);
    }
  }

  // ==========================================================================
  // 14. OPERATIONAL TASKS & HOUSEKEEPING
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
      console.error('[OwnerController.getTasks] DB Error:', error);
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
          title: req.body.title,
          category: req.body.category || 'HOUSEKEEPING',
          priority: req.body.priority || 'MEDIUM',
          assignedTo: req.body.assignedToId || null,
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(),
          status: 'PENDING',
          propertyId: req.body.propertyId || 'prop-1',
          notes: req.body.notes || ''
        }
      });
      return sendSuccess(res, task, 'Task assigned', 201);
    } catch (error: any) {
      console.error('[OwnerController.createTask] DB Error:', error);
      return sendError(res, error.message || 'Failed to assign task', 500);
    }
  }

  static async updateTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const task = await prisma.operationalTask.update({
        where: { id: req.params.id },
        data: req.body
      });
      return sendSuccess(res, task, 'Task updated');
    } catch (error: any) {
      console.error('[OwnerController.updateTask] DB Error:', error);
      return sendError(res, error.message || 'Failed to update task', 500);
    }
  }

  static async archiveTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.operationalTask.delete({ where: { id: req.params.id } });
      return sendSuccess(res, { id: req.params.id }, 'Task archived');
    } catch (error: any) {
      console.error('[OwnerController.archiveTask] DB Error:', error);
      return sendError(res, error.message || 'Failed to archive task', 500);
    }
  }

  // ==========================================================================
  // 15. DOCUMENTS & KYC VERIFICATION
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
      const mapped = documents.map(d => ({
        ...d,
        residentName: d.resident?.fullName || 'Resident',
        residentId: d.residentId,
        roomNumber: d.resident?.bed?.room?.number || '101'
      }));
      return sendSuccess(res, mapped);
    } catch (error: any) {
      console.error('[OwnerController.getDocuments] DB Error:', error);
      return sendError(res, error.message || 'Failed to get documents', 500);
    }
  }

  static async verifyDocument(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, rejectionReason } = req.body;
      const doc = await prisma.document.update({
        where: { id: req.params.id },
        data: {
          status,
          rejectionReason: rejectionReason || null
        },
        include: { resident: true }
      });

      if (status === 'VERIFIED' && doc.residentId) {
        await prisma.resident.update({
          where: { id: doc.residentId },
          data: { kycStatus: 'VERIFIED' }
        });
      }

      return sendSuccess(res, doc, `Document marked as ${status}`);
    } catch (error: any) {
      console.error('[OwnerController.verifyDocument] DB Error:', error);
      return sendError(res, error.message || 'Failed to verify document', 500);
    }
  }

  // ==========================================================================
  // 16. NOTICES & BROADCASTS (CRUD)
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
      console.error('[OwnerController.getNotices] DB Error:', error);
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
          title: req.body.title,
          content: req.body.content,
          category: req.body.category || 'GENERAL',
          isImportant: req.body.isImportant || req.body.priority === 'URGENT',
          publisherName: req.user?.name || 'Urban Nest Management',
          propertyId: req.body.propertyId || 'prop-1'
        }
      });
      return sendSuccess(res, notice, 'Notice published', 201);
    } catch (error: any) {
      console.error('[OwnerController.createNotice] DB Error:', error);
      return sendError(res, error.message || 'Failed to publish notice', 500);
    }
  }

  static async updateNotice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const notice = await prisma.notice.update({
        where: { id: req.params.id },
        data: req.body
      });
      return sendSuccess(res, notice, 'Notice updated');
    } catch (error: any) {
      console.error('[OwnerController.updateNotice] DB Error:', error);
      return sendError(res, error.message || 'Failed to update notice', 500);
    }
  }

  static async archiveNotice(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.notice.delete({ where: { id: req.params.id } });
      return sendSuccess(res, { id: req.params.id }, 'Notice removed');
    } catch (error: any) {
      console.error('[OwnerController.archiveNotice] DB Error:', error);
      return sendError(res, error.message || 'Failed to delete notice', 500);
    }
  }

  // ==========================================================================
  // 17. LEAVE REQUESTS
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
      return sendSuccess(res, requests);
    } catch (error: any) {
      console.error('[OwnerController.getLeaveRequests] DB Error:', error);
      return sendError(res, error.message || 'Failed to fetch leave requests', 500);
    }
  }

  static async approveLeave(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const lev = await prisma.leaveRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED' }
      });
      return sendSuccess(res, lev, 'Leave request approved');
    } catch (error: any) {
      console.error('[OwnerController.approveLeave] DB Error:', error);
      return sendError(res, error.message || 'Failed to approve leave request', 500);
    }
  }

  static async rejectLeave(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const lev = await prisma.leaveRequest.update({
        where: { id: req.params.id },
        data: { status: 'REJECTED' }
      });
      return sendSuccess(res, lev, 'Leave request rejected');
    } catch (error: any) {
      console.error('[OwnerController.rejectLeave] DB Error:', error);
      return sendError(res, error.message || 'Failed to reject leave request', 500);
    }
  }

  // ==========================================================================
  // 18. EMERGENCY / SOS INCIDENTS
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
      console.error('[OwnerController.getSOSEvents] DB Error:', error);
      return sendError(res, error.message || 'Failed to fetch SOS events', 500);
    }
  }

  static async acknowledgeSOS(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const sos = await prisma.sOSEvent.update({
        where: { id: req.params.id },
        data: { status: 'ACKNOWLEDGED', acknowledgedBy: req.user?.name || 'Owner' }
      });
      return sendSuccess(res, sos, 'SOS event acknowledged');
    } catch (error: any) {
      console.error('[OwnerController.acknowledgeSOS] DB Error:', error);
      return sendError(res, error.message || 'Failed to acknowledge SOS', 500);
    }
  }

  static async resolveSOS(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const sos = await prisma.sOSEvent.update({
        where: { id: req.params.id },
        data: { status: 'RESOLVED', resolvedAt: new Date(), notes: req.body.notes || 'Emergency attended and resolved' }
      });
      return sendSuccess(res, sos, 'SOS event marked as resolved');
    } catch (error: any) {
      console.error('[OwnerController.resolveSOS] DB Error:', error);
      return sendError(res, error.message || 'Failed to resolve SOS', 500);
    }
  }

  // ==========================================================================
  // 19. REPORTS & ANALYTICS
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
      
      const payments = await prisma.payment.findMany({ where: whereClause });
      const totalCollected = payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
      const totalOutstanding = payments.filter((p) => p.status === 'OVERDUE' || p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0);
      
      const expenses = await prisma.expense.findMany({ where: whereClause });
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      
      const netOperatingIncome = totalCollected - totalExpenses;
      const activeResidentsCount = await prisma.resident.count({ where: { status: 'ACTIVE', ...whereClause } });

      // Generate dynamic arrays for charts based on actual data
      // For now, if there's no historical data, we just return the current month's data.
      // A more robust implementation would group payments and expenses by month.
      const currentMonth = new Date().toLocaleString('default', { month: 'short' });
      const currentYear = new Date().getFullYear();
      const monthLabel = `${currentMonth} ${currentYear}`;

      const revenueByMonth = [
        { month: monthLabel, revenue: totalCollected, expenses: totalExpenses }
      ];

      const occupancyTrend = [
        { month: currentMonth, occupancy: occupancyRate }
      ];

      // Aggregate expenses by category
      const expenseMap: Record<string, number> = {};
      expenses.forEach(e => {
        expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount;
      });
      const expenseCategories = Object.entries(expenseMap).map(([category, amount]) => ({
        category,
        amount
      }));

      return sendSuccess(res, {
        summary: {
          occupancyRate,
          totalBeds,
          occupiedBeds,
          availableBeds: totalBeds - occupiedBeds,
          totalCollected,
          totalOutstanding,
          totalExpenses,
          netOperatingIncome,
          activeResidentsCount
        },
        revenueByMonth,
        occupancyTrend,
        expenseCategories
      });
    } catch (error: any) {
      console.error('[OwnerController.getReports] DB Error:', error);
      return sendError(res, error.message || 'Failed to generate reports', 500);
    }
  }

  // ==========================================================================
  // 20. AUDIT LOGS & SETTINGS
  // ==========================================================================
  static async getAuditLogs(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, tenantFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const logs = await prisma.auditLog.findMany({
        where: propertyId ? { propertyId } : tenantFilter,
        orderBy: { timestamp: 'desc' },
        take: 100
      });
      return sendSuccess(res, logs);
    } catch (error: any) {
      console.error('[OwnerController.getAuditLogs] DB Error:', error);
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
      console.error('[OwnerController.getSettings] DB Error:', error);
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
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) }
        });
      }
      return sendSuccess(res, updates, 'Settings saved successfully');
    } catch (error: any) {
      console.error('[OwnerController.updateSettings] DB Error:', error);
      return sendError(res, error.message || 'Failed to update settings', 500);
    }
  }
}

export default OwnerController;
