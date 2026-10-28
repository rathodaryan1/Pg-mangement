# Urban Nest — Complete Portal & Login Credentials Audit

**Date**: October 28, 2026  
**Audit Type**: Read-Only Portal, Authentication & Credential Inventory  
**Auditor**: Senior Full-Stack SaaS Architect & Security Lead  
**Scope**: All frontend routes, auth controllers, database models, seed scripts, role guards, and live database users.

---

## 1. Complete Portal Inventory

Urban Nest PG Management implements 8 distinct portals and consoles across platform administration, property management, resident self-service, staff operations, and public guest touchpoints.

| Portal Name | Primary Frontend Route(s) | Supported User Role(s) | Implementation Status | Main Features & Capabilities | Login & Redirect Flow Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin Platform Console** | `/super-admin/dashboard`<br>`/super-admin/*` | `SUPER_ADMIN` | **Fully Implemented** | Tenant Onboarding, Plan Management, Subscriptions, Platform Revenue, Audit Logs, System Health, Impersonation Engine. | **Working** (`/super-admin/login` or `/login` via *Super Admin* tab redirects to `/super-admin/dashboard`). |
| **PG Owner & Manager Portal** | `/owner/dashboard`<br>`/owner/*` | `OWNER`, `MANAGER` | **Fully Implemented** | Command Center, Visual Bed Occupancy, Resident Lifecycle Kanban, Unified Tasks, Attendance & Advances, Payroll, Reconciliation, Utilities, Compliance, Agreement Generator. | **Working** (`/login` via *PG Owner* tab redirects to `/owner/dashboard`). |
| **Resident Self-Service Portal** | `/resident/dashboard`<br>`/resident/*` | `RESIDENT` | **Fully Implemented** | Room Details, Meal RSVP & Menus, Rent Payments & Receipts, Digital Visitor QR Passes, Complaint Tracker with Timeline, Leave Requests, KYC Documents, Profile & Password Change. | **Working** (`/login` via *Resident* tab redirects to `/resident/dashboard`). |
| **Kitchen & Mess Operations Portal** | `/staff/kitchen`<br>(alias `/cook/dashboard`) | `COOK`<br>*(also viewable by `OWNER`, `MANAGER`, `SUPER_ADMIN`)* | **Fully Implemented** | Real-time Headcount Forecasting, Dietary Preferences (Jain, Vegan, Gluten-Free), Meal Attendance QR/Checklist, Stock Movement, Waste Tracker. | **Partially Working** (Owner/Manager can access; Cook accounts can authenticate if created, but **no demo account exists**). |
| **Security & Gate Desk Portal** | `/staff/security`<br>(alias `/security/dashboard`) | `SECURITY_GUARD`<br>*(also viewable by `OWNER`, `MANAGER`, `SUPER_ADMIN`)* | **Fully Implemented** | Real-time Camera QR Barcode Scanner, Visitor Verification, Check-In/Check-Out Timestamping, Direct Walk-In Entry, Emergency SOS Monitor. | **Partially Working** (Owner/Manager can access; Security Guard accounts can authenticate if created, but **no demo account exists**). |
| **Housekeeping & Facility Care Portal** | `/staff/housekeeping`<br>(alias `/housekeeping/dashboard`) | `HOUSEKEEPING`<br>*(also viewable by `OWNER`, `MANAGER`, `SUPER_ADMIN`)* | **Fully Implemented** | Room Cleaning Checklist, Bed Turnover Tracking, Parcel Delivery Management, Deep Clean Scheduling, Linen Inventory. | **Partially Working** (Owner/Manager can access; Housekeeping accounts can authenticate if created, but **no demo account exists**). |
| **Maintenance Staff Portal** | `/owner/maintenance` | `MAINTENANCE`, `OWNER`, `MANAGER` | **Partially Implemented (Embedded)** | Work Order Dispatch, Electrician / Plumber Task Queue, Ticket Resolution Comments, Preventive Maintenance. | **Blocked for Staff** (No dedicated `/staff/maintenance` route; `LoginPage.tsx` blocks role `MAINTENANCE`). |
| **Public Guest & Booking Portal** | `/`<br>`/p/:slug`<br>`/gate/verify/:token` | *Unauthenticated / Public* | **Fully Implemented** | Marketing Landing Page, Public Property Bed Booking with Instant Token, Public Gate QR Verification without credentials. | **Working** (No authentication required). |

