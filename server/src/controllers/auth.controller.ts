import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
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
        return sendError(res, 'Email, password, and full name are required.', 400);
      }

      if (password.length < 6) {
        return sendError(res, 'Password must be at least 6 characters long.', 400);
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        return sendError(res, 'An account with this email address already exists.', 409);
      }

      // Find property if provided or assign first available demo property
      let targetPropertyId = propertyId;
      if (!targetPropertyId) {
        const defaultProp = await prisma.property.findFirst();
        if (defaultProp) targetPropertyId = defaultProp.id;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create User and Resident in transaction
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: email.toLowerCase().trim(),
            passwordHash,
            name: name.trim(),
            role: 'RESIDENT',
            mobile: mobile || null,
            propertyId: targetPropertyId || null,
          },
        });

        const newResident = await tx.resident.create({
          data: {
            userId: newUser.id,
            propertyId: targetPropertyId!,
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
        { id: result.user.id, email: result.user.email, role: result.user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      await AuditService.log({
        propertyId: targetPropertyId,
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
            propertyId: targetPropertyId,
            residentId: result.resident.id,
          },
        },
        'Registration successful',
        201
      );
    } catch (error: any) {
      console.error('[AuthController.register] Error:', error);
      return sendError(res, error.message || 'Registration failed', 500);
    }
  }

  /**
   * POST /api/auth/login
   * Authenticates user and returns JWT token and profile data
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendError(res, 'Email and password are required.', 400);
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
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
        return sendError(res, 'Invalid email or password.', 401);
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return sendError(res, 'Invalid email or password.', 401);
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      await AuditService.log({
        propertyId: user.propertyId || user.resident?.propertyId || null,
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        details: `User logged in from IP ${req.ip}`,
      });

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
      return sendError(res, error.message || 'Login failed', 500);
    }
  }

  /**
   * GET /api/auth/me
   * Returns current authenticated user and linked resident info
   */
  static async getCurrentUser(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required.', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
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
        return sendError(res, 'User not found.', 404);
      }

      return sendSuccess(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        avatarUrl: user.avatarUrl,
        propertyId: user.propertyId || user.resident?.propertyId || null,
        residentId: user.resident?.id,
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
      return sendError(res, error.message || 'Failed to fetch user', 500);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req: AuthRequest, res: Response): Promise<Response> {
    if (req.user) {
      await AuditService.log({
        propertyId: req.user.propertyId,
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'LOGOUT',
        entity: 'User',
        entityId: req.user.id,
        ipAddress: req.ip,
        details: `User logged out`,
      });
    }

    return sendSuccess(res, null, 'Logged out successfully');
  }
}
