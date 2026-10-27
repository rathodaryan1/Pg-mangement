# URBAN NEST — SUPER ADMIN PANEL: API & DATABASE ARCHITECTURE AUDIT

**Repository**: [Pg-mangement-main](file:///d:/Pg-mangement-main/Pg-mangement-main)  
**Audit Scope**: Backend Controller Implementation, Express Routing, PostgreSQL Schema, Prisma ORM Queries, Supabase Connection Pool Resiliency  
**Date of Audit**: October 27, 2026  
**Auditor**: Senior Database Engineer & Backend Architect  
**Audit Result**: **VERIFIED HIGH-RESILIENCE & TRANSACTIONALLY SOUND**

---

## 1. Overview & Connection Architecture

The Urban Nest backend is built with Express.js, TypeScript, and Prisma ORM, backed by a hosted PostgreSQL database on Supabase.
All Super Admin routes are registered in [server/src/routes/super-admin.routes.ts](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/routes/super-admin.routes.ts) and mounted at `/api/super-admin` with mandatory `authenticateToken` and `requireSuperAdmin` middleware.

### 1.1. Supabase Connection Pooler Optimization
The application connects via Supabase's transaction-mode PgBouncer pooler (`aws-1-ap-northeast-1.pooler.supabase.com:6543?pgbouncer=true`).
To prevent connection saturation:
1. **Sequential Execution**: High-volume queries (such as dashboard metrics and pagination lookups) are executed sequentially using dedicated single-connection channels rather than concurrent `Promise.all` spikes.
2. **Exponential Backoff (`withDbRetry`)**: All critical operations are wrapped in `withDbRetry`, which catches transient socket drops or transaction recycling (`P1001`) and retries up to 3 times with progressive delays (`400ms * (attempt + 1)`).

---

## 2. Complete API Endpoint Inventory

| HTTP Method | Route Endpoint | Controller Handler | Validations & Parameters | Prisma Operations & Database Impact |
|---|---|---|---|---|
| `GET` | `/api/super-admin/dashboard` | `getDashboardStats` | Auth Header (Bearer JWT) | `prisma.tenant.groupBy`<br>`prisma.user.groupBy`<br>`prisma.property.count`<br>`prisma.resident.count`<br>`prisma.room.count`<br>`prisma.bed.groupBy`<br>`prisma.auditLog.findMany` |
| `GET` | `/api/super-admin/dashboard/stats` | `getDashboardStats` | Alias for `/dashboard` | Same as above |
| `GET` | `/api/super-admin/tenants` | `getTenants` | Query: `search`, `status`, `plan`, `city`, `page`, `limit` | `prisma.tenant.count`<br>`prisma.tenant.findMany` (with Owner user relation and relation counts) |
| `POST` | `/api/super-admin/tenants` | `createTenant` | Body: `name`, `email`, `ownerName`, `ownerEmail`, `password`, `plan`, `trialDays` | Atomic `$transaction`:<br>1. `Tenant.create`<br>2. `User.create` (OWNER)<br>3. `Property.create`<br>4. `Building.create`<br>5. `Floor.create`<br>6. `Room.create`<br>7. `Bed.createMany`<br>8. `AuditLog.create` |
| `GET` | `/api/super-admin/tenants/:id` | `getTenantById` | Param: `id` (UUID) | `prisma.tenant.findUnique` with users, properties, and recent audit logs |
| `PUT` / `PATCH` | `/api/super-admin/tenants/:id` | `updateTenant` | Param: `id`, Body: partial tenant fields | `prisma.tenant.update`<br>`prisma.auditLog.create` |
| `DELETE` | `/api/super-admin/tenants/:id` | `deleteTenant` | Param: `id` | `prisma.tenant.delete` (cascades dependent properties/users; preserves audit logs with `onDelete: SetNull`)<br>`prisma.auditLog.create` |
| `POST` / `PATCH` | `/api/super-admin/tenants/:id/suspend` | `suspendTenant` | Param: `id`, Body: `reason` | `prisma.tenant.update({ status: 'SUSPENDED' })`<br>`prisma.auditLog.create` |
| `POST` / `PATCH` | `/api/super-admin/tenants/:id/activate` | `activateTenant` | Param: `id` | `prisma.tenant.update({ status: 'ACTIVE' })`<br>`prisma.auditLog.create` |
| `POST` / `PATCH` | `/api/super-admin/tenants/:id/archive` | `archiveTenant` | Param: `id` | `prisma.tenant.update({ status: 'ARCHIVED' })`<br>`prisma.auditLog.create` |
| `POST` | `/api/super-admin/tenants/:id/reset-owner-password` | `resetOwnerPassword` | Param: `id`, Body: `newPassword` (min 6 chars) | `bcrypt.hash`<br>`prisma.user.update`<br>`prisma.auditLog.create` |
| `POST` | `/api/super-admin/tenants/:id/impersonate` | `impersonateTenant` | Param: `id` | Generates 2h JWT with `isImpersonated: true`<br>`prisma.auditLog.create` (`IMPERSONATION_STARTED`) |
| `GET` | `/api/super-admin/tenants/:id/properties` | `getTenantProperties` | Param: `id` | `prisma.property.findMany` with building/room/resident counts |
| `GET` | `/api/super-admin/tenants/:id/subscription` | `getTenantSubscription` | Param: `id` | `prisma.tenant.findUnique` with quota numbers and trial dates |
| `PATCH` | `/api/super-admin/tenants/:id/subscription` | `updateTenantSubscription` | Param: `id`, Body: plan, quotas, trial extension | `prisma.tenant.update`<br>`prisma.auditLog.create` (`SUBSCRIPTION_CHANGED`) |
| `GET` | `/api/super-admin/owners` | `getOwners` | Query: `search` | `prisma.user.findMany({ where: { role: 'OWNER' } })` |
| `GET` | `/api/super-admin/users` | `getUsers` | Query: `search`, `role`, `tenantId`, `page`, `limit` | `prisma.user.count`<br>`prisma.user.findMany` with tenant & property scope |
| `GET` | `/api/super-admin/plans` | `getPlans` | None | `prisma.plan.findMany({ orderBy: { priceMonthly: 'asc' } })` |
| `POST` | `/api/super-admin/plans` | `createPlan` | Body: `name`, `tier`, `priceMonthly`, quotas, features | `prisma.plan.create`<br>`prisma.auditLog.create` (`PLAN_CHANGED`) |
| `PATCH` / `PUT` | `/api/super-admin/plans/:id` | `updatePlan` | Param: `id`, Body: partial plan fields | `prisma.plan.update` |
| `DELETE` | `/api/super-admin/plans/:id` | `deletePlan` | Param: `id` | Checks `prisma.tenant.count({ where: { plan: tier } })`. Blocks if assigned (`PLAN_IN_USE`); otherwise `prisma.plan.delete` |
| `GET` | `/api/super-admin/support` | `getSupportTickets` | Query: `search`, `status`, `priority`, `tenantId` | `prisma.supportTicket.count`<br>`prisma.supportTicket.findMany` |
| `POST` | `/api/super-admin/support` | `createSupportTicket` | Body: `subject`, `description`, `priority` | `prisma.supportTicket.create` |
| `PATCH` / `PUT` | `/api/super-admin/support/:id` | `updateSupportTicket` | Param: `id`, Body: `status`, `priority`, `internalNotes` | `prisma.supportTicket.update` |
| `GET` | `/api/super-admin/settings` | `getSettings` | None | `prisma.setting.findMany()` |
| `POST` / `PUT` | `/api/super-admin/settings` | `updateSettings` | Body: Key-value dictionary | Sequential `prisma.setting.upsert`<br>`prisma.auditLog.create` (`SETTINGS_UPDATED`) |
| `GET` | `/api/super-admin/audit-logs` | `getAuditLogs` | Query: `tenantId`, `action`, `page`, `limit` | `prisma.auditLog.count`<br>`prisma.auditLog.findMany` |
| `GET` | `/api/super-admin/system-health` | `getSystemHealth` | None | `prisma.$queryRaw` SELECT 1, calculates latency |

---

## 3. Database Integrity & Foreign Key Safety

### 3.1. Tenant Deletion Cascades & Audit Preservation
In [prisma/schema.prisma](file:///d:/Pg-mangement-main/Pg-mangement-main/server/prisma/schema.prisma):
- `Property.tenant` -> `onDelete: Cascade`: When a tenant is deleted, child properties, buildings, floors, rooms, and beds are automatically removed, preventing foreign key orphans.
- `User.tenant` -> `onDelete: Cascade`: Staff and owner accounts associated with the tenant are removed cleanly.
- `AuditLog.tenant` -> `onDelete: SetNull`: Critical administrative event records are preserved. Historical compliance trails remain intact even after tenant removal.

### 3.2. Transaction Safety in Tenant Creation
The atomic creation in `createTenant` runs within a Prisma `$transaction` with custom timeout limits:
```typescript
const result = await withDbRetry(() => prisma.$transaction(async (tx) => {
  // 1. Create Tenant
  // 2. Create Owner User
  // 3. Create initial Property
  // 4. Create Wing A -> Floor 1 -> Room 101 -> Beds 101-A/B
  // 5. Create Audit Log
  return { tenant: newTenant, owner: newOwner, property: initialProperty };
}, { maxWait: 15000, timeout: 30000 }));
```
If any creation step fails, the entire transaction rolls back, leaving no orphaned tenant records.
