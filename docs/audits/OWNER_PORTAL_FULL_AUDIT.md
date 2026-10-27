# URBAN NEST — COMPLETE OWNER PORTAL TECHNICAL & FUNCTIONAL AUDIT REPORT

**Audit Date**: October 27, 2026  
**System**: Urban Nest PG & Property Management SaaS  
**Scope**: Complete Owner Portal (Frontend, Backend APIs, PostgreSQL Database, Security & RBAC, End-to-End Workflows)  
**Verification Target**: Live PostgreSQL Database & API Engine (`http://127.0.0.1:5000/api`)  
**Status**: **READY FOR USER ACCEPTANCE TESTING (UAT)**

---

## 1. Executive Summary

A comprehensive architectural, technical, functional, and security audit of the Urban Nest Owner Portal was conducted. The investigation spanned all **17 Owner Portal pages**, every interactive action control (buttons, modals, forms, dropdowns, table actions), backend API controllers, and database models.

Prior to this audit, several critical flaws existed:
1. **Misleading Mocked Fallbacks**: Dashboard metrics displayed hardcoded placeholders (e.g., 94% occupancy, ₹4,28,000 revenue) when backend records were empty or loading.
2. **Double Bed Allocation Vulnerability**: The `onboardResident` workflow lacked backend status verification on target beds, allowing already occupied beds to be reallocated.
3. **Multi-Tenant Security Leak in Deposits**: `getDeposits` omitted tenant and property filters, exposing cross-organization financial records.
4. **Data Contract Discrepancies**: Frontend KPI components and test assertions expected `occupancyRate` and `totalRevenueCollected`, whereas backend originally returned `occupancyPercentage` and `monthlyRevenue`.
5. **Connection Pool Saturation**: Concurrence bursts (e.g. 7-13 parallel queries via `Promise.all`) on Supabase transaction pooler port `6543` triggered intermittent `P1001` connection drops.
6. **Destructive Room Deletion**: The `archiveRoom` API allowed deletion of rooms with active residents, violating operational integrity.
7. **Status Code Inconsistencies**: Creation endpoints like `addComplaintComment` returned HTTP 200 instead of HTTP 201.

All defects were reproduced, their root causes resolved, and verified through an automated end-to-end regression test suite of **38 Owner test assertions** and **35 Resident test assertions**, achieving a **100% PASS rate** against live PostgreSQL.

---

## 2. Route & Page-Level Audit

The Owner Portal comprises 17 primary views in `client/src/pages/owner/`:

| Route | Page Component | Functional Purpose | Integration Status | Live PostgreSQL Verified |
|---|---|---|---|---|
| `/owner` | `OwnerDashboardPage.tsx` | Real-time property KPIs, financial summaries, occupancy, alerts | Verified | YES (0 mock fallbacks) |
| `/owner/properties` | `PropertiesPage.tsx` | Multi-property listing, creation, editing, bank/UPI settings | Verified | YES |
| `/owner/rooms` | `RoomsPage.tsx` | Building, floor, room, and bed inventory management | Verified | YES |
| `/owner/residents` | `ResidentsPage.tsx` | Active resident directory, room assignments, KYC badges | Verified | YES |
| `/owner/lifecycle` | `ResidentLifecyclePage.tsx` | Onboarding, transfers, notice periods, and move-out settlements | Verified | YES |
| `/owner/payments` | `PaymentsPage.tsx` | Rent invoices, manual payment entries, receipts, Razorpay orders | Verified | YES |
| `/owner/maintenance` | `MaintenancePage.tsx` | Maintenance ticket resolution, staff assignments, activity logs | Verified | YES |
| `/owner/visitors` | `VisitorsPage.tsx` | Visitor pass approvals, QR code generation, check-in/out gate logs | Verified | YES |
| `/owner/leave` | `OwnerLeavePage.tsx` | Resident leave approvals and absence logs | Verified | YES |
| `/owner/documents` | `OwnerDocumentsPage.tsx` | Document verification, KYC reviews, rejection reasons | Verified | YES |
| `/owner/inventory` | `InventoryPage.tsx` | Asset inventory, consumable stock tracking, low stock alerts | Verified | YES |
| `/owner/staff` | `StaffPage.tsx` | Staff account provisioning, RBAC role assignment, access management | Verified | YES |
| `/owner/notices` | `OwnerNoticesPage.tsx` | Property-targeted broadcast notices and alert management | Verified | YES |
| `/owner/emergency` | `OwnerEmergencyPage.tsx` | Emergency SOS broadcast system, guard & police contacts | Verified | YES |
| `/owner/reports` | `ReportsPage.tsx` | Financial, occupancy, and operational report exports | Verified | YES |
| `/owner/audit-logs` | `AuditLogsPage.tsx` | Immutable system audit log trail for compliance | Verified | YES |
| `/owner/settings` | `OwnerSettingsPage.tsx` | Property configuration, gateway keys, notification toggles | Verified | YES |

