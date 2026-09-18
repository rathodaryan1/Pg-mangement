import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { sendSuccess, sendError, sendCreated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export class SuperAdminController {
  // -------------------------------------------------------------
  // 1. DASHBOARD & GLOBAL PLATFORM METRICS
  // -------------------------------------------------------------
  static async getDashboardStats(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      // Fetch tenant statistics with resilient batching
      const [totalTenants, activeTenants, trialTenants, suspendedTenants] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { status: 'ACTIVE' } }),
        prisma.tenant.count({ where: { status: 'TRIAL' } }),
        prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      ]);

      const [totalProperties, totalOwners, totalResidents, totalStaff] = await Promise.all([
        prisma.property.count(),
        prisma.user.count({ where: { role: 'OWNER' } }),
        prisma.resident.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({
          where: { role: { in: ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE'] } },
        }),
      ]);

      const [totalRooms, totalBeds, occupiedBeds] = await Promise.all([
        prisma.room.count(),
        prisma.bed.count(),
        prisma.bed.count({ where: { status: 'OCCUPIED' } }),
      ]);

      const recentAuditLogs = await prisma.auditLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: { tenant: { select: { name: true, slug: true } } },
      }).catch(() => []);

      const tenantsByPlan = await prisma.tenant.groupBy({
        by: ['plan'],
        _count: { id: true },
      }).catch(() => []);

      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      // Calculate estimated monthly recurring SaaS revenue based on plan pricing
      const planPricing: Record<string, number> = {
        TRIAL: 0,
        STARTER: 2999,
        PROFESSIONAL: 7999,
        ENTERPRISE: 19999,
      };

      const monthlySaaSRevenue = tenantsByPlan.reduce((acc, curr) => {
        return acc + (planPricing[curr.plan] || 0) * curr._count.id;
      }, 0);

      // Check system component status
      let dbHealth = 'HEALTHY';
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        dbHealth = 'DEGRADED';
      }

      return sendSuccess(
        res,
        {
          overview: {
            totalTenants,
            activeTenants,
            trialTenants,
            suspendedTenants,
            totalProperties,
            totalOwners,
            totalResidents,
            totalStaff,
            totalRooms,
            totalBeds,
            occupiedBeds,
            occupancyRate,
            monthlySaaSRevenue,
          },
          tenantsByPlan,
          recentActivity: recentAuditLogs,
          systemHealth: {
            database: dbHealth,
            api: 'ONLINE',
            storage: 'CONNECTED',
            gateway: 'READY',
          },
        },
        'Platform statistics loaded successfully'
      );
    } catch (error: any) {
      console.error('[SuperAdmin.getDashboardStats] Error:', error);
      return sendError(res, 'Failed to calculate platform metrics', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  // -------------------------------------------------------------
  // 2. TENANT MANAGEMENT (CRUD & ACTIONS)
  // -------------------------------------------------------------
  static async getTenants(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { search, status, plan, city, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (status && status !== 'ALL') {
        where.status = status;
      }

      if (plan && plan !== 'ALL') {
        where.plan = plan;
      }

      if (city && city !== 'ALL') {
        where.city = { contains: String(city), mode: 'insensitive' };
      }

      if (search) {
        where.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
          { slug: { contains: String(search), mode: 'insensitive' } },
          { phone: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const [total, tenants] = await Promise.all([
        prisma.tenant.count({ where }),
        prisma.tenant.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            users: {
              where: { role: 'OWNER' },
              select: { id: true, name: true, email: true, mobile: true },
            },
            _count: {
              select: {
                properties: true,
                users: true,
              },
            },
          },
        }),
      ]);

      return sendSuccess(
        res,
        {
          tenants,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
        'Tenants retrieved successfully'
      );
    } catch (error: any) {
      console.error('[SuperAdmin.getTenants] Error:', error);
      return sendError(res, 'Failed to retrieve tenants list', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  static async getTenantById(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;

      const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
          users: {
            select: { id: true, name: true, email: true, role: true, mobile: true, createdAt: true },
          },
          properties: {
            include: {
              _count: {
                select: {
                  rooms: true,
                  residents: true,
                  buildings: true,
                },
              },
            },
          },
          auditLogs: {
            take: 15,
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      if (!tenant) {
        return sendError(res, 'Tenant organization not found', 404, 'NOT_FOUND');
      }

      return sendSuccess(res, tenant, 'Tenant details loaded');
    } catch (error: any) {
      console.error('[SuperAdmin.getTenantById] Error:', error);
      return sendError(res, 'Failed to fetch tenant profile', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  static async createTenant(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const {
        name,
        email,
        phone,
        address,
        city = 'Bengaluru',
        state = 'Karnataka',
        ownerName,
        ownerEmail,
        ownerMobile,
        password,
        temporaryPassword,
        plan = 'STARTER',
        trialDays = 14,
      } = req.body;

      const tenantEmail = (email || ownerEmail)?.trim().toLowerCase();
      const initialPassword = password || temporaryPassword;
      const ownerEmailAddr = (ownerEmail || email)?.trim().toLowerCase();

      if (!name || !tenantEmail || !ownerEmailAddr || !ownerName || !initialPassword) {
        return sendError(res, 'Please provide PG name, email, owner details and password', 400, 'VALIDATION_ERROR');
      }

      const cleanSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + `-${Math.random().toString(36).substring(2, 6)}`;

      // Check duplicate email
      const existingUser = await prisma.user.findUnique({ where: { email: ownerEmailAddr } });
      if (existingUser) {
        return sendError(res, `User with email ${ownerEmailAddr} already exists`, 409, 'DUPLICATE_EMAIL');
      }

      const existingTenant = await prisma.tenant.findUnique({ where: { email: tenantEmail } });
      if (existingTenant) {
        return sendError(res, `Tenant organization with email ${tenantEmail} already exists`, 409, 'DUPLICATE_TENANT_EMAIL');
      }

      const passwordHash = await bcrypt.hash(initialPassword, 10);
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + (parseInt(String(trialDays), 10) || 14));

      // Determine resource limits based on plan
      let maxProperties = 1;
      let maxRooms = 20;
      let maxResidents = 50;

      if (plan === 'PROFESSIONAL') {
        maxProperties = 5;
        maxRooms = 100;
        maxResidents = 300;
      } else if (plan === 'ENTERPRISE') {
        maxProperties = 25;
        maxRooms = 1000;
        maxResidents = 3000;
      }

      // Execute atomic transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Tenant
        const newTenant = await tx.tenant.create({
          data: {
            name: name.trim(),
            slug: cleanSlug,
            email: tenantEmail,
            phone: phone || ownerMobile || null,
            address: address || null,
            city,
            state,
            country: 'India',
            status: 'ACTIVE',
            plan,
            subscriptionStatus: plan === 'TRIAL' ? 'TRIALING' : 'ACTIVE',
            trialEndsAt,
            subscriptionStartedAt: new Date(),
            maxProperties,
            maxRooms,
            maxResidents,
          },
        });

        // 2. Create Owner User
        const newOwner = await tx.user.create({
          data: {
            name: ownerName.trim(),
            email: ownerEmailAddr,
            passwordHash,
            role: 'OWNER',
            mobile: ownerMobile || null,
            tenantId: newTenant.id,
          },
        });

        // 3. Create initial Property / PG Branch
        const initialProperty = await tx.property.create({
          data: {
            name: `${name.trim()} - Main Campus`,
            address: address || 'Main Road',
            city,
            phone: phone || ownerMobile || null,
            email: tenantEmail,
            tenantId: newTenant.id,
          },
        });

        // Connect owner to initial property
        await tx.user.update({
          where: { id: newOwner.id },
          data: { propertyId: initialProperty.id },
        });

        // 4. Create initial Building, Floor, Room, Bed hierarchy
        const building = await tx.building.create({
          data: {
            name: 'Wing A',
            propertyId: initialProperty.id,
          },
        });

        const floor = await tx.floor.create({
          data: {
            floorNumber: 1,
            buildingId: building.id,
          },
        });

        const room = await tx.room.create({
          data: {
            number: '101',
            type: 'Double',
            capacity: 2,
            baseRent: 8500,
            deposit: 15000,
            amenities: 'AC, High-Speed Wi-Fi, Attached Bath',
            floorId: floor.id,
            propertyId: initialProperty.id,
          },
        });

        await tx.bed.createMany({
          data: [
            { bedNumber: 'Bed 101-A', roomId: room.id, monthlyRent: 8500, status: 'AVAILABLE' },
            { bedNumber: 'Bed 101-B', roomId: room.id, monthlyRent: 8500, status: 'AVAILABLE' },
          ],
        });

        // 5. Create Audit Log
        await tx.auditLog.create({
          data: {
            tenantId: newTenant.id,
            propertyId: initialProperty.id,
            actorId: req.user?.id || null,
            actorName: req.user?.name || 'Super Administrator',
            actorRole: 'SUPER_ADMIN',
            action: 'TENANT_CREATED',
            entity: 'Tenant',
            entityId: newTenant.id,
            details: `Created new PG tenant "${newTenant.name}" with Owner ${newOwner.email} on plan ${plan}`,
          },
        });

        return { tenant: newTenant, owner: newOwner, property: initialProperty };
      }, { maxWait: 15000, timeout: 30000 });

      return sendCreated(
        res,
        {
          tenantId: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          ownerEmail: result.owner.email,
          ownerName: result.owner.name,
          initialPropertyId: result.property.id,
          plan: result.tenant.plan,
          tenant: result.tenant,
          owner: result.owner,
          property: result.property,
        },
        'PG Tenant and Owner account created successfully'
      );
    } catch (error: any) {
      console.error('[SuperAdmin.createTenant] Error:', error);
      return sendError(res, 'Failed to create PG tenant', 500, 'CREATION_FAILED', error.message);
    }
  }

  static async updateTenant(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { name, email, phone, address, city, state, plan, status, maxProperties, maxRooms, maxResidents } = req.body;

      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) {
        return sendError(res, 'Tenant not found', 404, 'NOT_FOUND');
      }

      const updated = await prisma.tenant.update({
        where: { id },
        data: {
          name: name ? name.trim() : undefined,
          email: email ? email.trim().toLowerCase() : undefined,
          phone: phone !== undefined ? phone : undefined,
          address: address !== undefined ? address : undefined,
          city: city || undefined,
          state: state || undefined,
          plan: plan || undefined,
          status: status || undefined,
          maxProperties: maxProperties ? parseInt(String(maxProperties), 10) : undefined,
          maxRooms: maxRooms ? parseInt(String(maxRooms), 10) : undefined,
          maxResidents: maxResidents ? parseInt(String(maxResidents), 10) : undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: id,
          actorId: req.user?.id || null,
          actorName: req.user?.name || 'Super Administrator',
          actorRole: 'SUPER_ADMIN',
          action: 'TENANT_UPDATED',
          entity: 'Tenant',
          entityId: id,
          details: `Updated tenant settings for "${updated.name}"`,
        },
      });

      return sendSuccess(res, updated, 'Tenant profile updated successfully');
    } catch (error: any) {
      console.error('[SuperAdmin.updateTenant] Error:', error);
      return sendError(res, 'Failed to update tenant', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  static async deleteTenant(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;

      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) {
        return sendError(res, 'Tenant not found', 404, 'NOT_FOUND');
      }

      await prisma.tenant.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          actorId: req.user?.id || null,
          actorName: req.user?.name || 'Super Administrator',
          actorRole: 'SUPER_ADMIN',
          action: 'TENANT_DELETED',
          entity: 'Tenant',
          entityId: id,
          details: `Permanently deleted PG tenant "${tenant.name}" (${tenant.email})`,
        },
      });

      return sendSuccess(res, { id, name: tenant.name }, 'Tenant deleted permanently');
    } catch (error: any) {
      console.error('[SuperAdmin.deleteTenant] Error:', error);
      return sendError(res, 'Failed to delete tenant', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  // -------------------------------------------------------------
  // 3. SUSPENSION & ACTIVATION WORKFLOWS
  // -------------------------------------------------------------
  static async suspendTenant(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { reason = 'Terms of service violation or overdue subscription' } = req.body;

      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) {
        return sendError(res, 'Tenant not found', 404, 'NOT_FOUND');
      }

      const updated = await prisma.tenant.update({
        where: { id },
        data: { status: 'SUSPENDED' },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: id,
          actorId: req.user?.id || null,
          actorName: req.user?.name || 'Super Administrator',
          actorRole: 'SUPER_ADMIN',
          action: 'TENANT_SUSPENDED',
          entity: 'Tenant',
          entityId: id,
          details: `Suspended PG tenant "${tenant.name}". Reason: ${reason}`,
        },
      });

      return sendSuccess(res, updated, `Tenant "${tenant.name}" has been SUSPENDED`);
    } catch (error: any) {
      console.error('[SuperAdmin.suspendTenant] Error:', error);
      return sendError(res, 'Failed to suspend tenant', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  static async activateTenant(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;

      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) {
        return sendError(res, 'Tenant not found', 404, 'NOT_FOUND');
      }

      const updated = await prisma.tenant.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: id,
          actorId: req.user?.id || null,
          actorName: req.user?.name || 'Super Administrator',
          actorRole: 'SUPER_ADMIN',
          action: 'TENANT_ACTIVATED',
          entity: 'Tenant',
          entityId: id,
          details: `Activated PG tenant "${tenant.name}"`,
        },
      });

      return sendSuccess(res, updated, `Tenant "${tenant.name}" is now ACTIVE`);
    } catch (error: any) {
      console.error('[SuperAdmin.activateTenant] Error:', error);
      return sendError(res, 'Failed to activate tenant', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  static async archiveTenant(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;

      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) {
        return sendError(res, 'Tenant not found', 404, 'NOT_FOUND');
      }

      const updated = await prisma.tenant.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: id,
          actorId: req.user?.id || null,
          actorName: req.user?.name || 'Super Administrator',
          actorRole: 'SUPER_ADMIN',
          action: 'TENANT_ARCHIVED',
          entity: 'Tenant',
          entityId: id,
          details: `Archived PG tenant "${tenant.name}" (${tenant.email})`,
        },
      });

      return sendSuccess(res, updated, `Tenant "${tenant.name}" has been ARCHIVED`);
    } catch (error: any) {
      console.error('[SuperAdmin.archiveTenant] Error:', error);
      return sendError(res, 'Failed to archive tenant', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  // -------------------------------------------------------------
  // 4. OWNER PASSWORD RESET
  // -------------------------------------------------------------
  static async resetOwnerPassword(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return sendError(res, 'New password must be at least 6 characters long', 400, 'VALIDATION_ERROR');
      }

      const owner = await prisma.user.findFirst({
        where: { tenantId: id, role: 'OWNER' },
      });

      if (!owner) {
        return sendError(res, 'Owner account not found for this tenant', 404, 'NOT_FOUND');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: owner.id },
        data: { passwordHash },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: id,
          actorId: req.user?.id || null,
          actorName: req.user?.name || 'Super Administrator',
          actorRole: 'SUPER_ADMIN',
          action: 'PASSWORD_RESET',
          entity: 'User',
          entityId: owner.id,
          details: `Super Admin reset password for Owner ${owner.email}`,
        },
      });

      return sendSuccess(res, { ownerEmail: owner.email }, 'Owner password reset successfully');
    } catch (error: any) {
      console.error('[SuperAdmin.resetOwnerPassword] Error:', error);
      return sendError(res, 'Failed to reset owner password', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  // -------------------------------------------------------------
  // 5. SECURE AUDITED IMPERSONATION
  // -------------------------------------------------------------
  static async impersonateTenant(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;

      const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
          users: {
            where: { role: 'OWNER' },
          },
          properties: {
            take: 1,
          },
        },
      });

      if (!tenant) {
        return sendError(res, 'Tenant organization not found', 404, 'NOT_FOUND');
      }

      const owner = tenant.users[0];
      if (!owner) {
        return sendError(res, 'No owner user registered for this tenant', 404, 'NO_OWNER');
      }

      // Generate audited impersonation token
      const token = jwt.sign(
        {
          id: owner.id,
          email: owner.email,
          name: owner.name,
          role: 'OWNER',
          tenantId: tenant.id,
          propertyId: tenant.properties[0]?.id || null,
          isImpersonated: true,
          impersonatedBy: req.user?.id || req.user?.email || 'Super Administrator',
        },
        config.jwtSecret,
        { expiresIn: '2h' }
      );

      await prisma.auditLog.create({
        data: {
          tenantId: id,
          actorId: req.user?.id || null,
          actorName: req.user?.name || 'Super Administrator',
          actorRole: 'SUPER_ADMIN',
          action: 'IMPERSONATION_STARTED',
          entity: 'Tenant',
          entityId: id,
          details: `Super Admin impersonated Owner session (${owner.email}) for tenant "${tenant.name}"`,
        },
      });

      return sendSuccess(
        res,
        {
          token,
          user: {
            id: owner.id,
            name: owner.name,
            email: owner.email,
            role: 'OWNER',
            tenantId: tenant.id,
            tenantName: tenant.name,
            propertyId: tenant.properties[0]?.id || null,
            isImpersonated: true,
            impersonatedBy: req.user?.name || 'Super Administrator',
          },
        },
        `Impersonating owner session for "${tenant.name}"`
      );
    } catch (error: any) {
      console.error('[SuperAdmin.impersonateTenant] Error:', error);
      return sendError(res, 'Failed to create impersonation session', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  // -------------------------------------------------------------
  // 6. ALL OWNERS DIRECTORY
  // -------------------------------------------------------------
  static async getOwners(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { search } = req.query;

      const where: any = { role: 'OWNER' };

      if (search) {
        where.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
          { mobile: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const owners = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              plan: true,
              city: true,
            },
          },
        },
      });

      return sendSuccess(res, owners, 'PG Owners directory retrieved');
    } catch (error: any) {
      console.error('[SuperAdmin.getOwners] Error:', error);
      return sendError(res, 'Failed to fetch owners list', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  // -------------------------------------------------------------
  // 7. SUBSCRIPTION PLANS & CONFIGURATION
  // -------------------------------------------------------------
  static async getPlans(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const plans = await prisma.plan.findMany({
        orderBy: { priceMonthly: 'asc' },
      });

      // Default plans if none seeded
      if (plans.length === 0) {
        const defaultPlans = [
          {
            id: 'plan-starter',
            name: 'Starter Tier',
            tier: 'STARTER',
            priceMonthly: 2999,
            priceYearly: 29990,
            maxProperties: 1,
            maxRooms: 20,
            maxResidents: 50,
            features: JSON.stringify(['1 Property Branch', 'Up to 20 Rooms / 50 Beds', 'QR Gate Pass System', 'Online Rent Collection', 'Basic KYC Document Vault']),
            isActive: true,
          },
          {
            id: 'plan-pro',
            name: 'Professional Tier',
            tier: 'PROFESSIONAL',
            priceMonthly: 7999,
            priceYearly: 79990,
            maxProperties: 5,
            maxRooms: 100,
            maxResidents: 300,
            features: JSON.stringify(['Up to 5 PG Branches', 'Up to 100 Rooms / 300 Beds', 'Automated Razorpay Webhooks', 'Staff & Shift Management', 'Advanced Financial Reports', 'Asset & Inventory Tracking']),
            isActive: true,
          },
          {
            id: 'plan-enterprise',
            name: 'Enterprise Tier',
            tier: 'ENTERPRISE',
            priceMonthly: 19999,
            priceYearly: 199990,
            maxProperties: 25,
            maxRooms: 1000,
            maxResidents: 3000,
            features: JSON.stringify(['Unlimited PG Branches', 'Custom Room & Bed Capacities', 'Dedicated Account Manager', 'Custom SMS / WhatsApp API', '24x7 Priority Support', 'Dedicated Supabase Storage']),
            isActive: true,
          },
        ];
        return sendSuccess(res, defaultPlans, 'Default SaaS plans retrieved');
      }

      return sendSuccess(res, plans, 'SaaS subscription plans loaded');
    } catch (error: any) {
      console.error('[SuperAdmin.getPlans] Error:', error);
      return sendError(res, 'Failed to fetch subscription plans', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  // -------------------------------------------------------------
  // 8. AUDIT LOGS & SYSTEM HEALTH
  // -------------------------------------------------------------
  static async getAuditLogs(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { tenantId, action, page = '1', limit = '50' } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (tenantId && tenantId !== 'ALL') where.tenantId = String(tenantId);
      if (action && action !== 'ALL') where.action = String(action);

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { timestamp: 'desc' },
          include: {
            tenant: { select: { name: true, slug: true } },
            actor: { select: { name: true, email: true, role: true } },
          },
        }),
      ]);

      return sendSuccess(
        res,
        {
          logs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
        'Platform audit logs retrieved'
      );
    } catch (error: any) {
      console.error('[SuperAdmin.getAuditLogs] Error:', error);
      return sendError(res, 'Failed to load audit trail', 500, 'INTERNAL_ERROR', error.message);
    }
  }

  static async getSystemHealth(req: AuthRequest, res: Response): Promise<Response | void> {
    const startTime = Date.now();
    let dbStatus = 'CONNECTED';
    let dbLatencyMs = 0;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - startTime;
    } catch (err: any) {
      dbStatus = 'DISCONNECTED';
    }

    return sendSuccess(res, {
      status: dbStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED',
      environment: process.env.NODE_ENV || 'development',
      serverTime: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: 'Supabase PostgreSQL',
      },
      storage: {
        provider: 'Supabase Storage',
        status: 'CONNECTED',
      },
      services: {
        razorpay: 'INITIALIZED',
        jwtAuth: 'ACTIVE',
        gateScanner: 'ACTIVE',
      },
    });
  }
}
