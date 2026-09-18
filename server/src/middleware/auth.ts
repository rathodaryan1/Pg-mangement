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
  propertyId?: string | null;
  residentId?: string;
  bedId?: string | null;
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

  // Support local dev tokens ONLY when explicitly enabled in local dev environment
  const isProd = process.env.NODE_ENV === 'production';
  const isDemoEnabled = process.env.DEMO_MODE === 'true';

  if (!isProd && isDemoEnabled && (token.startsWith('dev-token') || token.startsWith('demo-token'))) {
    const isResident = token.includes('resident') || token.includes('aakash');
    const authUser: AuthenticatedUser = {
      id: isResident ? 'usr-res-1' : 'usr-owner-1',
      email: isResident ? 'aakash.v@gmail.com' : 'owner@pg.com',
      name: isResident ? 'Aakash Verma' : 'Aaryan Sharma (Owner)',
      role: isResident ? 'RESIDENT' : 'OWNER',
      propertyId: 'prop-1',
      residentId: isResident ? 'res-1' : undefined,
      bedId: isResident ? 'bed-101A' : null,
    };
    req.user = authUser;
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: string;
      name?: string;
      propertyId?: string;
      residentId?: string;
    };

    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
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
    } catch (dbErr: any) {
      console.warn('[auth.middleware] Database user lookup failed, using verified token claims:', dbErr.message);
    }

    const authUser: AuthenticatedUser = {
      id: user?.id || decoded.id,
      email: user?.email || decoded.email,
      name: user?.name || decoded.name || (decoded.role === 'OWNER' ? 'Owner' : 'Resident'),
      role: (user?.role as string) || decoded.role,
      propertyId: user?.propertyId || user?.resident?.propertyId || decoded.propertyId || 'prop-1',
      residentId: user?.resident?.id || decoded.residentId || (decoded.role === 'RESIDENT' ? 'res-1' : undefined),
      bedId: user?.resident?.bedId || (decoded.role === 'RESIDENT' ? 'bed-101A' : null),
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

  next();
};
