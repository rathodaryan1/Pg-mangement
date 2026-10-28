import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { StorageService, LOCAL_UPLOADS_DIR } from '../utils/supabase';

const isProd = process.env.NODE_ENV === 'production';
const isDemoMode = process.env.DEMO_MODE === 'true';

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw new Error('Database operation failed after retries');
}

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

      // Batch 1: Property structure & physical capacity (Bounded concurrency: 4 queries)
      const [properties, totalBuildings, rooms, beds] = await Promise.all([
        withDbRetry(() =>
          prisma.property.findMany({
            where: propertyId ? { id: propertyId } : tenantFilter,
            include: { buildings: true, rooms: { include: { beds: true } }, residents: true },
          })
        ),
        withDbRetry(() =>
          prisma.building.count({ where: propertyFilter })
        ),
        withDbRetry(() =>
          prisma.room.findMany({ where: propertyFilter, include: { beds: true } })
        ),
        withDbRetry(() =>
          prisma.bed.findMany({
            where: propertyId
              ? { room: { propertyId } }
              : (req.user?.tenantId ? { room: { property: { tenantId: req.user.tenantId } } } : {}),
          })
        ),
      ]);

      // Batch 2: Residents, Financials & Staff (Bounded concurrency: 4 queries, optimized field selection)
      const [residents, payments, deposits, staffMembers] = await Promise.all([
        withDbRetry(() =>
          prisma.resident.findMany({
            where: propertyFilter,
            include: { bed: { include: { room: true } } },
          })
        ),
        withDbRetry(() =>
          prisma.payment.findMany({
            where: propertyFilter,
            select: {
              id: true,
              amount: true,
              status: true,
              paidDate: true,
              dueDate: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        ),
        withDbRetry(() =>
          prisma.securityDeposit.findMany({
            where: propertyFilter,
            select: { id: true, amount: true, status: true },
          })
        ),
        withDbRetry(() =>
          prisma.user.findMany({
            where: {
              role: { in: ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE'] },
              ...(req.user?.tenantId ? { tenantId: req.user.tenantId } : {}),
            },
            select: { id: true },
          })
        ),
      ]);

      // Batch 3: Operational tickets, visitors, inventory & notices (Bounded concurrency: 5 queries)
      const [complaints, visitors, inventoryItems, recentNotices, tasks] = await Promise.all([
        withDbRetry(() =>
          prisma.complaint.findMany({
            where: propertyFilter,
            select: { id: true, status: true },
            orderBy: { createdAt: 'desc' },
          })
        ),
        withDbRetry(() =>
          prisma.visitorRequest.findMany({
            where: propertyFilter,
            select: { id: true, status: true, visitDate: true },
            orderBy: { createdAt: 'desc' },
          })
        ),
        withDbRetry(() =>
          prisma.inventoryItem.findMany({
            where: propertyFilter,
            select: { id: true, quantity: true, minQuantity: true },
          })
        ),
        withDbRetry(() =>
          prisma.notice.findMany({ where: propertyFilter, orderBy: { publishedAt: 'desc' }, take: 5 })
        ),
        withDbRetry(() =>
          prisma.operationalTask.findMany({ where: propertyFilter, take: 5 })
        ),
      ]);

      const totalBedsCount = beds.length;
      const occupiedBedsCount = beds.filter((b) => b.status === 'OCCUPIED').length;
      const availableBedsCount = beds.filter((b) => b.status === 'AVAILABLE').length;
      const occupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;
      const paidPayments = payments.filter((p) => p.status === 'PAID');
      const pendingPayments = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
      const overduePayments = payments.filter((p) => p.status === 'OVERDUE');

      // Dynamic 6-month Revenue and Occupancy Trends from DB
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentNow = new Date();
      const revenueTrend = [];
      const occupancyTrend = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentNow.getFullYear(), currentNow.getMonth() - i, 1);
        const y = d.getFullYear();
        const mIdx = d.getMonth();
        const mLabel = monthNames[mIdx];
        const nextMonth = new Date(y, mIdx + 1, 1);

        const mPaid = paidPayments.filter((p) => {
          const dt = p.paidDate || p.createdAt;
          return dt >= d && dt < nextMonth;
        });
        const mBilled = payments.filter((p) => {
          const dt = p.dueDate || p.createdAt;
          return dt >= d && dt < nextMonth;
        });

        const collected = mPaid.reduce((acc, p) => acc + p.amount, 0);
        const billed = mBilled.reduce((acc, p) => acc + p.amount, 0);

        revenueTrend.push({
          month: mLabel,
          revenue: billed > 0 ? billed : collected,
          collected,
        });

        occupancyTrend.push({
          month: mLabel,
          occupancy: occupancyRate,
        });
      }

      return sendSuccess(res, {
        kpis: {
          totalProperties: properties.length,
          totalBuildings,
          totalRooms: rooms.length,
          totalBeds: totalBedsCount,
          occupiedBeds: occupiedBedsCount,
          availableBeds: availableBedsCount,
          vacantBeds: availableBedsCount,
          occupancyRate,
          occupancyPercentage: occupancyRate,
          totalOccupancyPercentage: occupancyRate,
          monthlyRevenue: paidPayments.reduce((acc, p) => acc + p.amount, 0),
          totalRevenueCollected: paidPayments.reduce((acc, p) => acc + p.amount, 0),
          pendingCollections: pendingPayments.reduce((acc, p) => acc + p.amount, 0),
          outstandingRent: pendingPayments.reduce((acc, p) => acc + p.amount, 0),
          totalOutstandingRent: pendingPayments.reduce((acc, p) => acc + p.amount, 0),
          overdueRentAmount: overduePayments.reduce((acc, p) => acc + p.amount, 0),
          totalSecurityDeposits: deposits.reduce((acc, d) => acc + (d.status === 'PAID' ? d.amount : 0), 0),
          totalDeposits: deposits.reduce((acc, d) => acc + (d.status === 'PAID' ? d.amount : 0), 0),
          activeResidentsCount: residents.filter((r) => r.status === 'ACTIVE').length,
          activeResidents: residents.filter((r) => r.status === 'ACTIVE').length,
          openComplaintsCount: complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
          openComplaints: complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
          pendingVisitorsCount: visitors.filter((v) => v.status === 'PENDING').length,
          pendingVisitors: visitors.filter((v) => v.status === 'PENDING').length,
          todayVisitorsCount: visitors.filter((v) => new Date(v.visitDate).toDateString() === new Date().toDateString()).length,
          staffCount: staffMembers.length,
          totalStaffCount: staffMembers.length,
          lowStockAlertsCount: inventoryItems.filter((i) => i.quantity <= i.minQuantity).length,
          lowInventoryAlerts: inventoryItems.filter((i) => i.quantity <= i.minQuantity).length,
        },
        revenueTrend,
        occupancyTrend,
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
      const target = await prisma.property.findUnique({ where: { id: req.params.id } });
      if (!target) return sendError(res, 'Property not found', 404);
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId && target.tenantId !== req.user.tenantId) {
        return sendError(res, 'Access forbidden: Cannot update property belonging to another organization', 403, 'FORBIDDEN');
      }

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

  // Typo tolerance alias for updateProperty
  static updatePropertTables = (req: AuthRequest, res: Response) => OwnerController.updateProperty(req, res);

  static async archiveProperty(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const property = await prisma.property.findUnique({ where: { id: req.params.id } });
      if (!property) return sendError(res, 'Property not found', 404);
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId && property.tenantId !== req.user.tenantId) {
        return sendError(res, 'Access forbidden: Cannot delete property belonging to another organization', 403, 'FORBIDDEN');
      }

      // Check for active residents
      const activeResidents = await prisma.resident.count({
        where: { propertyId: property.id, status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] } },
      });
      if (activeResidents > 0) {
        return sendError(res, 'Cannot delete property with active residents. Please reallocate or complete move-outs first.', 400);
      }

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

      // Verify uniqueness of room number within property
      const existing = await prisma.room.findUnique({
        where: {
          number_propertyId: {
            number: String(number).trim(),
            propertyId: propId,
          },
        },
      });
      if (existing) {
        return sendError(res, `Room number "${number}" already exists in this property`, 400);
      }

      if (floorId) {
        const floor = await prisma.floor.findUnique({
          where: { id: floorId },
          include: { building: true },
        });
        if (!floor) return sendError(res, 'Specified floor does not exist', 404);
        if (floor.building.propertyId !== propId) {
          return sendError(res, 'Specified floor belongs to a different property', 400);
        }
      }

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
      // Check for active residents in this room before deletion
      const activeResidentsInRoom = await prisma.resident.count({
        where: {
          bed: { roomId: req.params.id },
          status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
        },
      });
      if (activeResidentsInRoom > 0) {
        return sendError(res, 'Cannot delete or archive room containing active residents. Please reallocate or move-out residents first.', 400);
      }

      await prisma.room.delete({ where: { id: req.params.id } });
      return sendSuccess(res, null, 'Room archived successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete room', 500);
    }
  }

  static async updateBedStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { status, monthlyRent } = req.body;
      const bedId = req.params.bedId || req.params.id;

      if (!bedId) {
        return sendError(res, 'Bed ID is required', 400);
      }

      if (status === 'AVAILABLE') {
        const bed = await prisma.bed.findUnique({
          where: { id: bedId },
          include: { resident: true },
        });
        if (bed?.resident && (bed.resident.status === 'ACTIVE' || bed.resident.status === 'NOTICE_PERIOD')) {
          return sendError(res, 'Cannot mark bed as AVAILABLE while an active resident is allocated. Please process a move-out or deallocate first.', 400);
        }
      }

      const updated = await prisma.bed.update({
        where: { id: bedId },
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

  static async deallocateBed(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const bedId = req.params.bedId || req.params.id;
      const { moveOut = true, deductions, deductionNotes, refundAmount, remarks } = req.body;

      if (!bedId) {
        return sendError(res, 'Bed ID is required', 400);
      }

      const bed = await prisma.bed.findUnique({
        where: { id: bedId },
        include: {
          resident: true,
          room: { include: { floor: { include: { building: true } } } },
        },
      });

      if (!bed) {
        return sendError(res, 'Bed not found', 404);
      }

      const resident = bed.resident || (await prisma.resident.findFirst({ where: { bedId } }));

      const result = await prisma.$transaction(async (tx) => {
        // 1. Release Bed back to AVAILABLE
        const updatedBed = await tx.bed.update({
          where: { id: bedId },
          data: { status: 'AVAILABLE' },
          include: { room: true },
        });

        // 2. Unassign or Move-Out the Resident
        let updatedResident = null;
        if (resident) {
          if (moveOut) {
            // Full move-out
            updatedResident = await tx.resident.update({
              where: { id: resident.id },
              data: {
                status: 'MOVED_OUT',
                bedId: null,
                expectedMoveOutDate: new Date(),
              },
            });

            // Settle security deposit if existing and not refunded
            const existingDeposit = await tx.securityDeposit.findFirst({
              where: { residentId: resident.id },
            });
            if (existingDeposit && existingDeposit.status !== 'REFUNDED') {
              const ded = deductions !== undefined ? parseFloat(deductions) : 0;
              const ref = refundAmount !== undefined ? parseFloat(refundAmount) : Math.max(0, existingDeposit.amount - ded);
              await tx.securityDeposit.update({
                where: { id: existingDeposit.id },
                data: {
                  status: 'REFUNDED',
                  deductions: ded,
                  refundAmount: ref,
                  notes: deductionNotes || remarks || 'Vacated from room bed allocation',
                },
              });
            }
          } else {
            // Unassign bed only, keep resident active
            updatedResident = await tx.resident.update({
              where: { id: resident.id },
              data: {
                bedId: null,
              },
            });
          }
        }

        return { bed: updatedBed, resident: updatedResident };
      }, { maxWait: 15000, timeout: 30000 });

      // Audit log
      const propId = bed.room?.propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      await AuditService.log({
        propertyId: propId,
        actorId: req.user?.id,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: moveOut ? 'RESIDENT_MOVE_OUT' : 'BED_DEALLOCATED',
        entity: 'Bed',
        entityId: bedId,
        ipAddress: req.ip,
        details: `${moveOut ? 'Vacated' : 'Unassigned'} bed ${bed.bedNumber} (Resident: ${resident?.fullName || 'N/A'})${remarks ? ` - ${remarks}` : ''}`,
      }).catch(() => {});

      return sendSuccess(
        res,
        result,
        moveOut
          ? `Resident ${resident?.fullName || ''} moved out and bed freed successfully`
          : `Bed ${bed.bedNumber} unassigned successfully`
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to deallocate bed', 500);
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

      // Check if bed is already occupied or under maintenance
      if (bedId) {
        const bed = await prisma.bed.findUnique({
          where: { id: bedId },
          include: { room: true },
        });
        if (!bed) {
          return sendError(res, 'Specified bed does not exist', 404);
        }
        if (bed.status === 'OCCUPIED') {
          return sendError(res, 'Selected bed is already occupied. Please select an available bed.', 400);
        }
        if (bed.status === 'MAINTENANCE') {
          return sendError(res, 'Selected bed is currently under maintenance.', 400);
        }
      }

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
              tenantId: req.user?.tenantId || null,
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

      return sendSuccess(res, {
        ...result,
        resident: result,
      }, 'Resident onboarded successfully', 201);
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

      const updatedResident = await prisma.$transaction(async (tx) => {
        // 1. Release Bed
        if (resident.bedId) {
          await tx.bed.update({
            where: { id: resident.bedId },
            data: { status: 'AVAILABLE' },
          });
        }

        // 2. Mark Resident as MOVED_OUT
        const updated = await tx.resident.update({
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

        return updated;
      }, { maxWait: 15000, timeout: 30000 });

      return sendSuccess(res, {
        ...updatedResident,
        status: 'MOVED_OUT',
      }, 'Resident move-out completed and bed released.');
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
      const { amount, paymentMethod, method, transactionId, note, notes } = req.body;
      const paymentId = req.body.paymentId || req.params?.id;
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

        return {
          ...updated,
          receiptNumber: receipt.receiptNumber,
          payment: updated,
          receipt,
        };
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
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const deposits = await prisma.securityDeposit.findMany({
        where: propertyFilter,
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
      const resident = await prisma.resident.findUnique({
        where: { id: residentId },
        include: { property: true },
      });
      if (!resident) return sendError(res, 'Resident not found', 404);

      if (req.user?.tenantId && resident.property.tenantId !== req.user.tenantId) {
        return sendError(res, 'Unauthorized access to resident of another organization', 403);
      }
      if (req.user?.propertyId && resident.propertyId !== req.user.propertyId) {
        return sendError(res, 'Unauthorized access to resident of another property', 403);
      }

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
      const deposit = await prisma.securityDeposit.findUnique({
        where: { id: req.params.id },
        include: { property: true },
      });
      if (!deposit) return sendError(res, 'Deposit record not found', 404);

      // Strict tenant & property isolation check
      if (req.user?.tenantId && deposit.property.tenantId !== req.user.tenantId) {
        return sendError(res, 'Unauthorized access to deposit of another organization', 403);
      }
      if (req.user?.propertyId && deposit.propertyId !== req.user.propertyId) {
        return sendError(res, 'Unauthorized access to deposit of another property', 403);
      }

      const ded = deductions !== undefined ? parseFloat(deductions) : 0;
      const ref = refundAmount !== undefined ? parseFloat(refundAmount) : Math.max(0, deposit.amount - ded);

      const updated = await prisma.securityDeposit.update({
        where: { id: req.params.id },
        data: {
          status: 'REFUNDED',
          deductions: ded,
          refundAmount: ref,
          notes: notes || 'Deposit settlement completed',
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
      const { residentId, visitorName, visitorMobile, visitorPhone, relation, purpose, visitDate, expectedTime, propertyId } = req.body;
      const mobile = (visitorMobile || visitorPhone || '').trim();
      if (!visitorName || !mobile) {
        return sendError(res, 'Visitor name and mobile number are required', 400);
      }

      const propId = propertyId || (await OwnerController.resolvePropertyScope(req)).propertyId;
      if (!propId) return sendError(res, 'Property ID is required', 400);

      const qrPassToken = `VPASS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const created = await prisma.visitorRequest.create({
        data: {
          propertyId: propId,
          ...(residentId ? { residentId } : {}),
          visitorName: visitorName.trim(),
          visitorMobile: mobile,
          relation: relation ? relation.trim() : 'Guest',
          purpose: purpose ? purpose.trim() : 'Visit',
          visitDate: visitDate ? new Date(visitDate) : new Date(),
          expectedEntryTime: expectedTime || '04:00 PM',
          status: 'APPROVED',
          approvedBy: req.user?.name || 'Owner Desk',
          qrPassToken,
        } as any,
      });

      return sendSuccess(res, created, 'Visitor pass created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create visitor pass', 500);
    }
  }

  static async approveVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const ALLOWED_APPROVER_ROLES = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST'];
      if (req.user.role === 'RESIDENT') {
        return sendError(res, 'Access denied: Residents cannot approve visitor requests', 403);
      }
      if (!ALLOWED_APPROVER_ROLES.includes(req.user.role)) {
        return sendError(res, 'Access denied: Insufficient permissions to approve visitor requests', 403);
      }

      const visitor = await prisma.visitorRequest.findUnique({
        where: { id: req.params.id },
        include: {
          property: {
            include: { tenant: true },
          },
          resident: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              propertyId: true,
              userId: true,
            },
          },
        },
      });
      if (!visitor) return sendError(res, 'Visitor request not found', 404);

      // Resolve effective tenant safely
      let userTenantId = req.user.tenantId;
      if (!userTenantId) {
        if (req.user.propertyId) {
          const userProp = await prisma.property.findUnique({
            where: { id: req.user.propertyId },
            select: { tenantId: true },
          });
          userTenantId = userProp?.tenantId || null;
        } else if (req.user.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { tenantId: true, propertyId: true },
          });
          userTenantId = dbUser?.tenantId || null;
        }
      }

      // Cross-tenant protection
      if (req.user.role !== 'SUPER_ADMIN') {
        const isAuthorizedTenant = visitor.property?.tenantId && (
          visitor.property.tenantId === userTenantId ||
          (await prisma.tenant.count({
            where: { id: visitor.property.tenantId, users: { some: { id: req.user.id } } }
          })) > 0
        );

        if (!isAuthorizedTenant) {
          return sendError(res, 'Access denied: foreign tenant visitor request', 403);
        }

        // Property-level scoping for property-restricted managers / receptionists
        if (['MANAGER', 'RECEPTIONIST'].includes(req.user.role)) {
          let isAuthorizedForProperty = req.user.propertyId === visitor.propertyId;
          if (!isAuthorizedForProperty) {
            const authorizedProp = await prisma.property.findFirst({
              where: {
                id: visitor.propertyId,
                staff: { some: { id: req.user.id } },
              },
            });
            if (authorizedProp) isAuthorizedForProperty = true;
          }

          if (!isAuthorizedForProperty) {
            return sendError(res, 'Access denied: You are not authorized to manage visitor requests for this property', 403);
          }
        }
      }

      // State transition validation
      if (visitor.status === 'APPROVED') {
        return sendError(res, 'Visitor request has already been approved', 400);
      }
      if (['CHECKED_IN', 'CHECKED_OUT'].includes(visitor.status)) {
        return sendError(res, `Cannot approve visitor: visitor is already ${visitor.status.toLowerCase()}`, 400);
      }
      if (['CANCELLED', 'EXPIRED'].includes(visitor.status)) {
        return sendError(res, `Cannot approve a ${visitor.status.toLowerCase()} visitor request`, 400);
      }

      // Preserve / ensure valid cryptographically secure QR pass token
      const qrPassToken = visitor.qrPassToken && visitor.qrPassToken.length > 5
        ? visitor.qrPassToken
        : `VPASS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const [updated] = await prisma.$transaction([
        prisma.visitorRequest.update({
          where: { id: visitor.id },
          data: {
            status: 'APPROVED',
            approvedBy: req.user.name || req.user.email || 'Authorized Manager',
            qrPassToken,
          },
          include: {
            property: true,
            resident: {
              include: { bed: { include: { room: true } } },
            },
          },
        }),
        prisma.auditLog.create({
          data: {
            tenantId: visitor.property?.tenantId || userTenantId,
            propertyId: visitor.propertyId,
            actorId: req.user.id,
            actorName: req.user.name || req.user.email,
            actorRole: req.user.role,
            action: 'UPDATE',
            entity: 'VisitorRequest',
            entityId: visitor.id,
            details: `Approved visitor request for ${visitor.visitorName} (Pass Token: ${qrPassToken})`,
          },
        }),
      ]);

      return sendSuccess(res, updated, 'Visitor request approved');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to approve visitor', 500);
    }
  }

  static async rejectVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const ALLOWED_APPROVER_ROLES = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST'];
      if (req.user.role === 'RESIDENT') {
        return sendError(res, 'Access denied: Residents cannot reject visitor requests', 403);
      }
      if (!ALLOWED_APPROVER_ROLES.includes(req.user.role)) {
        return sendError(res, 'Access denied: Insufficient permissions to reject visitor requests', 403);
      }

      const visitor = await prisma.visitorRequest.findUnique({
        where: { id: req.params.id },
        include: {
          property: {
            include: { tenant: true },
          },
          resident: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              propertyId: true,
              userId: true,
            },
          },
        },
      });
      if (!visitor) return sendError(res, 'Visitor request not found', 404);

      // Resolve effective tenant safely
      let userTenantId = req.user.tenantId;
      if (!userTenantId) {
        if (req.user.propertyId) {
          const userProp = await prisma.property.findUnique({
            where: { id: req.user.propertyId },
            select: { tenantId: true },
          });
          userTenantId = userProp?.tenantId || null;
        } else if (req.user.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { tenantId: true, propertyId: true },
          });
          userTenantId = dbUser?.tenantId || null;
        }
      }

      // Cross-tenant protection
      if (req.user.role !== 'SUPER_ADMIN') {
        const isAuthorizedTenant = visitor.property?.tenantId && (
          visitor.property.tenantId === userTenantId ||
          (await prisma.tenant.count({
            where: { id: visitor.property.tenantId, users: { some: { id: req.user.id } } }
          })) > 0
        );

        if (!isAuthorizedTenant) {
          return sendError(res, 'Access denied: foreign tenant visitor request', 403);
        }

        // Property-level scoping for property-restricted managers / receptionists
        if (['MANAGER', 'RECEPTIONIST'].includes(req.user.role)) {
          let isAuthorizedForProperty = req.user.propertyId === visitor.propertyId;
          if (!isAuthorizedForProperty) {
            const authorizedProp = await prisma.property.findFirst({
              where: {
                id: visitor.propertyId,
                staff: { some: { id: req.user.id } },
              },
            });
            if (authorizedProp) isAuthorizedForProperty = true;
          }

          if (!isAuthorizedForProperty) {
            return sendError(res, 'Access denied: You are not authorized to manage visitor requests for this property', 403);
          }
        }
      }

      // State transition validation
      if (visitor.status === 'REJECTED') {
        return sendError(res, 'Visitor request has already been rejected', 400);
      }
      if (['CHECKED_IN', 'CHECKED_OUT'].includes(visitor.status)) {
        return sendError(res, `Cannot reject visitor: visitor is already ${visitor.status.toLowerCase()}`, 400);
      }
      if (['CANCELLED'].includes(visitor.status)) {
        return sendError(res, `Cannot reject a cancelled visitor request`, 400);
      }

      const [updated] = await prisma.$transaction([
        prisma.visitorRequest.update({
          where: { id: visitor.id },
          data: {
            status: 'REJECTED',
            approvedBy: `${req.user.name || req.user.email} (Rejected)`,
          },
          include: {
            property: true,
            resident: {
              include: { bed: { include: { room: true } } },
            },
          },
        }),
        prisma.auditLog.create({
          data: {
            tenantId: visitor.property?.tenantId || userTenantId,
            propertyId: visitor.propertyId,
            actorId: req.user.id,
            actorName: req.user.name || req.user.email,
            actorRole: req.user.role,
            action: 'UPDATE',
            entity: 'VisitorRequest',
            entityId: visitor.id,
            details: `Rejected visitor request for ${visitor.visitorName}`,
          },
        }),
      ]);

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
    // Cryptographically secure lookup strictly by qrPassToken (prevent database ID enumeration)
    const visitor = await prisma.visitorRequest.findFirst({
      where: { qrPassToken: token },
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

  static async gateCheckIn(req: Request, res: Response): Promise<Response> {
    try {
      const rawToken = req.params?.token;
      if (!rawToken) return sendError(res, 'Pass token is required for gate check-in', 400);

      const token = decodeURIComponent(rawToken).trim();
      const visitor = await prisma.visitorRequest.findFirst({
        where: { qrPassToken: token },
        include: { property: true, resident: true },
      });

      if (!visitor) {
        return sendError(res, 'Visitor pass not found or invalid token', 404);
      }

      // State machine validation
      if (visitor.status === 'CHECKED_IN') {
        return sendError(res, 'Visitor is already checked in.', 400, 'ALREADY_CHECKED_IN');
      }
      if (visitor.status === 'CHECKED_OUT') {
        return sendError(res, 'Visitor pass has already been used and checked out.', 400, 'ALREADY_CHECKED_OUT');
      }
      if (visitor.status === 'REJECTED') {
        return sendError(res, 'Visitor pass was rejected by property administration.', 400, 'PASS_REJECTED');
      }
      if (visitor.status === 'CANCELLED') {
        return sendError(res, 'Visitor pass was cancelled.', 400, 'PASS_CANCELLED');
      }
      if (visitor.status !== 'APPROVED') {
        return sendError(res, `Visitor pass is currently in ${visitor.status} status and cannot be checked in.`, 400, 'NOT_APPROVED');
      }

      // Atomic state transition
      const updated = await prisma.$transaction(async (tx) => {
        const locked = await tx.visitorRequest.findUnique({ where: { id: visitor.id } });
        if (!locked || locked.status !== 'APPROVED') {
          throw new Error('Visitor pass is no longer in APPROVED status');
        }

        return tx.visitorRequest.update({
          where: { id: visitor.id },
          data: {
            status: 'CHECKED_IN',
            checkInTime: new Date(),
          },
          include: {
            property: true,
            resident: { include: { bed: { include: { room: true } } } },
          },
        });
      }, { maxWait: 15000, timeout: 30000 });

      await AuditService.log({
        propertyId: visitor.propertyId,
        actorId: visitor.resident?.userId || null,
        actorName: visitor.visitorName,
        actorRole: 'SYSTEM',
        action: 'VISITOR_CHECKED_IN',
        entity: 'VisitorRequest',
        entityId: visitor.id,
        ipAddress: req.ip,
        details: `Visitor ${visitor.visitorName} checked in at security gate via QR token.`,
      });

      return sendSuccess(res, updated, 'Visitor successfully checked in at gate.');
    } catch (error: any) {
      console.error('[Gate Check-In Error]:', error);
      return sendError(res, error.message || 'Failed to check in visitor', 500);
    }
  }

  static async gateCheckOut(req: Request, res: Response): Promise<Response> {
    try {
      const rawToken = req.params?.token;
      if (!rawToken) return sendError(res, 'Pass token is required for gate check-out', 400);

      const token = decodeURIComponent(rawToken).trim();
      const visitor = await prisma.visitorRequest.findFirst({
        where: { qrPassToken: token },
        include: { property: true, resident: true },
      });

      if (!visitor) {
        return sendError(res, 'Visitor pass not found or invalid token', 404);
      }

      // State machine validation
      if (visitor.status === 'CHECKED_OUT') {
        return sendError(res, 'Visitor has already checked out.', 400, 'ALREADY_CHECKED_OUT');
      }
      if (visitor.status === 'APPROVED') {
        return sendError(res, 'Visitor has not checked in yet.', 400, 'NOT_CHECKED_IN');
      }
      if (visitor.status !== 'CHECKED_IN') {
        return sendError(res, `Cannot check out visitor in ${visitor.status} status.`, 400, 'INVALID_STATUS');
      }

      // Atomic state transition
      const updated = await prisma.$transaction(async (tx) => {
        const locked = await tx.visitorRequest.findUnique({ where: { id: visitor.id } });
        if (!locked || locked.status !== 'CHECKED_IN') {
          throw new Error('Visitor is not in CHECKED_IN status');
        }

        return tx.visitorRequest.update({
          where: { id: visitor.id },
          data: {
            status: 'CHECKED_OUT',
            checkOutTime: new Date(),
          },
          include: {
            property: true,
            resident: { include: { bed: { include: { room: true } } } },
          },
        });
      }, { maxWait: 15000, timeout: 30000 });

      await AuditService.log({
        propertyId: visitor.propertyId,
        actorId: visitor.resident?.userId || null,
        actorName: visitor.visitorName,
        actorRole: 'SYSTEM',
        action: 'VISITOR_CHECKED_OUT',
        entity: 'VisitorRequest',
        entityId: visitor.id,
        ipAddress: req.ip,
        details: `Visitor ${visitor.visitorName} checked out at security gate via QR token.`,
      });

      return sendSuccess(res, updated, 'Visitor successfully checked out at gate.');
    } catch (error: any) {
      console.error('[Gate Check-Out Error]:', error);
      return sendError(res, error.message || 'Failed to check out visitor', 500);
    }
  }

  static async checkInVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const visitor = await prisma.visitorRequest.findUnique({ where: { id: req.params.id } });
      if (!visitor) return sendError(res, 'Visitor pass not found', 404);

      if (visitor.status === 'CHECKED_IN') return sendError(res, 'Visitor is already checked in', 400);
      if (visitor.status === 'CHECKED_OUT') return sendError(res, 'Visitor has already checked out', 400);
      if (visitor.status !== 'APPROVED') return sendError(res, `Visitor pass is not approved (Status: ${visitor.status})`, 400);

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
      const visitor = await prisma.visitorRequest.findUnique({ where: { id: req.params.id } });
      if (!visitor) return sendError(res, 'Visitor pass not found', 404);

      if (visitor.status === 'CHECKED_OUT') return sendError(res, 'Visitor has already checked out', 400);
      if (visitor.status !== 'CHECKED_IN') return sendError(res, `Visitor has not checked in (Status: ${visitor.status})`, 400);

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
      }, { maxWait: 15000, timeout: 30000 });

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
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const staffRoles = [
        'MANAGER',
        'MAINTENANCE',
        'SECURITY_GUARD',
        'HOUSEKEEPING',
        'COOK',
        'RECEPTIONIST',
        'ACCOUNTANT',
      ];

      const whereClause: any = {
        role: { in: staffRoles },
      };

      if (req.user?.role !== 'SUPER_ADMIN') {
        if (req.user?.tenantId) {
          whereClause.tenantId = req.user.tenantId;
        } else if (propertyFilter.propertyId) {
          whereClause.propertyId = propertyFilter.propertyId;
        }
      } else if (propertyFilter.propertyId) {
        whereClause.propertyId = propertyFilter.propertyId;
      }

      const staff = await prisma.user.findMany({
        where: whereClause,
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

      const validRoles = [
        'MANAGER',
        'MAINTENANCE',
        'SECURITY_GUARD',
        'HOUSEKEEPING',
        'COOK',
        'RECEPTIONIST',
        'ACCOUNTANT',
      ];

      // Normalize legacy/alias roles
      let normalizedRole = role;
      if (role === 'SECURITY') normalizedRole = 'SECURITY_GUARD';

      if (!validRoles.includes(normalizedRole)) {
        return sendError(
          res,
          `Invalid staff role "${role}". Supported roles: ${validRoles.join(', ')}`,
          400,
          'INVALID_ROLE'
        );
      }

      const { propertyId: resolvedPropertyId } = await OwnerController.resolvePropertyScope(req, propertyId);

      const cleanEmail = email ? email.toLowerCase().trim() : `staff_${Date.now()}@pg.com`;

      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        return sendError(res, 'A user account with this email already exists.', 409, 'DUPLICATE_EMAIL');
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);

      const user = await prisma.user.create({
        data: {
          tenantId: req.user?.tenantId || null,
          propertyId: resolvedPropertyId || null,
          name: name.trim(),
          email: cleanEmail,
          passwordHash,
          role: normalizedRole as any,
          mobile: mobile ? mobile.trim() : null,
        },
        include: { property: true },
      });

      return sendSuccess(res, user, 'Staff member created successfully.', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create staff', 500);
    }
  }

  static async updateStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const staffUser = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!staffUser) return sendError(res, 'Staff member not found', 404);

      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId && staffUser.tenantId !== req.user.tenantId) {
        return sendError(res, 'Access denied: staff member belongs to another tenant', 403);
      }

      const { name, mobile, role, propertyId } = req.body;

      let normalizedRole = role;
      if (role === 'SECURITY') normalizedRole = 'SECURITY_GUARD';

      if (normalizedRole) {
        const validRoles = [
          'MANAGER',
          'MAINTENANCE',
          'SECURITY_GUARD',
          'HOUSEKEEPING',
          'COOK',
          'RECEPTIONIST',
          'ACCOUNTANT',
        ];
        if (!validRoles.includes(normalizedRole)) {
          return sendError(res, `Invalid staff role "${role}".`, 400);
        }
      }

      let targetPropId = propertyId;
      if (propertyId) {
        const { propertyId: resolvedPropertyId } = await OwnerController.resolvePropertyScope(req, propertyId);
        targetPropId = resolvedPropertyId;
      }

      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name: name.trim() }),
          ...(mobile !== undefined && { mobile: mobile ? mobile.trim() : null }),
          ...(normalizedRole && { role: normalizedRole as any }),
          ...(targetPropId !== undefined && { propertyId: targetPropId }),
        },
        include: { property: true },
      });
      return sendSuccess(res, updated, 'Staff updated');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update staff', 500);
    }
  }

  static async archiveStaff(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const staffUser = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!staffUser) return sendError(res, 'Staff member not found', 404);

      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId && staffUser.tenantId !== req.user.tenantId) {
        return sendError(res, 'Access denied: staff member belongs to another tenant', 403);
      }

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

  static async downloadDocument(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const doc = await prisma.document.findFirst({
        where: { id: req.params.id, ...propertyFilter },
      });

      if (!doc) return sendError(res, 'Document not found or access denied', 404);

      const downloadUrl = await StorageService.getSignedUrl(doc.fileUrl, 3600);
      return sendSuccess(res, {
        downloadUrl,
        title: doc.title,
        mimeType: doc.mimeType,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve download link', 500);
    }
  }

  static async streamDocumentFile(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { propertyFilter } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const doc = await prisma.document.findFirst({
        where: { id: req.params.id, ...propertyFilter },
      });

      if (!doc) return sendError(res, 'Document not found or access denied', 404);

      // If Supabase / cloud URL, redirect to signed URL
      if (!doc.fileUrl.startsWith('/uploads/')) {
        const signedUrl = await StorageService.getSignedUrl(doc.fileUrl, 300);
        if (signedUrl && (signedUrl.startsWith('http://') || signedUrl.startsWith('https://'))) {
          return res.redirect(signedUrl);
        }
      }

      // If local uploads file
      const fileName = path.basename(doc.fileUrl);
      const filePath = path.join(LOCAL_UPLOADS_DIR, fileName);

      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.title)}"`);
        return fs.createReadStream(filePath).pipe(res);
      }

      return sendError(res, 'Physical document file not found', 404);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to stream document', 500);
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

      const paidPayments = payments.filter((p) => p.status === 'PAID');
      const pendingPayments = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
      const totalCollected = paidPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalOutstanding = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalRevenue = totalCollected;
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalRevenue - totalExpenses;
      const totalBeds = beds.length;
      const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;
      const availableBeds = beds.filter((b) => b.status === 'AVAILABLE').length;
      const maintenanceBeds = beds.filter((b) => b.status === 'MAINTENANCE').length;
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      // Group real expenses by category
      const expenseCategoryMap: Record<string, number> = {};
      expenses.forEach((e) => {
        const cat = e.category || 'OTHER';
        expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + e.amount;
      });
      const expenseCategories = Object.entries(expenseCategoryMap).map(([category, amount]) => ({
        category,
        amount,
      }));

      // Group real monthly revenue & expenses for the last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const revenueByMonth = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const mIdx = d.getMonth();
        const mLabel = `${months[mIdx]} ${y}`;
        const nextMonth = new Date(y, mIdx + 1, 1);

        const mPaid = paidPayments.filter((p) => {
          const dt = p.paidDate || p.createdAt;
          return dt >= d && dt < nextMonth;
        });
        const mExpenses = expenses.filter((e) => {
          const dt = e.date || e.createdAt;
          return dt >= d && dt < nextMonth;
        });

        const rev = mPaid.reduce((acc, p) => acc + p.amount, 0);
        const exp = mExpenses.reduce((acc, e) => acc + e.amount, 0);

        revenueByMonth.push({
          month: mLabel,
          revenue: rev,
          expenses: exp,
          net: rev - exp,
        });
      }

      // 1. Profitability & Unit Economics
      const revPAB = totalBeds > 0 ? Math.round(totalCollected / totalBeds) : 0;
      const avgRentPerBed = occupiedBeds > 0 ? Math.round(totalCollected / occupiedBeds) : 0;
      const totalBilled = totalCollected + totalOutstanding;
      const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

      // 2. Outstanding Rent Aging Analysis
      const aging = {
        current: { count: 0, amount: 0 },
        days1To30: { count: 0, amount: 0 },
        days31To60: { count: 0, amount: 0 },
        days61To90: { count: 0, amount: 0 },
        daysOver90: { count: 0, amount: 0 },
      };

      const todayMs = Date.now();
      pendingPayments.forEach((p) => {
        const dueDateMs = p.dueDate ? new Date(p.dueDate).getTime() : new Date(p.createdAt).getTime();
        const diffDays = Math.floor((todayMs - dueDateMs) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          aging.current.count++;
          aging.current.amount += p.amount;
        } else if (diffDays <= 30) {
          aging.days1To30.count++;
          aging.days1To30.amount += p.amount;
        } else if (diffDays <= 60) {
          aging.days31To60.count++;
          aging.days31To60.amount += p.amount;
        } else if (diffDays <= 90) {
          aging.days61To90.count++;
          aging.days61To90.amount += p.amount;
        } else {
          aging.daysOver90.count++;
          aging.daysOver90.amount += p.amount;
        }
      });

      // 3. Budget vs Actual OPEX (Target budget benchmark: 35% of total potential revenue)
      const potentialMonthlyRev = beds.reduce((sum, b) => sum + (b.monthlyRent || 8500), 0);
      const budgetedOPEX = Math.round(potentialMonthlyRev * 0.35);
      const opexVariance = budgetedOPEX - totalExpenses; // Positive = Under budget, Negative = Over budget

      // 4. Cash Flow Summary
      const cashFlow = {
        operatingInflow: totalCollected,
        operatingOutflow: totalExpenses,
        netCashFlow: totalCollected - totalExpenses,
        openingBalanceEstimate: Math.max(0, totalCollected * 0.2), // [ESTIMATE]
      };

      // 5. Tenant-Scoped AI Recommendations & Intelligence Feed
      const aiInsights = [
        {
          type: 'ACTUAL',
          label: '[ACTUAL] Collection Efficiency',
          message: `Realized collection efficiency is ${collectionRate}%. Total outstanding is ₹${totalOutstanding.toLocaleString('en-IN')}.`,
          status: collectionRate >= 90 ? 'OPTIMAL' : 'ATTENTION',
        },
        {
          type: 'ACTUAL',
          label: '[ACTUAL] Bed Yield & Unit Economics',
          message: `RevPAB (Revenue Per Available Bed) is ₹${revPAB.toLocaleString('en-IN')}/mo with an average realized rent of ₹${avgRentPerBed.toLocaleString('en-IN')}/mo across ${occupiedBeds} occupied beds.`,
          status: 'INFO',
        },
        {
          type: 'ESTIMATE',
          label: '[ESTIMATE] Budget vs. Operating Expense Variance',
          message: opexVariance >= 0
            ? `Operating expenditure is within benchmark budget by ₹${Math.abs(opexVariance).toLocaleString('en-IN')} (Target: ₹${budgetedOPEX.toLocaleString('en-IN')}, Actual: ₹${totalExpenses.toLocaleString('en-IN')}).`
            : `Operating expenditure exceeds benchmark budget by ₹${Math.abs(opexVariance).toLocaleString('en-IN')} (Target: ₹${budgetedOPEX.toLocaleString('en-IN')}, Actual: ₹${totalExpenses.toLocaleString('en-IN')}).`,
          status: opexVariance >= 0 ? 'OPTIMAL' : 'WARNING',
        },
        {
          type: 'FORECAST',
          label: '[FORECAST] Projected Occupancy & Revenue Potential',
          message: `At full 100% occupancy (${totalBeds} beds), projected monthly revenue potential is ₹${potentialMonthlyRev.toLocaleString('en-IN')}, representing an upside of ₹${Math.max(0, potentialMonthlyRev - totalCollected).toLocaleString('en-IN')}.`,
          status: 'FORECAST',
        },
      ];

      return sendSuccess(res, {
        summary: {
          totalRevenue,
          totalCollected,
          totalOutstanding,
          totalExpenses,
          netProfit,
          totalBeds,
          occupiedBeds,
          availableBeds,
          maintenanceBeds,
          occupancyRate,
          revPAB,
          avgRentPerBed,
          collectionRate,
          budgetedOPEX,
          opexVariance,
          totalResidents: residents.filter((r) => r.status === 'ACTIVE').length,
        },
        monthlyBreakdown: revenueByMonth,
        revenueByMonth,
        expenseCategories,
        aging,
        cashFlow,
        aiInsights,
        paymentsList: payments,
        expensesList: expenses,
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
        razorpayKeyId: property?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '',
        hasRazorpaySecret: Boolean(property?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET),
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
          razorpayKeyId: property.razorpayKeyId,
        } : null,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch settings', 500);
    }
  }

  static async updateSettings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        rentDueDay,
        lateFeePerDay,
        noticePeriodDays,
        visitorCutoffTime,
        upiId,
        gstNumber,
        propertyPhone,
        propertyEmail,
        propertyId,
        razorpayKeyId,
        razorpayKeySecret,
      } = req.body;

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
            ...(razorpayKeyId !== undefined && { razorpayKeyId: razorpayKeyId ? razorpayKeyId.trim() : null }),
            ...(razorpayKeySecret && { razorpayKeySecret: razorpayKeySecret.trim() }),
          },
        });
      }

      return sendSuccess(res, null, 'Settings saved successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to save settings', 500);
    }
  }

  // ==========================================================================
  // 19. WORKFORCE MANAGEMENT (ATTENDANCE, ADVANCES, PAYROLL)
  // ==========================================================================
  static async getStaffAttendance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const targetPropertyId = propertyId || req.user?.propertyId;
      if (!targetPropertyId) return sendError(res, 'Property ID required.', 400);

      const records = await prisma.staffAttendance.findMany({
        where: { propertyId: targetPropertyId },
        include: { user: { select: { id: true, name: true, role: true, mobile: true } } },
        orderBy: { date: 'desc' },
        take: 100,
      });

      return sendSuccess(res, records);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch attendance', 500);
    }
  }

  static async recordStaffAttendance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId, date, status, checkInTime, checkOutTime, notes } = req.body;
      const { propertyId } = await OwnerController.resolvePropertyScope(req, req.body.propertyId);
      const targetPropertyId = propertyId || req.user?.propertyId;

      if (!userId || !targetPropertyId) {
        return sendError(res, 'User ID and Property ID are required.', 400);
      }

      const attendanceDate = date ? new Date(date) : new Date();
      attendanceDate.setHours(0, 0, 0, 0);

      const record = await prisma.staffAttendance.upsert({
        where: {
          userId_date: {
            userId,
            date: attendanceDate,
          },
        },
        update: {
          status: status || 'PRESENT',
          checkInTime: checkInTime ? new Date(checkInTime) : undefined,
          checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
          notes,
        },
        create: {
          propertyId: targetPropertyId,
          userId,
          date: attendanceDate,
          status: status || 'PRESENT',
          checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
          checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
          notes,
        },
      });

      return sendSuccess(res, record, 'Attendance logged successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to log attendance', 500);
    }
  }

  static async getStaffAdvances(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const targetPropertyId = propertyId || req.user?.propertyId;
      if (!targetPropertyId) return sendError(res, 'Property ID required.', 400);

      const advances = await prisma.staffAdvance.findMany({
        where: { propertyId: targetPropertyId },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { disbursedAt: 'desc' },
      });

      return sendSuccess(res, advances);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch advances', 500);
    }
  }

  static async recordStaffAdvance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId, amount, reason, monthYear } = req.body;
      const { propertyId } = await OwnerController.resolvePropertyScope(req, req.body.propertyId);
      const targetPropertyId = propertyId || req.user?.propertyId;

      if (!userId || !targetPropertyId || !amount) {
        return sendError(res, 'User, Property, and Advance Amount are required.', 400);
      }

      const advance = await prisma.staffAdvance.create({
        data: {
          propertyId: targetPropertyId,
          userId,
          amount: parseFloat(amount),
          reason,
          monthYear: monthYear || new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date()),
        },
      });

      return sendSuccess(res, advance, 'Salary advance disbursed.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to disburse advance', 500);
    }
  }

  static async getPayrollSummary(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const targetPropertyId = propertyId || req.user?.propertyId;
      if (!targetPropertyId) return sendError(res, 'Property ID required.', 400);

      const staffUsers: any[] = await prisma.user.findMany({
        where: {
          propertyId: targetPropertyId,
          role: { in: ['MAINTENANCE', 'COOK', 'SECURITY_GUARD', 'HOUSEKEEPING', 'MANAGER'] as any },
        },
        include: {
          staffAttendances: {
            where: {
              date: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              },
            },
          },
          staffAdvances: {
            where: { isDeducted: false },
          },
        } as any,
      });

      const payrollSheet = staffUsers.map((staff) => {
        const baseSalary = 22000;
        const hra = Math.round(baseSalary * 0.2);
        const allowances = 1500;
        const grossSalary = baseSalary + hra + allowances;

        const totalDaysInMonth = 30;
        const presentDays = staff.staffAttendances.filter((a) => a.status === 'PRESENT').length;
        const halfDays = staff.staffAttendances.filter((a) => a.status === 'HALF_DAY').length;
        const effectiveWorkingDays = presentDays + halfDays * 0.5;

        const absentDeduction =
          staff.staffAttendances.length > 0
            ? Math.round((grossSalary / totalDaysInMonth) * Math.max(0, totalDaysInMonth - effectiveWorkingDays))
            : 0;

        const totalAdvances = staff.staffAdvances.reduce((acc, a) => acc + a.amount, 0);
        const netEstimatedPayable = Math.max(0, grossSalary - absentDeduction - totalAdvances);

        return {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          mobile: staff.mobile,
          components: {
            baseSalary,
            hra,
            allowances,
            grossSalary,
            absentDeduction,
            advancesDeducted: totalAdvances,
            netEstimatedPayable,
          },
          attendanceSummary: {
            present: presentDays,
            halfDays,
            absent: staff.staffAttendances.filter((a) => a.status === 'ABSENT').length,
            leave: staff.staffAttendances.filter((a) => a.status === 'LEAVE').length,
          },
        };
      });

      return sendSuccess(res, {
        month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date()),
        staffCount: payrollSheet.length,
        totalGrossBudget: payrollSheet.reduce((acc, s) => acc + s.components.grossSalary, 0),
        totalNetEstimatedPayout: payrollSheet.reduce((acc, s) => acc + s.components.netEstimatedPayable, 0),
        payrollSheet,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to generate payroll sheet', 500);
    }
  }

  // ==========================================================================
  // 20. STATUTORY COMPLIANCE & AGREEMENT TEMPLATES
  // ==========================================================================
  static async getComplianceRecords(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId } = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);
      const targetPropertyId = propertyId || req.user?.propertyId;
      if (!targetPropertyId) return sendError(res, 'Property ID required.', 400);

      const records = await prisma.complianceRecord.findMany({
        where: { propertyId: targetPropertyId },
        orderBy: { validTill: 'asc' },
      });

      return sendSuccess(res, records);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch compliance certificates', 500);
    }
  }

  static async createComplianceRecord(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { category, title, issuingAuthority, certificateNumber, validFrom, validTill, documentUrl, notes } = req.body;
      const { propertyId } = await OwnerController.resolvePropertyScope(req, req.body.propertyId);
      const targetPropertyId = propertyId || req.user?.propertyId;
      if (!targetPropertyId || !title || !category) {
        return sendError(res, 'Property, category, and certificate title are required.', 400);
      }

      const record = await prisma.complianceRecord.create({
        data: {
          propertyId: targetPropertyId,
          category,
          title,
          issuingAuthority: issuingAuthority || null,
          certificateNumber: certificateNumber || null,
          validFrom: validFrom ? new Date(validFrom) : null,
          validTill: validTill ? new Date(validTill) : null,
          documentUrl: documentUrl || null,
          notes: notes || null,
          status: 'ACTIVE',
        },
      });

      return sendSuccess(res, record, 'Compliance certificate registered.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to save compliance record', 500);
    }
  }

  static async getAgreementTemplates(req: AuthRequest, res: Response): Promise<Response> {
    try {
      let templates = await prisma.agreementTemplate.findMany({
        orderBy: { updatedAt: 'desc' },
      });

      if (templates.length === 0) {
        const defaultTpl = await prisma.agreementTemplate.create({
          data: {
            title: 'Standard Urban Nest Co-Living Tenancy Agreement',
            content: `# CO-LIVING RESIDENTIAL TENANCY AGREEMENT\n\nThis agreement is executed between **{{propertyName}}** (Operating under {{tenantName}}) and **{{residentName}}** (Mobile: {{residentMobile}}).\n\n### 1. Room & Bed Allocation\nThe Resident is allotted Bed **{{bedNumber}}** in Room **{{roomNumber}}** commencing on **{{moveInDate}}**.\n\n### 2. Rent & Security Deposit\n- **Monthly Rent**: ₹{{monthlyRent}} payable in advance by the 5th of each month.\n- **Security Deposit**: ₹{{depositAmount}} held refundable upon move-out settlement after adjusting dues/damages.\n\n### 3. House Rules & Regulations\n- Respect quiet hours between 10:00 PM and 6:00 AM.\n- Non-resident visitors must exit by 9:00 PM.\n- Minimum 30-day notice period required prior to vacation.\n\n**Tenant Signature**: Verified Digitally via Urban Nest System\n**Date**: {{agreementDate}}`,
            version: 1,
            isDefault: true,
          },
        });
        templates = [defaultTpl];
      }

      return sendSuccess(res, templates);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch agreement templates', 500);
    }
  }

  static async generateAgreementText(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { residentId, templateId } = req.body;
      if (!residentId) return sendError(res, 'Resident ID is required.', 400);

      const resident = await prisma.resident.findUnique({
        where: { id: residentId },
        include: {
          bed: { include: { room: true } },
          property: { include: { tenant: true } },
          securityDeposits: true,
        },
      });

      if (!resident) return sendError(res, 'Resident not found.', 404);

      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId && resident.property?.tenantId !== req.user.tenantId) {
        return sendError(res, 'Unauthorized access to resident agreement.', 403);
      }

      const template = templateId
        ? await prisma.agreementTemplate.findUnique({ where: { id: templateId } })
        : await prisma.agreementTemplate.findFirst({ where: { isDefault: true } });

      let content =
        template?.content ||
        `# CO-LIVING RESIDENTIAL TENANCY AGREEMENT\n\nExecuted for **{{residentName}}** at **{{propertyName}}**, Bed {{bedNumber}}.`;

      const depositTotal = resident.securityDeposits.reduce((acc, d) => acc + d.amount, 0);

      content = content
        .replace(/{{tenantName}}/g, resident.property?.tenant?.name || 'Urban Nest Co-Living')
        .replace(/{{propertyName}}/g, resident.property?.name || 'Urban Nest Property')
        .replace(/{{residentName}}/g, resident.fullName)
        .replace(/{{residentMobile}}/g, resident.mobile)
        .replace(/{{roomNumber}}/g, resident.bed?.room?.number || 'TBD')
        .replace(/{{bedNumber}}/g, resident.bed?.bedNumber || 'TBD')
        .replace(/{{monthlyRent}}/g, resident.bed?.monthlyRent?.toString() || '8500')
        .replace(/{{depositAmount}}/g, depositTotal.toString() || '17000')
        .replace(/{{moveInDate}}/g, new Date(resident.joiningDate).toLocaleDateString())
        .replace(/{{agreementDate}}/g, new Date().toLocaleDateString());

      return sendSuccess(res, {
        agreementNumber: `AGR-${Date.now().toString().slice(-6)}`,
        interpolatedAgreement: content,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to generate agreement', 500);
    }
  }
}

export default OwnerController;
