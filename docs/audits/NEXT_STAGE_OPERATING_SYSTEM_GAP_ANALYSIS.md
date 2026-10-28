# URBAN NEST — NEXT-STAGE OPERATING SYSTEM GAP ANALYSIS & AUDIT MATRIX

**Repository:** `Pg-mangement-main`  
**Base Commit:** `3492253`  
**Date:** October 2026  
**Auditor:** Principal SaaS Architect & Systems Engineer  

---

## 1. Verified Audit of Reported Existing Functionality

| Capability Area | Reported Component | Verified Codebase Status | Classification | Audit Evidence & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Performance** | Bounded query execution | `super-admin.controller.ts`, `owner.controller.ts`, `resident.controller.ts` | **Implemented & Verified** | Replaced unconstrained `Promise.all` with chunked queries and query timeouts. |
| **Performance** | Route lazy-loading & chunk splitting | `App.tsx`, `vite.config.ts` | **Implemented & Verified** | Bundle drops from 1.57 MB to 136 kB entry; scanner & recharts segregated. |
| **Performance** | DB Retry Utility | `db-helper.ts` | **Implemented & Verified** | `withDbRetry` handles 300ms-1500ms exponential backoff for Supabase pooler. |
| **Performance** | Non-blocking audit logs | `auth.controller.ts` | **Implemented & Verified** | Audit log write made non-blocking (`void createAuditLog(...)`). |
| **Staff Ops** | Cook role & Kitchen console | `CookDashboardPage.tsx`, `kitchen.controller.ts` | **Implemented & Verified** | Menu publisher, meal period schedule, pantry stock movement, wastage. |
| **Staff Ops** | Security Guard role & gate desk | `SecurityGuardPage.tsx`, `security.controller.ts` | **Implemented & Verified** | QR pass verify, walk-in/delivery entry log, checkout tracking, SOS banner. |
| **Staff Ops** | Housekeeping role & task flow | `HousekeepingPage.tsx`, `housekeeping.controller.ts` | **Implemented & Verified** | Area cleaning checklists (`PENDING` -> `IN_PROGRESS` -> `COMPLETED`). |
| **Staff Ops** | Shared staff layout | `StaffLayout.tsx` | **Implemented & Verified** | Role badge, property context, user avatar, logout. |
| **Resident** | Resident meals portal | `ResidentMealsPage.tsx`, `ResidentLayout.tsx` | **Implemented & Verified** | Today's meals, dietary tags, cutoff-enforced participation toggle. |
| **Owner Ops** | Admissions & Leads pipeline | `LeadsPage.tsx`, `lead-booking.controller.ts` | **Implemented & Incomplete** | Captures leads & updates status; lacks atomic conversion to `Resident` with agreement & deposit. |
| **Owner Ops** | Utility sub-metering | `UtilitiesPage.tsx`, `utility-ai.controller.ts` | **Implemented & Incomplete** | Calculates units & tariffs; lacks direct billing allocation onto resident invoices. |
| **Owner Ops** | AI Business Assistant | `AIAssistantModal.tsx`, `utility-ai.controller.ts` | **Implemented & Verified** | Contextual scoped aggregation on vacancy, collections, complaints; audit logged. |
| **Owner Ops** | Public property booking | `PublicPropertyBookingPage.tsx` | **Implemented & Verified** | Clean public showcase with room vacancy counts & enquiry submission. |
| **Platform** | Super Admin & Owner portals | Platform routes | **Implemented & Verified** | Tenant administration, role guards, subscription plans. |
| **Platform** | PWA manifests | `manifest.json`, `manifest.webmanifest` | **Implemented & Verified** | Icons, standalone display mode, theme colors. |

---

## 2. Identified Operational Gaps & Target Enhancements

### Gap 1: Disconnected Resident Lifecycle Orchestration
- **Current State:** Leads are tracked in `LeadsPage`, manual onboarding in `ResidentLifecyclePage`, and bookings in `Booking` table, but there is no atomic pipeline that takes a Lead -> Booking -> Reservation -> Admission Approval -> Auto Resident User Creation -> Lease Agreement -> Deposit Invoice -> Move-In Checklist.
- **Target:** Connect the entire chain with atomic database transactions, duplicate prevention, and full audit logs.

### Gap 2: Fragmented Operations & Staff Task Center
- **Current State:** `OperationalTask`, `HousekeepingTask`, and `Complaint` exist in silos without a unified inbox for managers to track cross-module task delegation, SLA escalations, activity comments, and verification sign-offs.
- **Target:** Unified Operations & Staff Task Center with category filters (Maintenance, Housekeeping, Kitchen, Security, Admin), priority escalations, and cross-module event triggers.

### Gap 3: Non-Visual Room & Bed Allocation
- **Current State:** `RoomsPage.tsx` displays tables/cards without a physical floor plan or visual room matrix showing bed states (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`), upcoming move-outs, and one-click transfers.
- **Target:** Interactive visual floor and bed layout with color-coded bed pills, room inspection indicators, and bed maintenance blocking.

### Gap 4: Payment Reconciliation & Utility Invoice Allocation
- **Current State:** Rent payments, deposits, and expenses are recorded, but there is no reconciliation module matching external provider/UPI references, flagging disputed/unmatched charges, or attaching sub-meter utility charges directly to resident rent invoices.
- **Target:** Financial Reconciliation Center with automated status matching, utility cost split allocation, and auditable deposit deduction/refund workflows.

### Gap 5: Asset Register & Preventive Maintenance
- **Current State:** No asset entity exists. Physical assets (ACs, RO plants, Geysers, Generators, Elevators) have no warranty tracking, service histories, or recurring preventive inspection schedules.
- **Target:** `Asset` model and management console with QR tags, service contracts, and automated maintenance reminders.

### Gap 6: Parcel & Courier Delivery Security Workflow
- **Current State:** Security guard logs visitors, but there is no parcel intake, resident handover PIN/QR, or uncollected package reminder tracking.
- **Target:** Parcel Desk workflow in `SecurityGuardPage` and `ResidentPortal` with parcel logging, OTP/QR pickup, and uncollected alerts.

### Gap 7: Vendor Directory & Procurement Workflow
- **Current State:** Kitchen has purchase requests, but no vendor directory, purchase order generation, goods-received verification, or vendor performance tracking.
- **Target:** Centralized Vendor Directory and PO/GRN workflow.

### Gap 8: Workflow Automation Engine & Reminders
- **Current State:** Alerts are triggered manually.
- **Target:** Rule-based background automation engine for rent reminders, agreement expiry warnings, task escalations, and stock replenishment alerts.

### Gap 9: Operational Intelligence Dashboard
- **Current State:** Owner dashboard has high-level counts, but lacks an actionable operations feed highlighting expiring leases, overdue rent, pending reconciliations, low inventory, and urgent tickets.
- **Target:** Operations Command Center with clickable, prioritized action cards.

### Gap 10: Multilingual Support (English, Hindi, Gujarati)
- **Current State:** All UI text is hardcoded in English.
- **Target:** Centralized i18n engine supporting English, Hindi (हिन्दी), and Gujarati (ગુજરાતી) with persistence and RTL/locale-aware formatting.
