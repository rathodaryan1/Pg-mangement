# URBAN NEST — MASTER SAAS UPGRADE FEATURE INVENTORY & ROADMAP

**Repository**: `Pg-mangement-main`  
**Date**: October 27, 2026  
**Auditor & Lead Architect**: Principal SaaS Architect  
**Status**: ACTIVE IMPLEMENTATION ROADMAP

---

## 1. Feature Inventory & Current Status

| Module / Domain | Status | Existing Implementation | Missing / Target Upgrade |
| :--- | :--- | :--- | :--- |
| **Authentication & AuthZ** | `PARTIAL` | JWT, Bcrypt, Roles: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `RESIDENT`, `STAFF`, `MAINTENANCE` | Add dedicated `COOK`, `SECURITY_GUARD`, `HOUSEKEEPING` roles, property-scoped staff permissions |
| **Performance (Phase 2)** | `COMPLETE` | Bounded concurrency (2-4 queries), select projections, route lazy loading, manualChunks | Continuously monitor latency targets and connection pool safety |
| **Kitchen & Meal Planning** | `MISSING` | None | Menus (Daily/Weekly), Meal Periods, Dietary Labels, Cutoff times, Resident Opt-In/Opt-Out, Kitchen Inventory & Wastage |
| **Security Guard Desk** | `PARTIAL` | QR gate passes, check-in/out timestamps | Dedicated Guard portal, delivery logs, offline entry, visitor history search, emergency gate protocols |
| **Housekeeping & Cleaning** | `PARTIAL` | `OperationalTask` entity exists | Recurring cleaning schedules, room & common-area checklists, photo verification, task assignment |
| **Maintenance Work Orders** | `PARTIAL` | `Complaint` entity, categories, priority, status | Expense tracking per ticket, work notes, resolution SLAs, staff assignment portal |
| **Resident Portal** | `PARTIAL` | Room, Payments, Visitors, Complaints, Leave, Documents, Notices, SOS | Meal selection, dietary preferences, room-transfer requests, move-in/out checklists, community notices |
| **Enquiries & Admissions** | `MISSING` | None | Lead management, enquiry capture, visit scheduling, booking deposit, room reservation |
| **Financial Management** | `PARTIAL` | Rent payments, security deposits, basic expenses | Invoicing, utility allocation, deposit deductions, late-fee calculation, monthly reconciliations |
| **Automation & Reminders** | `PARTIAL` | Basic in-app notifications | Rent due automation, menu change alerts, low inventory alerts, visit arrival notifications, agreement expiry |
| **Analytics & AI Assistant** | `PARTIAL` | Static reports & charts | Multi-property metrics, operational intelligence, contextual AI business assistant for owners |
| **PWA & Public Pages** | `PARTIAL` | Public landing, solutions, pricing, about, contact | Public property profile (`/p/:slug`), room booking form, PWA manifest, offline resilience |
| **SaaS Plans & Entitlements**| `PARTIAL` | `Plan` and `Tenant` models, basic limit checks | Configurable feature flags, staff/property limits enforcement, upgrade/downgrade workflows |

---

## 2. Implementation Execution Phases

- **Phase 1: Feature Inventory & Preflight Verification** (Completed)
- **Phase 2: Performance & Route Splitting** (Completed & Verified in Production Build)
- **Phase 3: Role & Permission Architecture** (`COOK`, `SECURITY_GUARD`, `HOUSEKEEPING`, `MAINTENANCE`)
- **Phase 4: Kitchen Management & Meal Participation**
- **Phase 5: Resident Portal Expansion**
- **Phase 6: Property Operations & Staff Workflows**
- **Phase 7: Finance, Leads & Admissions**
- **Phase 8: Automation Engine & Notifications**
- **Phase 9: Intelligence, Analytics & AI Business Assistant**
- **Phase 10: SaaS Plans, Entitlements, PWA & Public Booking Pages**
- **Phase 11: End-to-End Regression & Verification**
