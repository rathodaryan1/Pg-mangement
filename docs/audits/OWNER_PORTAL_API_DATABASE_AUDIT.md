# URBAN NEST — OWNER PORTAL API & POSTGRESQL DATABASE AUDIT

**Audit Date**: October 27, 2026  
**Backend API Engine**: Node.js + Express + Prisma ORM  
**Database**: PostgreSQL 15+ (Hosted on Supabase with Transaction Pooling on Port 6543)

---

## 1. Complete API Endpoint Inventory

| Endpoint | Method | Auth & Role | Input Validation | PostgreSQL Model & Action | Isolation Behavior | Test Status |
|---|---|---|---|---|---|---|
| `/api/owner/dashboard` | `GET` | JWT, OWNER / ADMIN | Optional `propertyId` query param | Sequential `findMany`, `count` on Property, Bed, Room, Resident, Payment, Complaint, Visitor | Scoped to authenticated `tenantId` & active `propertyId` | PASS (HTTP 200) |
| `/api/owner/properties` | `GET` | JWT, OWNER / ADMIN | None | `Property.findMany` with buildings & rooms | Scoped strictly to user's `tenantId` | PASS (HTTP 200) |
| `/api/owner/properties` | `POST` | JWT, OWNER / ADMIN | Name, address, phone required | `Property.create` | Assigned to session `tenantId` | PASS (HTTP 201) |
| `/api/owner/properties/:id` | `PUT` | JWT, OWNER / ADMIN | Property ID, address, contact | `Property.update` | Verified `tenantId` ownership before edit | PASS (HTTP 200) |
| `/api/owner/properties/:id` | `DELETE` | JWT, OWNER / ADMIN | Property ID | Checks active residents, then archives | IDOR blocked on foreign tenant | PASS (HTTP 200) |
| `/api/owner/rooms` | `GET` | JWT, OWNER / ADMIN | Optional `propertyId`, `floorId` | `Room.findMany` include `beds`, `floor` | Filtered by owner properties | PASS (HTTP 200) |
| `/api/owner/rooms` | `POST` | JWT, OWNER / ADMIN | Room number, type, capacity, rent | Transaction: `Room.create` + `Bed.createMany` | Enforces `number_propertyId` uniqueness | PASS (HTTP 201) |
| `/api/owner/rooms/:id` | `PUT` | JWT, OWNER / ADMIN | Base rent, deposit, amenities | `Room.update` | Scoped by property ID | PASS (HTTP 200) |
| `/api/owner/rooms/:id` | `DELETE` | JWT, OWNER / ADMIN | Room ID | Checks for active residents in beds | Blocks deletion if occupied (HTTP 400) | PASS (HTTP 200) |
| `/api/owner/beds/:id/status` | `PATCH` | JWT, OWNER / ADMIN | Status (AVAILABLE/MAINTENANCE) | `Bed.update` | Blocks setting occupied bed to AVAILABLE | PASS (HTTP 200) |
| `/api/owner/residents` | `GET` | JWT, OWNER / ADMIN | Status, search query | `Resident.findMany` include `bed`, `room` | Property & tenant scoped | PASS (HTTP 200) |
| `/api/owner/residents` | `POST` | JWT, OWNER / ADMIN | Full name, email, mobile, bedId | Transaction: `User.create`, `Resident.create`, `Bed.update(OCCUPIED)` | Verifies bed is AVAILABLE before assign | PASS (HTTP 201) |
| `/api/owner/residents/:id` | `GET` | JWT, OWNER / ADMIN | Resident ID | `Resident.findUnique` include documents & beds | IDOR blocked across properties | PASS (HTTP 200) |
| `/api/owner/residents/:id/notice` | `PATCH` | JWT, OWNER / ADMIN | Expected move out date | `Resident.update` status to NOTICE_PERIOD | Property verified | PASS (HTTP 200) |
| `/api/owner/residents/:id/move-out` | `POST` | JWT, OWNER / ADMIN | Move out date, deductions | Transaction: `Resident.update(MOVED_OUT)`, `Bed.update(AVAILABLE)`, `SecurityDeposit.update` | Property verified, releases bed atomically | PASS (HTTP 200) |
| `/api/owner/residents/:id/transfer` | `POST` | JWT, OWNER / ADMIN | New bedId, transfer date | Transaction: `Bed.update(old->AVAILABLE)`, `Bed.update(new->OCCUPIED)`, `Resident.update` | Verifies target bed availability | PASS (HTTP 200) |
| `/api/owner/payments` | `GET` | JWT, OWNER / ADMIN | Status, date range, propertyId | `Payment.findMany` include `resident`, `receipt` | Scoped to propertyFilter | PASS (HTTP 200) |
| `/api/owner/payments/manual` | `POST` | JWT, OWNER / ADMIN | ResidentId, amount, method (CASH/UPI) | Transaction: `Payment.create(PAID)`, `PaymentReceipt.create` | Generates official tax receipt number | PASS (HTTP 201) |
| `/api/owner/payments/:id/receipt` | `GET` | JWT, OWNER / ADMIN | Payment ID | `PaymentReceipt.findUnique` | Returns formatted digital receipt | PASS (HTTP 200) |
| `/api/owner/deposits` | `GET` | JWT, OWNER / ADMIN | Optional `propertyId` | `SecurityDeposit.findMany` with propertyFilter | Tenant & property scoped (fixed leak) | PASS (HTTP 200) |
| `/api/owner/visitors` | `GET` | JWT, OWNER / ADMIN | Status filter | `VisitorRequest.findMany` include resident | Filtered by owner properties | PASS (HTTP 200) |
| `/api/owner/visitors/:id/status` | `PATCH` | JWT, OWNER / ADMIN | Status (APPROVED/REJECTED) | `VisitorRequest.update` | Scoped to property | PASS (HTTP 200) |
| `/api/owner/visitors/verify-qr` | `POST` | JWT, OWNER / ADMIN | `qrToken` string | `VisitorRequest.findUnique({ qrPassToken })` | Validates gate pass authenticity | PASS (HTTP 200) |
| `/api/owner/visitors/:id/check-in` | `POST` | JWT, OWNER / ADMIN | Visitor ID | `VisitorRequest.update` timestamp | Property scoped | PASS (HTTP 200) |
| `/api/owner/visitors/:id/check-out` | `POST` | JWT, OWNER / ADMIN | Visitor ID | `VisitorRequest.update` timestamp | Property scoped | PASS (HTTP 200) |
| `/api/owner/complaints` | `GET` | JWT, OWNER / ADMIN | Priority, status filters | `Complaint.findMany` include activities | Scoped to propertyFilter | PASS (HTTP 200) |
| `/api/owner/complaints/:id` | `PATCH` | JWT, OWNER / ADMIN | Status, assignedStaff | Transaction: `Complaint.update`, `MaintenanceActivity.create` | Records audit trail on transition | PASS (HTTP 200) |
| `/api/owner/complaints/:id/activity` | `POST` | JWT, OWNER / ADMIN | Comment text | `MaintenanceActivity.create` | Linked to complaint ID | PASS (HTTP 201) |
| `/api/owner/leave` | `GET` | JWT, OWNER / ADMIN | Resident, status filters | `LeaveRequest.findMany` | Scoped to propertyFilter | PASS (HTTP 200) |
| `/api/owner/leave/:id/status` | `PATCH` | JWT, OWNER / ADMIN | Status (APPROVED/REJECTED) | `LeaveRequest.update` | Verified approver ownership | PASS (HTTP 200) |
| `/api/owner/documents/:id/verify` | `PATCH` | JWT, OWNER / ADMIN | Document ID | `Document.update(VERIFIED)` | Verified property ownership | PASS (HTTP 200) |
| `/api/owner/documents/:id/reject` | `PATCH` | JWT, OWNER / ADMIN | Rejection reason string | `Document.update(REJECTED, reason)` | Verified property ownership | PASS (HTTP 200) |
| `/api/owner/inventory` | `GET` | JWT, OWNER / ADMIN | Category, stock filter | `InventoryItem.findMany` | Scoped to propertyFilter | PASS (HTTP 200) |
| `/api/owner/inventory` | `POST` | JWT, OWNER / ADMIN | Name, category, quantity, minStock | `InventoryItem.create` | Assigned to property | PASS (HTTP 201) |
| `/api/owner/staff` | `GET` | JWT, OWNER / ADMIN | Role filter | `User.findMany` (role in MANAGER, etc.) | Scoped to tenantId | PASS (HTTP 200) |
| `/api/owner/staff` | `POST` | JWT, OWNER / ADMIN | Name, email, password, role | `User.create` with bcrypt hash | Prevented SUPER_ADMIN elevation | PASS (HTTP 201) |
| `/api/owner/notices` | `POST` | JWT, OWNER / ADMIN | Title, content, propertyId | `Notice.create` | Property scoped broadcast | PASS (HTTP 201) |
| `/api/owner/audit-logs` | `GET` | JWT, OWNER / ADMIN | Limit, action filters | `AuditLog.findMany` | Tenant and property scoped | PASS (HTTP 200) |

