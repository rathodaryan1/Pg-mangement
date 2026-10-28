import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export interface PropertyAccessResult {
  authorized: boolean;
  propertyId?: string;
  property?: any;
  error?: string;
  statusCode?: number;
}

/**
 * Centrally validates that the authenticated user has legitimate access to a target property,
 * enforcing strict multi-tenant boundary isolation and role-specific property assignment.
 */
export async function verifyPropertyAccess(
  req: AuthRequest,
  requestedPropertyId?: string
): Promise<PropertyAccessResult> {
  const user = req.user;
  if (!user) {
    return { authorized: false, error: 'Authentication required.', statusCode: 401 };
  }

  // 1. Super Admin has global platform-wide access
  if (user.role === 'SUPER_ADMIN') {
    if (requestedPropertyId && requestedPropertyId !== 'ALL' && requestedPropertyId !== 'undefined') {
      const prop = await prisma.property.findUnique({
        where: { id: requestedPropertyId },
        include: { tenant: true },
      });
      if (!prop) {
        return { authorized: false, error: 'Property not found.', statusCode: 404 };
      }
      return { authorized: true, propertyId: prop.id, property: prop };
    }

    const defaultProp = await prisma.property.findFirst({ include: { tenant: true } });
    return { authorized: true, propertyId: defaultProp?.id, property: defaultProp };
  }

  // Resolve user's effective tenant ID
  const tenantId = user.tenantId || undefined;

  // 2. Property Owner: Scoped to all properties in their tenant
  if (user.role === 'OWNER') {
    if (!tenantId) {
      return { authorized: false, error: 'No tenant associated with user account.', statusCode: 403 };
    }

    if (requestedPropertyId && requestedPropertyId !== 'ALL' && requestedPropertyId !== 'undefined') {
      const prop = await prisma.property.findFirst({
        where: { id: requestedPropertyId, tenantId },
        include: { tenant: true },
      });

      if (!prop) {
        const foreignProp = await prisma.property.findUnique({
          where: { id: requestedPropertyId },
          select: { id: true, tenantId: true },
        });

        if (foreignProp && foreignProp.tenantId !== tenantId) {
          return {
            authorized: false,
            error: 'Access denied: Property belongs to a different tenant organization.',
            statusCode: 403,
          };
        }

        return { authorized: false, error: 'Property not found.', statusCode: 404 };
      }

      return { authorized: true, propertyId: prop.id, property: prop };
    }

    // Default to user's assigned property or first property of the tenant
    const defaultProp = await prisma.property.findFirst({
      where: { tenantId },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!defaultProp) {
      return { authorized: false, error: 'No properties registered under this tenant.', statusCode: 404 };
    }

    return { authorized: true, propertyId: defaultProp.id, property: defaultProp };
  }

  // 3. Manager / Receptionist / Accountant: Scoped to their tenant and assigned properties
  if (['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT'].includes(user.role)) {
    const targetId = requestedPropertyId && requestedPropertyId !== 'ALL' && requestedPropertyId !== 'undefined'
      ? requestedPropertyId
      : user.propertyId;

    if (!targetId) {
      return { authorized: false, error: 'No property specified or assigned to staff member.', statusCode: 400 };
    }

    const prop = await prisma.property.findUnique({
      where: { id: targetId },
      include: { tenant: true, staff: { select: { id: true } } },
    });

    if (!prop) {
      return { authorized: false, error: 'Property not found.', statusCode: 404 };
    }

    if (tenantId && prop.tenantId !== tenantId) {
      return {
        authorized: false,
        error: 'Access denied: Property belongs to a different tenant organization.',
        statusCode: 403,
      };
    }

    // If assigned to a specific property, ensure it matches or user is explicitly in property.staff
    if (user.propertyId && user.propertyId !== prop.id) {
      const isAssignedStaff = prop.staff?.some((s) => s.id === user.id);
      if (!isAssignedStaff) {
        return {
          authorized: false,
          error: 'Access denied: You are not assigned to manage this property.',
          statusCode: 403,
        };
      }
    }

    return { authorized: true, propertyId: prop.id, property: prop };
  }

  // 4. Operational Staff: Cook, Security Guard, Housekeeping, Maintenance
  if (['COOK', 'SECURITY_GUARD', 'HOUSEKEEPING', 'MAINTENANCE'].includes(user.role)) {
    const assignedPropertyId = user.propertyId;
    if (!assignedPropertyId) {
      return {
        authorized: false,
        error: 'No property assigned to current staff profile. Please contact PG administration.',
        statusCode: 403,
      };
    }

    if (requestedPropertyId && requestedPropertyId !== 'ALL' && requestedPropertyId !== 'undefined' && requestedPropertyId !== assignedPropertyId) {
      return {
        authorized: false,
        error: 'Access denied: Operational staff can only perform duties in their assigned property.',
        statusCode: 403,
      };
    }

    const prop = await prisma.property.findUnique({
      where: { id: assignedPropertyId },
      include: { tenant: true },
    });

    if (!prop) {
      return { authorized: false, error: 'Assigned property record not found.', statusCode: 404 };
    }

    if (tenantId && prop.tenantId !== tenantId) {
      return {
        authorized: false,
        error: 'Access denied: Property tenant mismatch.',
        statusCode: 403,
      };
    }

    return { authorized: true, propertyId: prop.id, property: prop };
  }

  // 5. Resident: Strictly scoped to their residential property
  if (user.role === 'RESIDENT') {
    const residentPropertyId = user.propertyId;
    if (!residentPropertyId) {
      return { authorized: false, error: 'Resident is not assigned to a property.', statusCode: 403 };
    }

    if (requestedPropertyId && requestedPropertyId !== residentPropertyId) {
      return {
        authorized: false,
        error: 'Access denied: Residents cannot access data for other properties.',
        statusCode: 403,
      };
    }

    const prop = await prisma.property.findUnique({
      where: { id: residentPropertyId },
      include: { tenant: true },
    });

    if (!prop) {
      return { authorized: false, error: 'Resident property not found.', statusCode: 404 };
    }

    return { authorized: true, propertyId: prop.id, property: prop };
  }

  return { authorized: false, error: 'Unauthorized role.', statusCode: 403 };
}
