import { Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { verifyPropertyAccess } from '../utils/property-auth';

async function withDbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw new Error('Database operation failed after retries');
}

export class SecurityController {
  // -------------------------------------------------------------
  // 1. VISITOR DESK & GATE LOG
  // -------------------------------------------------------------
  static async getVisitorLog(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const auth = await verifyPropertyAccess(req, req.query.propertyId as string);
      if (!auth.authorized) {
        return sendError(res, auth.error || 'Access denied', auth.statusCode || 403);
      }
      const propertyId = auth.propertyId!;
      const { status, date } = req.query;

      const whereClause: any = { propertyId };

      if (status && status !== 'ALL') {
        whereClause.status = status;
      }

      if (date) {
        const d = new Date(date as string);
        d.setHours(0, 0, 0, 0);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);
        whereClause.visitDate = { gte: d, lt: nextD };
      }

      const visitors = await withDbRetry(() =>
        prisma.visitorRequest.findMany({
          where: whereClause,
          include: {
            resident: {
              select: {
                fullName: true,
                mobile: true,
                bed: {
                  select: {
                    bedNumber: true,
                    room: { select: { number: true } },
                  },
                },
              },
            },
          },
          orderBy: { visitDate: 'desc' },
          take: 50,
        })
      );

      const mapped = visitors.map((v) => ({
        id: v.id,
        visitorName: v.visitorName,
        visitorMobile: v.visitorMobile,
        relation: v.relation,
        purpose: v.purpose,
        visitDate: v.visitDate,
        expectedEntryTime: v.expectedEntryTime,
        expectedExitTime: v.expectedExitTime,
        status: v.status,
        checkInTime: v.checkInTime,
        checkOutTime: v.checkOutTime,
        qrPassToken: v.qrPassToken,
        residentName: v.resident?.fullName || 'Direct Walk-in',
        residentRoom: v.resident?.bed?.room?.number || 'N/A',
        residentBed: v.resident?.bed?.bedNumber || 'N/A',
      }));

