# Dynamic Data Integration Report — UI to Database Mapping

**Project:** Urban Nest PG Management SaaS  
**Date:** October 2026  
**Status:** 100% Dynamic & Persisted

---

## 1. Role-by-Role Architecture & Data Flow Mapping

Every role dashboard, operation, and workflow in Urban Nest is now verified to pull directly from authenticated backend routes, Express controllers, and PostgreSQL via Prisma ORM.

### Role 1: Super Admin (Platform Owner)
- **UI Pages:** `SuperAdminDashboardPage.tsx`, `SuperAdminTenantsPage.tsx`, `SuperAdminPlansPage.tsx`, `SuperAdminRevenuePage.tsx`
- **Frontend API Service:** `superAdminApi.ts` (`getDashboard()`, `getTenants()`, `getPlans()`)
- **Backend Routes:** `server/src/routes/super-admin.routes.ts` (`/api/super-admin/dashboard/stats`, `/api/super-admin/tenants`, `/api/super-admin/plans`)
- **Backend Controller:** `server/src/controllers/super-admin.controller.ts` (`getDashboardStats`, `getTenants`, `getPlans`, `createPlan`, `updatePlan`)
- **Prisma Models Queried:** `prisma.tenant`, `prisma.property`, `prisma.user`, `prisma.resident`, `prisma.bed`, `prisma.room`, `prisma.plan`, `prisma.auditLog`
- **Dynamic Derivations:** Total Tenants, Active Subscriptions, MRR (calculated dynamically against `prisma.plan.priceMonthly`), Bed Occupancy Rate.

### Role 2: PG Owner
- **UI Pages:** `OwnerDashboardPage.tsx`, `CommandCenterPage.tsx`, `PropertiesPage.tsx`, `RoomsPage.tsx`, `ResidentsPage.tsx`
- **Frontend API Service:** `ownerApi.ts`, `operationsApi.ts`
- **Backend Routes:** `server/src/routes/owner.routes.ts` (`/api/owner/dashboard`, `/api/owner/rooms`, `/api/owner/residents`)
- **Backend Controller:** `server/src/controllers/owner.controller.ts` (`getDashboard`, `getRooms`, `getResidents`, `createRoom`, `deallocateBed`)
- **Prisma Models Queried:** `prisma.property`, `prisma.room`, `prisma.bed`, `prisma.resident`, `prisma.payment`, `prisma.complaint`, `prisma.visitorRequest`
- **Tenant Isolation:** Scoped server-side via `req.user.tenantId` and `propertyFilter`.

### Role 3: Property Manager
- **UI Pages:** `OwnerDashboardPage.tsx`, `RoomsPage.tsx`, `VisitorsPage.tsx`, `MaintenancePage.tsx`
- **Frontend API Service:** `ownerApi.ts`, `saasApi.ts`
- **Backend Controller:** `server/src/controllers/owner.controller.ts`
- **Prisma Models Queried:** `prisma.property`, `prisma.room`, `prisma.bed`, `prisma.visitorRequest`, `prisma.complaint`
- **Permissions:** Scoped to manager's assigned property ID.

### Role 4: Resident
- **UI Pages:** `ResidentDashboardPage.tsx`, `ResidentRoomPage.tsx`, `ResidentPaymentsPage.tsx`, `ResidentVisitorsPage.tsx`
- **Frontend API Service:** `residentApi.ts` (`getDashboard()`, `getRoomDetails()`, `getResidentQRPass()`, `getPayments()`, `createVisitorRequest()`)
- **Backend Routes:** `server/src/routes/resident.routes.ts` (`/api/resident/dashboard`, `/api/resident/qr-pass`, `/api/resident/payments`, `/api/resident/visitors`)
- **Backend Controller:** `server/src/controllers/resident.controller.ts` (`getDashboard`, `getResidentQRPass`, `getPayments`, `createVisitorRequest`)
- **Prisma Models Queried:** `prisma.resident`, `prisma.bed`, `prisma.room`, `prisma.payment`, `prisma.visitorRequest`, `prisma.notice`
- **Security Check:** Verified against `req.user.id` and active allocation status. If no allocation exists, gates pass renders inactive without mock values.

