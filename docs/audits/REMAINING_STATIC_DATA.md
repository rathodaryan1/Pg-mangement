# Remaining Intentionally Static Data & UI Configuration

**Project:** Urban Nest PG Management SaaS  
**Date:** October 2026  

---

## 1. Intentionally Retained Static Data

Per the established rules of data classification (Section 2.B & 2.C), the following elements are intentionally retained as static:

### A. Navigation & Menus
- Role-based portal navigation labels (e.g., "Command Center", "Rooms & Beds", "Gate Desk", "Mess Attendance").
- Lucide React icon definitions associated with route items.

### B. Role & Permission Definitions
- Role definitions: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `RECEPTIONIST`, `ACCOUNTANT`, `MAINTENANCE`, `RESIDENT`, `COOK`, `SECURITY_GUARD`, `HOUSEKEEPING`.
- Permission sets mapping operations to authorized roles.

### C. Branding & Static Informational Copy
- Platform name: "Urban Nest PG Management".
- Informational copy, instructional hints, field labels, and validation error messages.

### D. Offline Reference Fixture
- `client/src/data/mockData.ts`: Retained exclusively as an offline schema fixture. Not imported or consumed by any runtime component.

---

## 2. Business Data Verification
All business records (residents, properties, rooms, beds, occupancy, payments, invoices, visitors, complaints, leave requests, menus, housekeeping, and SaaS plans) are dynamically sourced from PostgreSQL via Prisma ORM and the Express API.
