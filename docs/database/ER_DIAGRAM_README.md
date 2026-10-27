# URBAN NEST — DATABASE ENTITY-RELATIONSHIP (ER) DIAGRAM & ARCHITECTURE DOCUMENTATION

**System**: Urban Nest Multi-Tenant PG & Property Management SaaS  
**Source of Truth**: `server/prisma/schema.prisma`  
**Database Provider**: PostgreSQL (Supabase Cluster)  
**Standard**: DBML v2 / DBdiagram.io Compatible | Academic & Production Print-Ready Standard  

---

## 1. EXECUTIVE SUMMARY

This document accompanies the official database Entity-Relationship (ER) diagram for the **Urban Nest** SaaS platform. The ER diagram has been constructed directly from the production Prisma schema without omitting, inventing, or hallucinating any models, fields, enums, or foreign key constraints.

All 27 relational database models, 29 enums, and 40 foreign key relationships are completely represented. The diagram deliverables have been prepared in multiple formats tailored for online exploration via **DBdiagram.io**, vector rendering via **SVG**, high-resolution raster display via **PNG**, and print-ready multi-page **A4 landscape PDF** for university project reports and production architectural reviews.

---

## 2. HOW TO IMPORT INTO DBDATAGRAM.IO

The DBML file `docs/database/urban_nest_er_diagram.dbml` is 100% syntactically valid and pre-validated using the official `@dbml/core` parser.

To render and explore the interactive diagram in DBdiagram.io:

