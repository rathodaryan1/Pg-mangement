# Repository-Wide Hardcoded & Mock Data Audit & Elimination Report

**Project:** Urban Nest PG Management SaaS  
**Audit Scope:** Client (React + Vite), Server (Express + Node.js), Database (Prisma ORM + PostgreSQL), Authentication, Dashboards, and Workflows  
**Date:** October 2026  
**Status:** Completed & Verified

---

## 1. Executive Summary

A comprehensive repository-wide audit was conducted to identify, categorize, and eliminate hardcoded business values, mock records, simulated API responses, and silent mock fallbacks across Urban Nest PG Management. Every finding has been categorized according to clear data classification rules and resolved by wiring to real persisted backend APIs, dynamic date calculations, or authentic empty states.

---

## 2. Itemized Findings & Resolutions

| # | File Path | Previous Implementation (Mock / Hardcoded) | Classification | Resolution Implemented |
|---|---|---|---|---|
| 1 | `client/src/context/AuthContext.tsx` | `DEFAULT_PROPERTY` had hardcoded counts (`totalRooms: 12, occupiedRooms: 10, totalBeds: 24, occupiedBeds: 20`) and `'prop-1'` ID. Fallback `'prop-1'` assigned on lines 86 & 169. | Business Data Fallback | Cleaned `DEFAULT_PROPERTY` to start with 0 counts and empty strings. Removed `'prop-1'` fallback in session assignment to ensure only authenticated property IDs are used. |
| 2 | `client/src/components/ui/QRPassCard.tsx` | Fabricated a fallback resident object (`token: 'RQRPASS-ACTIVE'`, `roomNumber: '101'`, `bedNumber: 'A'`, `propertyName: 'Urban Nest PG'`) if `residentPass` was undefined or inactive. | Business Data Fallback | Removed fabricated pass object. If unallocated or missing, renders a genuine `AlertTriangle` warning ("No Active Residence Allocation") instructing the resident to contact property management. |
| 3 | `client/src/components/ui/QRPassCard.tsx` | Fabricated a fallback visitor pass object (`id: 'VPASS-ACTIVE'`, `visitorName: 'Visitor Guest'`, `relation: 'Friend'`) if `visitor` prop was not passed. | Business Data Fallback | Replaced with genuine empty selection card ("No Visitor Pass Selected"). Passes require valid database visitor records. |
| 4 | `client/src/pages/resident/ResidentDashboardPage.tsx` | In catch block of `handleOpenResidentQR`, fabricated a fake QR pass (`token: RQRPASS-${data.resident.id}`) when the API failed. | Simulated Data Fallback | Removed token fabrication. Surfaced real server failure via `toast.error`, preserved `residentPass = null`, and prevented opening QR modal with simulated tokens. |
| 5 | `client/src/pages/owner/ResidentsPage.tsx` | Modal tabs displayed hardcoded fallbacks: Workplace (`'Software Engineer'`), Permanent Address (`'24, MG Road, Pune, Maharashtra 411001'`), Room (`'204'`), Bed (`'A'`), Move-In Date (`'2026-01-15'`), and doc action with static ID (`'doc-1'`). | Business Data Fallback | Replaced all static fallbacks with neutral values (`'Not provided'`, `'Not specified'`) or dynamic resident properties (`selectedResident.bed?.room?.number`, `selectedResident.bed?.bedNumber`). Mapped real documents from `selectedResident.documents` with real IDs and status badges. |
| 6 | `client/src/pages/owner/PaymentsPage.tsx` | Invoice and deposit form had hardcoded initial state (`amount: '14000'`, `period: 'October 2026'`, `dueDate: '2026-10-05'`, `amount: '28000'`). Receipt modal had hardcoded fallback `'UN-REC-2026-0901'` and resident `'Aakash Verma'`. | Business Data Fallback | Made initial period and due dates dynamically derived from `new Date()`. Empty initial amounts. Receipt modal dynamically computes receipt number from payment ID and defaults to `'Resident'`. |
| 7 | `client/src/pages/owner/ReportsPage.tsx` | Date range selector had static options (`'Current Month (September 2026)'`, `'Last Quarter (Q3 2026)'`, `'Year to Date (2026)'`). | UI Configuration | Replaced with dynamic date generators using `new Date().toLocaleString('default', { month: 'long', year: 'numeric' })` and `new Date().getFullYear()`. |
| 8 | `client/src/pages/owner/OwnerDashboardPage.tsx` | Billing charge modal had hardcoded initial period `'October 2026'` on lines 90 and 206. | UI Configuration | Replaced with dynamic `new Date().toLocaleString('default', { month: 'long', year: 'numeric' })`. |
| 9 | `client/src/pages/owner/UtilitiesPage.tsx` | Billing period defaulted to static string `'October 2026'` on line 30. | UI Configuration | Replaced with dynamic current month and year string generator. |
| 10 | `server/src/controllers/super-admin.controller.ts` | In `getDashboardStats`, monthly SaaS revenue was calculated with a static dictionary (`{ TRIAL: 0, STARTER: 2999, ... }`). | Business Logic Metric | Updated calculation to query persisted database plans via `prisma.plan.findMany()`. Included `planPricing` in dashboard stats payload so frontend and backend remain synchronized. |
| 11 | `client/src/pages/super-admin/SuperAdminRevenuePage.tsx` | Plan revenue breakdown used a static pricing dictionary on line 89. | Business Logic Metric | Updated to consume dynamic `planPricing` directly from the backend dashboard response. |
| 12 | `client/src/data/mockData.ts` | 689 lines of legacy mock objects (`MOCK_CURRENT_USER_OWNER`, `MOCK_PROPERTIES`, `MOCK_ROOMS`, etc.) that were orphaned and unused. | Development Fixture | Deprecated and marked explicitly as offline reference fixture. Documented that no production components import or consume this file. |
| 13 | `server/src/controllers/super-admin.controller.ts` & `super-admin.routes.ts` | SaaS Plan section was failing to load due to missing or misconfigured controller methods. | Backend Route / Controller | Implemented full `getPlans`, `createPlan`, `updatePlan`, `deletePlan` endpoints with database queries to `prisma.plan` and seed fallback. Verified compilation and route handling. |

---

## 3. Summary of Metrics

- **Total Hardcoded & Mock Sources Identified:** 13
- **Total Fixed / Dynamicized:** 13
- **Remaining Unresolved Business Mock Data:** 0
- **Retained Static Configuration:** Documented in `docs/audits/REMAINING_STATIC_DATA.md`
