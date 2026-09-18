import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { StorageService } from '../utils/supabase';
import { config } from '../config/env';

export class ResidentController {
  private static async getResident(req: AuthRequest) {
    if (req.user?.residentId) {
      const res = await prisma.resident.findUnique({
        where: { id: req.user.residentId },
        include: {
          bed: { include: { room: { include: { floor: { include: { building: true } } } } } },
          property: true,
        },
      });
      if (res) return res;
    }

    if (req.user?.id) {
      const res = await prisma.resident.findUnique({
        where: { userId: req.user.id },
        include: {
          bed: { include: { room: { include: { floor: { include: { building: true } } } } } },
          property: true,
        },
      });
      if (res) return res;
    }

    // Lookup by email
    if (req.user?.email) {
      const res = await prisma.resident.findFirst({
        where: { email: req.user.email.toLowerCase().trim() },
        include: {
          bed: { include: { room: { include: { floor: { include: { building: true } } } } } },
          property: true,
        },
      });
      if (res) return res;
    }

    return null;
  }

  // ==========================================================================
  // 1. RESIDENT DASHBOARD
  // ==========================================================================
  static async getDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found. Please contact PG management.', 404);
      }

      const [payments, deposit, visitors, complaints, leaveRequests, notices, notifications] =
        await Promise.all([
          prisma.payment.findMany({
            where: { residentId: resident.id },
            orderBy: { dueDate: 'desc' },
          }),
          prisma.securityDeposit.findFirst({
            where: { residentId: resident.id },
          }),
          prisma.visitorRequest.findMany({
            where: { residentId: resident.id, status: { in: ['APPROVED', 'PENDING', 'CHECKED_IN'] } },
            orderBy: { visitDate: 'desc' },
          }),
          prisma.complaint.findMany({
            where: { residentId: resident.id },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.leaveRequest.findMany({
            where: { residentId: resident.id },
            orderBy: { appliedAt: 'desc' },
          }),
          prisma.notice.findMany({
            where: { propertyId: resident.propertyId },
            orderBy: { publishedAt: 'desc' },
            take: 5,
          }),
          prisma.notification.findMany({
            where: { userId: resident.userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
        ]);

      const pendingPayments = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
      const totalOutstanding = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
      const nextDue = pendingPayments.length > 0 ? pendingPayments[0] : null;

      return sendSuccess(res, {
        resident: {
          id: resident.id,
          name: resident.fullName,
          fullName: resident.fullName,
          email: resident.email,
          mobile: resident.mobile,
          status: resident.status,
          kycStatus: resident.kycStatus,
          joiningDate: resident.joiningDate,
          propertyName: resident.property?.name || 'Urban Nest',
          propertyAddress: resident.property?.address,
          buildingName: resident.bed?.room?.floor?.building?.name || 'Main Wing',
          floorNumber: resident.bed?.room?.floor?.floorNumber || 1,
          roomNumber: resident.bed?.room?.number || '101',
          bedNumber: resident.bed?.bedNumber || 'A',
          monthlyRent: resident.bed?.monthlyRent || 0,
        },
        financials: {
          monthlyRent: resident.bed?.monthlyRent || 0,
          totalOutstanding,
          pendingPaymentsCount: pendingPayments.length,
          nextDueDate: nextDue ? nextDue.dueDate : null,
          nextDueAmount: nextDue ? nextDue.amount : 0,
          securityDeposit: deposit
            ? {
                amount: deposit.amount,
                status: deposit.status,
                paidAt: deposit.paidAt,
              }
            : null,
        },
        activeVisitors: visitors.map((v) => ({
          id: v.id,
          visitorName: v.visitorName,
          relation: v.relation,
          visitDate: v.visitDate,
          expectedEntryTime: v.expectedEntryTime,
          expectedExitTime: v.expectedExitTime,
          status: v.status,
          qrPassToken: v.qrPassToken,
        })),
        openComplaintsCount: complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
        openComplaints: complaints.map((c) => ({
          id: c.id,
          ticketNumber: c.ticketNumber,
          title: c.title,
          category: c.category,
          priority: c.priority,
          status: c.status,
          createdAt: c.createdAt,
        })),
        pendingLeaveRequests: leaveRequests.filter((l) => l.status === 'PENDING').map((l) => ({
          id: l.id,
          fromDate: l.fromDate,
          toDate: l.toDate,
          reason: l.reason,
          status: l.status,
        })),
        recentNotices: notices.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          category: n.category,
          isImportant: n.isImportant,
          publishedAt: n.publishedAt,
          publisherName: n.publisherName,
        })),
        unreadNotificationsCount: notifications.filter((n) => !n.isRead).length,
        recentNotifications: notifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: n.isRead,
          createdAt: n.createdAt,
        })),
      });
    } catch (error: any) {
      console.error('[ResidentController.getDashboard] Error:', error);
      return sendError(res, error.message || 'Failed to fetch dashboard', 500);
    }
  }

  // ==========================================================================
  // 2. ROOM & BED DETAILS
  // ==========================================================================
  static async getRoomDetails(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      if (!resident.bedId || !resident.bed) {
        return sendSuccess(res, {
          assigned: false,
          message: 'No room currently assigned. Please contact your property manager.',
        });
      }

      const room = resident.bed.room;

      // Find roommates sharing the same room
      const roommates = await prisma.resident.findMany({
        where: {
          bed: { roomId: room.id },
          id: { not: resident.id },
          status: 'ACTIVE',
        },
        include: { bed: true },
      });

      const allBedsInRoom = await prisma.bed.findMany({
        where: { roomId: room.id },
      });

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
          amenities: room.amenities ? room.amenities.split(',').map((a) => a.trim()).filter(Boolean) : [],
          building: room.floor?.building?.name || 'Main Wing',
          floor: room.floor?.floorNumber || 1,
        },
        myBed: {
          id: resident.bed.id,
          bedNumber: resident.bed.bedNumber,
          monthlyRent: resident.bed.monthlyRent,
          status: resident.bed.status,
        },
        property: {
          id: resident.property.id,
          name: resident.property.name,
          address: resident.property.address,
          phone: resident.property.phone || '+91 98765 43210',
          email: resident.property.email || 'contact@urbannestpg.com',
          wardenContact: resident.property.phone || '+91 98765 43210',
        },
        roommates: roommates.map((rm) => ({
          id: rm.id,
          name: rm.fullName,
          bedNumber: rm.bed?.bedNumber || 'N/A',
          joiningDate: rm.joiningDate,
          mobile: rm.mobile,
        })),
        totalBeds: allBedsInRoom.length,
        occupiedBeds: allBedsInRoom.filter((b) => b.status === 'OCCUPIED').length,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch room details', 500);
    }
  }

  // ==========================================================================
  // 3. RESIDENT PROFILE
  // ==========================================================================
  static async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      return sendSuccess(res, {
        id: resident.id,
        fullName: resident.fullName,
        email: resident.email,
        mobile: resident.mobile,
        alternateMobile: resident.alternateMobile,
        gender: resident.gender,
        emergencyContactName: resident.emergencyContactName,
        emergencyContactRelation: resident.emergencyContactRelation,
        emergencyContactPhone: resident.emergencyContactPhone,
        permanentAddress: resident.permanentAddress,
        workCompany: resident.workCompany,
        kycStatus: resident.kycStatus,
        kycDocumentType: resident.kycDocumentType,
        kycDocumentNumber: resident.kycDocumentNumber,
        joiningDate: resident.joiningDate,
        status: resident.status,
        property: resident.property,
        bed: resident.bed,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch profile', 500);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const {
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        alternateMobile,
        permanentAddress,
        workCompany,
      } = req.body;

      const updated = await prisma.resident.update({
        where: { id: resident.id },
        data: {
          ...(emergencyContactName && { emergencyContactName: emergencyContactName.trim() }),
          ...(emergencyContactRelation && { emergencyContactRelation: emergencyContactRelation.trim() }),
          ...(emergencyContactPhone && { emergencyContactPhone: emergencyContactPhone.trim() }),
          ...(alternateMobile !== undefined && { alternateMobile }),
          ...(permanentAddress !== undefined && { permanentAddress }),
          ...(workCompany !== undefined && { workCompany }),
        },
      });

      return sendSuccess(res, updated, 'Profile updated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update profile', 500);
    }
  }

  // ==========================================================================
  // 4. PAYMENTS & RAZORPAY INTEGRATION
  // ==========================================================================
  static async getPayments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

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

      const pendingList = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
      const paidList = payments.filter((p) => p.status === 'PAID');
      const totalOutstanding = pendingList.reduce((sum, p) => sum + p.amount, 0);
      const nextDue = pendingList.length > 0 ? pendingList[0] : null;

      return sendSuccess(res, {
        payments: payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          category: p.category,
          period: p.period,
          dueDate: p.dueDate,
          paidDate: p.paidDate,
          status: p.status,
          method: p.method,
          transactionId: p.transactionId,
          receiptNumber: p.receipt?.receiptNumber,
          notes: p.notes,
        })),
        securityDeposit: deposit,
        summary: {
          totalOutstanding,
          pendingCount: pendingList.length,
          paidCount: paidList.length,
          nextDueDate: nextDue ? nextDue.dueDate : null,
          nextDueAmount: nextDue ? nextDue.amount : 0,
        },
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch payments ledger', 500);
    }
  }

  static async getPaymentById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const payment = await prisma.payment.findFirst({
        where: { id: req.params.id, residentId: resident.id },
        include: { receipt: true },
      });

      if (!payment) return sendError(res, 'Payment not found', 404);
      return sendSuccess(res, payment);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch payment', 500);
    }
  }

  static async createPaymentOrder(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { paymentId, method } = req.body;
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const payment = await prisma.payment.findFirst({
        where: { id: paymentId, residentId: resident.id },
      });

      if (!payment) return sendError(res, 'Invoice not found', 404);
      if (payment.status === 'PAID') return sendError(res, 'This invoice is already paid', 400);

      const orderId = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      await prisma.payment.update({
        where: { id: paymentId },
        data: { orderId },
      });

      return sendSuccess(res, {
        orderId,
        paymentId: payment.id,
        amount: payment.amount,
        currency: 'INR',
        keyId: config.razorpay.keyId || 'rzp_test_placeholder',
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create payment order', 500);
    }
  }

  static async verifyPayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { paymentId, transactionId, method, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const payment = await prisma.payment.findFirst({
        where: { id: paymentId, residentId: resident.id },
      });

      if (!payment) return sendError(res, 'Payment invoice not found', 404);

      // Verify Razorpay HMAC signature if credentials exist
      if (config.razorpay.keySecret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
        const expectedSignature = crypto
          .createHmac('sha256', config.razorpay.keySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');

        if (expectedSignature !== razorpaySignature) {
          return sendError(res, 'Cryptographic payment signature verification failed.', 400);
        }
      }

      const txn = razorpayPaymentId || transactionId || `TXN-${Date.now()}`;
      const receiptNo = `UN-REC-${Date.now().toString().slice(-6)}`;

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: 'PAID',
            paidDate: new Date(),
            method: (method || 'UPI') as any,
            transactionId: txn,
          },
        });

        const receipt = await tx.paymentReceipt.upsert({
          where: { paymentId },
          create: {
            paymentId,
            receiptNumber: receiptNo,
          },
          update: {
            receiptNumber: receiptNo,
          },
        });

        return { payment: updated, receipt };
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'PAYMENT_COMPLETED',
        entity: 'Payment',
        entityId: payment.id,
        ipAddress: req.ip,
        details: `Rent payment of ₹${payment.amount} verified (Txn: ${txn})`,
      });

      return sendSuccess(res, result, 'Payment verified and receipt generated successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Payment verification failed', 500);
    }
  }

  static async getReceipt(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const payment = await prisma.payment.findFirst({
        where: { id: req.params.id, residentId: resident.id },
        include: { receipt: true, property: true },
      });

      if (!payment) return sendError(res, 'Payment not found', 404);

      return sendSuccess(res, {
        receiptNumber: payment.receipt?.receiptNumber || `UN-REC-${payment.id.slice(-6).toUpperCase()}`,
        generatedAt: payment.receipt?.generatedAt || payment.paidDate || new Date(),
        residentDetails: {
          name: resident.fullName,
          email: resident.email,
          mobile: resident.mobile,
          room: resident.bed?.room?.number || '101',
          bed: resident.bed?.bedNumber || 'A',
          property: resident.property?.name || 'Urban Nest',
        },
        paymentDetails: {
          period: payment.period,
          category: payment.category,
          amount: payment.amount,
          transactionId: payment.transactionId || 'PAID-OFFICIAL',
          paidDate: payment.paidDate,
          method: payment.method,
        },
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve receipt', 500);
    }
  }

  // ==========================================================================
  // 5. VISITORS
  // ==========================================================================
  static async getVisitors(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const visitors = await prisma.visitorRequest.findMany({
        where: { residentId: resident.id },
        orderBy: { visitDate: 'desc' },
      });
      return sendSuccess(res, visitors);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch visitors', 500);
    }
  }

  static async createVisitorRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { visitorName, visitorMobile, relation, purpose, visitDate, expectedEntryTime, expectedExitTime } = req.body;
      if (!visitorName || !visitorMobile) {
        return sendError(res, 'Visitor name and mobile number are required', 400);
      }

      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const qrPassToken = `VPASS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const visitor = await prisma.visitorRequest.create({
        data: {
          residentId: resident.id,
          propertyId: resident.propertyId,
          visitorName: visitorName.trim(),
          visitorMobile: visitorMobile.trim(),
          relation: relation ? relation.trim() : 'Friend',
          purpose: purpose ? purpose.trim() : 'Personal Visit',
          visitDate: visitDate ? new Date(visitDate) : new Date(),
          expectedEntryTime: expectedEntryTime || '04:00 PM',
          expectedExitTime: expectedExitTime || null,
          status: 'PENDING',
          qrPassToken,
        },
      });

      return sendSuccess(res, visitor, 'Visitor pre-approval request submitted', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to submit visitor request', 500);
    }
  }

  static async getVisitorById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const visitor = await prisma.visitorRequest.findFirst({
        where: { id: req.params.id, residentId: resident.id },
      });

      if (!visitor) return sendError(res, 'Visitor pass not found', 404);
      return sendSuccess(res, visitor);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch visitor', 500);
    }
  }

  static async cancelVisitorRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const updated = await prisma.visitorRequest.updateMany({
        where: { id: req.params.id, residentId: resident.id },
        data: { status: 'CANCELLED' },
      });

      return sendSuccess(res, updated, 'Visitor request cancelled');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to cancel visitor request', 500);
    }
  }

  // ==========================================================================
  // 6. COMPLAINTS & TICKETS
  // ==========================================================================
  static async getComplaints(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const complaints = await prisma.complaint.findMany({
        where: { residentId: resident.id },
        include: { activities: { orderBy: { timestamp: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, complaints);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch complaints', 500);
    }
  }

  static async getComplaintById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const complaint = await prisma.complaint.findFirst({
        where: { id: req.params.id, residentId: resident.id },
        include: { activities: { orderBy: { timestamp: 'desc' } } },
      });

      if (!complaint) return sendError(res, 'Complaint ticket not found', 404);
      return sendSuccess(res, complaint);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch complaint', 500);
    }
  }

  static async createComplaint(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { title, description, category, priority } = req.body;
      if (!title || !description) return sendError(res, 'Title and description are required', 400);

      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

      const complaint = await prisma.complaint.create({
        data: {
          ticketNumber,
          residentId: resident.id,
          propertyId: resident.propertyId,
          roomId: resident.bed?.roomId || null,
          title: title.trim(),
          description: description.trim(),
          category: (category || 'OTHER') as any,
          priority: (priority || 'MEDIUM') as any,
          status: 'REPORTED',
        },
      });

      return sendSuccess(res, complaint, 'Maintenance complaint ticket submitted', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create complaint', 500);
    }
  }

  static async addComplaintComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { comment } = req.body;
      if (!comment) return sendError(res, 'Comment text is required', 400);

      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const complaint = await prisma.complaint.findFirst({
        where: { id: req.params.id, residentId: resident.id },
      });

      if (!complaint) return sendError(res, 'Complaint ticket not found', 404);

      const activity = await prisma.maintenanceActivity.create({
        data: {
          complaintId: complaint.id,
          status: complaint.status,
          updatedBy: resident.fullName,
          comment: comment.trim(),
        },
      });

      return sendSuccess(res, activity, 'Comment added');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to add comment', 500);
    }
  }

  // ==========================================================================
  // 7. DOCUMENTS & KYC UPLOAD
  // ==========================================================================
  static async getDocuments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const docs = await prisma.document.findMany({
        where: { residentId: resident.id },
        orderBy: { uploadedAt: 'desc' },
      });
      return sendSuccess(res, docs);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch documents', 500);
    }
  }

  static async uploadDocument(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const file = req.file;
      const { title, type } = req.body;

      let fileUrl = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400';
      if (file) {
        const stored = await StorageService.uploadFile(file.buffer, file.originalname, file.mimetype, resident.id);
        fileUrl = stored.fileUrl;
      }

      const doc = await prisma.document.create({
        data: {
          residentId: resident.id,
          propertyId: resident.propertyId,
          title: title ? title.trim() : 'ID Document',
          type: (type || 'AADHAAR') as any,
          fileUrl,
          fileSize: file?.size || 1024,
          mimeType: file?.mimetype || 'image/jpeg',
          status: 'PENDING',
        },
      });

      return sendSuccess(res, doc, 'Document uploaded for verification', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Document upload failed', 500);
    }
  }

  static async downloadDocument(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const doc = await prisma.document.findFirst({
        where: { id: req.params.id, residentId: resident.id },
      });

      if (!doc) return sendError(res, 'Document not found', 404);

      return sendSuccess(res, {
        downloadUrl: doc.fileUrl,
        title: doc.title,
        mimeType: doc.mimeType,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve download link', 500);
    }
  }

  // ==========================================================================
  // 8. LEAVE REQUESTS
  // ==========================================================================
  static async getLeaveRequests(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const leaves = await prisma.leaveRequest.findMany({
        where: { residentId: resident.id },
        orderBy: { appliedAt: 'desc' },
      });
      return sendSuccess(res, leaves);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch leave requests', 500);
    }
  }

  static async createLeaveRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { fromDate, toDate, reason } = req.body;
      if (!fromDate || !toDate || !reason) {
        return sendError(res, 'From date, to date, and reason are required', 400);
      }

      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const leave = await prisma.leaveRequest.create({
        data: {
          residentId: resident.id,
          propertyId: resident.propertyId,
          fromDate: new Date(fromDate),
          toDate: new Date(toDate),
          reason: reason.trim(),
          status: 'PENDING',
        },
      });

      return sendSuccess(res, leave, 'Leave request submitted successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to submit leave request', 500);
    }
  }

  static async cancelLeaveRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const updated = await prisma.leaveRequest.updateMany({
        where: { id: req.params.id, residentId: resident.id },
        data: { status: 'CANCELLED' },
      });

      return sendSuccess(res, updated, 'Leave request cancelled');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to cancel leave request', 500);
    }
  }

  // ==========================================================================
  // 9. NOTICES & NOTIFICATIONS
  // ==========================================================================
  static async getNotices(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const notices = await prisma.notice.findMany({
        where: { propertyId: resident.propertyId },
        orderBy: { publishedAt: 'desc' },
      });
      return sendSuccess(res, notices);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch notices', 500);
    }
  }

  static async getNotifications(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user?.id) return sendError(res, 'Authentication required', 401);

      const notifs = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, notifs);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch notifications', 500);
    }
  }

  static async markNotificationAsRead(req: AuthRequest, res: Response): Promise<Response> {
    try {
      await prisma.notification.updateMany({
        where: { id: req.params.id, userId: req.user?.id },
        data: { isRead: true },
      });
      return sendSuccess(res, null, 'Notification marked as read');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update notification', 500);
    }
  }

  static async markAllNotificationsAsRead(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user?.id) return sendError(res, 'Authentication required', 401);

      await prisma.notification.updateMany({
        where: { userId: req.user.id },
        data: { isRead: true },
      });
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to mark all as read', 500);
    }
  }

  // ==========================================================================
  // 10. EMERGENCY SOS
  // ==========================================================================
  static async triggerSOS(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) return sendError(res, 'Resident profile not found', 404);

      const { notes } = req.body;

      const sos = await prisma.sOSEvent.create({
        data: {
          residentId: resident.id,
          propertyId: resident.propertyId,
          status: 'ACTIVE',
          notes: notes || 'Resident triggered SOS emergency alert.',
        },
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'SOS_TRIGGERED',
        entity: 'SOSEvent',
        entityId: sos.id,
        ipAddress: req.ip,
        details: `Emergency SOS triggered by ${resident.fullName} in Room ${resident.bed?.room?.number || 'N/A'}`,
      });

      return sendSuccess(res, sos, 'Emergency SOS alert broadcasted to PG Warden and Security staff!', 201);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to trigger SOS alert', 500);
    }
  }
}

export default ResidentController;