      return sendSuccess(res, mapped);
    } catch (error: any) {
      console.error('[SecurityController.getVisitorLog] Error:', error);
      return sendError(res, error.message || 'Failed to fetch visitor log', 500);
    }
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // 2. PASS VERIFICATION & PREVIEW
  // -------------------------------------------------------------
  static async verifyPass(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const rawToken = (req.params.token || req.body.token || req.body.visitorId || req.query.token) as string;
      if (!rawToken) {
        return sendError(res, 'Pass token or Visitor ID is required.', 400);
      }

      let cleanToken = decodeURIComponent(rawToken).trim();
      if (cleanToken.includes('/gate/verify/')) {
        cleanToken = cleanToken.split('/gate/verify/').pop() || cleanToken;
      }

      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';

      // =========================================================
      // A. RESIDENT'S PERSONAL QR PASS VERIFICATION (RQRPASS-)
      // =========================================================
      if (cleanToken.startsWith('RQRPASS-')) {
        const residentId = cleanToken.replace('RQRPASS-', '').trim();

        const resident = await withDbRetry(() =>
          prisma.resident.findFirst({
            where: {
              OR: [
                { id: residentId },
                { id: { startsWith: residentId.split('-')[0] } },
              ],
            },
            include: {
              property: { select: { id: true, name: true, tenantId: true } },
              bed: {
                select: {
                  bedNumber: true,
                  room: {
                    select: {
                      number: true,
                      floor: { select: { floorNumber: true, building: { select: { name: true } } } },
                    },
                  },
                },
              },
            },
          })
        );

        if (!resident) {
          return sendSuccess(res, {
            valid: false,
            type: 'RESIDENT',
            status: 'INVALID',
            message: 'Invalid or revoked Resident QR pass.',
          });
        }

        // Cross-tenant & property scoping check
        if (!isSuperAdmin) {
          if (req.user?.tenantId && resident.property?.tenantId && resident.property.tenantId !== req.user.tenantId) {
            return sendError(res, 'Access denied: Resident belongs to a different tenant organization.', 403, 'FORBIDDEN_TENANT');
          }
          if (req.user?.propertyId && req.user.propertyId !== resident.propertyId) {
            return sendError(res, 'Access denied: Resident belongs to a different property.', 403, 'FORBIDDEN_PROPERTY');
          }
        }

        const hasActiveAllocation = resident.status === 'ACTIVE' && !!resident.bed;

        if (!hasActiveAllocation) {
          return sendSuccess(res, {
            valid: false,
            type: 'RESIDENT',
            status: resident.status,
            canCheckIn: false,
            canCheckOut: false,
            resident: {
              id: resident.id,
              fullName: resident.fullName,
              mobile: resident.mobile,
              propertyName: resident.property?.name,
              status: resident.status,
            },
            message: 'Resident pass is INACTIVE or revoked. No active bed allocation found.',
          });
        }

        // Audit resident gate scan
        await AuditService.log({
          propertyId: resident.propertyId,
          actorId: req.user?.id || null,
          actorName: req.user?.name || 'Security Guard',
          actorRole: req.user?.role || 'SECURITY_GUARD',
          action: 'RESIDENT_GATE_SCAN',
          entity: 'Resident',
          entityId: resident.id,
          ipAddress: req.ip,
          details: `Active Resident ${resident.fullName} scanned pass at security gate. Verified room allocation.`,
        }).catch(() => {});

        return sendSuccess(res, {
          valid: true,
          type: 'RESIDENT',
          status: 'ACTIVE',
          canCheckIn: false,
          canCheckOut: false,
          resident: {
            id: resident.id,
            fullName: resident.fullName,
            mobile: resident.mobile,
            roomNumber: resident.bed?.room?.number || 'N/A',
            bedNumber: resident.bed?.bedNumber || 'N/A',
            buildingName: resident.bed?.room?.floor?.building?.name || 'Main Wing',
            floorNumber: resident.bed?.room?.floor?.floorNumber || 1,
            propertyName: resident.property?.name || 'Urban Nest',
            status: resident.status,
          },
          message: 'Verified Active Resident. Gate access granted.',
        });
      }

      // =========================================================
      // B. VISITOR QR PASS VERIFICATION (VPASS- or UUID)
      // =========================================================
      const visitor = await withDbRetry(() =>
        prisma.visitorRequest.findFirst({
          where: {
            OR: [
              { qrPassToken: cleanToken },
              { id: cleanToken },
            ],
          },
          include: {
            property: { select: { id: true, name: true, tenantId: true } },
            resident: {
              select: {
                id: true,
                fullName: true,
                mobile: true,
                bed: {
                  select: {
                    bedNumber: true,
                    room: { select: { number: true } },
                  },
                },
              },
            },
          },
        })
      );

      if (!visitor) {
        return sendSuccess(res, {
          valid: false,
          type: 'VISITOR',
          status: 'INVALID',
          message: 'Invalid or forged QR pass token.',
        });
      }

      // Tenant / Property isolation check
      if (!isSuperAdmin) {
        if (req.user?.tenantId && visitor.property?.tenantId && visitor.property.tenantId !== req.user.tenantId) {
          return sendError(res, 'Access denied: Visitor pass belongs to a different tenant.', 403, 'FORBIDDEN_TENANT');
        }
        if (req.user?.propertyId && req.user.propertyId !== visitor.propertyId) {
          return sendError(res, 'Access denied: Visitor pass belongs to a different property.', 403, 'FORBIDDEN_PROPERTY');
        }
      }

      const passPayload = {
        id: visitor.id,
        qrPassToken: visitor.qrPassToken,
        visitorName: visitor.visitorName,
        visitorMobile: visitor.visitorMobile,
        relation: visitor.relation,
        purpose: visitor.purpose,
        visitDate: visitor.visitDate,
        expectedEntryTime: visitor.expectedEntryTime,
        expectedExitTime: visitor.expectedExitTime,
        status: visitor.status,
        checkInTime: visitor.checkInTime,
        checkOutTime: visitor.checkOutTime,
        residentName: visitor.resident?.fullName || 'Direct Walk-in',
        residentRoom: visitor.resident?.bed?.room?.number || 'N/A',
        residentBed: visitor.resident?.bed?.bedNumber || 'N/A',
        propertyName: visitor.property?.name,
      };

      // Handle PENDING pass scans: Record arrival and forward request without granting entry
      if (visitor.status === 'PENDING') {
        await AuditService.log({
          propertyId: visitor.propertyId,
          actorId: req.user?.id || null,
          actorName: req.user?.name || 'Security Guard',
          actorRole: req.user?.role || 'SECURITY_GUARD',
          action: 'VISITOR_ARRIVAL_SCANNED',
          entity: 'VisitorRequest',
          entityId: visitor.id,
          ipAddress: req.ip,
          details: `Visitor ${visitor.visitorName} arrived at gate and scanned pass. Forwarded to management for approval.`,
        }).catch(() => {});

        return sendSuccess(res, {
          valid: false,
          type: 'VISITOR',
          status: 'PENDING',
          canCheckIn: false,
          canCheckOut: false,
          pass: passPayload,
          message: 'Visitor pass is PENDING owner/manager approval. Gate check-in cannot be authorized until approved.',
        });
      }

      if (visitor.status === 'APPROVED') {
        return sendSuccess(res, {
          valid: true,
          type: 'VISITOR',
          status: 'APPROVED',
          canCheckIn: true,
          canCheckOut: false,
          pass: passPayload,
          message: 'Approved pass verified. Ready for security gate check-in.',
        });
      }

      if (visitor.status === 'CHECKED_IN') {
        return sendSuccess(res, {
          valid: true,
          type: 'VISITOR',
          status: 'CHECKED_IN',
          canCheckIn: false,
          canCheckOut: true,
          pass: passPayload,
          message: 'Visitor is currently inside premises. Ready for check-out.',
        });
      }

      if (visitor.status === 'CHECKED_OUT') {
        return sendSuccess(res, {
          valid: false,
          type: 'VISITOR',
          status: 'CHECKED_OUT',
          canCheckIn: false,
          canCheckOut: false,
          pass: passPayload,
          message: 'Visit completed. This pass has already been used and cannot be reused.',
        });
      }

      if (visitor.status === 'REJECTED') {
        return sendSuccess(res, {
          valid: false,
          type: 'VISITOR',
          status: 'REJECTED',
          canCheckIn: false,
          canCheckOut: false,
          pass: passPayload,
          message: 'Entry request was rejected by property administration. Entry strictly forbidden.',
        });
      }

      return sendSuccess(res, {
        valid: false,
        type: 'VISITOR',
        status: visitor.status,
        canCheckIn: false,
        canCheckOut: false,
        pass: passPayload,
        message: `Visitor pass is currently in ${visitor.status} status and cannot be used for entry.`,
      });
    } catch (error: any) {
      console.error('[SecurityController.verifyPass] Error:', error);
      return sendError(res, error.message || 'Pass verification failed', 500);
    }
  }

  // -------------------------------------------------------------
  // 3. CHECK-IN / CHECK-OUT (BY QR TOKEN OR VISITOR ID)
  // -------------------------------------------------------------
  static async checkInVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { token, visitorId } = req.body;

      if (!token && !visitorId) {
        return sendError(res, 'QR Pass token or Visitor ID is required.', 400);
      }

      let cleanToken = token ? decodeURIComponent(token).trim() : '';
      if (cleanToken.includes('/gate/verify/')) {
        cleanToken = cleanToken.split('/gate/verify/').pop() || cleanToken;
      }

      if (cleanToken.startsWith('RQRPASS-')) {
        return sendError(
          res,
          'Resident passes do not require visitor gate check-in. Resident identity is verified directly upon scan.',
          400,
          'RESIDENT_PASS_CANNOT_CHECKIN_AS_VISITOR'
        );
      }

      const visitor = await withDbRetry(() =>
        cleanToken
          ? prisma.visitorRequest.findFirst({
              where: {
                OR: [
                  { qrPassToken: cleanToken },
                  { id: cleanToken }
                ]
              },
              include: { property: true, resident: true }
            })
          : prisma.visitorRequest.findUnique({
              where: { id: visitorId },
              include: { property: true, resident: true }
            })
      );

      if (!visitor) {
        return sendError(res, 'Invalid QR Pass or Visitor not found.', 404, 'PASS_NOT_FOUND');
      }

      // Property and Tenant isolation check
      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
      if (!isSuperAdmin) {
        if (req.user?.tenantId && visitor.property?.tenantId && visitor.property.tenantId !== req.user.tenantId) {
          return sendError(res, 'Access denied: Visitor pass belongs to another tenant organization.', 403, 'FORBIDDEN_TENANT');
        }
        if (req.user?.propertyId && req.user.propertyId !== visitor.propertyId) {
          return sendError(res, 'Access denied: Visitor pass belongs to another property.', 403, 'FORBIDDEN_PROPERTY');
        }
      }

      // Strict state machine validation
      if (visitor.status === 'CHECKED_IN') {
        return sendError(res, 'Visitor is already checked in.', 400, 'ALREADY_CHECKED_IN');
      }
      if (visitor.status === 'CHECKED_OUT') {
        return sendError(res, 'Cannot check in: Pass has already been used and checked out.', 400, 'ALREADY_CHECKED_OUT');
      }
      if (visitor.status === 'PENDING') {
        return sendError(res, 'Cannot check in: Visitor request is still PENDING manager approval.', 400, 'VISIT_NOT_APPROVED');
      }
      if (visitor.status === 'REJECTED') {
        return sendError(res, 'Cannot check in: Pass was REJECTED by management.', 400, 'PASS_REJECTED');
      }
      if (visitor.status === 'CANCELLED') {
        return sendError(res, 'Cannot check in: Pass was CANCELLED.', 400, 'PASS_CANCELLED');
      }
      if (visitor.status !== 'APPROVED') {
        return sendError(res, `Cannot check in: Pass is currently in ${visitor.status} status.`, 400, 'INVALID_PASS_STATUS');
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
            resident: { include: { bed: { include: { room: true } } } },
            property: true,
          },
        });
      }, { maxWait: 15000, timeout: 30000 });

      // Audit Trail
      await AuditService.log({
        propertyId: visitor.propertyId,
        actorId: req.user?.id || null,
        actorName: req.user?.name || 'Security Guard',
        actorRole: req.user?.role || 'SECURITY_GUARD',
        action: 'VISITOR_CHECKED_IN',
        entity: 'VisitorRequest',
        entityId: visitor.id,
        ipAddress: req.ip,
        details: `Visitor ${visitor.visitorName} checked in at security gate.`,
      });

      // Notify resident asynchronously
      if (visitor.residentId) {
        prisma.notification.create({
          data: {
            userId: req.user?.id || '',
            residentId: visitor.residentId,
            title: 'Visitor Arrived at Gate',
            message: `${visitor.visitorName} has entered the premises.`,
            type: 'VISITOR',
          },
        }).catch(() => {});
      }

      return sendSuccess(res, updated, `Visitor ${visitor.visitorName} checked in successfully.`);
    } catch (error: any) {
      console.error('[SecurityController.checkInVisitor] Error:', error);
      return sendError(res, error.message || 'Failed to check in visitor', 500);
    }
  }

  static async checkOutVisitor(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { token, visitorId } = req.body;

      if (!token && !visitorId) {
        return sendError(res, 'QR Pass token or Visitor ID is required.', 400);
      }

      let cleanToken = token ? decodeURIComponent(token).trim() : '';
      if (cleanToken.includes('/gate/verify/')) {
        cleanToken = cleanToken.split('/gate/verify/').pop() || cleanToken;
      }

      const visitor = await withDbRetry(() =>
        cleanToken
          ? prisma.visitorRequest.findFirst({
              where: {
                OR: [
                  { qrPassToken: cleanToken },
                  { id: cleanToken }
                ]
              },
              include: { property: true, resident: true }
            })
          : prisma.visitorRequest.findUnique({
              where: { id: visitorId },
              include: { property: true, resident: true }
            })
      );

      if (!visitor) {
        return sendError(res, 'Visitor pass not found.', 404, 'PASS_NOT_FOUND');
      }

      // Property and Tenant isolation check
      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
      if (!isSuperAdmin) {
        if (req.user?.tenantId && visitor.property?.tenantId && visitor.property.tenantId !== req.user.tenantId) {
          return sendError(res, 'Access denied: Visitor pass belongs to another tenant organization.', 403, 'FORBIDDEN_TENANT');
        }
        if (req.user?.propertyId && req.user.propertyId !== visitor.propertyId) {
          return sendError(res, 'Access denied: Visitor pass belongs to another property.', 403, 'FORBIDDEN_PROPERTY');
        }
      }

      // State machine validation
      if (visitor.status === 'CHECKED_OUT') {
        return sendError(res, 'Visitor has already been checked out.', 400, 'ALREADY_CHECKED_OUT');
      }
      if (visitor.status !== 'CHECKED_IN') {
        return sendError(res, `Cannot check out: Visitor is currently in ${visitor.status} status (must be CHECKED_IN).`, 400, 'NOT_CHECKED_IN');
      }

      // Atomic state transition
      const updated = await prisma.$transaction(async (tx) => {
        const locked = await tx.visitorRequest.findUnique({ where: { id: visitor.id } });
        if (!locked || locked.status !== 'CHECKED_IN') {
          throw new Error('Visitor is no longer in CHECKED_IN status');
        }

        return tx.visitorRequest.update({
          where: { id: visitor.id },
          data: {
            status: 'CHECKED_OUT',
            checkOutTime: new Date(),
          },
          include: {
            resident: { include: { bed: { include: { room: true } } } },
            property: true,
          },
        });
      }, { maxWait: 15000, timeout: 30000 });

      // Audit Trail
      await AuditService.log({
        propertyId: visitor.propertyId,
        actorId: req.user?.id || null,
        actorName: req.user?.name || 'Security Guard',
        actorRole: req.user?.role || 'SECURITY_GUARD',
        action: 'VISITOR_CHECKED_OUT',
        entity: 'VisitorRequest',
        entityId: visitor.id,
        ipAddress: req.ip,
        details: `Visitor ${visitor.visitorName} checked out at security gate.`,
      });

      // Notify resident asynchronously
      if (visitor.residentId) {
        prisma.notification.create({
          data: {
            userId: req.user?.id || '',
            residentId: visitor.residentId,
            title: 'Visitor Departed',
            message: `${visitor.visitorName} has checked out and departed the premises.`,
            type: 'VISITOR',
          },
        }).catch(() => {});
      }

      return sendSuccess(res, updated, `Visitor ${visitor.visitorName} checked out successfully.`);
    } catch (error: any) {
      console.error('[SecurityController.checkOutVisitor] Error:', error);
      return sendError(res, error.message || 'Failed to check out visitor', 500);
    }
  }

  // -------------------------------------------------------------
  // 3. DIRECT GATE REGISTRATION (DELIVERY / WALK-IN)
  // -------------------------------------------------------------
  static async registerDirectEntry(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, visitorName, visitorMobile, purpose, residentId, expectedExitTime } = req.body;
      const auth = await verifyPropertyAccess(req, propertyId);
      if (!auth.authorized) {
        return sendError(res, auth.error || 'Access denied', auth.statusCode || 403);
      }
      const targetPropertyId = auth.propertyId!;

      if (!visitorName || !visitorMobile) {
        return sendError(res, 'Visitor name and mobile are required.', 400);
      }

      const entry = await withDbRetry(() =>
        prisma.visitorRequest.create({
          data: {
            propertyId: targetPropertyId,
            residentId: residentId || null,
            visitorName,
            visitorMobile,
            relation: 'Walk-in / Delivery',
            purpose: purpose || 'Delivery / Service',
            visitDate: new Date(),
            expectedEntryTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expectedExitTime: expectedExitTime || null,
            status: 'CHECKED_IN',
            checkInTime: new Date(),
            approvedBy: req.user?.name || 'Security Guard',
          },
        })
      );

      return sendSuccess(res, entry, 'Visitor logged and admitted successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to register gate entry', 500);
    }
  }

  // -------------------------------------------------------------
  // 4. SECURITY GUARD DASHBOARD STATS
  // -------------------------------------------------------------
  static async getGuardDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const auth = await verifyPropertyAccess(req, req.query.propertyId as string);
      if (!auth.authorized) {
        return sendError(res, auth.error || 'Property access denied.', auth.statusCode || 403);
      }
      const propertyId = auth.propertyId!;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 1);

      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

      const [currentlyInside, todayTotal, pendingApprovals, overdueCount, activeSOS] = await Promise.all([
        withDbRetry(() =>
          prisma.visitorRequest.count({
            where: { propertyId, status: 'CHECKED_IN' },
          })
        ),
        withDbRetry(() =>
          prisma.visitorRequest.count({
            where: { propertyId, visitDate: { gte: today, lt: nextDay } },
          })
        ),
        withDbRetry(() =>
          prisma.visitorRequest.count({
            where: { propertyId, status: 'PENDING' },
          })
        ),
        withDbRetry(() =>
          prisma.visitorRequest.count({
            where: {
              propertyId,
              status: 'CHECKED_IN',
              OR: [
                { visitDate: { lt: today } },
                { checkInTime: { lt: eightHoursAgo } },
              ],
            },
          })
        ),
        withDbRetry(() =>
          prisma.sOSEvent.findMany({
            where: { propertyId, status: 'ACTIVE' },
            include: {
              resident: {
                select: {
                  fullName: true,
                  mobile: true,
                  bed: { select: { bedNumber: true, room: { select: { number: true } } } },
                },
              },
            },
          })
        ),
      ]);

      return sendSuccess(res, {
        currentlyInside,
        todayTotal,
        pendingApprovals,
        overdueCount,
        activeSOS,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch guard dashboard', 500);
    }
  }
}