---

## 2. Authentication Architecture & Login Methods

### A. Unified vs. Separate Login Pages
- **Primary Login Page**: `client/src/pages/auth/LoginPage.tsx` mounted at `/login`.
- **Super Admin Alias**: `/super-admin/login` renders the identical `LoginPage` component.
- **Login Tabs**: The UI displays three role category selector tabs:
  1. `Super Admin`
  2. `PG Owner`
  3. `Resident`

### B. Role Detection & Redirection Mechanics
1. User enters Email and Password and selects one of the 3 tabs.
2. Form submits `POST /api/auth/login` with `{ email, password }`.
3. The server authenticates against PostgreSQL `User` record, verifies `bcrypt` password hash, and returns JWT with payload `{ id, email, role, tenantId, propertyId, residentId }`.
4. Client stores user profile in `localStorage` under key `urbannest_user_session`.
5. `LoginPage.tsx` validates the server's returned `actualRole` against the active tab:
   - If Tab is `SUPER_ADMIN` and `actualRole !== 'SUPER_ADMIN'` $\rightarrow$ Rejects with notice.
   - If Tab is `OWNER` and `actualRole` is NOT in `['OWNER', 'MANAGER', 'STAFF', 'COOK', 'SECURITY_GUARD', 'HOUSEKEEPING']` $\rightarrow$ Rejects with notice.
   - If Tab is `RESIDENT` and `actualRole !== 'RESIDENT'` $\rightarrow$ Rejects with notice.
6. Upon validation, the client routes the user:
   - `SUPER_ADMIN` $\rightarrow$ `/super-admin/dashboard`
   - `RESIDENT` $\rightarrow$ `/resident/dashboard`
   - `COOK` $\rightarrow$ `/staff/kitchen`
   - `SECURITY_GUARD` $\rightarrow$ `/staff/security`
   - `HOUSEKEEPING` $\rightarrow$ `/staff/housekeeping`
   - `OWNER` / `MANAGER` $\rightarrow$ `/owner/dashboard`

### C. Staff Account Creation & Credential Provisioning
- **Creation Endpoint**: `POST /api/owner/staff` in `server/src/controllers/owner.controller.ts`.
- **Form UI**: `client/src/pages/owner/StaffPage.tsx` modal (*"Register New Staff Member"*).
- **Default Password**: The backend automatically sets newly created staff passwords to `'admin123'` hashed with `bcrypt`:
  ```typescript
  // server/src/controllers/owner.controller.ts: Line 2037
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);
  ```

### D. Password Management & Reset Facilities
1. **Resident Self-Service**:
   - Route: `/resident/profile`
   - Endpoint: `POST /api/resident/change-password`
   - Requires: `currentPassword`, `newPassword` (minimum 6 characters).
2. **Super Admin Reset for Owners**:
   - Route: `/super-admin/tenants/:id`
   - Endpoint: `POST /api/super-admin/tenants/:id/reset-owner-password`
   - Allows Super Admin to inject a temporary password for any tenant owner.
3. **Owner & Staff Self-Service**:
   - **MISSING**: There is currently no UI form or API endpoint for an Owner, Manager, Cook, Guard, or Cleaner to change their own password.
4. **Public "Forgot Password"**:
   - **MISSING**: There is no self-service email/SMS OTP reset flow on `/login`.

---

## 3. Discovered Authentication & Role-Routing Bugs

### Bug 1: Role `MAINTENANCE` Blocked from Logging In
- **Location**: `client/src/pages/auth/LoginPage.tsx` (Line 40)
- **Problem**:
  ```typescript
  if (selectedRole === 'OWNER' && !['OWNER', 'MANAGER', 'STAFF', 'COOK', 'SECURITY_GUARD', 'HOUSEKEEPING'].includes(actualRole)) {
    throw new Error('Your account does not have access to the Management / Staff portal.');
  }
  ```
  `'MAINTENANCE'` is omitted from the allowed array!