1. Open your web browser and navigate to **[https://dbdiagram.io/d](https://dbdiagram.io/d)**.
2. In the left-hand code editor pane, delete any placeholder DBML.
3. Open `docs/database/urban_nest_er_diagram.dbml` from this repository in your code editor.
4. Copy the entire contents of `urban_nest_er_diagram.dbml` and paste it into the DBdiagram.io editor pane.
5. DBdiagram.io will instantly parse the DBML and generate the interactive visual diagram with all 27 tables organized neatly into their respective **TableGroups**.
6. You can rearrange entities, zoom into specific foreign-key connectors, inspect fields, and export to PDF/PNG as desired.

> **Note**: DBdiagram.io's engine recognizes the `TableGroup` definitions included in the file, which automatically group and color-coordinate related entities into logical modules (e.g., `saas_tenant_billing`, `property_hierarchy`, `resident_lifecycle`, `finance_billing`).

---

## 3. SCHEMA ARCHITECTURE STATISTICS

| Metric | Count | Description |
|---|---|---|
| **Relational Entities (Models)** | **27** | All tables mapped 1-to-1 with PostgreSQL database tables |
| **Enums** | **29** | Strongly typed enumeration types defined in PostgreSQL |
| **Explicit Foreign Key Constraints** | **40** | Enforced via Prisma `@relation(fields: [...], references: [...])` |
| **One-to-One Relationships (`1 : 1`)** | **3** | `Resident.userId - User.id`, `Resident.bedId - Bed.id`, `PaymentReceipt.paymentId - Payment.id` |
| **Many-to-One Relationships (`1 : N`)** | **37** | Hierarchical and tenant-scoped relational links |
| **Composite Unique Constraints** | **2** | `Room (number, propertyId)`, `Bed (bedNumber, roomId)` |
| **Model Database Indexes (`@@index`)** | **21** | Query optimization indexes across all high-throughput tables |

---

## 4. COMPLETE ENTITY INVENTORY (27 MODELS)

### Module 1: SaaS Tenants & Subscription Plans
1. **`Tenant`**: The root organization entity in the multi-tenant architecture. Represents a PG business group (e.g., "Green Valley PG Group"). Enforces subscription tier quotas (`maxProperties`, `maxRooms`, `maxResidents`), lifecycle statuses (`TenantStatus`), and isolation boundaries.
2. **`Plan`**: SaaS subscription plan catalogue defining tier names (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`), monthly/yearly pricing, quota ceilings, and enabled features.

### Module 2: Users & Authentication
3. **`User`**: Central identity table for all platform users. Stores bcrypt-hashed passwords, contact numbers, tenant associations (`tenantId`), assigned properties (`propertyId`), and hierarchical roles (`SUPER_ADMIN`, `OWNER`, `MANAGER`, `RECEPTIONIST`, `ACCOUNTANT`, `MAINTENANCE`, `RESIDENT`).

### Module 3: Property Hierarchy & Spatial Units
4. **`Property`**: Physical hostel or PG building campus. Scoped strictly to a parent `Tenant`. Stores contact details, GST, UPI ID, and property-specific Razorpay API credentials.
5. **`Building`**: Named architectural blocks within a property (e.g., "Block A", "Main Wing").
6. **`Floor`**: Numerical floor levels within a building (e.g., Floor 1, Floor 2).
7. **`Room`**: Living units situated on a floor. Specifies room capacity, base rent, security deposit, amenities string, and status (`AVAILABLE`, `FULL`, `MAINTENANCE`). Enforces composite uniqueness on `(number, propertyId)`.
8. **`Bed`**: Individual beds within a room (e.g., "Bed A", "Bed B"). Defines bed status (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`) and monthly rent. Enforces composite uniqueness on `(bedNumber, roomId)`.

### Module 4: Resident Dossier & Onboarding
9. **`Resident`**: Tenant occupant profile linked 1-to-1 to a `User` identity and assigned `Bed`. Contains full name, contact information, emergency contacts, permanent address, employer, move-in/out dates, and KYC verification status.

### Module 5: Lease Agreements & Security Deposits
10. **`Agreement`**: Legal lease contract between resident and PG property. Contains unique agreement numbers, validity dates, signed document URLs, and agreement statuses (`DRAFT`, `ACTIVE`, `EXPIRED`, `TERMINATED`).
11. **`SecurityDeposit`**: Financial deposit holding for a resident. Tracks deposit amounts, status (`PENDING`, `PAID`, `REFUNDED`, `PARTIALLY_REFUNDED`), damage deductions, and refund settlements.

### Module 6: Financial Ledger, Invoicing & Receipts
12. **`Payment`**: Comprehensive billing ledger recording rent dues, electricity bills, deposit collections, and maintenance charges. Stores charge categories (`ChargeCategory`), billing periods, payment statuses (`PENDING`, `PAID`, `OVERDUE`, `FAILED`), Razorpay order IDs, and transaction references.
13. **`PaymentReceipt`**: Immutable receipt issued upon successful payment settlement. Linked 1-to-1 with a parent `Payment` record with unique receipt numbers (e.g., `UN-REC-390413`).

### Module 7: Visitors & Gate Security
14. **`VisitorRequest`**: Visitor gate pass management. Tracks visitor details, relation, expected entry/exit times, approval status (`VisitorStatus`), check-in/out timestamps, and a unique cryptographic `qrPassToken` scanned at the security gate.

### Module 8: Maintenance & Complaints
15. **`Complaint`**: Maintenance tickets raised by residents or staff. Categorized by domain (`PLUMBING`, `ELECTRICAL`, `WIFI_INTERNET`, etc.) with priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) and lifecycle statuses (`REPORTED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
16. **`MaintenanceActivity`**: Granular, chronological audit log tracking status transitions and internal staff comments for a specific complaint ticket.

### Module 9: Resident Leave Applications
17. **`LeaveRequest`**: Night-out and leave permission applications submitted by residents. Captures from/to date ranges, reasons, and owner/warden approval statuses (`LeaveStatus`).

### Module 10: Documents & KYC File Storage
18. **`Document`**: Secure KYC and legal document metadata linked to residents and properties. Tracks document types (`AADHAAR`, `PAN`, `POLICE_VERIFICATION`, etc.), Supabase Storage URLs, file sizes, MIME types, and approval states (`PENDING`, `VERIFIED`, `REJECTED`).

### Module 11: Notices & Notifications
19. **`Notice`**: Circulars and notices published by property owners or wardens. Categorized by topic (`GENERAL`, `MAINTENANCE`, `RULES`, `EMERGENCY`) with priority flags and expiration timestamps.
20. **`Notification`**: Direct alerts and actionable notifications delivered to individual user accounts. Tracks read/unread states, link targets, and event categories.

### Module 12: Emergency SOS Incidents
21. **`SOSEvent`**: High-priority safety distress events triggered by residents. Captures incident timestamps, property location, acknowledgment personnel, and resolution notes.

### Module 13: Audit Trail & System Configuration
22. **`AuditLog`**: Immutable append-only audit trail capturing sensitive administrative actions, actor names, roles, IP addresses, entity mutations, and operational details.
23. **`Setting`**: Key-value platform configuration store (e.g., platform terms, default currencies, maintenance intervals).

### Module 14: Property Operations, Expenses & Assets
24. **`Expense`**: Operating expenditures incurred by a property (e.g., electricity bills, maintenance supplies, staff salaries, vendor invoices).
25. **`InventoryItem`**: Physical assets and stock tracking (e.g., air conditioners, water heaters, furniture, mattresses). Tracks condition (`AssetCondition`), quantities, and minimum thresholds.
26. **`OperationalTask`**: Housekeeping, deep cleaning, room inspection, and staff duty tracking with priorities and completion states.

### Module 15: Platform Helpdesk
27. **`SupportTicket`**: SaaS platform support tickets raised by property owners or public guest enquiries from the website contact form. Tracks ticket priority, assignment, and status.

---

## 5. COMPLETE ENUM INVENTORY (29 ENUMS)

1. **`TenantStatus`**: `TRIAL`, `ACTIVE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`, `ARCHIVED`
2. **`SubscriptionPlan`**: `TRIAL`, `STARTER`, `PROFESSIONAL`, `ENTERPRISE`
3. **`SubscriptionStatus`**: `ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELLED`, `EXPIRED`
4. **`UserRole`**: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `RECEPTIONIST`, `ACCOUNTANT`, `MAINTENANCE`, `RESIDENT`
5. **`RoomStatus`**: `AVAILABLE`, `FULL`, `MAINTENANCE`
6. **`BedStatus`**: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`
7. **`ResidentStatus`**: `PENDING_MOVE_IN`, `ACTIVE`, `NOTICE_PERIOD`, `MOVED_OUT`, `INACTIVE`
8. **`KycStatus`**: `PENDING`, `VERIFIED`, `REJECTED`
9. **`KycDocumentType`**: `AADHAAR`, `PAN`, `PASSPORT`, `VOTER_ID`
10. **`AgreementStatus`**: `DRAFT`, `ACTIVE`, `EXPIRED`, `TERMINATED`
11. **`DepositStatus`**: `PENDING`, `PAID`, `REFUNDED`, `PARTIALLY_REFUNDED`
12. **`PaymentStatus`**: `PENDING`, `PAID`, `OVERDUE`, `APPROVAL_PENDING`, `FAILED`
13. **`PaymentMethod`**: `CASH`, `UPI`, `NET_BANKING`, `CARD`, `RAZORPAY`
14. **`ChargeCategory`**: `RENT`, `SECURITY_DEPOSIT`, `ELECTRICITY`, `FOOD`, `MAINTENANCE_FEE`, `LATE_FINE`, `OTHER`
15. **`VisitorStatus`**: `PENDING`, `APPROVED`, `REJECTED`, `CHECKED_IN`, `CHECKED_OUT`, `EXPIRED`, `CANCELLED`
16. **`ComplaintCategory`**: `PLUMBING`, `ELECTRICAL`, `AIR_CONDITIONING`, `WIFI_INTERNET`, `CLEANING`, `CARPENTRY`, `PEST_CONTROL`, `OTHER`
17. **`ComplaintPriority`**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
18. **`ComplaintStatus`**: `REPORTED`, `ASSIGNED`, `IN_PROGRESS`, `WAITING`, `RESOLVED`, `CLOSED`
19. **`LeaveStatus`**: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`
20. **`DocumentType`**: `AADHAAR`, `PAN`, `AGREEMENT`, `POLICE_VERIFICATION`, `RECEIPT`, `OTHER`
21. **`DocumentStatus`**: `PENDING`, `VERIFIED`, `REJECTED`
22. **`NoticeCategory`**: `GENERAL`, `MAINTENANCE`, `PAYMENT`, `EMERGENCY`, `EVENT`, `RULES`
23. **`SOSStatus`**: `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`
24. **`ExpenseCategory`**: `ELECTRICITY`, `WATER`, `MAINTENANCE`, `SALARY`, `INTERNET`, `SUPPLIES`, `FOOD`, `OTHER`
25. **`AssetCondition`**: `EXCELLENT`, `GOOD`, `NEEDS_REPAIR`, `REPLACED`, `LOW_STOCK`
26. **`TaskPriority`**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
27. **`TaskStatus`**: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
28. **`TicketPriority`**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
29. **`TicketStatus`**: `OPEN`, `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, `RESOLVED`, `CLOSED`

---

## 6. COMPLETE FOREIGN KEY RELATIONSHIP MATRIX (40 CONSTRAINTS)

| # | Source Entity & Foreign Key | Target Entity & Primary Key | Cardinality | Cascading Action (`onDelete`) |
|---|---|---|---|---|
| 1 | `User.tenantId` | `Tenant.id` | Many-to-One (`>`) | `CASCADE` |
| 2 | `User.propertyId` | `Property.id` | Many-to-One (`>`) | `NO ACTION` (default) |
| 3 | `Property.tenantId` | `Tenant.id` | Many-to-One (`>`) | `CASCADE` |
| 4 | `Building.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 5 | `Floor.buildingId` | `Building.id` | Many-to-One (`>`) | `CASCADE` |
| 6 | `Room.floorId` | `Floor.id` | Many-to-One (`>`) | `SET NULL` |
| 7 | `Room.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 8 | `Bed.roomId` | `Room.id` | Many-to-One (`>`) | `CASCADE` |
| 9 | `Resident.userId` | `User.id` | One-to-One (`-`) | `CASCADE` |
| 10 | `Resident.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 11 | `Resident.bedId` | `Bed.id` | One-to-One (`-`) | `SET NULL` |
| 12 | `Agreement.residentId` | `Resident.id` | Many-to-One (`>`) | `CASCADE` |
| 13 | `Agreement.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 14 | `SecurityDeposit.residentId` | `Resident.id` | Many-to-One (`>`) | `CASCADE` |
| 15 | `SecurityDeposit.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 16 | `Payment.residentId` | `Resident.id` | Many-to-One (`>`) | `CASCADE` |
| 17 | `Payment.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 18 | `PaymentReceipt.paymentId` | `Payment.id` | One-to-One (`-`) | `CASCADE` |
| 19 | `VisitorRequest.residentId` | `Resident.id` | Many-to-One (`>`) | `CASCADE` |
| 20 | `VisitorRequest.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 21 | `Complaint.residentId` | `Resident.id` | Many-to-One (`>`) | `CASCADE` |
| 22 | `Complaint.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 23 | `Complaint.roomId` | `Room.id` | Many-to-One (`>`) | `SET NULL` |
| 24 | `MaintenanceActivity.complaintId`| `Complaint.id` | Many-to-One (`>`) | `CASCADE` |
| 25 | `LeaveRequest.residentId` | `Resident.id` | Many-to-One (`>`) | `CASCADE` |
| 26 | `LeaveRequest.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 27 | `Document.residentId` | `Resident.id` | Many-to-One (`>`) | `CASCADE` |
| 28 | `Document.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 29 | `Notice.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 30 | `Notification.userId` | `User.id` | Many-to-One (`>`) | `CASCADE` |
| 31 | `Notification.residentId` | `Resident.id` | Many-to-One (`>`) | `CASCADE` |
| 32 | `SOSEvent.residentId` | `Resident.id` | Many-to-One (`>`) | `CASCADE` |
| 33 | `SOSEvent.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 34 | `AuditLog.tenantId` | `Tenant.id` | Many-to-One (`>`) | `SET NULL` |
| 35 | `AuditLog.propertyId` | `Property.id` | Many-to-One (`>`) | `SET NULL` |
| 36 | `AuditLog.actorId` | `User.id` | Many-to-One (`>`) | `SET NULL` |
| 37 | `Expense.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 38 | `InventoryItem.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 39 | `OperationalTask.propertyId` | `Property.id` | Many-to-One (`>`) | `CASCADE` |
| 40 | `SupportTicket.tenantId` | `Tenant.id` | Many-to-One (`>`) | `CASCADE` |

> **Critical Note on Non-Relational Fields**: Fields such as `VisitorRequest.approvedBy`, `Complaint.assignedStaff`, `LeaveRequest.approvedBy`, `SOSEvent.acknowledgedBy`, `OperationalTask.assignedTo`, and `SupportTicket.assignedAdmin` are stored as scalar text identifiers and do NOT possess foreign-key constraints in the Prisma schema. As per instructions, they are accurately preserved as scalar attributes without inventing synthetic foreign keys.

---

## 7. PRINT-READY MULTI-PAGE A4 LANDSCAPE PDF STRUCTURE

To guarantee maximum legibility when printed on physical paper or submitted in academic/corporate reports, `urban_nest_er_diagram.pdf` is rendered in **A4 Landscape (297 × 210 mm)** across 5 modular sheets:

- **Sheet 1: SaaS Tenants, Subscriptions, Users & Authentication**
  - Features `Tenant`, `Plan`, `User`.
  - Includes code blocks for associated enums and security/identity enforcement rules.
  - Outbound reference markers pointing to Property and Resident modules.
- **Sheet 2: Property Structure, Spatial Units & Resident Dossier**
  - Features `Property`, `Building`, `Floor`, `Room`, `Bed`, `Resident`.
  - Visualizes the physical spatial containment chain: Property → Building → Floor → Room → Bed → Resident.
- **Sheet 3: Lease Agreements, Security Deposits & Financial Transactions**
  - Features `Agreement`, `SecurityDeposit`, `Payment`, `PaymentReceipt`.
  - Visualizes the payment-to-receipt atomicity and security deposit holding structure.
- **Sheet 4: Gate Security, Maintenance Ticketing & Documents**
  - Features `VisitorRequest`, `Complaint`, `MaintenanceActivity`, `LeaveRequest`, `Document`.
  - Visualizes the gate QR pass validation and two-level complaint activity history.
- **Sheet 5: Governance, Operations, Inventory & Platform Services**
  - Features `Notice`, `Notification`, `SOSEvent`, `Expense`, `InventoryItem`, `OperationalTask`, `AuditLog`, `Setting`, `SupportTicket`.
  - Contains complete operational support, emergency response, and audit log tracking.

In addition, `urban_nest_er_diagram_overview.pdf` provides a single-sheet comprehensive architecture map containing all 27 models arranged across 4 coordinated columns.

---

## 8. DELIVERABLE FILES CATALOG

All generated diagram files are maintained inside `docs/database/`:

1. **[`urban_nest_er_diagram.dbml`](file:///d:/Pg-mangement-main/Pg-mangement-main/docs/database/urban_nest_er_diagram.dbml)**
   - Official DBML v2 specification file. Ready for direct copy-paste into [DBdiagram.io](https://dbdiagram.io/).
2. **[`urban_nest_er_diagram.pdf`](file:///d:/Pg-mangement-main/Pg-mangement-main/docs/database/urban_nest_er_diagram.pdf)**
   - 5-page print-ready A4 landscape PDF (297 × 210 mm) formatted in high-contrast academic black and white.
3. **[`urban_nest_er_diagram_overview.pdf`](file:///d:/Pg-mangement-main/Pg-mangement-main/docs/database/urban_nest_er_diagram_overview.pdf)**
   - Single-sheet A4 landscape overview diagram containing all 27 tables.
4. **[`urban_nest_er_diagram.svg`](file:///d:/Pg-mangement-main/Pg-mangement-main/docs/database/urban_nest_er_diagram.svg)**
   - Scalable vector graphics (3200 × 2200 px) preserving vector fidelity at any zoom level.
5. **[`urban_nest_er_diagram.png`](file:///d:/Pg-mangement-main/Pg-mangement-main/docs/database/urban_nest_er_diagram.png)**
   - High-resolution 3200 px raster rendering generated via `@resvg/resvg-js`.
6. **[`ER_DIAGRAM_README.md`](file:///d:/Pg-mangement-main/Pg-mangement-main/docs/database/ER_DIAGRAM_README.md)**
   - This architectural manual and entity catalogue.