---

## 2. PostgreSQL Schema & Relational Integrity

### 2.1 Enforced Foreign Key Cascades & Restrictions
- `Property → Building → Floor → Room → Bed`: Structured hierarchical integrity. Rooms reference floors and properties; beds reference rooms with `onDelete: Cascade`.
- `Resident → Bed`: Resident references `bedId` with unique assignment validation.
- `Payment → PaymentReceipt`: 1-to-1 relationship with unique receipt numbers (`UN-REC-XXXXXX`).
- `Complaint → MaintenanceActivity`: Historical timeline persisted on ticket transitions.

### 2.2 Atomic Transactions (`prisma.$transaction`)
The following critical workflows are guaranteed atomic:
1. **Room Creation**: Room inserted and child beds A, B, C, D generated atomically.
2. **Resident Onboarding**: User account created, Resident profile registered, target bed marked `OCCUPIED`.
3. **Move-Out Settlement**: Resident status set to `MOVED_OUT`, bed freed to `AVAILABLE`, security deposit refunded.
4. **Room Transfer**: Old bed released, new bed claimed, resident pointer swapped.
5. **Payment Settlement**: Invoice status updated to `PAID` and `PaymentReceipt` generated in a single atomic commit.

---

## 3. Database Connection & Pooling Strategy
- **Port 6543 (Transaction Pooler)**: Used for active production queries with `pgbouncer=true`.
- **Prepared Statement Deallocation**: `DEALLOCATE ALL` commands properly handled by transaction pooler.
- **Sequential Query Execution with Retry**: Refactored `getDashboard` from uncoordinated `Promise.all` spikes to resilient sequential execution with `withDbRetry` exponential backoff, preventing connection pool dropouts.
