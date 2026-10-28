# Urban Nest — Post-Expansion Stability & Security Audit Report

**Audit Type**: Senior Engineering, Security Architecture, Database & QA Forensic Review  
**Repository**: `Pg-mangement-main`  
**Target Git Branch**: `main`  
**Audit Scope**: Advanced Feature Expansion (BI & Profitability, CRM Leads, Workforce Operations, Statutory Compliance, Legal Agreements, Document Storage, and Multitenancy Isolation)

---

## Executive Summary

A forensic stability, multi-tenant isolation, and data-integrity audit was conducted across the newly expanded modules of the Urban Nest PG Operating System. The audit verified:
1. Role-based server-side authorization and tenant isolation across new endpoints.
2. Personally Identifiable Information (PII) protection, KYC storage access vectors, and unauthenticated static file exposures.
3. Mathematical accuracy and classification integrity of BI analytics, rent aging buckets, RevPAB, cash flow, and administrative payroll sheets.
4. Database schema migration safety, Prisma ORM constraints, indexes, and schema drift prevention.
5. Dynamic agreement template interpolation security, HTML injection vectors, and tenant boundary enforcement.
6. WhatsApp consent state machine and unconditional opt-out enforcement.
7. Test suite isolation, fixture containment, and zero mutation of shared staging/production data.
8. Durable audit logging, error handling, and release readiness.

During the audit, **three verified vulnerabilities were identified and immediately remediated with low-risk fixes**:
1. **[CRITICAL] Unauthenticated KYC Static File Serving**: Serving local fallback uploads publicly via `express.static('/uploads')` without authentication was eliminated by attaching `authenticateToken` middleware.
2. **[HIGH] IDOR / Missing Tenant Scoping in Workforce & Compliance**: `createComplianceRecord`, `recordStaffAdvance`, `recordStaffAttendance`, and `generateAgreementText` previously trusted user-supplied `propertyId` or resident IDs without cross-tenant ownership verification. Scoping was hardened using `resolvePropertyScope` and strict tenant boundary validation.
3. **[MEDIUM] CRM Lead Tenant Scoping & WhatsApp Opt-Out Integrity**: Enforced tenant ownership verification on `getLeads`, `updateLeadStatus`, `updateLeadReferral`, and `updateWhatsAppConsent`. Fixed consent state machine to guarantee that `whatsappConsent` is forced to `false` whenever `optOut: true` is registered.

---

## 1. Verified Audit Findings & Forensic Matrix

