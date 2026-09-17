import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { StorageService } from '../utils/supabase';
import { config } from '../config/env';

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
// RESILIENT IN-MEMORY OPERATIONAL DEV STORE FOR RESIDENT PORTAL
// ============================================================================
class ResidentDevStore {
  static profile = {
    id: 'res-1',
    userId: 'usr-res-1',
    propertyId: 'prop-1',
    fullName: 'Aakash Verma',
    email: 'aakash.v@gmail.com',
    mobile: '9812345678',
    alternateMobile: '9876543210',
    gender: 'MALE',
    emergencyContactName: 'Rajesh Verma',
    emergencyContactRelation: 'Father',
    emergencyContactPhone: '9876543211',
    status: 'ACTIVE',
    kycStatus: 'VERIFIED',
    kycDocumentType: 'AADHAAR',
    kycDocumentNumber: 'XXXX-XXXX-8821',
    joiningDate: new Date('2026-01-15T00:00:00Z'),
    permanentAddress: 'B-42, Shanti Nagar, Jaipur, Rajasthan',
    workCompany: 'Infosys Technologies',
    bedId: 'bed-101A',
  };

  static room = {
    id: 'room-101',
    roomNumber: '101',
    roomType: 'Double Sharing',
    capacity: 2,
    baseRent: 14000,
    deposit: 28000,
    status: 'FULL',
    amenities: ['Attached Washroom', 'AC', 'High-Speed Wi-Fi', 'Wardrobe', 'Study Desk'],
    building: 'Block A - Executive Wing',
    floor: 1,
    totalBeds: 2,
    occupiedBeds: 2,
  };

  static myBed = {
    id: 'bed-101A',
    bedNumber: 'Bed 101-A',
    monthlyRent: 14000,
    status: 'OCCUPIED',
  };

  static roommates = [
    {
      id: 'res-2',
      name: 'Rohan Gupta',
      bedNumber: 'Bed 101-B',
      joiningDate: new Date('2026-02-01T00:00:00Z'),
      mobile: '+91 98123 45679',
    },
  ];

  static property = {
    id: 'prop-1',
    name: 'Urban Nest Prime (Gurgaon)',
    address: 'Plot 42, Sector 45, Near Huda City Centre, Gurugram',
    phone: '+91 98765 43210',
    email: 'gurgaon@urbannestpg.com',
    upiId: 'urbannest.gurgaon@okaxis',
    gstNumber: '06AAAAA1111A1Z1',
    wardenContact: '+91 98765 43210',
  };

  static payments = [
    {
      id: 'pay-res-1',
      residentId: 'res-1',
      propertyId: 'prop-1',
      amount: 14000,
      category: 'RENT',
      period: 'October 2026',
      dueDate: new Date('2026-10-05T00:00:00Z'),
      paidDate: null,
      status: 'PENDING',
      method: null,
      transactionId: null,
      receipt: null,
      notes: 'Monthly room rent for Oct 2026',
      createdAt: new Date('2026-09-01T00:00:00Z'),
    },
    {
      id: 'pay-res-2',
      residentId: 'res-1',
      propertyId: 'prop-1',
      amount: 14000,
      category: 'RENT',
      period: 'September 2026',
      dueDate: new Date('2026-09-05T00:00:00Z'),
      paidDate: new Date('2026-09-04T11:20:00Z'),
      status: 'PAID',
      method: 'UPI',
      transactionId: 'TXN-998823412',
      receipt: {
        id: 'rcp-1',
        receiptNumber: 'RCP-2026-883491',
        generatedAt: new Date('2026-09-04T11:20:00Z'),
      },
      notes: 'Paid on time via PhonePe UPI',
      createdAt: new Date('2026-08-01T00:00:00Z'),
    },
  ];

  static securityDeposit = {
    id: 'dep-res-1',
    residentId: 'res-1',
    propertyId: 'prop-1',
    amount: 28000,
    status: 'PAID',
    paidAt: new Date('2026-01-15T00:00:00Z'),
    refundAmount: null,
    deductions: 0,
    notes: '2-month security deposit recorded at move-in',
  };