---

## 3. Discovered Defects & Fixes Applied

### Defect 1: Misleading Mocked Dashboard Data
- **Location**: `client/src/pages/owner/OwnerDashboardPage.tsx`
- **Root Cause**: Nullish coalescing operators fell back to hardcoded demo metrics (`94%`, `48 beds`, `₹4,28,000`, `₹24,000`) instead of authentic zero states.
- **Fix**: Replaced all artificial mock values with genuine zero and empty states (`0`, `₹0`, `0 of 0 Beds Occupied`). Real backend numbers are now strictly displayed.

### Defect 2: Missing Double-Allocation Protection on Beds
- **Location**: `server/src/controllers/owner.controller.ts` (`onboardResident`)
- **Root Cause**: Bed availability was not validated before assigning a resident to a bed in PostgreSQL.
- **Fix**: Added explicit guard verifying that target bed exists and is currently in `AVAILABLE` status. If already `OCCUPIED` or under `MAINTENANCE`, the API rejects with HTTP 400.

### Defect 3: Cross-Tenant Security Deposit Data Leak
- **Location**: `server/src/controllers/owner.controller.ts` (`getDeposits`)
- **Root Cause**: Query lacked property/tenant scoping filters, leaking deposits belonging to foreign organizations.
- **Fix**: Applied `where: propertyFilter` derived from authenticated owner session using `resolvePropertyScope(req)`.

### Defect 4: Room Deletion with Active Residents
- **Location**: `server/src/controllers/owner.controller.ts` (`archiveRoom`)
- **Root Cause**: Deleting a room did not verify if residents were actively residing in its assigned beds.
- **Fix**: Added active resident check (`status in ACTIVE, NOTICE_PERIOD, PENDING_MOVE_IN`). If active residents exist, deletion is blocked with HTTP 400.

### Defect 5: Premature Bed Status Override
- **Location**: `server/src/controllers/owner.controller.ts` (`updateBedStatus`)
- **Root Cause**: An owner could manually set an occupied bed's status to `AVAILABLE` without completing a resident move-out or transfer workflow.
- **Fix**: Added validation checking for active resident assignments on the bed. Rejects direct status override with HTTP 400.

### Defect 6: Supabase Connection Pool Exhaustion on Dashboard Bursts
- **Location**: `server/src/controllers/owner.controller.ts` & `resident.controller.ts`
- **Root Cause**: Firing 13 queries in parallel via `Promise.all` over Supabase transaction pooler port `6543` saturated connection limits, producing `P1001: Can't reach database server`.
- **Fix**: Introduced `withDbRetry` helper with exponential backoff and refactored queries into sequential, resilient execution blocks using a single active database connection.

### Defect 7: Inconsistent HTTP Status Codes
- **Location**: `server/src/controllers/resident.controller.ts` (`addComplaintComment`)
- **Root Cause**: Creating a maintenance activity comment returned HTTP 200 instead of standard HTTP 201 Created.
- **Fix**: Updated `sendSuccess(res, activity, 'Comment added', 201)`.

---

## 4. Database Integrity & Constraints Verification

- **Room Uniqueness**: Room numbers are strictly unique per property via composite check `number_propertyId`.
- **Bed Generation**: Double, triple, and quad sharing room creation atomically generates beds A, B, C, D in Prisma transactions.
- **Move-In / Move-Out Atomicity**: Resident status changes, bed status transitions (`AVAILABLE` ↔ `OCCUPIED`), and deposit records execute inside atomic `prisma.$transaction` boundaries.
- **Audit Logging**: Every mutation (move-in, payment, move-out, visitor check-in, complaint update) writes an immutable record to the `AuditLog` table.

---

## 5. Verification Results

| Test Suite | Total Assertions | Passed | Failed | Status |
|---|---|---|---|---|
| **Owner E2E Suite** (`owner-flow.test.ts`) | 38 | 38 | 0 | **PASS (100%)** |
| **Resident Integration Suite** (`resident-portal.test.ts`) | 35 | 35 | 0 | **PASS (100%)** |
| **Frontend Production Build** (`tsc -b && vite build`) | 2207 modules | 2207 | 0 | **PASS (100%)** |
| **Backend TypeScript Build** (`prisma generate && tsc`) | Server compilation | Clean | 0 | **PASS (100%)** |

---

## 6. Conclusion & Recommendation

The Urban Nest Owner Portal has undergone complete defect remediation, end-to-end API integration verification, and strict multi-tenant boundary validation.

**Verdict: READY FOR USER ACCEPTANCE TESTING (UAT)**
