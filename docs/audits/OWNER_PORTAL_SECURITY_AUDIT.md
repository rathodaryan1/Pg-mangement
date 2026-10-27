# URBAN NEST — OWNER PORTAL SECURITY & MULTI-TENANT ISOLATION AUDIT

**Audit Date**: October 27, 2026  
**Auditor Focus**: Multi-Tenant Isolation, Role-Based Access Control (RBAC), Insecure Direct Object References (IDOR), Payment Integrity, and Data Privacy.

---

## 1. Authentication & Session Management

- **Mechanism**: JSON Web Tokens (JWT) signed with HMAC-SHA256 (`JWT_SECRET`).
- **Token Payloads**: Contain `id`, `email`, `role`, `tenantId`, and `propertyId`.
- **Token Lifetime**: Configured with standard expiry and verified on every protected route via `authenticateToken` middleware.
- **Password Storage**: Passwords salted and hashed with `bcryptjs` (salt rounds: 10). Plaintext passwords are never logged or persisted.

---

## 2. Role-Based Access Control (RBAC) Boundaries

Strict role authorization middleware (`requireOwner`, `requireResident`, `requireSuperAdmin`) governs all route access:

| Role Tested | Access to Owner Dashboard (`/api/owner/dashboard`) | Access to Owner Rooms (`/api/owner/rooms`) | Access to Resident APIs (`/api/resident/*`) | Isolation Result |
|---|---|---|---|---|
| **Unauthenticated** | Rejected: HTTP 401 Unauthorized | Rejected: HTTP 401 Unauthorized | Rejected: HTTP 401 Unauthorized | **PASS** |
| **RESIDENT** | Rejected: HTTP 403 Forbidden | Rejected: HTTP 403 Forbidden | Allowed: HTTP 200 OK | **PASS** |
| **OWNER** | Allowed: HTTP 200 OK | Allowed: HTTP 200 OK | Filtered / Scoped | **PASS** |
| **SUPER_ADMIN** | Allowed (with tenant override) | Allowed (with tenant override) | Platform level | **PASS** |

**Regression Verification**:
- In `owner-flow.test.ts` (Step 2), an authenticated resident token was presented to `/api/owner/dashboard` and `/api/owner/rooms`. Both requests were strictly rejected with **HTTP 403 Forbidden**.

---

## 3. Multi-Tenant & Cross-Organization Isolation

### 3.1 Tenant Data Segregation
Every business entity (`Property`, `Room`, `Bed`, `Resident`, `Payment`, `SecurityDeposit`, `VisitorRequest`, `Complaint`, `Document`) is bound to a `tenantId`.

### 3.2 Cross-Tenant Access Attack Vectors Tested
1. **Tenant A Owner requesting Tenant B's Property**:
   - `resolvePropertyScope(req, targetPropertyId)` verifies that `targetPropertyId` belongs to `req.user.tenantId`. If an IDOR attack is detected (foreign ID requested), the controller silently falls back to the owner's own property or returns empty set.
2. **Deposit Exposure**:
   - Remediation: Enforced `where: propertyFilter` in `getDeposits` so Tenant A cannot view or settle Tenant B's resident deposits.
3. **Privilege Escalation Prevention**:
   - Owners attempting to create staff members cannot assign the `SUPER_ADMIN` role; backend restricts allowable staff roles to `MANAGER`, `RECEPTIONIST`, `ACCOUNTANT`, and `MAINTENANCE`.

---

## 4. Payment & Financial Security

- **Server-Side Validation**: Payment amounts, invoice status, and due dates are strictly validated on the backend.
- **Client Status Distrust**: The application **never** marks an invoice as paid solely because the frontend reports success.
- **Razorpay Cryptographic Verification**:
  - `POST /api/resident/payments/verify` requires `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
  - The signature is recomputed using `crypto.createHmac('sha256', secret).update(...).digest('hex')` and validated using `crypto.timingSafeEqual` to prevent timing attacks.
  - Verification includes order ID parity, amount in paise consistency check, and remote gateway capture state verification.
  - Settled in an idempotent database transaction to prevent duplicate receipts upon repeated webhook callbacks.

---

## 5. Document Privacy & File Security

- **MIME Type & Size Restrictions**: Document uploads via `multer` enforce a 10 MB file ceiling and validate MIME types (PDF, JPEG, PNG).
- **Access Scoping**: Downloading or streaming resident documents (`GET /api/owner/documents/:id/download`) verifies resident and property association before issuing a time-limited signed URL (1-hour TTL).
- **Sensitive Data Masking**: Government identifiers (Aadhaar, PAN) are stored securely and never broadcast in unauthenticated or general event streams.

---

## 6. Immutable Audit Logging

All administrative, financial, and operational mutations trigger synchronous logging to the `AuditLog` table:
- **Captured Metadata**: `actorId`, `actorName`, `actorRole`, `action`, `entity`, `entityId`, `ipAddress`, and event `timestamp`.
- **Logged Events**: Resident onboarding, bed transfers, move-out settlements, manual payment entries, visitor gate approvals, ticket status changes, and emergency broadcasts.

---

## 7. Security Assessment Summary

| Risk Category | Pre-Audit Vulnerability Level | Post-Remediation Status |
|---|---|---|
| Multi-Tenant Leakage | Medium (Deposit API un-scoped) | **REMEDIATED (Scoped to Tenant)** |
| Cross-Role Access (RBAC) | Low (Strict middleware in place) | **VERIFIED (403 Enforced)** |
| Double Bed Allocation | High (Race condition possible) | **REMEDIATED (Strict Guard Added)** |
| Insecure Direct Object References | Low-Medium (Property fallback active) | **VERIFIED (IDOR Protected)** |
| Payment Forgery | Zero (Constant-time HMAC verified) | **VERIFIED (Idempotent & Secure)** |
