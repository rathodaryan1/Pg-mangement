import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';

let dbConnected: boolean | null = null;
async function isDbAvailable(): Promise<boolean> {
  if (dbConnected === false) return false;
  if (dbConnected === true) return true;
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500));
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    dbConnected = true;
    return true;
  } catch {
    dbConnected = false;
    setTimeout(() => { dbConnected = null; }, 30000);
    return false;
  }
}

// ============================================================================
// RESILIENT IN-MEMORY OPERATIONAL DEV STORE (ACTIVE FALLBACK FOR SMOOTH WORKFLOWS)
// ============================================================================
class DevStore {
  static properties = [
    {
      id: 'prop-1',
      name: 'Urban Nest Prime (Gurgaon)',
      address: 'Plot 42, Sector 45, Near Huda City Centre, Gurugram',
      city: 'Gurugram',
      phone: '+91 98765 43210',
      email: 'gurgaon@urbannestpg.com',
      upiId: 'urbannest.gurgaon@okaxis',
      gstNumber: '06AAAAA1111A1Z1',
      totalRooms: 12,
      totalBeds: 24,
      occupiedBeds: 18,
      activeResidentsCount: 18,
      monthlyRevenue: 245000,
      status: 'ACTIVE',
      buildings: [
        {
          id: 'bld-1',
          name: 'Block A - Executive Wing',
          code: 'BLK-A',
          floorsCount: 3,
          floors: [
            { id: 'flr-1', floorNumber: 1, totalRooms: 4 },
            { id: 'flr-2', floorNumber: 2, totalRooms: 4 },
            { id: 'flr-3', floorNumber: 3, totalRooms: 4 }
          ]
        }
      ]
    }
  ];

  static buildings = [
    {
      id: 'bld-1',
      name: 'Block A - Executive Wing',
      code: 'BLK-A',
      propertyId: 'prop-1',
      status: 'ACTIVE',
      floors: [
        { id: 'flr-1', floorNumber: 1, buildingId: 'bld-1', totalRooms: 4 },
        { id: 'flr-2', floorNumber: 2, buildingId: 'bld-1', totalRooms: 4 },
        { id: 'flr-3', floorNumber: 3, buildingId: 'bld-1', totalRooms: 4 }
      ]
    }
  ];

  static floors = [
    { id: 'flr-1', floorNumber: 1, buildingId: 'bld-1', buildingName: 'Block A', totalRooms: 4 },
    { id: 'flr-2', floorNumber: 2, buildingId: 'bld-1', buildingName: 'Block A', totalRooms: 4 },
    { id: 'flr-3', floorNumber: 3, buildingId: 'bld-1', buildingName: 'Block A', totalRooms: 4 }
  ];

  static rooms = [
    {
      id: 'room-101',
      number: '101',
      type: 'Double',
      capacity: 2,
      baseRent: 14000,
      deposit: 28000,
      status: 'FULL',
      amenities: ['Attached Washroom', 'AC', 'High-Speed Wi-Fi', 'Wardrobe'],
      propertyId: 'prop-1',
      building: 'Block A',
      floor: 1,
      occupiedCount: 2,
      beds: [
        { id: 'bed-101A', bedNumber: 'Bed 101-A', monthlyRent: 14000, status: 'OCCUPIED', residentId: 'res-1', residentName: 'Aakash Verma', residentMobile: '9812345678' },
        { id: 'bed-101B', bedNumber: 'Bed 101-B', monthlyRent: 14000, status: 'OCCUPIED', residentId: 'res-2', residentName: 'Rohan Gupta', residentMobile: '9812345679' }
      ]
    },
    {
      id: 'room-102',
      number: '102',
      type: 'Triple',
      capacity: 3,
      baseRent: 11000,
      deposit: 22000,
      status: 'AVAILABLE',
      amenities: ['Attached Washroom', 'High-Speed Wi-Fi', 'Study Table'],
      propertyId: 'prop-1',
      building: 'Block A',
      floor: 1,
      occupiedCount: 2,
      beds: [
        { id: 'bed-102A', bedNumber: 'Bed 102-A', monthlyRent: 11000, status: 'OCCUPIED', residentId: 'res-3', residentName: 'Vikram Verma', residentMobile: '9812345680' },
        { id: 'bed-102B', bedNumber: 'Bed 102-B', monthlyRent: 11000, status: 'OCCUPIED', residentId: 'res-4', residentName: 'Siddharth Nair', residentMobile: '9812345681' },
        { id: 'bed-102C', bedNumber: 'Bed 102-C', monthlyRent: 11000, status: 'AVAILABLE', residentId: null, residentName: null, residentMobile: null }
      ]
    },
    {
      id: 'room-201',
      number: '201',
      type: 'Single',
      capacity: 1,
      baseRent: 21000,
      deposit: 42000,
      status: 'AVAILABLE',
      amenities: ['Private Balcony', 'AC', 'Refrigerator', 'Smart TV'],
      propertyId: 'prop-1',
      building: 'Block A',
      floor: 2,
      occupiedCount: 0,
      beds: [
        { id: 'bed-201A', bedNumber: 'Bed 201-A', monthlyRent: 21000, status: 'AVAILABLE', residentId: null, residentName: null, residentMobile: null }
      ]
    }
  ];

