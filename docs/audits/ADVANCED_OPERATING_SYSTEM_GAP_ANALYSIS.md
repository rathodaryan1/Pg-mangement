# URBAN NEST PG MANAGEMENT — ADVANCED FEATURE EXPANSION
## Phase 1: Repository Inspection & Feature-Gap Analysis

**Repository**: `Pg-mangement-main`  
**Remote**: `https://github.com/rathodaryan1/Pg-mangement.git`  
**Audit Date**: October 28, 2026  
**Status**: Comprehensive Verification Complete  

---

## 1. Architecture & Repository Status

### Stack Verification
- **Backend**: Express + TypeScript with Prisma ORM (v5.22.0) connected to Supabase PostgreSQL (43 active models).
- **Frontend**: Vite 8 + React 19 + TypeScript with Tailwind CSS and TanStack React Query.
- **Multilingual Support**: English (EN), Hindi (HI), Gujarati (GU) via `I18nProvider`.
- **RBAC**: Super Admin (`SUPER_ADMIN`), Owner (`OWNER`), Manager (`MANAGER`), Resident (`RESIDENT`), Cook (`COOK`), Security (`SECURITY_GUARD`), Housekeeping (`HOUSEKEEPING`).

---

## 2. Feature-Gap Matrix by Domain

| Domain | Feature Requirement | Current Implementation Status | Gap Identified | Complexity | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. BI & Profitability** | Property-level revenue, expenses & NOI | Implemented in `owner.controller.ts` (`getReports`) | Lacks RevPAB (Rev per Available Bed) & Avg Rent | Low | Immediate |
| **A. BI & Profitability** | Rent aging (0-30, 31-60, 61-90, 90+ days) | Missing | Outstanding dues not bucketed into age brackets | Medium | High |
| **A. BI & Profitability** | Budget vs. Actual OPEX & Collection Rate | Partial | Collection rate % not computed; budgets not modeled | Medium | High |
| **A. BI & Profitability** | Cash flow summaries & Configurable periods | Implemented (Monthly) | Lacks Quarterly / Custom date filtering | Low | Medium |
| **A. BI & Profitability** | Tenant-scoped AI Profitability Guidance | Partial in `utility-ai.controller.ts` | Needs explicit distinction between actuals and forecasts | Low | Medium |
| **B. Lead CRM** | Centralized Lead Capture & Pipeline Stages | Implemented in `LeadBookingController` | Works for basic stages (NEW, CONTACTED, VISITED) | Low | Complete |
| **B. Lead CRM** | Referral Tracking & Commission Records | Missing | No schema fields for referrer name, commission & status | Medium | High |
| **B. Lead CRM** | WhatsApp Integration (Consent & Opt-Out) | Missing | No consent opt-in/opt-out flag or WhatsApp log model | Medium | High |
| **B. Lead CRM** | CAC (Customer Acquisition Cost) & Conversion | Partial in `LeadsPage.tsx` | Needs conversion rate metric & source breakdown | Low | Medium |
| **C. Resident Portal** | Invoices, Payment History & Instant Receipts | Implemented in `ResidentPaymentsPage.tsx` | Complete with Razorpay / UPI test integration | Done | Verified |
| **C. Resident Portal** | Complaints with Status Tracking & Escalation | Implemented in `ResidentComplaintsPage.tsx` | Working timeline; needs attachment links | Low | Medium |
| **C. Resident Portal** | Leave Requests, Notices & Visitor Passes | Implemented in `ResidentLeavePage` & `ResidentVisitorsPage` | Working with instant QR token passes | Done | Verified |
| **D. SaaS & Super Admin** | Tenant Onboarding & Lifecycle | Implemented in `super-admin.controller.ts` | Complete (Create tenant, slug, sub status) | Done | Verified |
| **D. SaaS & Super Admin** | Subscription Invoices & Renewal Reminders | Implemented in `SuperAdminSubscriptionsPage` | Complete | Done | Verified |
| **D. SaaS & Super Admin** | Tenant Suspension & Reactivation | Implemented in `super-admin.controller.ts` | Server-enforced permissions active | Done | Verified |
| **E. Workforce** | Staff Directory & Basic Roles | Implemented in `StaffPage.tsx` | Basic profile, role, and flat salary | Done | Verified |
| **E. Workforce** | Shift Scheduling & Daily Attendance | Missing | No schema model for staff attendance logging | Medium | Highest |
| **E. Workforce** | Configurable Salary Components & Advances | Missing | No breakdown of Basic/HRA/Allowances or Advances | Medium | Highest |
| **E. Workforce** | Payroll Summary & Strict RBAC | Missing | Payroll calculations and view restricted to Owner | Medium | Highest |
| **F. Compliance** | KYC Verification & Document Vault | Implemented in `OwnerDocumentsPage.tsx` | Aadhaar, PAN, Passport preview and review | Done | Verified |
| **F. Compliance** | Agreement Templates with Variable Interpolation | Missing | No agreement template generator | Medium | Highest |
| **F. Compliance** | Safety & Regulatory Compliance Checklists | Missing | Fire NOC, Lift Fitness, Pest Control tracking | Medium | Highest |

