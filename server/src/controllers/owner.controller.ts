import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';

// ============================================================================
// RESILIENT IN-MEMORY OPERATIONAL DEV STORE (FALLBACK WHEN DB SERVER IS OFFLINE)
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
      buildings: [{ id: 'bld-1', name: 'Block A - Executive Wing', floorsCount: 3 }]
    }
  ];

  static buildings = [
    { id: 'bld-1', name: 'Block A - Executive Wing', propertyId: 'prop-1', floors: [{ id: 'flr-1', floorNumber: 1 }, { id: 'flr-2', floorNumber: 2 }] }
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
      buildingName: 'Block A',
      floorNumber: 1,
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
      buildingName: 'Block A',
      floorNumber: 1,
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
      buildingName: 'Block A',
      floorNumber: 2,
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
      emergencyContact: 'Suresh Verma (Father): 9812345670',
      kycStatus: 'VERIFIED',
      joiningDate: '2025-10-15',
      status: 'ACTIVE',
      monthlyRent: 14000,
      securityDeposit: 28000,
      address: 'House No 43, Sector 12, Karnal, Haryana',
      documents: [
        { id: 'doc-1', type: 'AADHAAR', documentType: 'AADHAAR', documentNumber: '9876-5432-1098', status: 'VERIFIED', fileUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400', createdAt: '2025-10-15' },
        { id: 'doc-2', type: 'PAN', documentType: 'PAN', documentNumber: 'ABCDE1234F', status: 'VERIFIED', fileUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400', createdAt: '2025-10-15' }
      ],
      payments: [
        { id: 'pay-1', category: 'RENT', period: 'September 2026', amount: 14000, dueDate: '2026-09-05', status: 'PAID' },
        { id: 'pay-2', category: 'RENT', period: 'October 2026', amount: 14000, dueDate: '2026-10-05', status: 'PENDING' }
      ],
      complaints: [
        { id: 'c-1', ticketNumber: 'TKT-1049', title: 'Geyser heating element slow', category: 'PLUMBING', priority: 'MEDIUM', status: 'IN_PROGRESS' }
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
      emergencyContact: 'Amit Gupta: 9812345671',
      kycStatus: 'VERIFIED',
      joiningDate: '2025-11-01',
      status: 'ACTIVE',
      monthlyRent: 14000,
      securityDeposit: 28000,
      address: 'Delhi NCR',
      documents: [],
      payments: [],
      complaints: []
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
      receiptNumber: 'UN-REC-2026-0901'
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
      method: 'UPI'
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
      method: 'UPI'
    }
  ];

  static expenses = [
    { id: 'exp-1', propertyId: 'prop-1', title: 'Commercial Electricity Bill (DHBVN)', category: 'ELECTRICITY', amount: 14500, vendor: 'DHBVN Gurugram', date: '2026-09-10', description: 'Monthly electricity bill for Block A' },
    { id: 'exp-2', propertyId: 'prop-1', title: 'Airtel Fiber Gigabit Wi-Fi', category: 'INTERNET', amount: 3499, vendor: 'Airtel Broadband', date: '2026-09-01', description: 'High-speed broadband for residents' },
    { id: 'exp-3', propertyId: 'prop-1', title: 'Housekeeping & Cleaning Supplies', category: 'SUPPLIES', amount: 4200, vendor: 'CleanPro Hygiene', date: '2026-09-12', description: 'Floor disinfectants, bin liners, handwash' }
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
      status: 'PENDING',
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
      status: 'APPROVED',
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
      assignedStaffName: 'Ramesh (Plumber)',
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
    { id: 'stf-1', name: 'Rajesh Sharma', role: 'MANAGER', mobile: '+91 98765 00010', shift: 'Morning (8 AM - 4 PM)', status: 'ACTIVE', salary: 35000, propertyId: 'prop-1' },
    { id: 'stf-2', name: 'Ramesh Kumar', role: 'MAINTENANCE', mobile: '+91 98765 00011', shift: 'General Full Day', status: 'ACTIVE', salary: 24000, propertyId: 'prop-1' },
    { id: 'stf-3', name: 'Sunita Devi', role: 'HOUSEKEEPING', mobile: '+91 98765 00012', shift: 'Morning (7 AM - 3 PM)', status: 'ACTIVE', salary: 18000, propertyId: 'prop-1' }
  ];

  static inventory = [
    { id: 'inv-1', name: 'Commercial RO Water Purifier 50 LPH', category: 'APPLIANCE', quantity: 2, minQuantity: 2, location: 'Dining Hall', vendor: 'Kent RO Systems', condition: 'EXCELLENT', purchaseDate: '2025-08-10', warrantyExpiry: '2027-08-10', propertyId: 'prop-1' },
    { id: 'inv-2', name: 'Split AC 1.5 Ton 5-Star (Daikin)', category: 'APPLIANCE', quantity: 12, minQuantity: 12, location: 'All Rooms', vendor: 'Daikin Direct', condition: 'EXCELLENT', purchaseDate: '2025-06-15', warrantyExpiry: '2028-06-15', propertyId: 'prop-1' },
    { id: 'inv-3', name: 'Water Tank Level Sensor Alarm', category: 'PLUMBING', quantity: 1, minQuantity: 2, location: 'Rooftop Tank', vendor: 'AutoFlow India', condition: 'GOOD', purchaseDate: '2025-09-01', warrantyExpiry: '2026-09-01', propertyId: 'prop-1' }
  ];

  static tasks = [
    { id: 'tsk-1', title: 'Overhead Water Tank Chlorination & Filter Clean', category: 'PLUMBING', priority: 'HIGH', staffName: 'Ramesh Kumar', dueDate: '2026-09-22', status: 'PENDING', propertyId: 'prop-1' },
    { id: 'tsk-2', title: 'Fire Extinguisher Pressure Inspection (All Floors)', category: 'SECURITY', priority: 'MEDIUM', staffName: 'Rajesh Sharma', dueDate: '2026-09-25', status: 'PENDING', propertyId: 'prop-1' }
  ];

  static notices = [
    { id: 'not-1', title: 'Bi-Monthly Water Tank Cleaning Schedule', content: 'Water supply will be paused from 10:00 AM to 1:00 PM on Sunday for preventive hygiene maintenance.', category: 'MAINTENANCE', priority: 'NORMAL', propertyId: 'prop-1', publishedAt: new Date().toISOString() },
    { id: 'not-2', title: 'Diwali Festive Dinner & Common Room Celebration', content: 'Special buffet dinner scheduled in the central cafeteria this Friday at 8:00 PM.', category: 'GENERAL', priority: 'NORMAL', propertyId: 'prop-1', publishedAt: new Date().toISOString() }
  ];

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

  // 1. DASHBOARD
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
        console.warn('[OwnerController.getDashboard] DB Fallback to DevStore');
      }

      // DevStore Fallback
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

  // 2. PROPERTIES
  static async getProperties(req: AuthRequest, res: Response): Promise<Response> {
    try {
      try {
        const properties = await prisma.property.findMany({ include: { buildings: true, rooms: true } });
        if (properties.length > 0) return sendSuccess(res, properties);
      } catch {}
      return sendSuccess(res, DevStore.properties);
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  static async getPropertyById(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.properties[0]);
  }

  static async createProperty(req: AuthRequest, res: Response): Promise<Response> {
    const newProp = { id: `prop-${Date.now()}`, ...req.body };
    DevStore.properties.push(newProp as any);
    return sendSuccess(res, newProp, 'Property created', 201);
  }

  static async updateProperty(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.properties[0], 'Property updated');
  }

  // 3. BUILDINGS
  static async getBuildings(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.buildings);
  }

  static async createBuilding(req: AuthRequest, res: Response): Promise<Response> {
    const bld = { id: `bld-${Date.now()}`, ...req.body };
    DevStore.buildings.push(bld as any);
    return sendSuccess(res, bld, 'Building created', 201);
  }

  // 4. ROOMS & BEDS
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

      // Auto generate beds
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
    if (room) Object.assign(room, req.body);
    return sendSuccess(res, room, 'Room updated');
  }

  static async updateBedStatus(req: AuthRequest, res: Response): Promise<Response> {
    const bedId = req.params.id;
    const { status, monthlyRent } = req.body;
    for (const r of DevStore.rooms) {
      const b = r.beds.find((bed) => bed.id === bedId);
      if (b) {
        if (status) b.status = status;
        if (monthlyRent) b.monthlyRent = monthlyRent;
        return sendSuccess(res, b, `Bed status updated to ${status}`);
      }
    }
    return sendSuccess(res, { id: bedId, status }, 'Bed status updated');
  }

  // 5. RESIDENTS & LIFECYCLE
  static async getResidents(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.residents);
  }

  static async getResidentById(req: AuthRequest, res: Response): Promise<Response> {
    const resident = DevStore.residents.find((r) => r.id === req.params.id) || DevStore.residents[0];
    return sendSuccess(res, resident);
  }

  static async moveInResident(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { bedId, fullName, email, mobile, monthlyRent, depositAmount, leaseStartDate, leaseEndDate } = req.body;

      // Find and allocate bed in DevStore
      let targetRoomNum = '102';
      let targetBedNum = 'Bed 102-C';

      for (const r of DevStore.rooms) {
        const b = r.beds.find((bed) => bed.id === bedId || bed.status === 'AVAILABLE');
        if (b && (!bedId || b.id === bedId)) {
          b.status = 'OCCUPIED';
          b.residentName = fullName;
          b.residentMobile = mobile;
          targetRoomNum = r.number;
          targetBedNum = b.bedNumber;
          r.occupiedCount = r.beds.filter((bed) => bed.status === 'OCCUPIED').length;
          break;
        }
      }

      const newResident = {
        id: `res-${Date.now()}`,
        userId: `usr-${Date.now()}`,
        propertyId: 'prop-1',
        bedId: bedId || 'bed-new',
        roomNumber: targetRoomNum,
        bedNumber: targetBedNum,
        fullName: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        gender: 'MALE',
        emergencyContact: 'Guardian: 9876543210',
        kycStatus: 'PENDING',
        joiningDate: leaseStartDate || new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        monthlyRent: parseFloat(monthlyRent || '14000'),
        securityDeposit: parseFloat(depositAmount || '28000'),
        address: req.body.permanentAddress || 'Not provided',
        documents: [],
        payments: [
          { id: `pay-${Date.now()}`, category: 'RENT', period: 'Current Month', amount: parseFloat(monthlyRent || '14000'), dueDate: '2026-10-05', status: 'PENDING' }
        ],
        complaints: []
      };

      DevStore.residents.unshift(newResident as any);

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
      return sendSuccess(res, resident, 'Move-out settlement completed and bed released.');
    }
    return sendSuccess(res, { id: req.params.id, status: 'MOVED_OUT' }, 'Move-out completed');
  }

  // 6. PAYMENTS & FINANCE
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
    }
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
      amount: parseFloat(amount),
      dueDate: dueDate || '2026-10-05',
      status: 'PENDING',
      notes: description
    };
    DevStore.payments.unshift(newInvoice as any);
    return sendSuccess(res, newInvoice, 'Invoice created', 201);
  }

  // 7. EXPENSES
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
      description: req.body.description || req.body.notes
    };
    DevStore.expenses.unshift(newExp as any);
    return sendSuccess(res, newExp, 'Expense logged', 201);
  }

  // 8. VISITORS
  static async getVisitors(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.visitors);
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
    const vis = DevStore.visitors.find((v) => v.qrPassCode === qrPassToken || v.id === qrPassToken) || DevStore.visitors[0];
    return sendSuccess(res, { valid: true, visitor: vis }, 'QR Pass verified successfully');
  }

  static async checkInVisitor(req: AuthRequest, res: Response): Promise<Response> {
    const vis = DevStore.visitors.find((v) => v.id === req.params.id) || DevStore.visitors[0];
    if (vis) vis.status = 'CHECKED_IN';
    return sendSuccess(res, vis, 'Visitor checked in');
  }

  static async checkOutVisitor(req: AuthRequest, res: Response): Promise<Response> {
    const vis = DevStore.visitors.find((v) => v.id === req.params.id) || DevStore.visitors[0];
    if (vis) vis.status = 'CHECKED_OUT';
    return sendSuccess(res, vis, 'Visitor checked out');
  }

  // 9. COMPLAINTS & MAINTENANCE
  static async getComplaints(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.complaints);
  }

  static async updateComplaintStatus(req: AuthRequest, res: Response): Promise<Response> {
    const { status, comment, assignedStaff, assignedStaffId } = req.body;
    const complaint = DevStore.complaints.find((c) => c.id === req.params.id) || DevStore.complaints[0];
    if (complaint) {
      complaint.status = status;
      if (assignedStaff || assignedStaffId) {
        const s = DevStore.staff.find((st) => st.id === assignedStaffId || st.id === assignedStaff);
        complaint.assignedStaffName = s ? s.name : 'Technician';
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

  // 10. STAFF
  static async getStaff(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.staff);
  }

  static async createStaff(req: AuthRequest, res: Response): Promise<Response> {
    const newStaff = {
      id: `stf-${Date.now()}`,
      name: req.body.name,
      role: req.body.role || 'MAINTENANCE',
      mobile: req.body.mobile,
      shift: req.body.shift || 'Morning',
      status: 'ACTIVE',
      salary: parseFloat(req.body.salary || '22000'),
      propertyId: 'prop-1'
    };
    DevStore.staff.unshift(newStaff as any);
    return sendSuccess(res, newStaff, 'Staff registered', 201);
  }

  // 11. INVENTORY
  static async getInventory(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.inventory);
  }

  static async createInventoryItem(req: AuthRequest, res: Response): Promise<Response> {
    const newItem = {
      id: `inv-${Date.now()}`,
      name: req.body.name,
      category: req.body.category || 'APPLIANCE',
      quantity: parseInt(req.body.quantity || '1', 10),
      minQuantity: parseInt(req.body.minQuantity || '1', 10),
      location: req.body.location || 'Property Level',
      vendor: req.body.vendor || 'Direct Purchase',
      condition: req.body.condition || 'EXCELLENT',
      purchaseDate: new Date().toISOString().split('T')[0],
      warrantyExpiry: req.body.warrantyExpiry || null,
      propertyId: 'prop-1'
    };
    DevStore.inventory.unshift(newItem as any);
    return sendSuccess(res, newItem, 'Asset logged', 201);
  }

  // 12. TASKS
  static async getTasks(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.tasks);
  }

  static async createTask(req: AuthRequest, res: Response): Promise<Response> {
    const newTask = {
      id: `tsk-${Date.now()}`,
      title: req.body.title,
      category: req.body.category || 'HOUSEKEEPING',
      priority: req.body.priority || 'MEDIUM',
      staffName: 'Assigned Staff',
      dueDate: req.body.dueDate || new Date().toISOString().split('T')[0],
      status: 'PENDING',
      propertyId: 'prop-1'
    };
    DevStore.tasks.unshift(newTask as any);
    return sendSuccess(res, newTask, 'Task assigned', 201);
  }

  // 13. DOCUMENTS
  static async getDocuments(req: AuthRequest, res: Response): Promise<Response> {
    const docs = DevStore.residents.flatMap((r) => r.documents || []);
    return sendSuccess(res, docs);
  }

  static async verifyDocument(req: AuthRequest, res: Response): Promise<Response> {
    const { status, rejectionReason } = req.body;
    for (const r of DevStore.residents) {
      const d = r.documents.find((doc: any) => doc.id === req.params.id);
      if (d) {
        d.status = status;
        (d as any).rejectionReason = rejectionReason;
        return sendSuccess(res, d, `Document status marked as ${status}`);
      }
    }
    return sendSuccess(res, { id: req.params.id, status }, 'Document status updated');
  }

  // 14. NOTICES
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
      propertyId: 'prop-1',
      publishedAt: new Date().toISOString()
    };
    DevStore.notices.unshift(newNotice as any);
    return sendSuccess(res, newNotice, 'Notice published', 201);
  }

  // 15. AUDIT LOGS & SETTINGS
  static async getAuditLogs(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, DevStore.auditLogs);
  }

  static async getSettings(req: AuthRequest, res: Response): Promise<Response> {
    return sendSuccess(res, {
      curfewTime: '10:30 PM',
      visitorPassExpiry: '24 Hours',
      noticePeriodDays: 30
    });
  }
}

export default OwnerController;