- **Impact**: The existing seeded maintenance technician `repair.gurgaon@pg.com` (Kamal Electrician) cannot log in. Submitting valid credentials under the *PG Owner* tab results in: *"Your account does not have access to the Management / Staff portal."*

### Bug 2: Roles `RECEPTIONIST` and `ACCOUNTANT` Blocked from Logging In
- **Location**: `client/src/pages/auth/LoginPage.tsx` (Line 40)
- **Problem**: Roles `RECEPTIONIST` and `ACCOUNTANT` are defined in Prisma `UserRole` and seeded in `seed.ts`, but are excluded from the `selectedRole === 'OWNER'` whitelist on `LoginPage.tsx`.
- **Impact**: `reception.gurgaon@pg.com` cannot log in through the frontend form.

### Bug 3: Staff Registration Role Value Mismatch (`SECURITY` vs `SECURITY_GUARD`)
- **Location**: `client/src/pages/owner/StaffPage.tsx` (Line 683)
- **Problem**:
  ```typescript
  { label: 'Security Guard', value: 'SECURITY' }
  ```
  The database schema defines `enum UserRole { SECURITY_GUARD }`. Submitting `role: 'SECURITY'` fails Prisma enum validation upon creation.

### Bug 4: `COOK` Role Missing from Staff Registration Dropdown
- **Location**: `client/src/pages/owner/StaffPage.tsx` (Lines 680–687)
- **Problem**: The dropdown only lists `MANAGER`, `MAINTENANCE`, `SECURITY`, `HOUSEKEEPING`, `RECEPTIONIST`, `ACCOUNTANT`. An owner cannot select or provision a `COOK` from the management UI.

### Bug 5: No Dedicated Staff Route for Maintenance Technician
- **Location**: `client/src/App.tsx` (Lines 290–325)
- **Problem**: Dedicated staff routes exist for `/staff/kitchen`, `/staff/security`, and `/staff/housekeeping`. There is no `/staff/maintenance`. Maintenance complaints are mounted under `/owner/maintenance` inside `<OwnerLayout>`.

---

## 4. Verified Demo Accounts & Credentials Inventory

> **Note on Security**: All credentials listed below are public demo credentials explicitly defined in the repository seed script (`server/prisma/seed.ts`) and project documentation (`URBAN_NEST_SUPER_ADMIN_IMPLEMENTATION_REPORT.md`). No live or private production secrets are exposed.

| Role | Portal Tab | Email | Seeded Demo Password | Database Status | Target Enclave / Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | *Super Admin* | `superadmin@urbannest.io` | `superadmin123` | **Confirmed Active in DB** | Platform-wide SaaS Administration |
| **Super Admin** (Alt) | *Super Admin* | `superadmin@pg.com` | `admin123` | **Confirmed Active in DB** | Platform-wide SaaS Administration |
| **PG Owner** | *PG Owner* | `owner@pg.com` | `admin123` | **Confirmed Active in DB** | Urban Nest Premium PG (Navrangpura, Ahmedabad) |
| **PG Manager** | *PG Owner* | `manager.gurgaon@pg.com` | `admin123` | **Confirmed Active in DB** | Property Manager (Navrangpura) |
| **Resident 1** | *Resident* | `aakash.v@gmail.com` | `admin123` | **Confirmed Active in DB** | Resident (Room 101, Bed 101-A, Single AC) |
| **Resident 2** | *Resident* | `sneha.rao@yahoo.com` | `admin123` | **Confirmed Active in DB** | Resident (Room 103, Bed 103-A, Double AC) |
| **Resident 3** | *Resident* | `vikram.singh@outlook.com` | `admin123` | **Confirmed Active in DB** | Resident (Room 201, Bed 201-A, Triple Non-AC) |
| **Maintenance Staff** | *PG Owner* | `repair.gurgaon@pg.com` | `admin123` | **Confirmed Active in DB** *(Login blocked by Bug 1)* | Maintenance Technician (Kamal Electrician) |
| **Receptionist** | *PG Owner* | `reception.gurgaon@pg.com` | `admin123` | **Confirmed Active in DB** *(Login blocked by Bug 2)* | Front Desk (Sneha Sharma) |
| **Cook / Chef** | *PG Owner* | *None Seeded* | N/A | **Missing in DB** | Kitchen & Mess Operations |
| **Security Guard** | *PG Owner* | *None Seeded* | N/A | **Missing in DB** | Gate & Visitor Security Desk |
| **Housekeeping** | *PG Owner* | *None Seeded* | N/A | **Missing in DB** | Facility & Turnover Operations |