---

## 3. High-Value Implementation Plan & Order

Based on commercial viability, operational necessity, and user requirements, the highest-value missing features will be implemented in the following sequence:

### Phase 2 Implementation Roadmap:
1. **Module 1: Advanced Business Intelligence & Profitability Engine**
   - Add RevPAB (Revenue Per Available Bed) and Average Rent Per Bed calculations.
   - Add Outstanding Rent Aging Analysis (Current, 1-30 Days, 31-60 Days, 61-90 Days, 90+ Days).
   - Add Collection Efficiency Rate (`collected / billed * 100`) and Budget vs. Actual OPEX variance.
   - Add Tenant-scoped AI Cashflow & Profitability recommendations with clear tags: `[ACTUAL]`, `[ESTIMATE]`, `[FORECAST]`.
   - Update [ReportsPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/owner/ReportsPage.tsx) with graphical cards, aging buckets, and export options.

2. **Module 2: Lead CRM, Referral Tracking & WhatsApp Consent**
   - Extend `Lead` model in `schema.prisma` with:
     - Referral tracking: `referrerName`, `referrerPhone`, `referralCommission`, `commissionStatus`.
     - WhatsApp compliance: `whatsappConsent` (opt-in), `whatsappOptOut`, `lastWhatsappSentAt`.
     - Staff assignment: `assignedTo`.
   - Add endpoints in `lead-booking.controller.ts` for referral logging and WhatsApp status updates.
   - Enhance [LeadsPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/owner/LeadsPage.tsx) with referral commission cards, WhatsApp consent badges, and conversion rate analytics.

3. **Module 3: Workforce Management (Attendance, Salary Breakdown & Payroll Summary)**
   - Add `StaffAttendance` and `StaffAdvance` models in `schema.prisma`.
   - Add workforce management endpoints in `owner.controller.ts`:
     - Record staff attendance (`PRESENT`, `ABSENT`, `HALF_DAY`, `ON_LEAVE`).
     - Record salary advance disbursements.
     - Generate monthly payroll summaries (Basic + HRA + Allowances - Deductions - Advances = Estimated Net Payable).
     - Strict RBAC: only `OWNER` and `SUPER_ADMIN` can access salary/advance/payroll data.
   - Expand [StaffPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/owner/StaffPage.tsx) with Attendance Tracker, Salary Components editor, and Monthly Payroll Sheet.

4. **Module 4: Statutory Compliance & Agreement Templates Engine**
   - Add `ComplianceRecord` model in `schema.prisma` (Fire NOC, Lift Certificate, Municipal Health License, Pest Control, Police Intimation).
   - Add agreement template engine with interpolation tokens: `{{tenantName}}`, `{{residentName}}`, `{{propertyName}}`, `{{roomNumber}}`, `{{bedNumber}}`, `{{monthlyRent}}`, `{{depositAmount}}`, `{{moveInDate}}`.
   - Update [OwnerDocumentsPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/owner/OwnerDocumentsPage.tsx) with a tab for Statutory & Safety Compliance tracking with expiry alerts.

5. **Phase 5: Verification, Tests & Deliverables**
   - Write end-to-end integration test suite `server/src/tests/advanced-expansion-verification.ts`.
   - Re-verify client and server production builds (`npm run build`).
   - Deliver comprehensive completion report with database migration notes and deployment guidelines.
