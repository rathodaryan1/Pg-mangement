import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { sendError } from '../utils/response';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string | null;
  tenantName?: string;
  tenantStatus?: string;
  propertyId?: string | null;
  residentId?: string;
  bedId?: string | null;
  isImpersonated?: boolean;
  impersonatedBy?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token && req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']);
  }

  if (!token) {
    return sendError(res, 'Authentication required. Please provide a valid access token.', 401, 'UNAUTHORIZED');
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id?: string;
      userId?: string;
      email: string;
      role: string;
      name?: string;
      tenantId?: string;
      propertyId?: string;
      residentId?: string;
      isImpersonated?: boolean;
      impersonatedBy?: string;
    };

    const targetUserId = decoded.id || decoded.userId;

    let user = null;
    try {
      if (targetUserId) {
        user = await prisma.user.findUnique({
          where: { id: targetUserId },
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
              select: {
                id: true,
                propertyId: true,
                bedId: true,
                status: true,
              },
            },
          },
        });
      } else if (decoded.email) {
        user = await prisma.user.findUnique({
          where: { email: decoded.email },
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
              select: {
                id: true,
                propertyId: true,
                bedId: true,
                status: true,
              },
            },
          },
        });
      }
    } catch (dbErr: any) {
      console.warn('[auth.middleware] Database user lookup failed, using verified token claims:', dbErr.message);
    }

    const authUser: AuthenticatedUser = {
      id: user?.id || targetUserId || '',
      email: user?.email || decoded.email,
      name: user?.name || decoded.name || (decoded.role === 'OWNER' ? 'Owner' : 'Resident'),
      role: (user?.role as string) || decoded.role,
      tenantId: user?.tenantId || decoded.tenantId || null,
      tenantName: user?.tenant?.name,
      tenantStatus: user?.tenant?.status,
      propertyId: user?.propertyId || user?.resident?.propertyId || decoded.propertyId || null,
      residentId: user?.resident?.id || decoded.residentId,
      bedId: user?.resident?.bedId || null,
      isImpersonated: !!decoded.isImpersonated,
      impersonatedBy: decoded.impersonatedBy,
    };

    req.user = authUser;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Access token has expired. Please login again.', 401, 'TOKEN_EXPIRED');
    }
    return sendError(res, 'Invalid access token. Please authenticate again.', 401, 'INVALID_TOKEN');
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
  if (!req.user) {
    return sendError(res, 'Authentication required.', 401, 'UNAUTHORIZED');
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return sendError(res, 'Access forbidden: Super Administrator access only.', 403, 'SUPER_ADMIN_ONLY');
  }

  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Access forbidden: You do not have permission to access this resource.', 403, 'FORBIDDEN');
    }

    next();
  };
};

export const requireOwnerOrStaff = (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
  if (!req.user) {
    return sendError(res, 'Authentication required.', 401, 'UNAUTHORIZED');
  }

  const allowedRoles = ['OWNER', 'SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE'];
  if (!allowedRoles.includes(req.user.role)) {
    return sendError(res, 'Access forbidden: Owner/Staff access only.', 403, 'FORBIDDEN');
  }

  // Check if tenant is suspended (unless Super Admin)
  if (req.user.role !== 'SUPER_ADMIN' && req.user.tenantStatus === 'SUSPENDED') {
    return sendError(res, 'This PG Tenant account has been suspended by the platform administrator. Please contact support.', 403, 'TENANT_SUSPENDED');
  }

  next();
};

export const requireResident = (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
  if (!req.user) {
    return sendError(res, 'Authentication required.', 401, 'UNAUTHORIZED');
  }

  if (req.user.role !== 'RESIDENT') {
    return sendError(res, 'Access forbidden: Resident access only.', 403, 'RESIDENT_ONLY');
  }

  if (!req.user.residentId) {
    return sendError(res, 'Resident profile not found for this user.', 404, 'RESIDENT_PROFILE_NOT_FOUND');
  }

  if (req.user.tenantStatus === 'SUSPENDED') {
    return sendError(res, 'This PG property service is currently suspended. Please contact management.', 403, 'TENANT_SUSPENDED');
  }

  next();
};

export const checkPlanLimit = (resource: 'properties' | 'rooms' | 'beds' | 'residents' | 'staff') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user || req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      const tenantId = req.user.tenantId;
      if (!tenantId) {
        return next();
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          maxProperties: true,
          maxRooms: true,
          maxResidents: true,
        },
      });

      if (!tenant) return next();

      if (resource === 'properties') {
        const count = await prisma.property.count({ where: { tenantId } });
        if (count >= tenant.maxProperties) {
          return sendError(
            res,
            `SaaS plan limit reached: Your plan allows a maximum of ${tenant.maxProperties} properties. Please upgrade your plan.`,
            403,
            'PLAN_LIMIT_REACHED'
          );
        }
      } else if (resource === 'rooms') {
        const properties = await prisma.property.findMany({ where: { tenantId }, select: { id: true } });
        const propIds = properties.map((p) => p.id);
        const count = await prisma.room.count({ where: { propertyId: { in: propIds } } });
        if (count >= tenant.maxRooms) {
          return sendError(
            res,
            `SaaS plan limit reached: Your plan allows a maximum of ${tenant.maxRooms} rooms. Please upgrade your plan.`,
            403,
            'PLAN_LIMIT_REACHED'
          );
        }
      } else if (resource === 'residents') {
        const properties = await prisma.property.findMany({ where: { tenantId }, select: { id: true } });
        const propIds = properties.map((p) => p.id);
        const count = await prisma.resident.count({ where: { propertyId: { in: propIds }, status: 'ACTIVE' } });
        if (count >= tenant.maxResidents) {
          return sendError(
            res,
            `SaaS plan limit reached: Your plan allows a maximum of ${tenant.maxResidents} residents. Please upgrade your plan.`,
            403,
            'PLAN_LIMIT_REACHED'
          );
        }
      }

      next();
    } catch (err: any) {
      next();
    }
  };
};

export const requireFeature = (featureName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<Response | void> => {
    if (!req.user || req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    next();
  };
};