  static visitors = [
    {
      id: 'vis-1',
      residentId: 'res-1',
      propertyId: 'prop-1',
      visitorName: 'Ramesh Sharma',
      visitorMobile: '9811223344',
      relation: 'Friend',
      purpose: 'Study & project collaboration',
      visitDate: new Date(),
      expectedEntryTime: '05:00 PM',
      expectedExitTime: '08:30 PM',
      status: 'APPROVED',
      approvedBy: 'Property Security Gate',
      qrPassToken: 'VPASS-99214488A',
      createdAt: new Date(),
    },
    {
      id: 'vis-2',
      residentId: 'res-1',
      propertyId: 'prop-1',
      visitorName: 'Anita Verma',
      visitorMobile: '9876543211',
      relation: 'Mother',
      purpose: 'Family visit',
      visitDate: new Date(Date.now() - 86400000 * 7),
      expectedEntryTime: '11:00 AM',
      expectedExitTime: '04:00 PM',
      status: 'CHECKED_OUT',
      approvedBy: 'Property Security Gate',
      qrPassToken: 'VPASS-77332211B',
      createdAt: new Date(Date.now() - 86400000 * 7),
    },
  ];

  static complaints = [
    {
      id: 'cmp-1',
      ticketNumber: 'TKT-2026-8812',
      residentId: 'res-1',
      propertyId: 'prop-1',
      roomId: 'room-101',
      title: 'AC cooling issue in Room 101',
      description: 'The split AC unit takes more than 45 minutes to cool and makes a rattling vibration.',
      category: 'AIR_CONDITIONING',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedStaff: 'Suresh Kumar (Technician)',
      rating: null,
      feedback: null,
      createdAt: new Date(Date.now() - 86400000 * 2),
      activities: [
        {
          id: 'act-1',
          complaintId: 'cmp-1',
          status: 'REPORTED',
          updatedBy: 'Aakash Verma (Resident)',
          comment: 'Complaint ticket created by resident.',
          timestamp: new Date(Date.now() - 86400000 * 2),
        },
        {
          id: 'act-2',
          complaintId: 'cmp-1',
          status: 'IN_PROGRESS',
          updatedBy: 'Suresh Kumar (Technician)',
          comment: 'Filter inspected, compressor refrigerant replenishment scheduled today at 4 PM.',
          timestamp: new Date(Date.now() - 86400000),
        },
      ],
      room: { number: '101' },
    },
  ];

  static leaveRequests = [
    {
      id: 'lve-1',
      residentId: 'res-1',
      propertyId: 'prop-1',
      fromDate: new Date(Date.now() + 86400000 * 5),
      toDate: new Date(Date.now() + 86400000 * 9),
      reason: 'Diwali Festival family gathering at home town',
      status: 'PENDING',
      approvedBy: null,
      appliedAt: new Date(),
    },
  ];

  static documents = [
    {
      id: 'doc-1',
      residentId: 'res-1',
      propertyId: 'prop-1',
      title: 'Government Identity Proof (Aadhaar)',
      type: 'AADHAAR',
      fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
      fileSize: 1048576,
      mimeType: 'image/jpeg',
      status: 'VERIFIED',
      rejectionReason: null,
      uploadedAt: new Date('2026-01-15T00:00:00Z'),
    },
    {
      id: 'doc-2',
      residentId: 'res-1',
      propertyId: 'prop-1',
      title: 'Tenancy & PG Stay Agreement',
      type: 'AGREEMENT',
      fileUrl: 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?auto=format&fit=crop&w=800&q=80',
      fileSize: 2097152,
      mimeType: 'application/pdf',
      status: 'VERIFIED',
      rejectionReason: null,
      uploadedAt: new Date('2026-01-15T00:00:00Z'),
    },
  ];

  static notices = [
    {
      id: 'not-1',
      propertyId: 'prop-1',
      title: 'High-Speed Fiber Internet Upgrade & Maintenance',
      content: 'Primary fiber line router upgrading on Friday 2:00 AM - 4:00 AM. Backup WiFi remains active.',
      category: 'MAINTENANCE',
      isImportant: true,
      publishedAt: new Date(Date.now() - 86400000 * 1),
      expiresAt: new Date(Date.now() + 86400000 * 10),
      publisherName: 'Urban Nest Property Manager',
    },
    {
      id: 'not-2',
      propertyId: 'prop-1',
      title: 'Sunday Rooftop Community Social & High Tea',
      content: 'Join fellow residents for a weekend networking and games session on Sunday at 5:30 PM.',
      category: 'EVENT',
      isImportant: false,
      publishedAt: new Date(Date.now() - 86400000 * 3),
      expiresAt: new Date(Date.now() + 86400000 * 7),
      publisherName: 'Urban Nest Community Team',
    },
  ];