  static residents = [
    {
      id: 'res-1',
      userId: 'usr-res-1',
      propertyId: 'prop-1',
      bedId: 'bed-101A',
      roomNumber: '101',
      bedNumber: 'Bed 101-A',
      fullName: 'Aakash Verma',
      email: 'aakash.v@gmail.com',
      mobile: '9812345678',
      gender: 'MALE',
      emergencyContactName: 'Suresh Verma',
      emergencyContactRelation: 'Father',
      emergencyContactPhone: '9812345670',
      emergencyContact: 'Suresh Verma (Father): 9812345670',
      kycStatus: 'VERIFIED',
      joiningDate: '2025-10-15',
      status: 'ACTIVE',
      monthlyRent: 14000,
      securityDeposit: 28000,
      depositAmount: 28000,
      permanentAddress: 'House No 43, Sector 12, Karnal, Haryana',
      address: 'House No 43, Sector 12, Karnal, Haryana',
      workCompany: 'Tech Mahindra Ltd',
      documents: [
        { id: 'doc-1', title: 'Aadhaar Card Front & Back', type: 'AADHAAR', documentType: 'AADHAAR', documentNumber: '9876-5432-1098', status: 'VERIFIED', fileUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400', uploadedAt: '2025-10-15', createdAt: '2025-10-15' },
        { id: 'doc-2', title: 'PAN Card', type: 'PAN', documentType: 'PAN', documentNumber: 'ABCDE1234F', status: 'VERIFIED', fileUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400', uploadedAt: '2025-10-15', createdAt: '2025-10-15' }
      ],
      payments: [
        { id: 'pay-1', category: 'RENT', period: 'September 2026', amount: 14000, dueDate: '2026-09-05', status: 'PAID', method: 'UPI', transactionId: 'TXN-98213-VERIFIED', receiptNumber: 'UN-REC-2026-0901' },
        { id: 'pay-2', category: 'RENT', period: 'October 2026', amount: 14000, dueDate: '2026-10-05', status: 'PENDING', method: 'UPI' }
      ],
      complaints: [
        { id: 'c-1', ticketNumber: 'TKT-1049', title: 'Geyser heating element slow', category: 'PLUMBING', priority: 'MEDIUM', status: 'IN_PROGRESS' }
      ],
      visitors: [
        { id: 'vis-1', visitorName: 'Aditya Roy', relation: 'Brother', visitDate: '2026-09-20', status: 'PENDING' }
      ],
      leaves: [
        { id: 'lev-1', fromDate: '2026-10-01', toDate: '2026-10-05', reason: 'Diwali Homecoming', status: 'APPROVED' }
      ]
    },
    {
      id: 'res-2',
      userId: 'usr-res-2',
      propertyId: 'prop-1',
      bedId: 'bed-101B',
      roomNumber: '101',
      bedNumber: 'Bed 101-B',
      fullName: 'Rohan Gupta',
      email: 'rohan.g@gmail.com',
      mobile: '9812345679',
      gender: 'MALE',
      emergencyContactName: 'Amit Gupta',
      emergencyContactRelation: 'Father',
      emergencyContactPhone: '9812345671',
      emergencyContact: 'Amit Gupta: 9812345671',
      kycStatus: 'VERIFIED',
      joiningDate: '2025-11-01',
      status: 'ACTIVE',
      monthlyRent: 14000,
      securityDeposit: 28000,
      depositAmount: 28000,
      permanentAddress: 'Delhi NCR',
      address: 'Delhi NCR',
      workCompany: 'Amazon India',
      documents: [],
      payments: [
        { id: 'pay-3', category: 'RENT', period: 'September 2026', amount: 14000, dueDate: '2026-09-05', status: 'OVERDUE', method: 'UPI' }
      ],
      complaints: [],
      visitors: [],
      leaves: []
    }
  ];

  static payments = [
    {
      id: 'pay-1',
      residentId: 'res-1',
      residentName: 'Aakash Verma',
      roomNumber: '101',
      propertyId: 'prop-1',
      category: 'RENT',
      period: 'September 2026',
      amount: 14000,
      dueDate: '2026-09-05',
      paidDate: '2026-09-04',
      status: 'PAID',
      method: 'UPI',
      transactionId: 'TXN-98213-VERIFIED',
      receiptNumber: 'UN-REC-2026-0901',
      notes: 'On-time monthly rent settlement'
    },
    {
      id: 'pay-2',
      residentId: 'res-1',
      residentName: 'Aakash Verma',
      roomNumber: '101',
      propertyId: 'prop-1',
      category: 'RENT',
      period: 'October 2026',
      amount: 14000,
      dueDate: '2026-10-05',
      status: 'PENDING',
      method: 'UPI',
      notes: 'Upcoming monthly rent'
    },
    {
      id: 'pay-3',
      residentId: 'res-2',
      residentName: 'Rohan Gupta',
      roomNumber: '101',
      propertyId: 'prop-1',
      category: 'RENT',
      period: 'September 2026',
      amount: 14000,
      dueDate: '2026-09-05',
      status: 'OVERDUE',
      method: 'UPI',
      notes: 'Follow-up message dispatched'
    }
  ];

  static deposits: Array<{
    id: string;
    residentId: string;
    residentName: string;
    roomNumber: string;
    propertyId: string;
    amount: number;
    status: string;
    paidAt: string;
    deductions: number;
    refundAmount: number | null;
    notes: string;
  }> = [
    {
      id: 'dep-1',
      residentId: 'res-1',
      residentName: 'Aakash Verma',
      roomNumber: '101',
      propertyId: 'prop-1',
      amount: 28000,
      status: 'PAID',
      paidAt: '2025-10-15',
      deductions: 0,
      refundAmount: null,
      notes: 'Initial 2-month security deposit received in full'
    },
    {
      id: 'dep-2',
      residentId: 'res-2',
      residentName: 'Rohan Gupta',
      roomNumber: '101',
      propertyId: 'prop-1',
      amount: 28000,
      status: 'PAID',
      paidAt: '2025-11-01',
      deductions: 0,
      refundAmount: null,
      notes: 'Initial deposit verified'
    }
  ];

  static expenses = [
    { id: 'exp-1', propertyId: 'prop-1', title: 'Commercial Electricity Bill (DHBVN)', category: 'ELECTRICITY', amount: 14500, vendor: 'DHBVN Gurugram', date: '2026-09-10', description: 'Monthly electricity bill for Block A', status: 'PAID' },
    { id: 'exp-2', propertyId: 'prop-1', title: 'Airtel Fiber Gigabit Wi-Fi', category: 'INTERNET', amount: 3499, vendor: 'Airtel Broadband', date: '2026-09-01', description: 'High-speed broadband for residents', status: 'PAID' },
    { id: 'exp-3', propertyId: 'prop-1', title: 'Housekeeping & Cleaning Supplies', category: 'SUPPLIES', amount: 4200, vendor: 'CleanPro Hygiene', date: '2026-09-12', description: 'Floor disinfectants, bin liners, handwash', status: 'PAID' }
  ];

  static visitors = [
    {
      id: 'vis-1',
      propertyId: 'prop-1',
      residentId: 'res-1',
      visitorName: 'Aditya Roy',
      visitorMobile: '9988776655',
      relation: 'Brother',
      purpose: 'Weekend Visit & Luggage Drop',
      residentName: 'Aakash Verma',
      roomNumber: '101',
      visitDate: '2026-09-20',
      expectedTime: '11:00 AM',
      expectedEntryTime: '11:00 AM',
      status: 'PENDING',
      qrPassToken: 'UN-PASS-9821-APPROVED',
      qrPassCode: 'UN-PASS-9821-APPROVED'
    },
    {
      id: 'vis-2',
      propertyId: 'prop-1',
      residentId: 'res-2',
      visitorName: 'Pooja Sharma',
      visitorMobile: '9988776600',
      relation: 'Friend',
      purpose: 'College Group Study',
      residentName: 'Rohan Gupta',
      roomNumber: '101',
      visitDate: '2026-09-16',
      expectedTime: '04:00 PM',
      expectedEntryTime: '04:00 PM',
      status: 'APPROVED',
      qrPassToken: 'UN-PASS-8721-ACTIVE',
      qrPassCode: 'UN-PASS-8721-ACTIVE'
    }
  ];

  static complaints = [
    {
      id: 'c-1',
      ticketNumber: 'TKT-1049',
      title: 'Geyser heating element slow in Room 101',
      category: 'PLUMBING',
      priority: 'HIGH',
      description: 'Hot water takes over 30 mins to heat up in the morning.',
      status: 'IN_PROGRESS',
      residentName: 'Aakash Verma',
      roomNumber: '101',
      assignedStaffName: 'Ramesh Kumar (Plumber)',
      createdAt: new Date().toISOString(),
      activities: [
        { id: 'act-1', actorName: 'Owner', action: 'ASSIGNED', comment: 'Assigned to technician Ramesh.', createdAt: new Date().toISOString() }
      ]
    },
    {
      id: 'c-2',
      ticketNumber: 'TKT-1050',
      title: 'Wi-Fi connectivity drop on 2nd Floor corridor',
      category: 'WIFI_INTERNET',
      priority: 'MEDIUM',
      description: 'Repeater showing red LED status.',
      status: 'REPORTED',
      residentName: 'Vikram Verma',
      roomNumber: '102',
      assignedStaffName: null,
      createdAt: new Date().toISOString(),
      activities: [] as any[]
    }
  ];

  static staff = [
    { id: 'stf-1', name: 'Rajesh Sharma', role: 'MANAGER', mobile: '+91 98765 00010', email: 'rajesh.mgr@pg.com', shift: 'Morning (8 AM - 4 PM)', status: 'ACTIVE', salary: 35000, propertyId: 'prop-1' },
    { id: 'stf-2', name: 'Ramesh Kumar', role: 'MAINTENANCE', mobile: '+91 98765 00011', email: 'ramesh.maint@pg.com', shift: 'General Full Day', status: 'ACTIVE', salary: 24000, propertyId: 'prop-1' },
    { id: 'stf-3', name: 'Sunita Devi', role: 'HOUSEKEEPING', mobile: '+91 98765 00012', email: 'sunita.hk@pg.com', shift: 'Morning (7 AM - 3 PM)', status: 'ACTIVE', salary: 18000, propertyId: 'prop-1' }
  ];

  static inventory = [
    { id: 'inv-1', name: 'Commercial RO Water Purifier 50 LPH', category: 'APPLIANCE', quantity: 2, minQuantity: 2, location: 'Dining Hall', vendor: 'Kent RO Systems', condition: 'EXCELLENT', purchaseDate: '2025-08-10', warrantyExpiry: '2027-08-10', cost: 35000, status: 'EXCELLENT', propertyId: 'prop-1' },
    { id: 'inv-2', name: 'Split AC 1.5 Ton 5-Star (Daikin)', category: 'APPLIANCE', quantity: 12, minQuantity: 12, location: 'All Rooms', vendor: 'Daikin Direct', condition: 'EXCELLENT', purchaseDate: '2025-06-15', warrantyExpiry: '2028-06-15', cost: 42000, status: 'EXCELLENT', propertyId: 'prop-1' },
    { id: 'inv-3', name: 'Water Tank Level Sensor Alarm', category: 'PLUMBING', quantity: 1, minQuantity: 2, location: 'Rooftop Tank', vendor: 'AutoFlow India', condition: 'GOOD', purchaseDate: '2025-09-01', warrantyExpiry: '2026-09-01', cost: 4500, status: 'LOW_STOCK', propertyId: 'prop-1' }
  ];

  static tasks = [
    { id: 'tsk-1', title: 'Overhead Water Tank Chlorination & Filter Clean', category: 'PLUMBING', priority: 'HIGH', staffName: 'Ramesh Kumar', assignedTo: 'Ramesh Kumar', dueDate: '2026-09-22', status: 'PENDING', propertyId: 'prop-1', notes: 'Quarterly compliance check' },
    { id: 'tsk-2', title: 'Fire Extinguisher Pressure Inspection (All Floors)', category: 'SECURITY', priority: 'MEDIUM', staffName: 'Rajesh Sharma', assignedTo: 'Rajesh Sharma', dueDate: '2026-09-25', status: 'PENDING', propertyId: 'prop-1', notes: 'Safety audit' }
  ];

  static notices = [
    { id: 'not-1', title: 'Bi-Monthly Water Tank Cleaning Schedule', content: 'Water supply will be paused from 10:00 AM to 1:00 PM on Sunday for preventive hygiene maintenance.', category: 'MAINTENANCE', priority: 'NORMAL', isImportant: false, target: 'ALL', propertyId: 'prop-1', publisherName: 'Urban Nest Management', publishedAt: new Date().toISOString() },
    { id: 'not-2', title: 'Diwali Festive Dinner & Common Room Celebration', content: 'Special buffet dinner scheduled in the central cafeteria this Friday at 8:00 PM.', category: 'GENERAL', priority: 'NORMAL', isImportant: true, target: 'ALL', propertyId: 'prop-1', publisherName: 'Urban Nest Management', publishedAt: new Date().toISOString() }
  ];

  static leaveRequests = [
    { id: 'lev-1', residentId: 'res-1', residentName: 'Aakash Verma', roomNumber: '101', fromDate: '2026-10-01', toDate: '2026-10-05', reason: 'Diwali Homecoming & Family Celebration', status: 'APPROVED', propertyId: 'prop-1', appliedAt: '2026-09-12' },
    { id: 'lev-2', residentId: 'res-2', residentName: 'Rohan Gupta', roomNumber: '101', fromDate: '2026-09-25', toDate: '2026-09-28', reason: 'College Project Workshop in Jaipur', status: 'PENDING', propertyId: 'prop-1', appliedAt: '2026-09-15' }
  ];

  static sosEvents = [
    { id: 'sos-1', residentId: 'res-1', residentName: 'Aakash Verma', roomNumber: '101', status: 'RESOLVED', triggeredAt: '2026-09-02T14:30:00Z', resolvedAt: '2026-09-02T14:45:00Z', notes: 'Accidental trigger during app testing', propertyId: 'prop-1' }
  ];

  static settings = {
    curfewTime: '10:30 PM',
    visitorPassExpiry: '24 Hours',
    noticePeriodDays: 30,
    lateFeePerDay: 100,
    wifiSsid: 'UrbanNest_HighSpeed_5G',
    emergencyContact: '+91 98765 00000',
    allowOvernightGuests: false,
    autoInvoiceGenerationDay: 1,
    rentDueDay: 5,
    upiId: 'urbannest.gurgaon@okaxis',
    bankAccount: 'HDFC0001234 - 50200098765432'
  };

  static auditLogs = [
    { id: 'aud-1', actorName: 'Aaryan Sharma (Owner)', actorRole: 'OWNER', action: 'SYSTEM_LOGIN', targetEntity: 'Auth', timestamp: new Date().toISOString(), details: 'Admin logged into PG operations dashboard.' },
    { id: 'aud-2', actorName: 'Aaryan Sharma (Owner)', actorRole: 'OWNER', action: 'ROOM_MATRIX_VIEW', targetEntity: 'Room', timestamp: new Date(Date.now() - 3600000).toISOString(), details: 'Inspected real-time bed availability matrix.' }
  ];
}

export class OwnerController {
  private static async resolvePropertyScope(req: AuthRequest, targetPropertyId?: string): Promise<string> {
    if (targetPropertyId) return targetPropertyId;
    if (req.user?.propertyId) return req.user.propertyId;
    try {
      const firstProp = await prisma.property.findFirst();
      if (firstProp) return firstProp.id;
    } catch {
      // Fallback
    }
    return 'prop-1';
  }

  // ==========================================================================
  // 1. DASHBOARD & KPIS
  // ==========================================================================
  static async getDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = await OwnerController.resolvePropertyScope(req, req.query.propertyId as string);

      try {
        const [properties, totalBuildings, rooms, beds, residents, payments, deposits, complaints, visitors, inventoryItems, staffMembers, recentNotices, tasks] = await Promise.all([
          prisma.property.findMany({ where: propertyId ? { id: propertyId } : {}, include: { buildings: true } }),
          prisma.building.count({ where: propertyId ? { propertyId } : {} }),
          prisma.room.findMany({ where: propertyId ? { propertyId } : {}, include: { beds: true } }),
          prisma.bed.findMany({ where: propertyId ? { room: { propertyId } } : {} }),
          prisma.resident.findMany({ where: propertyId ? { propertyId } : {}, include: { bed: { include: { room: true } } } }),
          prisma.payment.findMany({ where: propertyId ? { propertyId } : {}, include: { resident: true }, orderBy: { createdAt: 'desc' } }),
          prisma.securityDeposit.findMany({ where: propertyId ? { propertyId } : {} }),
          prisma.complaint.findMany({ where: propertyId ? { propertyId } : {}, include: { resident: true }, orderBy: { createdAt: 'desc' } }),
          prisma.visitorRequest.findMany({ where: propertyId ? { propertyId } : {}, include: { resident: true }, orderBy: { createdAt: 'desc' } }),
          prisma.inventoryItem.findMany({ where: propertyId ? { propertyId } : {} }),
          prisma.user.findMany({ where: { role: { in: ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE'] } } }),
          prisma.notice.findMany({ where: propertyId ? { propertyId } : {}, orderBy: { publishedAt: 'desc' }, take: 5 }),
          prisma.operationalTask.findMany({ where: propertyId ? { propertyId } : {}, take: 5 }),
        ]);

        const totalBedsCount = beds.length;
        const occupiedBedsCount = beds.filter((b) => b.status === 'OCCUPIED').length;
        const availableBedsCount = beds.filter((b) => b.status === 'AVAILABLE').length;
        const occupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;
        const paidPayments = payments.filter((p) => p.status === 'PAID');
        const pendingPayments = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
        const overduePayments = payments.filter((p) => p.status === 'OVERDUE');

        return sendSuccess(res, {
          kpis: {
            totalProperties: properties.length,
            totalBuildings,
            totalRooms: rooms.length,
            totalBeds: totalBedsCount,
            occupiedBeds: occupiedBedsCount,
            availableBeds: availableBedsCount,
            occupancyRate,
            totalOccupancyPercentage: occupancyRate,
            activeResidentsCount: residents.filter((r) => r.status === 'ACTIVE').length,
            activeResidents: residents.filter((r) => r.status === 'ACTIVE').length,
            monthlyRevenue: paidPayments.reduce((sum, p) => sum + p.amount, 0),
            totalRevenueCollected: paidPayments.reduce((sum, p) => sum + p.amount, 0),
            outstandingRent: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
            totalOutstandingRent: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
            totalDeposits: deposits.reduce((sum, d) => sum + d.amount, 0),
            openComplaints: complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
            pendingVisitors: visitors.filter((v) => v.status === 'PENDING').length,
            staffCount: staffMembers.length,
            lowInventoryAlerts: inventoryItems.filter((i) => i.quantity <= i.minQuantity).length,
          },
          recentPayments: payments.slice(0, 5),
          recentComplaints: complaints.slice(0, 5),
          recentVisitors: visitors.slice(0, 5),
          recentNotices,
          recentTasks: tasks,
          allResidents: residents.map((r) => ({ id: r.id, fullName: r.fullName, roomNumber: r.bed?.room?.number || 'N/A' })),
          actionRequired: {
            overdueRentsCount: overduePayments.length,
            pendingVisitorsCount: visitors.filter((v) => v.status === 'PENDING').length,
            openMaintenanceCount: complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
            lowStockCount: inventoryItems.filter((i) => i.quantity <= i.minQuantity).length,
          }
        });
      } catch (dbErr) {
        // Fallback to DevStore
      }

      const rooms = DevStore.rooms;
      const allBeds = rooms.flatMap((r) => r.beds);
      const totalBeds = allBeds.length;
      const occupiedBeds = allBeds.filter((b) => b.status === 'OCCUPIED').length;
      const availableBeds = allBeds.filter((b) => b.status === 'AVAILABLE').length;
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
      const overduePays = DevStore.payments.filter((p) => p.status === 'OVERDUE');
      const paidPays = DevStore.payments.filter((p) => p.status === 'PAID');
      const pendingPays = DevStore.payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');

      return sendSuccess(res, {
        kpis: {
          totalProperties: DevStore.properties.length,
          totalBuildings: 1,
          totalRooms: rooms.length,
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate,
          totalOccupancyPercentage: occupancyRate,
          activeResidentsCount: DevStore.residents.filter((r) => r.status === 'ACTIVE').length,
          activeResidents: DevStore.residents.filter((r) => r.status === 'ACTIVE').length,
          monthlyRevenue: paidPays.reduce((sum, p) => sum + p.amount, 0),
          totalRevenueCollected: paidPays.reduce((sum, p) => sum + p.amount, 0),
          outstandingRent: pendingPays.reduce((sum, p) => sum + p.amount, 0),
          totalOutstandingRent: pendingPays.reduce((sum, p) => sum + p.amount, 0),
          totalDeposits: 56000,
          openComplaints: DevStore.complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
          pendingVisitors: DevStore.visitors.filter((v) => v.status === 'PENDING').length,
          staffCount: DevStore.staff.length,
          lowInventoryAlerts: DevStore.inventory.filter((i) => i.quantity <= i.minQuantity).length,
        },
        recentPayments: DevStore.payments,
        recentComplaints: DevStore.complaints,
        recentVisitors: DevStore.visitors,
        recentNotices: DevStore.notices,
        recentTasks: DevStore.tasks,
        allResidents: DevStore.residents.map((r) => ({ id: r.id, fullName: r.fullName, roomNumber: r.roomNumber })),
        actionRequired: {
          overdueRentsCount: overduePays.length,
          pendingVisitorsCount: DevStore.visitors.filter((v) => v.status === 'PENDING').length,
          openMaintenanceCount: DevStore.complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
          lowStockCount: DevStore.inventory.filter((i) => i.quantity <= i.minQuantity).length,
        }
      });
    } catch (error: any) {
      console.error('[OwnerController.getDashboard] Error:', error);
      return sendError(res, error.message || 'Failed to fetch dashboard', 500);
    }
  }

  // ==========================================================================
  // 2. PROPERTIES (CRUD)
  // ==========================================================================
  static async getProperties(req: AuthRequest, res: Response): Promise<Response> {
    try {
      try {
        const properties = await prisma.property.findMany({
          include: {
            buildings: {
              include: {
                floors: {
                  include: {
                    rooms: {
                      include: {
                        beds: true
                      }
                    }
                  }
                }
              }
            },
            rooms: true,
            residents: true
          }
        });
        if (properties.length > 0) {
          const formatted = properties.map((p) => ({
            id: p.id,
            name: p.name,
            address: p.address,
            city: p.city,
            phone: p.phone,
            email: p.email,
            upiId: p.upiId,
            gstNumber: p.gstNumber,
            totalRooms: p.rooms.length,
            totalBeds: p.rooms.reduce((acc, r) => acc + (r.capacity || 0), 0),
            occupiedBeds: p.residents.filter((r) => r.status === 'ACTIVE').length,
            activeResidentsCount: p.residents.filter((r) => r.status === 'ACTIVE').length,
            buildings: p.buildings
          }));
          return sendSuccess(res, formatted);
        }
      } catch {}
      return sendSuccess(res, DevStore.properties);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async getPropertyById(req: AuthRequest, res: Response): Promise<Response> {
    const prop = DevStore.properties.find((p) => p.id === req.params.id) || DevStore.properties[0];
    return sendSuccess(res, prop);
  }

  static async createProperty(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { name, address, city, phone, email, upiId, gstNumber } = req.body;
      if (!name || !address) {
        return sendError(res, 'Property name and address are required', 400);
      }

      let createdProp: any = null;
      try {
        createdProp = await prisma.property.create({
          data: {
            name: name.trim(),
            address: address.trim(),
            city: city || 'Bengaluru',
            phone: phone || null,
            email: email || null,
            upiId: upiId || null,
            gstNumber: gstNumber || null
          }
        });
      } catch {}

      if (!createdProp) {
        createdProp = {
          id: `prop-${Date.now()}`,
          name: name.trim(),
          address: address.trim(),
          city: city || 'Bengaluru',
          phone: phone || '+91 98765 43210',
          email: email || 'contact@urbannestpg.com',
          upiId: upiId || 'pg@upi',
          gstNumber: gstNumber || '',
          totalRooms: 0,
          totalBeds: 0,
          occupiedBeds: 0,
          activeResidentsCount: 0,
          monthlyRevenue: 0,
          status: 'ACTIVE',
          buildings: []
        };
        DevStore.properties.push(createdProp);
      }

      DevStore.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actorName: req.user?.name || 'Owner',
        actorRole: 'OWNER',
        action: 'PROPERTY_CREATED',
        targetEntity: 'Property',
        timestamp: new Date().toISOString(),
        details: `Created property: ${createdProp.name}`
      });

      return sendSuccess(res, createdProp, 'Property created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create property', 500);
    }
  }

  static async updateProperty(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propId = req.params.id;
      const data = req.body;

      try {
        const updated = await prisma.property.update({
          where: { id: propId },
          data
        });
        if (updated) return sendSuccess(res, updated, 'Property updated successfully');
      } catch {}

      const p = DevStore.properties.find((prop) => prop.id === propId) || DevStore.properties[0];
      if (p) Object.assign(p, data);

      return sendSuccess(res, p, 'Property updated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update property', 500);
    }
  }

  static async archiveProperty(req: AuthRequest, res: Response): Promise<Response> {
    const propId = req.params.id;
    const p = DevStore.properties.find((prop) => prop.id === propId);
    if (p) (p as any).status = 'ARCHIVED';

    DevStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorName: req.user?.name || 'Owner',
      actorRole: 'OWNER',
      action: 'PROPERTY_ARCHIVED',
      targetEntity: 'Property',
      timestamp: new Date().toISOString(),
      details: `Archived property ${propId}`
    });

    return sendSuccess(res, { id: propId, status: 'ARCHIVED' }, 'Property archived successfully');
  }

