import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  /**
   * POST /api/auth/register
   * Registers a new resident user
   */
  static async register(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, name, mobile, propertyId } = req.body;

      if (!email || !password || !name) {
        return sendError(res, 'Email, password, and full name are required.', 400, 'VALIDATION_ERROR');
      }

      if (password.length < 6) {
        return sendError(res, 'Password must be at least 6 characters long.', 400, 'VALIDATION_ERROR');
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        return sendError(res, 'An account with this email address already exists.', 409, 'DUPLICATE_EMAIL');
      }

      // Find target property
      let targetProperty = null;
      if (propertyId) {
        targetProperty = await prisma.property.findUnique({ where: { id: propertyId } });
      }
      if (!targetProperty) {
        targetProperty = await prisma.property.findFirst();
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Create User and Resident in transaction
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: email.toLowerCase().trim(),
            passwordHash,
            name: name.trim(),
            role: 'RESIDENT',
            mobile: mobile || null,
            tenantId: targetProperty?.tenantId || null,
            propertyId: targetProperty?.id || null,
          },
        });

        const newResident = await tx.resident.create({
          data: {
            userId: newUser.id,
            propertyId: targetProperty!.id,
            fullName: name.trim(),
            email: email.toLowerCase().trim(),
            mobile: mobile || '9876543210',
            emergencyContactName: 'Guardian',
            emergencyContactRelation: 'Parent',
            emergencyContactPhone: '9876543211',
            status: 'ACTIVE',
          },
        });

        return { user: newUser, resident: newResident };
      });

      const token = jwt.sign(
        {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          name: result.user.name,
          tenantId: result.user.tenantId,
          propertyId: result.user.propertyId,
          residentId: result.resident.id,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      await AuditService.log({
        tenantId: result.user.tenantId || undefined,
        propertyId: targetProperty?.id,
        actorId: result.user.id,
        actorName: result.user.name,
        actorRole: result.user.role,
        action: 'REGISTER',
        entity: 'User',
        entityId: result.user.id,
        ipAddress: req.ip,
        details: `Resident account registered with email: ${result.user.email}`,
      });

      return sendSuccess(
        res,
        {
          token,
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            mobile: result.user.mobile,
            tenantId: result.user.tenantId,
            propertyId: targetProperty?.id,
            residentId: result.resident.id,
          },
        },
        'Registration successful',
        201
      );
    } catch (error: any) {
      console.error('[AuthController.register] Error:', error);
      return sendError(res, error.message || 'Registration failed', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * POST /api/auth/login
   * Authenticates user against PostgreSQL and returns JWT token and multi-tenant profile
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendError(res, 'Email and password are required.', 400, 'VALIDATION_ERROR');
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              plan: true,
            },
          },
          resident: {
            include: {
              property: true,
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
        },
      });

      if (!user) {
        return sendError(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return sendError(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
      }

      // Check tenant suspension for non-Super-Admin users
      if (user.role !== 'SUPER_ADMIN' && user.tenant?.status === 'SUSPENDED') {
        return sendError(
          res,
          'Your PG Tenant account has been suspended by platform administration. Please contact support.',
          403,
          'TENANT_SUSPENDED'
        );
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          tenantId: user.tenantId,
          propertyId: user.propertyId || user.resident?.propertyId || null,
          residentId: user.resident?.id,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      // Log login event
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          propertyId: user.propertyId || user.resident?.propertyId || null,
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          action: 'LOGIN',
          entity: 'User',
          entityId: user.id,
          ipAddress: req.ip,
          details: `User logged in from ${req.ip || 'web'}`,
        },
      }).catch(() => {});

      return sendSuccess(
        res,
        {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            mobile: user.mobile,
            avatarUrl: user.avatarUrl,
            tenantId: user.tenantId,
            tenant: user.tenant,
            propertyId: user.propertyId || user.resident?.propertyId || null,
            residentId: user.resident?.id,
            residentDetails: user.resident
              ? {
                  id: user.resident.id,
                  fullName: user.resident.fullName,
                  status: user.resident.status,
                  kycStatus: user.resident.kycStatus,
                  propertyName: user.resident.property?.name,
                  roomNumber: user.resident.bed?.room?.number,
                  bedNumber: user.resident.bed?.bedNumber,
                  buildingName: user.resident.bed?.room?.floor?.building?.name,
                  floorNumber: user.resident.bed?.room?.floor?.floorNumber,
                }
              : null,
          },
        },
        'Login successful'
      );
    } catch (error: any) {
      console.error('[AuthController.login] Error:', error);
      const isDbError =
        error.message?.includes("Can't reach database server") ||
        error.message?.includes('P1001') ||
        error.code === 'P1001' ||
        error.code === 'P1000' ||
        error.code === 'P1002' ||
        error.name === 'PrismaClientInitializationError' ||
        error.name === 'PrismaClientKnownRequestError';

      if (isDbError) {
        return sendError(
          res,
          'Database service is temporarily unreachable. Please check PostgreSQL / Supabase connection in server environment settings.',
          503,
          'DATABASE_UNAVAILABLE'
        );
      }
      return sendError(res, error.message || 'Login failed. Please verify credentials.', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * GET /api/auth/me
   * Returns current authenticated user, tenant organization, and linked resident info
   */
  static async getCurrentUser(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required.', 401, 'UNAUTHORIZED');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              plan: true,
              maxProperties: true,
              maxRooms: true,
              maxResidents: true,
            },
          },
          resident: {
            include: {
              property: true,
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
        },
      });

      if (!user) {
        return sendError(res, 'User profile not found.', 404, 'USER_NOT_FOUND');
      }

      return sendSuccess(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        avatarUrl: user.avatarUrl,
        tenantId: user.tenantId,
        tenant: user.tenant,
        propertyId: user.propertyId || user.resident?.propertyId || null,
        residentId: user.resident?.id,
        isImpersonated: req.user.isImpersonated,
        impersonatedBy: req.user.impersonatedBy,
        residentDetails: user.resident
          ? {
              id: user.resident.id,
              fullName: user.resident.fullName,
              status: user.resident.status,
              kycStatus: user.resident.kycStatus,
              joiningDate: user.resident.joiningDate,
              propertyName: user.resident.property?.name,
              propertyAddress: user.resident.property?.address,
              roomNumber: user.resident.bed?.room?.number,
              bedNumber: user.resident.bed?.bedNumber,
              buildingName: user.resident.bed?.room?.floor?.building?.name,
              floorNumber: user.resident.bed?.room?.floor?.floorNumber,
            }
          : null,
      });
    } catch (error: any) {
      console.error('[AuthController.getCurrentUser] Error:', error);
      return sendError(res, error.message || 'Failed to fetch user', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req: AuthRequest, res: Response): Promise<Response> {
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          propertyId: req.user.propertyId,
          actorId: req.user.id,
          actorName: req.user.name,
          actorRole: req.user.role,
          action: 'LOGOUT',
          entity: 'User',
          entityId: req.user.id,
          ipAddress: req.ip,
          details: `User logged out`,
        },
      }).catch(() => {});
    }

    return sendSuccess(res, null, 'Logged out successfully');
  }
}