---

## 5. Portal Access & Login Status Matrix

### Category A: Portals That Can Currently Be Logged Into Directly
1. **Super Admin Portal** (`/super-admin/dashboard`):
   - Login via `superadmin@urbannest.io` (`superadmin123`) or `superadmin@pg.com` (`admin123`).
2. **PG Owner Portal** (`/owner/dashboard`):
   - Login via `owner@pg.com` (`admin123`).
3. **PG Manager Console** (`/owner/dashboard`):
   - Login via `manager.gurgaon@pg.com` (`admin123`).
4. **Resident Portal** (`/resident/dashboard`):
   - Login via `aakash.v@gmail.com` (`admin123`), `sneha.rao@yahoo.com` (`admin123`), or `vikram.singh@outlook.com` (`admin123`).
5. **Staff Portals via Owner / Manager Delegated Access**:
   - An authenticated Owner or Manager can directly navigate to and operate:
     - Kitchen Operations: `/staff/kitchen` or `/owner/kitchen`
     - Security Guard Desk: `/staff/security` or `/owner/security`
     - Housekeeping Care: `/staff/housekeeping` or `/owner/housekeeping`
     - Maintenance Tickets: `/owner/maintenance`

### Category B: Portals with Missing or Blocked Credentials
1. **Cook Portal (`/staff/kitchen`)**:
   - Fully implemented, but no demo user with role `COOK` exists in `seed.ts` or PostgreSQL.
2. **Security Guard Portal (`/staff/security`)**:
   - Fully implemented, but no demo user with role `SECURITY_GUARD` exists in `seed.ts` or PostgreSQL.
3. **Housekeeping Portal (`/staff/housekeeping`)**:
   - Fully implemented, but no demo user with role `HOUSEKEEPING` exists in `seed.ts` or PostgreSQL.
4. **Maintenance Account (`repair.gurgaon@pg.com`)**:
   - User exists in database with password `admin123`, but login is blocked by `LoginPage.tsx` whitelist exclusion.

---

## 6. Exact Next Steps to Enable 100% Direct Portal Logins

To enable direct, frictionless logins for every single role and portal without modifying live data or breaking existing tests, the following 3 low-risk improvements are recommended:

1. **Update `LoginPage.tsx` Allowed Role Array**:
   Include `MAINTENANCE`, `RECEPTIONIST`, and `ACCOUNTANT` in the `selectedRole === 'OWNER'` array:
   ```typescript
   ['OWNER', 'MANAGER', 'STAFF', 'COOK', 'SECURITY_GUARD', 'HOUSEKEEPING', 'MAINTENANCE', 'RECEPTIONIST', 'ACCOUNTANT']
   ```
2. **Seed Default Demo Accounts for Operational Roles**:
   Add 3 standard demo users in `server/prisma/seed.ts` with standard password `'admin123'`:
   - `cook@pg.com` (Role: `COOK`, Name: `Chef Ramu`)
   - `guard@pg.com` (Role: `SECURITY_GUARD`, Name: `Guard Bahadur`)
   - `housekeeping@pg.com` (Role: `HOUSEKEEPING`, Name: `Sunita Cleaner`)
3. **Fix `StaffPage.tsx` Dropdown Values**:
   - Change `{ label: 'Security Guard', value: 'SECURITY' }` to `value: 'SECURITY_GUARD'`.
   - Add `{ label: 'Chef / Mess Cook', value: 'COOK' }` to the options list.
   - Add dedicated `/staff/maintenance` route mapping in `App.tsx` with `<ProtectedStaffRoute allowedRoles={['MAINTENANCE']}>`.