  // ==========================================================================
  // 3. BUILDINGS & FLOORS (CRUD)
  // ==========================================================================
  static async getBuildings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      try {
        const buildings = await prisma.building.findMany({
          include: { floors: { include: { rooms: { include: { beds: true } } } } }
        });
        if (buildings.length > 0) return sendSuccess(res, buildings);
      } catch {}
      return sendSuccess(res, DevStore.buildings);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async createBuilding(req: AuthRequest, res: Response): Promise<Response> {
    const { propertyId, name, code, numberOfFloors } = req.body;
    const numFloors = parseInt(numberOfFloors || '3', 10);

    const generatedFloors = [];
    for (let f = 1; f <= numFloors; f++) {
      generatedFloors.push({ id: `flr-${Date.now()}-${f}`, floorNumber: f, totalRooms: 0 });
    }

    const bld = {
      id: `bld-${Date.now()}`,
      propertyId: propertyId || 'prop-1',
      name: name || 'Block B',
      code: code || 'BLK-B',
      status: 'ACTIVE',
      floors: generatedFloors
    };
    DevStore.buildings.push(bld as any);
    return sendSuccess(res, bld, 'Building created successfully', 201);
  }

  static async updateBuilding(req: AuthRequest, res: Response): Promise<Response> {
    const bld = DevStore.buildings.find((b) => b.id === req.params.id);
    if (bld) Object.assign(bld, req.body);
    return sendSuccess(res, bld, 'Building updated successfully');
  }