| Check Domain | Severity | Vulnerability / Finding Identified | Remediated Status | Evidence / Code References |
| :--- | :--- | :--- | :--- | :--- |
| **1. Endpoint Authorization & Tenant Isolation** | **HIGH** | `createComplianceRecord`, `recordStaffAdvance`, and `recordStaffAttendance` accepted user-supplied `propertyId` without verifying ownership against the authenticated user's `tenantId`. `generateAgreementText` did not verify if the target resident belonged to the requesting tenant. | **FIXED** | [owner.controller.ts:L2814, L2873, L2996, L3061](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/controllers/owner.controller.ts) — Now passes `propertyId` through `resolvePropertyScope()` (which blocks foreign property requests) and enforces `resident.property?.tenantId === req.user.tenantId`. |
| **2. KYC Storage & PII Protection** | **CRITICAL** | In [server/src/index.ts:L78](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/index.ts#L78), `/uploads` was mounted directly to `express.static(uploadsDir)` without JWT authentication, allowing unauthenticated download of local KYC identity proofs (Aadhaar, PAN, Passport) if file paths were known. | **FIXED** | [server/src/index.ts:L10, L78](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/index.ts#L10) — Mounted `authenticateToken` middleware directly ahead of `/uploads`. Unauthenticated requests to local upload assets are rejected with HTTP 401. All legitimate document views flow through authorized streaming controllers. |
| **3. Financial & Operational Calculations** | **INFORMATIONAL** | Mathematical validation performed on RevPAB, collection efficiency, 5-stage aging schedule, OPEX variance, cash flow, and pro-rata absent/advance payroll deductions. | **VERIFIED** | Formulations independently verified. Net payable pro-rata calculations are accompanied by mandatory administrative disclaimers in UI and API payloads. |
| **4. Database Schema, Constraints & Indexes** | **LOW (Operational)** | `prisma db push` was used for fast development prototyping on Supabase, but lacks migration version history files for zero-downtime production deployment pipelines. | **DOCUMENTED** | Verified foreign key cascades and indexes on `StaffAttendance(userId, date)` (unique), `StaffAdvance(propertyId, userId, monthYear)`, `ComplianceRecord(propertyId, category, status)`, and `Lead(tenantId, propertyId, status)`. Recommended `prisma migrate deploy` for production. |
| **5. Agreement Template Interpolation** | **LOW** | Potential for cross-tenant agreement generation and formatting corruption if resident fields contained regex token characters. | **FIXED** | [owner.controller.ts:L3061](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/controllers/owner.controller.ts#L3061) — Added tenant authorization guard. React frontend renders agreement text inside `<pre className="whitespace-pre-wrap">` without `dangerouslySetInnerHTML`, ensuring zero HTML/XSS injection. |
| **6. WhatsApp Consent & Opt-Out Enforcement** | **MEDIUM** | In [lead-booking.controller.ts](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/controllers/lead-booking.controller.ts), passing `optOut: true` did not explicitly zero out `whatsappConsent: true`, leaving conflicting boolean flags. | **FIXED** | [lead-booking.controller.ts:L170-L177](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/controllers/lead-booking.controller.ts#L170) — Implemented atomic state transition: when `optOut === true`, `whatsappConsent` is forced to `false` and `whatsappOptOut` set to `true`. Removed false `lastWhatsappSentAt` update on preference change. |
| **7. Test Isolation & Production Containment** | **INFORMATIONAL** | Risk of automated test runs mutating shared staging or production data. | **VERIFIED** | [advanced-expansion-verification.ts](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/tests/advanced-expansion-verification.ts) uses isolated synthetic fixtures prefixed with `adv_${Date.now()}` and strictly scoped `finally` teardowns matching on synthetic IDs. Shared data is never touched. |
| **8. Audit Logging & Error Handling** | **INFORMATIONAL** | Verification of durable audit trail and non-leaking stack traces in production error responses. | **VERIFIED** | [errorHandler.ts](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/middleware/errorHandler.ts) returns sanitized error messages and suppresses raw stack traces in non-development modes. |

---

## 2. In-Depth Technical Verification

### Check 1: Tenant Isolation & Property Scoping
- **Inspection**: All `/owner/*` routes require `authenticateToken` and `requireOwnerOrStaff`. All `/api/saas/*` operational routes require `authenticateToken` and `requireOwnerOrStaff`.
- **Fix Applied**: 
  - In [server/src/controllers/owner.controller.ts](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/controllers/owner.controller.ts):
    - `recordStaffAttendance`: `const { propertyId } = await OwnerController.resolvePropertyScope(req, req.body.propertyId);`
    - `recordStaffAdvance`: `const { propertyId } = await OwnerController.resolvePropertyScope(req, req.body.propertyId);`
    - `createComplianceRecord`: `const { propertyId } = await OwnerController.resolvePropertyScope(req, req.body.propertyId);`
    - `generateAgreementText`: Added cross-tenant guard:
      ```ts
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId && resident.property?.tenantId !== req.user.tenantId) {
        return sendError(res, 'Unauthorized access to resident agreement.', 403);
      }
      ```
  - In [server/src/controllers/lead-booking.controller.ts](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/controllers/lead-booking.controller.ts):
    - `getLeads`: Verified that `propertyId` belongs to `req.user.tenantId`.
    - `updateLeadStatus`, `updateLeadReferral`, `updateWhatsAppConsent`: Validates that `existingLead.tenantId === req.user.tenantId`.

### Check 2: KYC Document Storage & PII Protection
- **Vulnerability**: Previously, local uploads were statically served at `/uploads` without authentication.
- **Fix Applied**: 
  - Attached `authenticateToken` to `/uploads` in [server/src/index.ts](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/index.ts).
  - Both [OwnerController.streamDocumentFile](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/controllers/owner.controller.ts#L2291) and [ResidentController.streamDocumentFile](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/controllers/resident.controller.ts#L967) enforce property/resident authorization, signed URL generation (300s expiration), and direct file streaming without public directory listing.
  - KYC numbers (`kycDocumentNumber`) are restricted to authenticated dossier endpoints and are never logged to console or exposed to third parties.

### Check 3: Mathematical Integrity of Financial & Operational Metrics
1. **RevPAB (Revenue Per Available Bed)**:
   $$\text{RevPAB} = \frac{\text{Total Rent Collected}}{\text{Total Physical Beds}}$$
   Correctly captures inventory yield across both occupied and vacant beds.
2. **Collection Efficiency Rate**:
   $$\text{Collection Rate} = \frac{\text{Total Rent Collected}}{\text{Total Rent Collected} + \text{Total Outstanding Billed}} \times 100$$
   Correctly measures realization against accounts receivable.
3. **Outstanding Rent Aging Buckets**:
   $$\Delta \text{Days} = \lfloor \frac{\text{Today} - \text{Due Date}}{86,400,000} \rfloor$$
   - $\Delta \le 0$: Current (Not yet overdue)
   - $1 \le \Delta \le 30$: 1–30 Days Overdue
   - $31 \le \Delta \le 60$: 31–60 Days Overdue
   - $61 \le \Delta \le 90$: 61–90 Days Overdue
   - $\Delta > 90$: 90+ Days Default Risk
4. **Pro-Rata Payroll & Deductions**:
   $$\text{Net Estimated} = \max\left(0, \text{Gross Salary} - \frac{\text{Gross Salary}}{30} \times \text{Absent Days} - \text{Advances Disbursed}\right)$$
   Accompanied by explicit disclaimers: *“Internal administrative estimate based on recorded attendance and advances. Not a statutory tax deduction slip.”*

### Check 4: Prisma Schema & Migration Safety
- **Schema Safety**: The new tables (`StaffAttendance`, `StaffAdvance`, `ComplianceRecord`, `AgreementTemplate`) and extended `Lead` columns are purely additive.
- **Constraints**:
  - `StaffAttendance`: Unique composite constraint `@@unique([userId, date])` prevents duplicate attendance records for the same employee on the same date.
  - Foreign key cascades on `Property` and `User` ensure referential integrity.
- **Production Migration Recommendation**: For existing production environments, do not run `prisma db push`. Generate baseline migrations via `npx prisma migrate dev --create-only` and execute using `npx prisma migrate deploy`.

### Check 5: Agreement Template Interpolation Security
- **Data Integrity**: Variables (`{{tenantName}}`, `{{propertyName}}`, `{{residentName}}`, `{{residentMobile}}`, `{{roomNumber}}`, `{{bedNumber}}`, `{{monthlyRent}}`, `{{depositAmount}}`, `{{moveInDate}}`, `{{agreementDate}}`) are populated strictly from verified database records.
- **XSS & Injection Protection**: Rendered as raw text in [OwnerDocumentsPage.tsx](file:///d:/Pg-mangement-main/Pg-mangement-main/client/src/pages/owner/OwnerDocumentsPage.tsx) inside a monospace `<pre>` block without HTML execution.

### Check 6: WhatsApp Consent & Opt-Out Enforcement
- **State Machine Integrity**:
  ```ts
  if (optOut === true) {
    consentData.whatsappOptOut = true;
    consentData.whatsappConsent = false;
  } else if (consent !== undefined) {
    consentData.whatsappConsent = !!consent;
    if (consent === true) consentData.whatsappOptOut = false;
  }
  ```
- **Audit Field Integrity**: `lastWhatsappSentAt` is only updated when a real outbound message is dispatched, rather than during consent preference toggles.

### Check 7: Test Fixture Isolation & Clean Teardown
- Verified that [server/src/tests/advanced-expansion-verification.ts](file:///d:/Pg-mangement-main/Pg-mangement-main/server/src/tests/advanced-expansion-verification.ts):
  - Uses run-isolated slugs `adv_${Date.now()}`.
  - Purges all synthetic records in reverse dependency order in its `finally` block.
  - Produces zero collateral records in shared staging or production tables.

---

## 3. Build & Test Verification Evidence

### A. Server Build
```bash
$ npm run build (in server/)
> pg-management-server@1.0.0 build
> npx prisma generate && tsc

✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 352ms
Result: 0 errors
```

### B. Client Build
```bash
$ npm run build (in client/)
> client@0.0.0 build
> tsc -b && vite build

vite v8.0.14 building client environment for production...
transforming...✓ 2226 modules transformed.
rendering chunks...
dist/index.html                                        2.58 kB │ gzip:   1.15 kB
dist/assets/index-LBlb4S7H.css                        69.03 kB │ gzip:  11.97 kB
dist/assets/ReportsPage-BaIvxv7w.js                   17.90 kB │ gzip:   3.92 kB
dist/assets/LeadsPage-CoJfnZcO.js                     17.38 kB │ gzip:   4.03 kB
dist/assets/StaffPage-Db_z5L6A.js                     22.10 kB │ gzip:   4.92 kB
dist/assets/OwnerDocumentsPage-Dk8YOBtw.js            24.59 kB │ gzip:   6.62 kB
✓ built in 1.39s (0 errors, 0 warnings)
```

### C. Automated End-to-End Regression Suite
```bash
$ npx ts-node src/tests/advanced-expansion-verification.ts (in server/)
================================================================
URBAN NEST ADVANCED FEATURE EXPANSION — VERIFICATION SUITE
================================================================

  [PASS] [SETUP] Provision Isolated Test Fixtures (10041ms)
  [PASS] [SECTION_A_BI] Rent Aging Buckets & RevPAB Calculations (4003ms)
  [PASS] [SECTION_A_BI] AI Insights with Verification Labels [ACTUAL], [ESTIMATE], [FORECAST] (1ms)
  [PASS] [SECTION_B_CRM] Create Lead with Referral Tracking & WhatsApp Consent (801ms)
  [PASS] [SECTION_B_CRM] WhatsApp Opt-Out Handling & Commission Settlement (793ms)
  [PASS] [SECTION_E_WORKFORCE] Record Staff Shift Attendance & Disburse Advance (3834ms)
  [PASS] [SECTION_E_WORKFORCE] Calculate Pro-Rata Payroll Sheet with Disclaimer Verification (0ms)
  [PASS] [SECTION_F_COMPLIANCE] Register Statutory Safety Certificate & Expiry Tracking (1943ms)
  [PASS] [SECTION_F_COMPLIANCE] Generate Dynamic Agreement with Variable Token Interpolation (1021ms)
  [PASS] [SECURITY_ISOLATION] Strict Property Scoping on Compliance & Workforce Data (5351ms)
  [PASS] [TEARDOWN] Purge Test Fixtures (12693ms)

================================================================
ADVANCED FEATURE EXPANSION TEST SUMMARY
================================================================
Total Tests: 11 | Passed: 11 | Failed: 0
================================================================
```

### D. Active Backend Service Status
```text
================================================
  🏢 URBAN NEST — SMART PG BACKEND SERVICE     
  Environment: development               
  Server Port: 5000                         
  Frontend:    http://localhost:5173           
================================================
  ✅ PostgreSQL Database Connected (2270ms)
================================================
```

---

## 4. Unresolved Blockers & Commercial Prerequisites

1. **Third-Party WhatsApp BSP Account**: Outbound template messaging requires onboarding with a Meta-approved Business Solution Provider (Twilio, Gupshup, or Meta Cloud API). The system is architecturally ready with consent storage and opt-out filters, but outbound API credentials must be configured before enabling live broadcasts.
2. **Statutory e-Sign Integration**: Co-living agreements are drafted and formatted cleanly with dynamic tokens. For legal evidentiary standing in Indian jurisdiction, integration with an Aadhaar e-Sign or Information Technology Act-compliant provider (e.g., Leegality or DigiLocker) is required prior to relying on purely digital signatures.
3. **Formal Production Migration Scripts**: In production deployments, execute schema changes via `prisma migrate deploy` backed by SQL migration history rather than dynamic schema pushing.

---

## 5. Release Recommendation

**Verdict: CONDITIONALLY APPROVED FOR STAGING RELEASE & COMMERCIAL PILOT**

- **Code Stability**: High. All frontend chunks and backend TypeScript compiled cleanly with zero errors.
- **Tenant Isolation**: High. IDOR prevention and tenant property boundary checks are enforced on all new workforce, compliance, agreement, and CRM routes.
- **Security Posture**: Hardened. Unauthenticated static file downloads were closed by enforcing JWT verification on `/uploads`.
- **Preservation of Work**: All uncommitted working tree changes remain intact and preserved for user review. No changes were committed, pushed, deployed, or reset.
