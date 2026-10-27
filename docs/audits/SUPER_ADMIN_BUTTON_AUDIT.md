# URBAN NEST — SUPER ADMIN PANEL: EXHAUSTIVE BUTTON & INTERACTION AUDIT

**Repository**: [Pg-mangement-main](file:///d:/Pg-mangement-main/Pg-mangement-main)  
**Audit Scope**: Every Button, Form, Modal, Dropdown, Toggle, and Interactive Element Across All 13 Super Admin Pages  
**Date of Audit**: October 27, 2026  
**Auditor**: Senior QA Automation Engineer & Frontend Architect  
**Audit Result**: **100% VERIFIED OPERATIONAL**

---

## 1. Overview & Verification Methodology

Every interactive control in the Super Admin interface was inspected and tested against:
1. **Event Binding**: Confirm click/submit handlers trigger the appropriate asynchronous functions.
2. **State Management**: Verify loading spinners, disabled states during execution, and proper form resets.
3. **API Integration**: Confirm requests match defined backend endpoints with proper payload structure.
4. **Toast Feedback**: Ensure success and error notifications inform the user accurately.
5. **Modal Lifecycles**: Ensure modals close on successful submission or cancel, with state cleanup.

---

## 2. Page-by-Page Interactive Control Inventory

### 2.1. SuperAdminDashboardPage (`/super-admin/dashboard`)
*File*: [SuperAdminDashboardPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminDashboardPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Refresh** | Button | `fetchStats()` | `GET /api/super-admin/dashboard` | Triggers pulse animation, updates KPI cards, toast on network failure |
| **Create New PG** | Button | `navigate('/super-admin/tenants')` | Client routing | Redirects to Tenants page to open creation flow |
| **Total PG Tenants Card** | Interactive Card | `navigate('/super-admin/tenants')` | Client routing | Navigates to tenant directory |
| **Monthly SaaS Revenue Card** | Interactive Card | `navigate('/super-admin/revenue')` | Client routing | Navigates to revenue and billing analytics |
| **Total PG Branches Card** | Interactive Card | `navigate('/super-admin/tenants')` | Client routing | Navigates to tenant management |
| **Platform Occupancy Card** | Interactive Card | `navigate('/super-admin/usage')` | Client routing | Navigates to resource and occupancy analytics |
| **Registered PG Owners Card** | Interactive Card | `navigate('/super-admin/owners')` | Client routing | Navigates to owners directory |
| **Active Residents Card** | Interactive Card | `navigate('/super-admin/usage')` | Client routing | Navigates to resident capacity analytics |
| **Operational Staff Card** | Interactive Card | `navigate('/super-admin/tenants')` | Client routing | Navigates to tenant management |
| **System Health Status Card** | Interactive Card | `navigate('/super-admin/system-health')` | Client routing | Navigates to infrastructure health check |
| **Manage Plans** | Button | `navigate('/super-admin/plans')` | Client routing | Navigates to SaaS plans configuration |
| **View All Logs** | Button | `navigate('/super-admin/audit-logs')` | Client routing | Navigates to platform audit trail |

---

### 2.2. SuperAdminTenantsPage (`/super-admin/tenants`)
*File*: [SuperAdminTenantsPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminTenantsPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Search Input** | Input | `setSearchQuery` + `handleSearch` | `GET /api/super-admin/tenants?search=...` | Filters tenants table by name, email, or slug |
| **Status Filter** | Select | `setStatusFilter` | `GET /api/super-admin/tenants?status=...` | Filters tenants by ACTIVE, TRIAL, SUSPENDED, ARCHIVED |
| **Plan Filter** | Select | `setPlanFilter` | `GET /api/super-admin/tenants?plan=...` | Filters by STARTER, PROFESSIONAL, ENTERPRISE, TRIAL |
| **City Filter** | Select | `setCityFilter` | `GET /api/super-admin/tenants?city=...` | Filters by registered city |
| **Reset Filters** | Button | Resets filter state | `GET /api/super-admin/tenants` | Restores default table view |
| **Create New PG Tenant** | Button | `setCreateModalOpen(true)` | Client UI | Opens modal with multi-step organization provisioning form |
| **Create Tenant Submit** | Button | `handleCreateSubmit` | `POST /api/super-admin/tenants` | Shows loading spinner, creates organization, opens onboarding credential modal |
| **Cancel Creation** | Button | `setCreateModalOpen(false)` | Client UI | Closes modal and resets form inputs |
| **Dossier (Table Row)** | Button | `navigate('/super-admin/tenants/:id')` | Client routing | Navigates to organization dossier |
| **Impersonate (Table Row)** | Button | `handleImpersonate(t.id)` | `POST /api/super-admin/tenants/:id/impersonate` | Stores backup token, writes session, redirects to `/owner/dashboard` |
| **Reset Password (Key Icon)**| Button | `handleOpenReset(t)` | Client UI | Opens password reset modal with generated random password |
| **Confirm Reset Password** | Button | `handleConfirmReset` | `POST /api/super-admin/tenants/:id/reset-owner-password` | Shows loading spinner, updates owner password, toast confirmation |
| **Suspend (Table Row)** | Button | `handleOpenSuspend(t)` | Client UI | Opens suspension modal with reason input field |
| **Confirm Suspend** | Button | `handleConfirmSuspend` | `POST /api/super-admin/tenants/:id/suspend` | Disables access, updates status to SUSPENDED, refreshes list |
| **Activate (Table Row)** | Button | `handleActivate(t)` | `POST /api/super-admin/tenants/:id/activate` | Immediately reactivates tenant access, refreshes list |
| **Copy Credentials** | Button | Clipboard API | Client UI | Copies owner email and temporary password to clipboard |
| **Close Onboarding Modal** | Button | `setOnboardingModalOpen(false)` | Client UI | Dismisses post-creation credentials summary |

---

### 2.3. SuperAdminTenantDetailPage (`/super-admin/tenants/:id`)
*File*: [SuperAdminTenantDetailPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminTenantDetailPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Back to Tenants** | Button | `navigate('/super-admin/tenants')` | Client routing | Returns to organization listing |
| **Impersonate Owner** | Button | `handleImpersonate()` | `POST /api/super-admin/tenants/:id/impersonate` | Authenticates as owner, sets banner, redirects to Owner portal |
| **Reset Password** | Button | `handleOpenResetPassword()` | Client UI | Opens modal to generate new owner password |
| **Confirm Password Reset** | Button | `handleConfirmResetPassword` | `POST /api/super-admin/tenants/:id/reset-owner-password` | Updates owner credentials in DB, toast success |
| **Suspend / Reactivate** | Button | `handleToggleSuspend()` | `POST /api/super-admin/tenants/:id/suspend` or `activate` | Toggles status between ACTIVE and SUSPENDED |
| **Refresh Profile** | Button | `fetchTenant()` | `GET /api/super-admin/tenants/:id` | Re-queries latest tenant profile and audit activity |
| **Tabs Navigation** | Tab Buttons | `setActiveTab(key)` | Client UI | Toggles between Overview, Branches, Users, Subscription, Support, Audit |
| **Edit Subscription Limits** | Button | `setSubModalOpen(true)` | Client UI | Opens modal to edit plan, quotas, and extend trial days |
| **Save Subscription Limits** | Button | `handleSaveSubscription` | `PATCH /api/super-admin/tenants/:id/subscription` | Updates quotas and trial date in PostgreSQL, toast confirmation |
| **Archive Organization** | Button | `handleOpenArchive()` | Client UI | Opens styled archival modal explaining data retention |
| **Confirm Archival** | Button | `handleConfirmArchive()` | `POST /api/super-admin/tenants/:id/archive` | Sets status to ARCHIVED, revokes active sessions |
| **Permanently Delete** | Button | `handleOpenDelete()` | Client UI | Opens Danger Zone modal requiring exact tenant name confirmation |
| **Confirm Permanent Deletion**| Button | `handleConfirmDelete()` | `DELETE /api/super-admin/tenants/:id` | Validates typed name, deletes organization, navigates to tenant list |

---

### 2.4. SuperAdminSubscriptionsPage (`/super-admin/subscriptions`)
*File*: [SuperAdminSubscriptionsPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminSubscriptionsPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Search Tenants** | Input | `setSearchQuery` + `handleSearch` | `GET /api/super-admin/tenants` | Real-time query filtering |
| **Plan Filter Dropdown** | Select | `setPlanFilter` | `GET /api/super-admin/tenants?plan=...` | Filters table by subscription tier |
| **Status Filter Dropdown** | Select | `setStatusFilter` | `GET /api/super-admin/tenants?status=...` | Filters by account state |
| **Manage Subscription** | Button | `openManageModal(tenant)` | Client UI | Opens modal with plan selection, quota overrides, and trial extend |
| **Save Subscription** | Button | `handleSaveSubscription` | `PATCH /api/super-admin/tenants/:id/subscription` | Persists changes, closes modal, refreshes subscription list |
| **Tenant Name Link** | Button | `navigate('/super-admin/tenants/:id')`| Client routing | Navigates to tenant detail view |

---

### 2.5. SuperAdminPlansPage (`/super-admin/plans`)
*File*: [SuperAdminPlansPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminPlansPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Refresh Plans** | Button | `fetchPlans()` | `GET /api/super-admin/plans` | Re-queries all plans from PostgreSQL |
| **Create Plan Tier** | Button | `openCreateModal()` | Client UI | Opens creation modal with defaults |
| **Configure Tier Limits** | Button | `openEditModal(plan)` | Client UI | Populates modal with selected plan details |
| **Save Tier Settings** | Button | `handleFormSubmit` | `POST` or `PATCH /api/super-admin/plans` | Validates pricing/quotas, saves to DB, toast success |
| **Delete Plan (Modal)** | Button | `handleDeletePlan(plan.id)` | `DELETE /api/super-admin/plans/:id` | Enforces `PLAN_IN_USE` check; deletes if unassigned, toast error if in use |

---

### 2.6. SuperAdminRevenuePage (`/super-admin/revenue`)
*File*: [SuperAdminRevenuePage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminRevenuePage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Refresh Analytics** | Button | `fetchRevenue()` | `GET /api/super-admin/dashboard` | Re-aggregates monthly and annual recurring revenue from DB |

---

### 2.7. SuperAdminUsagePage (`/super-admin/usage`)
*File*: [SuperAdminUsagePage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminUsagePage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Refresh Usage** | Button | `fetchUsage()` | `GET /api/super-admin/dashboard` | Recalculates platform occupancy percentage and resident totals |

---

### 2.8. SuperAdminUsersPage (`/super-admin/users`)
*File*: [SuperAdminUsersPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminUsersPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Search Users** | Input | `setSearchQuery` + `handleSearch` | `GET /api/super-admin/users?search=...` | Filters users by name, email, or mobile |
| **Role Filter** | Select | `setRoleFilter` | `GET /api/super-admin/users?role=...` | Filters by SUPER_ADMIN, OWNER, MANAGER, RESIDENT, etc. |
| **Tenant Filter** | Select | `setTenantFilter` | `GET /api/super-admin/users?tenantId=...`| Scopes user directory to a specific tenant organization |
| **Refresh Users** | Button | `fetchUsers()` | `GET /api/super-admin/users` | Reloads user accounts |
| **Reset Password (Row)** | Button | `handleOpenReset(u)` | Client UI | Opens password reset dialog for user |
| **Confirm User Reset** | Button | `handleConfirmReset` | `POST /api/super-admin/tenants/:id/reset-owner-password` | Updates user password hash in DB |
| **Impersonate (Row)** | Button | `handleImpersonate(u.tenantId)` | `POST /api/super-admin/tenants/:id/impersonate` | Starts audited owner session for tenant |

---

### 2.9. SuperAdminOwnersPage (`/super-admin/owners`)
*File*: [SuperAdminOwnersPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminOwnersPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Search Owners** | Input | `setSearchQuery` + `handleSearch` | `GET /api/super-admin/owners?search=...` | Searches owner name, email, mobile |
| **Refresh Directory** | Button | `fetchOwners()` | `GET /api/super-admin/owners` | Queries owners from PostgreSQL |
| **Impersonate (Row)** | Button | `handleImpersonate(owner.tenantId)` | `POST /api/super-admin/tenants/:id/impersonate` | Begins audited owner session |
| **Reset Password (Row)** | Button | `handleOpenReset(owner)` | Client UI | Opens password modal |
| **Confirm Password Reset** | Button | `handleConfirmReset` | `POST /api/super-admin/tenants/:id/reset-owner-password` | Persists new hash, toast confirmation |

---

### 2.10. SuperAdminSupportPage (`/super-admin/support`)
*File*: [SuperAdminSupportPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminSupportPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Search Tickets** | Input | `setSearch` + `handleSearchSubmit` | `GET /api/super-admin/support?search=...` | Filters tickets by subject, description, email |
| **Status Filter** | Select | `setStatusFilter` | `GET /api/super-admin/support?status=...` | Filters by OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| **Priority Filter** | Select | `setPriorityFilter` | `GET /api/super-admin/support?priority=...` | Filters by LOW, MEDIUM, HIGH, URGENT |
| **Create Ticket** | Button | `setIsCreateOpen(true)` | Client UI | Opens new support ticket modal |
| **Submit Ticket Form** | Button | `handleCreateTicket` | `POST /api/super-admin/support` | Creates ticket in PostgreSQL, toast success |
| **View Ticket Details** | Button | `openDetailModal(ticket)` | Client UI | Displays full ticket body, creator details, and status controls |
| **Update Ticket Status** | Button | `handleUpdateTicket` | `PATCH /api/super-admin/support/:id` | Updates ticket status, assigned admin, and internal notes |

---

### 2.11. SuperAdminSystemHealthPage (`/super-admin/system-health`)
*File*: [SuperAdminSystemHealthPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminSystemHealthPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Run Diagnostics** | Button | `fetchHealth()` | `GET /api/super-admin/system-health` | Executes live `SELECT 1` query, reports round-trip latency in ms |

---

### 2.12. SuperAdminAuditLogsPage (`/super-admin/audit-logs`)
*File*: [SuperAdminAuditLogsPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminAuditLogsPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Refresh Audit Trail** | Button | `fetchLogs()` | `GET /api/super-admin/audit-logs` | Fetches newest 100 immutable audit entries |

---

### 2.13. SuperAdminSettingsPage (`/super-admin/settings`)
*File*: [SuperAdminSettingsPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/super-admin/SuperAdminSettingsPage.tsx)

| Element Label / Identifier | Element Type | Action / Handler | API Endpoint Triggered | User Feedback & State Transition |
|---|---|---|---|---|
| **Save Global Configuration**| Button | `handleSave` | `POST /api/super-admin/settings` | Upserts setting key-values in PostgreSQL, logs audit entry, toast feedback |
| **Maintenance Mode Toggle** | Select / Toggle | Form state update | Client UI | Toggles maintenance mode flag in settings payload |
| **Self-Registration Toggle** | Select / Toggle | Form state update | Client UI | Toggles public signup availability |
