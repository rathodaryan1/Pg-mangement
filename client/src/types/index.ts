export type UserRole = 'OWNER' | 'MANAGER' | 'RESIDENT' | 'STAFF' | 'SUPER_ADMIN' | 'RECEPTIONIST' | 'MAINTENANCE' | 'ACCOUNTANT';

export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type SubscriptionPlan = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  status: TenantStatus;
  plan: SubscriptionPlan;
  subscriptionStatus?: string;
  trialEndsAt?: string;
  subscriptionStartedAt?: string;
  subscriptionEndsAt?: string;
  maxProperties: number;
  maxRooms: number;
  maxResidents: number;
  users?: User[];
  properties?: Property[];
  _count?: {
    properties: number;
    users: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  tier: SubscriptionPlan;
  priceMonthly: number;
  priceYearly: number;
  maxProperties: number;
  maxRooms: number;
  maxResidents: number;
  features: string[] | string;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  mobile?: string;
  tenantId?: string;
  tenant?: Partial<Tenant>;
  propertyId?: string;
  residentId?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  totalRooms?: number;
  occupiedRooms?: number;
  totalBeds?: number;
  occupiedBeds?: number;
  monthlyRevenue?: number;
  upiId?: string;
  gstNumber?: string;
  image?: string;
  type?: string;
}

export interface Bed {
  id: string;
  bedNumber: string; // e.g. "Bed A", "Bed B"
  roomId: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  residentId?: string;
  residentName?: string;
  monthlyRent: number;
}

export interface Room {
  id: string;
  number: string;
  building: string;
  floor: number;
  type: 'Single' | 'Double' | 'Triple' | 'Four Sharing';
  capacity: number;
  occupiedCount: number;
  baseRent: number;
  deposit: number;
  status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE';
  amenities: string[];
  propertyId: string;
  beds: Bed[];
}

export type ResidentStatus = 'PENDING_MOVE_IN' | 'ACTIVE' | 'NOTICE_PERIOD' | 'MOVED_OUT' | 'INACTIVE';

export interface Resident {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  alternateMobile?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  kycDocumentType: 'AADHAAR' | 'PAN' | 'PASSPORT';
  kycDocumentNumber: string;
  kycDocumentUrl?: string;
  joiningDate: string;
  expectedMoveOutDate?: string;
  status: ResidentStatus;
  propertyId: string;
  propertyName: string;
  roomId: string;
  roomNumber: string;
  bedId: string;
  bedNumber: string;
  monthlyRent: number;
  securityDeposit: number;
  depositPaid: boolean;
  rentDueDate: number; // Day of month e.g. 5
  lastPaymentDate?: string;
  workCompany?: string;
  permanentAddress: string;
  agreementSignedUrl?: string;
  agreementExpiryDate?: string;
}

export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL' | 'APPROVAL_PENDING';
export type PaymentMethod = 'UPI' | 'NET_BANKING' | 'CARD' | 'CASH' | 'RAZORPAY';
export type ChargeCategory = 'RENT' | 'SECURITY_DEPOSIT' | 'ELECTRICITY' | 'FOOD' | 'MAINTENANCE_FEE' | 'LATE_FINE' | 'OTHER';

export interface PaymentRecord {
  id: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  propertyId: string;
  category: ChargeCategory;
  period: string; // e.g., "September 2026"
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  transactionId?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  notes?: string;
}

export type VisitorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'EXPIRED';

export interface VisitorRequest {
  id: string;
  visitorName: string;
  visitorMobile: string;
  relation: string;
  purpose: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  propertyId: string;
  visitDate: string;
  expectedTime: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: VisitorStatus;
  approvedBy?: string;
  qrPassCode: string;
  createdTime: string;
}

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'PLUMBING' | 'ELECTRICAL' | 'AIR_CONDITIONING' | 'WIFI_INTERNET' | 'CLEANING' | 'CARPENTRY' | 'PEST_CONTROL' | 'OTHER';

export interface MaintenanceTicketHistory {
  id: string;
  status: TicketStatus;
  updatedBy: string;
  timestamp: string;
  comment: string;
}

export interface MaintenanceTicket {
  id: string;
  ticketNumber: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  residentId: string;
  residentName: string;
  roomNumber: string;
  propertyId: string;
  description: string;
  attachments?: string[];
  assignedStaffId?: string;
  assignedStaffName?: string;
  createdAt: string;
  resolvedAt?: string;
  rating?: number;
  feedback?: string;
  history: MaintenanceTicketHistory[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'WARDEN' | 'HOUSEKEEPING' | 'SECURITY' | 'ACCOUNTANT' | 'CHEF' | 'MAINTENANCE_TECH';
  mobile: string;
  propertyId: string;
  assignedBuilding?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  shift: 'MORNING' | 'EVENING' | 'NIGHT' | 'FULL_DAY';
  salary: number;
}

export interface OperationalTask {
  id: string;
  title: string;
  category: 'CLEANING' | 'INSPECTION' | 'MAINTENANCE' | 'DEPOSIT_REFUND' | 'RENT_COLLECTION';
  priority: TicketPriority;
  assignedStaffId: string;
  assignedStaffName: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  notes?: string;
}

export interface AssetInventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity?: number;
  propertyId: string;
  assignedRoomId?: string;
  assignedRoomNumber?: string;
  condition: string;
  purchaseDate: string;
  warrantyExpiry?: string;
  vendorName?: string;
  vendor?: string;
  location?: string;
  cost?: number;
  serviceHistoryCount?: number;
}

export interface PGNotice {
  id: string;
  title: string;
  content: string;
  category: 'GENERAL' | 'MAINTENANCE' | 'PAYMENT' | 'EMERGENCY' | 'EVENT';
  isImportant: boolean;
  propertyId: string;
  publishedAt: string;
  expiresAt?: string;
  publisherName: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetEntity: string;
  timestamp: string;
  ipAddress?: string;
  details: string;
}

export interface LeaveRequest {
  id: string;
  residentId: string;
  residentName: string;
  roomNumber: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedOn: string;
  approvedBy?: string;
}

export interface DashboardKPIs {
  totalOccupancyPercentage: number;
  occupiedBeds: number;
  totalBeds: number;
  vacantBeds: number;
  monthlyRevenue: number;
  outstandingRent: number;
  openComplaints: number;
  todayVisitors: number;
  actionRequired: {
    overdueRentsCount: number;
    pendingVisitorsCount: number;
    openMaintenanceCount: number;
    expiringAgreementsCount: number;
  };
}