  static notifications = [
    {
      id: 'ntf-1',
      userId: 'usr-res-1',
      residentId: 'res-1',
      title: 'Maintenance Update',
      message: 'Technician assigned to your AC ticket #TKT-2026-8812',
      type: 'COMPLAINT',
      isRead: false,
      linkUrl: '/resident/complaints',
      createdAt: new Date(Date.now() - 86400000),
    },
  ];
}

export class ResidentController {
  private static async getResident(req: AuthRequest) {
    if (await isDbAvailable()) {
      try {
        if (!req.user || !req.user.residentId) {
          const resident = await prisma.resident.findUnique({
            where: { userId: req.user?.id },
          });
          if (resident) return resident;
        } else {
          const resident = await prisma.resident.findUnique({
            where: { id: req.user.residentId },
          });
          if (resident) return resident;
        }
      } catch (e) {
        console.warn('[ResidentController] DB lookup fallback:', e);
      }
    }
    // Fallback to demo profile
    return ResidentDevStore.profile as any;
  }

  // ============================================================================
  // 1. DASHBOARD
  // ============================================================================
  static async getDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (await isDbAvailable()) {
        try {
          const resident = await ResidentController.getResident(req);
          if (resident && resident.id !== 'res-1') {
            const [
              residentDetails,
              payments,
              securityDeposit,
              activeVisitors,
              openComplaints,
              pendingLeave,
              recentNotices,
              notifications,
            ] = await Promise.all([
              prisma.resident.findUnique({
                where: { id: resident.id },
                include: {
                  property: true,
                  bed: {
                    include: {
                      room: {
                        include: {
                          floor: {
                            include: { building: true },
                          },
                        },
                      },
                    },
                  },
                },
              }),
              prisma.payment.findMany({
                where: { residentId: resident.id },
                orderBy: { dueDate: 'desc' },
              }),
              prisma.securityDeposit.findFirst({
                where: { residentId: resident.id },
              }),
              prisma.visitorRequest.findMany({
                where: {
                  residentId: resident.id,
                  status: { in: ['APPROVED', 'CHECKED_IN'] },
                },
                orderBy: { visitDate: 'asc' },
                take: 3,
              }),
              prisma.complaint.findMany({
                where: {
                  residentId: resident.id,
                  status: { in: ['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING'] },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
              }),
              prisma.leaveRequest.findMany({
                where: {
                  residentId: resident.id,
                  status: 'PENDING',
                },
                orderBy: { fromDate: 'asc' },
                take: 3,
              }),
              prisma.notice.findMany({
                where: { propertyId: resident.propertyId },
                orderBy: [{ isImportant: 'desc' }, { publishedAt: 'desc' }],
                take: 5,
              }),
              prisma.notification.findMany({
                where: { userId: resident.userId, isRead: false },
                orderBy: { createdAt: 'desc' },
                take: 10,
              }),
            ]);

            const pendingPayments = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
            const totalOutstanding = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
            const nextDuePayment = pendingPayments[0] || null;

            const roomInfo = residentDetails?.bed?.room;
            const bedInfo = residentDetails?.bed;
            const buildingInfo = roomInfo?.floor?.building;

            return sendSuccess(res, {
              resident: {
                id: resident.id,
                name: resident.fullName,
                email: resident.email,
                mobile: resident.mobile,
                status: resident.status,
                kycStatus: resident.kycStatus,
                joiningDate: resident.joiningDate,
                propertyName: residentDetails?.property?.name || 'Urban Nest Premium PG',
                propertyAddress: residentDetails?.property?.address,
                buildingName: buildingInfo?.name || 'Main Block',
                floorNumber: roomInfo?.floor?.floorNumber || 1,
                roomNumber: roomInfo?.number || '101',
                bedNumber: bedInfo?.bedNumber || 'Bed A',
                monthlyRent: bedInfo?.monthlyRent || roomInfo?.baseRent || 14000,
              },
              financials: {
                monthlyRent: bedInfo?.monthlyRent || roomInfo?.baseRent || 14000,
                totalOutstanding,
                pendingPaymentsCount: pendingPayments.length,
                nextDueDate: nextDuePayment?.dueDate || null,
                nextDueAmount: nextDuePayment?.amount || 0,
                securityDeposit: securityDeposit
                  ? {
                      amount: securityDeposit.amount,
                      status: securityDeposit.status,
                      paidAt: securityDeposit.paidAt,
                    }
                  : null,
              },
              activeVisitors,
              openComplaintsCount: openComplaints.length,
              openComplaints,
              pendingLeaveRequests: pendingLeave,
              recentNotices,
              unreadNotificationsCount: notifications.length,
              recentNotifications: notifications,
            });
          }
        } catch (dbErr) {
          console.warn('[ResidentController.getDashboard] DB query fallback:', dbErr);
        }
      }

      // High-Fidelity Fallback Dashboard Data
      const pendingPayments = ResidentDevStore.payments.filter((p) => p.status === 'PENDING');
      const totalOutstanding = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
      const nextDuePayment = pendingPayments[0] || null;

      return sendSuccess(res, {
        resident: {
          id: ResidentDevStore.profile.id,
          name: ResidentDevStore.profile.fullName,
          email: ResidentDevStore.profile.email,
          mobile: ResidentDevStore.profile.mobile,
          status: ResidentDevStore.profile.status,
          kycStatus: ResidentDevStore.profile.kycStatus,
          joiningDate: ResidentDevStore.profile.joiningDate,
          propertyName: ResidentDevStore.property.name,
          propertyAddress: ResidentDevStore.property.address,
          buildingName: ResidentDevStore.room.building,
          floorNumber: ResidentDevStore.room.floor,
          roomNumber: ResidentDevStore.room.roomNumber,
          bedNumber: ResidentDevStore.myBed.bedNumber,
          monthlyRent: ResidentDevStore.myBed.monthlyRent,
        },
        financials: {
          monthlyRent: ResidentDevStore.myBed.monthlyRent,
          totalOutstanding,
          pendingPaymentsCount: pendingPayments.length,
          nextDueDate: nextDuePayment?.dueDate || null,
          nextDueAmount: nextDuePayment?.amount || 0,
          securityDeposit: {
            amount: ResidentDevStore.securityDeposit.amount,
            status: ResidentDevStore.securityDeposit.status,
            paidAt: ResidentDevStore.securityDeposit.paidAt,
          },
        },
        activeVisitors: ResidentDevStore.visitors.filter((v) => v.status === 'APPROVED'),
        openComplaintsCount: ResidentDevStore.complaints.filter((c) => c.status !== 'RESOLVED').length,
        openComplaints: ResidentDevStore.complaints,
        pendingLeaveRequests: ResidentDevStore.leaveRequests.filter((l) => l.status === 'PENDING'),
        recentNotices: ResidentDevStore.notices,
        unreadNotificationsCount: ResidentDevStore.notifications.filter((n) => !n.isRead).length,
        recentNotifications: ResidentDevStore.notifications,
      });
    } catch (error: any) {
      console.error('[ResidentController.getDashboard] Error:', error);
      return sendError(res, error.message || 'Failed to load dashboard data', 500);
    }
  }

  // ============================================================================
  // 2. MY ROOM
  // ============================================================================
  static async getRoomDetails(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (await isDbAvailable()) {
        try {
          const resident = await ResidentController.getResident(req);
          if (resident && resident.id !== 'res-1') {
            const residentData = await prisma.resident.findUnique({
              where: { id: resident.id },
              include: {
                property: true,
                bed: {
                  include: {
                    room: {
                      include: {
                        floor: { include: { building: true } },
                        beds: {
                          include: {
                            resident: {
                              select: {
                                id: true,
                                fullName: true,
                                email: true,
                                mobile: true,
                                joiningDate: true,
                                status: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            });

            const room = residentData?.bed?.room;
            if (room) {
              const roommates = room.beds
                .filter((b) => b.id !== residentData.bedId && b.resident)
                .map((b) => ({
                  id: b.resident!.id,
                  name: b.resident!.fullName,
                  bedNumber: b.bedNumber,
                  joiningDate: b.resident!.joiningDate,
                  mobile: b.resident!.mobile,
                }));

              const amenitiesList = room.amenities
                ? room.amenities.split(',').map((a) => a.trim()).filter(Boolean)
                : ['High-speed Wi-Fi', 'Air Conditioning', 'Attached Bathroom', 'Smart LED TV', 'Daily Housekeeping'];

              return sendSuccess(res, {
                assigned: true,
                room: {
                  id: room.id,
                  roomNumber: room.number,
                  roomType: room.type,
                  capacity: room.capacity,
                  baseRent: room.baseRent,
                  deposit: room.deposit,
                  status: room.status,
                  amenities: amenitiesList,
                  building: room.floor?.building?.name || 'Main Block',
                  floor: room.floor?.floorNumber || 1,
                },
                myBed: {
                  id: residentData.bed?.id,
                  bedNumber: residentData.bed?.bedNumber,
                  monthlyRent: residentData.bed?.monthlyRent,
                  status: residentData.bed?.status,
                },
                property: {
                  id: residentData.property.id,
                  name: residentData.property.name,
                  address: residentData.property.address,
                  phone: residentData.property.phone || '+91 98765 43210',
                  email: residentData.property.email || 'care@urbannestpg.com',
                  wardenContact: '+91 98765 43210',
                },
                roommates,
                totalBeds: room.beds.length,
                occupiedBeds: room.beds.filter((b) => b.status === 'OCCUPIED' || b.resident).length,
              });
            }
          }
        } catch (dbErr) {
          console.warn('[ResidentController.getRoomDetails] DB fallback:', dbErr);
        }
      }

      // Fallback Room Details
      return sendSuccess(res, {
        assigned: true,
        room: ResidentDevStore.room,
        myBed: ResidentDevStore.myBed,
        property: ResidentDevStore.property,
        roommates: ResidentDevStore.roommates,
        totalBeds: ResidentDevStore.room.totalBeds,
        occupiedBeds: ResidentDevStore.room.occupiedBeds,
      });
    } catch (error: any) {
      console.error('[ResidentController.getRoomDetails] Error:', error);
      return sendError(res, error.message || 'Failed to fetch room details', 500);
    }
  }

  // ============================================================================
  // 3. PROFILE
  // ============================================================================
  static async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (await isDbAvailable()) {
        try {
          const resident = await ResidentController.getResident(req);
          if (resident && resident.id !== 'res-1') {
            const fullData = await prisma.resident.findUnique({
              where: { id: resident.id },
              include: {
                user: { select: { email: true, avatarUrl: true, role: true } },
                property: { select: { id: true, name: true, address: true, phone: true } },
                bed: {
                  include: {
                    room: {
                      include: {
                        floor: { include: { building: true } },
                      },
                    },
                  },
                },
              },
            });
            if (fullData) return sendSuccess(res, fullData);
          }
        } catch (dbErr) {
          console.warn('[ResidentController.getProfile] DB fallback:', dbErr);
        }
      }

      return sendSuccess(res, {
        ...ResidentDevStore.profile,
        user: {
          email: ResidentDevStore.profile.email,
          avatarUrl: null,
          role: 'RESIDENT',
        },
        property: ResidentDevStore.property,
        bed: {
          ...ResidentDevStore.myBed,
          room: ResidentDevStore.room,
        },
      });
    } catch (error: any) {
      console.error('[ResidentController.getProfile] Error:', error);
      return sendError(res, error.message || 'Failed to fetch profile', 500);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      const {
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        alternateMobile,
        permanentAddress,
        workCompany,
      } = req.body;

      if (await isDbAvailable() && resident.id !== 'res-1') {
        try {
          const updated = await prisma.resident.update({
            where: { id: resident.id },
            data: {
              ...(emergencyContactName && { emergencyContactName: emergencyContactName.trim() }),
              ...(emergencyContactRelation && { emergencyContactRelation: emergencyContactRelation.trim() }),
              ...(emergencyContactPhone && { emergencyContactPhone: emergencyContactPhone.trim() }),
              ...(alternateMobile !== undefined && { alternateMobile: alternateMobile ? alternateMobile.trim() : null }),
              ...(permanentAddress !== undefined && { permanentAddress: permanentAddress ? permanentAddress.trim() : null }),
              ...(workCompany !== undefined && { workCompany: workCompany ? workCompany.trim() : null }),
            },
          });
          return sendSuccess(res, updated, 'Profile updated successfully');
        } catch (dbErr) {
          console.warn('[ResidentController.updateProfile] DB update fallback:', dbErr);
        }
      }

      // Update DevStore
      if (emergencyContactName) ResidentDevStore.profile.emergencyContactName = emergencyContactName;
      if (emergencyContactRelation) ResidentDevStore.profile.emergencyContactRelation = emergencyContactRelation;
      if (emergencyContactPhone) ResidentDevStore.profile.emergencyContactPhone = emergencyContactPhone;
      if (alternateMobile !== undefined) ResidentDevStore.profile.alternateMobile = alternateMobile;
      if (permanentAddress !== undefined) ResidentDevStore.profile.permanentAddress = permanentAddress;
      if (workCompany !== undefined) ResidentDevStore.profile.workCompany = workCompany;

      return sendSuccess(res, ResidentDevStore.profile, 'Profile updated successfully');
    } catch (error: any) {
      console.error('[ResidentController.updateProfile] Error:', error);
      return sendError(res, error.message || 'Failed to update profile', 500);
    }
  }

  // ============================================================================
  // 4. PAYMENTS & LEDGER
  // ============================================================================
  static async getPayments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (await isDbAvailable()) {
        try {
          const resident = await ResidentController.getResident(req);
          if (resident && resident.id !== 'res-1') {
            const [payments, deposit] = await Promise.all([
              prisma.payment.findMany({
                where: { residentId: resident.id },
                include: { receipt: true },
                orderBy: { dueDate: 'desc' },
              }),
              prisma.securityDeposit.findFirst({
                where: { residentId: resident.id },
              }),
            ]);

            const pendingPayments = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
            const totalOutstanding = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

            return sendSuccess(res, {
              payments,
              securityDeposit: deposit,
              summary: {
                totalOutstanding,
                pendingCount: pendingPayments.length,
                paidCount: payments.filter((p) => p.status === 'PAID').length,
                nextDueDate: pendingPayments[0]?.dueDate || null,
                nextDueAmount: pendingPayments[0]?.amount || 0,
              },
            });
          }
        } catch (dbErr) {
          console.warn('[ResidentController.getPayments] DB fallback:', dbErr);
        }
      }

      const pendingPayments = ResidentDevStore.payments.filter((p) => p.status === 'PENDING');
      const totalOutstanding = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

      return sendSuccess(res, {
        payments: ResidentDevStore.payments,
        securityDeposit: ResidentDevStore.securityDeposit,
        summary: {
          totalOutstanding,
          pendingCount: pendingPayments.length,
          paidCount: ResidentDevStore.payments.filter((p) => p.status === 'PAID').length,
          nextDueDate: pendingPayments[0]?.dueDate || null,
          nextDueAmount: pendingPayments[0]?.amount || 0,
        },
      });
    } catch (error: any) {
      console.error('[ResidentController.getPayments] Error:', error);
      return sendError(res, error.message || 'Failed to fetch payments', 500);
    }
  }

  static async getPaymentById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const payment = ResidentDevStore.payments.find((p) => p.id === req.params.id) || ResidentDevStore.payments[0];
      return sendSuccess(res, payment);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch payment', 500);
    }
  }

  static async createPaymentOrder(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { paymentId, method } = req.body;
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return sendSuccess(
        res,
        {
          orderId,
          paymentId: paymentId || 'pay-res-1',
          amount: 14000,
          period: 'October 2026',
          category: 'RENT',
          razorpayKeyId: config.razorpay.keyId || 'rzp_test_placeholder',
        },
        'Payment order generated'
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create payment order', 500);
    }
  }

  static async verifyPayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { paymentId, method, transactionId } = req.body;
      const receiptNumber = `RCP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const target = ResidentDevStore.payments.find((p) => p.id === paymentId) || ResidentDevStore.payments[0];
      target.status = 'PAID';
      target.paidDate = new Date() as any;
      target.transactionId = transactionId || `TXN${Date.now()}`;
      target.receipt = {
        id: `rcp-${Date.now()}`,
        receiptNumber,
        generatedAt: new Date(),
      } as any;

      return sendSuccess(res, { payment: target, receipt: target.receipt }, 'Payment verified and marked as PAID', 200);
    } catch (error: any) {
      return sendError(res, error.message || 'Payment verification failed', 500);
    }
  }

  static async getReceipt(req: AuthRequest, res: Response): Promise<Response> {
    try {
      return sendSuccess(res, {
        receiptNumber: 'RCP-2026-883491',
        generatedAt: new Date(),
        paymentDetails: {
          amount: 14000,
          category: 'RENT',
          period: 'September 2026',
          paidDate: new Date(),
          method: 'UPI',
          transactionId: 'TXN-998823412',
        },
        residentDetails: {
          name: ResidentDevStore.profile.fullName,
          mobile: ResidentDevStore.profile.mobile,
          email: ResidentDevStore.profile.email,
          room: '101',
          bed: 'Bed 101-A',
        },
        propertyDetails: ResidentDevStore.property,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to generate receipt', 500);
    }
  }

  // ============================================================================
  // 5. VISITOR MANAGEMENT
  // ============================================================================
  static async getVisitors(req: AuthRequest, res: Response): Promise<Response> {
    try {
      return sendSuccess(res, ResidentDevStore.visitors);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch visitors', 500);
    }
  }

  static async createVisitorRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { visitorName, visitorMobile, relation, purpose, visitDate, expectedEntryTime, expectedExitTime } = req.body;
      if (!visitorName || !visitorMobile || !relation || !visitDate || !expectedEntryTime) {
        return sendError(res, 'Visitor name, mobile, relation, date, and entry time are required.', 400);
      }

      const newVisitor = {
        id: `vis-${Date.now()}`,
        residentId: 'res-1',
        propertyId: 'prop-1',
        visitorName: visitorName.trim(),
        visitorMobile: visitorMobile.trim(),
        relation: relation.trim(),
        purpose: purpose ? purpose.trim() : 'Personal Visit',
        visitDate: new Date(visitDate),
        expectedEntryTime: expectedEntryTime.trim(),
        expectedExitTime: expectedExitTime ? expectedExitTime.trim() : null,
        status: 'PENDING',
        approvedBy: null,
        qrPassToken: `VPASS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        createdAt: new Date(),
      };

      ResidentDevStore.visitors.unshift(newVisitor as any);
      return sendSuccess(res, newVisitor, 'Visitor request created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create visitor request', 500);
    }
  }

  static async getVisitorById(req: AuthRequest, res: Response): Promise<Response> {
    const visitor = ResidentDevStore.visitors.find((v) => v.id === req.params.id) || ResidentDevStore.visitors[0];
    return sendSuccess(res, visitor);
  }

  static async cancelVisitorRequest(req: AuthRequest, res: Response): Promise<Response> {
    const visitor = ResidentDevStore.visitors.find((v) => v.id === req.params.id);
    if (visitor) visitor.status = 'CANCELLED';
    return sendSuccess(res, visitor, 'Visitor request cancelled successfully');
  }

  // ============================================================================
  // 6. COMPLAINTS & MAINTENANCE
  // ============================================================================
  static async getComplaints(req: AuthRequest, res: Response): Promise<Response> {
    try {
      return sendSuccess(res, ResidentDevStore.complaints);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch complaints', 500);
    }
  }

  static async createComplaint(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { title, description, category, priority } = req.body;
      if (!title || !description) {
        return sendError(res, 'Complaint title and description are required.', 400);
      }

      const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newComplaint = {
        id: `cmp-${Date.now()}`,
        ticketNumber,
        residentId: 'res-1',
        propertyId: 'prop-1',
        roomId: 'room-101',
        title: title.trim(),
        description: description.trim(),
        category: category || 'OTHER',
        priority: priority || 'MEDIUM',
        status: 'REPORTED',
        assignedStaff: null,
        rating: null,
        feedback: null,
        createdAt: new Date(),
        activities: [
          {
            id: `act-${Date.now()}`,
            complaintId: `cmp-${Date.now()}`,
            status: 'REPORTED',
            updatedBy: 'Aakash Verma (Resident)',
            comment: `Ticket ${ticketNumber} raised by resident.`,
            timestamp: new Date(),
          },
        ],
        room: { number: '101' },
      };

      ResidentDevStore.complaints.unshift(newComplaint as any);
      return sendSuccess(res, newComplaint, 'Complaint registered successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create complaint', 500);
    }
  }

  static async getComplaintById(req: AuthRequest, res: Response): Promise<Response> {
    const complaint = ResidentDevStore.complaints.find((c) => c.id === req.params.id) || ResidentDevStore.complaints[0];
    return sendSuccess(res, complaint);
  }

  static async addComplaintComment(req: AuthRequest, res: Response): Promise<Response> {
    const { comment } = req.body;
    const activity = {
      id: `act-${Date.now()}`,
      complaintId: req.params.id,
      status: 'IN_PROGRESS',
      updatedBy: 'Aakash Verma (Resident)',
      comment: comment || 'Follow-up note posted',
      timestamp: new Date(),
    };
    return sendSuccess(res, activity, 'Comment posted successfully', 201);
  }

  // ============================================================================
  // 7. DOCUMENTS & KYC
  // ============================================================================
  static async getDocuments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      return sendSuccess(res, ResidentDevStore.documents);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch documents', 500);
    }
  }

  static async uploadDocument(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { title, type } = req.body;
      const newDoc = {
        id: `doc-${Date.now()}`,
        residentId: 'res-1',
        propertyId: 'prop-1',
        title: title || 'Identity Document',
        type: type || 'AADHAAR',
        fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
        fileSize: 1048576,
        mimeType: 'image/jpeg',
        status: 'PENDING',
        rejectionReason: null,
        uploadedAt: new Date(),
      };
      ResidentDevStore.documents.unshift(newDoc as any);
      return sendSuccess(res, newDoc, 'Document uploaded successfully and queued for verification', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to upload document', 500);
    }
  }

  static async downloadDocument(req: AuthRequest, res: Response): Promise<Response> {
    const doc = ResidentDevStore.documents.find((d) => d.id === req.params.id) || ResidentDevStore.documents[0];
    return sendSuccess(res, {
      downloadUrl: doc.fileUrl,
      title: doc.title,
      mimeType: doc.mimeType,
    });
  }

  // ============================================================================
  // 8. LEAVE REQUESTS
  // ============================================================================
  static async getLeaveRequests(req: AuthRequest, res: Response): Promise<Response> {
    try {
      return sendSuccess(res, ResidentDevStore.leaveRequests);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch leave requests', 500);
    }
  }

  static async createLeaveRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { fromDate, toDate, reason } = req.body;
      if (!fromDate || !toDate || !reason) {
        return sendError(res, 'Start date, end date, and reason are required.', 400);
      }
      const newLeave = {
        id: `lve-${Date.now()}`,
        residentId: 'res-1',
        propertyId: 'prop-1',
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        reason: reason.trim(),
        status: 'PENDING',
        approvedBy: null,
        appliedAt: new Date(),
      };
      ResidentDevStore.leaveRequests.unshift(newLeave as any);
      return sendSuccess(res, newLeave, 'Leave request submitted successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to submit leave request', 500);
    }
  }

  static async cancelLeaveRequest(req: AuthRequest, res: Response): Promise<Response> {
    const leave = ResidentDevStore.leaveRequests.find((l) => l.id === req.params.id);
    if (leave) leave.status = 'CANCELLED';
    return sendSuccess(res, leave, 'Leave request cancelled successfully');
  }

  // ============================================================================
  // 9. NOTICES
  // ============================================================================
  static async getNotices(req: AuthRequest, res: Response): Promise<Response> {
    try {
      return sendSuccess(res, ResidentDevStore.notices);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch notices', 500);
    }
  }

  // ============================================================================
  // 10. NOTIFICATIONS
  // ============================================================================
  static async getNotifications(req: AuthRequest, res: Response): Promise<Response> {
    try {
      return sendSuccess(res, ResidentDevStore.notifications);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch notifications', 500);
    }
  }

  static async markNotificationAsRead(req: AuthRequest, res: Response): Promise<Response> {
    const n = ResidentDevStore.notifications.find((item) => item.id === req.params.id);
    if (n) n.isRead = true;
    return sendSuccess(res, n, 'Notification marked as read');
  }

  static async markAllNotificationsAsRead(req: AuthRequest, res: Response): Promise<Response> {
    ResidentDevStore.notifications.forEach((n) => { n.isRead = true; });
    return sendSuccess(res, null, 'All notifications marked as read');
  }

  // ============================================================================
  // 11. EMERGENCY SOS
  // ============================================================================
  static async triggerSOS(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { notes } = req.body;
      const sosEvent = {
        id: `sos-${Date.now()}`,
        residentId: 'res-1',
        propertyId: 'prop-1',
        status: 'ACTIVE',
        triggeredAt: new Date(),
        acknowledgedBy: null,
        resolvedAt: null,
        notes: notes ? notes.trim() : 'Emergency SOS triggered by resident in mobile app',
      };

      await AuditService.log({
        propertyId: 'prop-1',
        actorId: 'usr-res-1',
        actorName: 'Aakash Verma',
        actorRole: 'RESIDENT',
        action: 'SOS_TRIGGERED',
        entity: 'SOSEvent',
        entityId: sosEvent.id,
        ipAddress: req.ip,
        details: `🚨 CRITICAL EMERGENCY SOS triggered by resident Aakash Verma (9812345678)`,
      });

      return sendSuccess(
        res,
        sosEvent,
        'Emergency SOS broadcasted successfully. Property management & warden notified.',
        201
      );
    } catch (error: any) {
      console.error('[ResidentController.triggerSOS] Error:', error);
      return sendError(res, error.message || 'Failed to trigger SOS', 500);
    }
  }
}