### Role 5: Cook / Head Chef
- **UI Pages:** `CookDashboardPage.tsx`
- **Frontend API Service:** `saasApi.ts` (`getCookDashboard()`, `getKitchenMenu()`)
- **Backend Routes:** `server/src/routes/kitchen.routes.ts` (`/api/kitchen/menus`, `/api/kitchen/dashboard`, `/api/kitchen/attendance`)
- **Backend Controller:** `server/src/controllers/kitchen.controller.ts` (`getDashboard`, `getMenus`, `recordAttendance`)
- **Prisma Models Queried:** `prisma.mealMenu`, `prisma.mealAttendance`, `prisma.inventoryItem`

### Role 6: Security Guard
- **UI Pages:** `SecurityGuardPage.tsx`, `GateVerifyPage.tsx`
- **Frontend API Service:** `saasApi.ts`, `api.ts`
- **Backend Routes:** `server/src/routes/security.routes.ts`, `server/src/routes/index.ts` (`/api/security/dashboard`, `/api/gate/verify/:token`, `/api/gate/check-in/:token`, `/api/gate/check-out/:token`)
- **Backend Controller:** `server/src/controllers/security.controller.ts`, `server/src/controllers/owner.controller.ts` (`verifyVisitorQRByToken`, `gateCheckIn`, `gateCheckOut`)
- **Prisma Models Queried:** `prisma.visitorRequest`, `prisma.resident`, `prisma.bed`, `prisma.operationalTask`
- **Security Check:** Cryptographic QR token verification against database status (PENDING, APPROVED, CHECKED_IN, CHECKED_OUT, REJECTED).

### Role 7: Housekeeping Staff
- **UI Pages:** `HousekeepingPage.tsx`
- **Frontend API Service:** `saasApi.ts` (`getHousekeepingTasks()`, `updateHousekeepingTask()`)
- **Backend Routes:** `server/src/routes/housekeeping.routes.ts` (`/api/housekeeping/tasks`)
- **Backend Controller:** `server/src/controllers/housekeeping.controller.ts` (`getTasks`, `updateTaskStatus`)
- **Prisma Models Queried:** `prisma.operationalTask`, `prisma.room`, `prisma.floor`

### Role 8: Maintenance Technician
- **UI Pages:** `MaintenancePage.tsx`
- **Frontend API Service:** `ownerApi.ts` (`getComplaints()`, `updateComplaintStatus()`, `getTasks()`)
- **Backend Routes:** `server/src/routes/owner.routes.ts` (`/api/owner/complaints`, `/api/owner/complaints/:id/status`)
- **Backend Controller:** `server/src/controllers/owner.controller.ts` (`getComplaints`, `updateComplaintStatus`)
- **Prisma Models Queried:** `prisma.complaint`, `prisma.room`, `prisma.resident`

### Role 9: Front Desk Receptionist
- **UI Pages:** `VisitorsPage.tsx`, `ResidentsPage.tsx`
- **Frontend API Service:** `ownerApi.ts` (`getVisitors()`, `getResidents()`)
- **Backend Routes:** `server/src/routes/owner.routes.ts`
- **Backend Controller:** `server/src/controllers/owner.controller.ts`
- **Prisma Models Queried:** `prisma.visitorRequest`, `prisma.resident`, `prisma.property`

### Role 10: Accountant
- **UI Pages:** `PaymentsPage.tsx`, `ReportsPage.tsx`, `ReconciliationPage.tsx`
- **Frontend API Service:** `ownerApi.ts` (`getPayments()`, `createCharge()`, `getReports()`, `getReconciliation()`)
- **Backend Routes:** `server/src/routes/owner.routes.ts` (`/api/owner/payments`, `/api/owner/reports`, `/api/owner/reconciliation`)
- **Backend Controller:** `server/src/controllers/owner.controller.ts` (`getPayments`, `createCharge`, `getReports`, `getReconciliation`)
- **Prisma Models Queried:** `prisma.payment`, `prisma.expense`, `prisma.securityDeposit`, `prisma.paymentReceipt`

---

## 2. Unresolved Integration Gaps
- None. All 10 role flows and operations are backed by active PostgreSQL tables and multi-tenant scoped Prisma queries.