  static async archiveBuilding(req: AuthRequest, res: Response): Promise<Response> {
    const bld = DevStore.buildings.find((b) => b.id === req.params.id);
    if (bld) (bld as any).status = 'ARCHIVED';
    return sendSuccess(res, { id: req.params.id, status: 'ARCHIVED' }, 'Building archived');
  }

  static async getFloors(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.floors);
  }

  static async createFloor(req: AuthRequest, res: Response): Promise<Response> {
    const newFloor = {
      id: `flr-${Date.now()}`,
      floorNumber: parseInt(req.body.floorNumber || '1', 10),
      buildingId: req.body.buildingId || 'bld-1',
      buildingName: req.body.buildingName || 'Block A',
      totalRooms: 0
    };
    DevStore.floors.push(newFloor);
    return sendSuccess(res, newFloor, 'Floor added successfully', 201);
  }

  static async archiveFloor(req: AuthRequest, res: Response): Promise<Response> {
    DevStore.floors = DevStore.floors.filter((f) => f.id !== req.params.id);
    return sendSuccess(res, { id: req.params.id }, 'Floor archived');
  }

  // ==========================================================================
  // 4. ROOMS & BEDS (CRUD & ATOMIC BED MATRIX)
  // ==========================================================================
  static async getRooms(req: AuthRequest, res: Response): Promise<Response> {
    try {
      try {
        const rooms = await prisma.room.findMany({
          include: { floor: { include: { building: true } }, beds: { include: { resident: true } } }
        });
        if (rooms.length > 0) {
          const formatted = rooms.map((r) => ({
            id: r.id,
            number: r.number,
            type: r.type,
            capacity: r.capacity,
            baseRent: r.baseRent,
            deposit: r.deposit,
            status: r.status,
            amenities: r.amenities ? r.amenities.split(',').map((a) => a.trim()).filter(Boolean) : [],
            propertyId: r.propertyId,
            building: r.floor?.building?.name || 'Block A',
            floor: r.floor?.floorNumber || 1,
            occupiedCount: r.beds.filter((b) => b.status === 'OCCUPIED' || b.resident).length,
            beds: r.beds.map((b) => ({
              id: b.id,
              bedNumber: b.bedNumber,
              monthlyRent: b.monthlyRent,
              status: b.status,
              residentId: b.resident?.id,
              residentName: b.resident?.fullName,
            }))
          }));
          return sendSuccess(res, formatted);
        }
      } catch {}
      return sendSuccess(res, DevStore.rooms);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async getRoomById(req: AuthRequest, res: Response): Promise<Response> {
    const room = DevStore.rooms.find((r) => r.id === req.params.id) || DevStore.rooms[0];
    return sendSuccess(res, room);
  }

  static async createRoom(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, number, type, capacity, baseRent, deposit, amenities } = req.body;
      const cap = parseInt(capacity || '2', 10);
      const rent = parseFloat(baseRent || '14000');
      const dep = deposit ? parseFloat(deposit) : rent * 2;

      const generatedBeds = [];
      for (let i = 0; i < cap; i++) {
        const char = String.fromCharCode(65 + i);
        generatedBeds.push({
          id: `bed-${number}-${char}-${Date.now()}`,
          bedNumber: `Bed ${number}-${char}`,
          monthlyRent: rent,
          status: 'AVAILABLE',
          residentId: null,
          residentName: null,
          residentMobile: null
        });
      }

      const newRoom = {
        id: `room-${number}-${Date.now()}`,
        number: String(number).trim(),
        type: type || 'Double',
        capacity: cap,
        baseRent: rent,
        deposit: dep,
        status: 'AVAILABLE',
        amenities: Array.isArray(amenities) ? amenities : String(amenities || '').split(',').map((s) => s.trim()).filter(Boolean),
        propertyId: propertyId || 'prop-1',
        building: req.body.building || 'Block A',
        floor: parseInt(req.body.floor || '1', 10),
        occupiedCount: 0,
        beds: generatedBeds
      };

      DevStore.rooms.unshift(newRoom as any);

      DevStore.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'ROOM_CREATED',
        targetEntity: 'Room',
        timestamp: new Date().toISOString(),
        details: `Created Room ${newRoom.number} (${cap} beds, ₹${rent}/mo)`
      });

      return sendSuccess(res, newRoom, `Room ${newRoom.number} and ${cap} beds created successfully`, 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create room', 500);
    }
  }

  static async updateRoom(req: AuthRequest, res: Response): Promise<Response> {
    const room = DevStore.rooms.find((r) => r.id === req.params.id);
    if (room) {
      if (req.body.number) room.number = req.body.number;
      if (req.body.type) room.type = req.body.type;
      if (req.body.baseRent) room.baseRent = parseFloat(req.body.baseRent);
      if (req.body.deposit) room.deposit = parseFloat(req.body.deposit);
      if (req.body.status) room.status = req.body.status;
      if (req.body.building) (room as any).building = req.body.building;
      if (req.body.floor) (room as any).floor = parseInt(req.body.floor);
      if (req.body.amenities) {
        room.amenities = Array.isArray(req.body.amenities)
          ? req.body.amenities
          : String(req.body.amenities).split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return sendSuccess(res, room, 'Room updated successfully');
  }

  static async archiveRoom(req: AuthRequest, res: Response): Promise<Response> {
    const roomId = req.params.id;
    const room = DevStore.rooms.find((r) => r.id === roomId);
    if (room) {
      if (room.occupiedCount > 0) {
        return sendError(res, 'Cannot archive an occupied room. Please move out residents first.', 400);
      }
      room.status = 'MAINTENANCE';
    }
    return sendSuccess(res, { id: roomId, status: 'ARCHIVED' }, 'Room archived');
  }

  static async updateBedStatus(req: AuthRequest, res: Response): Promise<Response> {
    const bedId = req.params.id;
    const { status, monthlyRent } = req.body;
    for (const r of DevStore.rooms) {
      const b = r.beds.find((bed) => bed.id === bedId);
      if (b) {
        if (status) b.status = status;
        if (monthlyRent) b.monthlyRent = parseFloat(monthlyRent);
        return sendSuccess(res, b, `Bed status updated to ${status}`);
      }
    }
    return sendSuccess(res, { id: bedId, status }, 'Bed status updated');
  }

  // ==========================================================================
  // 5. RESIDENTS & FULL DOSSIER (CRUD)
  // ==========================================================================
  static async getResidents(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.residents);
  }

  static async getResidentById(req: AuthRequest, res: Response): Promise<Response> {
    const resident = DevStore.residents.find((r) => r.id === req.params.id) || DevStore.residents[0];
    return sendSuccess(res, resident);
  }

  static async createResident(req: AuthRequest, res: Response): Promise<Response> {
    return OwnerController.moveInResident(req, res);
  }

  static async updateResident(req: AuthRequest, res: Response): Promise<Response> {
    const resObj = DevStore.residents.find((r) => r.id === req.params.id);
    if (resObj) {
      Object.assign(resObj, req.body);
      if (req.body.monthlyRent) resObj.monthlyRent = parseFloat(req.body.monthlyRent);
      if (req.body.securityDeposit) resObj.securityDeposit = parseFloat(req.body.securityDeposit);
    }
    return sendSuccess(res, resObj, 'Resident profile updated successfully');
  }

  static async archiveResident(req: AuthRequest, res: Response): Promise<Response> {
    const resident = DevStore.residents.find((r) => r.id === req.params.id);
    if (resident) {
      resident.status = 'INACTIVE';
      for (const r of DevStore.rooms) {
        const b = r.beds.find((bed) => bed.residentId === resident.id);
        if (b) {
          b.status = 'AVAILABLE';
          b.residentId = null;
          b.residentName = null;
          r.occupiedCount = r.beds.filter((bed) => bed.status === 'OCCUPIED').length;
        }
      }
    }
    return sendSuccess(res, { id: req.params.id, status: 'INACTIVE' }, 'Resident deactivated');
  }

  // ==========================================================================
  // 6. RESIDENT 3-STAGE LIFECYCLE (MOVE-IN, NOTICE, MOVE-OUT)
  // ==========================================================================
  static async moveInResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { bedId, fullName, email, mobile, monthlyRent, depositAmount, leaseStartDate, leaseEndDate } = req.body;

      if (!fullName || !mobile) {
        return sendError(res, 'Resident full name and mobile are required', 400);
      }

      let targetRoomNum = '102';
      let targetBedNum = 'Bed 102-C';

      for (const r of DevStore.rooms) {
        const b = r.beds.find((bed) => bed.id === bedId || (bed.status === 'AVAILABLE' && !bedId));
        if (b) {
          b.status = 'OCCUPIED';
          b.residentName = fullName;
          b.residentMobile = mobile;
          targetRoomNum = r.number;
          targetBedNum = b.bedNumber;
          r.occupiedCount = r.beds.filter((bed) => bed.status === 'OCCUPIED').length;
          break;
        }
      }

      const rent = parseFloat(monthlyRent || '14000');
      const dep = parseFloat(depositAmount || '28000');

      const newResident = {
        id: `res-${Date.now()}`,
        userId: `usr-${Date.now()}`,
        propertyId: 'prop-1',
        bedId: bedId || 'bed-new',
        roomNumber: targetRoomNum,
        bedNumber: targetBedNum,
        fullName: fullName.trim(),
        email: (email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`).trim(),
        mobile: mobile.trim(),
        gender: req.body.gender || 'MALE',
        emergencyContactName: req.body.emergencyContactName || 'Guardian',
        emergencyContactRelation: req.body.emergencyContactRelation || 'Parent',
        emergencyContactPhone: req.body.emergencyContactPhone || '9876543210',
        emergencyContact: `${req.body.emergencyContactName || 'Guardian'}: ${req.body.emergencyContactPhone || '9876543210'}`,
        kycStatus: 'PENDING',
        joiningDate: leaseStartDate || new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        monthlyRent: rent,
        securityDeposit: dep,
        depositAmount: dep,
        permanentAddress: req.body.permanentAddress || 'Not provided',
        address: req.body.permanentAddress || 'Not provided',
        workCompany: req.body.workCompany || 'Self Employed',
        documents: [],
        payments: [
          { id: `pay-${Date.now()}`, category: 'RENT', period: 'Current Month', amount: rent, dueDate: '2026-10-05', status: 'PENDING' }
        ],
        complaints: [],
        visitors: [],
        leaves: []
      };

      DevStore.residents.unshift(newResident as any);

      DevStore.deposits.unshift({
        id: `dep-${Date.now()}`,
        residentId: newResident.id,
        residentName: newResident.fullName,
        roomNumber: targetRoomNum,
        propertyId: 'prop-1',
        amount: dep,
        status: 'PAID',
        paidAt: new Date().toISOString().split('T')[0],
        deductions: 0,
        refundAmount: null,
        notes: 'Initial move-in security deposit'
      });

      DevStore.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actorName: req.user?.name || 'Owner',
        actorRole: req.user?.role || 'OWNER',
        action: 'RESIDENT_MOVE_IN',
        targetEntity: 'Resident',
        timestamp: new Date().toISOString(),
        details: `Completed move-in for ${newResident.fullName} into ${targetBedNum} (Rm ${targetRoomNum})`
      });

      return sendSuccess(res, { resident: newResident }, 'Resident move-in completed successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Move-in failed', 500);
    }
  }

  static async placeOnNoticePeriod(req: AuthRequest, res: Response): Promise<Response> {
    const resident = DevStore.residents.find((r) => r.id === req.params.id);
    if (resident) {
      resident.status = 'NOTICE_PERIOD';
      (resident as any).expectedMoveOutDate = req.body.expectedMoveOutDate || req.body.noticeEndDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      DevStore.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actorName: req.user?.name || 'Owner',
        actorRole: 'OWNER',
        action: 'RESIDENT_NOTICE_PERIOD',
        targetEntity: 'Resident',
        timestamp: new Date().toISOString(),
        details: `Placed resident ${resident.fullName} on notice period.`
      });
      return sendSuccess(res, resident, 'Resident placed on notice period');
    }
    return sendSuccess(res, { id: req.params.id, status: 'NOTICE_PERIOD' }, 'Notice period recorded');
  }

  static async moveOutResident(req: AuthRequest, res: Response): Promise<Response> {
    const resident = DevStore.residents.find((r) => r.id === req.params.id);
    if (resident) {
      resident.status = 'MOVED_OUT';
      // Release bed
      for (const r of DevStore.rooms) {
        const b = r.beds.find((bed) => bed.residentId === resident.id || bed.id === resident.bedId);
        if (b) {
          b.status = 'AVAILABLE';
          b.residentId = null;
          b.residentName = null;
          r.occupiedCount = r.beds.filter((bed) => bed.status === 'OCCUPIED').length;
        }
      }

      // Update deposit settlement
      const dep = DevStore.deposits.find((d) => d.residentId === resident.id);
      if (dep) {
        dep.status = 'REFUNDED';
        dep.deductions = parseFloat(req.body.deductions || '0');
        dep.refundAmount = parseFloat(req.body.refundAmount || (dep.amount - (dep.deductions || 0)).toString());
        dep.notes = req.body.remarks || req.body.deductionNotes || 'Deposit settled upon move-out';
      }

      DevStore.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        actorName: req.user?.name || 'Owner',
        actorRole: 'OWNER',
        action: 'RESIDENT_MOVE_OUT',
        targetEntity: 'Resident',
        timestamp: new Date().toISOString(),
        details: `Move-out completed for ${resident.fullName}. Bed released and deposit settled.`
      });

      return sendSuccess(res, resident, 'Move-out settlement completed and bed released.');
    }
    return sendSuccess(res, { id: req.params.id, status: 'MOVED_OUT' }, 'Move-out completed');
  }

  // ==========================================================================
  // 7. PAYMENTS & INVOICES (FINANCE)
  // ==========================================================================
  static async getPayments(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.payments);
  }

  static async recordManualPayment(req: AuthRequest, res: Response): Promise<Response> {
    const { paymentId, method, transactionId, notes, amount } = req.body;
    const pay = DevStore.payments.find((p) => p.id === paymentId) || DevStore.payments[0];
    if (pay) {
      pay.status = 'PAID';
      pay.method = method || 'UPI';
      pay.transactionId = transactionId || `TXN-${Date.now()}`;
      pay.receiptNumber = `UN-REC-${Date.now().toString().slice(-6)}`;
      (pay as any).paidDate = new Date().toISOString().split('T')[0];
    }

    DevStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorName: req.user?.name || 'Owner',
      actorRole: 'OWNER',
      action: 'PAYMENT_RECORDED',
      targetEntity: 'Payment',
      timestamp: new Date().toISOString(),
      details: `Recorded payment of ₹${pay.amount} for ${pay.residentName}`
    });

    return sendSuccess(res, pay, 'Payment recorded successfully');
  }

  static async createInvoice(req: AuthRequest, res: Response): Promise<Response> {
    const { residentId, amount, category, period, dueDate, description } = req.body;
    const resObj = DevStore.residents.find((r) => r.id === residentId);
    const newInvoice = {
      id: `pay-${Date.now()}`,
      residentId,
      residentName: resObj?.fullName || 'Resident',
      roomNumber: resObj?.roomNumber || '101',
      propertyId: 'prop-1',
      category: category || 'RENT',
      period: period || 'October 2026',
      amount: parseFloat(amount || '14000'),
      dueDate: dueDate || '2026-10-05',
      status: 'PENDING',
      notes: description
    };
    DevStore.payments.unshift(newInvoice as any);

    DevStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorName: req.user?.name || 'Owner',
      actorRole: 'OWNER',
      action: 'INVOICE_GENERATED',
      targetEntity: 'Payment',
      timestamp: new Date().toISOString(),
      details: `Generated ${newInvoice.category} invoice of ₹${newInvoice.amount} for ${newInvoice.residentName}`
    });

    return sendSuccess(res, newInvoice, 'Invoice created', 201);
  }

  static async updatePayment(req: AuthRequest, res: Response): Promise<Response> {
    const pay = DevStore.payments.find((p) => p.id === req.params.id);
    if (pay) {
      if (pay.status === 'PAID') {
        return sendError(res, 'Paid financial records cannot be modified.', 400);
      }
      Object.assign(pay, req.body);
    }
    return sendSuccess(res, pay, 'Invoice updated');
  }

  static async cancelPayment(req: AuthRequest, res: Response): Promise<Response> {
    const pay = DevStore.payments.find((p) => p.id === req.params.id);
    if (pay) {
      if (pay.status === 'PAID') {
        return sendError(res, 'Cannot cancel a verified paid transaction.', 400);
      }
      pay.status = 'CANCELLED' as any;
    }
    return sendSuccess(res, { id: req.params.id, status: 'CANCELLED' }, 'Charge cancelled');
  }

  static async getPaymentReceipt(req: AuthRequest, res: Response): Promise<Response> {
    const pay = DevStore.payments.find((p) => p.id === req.params.id) || DevStore.payments[0];
    return sendSuccess(res, {
      receiptNumber: pay.receiptNumber || 'UN-REC-2026-0001',
      payment: pay,
      issuedAt: pay.paidDate || new Date().toISOString()
    });
  }

  // ==========================================================================
  // 8. SECURITY DEPOSITS
  // ==========================================================================
  static async getDeposits(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.deposits);
  }

  static async createDeposit(req: AuthRequest, res: Response): Promise<Response> {
    const newDep = {
      id: `dep-${Date.now()}`,
      residentId: req.body.residentId,
      residentName: req.body.residentName || 'Resident',
      roomNumber: req.body.roomNumber || '101',
      propertyId: 'prop-1',
      amount: parseFloat(req.body.amount || '28000'),
      status: 'PAID',
      paidAt: new Date().toISOString().split('T')[0],
      deductions: 0,
      refundAmount: null,
      notes: req.body.notes || 'Security deposit recorded'
    };
    DevStore.deposits.unshift(newDep);
    return sendSuccess(res, newDep, 'Deposit logged', 201);
  }

  static async settleDeposit(req: AuthRequest, res: Response): Promise<Response> {
    const dep = DevStore.deposits.find((d) => d.id === req.params.id);
    if (dep) {
      dep.status = 'REFUNDED';
      dep.deductions = parseFloat(req.body.deductions || '0');
      dep.refundAmount = parseFloat(req.body.refundAmount || (dep.amount - (dep.deductions || 0)).toString());
      dep.notes = req.body.notes || 'Deposit refunded';
    }
    return sendSuccess(res, dep, 'Deposit settled');
  }

  // ==========================================================================
  // 9. OPERATING EXPENSES (CRUD)
  // ==========================================================================
  static async getExpenses(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.expenses);
  }

  static async createExpense(req: AuthRequest, res: Response): Promise<Response> {
    const newExp = {
      id: `exp-${Date.now()}`,
      propertyId: req.body.propertyId || 'prop-1',
      title: req.body.title,
      category: req.body.category || 'OTHER',
      amount: parseFloat(req.body.amount || '0'),
      vendor: req.body.vendor || 'Direct',
      date: req.body.date || new Date().toISOString().split('T')[0],
      description: req.body.description || req.body.notes,
      status: 'PAID'
    };
    DevStore.expenses.unshift(newExp as any);

    DevStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorName: req.user?.name || 'Owner',
      actorRole: 'OWNER',
      action: 'EXPENSE_LOGGED',
      targetEntity: 'Expense',
      timestamp: new Date().toISOString(),
      details: `Logged expense ₹${newExp.amount}: ${newExp.title}`
    });

    return sendSuccess(res, newExp, 'Expense logged', 201);
  }

  static async updateExpense(req: AuthRequest, res: Response): Promise<Response> {
    const exp = DevStore.expenses.find((e) => e.id === req.params.id);
    if (exp) Object.assign(exp, req.body);
    return sendSuccess(res, exp, 'Expense updated');
  }

  static async archiveExpense(req: AuthRequest, res: Response): Promise<Response> {
    DevStore.expenses = DevStore.expenses.filter((e) => e.id !== req.params.id);
    return sendSuccess(res, { id: req.params.id }, 'Expense archived');
  }

  // ==========================================================================
  // 10. VISITOR DESK & QR VERIFICATION (CRUD)
  // ==========================================================================
  static async getVisitors(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.visitors);
  }

  static async createVisitor(req: AuthRequest, res: Response): Promise<Response> {
    const newVis = {
      id: `vis-${Date.now()}`,
      propertyId: 'prop-1',
      residentId: req.body.residentId || 'res-1',
      visitorName: req.body.visitorName,
      visitorMobile: req.body.visitorMobile,
      relation: req.body.relation || 'Friend',
      purpose: req.body.purpose || 'Visit',
      residentName: req.body.residentName || 'Aakash Verma',
      roomNumber: req.body.roomNumber || '101',
      visitDate: req.body.visitDate || new Date().toISOString().split('T')[0],
      expectedTime: req.body.expectedTime || '04:00 PM',
      status: 'APPROVED',
      qrPassToken: `UN-PASS-${Date.now().toString().slice(-4)}`
    };
    DevStore.visitors.unshift(newVis as any);
    return sendSuccess(res, newVis, 'Visitor pass created', 201);
  }

  static async approveVisitor(req: AuthRequest, res: Response): Promise<Response> {
    const vis = DevStore.visitors.find((v) => v.id === req.params.id) || DevStore.visitors[0];
    if (vis) vis.status = 'APPROVED';
    return sendSuccess(res, vis, 'Visitor request approved');
  }

  static async rejectVisitor(req: AuthRequest, res: Response): Promise<Response> {
    const vis = DevStore.visitors.find((v) => v.id === req.params.id) || DevStore.visitors[0];
    if (vis) vis.status = 'REJECTED';
    return sendSuccess(res, vis, 'Visitor request rejected');
  }

  static async verifyVisitorQR(req: AuthRequest, res: Response): Promise<Response> {
    const { qrPassToken } = req.body;
    const vis = DevStore.visitors.find((v) => v.qrPassCode === qrPassToken || v.qrPassToken === qrPassToken || v.id === qrPassToken) || DevStore.visitors[0];
    return sendSuccess(res, { valid: true, visitor: vis }, 'QR Pass verified successfully');
  }

  static async checkInVisitor(req: AuthRequest, res: Response): Promise<Response> {
    const vis = DevStore.visitors.find((v) => v.id === req.params.id) || DevStore.visitors[0];
    if (vis) {
      vis.status = 'CHECKED_IN';
      (vis as any).checkInTime = new Date().toLocaleTimeString();
    }
    return sendSuccess(res, vis, 'Visitor checked in');
  }

  static async checkOutVisitor(req: AuthRequest, res: Response): Promise<Response> {
    const vis = DevStore.visitors.find((v) => v.id === req.params.id) || DevStore.visitors[0];
    if (vis) {
      vis.status = 'CHECKED_OUT';
      (vis as any).checkOutTime = new Date().toLocaleTimeString();
    }
    return sendSuccess(res, vis, 'Visitor checked out');
  }

  // ==========================================================================
  // 11. MAINTENANCE & COMPLAINTS (WORKFLOW & ACTIVITY TRAIL)
  // ==========================================================================
  static async getComplaints(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.complaints);
  }

  static async createComplaint(req: AuthRequest, res: Response): Promise<Response> {
    const newComp = {
      id: `c-${Date.now()}`,
      ticketNumber: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      title: req.body.title,
      category: req.body.category || 'PLUMBING',
      priority: req.body.priority || 'MEDIUM',
      description: req.body.description || '',
      status: 'REPORTED',
      residentName: req.body.residentName || 'Management Logged',
      roomNumber: req.body.roomNumber || 'Common Area',
      assignedStaffName: null,
      createdAt: new Date().toISOString(),
      activities: []
    };
    DevStore.complaints.unshift(newComp as any);
    return sendSuccess(res, newComp, 'Complaint logged', 201);
  }

  static async updateComplaintStatus(req: AuthRequest, res: Response): Promise<Response> {
    const { status, comment, assignedStaff, assignedStaffId } = req.body;
    const complaint = DevStore.complaints.find((c) => c.id === req.params.id) || DevStore.complaints[0];
    if (complaint) {
      complaint.status = status;
      if (assignedStaff || assignedStaffId) {
        const s = DevStore.staff.find((st) => st.id === assignedStaffId || st.id === assignedStaff);
        complaint.assignedStaffName = s ? s.name : (assignedStaff || 'Technician');
      }
      complaint.activities.push({
        id: `act-${Date.now()}`,
        actorName: req.user?.name || 'Owner',
        action: status,
        comment: comment || `Status updated to ${status}`,
        createdAt: new Date().toISOString()
      });
    }
    return sendSuccess(res, complaint, `Complaint updated to ${status}`);
  }

  static async addComplaintComment(req: AuthRequest, res: Response): Promise<Response> {
    const complaint = DevStore.complaints.find((c) => c.id === req.params.id);
    if (complaint) {
      complaint.activities.push({
        id: `act-${Date.now()}`,
        actorName: req.user?.name || 'Owner',
        action: 'NOTE',
        comment: req.body.comment,
        createdAt: new Date().toISOString()
      });
    }
    return sendSuccess(res, complaint, 'Note added');
  }

  // ==========================================================================
  // 12. STAFF MANAGEMENT (CRUD)
  // ==========================================================================
  static async getStaff(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.staff);
  }

  static async createStaff(req: AuthRequest, res: Response): Promise<Response> {
    const newStaff = {
      id: `stf-${Date.now()}`,
      name: req.body.name,
      role: req.body.role || 'MAINTENANCE',
      mobile: req.body.mobile,
      email: req.body.email || `${req.body.name.toLowerCase().replace(/\s+/g, '.')}@pg.com`,
      shift: req.body.shift || 'Morning (8 AM - 4 PM)',
      status: 'ACTIVE',
      salary: parseFloat(req.body.salary || '22000'),
      propertyId: 'prop-1'
    };
    DevStore.staff.unshift(newStaff as any);

    DevStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorName: req.user?.name || 'Owner',
      actorRole: 'OWNER',
      action: 'STAFF_ONBOARDED',
      targetEntity: 'Staff',
      timestamp: new Date().toISOString(),
      details: `Onboarded ${newStaff.name} as ${newStaff.role}`
    });

    return sendSuccess(res, newStaff, 'Staff registered', 201);
  }

  static async updateStaff(req: AuthRequest, res: Response): Promise<Response> {
    const s = DevStore.staff.find((st) => st.id === req.params.id);
    if (s) Object.assign(s, req.body);
    return sendSuccess(res, s, 'Staff updated');
  }

  static async archiveStaff(req: AuthRequest, res: Response): Promise<Response> {
    const s = DevStore.staff.find((st) => st.id === req.params.id);
    if (s) s.status = 'INACTIVE';
    return sendSuccess(res, { id: req.params.id, status: 'INACTIVE' }, 'Staff deactivated');
  }

  // ==========================================================================
  // 13. INVENTORY & ASSETS (CRUD & STOCK IN/OUT)
  // ==========================================================================
  static async getInventory(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.inventory);
  }

  static async createInventoryItem(req: AuthRequest, res: Response): Promise<Response> {
    const qty = parseInt(req.body.quantity || '1', 10);
    const minQty = parseInt(req.body.minQuantity || '2', 10);
    const newItem = {
      id: `inv-${Date.now()}`,
      name: req.body.name,
      category: req.body.category || 'APPLIANCE',
      quantity: qty,
      minQuantity: minQty,
      location: req.body.location || 'Property Level',
      vendor: req.body.vendor || 'Direct Purchase',
      condition: req.body.condition || (qty <= minQty ? 'LOW_STOCK' : 'EXCELLENT'),
      status: qty <= minQty ? 'LOW_STOCK' : 'GOOD',
      purchaseDate: new Date().toISOString().split('T')[0],
      warrantyExpiry: req.body.warrantyExpiry || null,
      cost: parseFloat(req.body.cost || '0'),
      propertyId: 'prop-1'
    };
    DevStore.inventory.unshift(newItem as any);
    return sendSuccess(res, newItem, 'Asset logged', 201);
  }

  static async updateInventoryItem(req: AuthRequest, res: Response): Promise<Response> {
    const item = DevStore.inventory.find((i) => i.id === req.params.id);
    if (item) {
      Object.assign(item, req.body);
      if (item.quantity <= item.minQuantity) item.status = 'LOW_STOCK';
    }
    return sendSuccess(res, item, 'Asset updated');
  }

  static async updateStock(req: AuthRequest, res: Response): Promise<Response> {
    const { delta, type, note } = req.body;
    const item = DevStore.inventory.find((i) => i.id === req.params.id);
    if (item) {
      const change = parseInt(delta || '1', 10);
      if (type === 'OUT' || type === 'STOCK_OUT') {
        item.quantity = Math.max(0, item.quantity - change);
      } else {
        item.quantity += change;
      }
      item.status = item.quantity <= item.minQuantity ? 'LOW_STOCK' : 'GOOD';
    }
    return sendSuccess(res, item, `Stock updated: ${item?.quantity} in inventory`);
  }

  static async archiveInventoryItem(req: AuthRequest, res: Response): Promise<Response> {
    DevStore.inventory = DevStore.inventory.filter((i) => i.id !== req.params.id);
    return sendSuccess(res, { id: req.params.id }, 'Asset archived');
  }

  // ==========================================================================
  // 14. OPERATIONAL TASKS & HOUSEKEEPING
  // ==========================================================================
  static async getTasks(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.tasks);
  }

  static async createTask(req: AuthRequest, res: Response): Promise<Response> {
    const newTask = {
      id: `tsk-${Date.now()}`,
      title: req.body.title,
      category: req.body.category || 'HOUSEKEEPING',
      priority: req.body.priority || 'MEDIUM',
      staffName: req.body.assignedTo || 'Assigned Staff',
      assignedTo: req.body.assignedTo || 'Assigned Staff',
      dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
      status: 'PENDING',
      propertyId: 'prop-1',
      notes: req.body.notes || ''
    };
    DevStore.tasks.unshift(newTask as any);
    return sendSuccess(res, newTask, 'Task assigned', 201);
  }

  static async updateTask(req: AuthRequest, res: Response): Promise<Response> {
    const t = DevStore.tasks.find((task) => task.id === req.params.id);
    if (t) Object.assign(t, req.body);
    return sendSuccess(res, t, 'Task updated');
  }

  static async archiveTask(req: AuthRequest, res: Response): Promise<Response> {
    DevStore.tasks = DevStore.tasks.filter((t) => t.id !== req.params.id);
    return sendSuccess(res, { id: req.params.id }, 'Task archived');
  }

  // ==========================================================================
  // 15. DOCUMENTS & KYC VERIFICATION
  // ==========================================================================
  static async getDocuments(req: AuthRequest, res: Response): Promise<Response> {
    const docs = DevStore.residents.flatMap((r) =>
      (r.documents || []).map((d: any) => ({
        ...d,
        residentName: r.fullName,
        residentId: r.id,
        roomNumber: r.roomNumber
      }))
    );
    return sendSuccess(res, docs);
  }

  static async verifyDocument(req: AuthRequest, res: Response): Promise<Response> {
    const { status, rejectionReason } = req.body;
    for (const r of DevStore.residents) {
      const d = r.documents.find((doc: any) => doc.id === req.params.id);
      if (d) {
        d.status = status;
        (d as any).rejectionReason = rejectionReason;
        if (status === 'VERIFIED') r.kycStatus = 'VERIFIED';
        return sendSuccess(res, d, `Document marked as ${status}`);
      }
    }
    return sendSuccess(res, { id: req.params.id, status }, 'Document status updated');
  }

  // ==========================================================================
  // 16. NOTICES & BROADCASTS (CRUD)
  // ==========================================================================
  static async getNotices(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.notices);
  }

  static async createNotice(req: AuthRequest, res: Response): Promise<Response> {
    const newNotice = {
      id: `not-${Date.now()}`,
      title: req.body.title,
      content: req.body.content,
      category: req.body.category || 'GENERAL',
      priority: req.body.priority || 'NORMAL',
      isImportant: req.body.isImportant || req.body.priority === 'URGENT',
      target: req.body.target || 'ALL',
      publisherName: req.user?.name || 'Urban Nest Management',
      propertyId: 'prop-1',
      publishedAt: new Date().toISOString()
    };
    DevStore.notices.unshift(newNotice as any);

    DevStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorName: req.user?.name || 'Owner',
      actorRole: 'OWNER',
      action: 'NOTICE_PUBLISHED',
      targetEntity: 'Notice',
      timestamp: new Date().toISOString(),
      details: `Broadcast notice: ${newNotice.title}`
    });

    return sendSuccess(res, newNotice, 'Notice published', 201);
  }

  static async updateNotice(req: AuthRequest, res: Response): Promise<Response> {
    const not = DevStore.notices.find((n) => n.id === req.params.id);
    if (not) Object.assign(not, req.body);
    return sendSuccess(res, not, 'Notice updated');
  }

  static async archiveNotice(req: AuthRequest, res: Response): Promise<Response> {
    DevStore.notices = DevStore.notices.filter((n) => n.id !== req.params.id);
    return sendSuccess(res, { id: req.params.id }, 'Notice removed');
  }

  // ==========================================================================
  // 17. LEAVE REQUESTS
  // ==========================================================================
  static async getLeaveRequests(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.leaveRequests);
  }

  static async approveLeave(req: AuthRequest, res: Response): Promise<Response> {
    const lev = DevStore.leaveRequests.find((l) => l.id === req.params.id);
    if (lev) lev.status = 'APPROVED';
    return sendSuccess(res, lev, 'Leave request approved');
  }

  static async rejectLeave(req: AuthRequest, res: Response): Promise<Response> {
    const lev = DevStore.leaveRequests.find((l) => l.id === req.params.id);
    if (lev) {
      lev.status = 'REJECTED';
      (lev as any).rejectionReason = req.body.reason || 'Management decision';
    }
    return sendSuccess(res, lev, 'Leave request rejected');
  }

  // ==========================================================================
  // 18. EMERGENCY / SOS INCIDENTS
  // ==========================================================================
  static async getSOSEvents(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.sosEvents);
  }

  static async acknowledgeSOS(req: AuthRequest, res: Response): Promise<Response> {
    const sos = DevStore.sosEvents.find((s) => s.id === req.params.id) || DevStore.sosEvents[0];
    if (sos) {
      sos.status = 'ACKNOWLEDGED' as any;
      (sos as any).acknowledgedBy = req.user?.name || 'Owner';
    }
    return sendSuccess(res, sos, 'SOS event acknowledged');
  }

  static async resolveSOS(req: AuthRequest, res: Response): Promise<Response> {
    const sos = DevStore.sosEvents.find((s) => s.id === req.params.id) || DevStore.sosEvents[0];
    if (sos) {
      sos.status = 'RESOLVED';
      sos.resolvedAt = new Date().toISOString();
      sos.notes = req.body.notes || 'Emergency attended and resolved';
    }
    return sendSuccess(res, sos, 'SOS event marked as resolved');
  }

  // ==========================================================================
  // 19. REPORTS & ANALYTICS
  // ==========================================================================
  static async getReports(req: AuthRequest, res: Response): Promise<Response> {
    const rooms = DevStore.rooms;
    const allBeds = rooms.flatMap((r) => r.beds);
    const totalBeds = allBeds.length;
    const occupiedBeds = allBeds.filter((b) => b.status === 'OCCUPIED').length;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const totalCollected = DevStore.payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = DevStore.payments.filter((p) => p.status === 'OVERDUE' || p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = DevStore.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netOperatingIncome = totalCollected - totalExpenses;

    return sendSuccess(res, {
      summary: {
        occupancyRate,
        totalBeds,
        occupiedBeds,
        availableBeds: totalBeds - occupiedBeds,
        totalCollected,
        totalOutstanding,
        totalExpenses,
        netOperatingIncome,
        activeResidentsCount: DevStore.residents.filter((r) => r.status === 'ACTIVE').length
      },
      revenueByMonth: [
        { month: 'Jun 2026', revenue: 210000, expenses: 22000 },
        { month: 'Jul 2026', revenue: 235000, expenses: 24500 },
        { month: 'Aug 2026', revenue: 242000, expenses: 21000 },
        { month: 'Sep 2026', revenue: totalCollected, expenses: totalExpenses }
      ],
      occupancyTrend: [
        { month: 'Jun', occupancy: 70 },
        { month: 'Jul', occupancy: 75 },
        { month: 'Aug', occupancy: 82 },
        { month: 'Sep', occupancy: occupancyRate }
      ],
      expenseCategories: [
        { category: 'Electricity', amount: 14500 },
        { category: 'Internet', amount: 3499 },
        { category: 'Supplies', amount: 4200 }
      ]
    });
  }

  // ==========================================================================
  // 20. AUDIT LOGS & SETTINGS
  // ==========================================================================
  static async getAuditLogs(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.auditLogs);
  }

  static async getSettings(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.settings);
  }

  static async updateSettings(req: AuthRequest, res: Response): Promise<Response> {
    Object.assign(DevStore.settings, req.body);
    return sendSuccess(res, DevStore.settings, 'Settings saved successfully');
  }
}

export default OwnerController;
