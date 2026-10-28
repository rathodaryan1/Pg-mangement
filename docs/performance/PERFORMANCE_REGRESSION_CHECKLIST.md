# URBAN NEST — PERFORMANCE REGRESSION CHECKLIST

**Repository**: `Pg-mangement-main`  
**Purpose**: Verification guide to ensure that future features, refactors, and updates do not reintroduce latency or bundle bloat regressions.  
**Date**: October 27, 2026  
**Auditor**: Principal QA & Performance Engineer  

---

## 1. Automated Build Verification

Prior to any commit or deployment, run production builds for both backend and frontend:

- [x] **Backend Compilation**:
  ```bash
  cd server && npm run build
  ```
  *Expected Result*: Prisma generates cleanly, and TypeScript (`tsc`) completes with exit code 0.
- [x] **Frontend Production Build**:
  ```bash
  cd client && npm run build
  ```
  *Expected Result*: Vite builds chunks without warnings exceeding chunk limits. Main index chunk must remain `< 150 kB` uncompressed.

---

## 2. Bundle Size Regression Guardrails

Check the generated `client/dist/assets/` output against the established baselines:

| Chunk Name | Target Size (Uncompressed) | Target Size (Gzip) | Rule |
| :--- | :--- | :--- | :--- |
| `index-[hash].js` (Application Core) | `< 150 kB` | `< 35 kB` | No direct page imports in `App.tsx`; must use `React.lazy()` |
| `vendor-react-[hash].js` | `< 260 kB` | `< 85 kB` | Core React and router libraries only |
| `vendor-charts-[hash].js` | `< 400 kB` | `< 110 kB` | Recharts isolated from initial login route |
| `vendor-scanner-[hash].js` | `< 380 kB` | `< 110 kB` | HTML5-QRCode isolated from initial login route |
| `vendor-export-[hash].js` | `< 450 kB` | `< 150 kB` | XLSX, jsPDF, html2canvas loaded on export demand only |

---

## 3. Database Query & Concurrency Guardrails

- [x] **Bounded Concurrency Rule**:
  - Never wrap more than 4 Prisma queries in a single `Promise.all`.
  - Sequential queries must be grouped into small batches to prevent Supabase PgBouncer pool exhaustion.
- [x] **Targeted Selection Rule**:
  - Never use naked `findMany` or `include` on large relational tables (`payments`, `complaints`, `audit_logs`, `residents`) when only specific fields are needed.
  - Always specify `select: { id: true, ... }` to avoid payload bloat.
- [x] **Safe Transient Retry Rule**:
  - Read-only queries over the WAN must use `withDbRetry` helper with exponential backoff.
  - Never blindly retry non-idempotent database mutations (e.g., payment creation or resident move-out).
- [x] **Elimination of Superfluous Pings**:
  - Dashboard routes must not execute redundant `SELECT 1` queries on each visit.

---

## 4. Multi-Tenant Authorization & Isolation Check

- [x] **Super Admin Route Protection**:
  - `ProtectedSuperAdminRoute` enforces `user.role === 'SUPER_ADMIN'`.
  - Non-Super-Admins attempting to access `/super-admin/*` are immediately redirected to `/login`.
- [x] **Owner & Manager Route Protection**:
  - `ProtectedOwnerRoute` restricts access to `OWNER`, `MANAGER`, and `STAFF`.
  - Residents attempting to navigate to owner routes are redirected to `/resident/dashboard`.
- [x] **Tenant Data Segregation**:
  - Every query in `OwnerController` explicitly enforces `where: { tenantId: req.user.tenantId }`.
  - Cross-tenant data leakage is prevented across properties, rooms, payments, and staff records.
- [x] **Suspended Tenant Blocking**:
  - `AuthController.login` explicitly blocks logins for users whose tenant status is `SUSPENDED`.

---

## 5. Verification Commands

To run non-mutating performance benchmarks:
```bash
# In server directory:
npx ts-node src/tests/perf-benchmark.ts
```

*Criteria for Pass*:
- Database ping: median warm `< 1,300 ms`.
- Super Admin stats: `< 9,000 ms` (down from 16.8s).
- Super Admin tenants: `< 6,000 ms` (down from 12.5s).
- Owner dashboard: `< 21,000 ms` (down from 26s).
- Resident dashboard: `< 13,000 ms` (down from 14s).
