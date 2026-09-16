import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { StorageService } from '../utils/supabase';
import { config } from '../config/env';

export class ResidentController {
  /**
   * Helper to ensure resident is resolved from request
   */
  private static async getResident(req: AuthRequest) {
    if (!req.user || !req.user.residentId) {
      // Find resident record by user ID
      const resident = await prisma.resident.findUnique({
        where: { userId: req.user?.id },
      });
      return resident;
    }

    return prisma.resident.findUnique({
      where: { id: req.user.residentId },
    });
  }

  // ============================================================================
  // 1. DASHBOARD
  // ============================================================================
  static async getDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

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
        // Resident Details with Room & Bed
        prisma.resident.findUnique({
          where: { id: resident.id },
          include: {
            property: true,
            bed: {
              include: {
                room: {
                  include: {
                    floor: {
                      include: {
                        building: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),

        // Payments for dues calculation
        prisma.payment.findMany({
          where: { residentId: resident.id },
          orderBy: { dueDate: 'desc' },
        }),

        // Security Deposit
        prisma.securityDeposit.findFirst({
          where: { residentId: resident.id },
        }),

        // Active/Approved Visitor Passes
        prisma.visitorRequest.findMany({
          where: {
            residentId: resident.id,
            status: { in: ['APPROVED', 'CHECKED_IN'] },
          },
          orderBy: { visitDate: 'asc' },
          take: 3,
        }),

        // Open complaints
        prisma.complaint.findMany({
          where: {
            residentId: resident.id,
            status: { in: ['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),

        // Pending leave requests
        prisma.leaveRequest.findMany({
          where: {
            residentId: resident.id,
            status: 'PENDING',
          },
          orderBy: { fromDate: 'asc' },
          take: 3,
        }),

        // Recent Notices for Property
        prisma.notice.findMany({
          where: { propertyId: resident.propertyId },
          orderBy: [{ isImportant: 'desc' }, { publishedAt: 'desc' }],
          take: 5,
        }),

        // Unread notifications
        prisma.notification.findMany({
          where: { userId: resident.userId, isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      // Calculate dues
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
          monthlyRent: bedInfo?.monthlyRent || roomInfo?.baseRent || 15000,
        },
        financials: {
          monthlyRent: bedInfo?.monthlyRent || roomInfo?.baseRent || 15000,
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
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const residentData = await prisma.resident.findUnique({
        where: { id: resident.id },
        include: {
          property: true,
          bed: {
            include: {
              room: {
                include: {
                  floor: {
                    include: {
                      building: true,
                    },
                  },
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
      if (!room) {
        return sendSuccess(res, {
          assigned: false,
          message: 'No room currently assigned. Please contact the PG manager.',
        });
      }

      // Format roommates list (other beds in same room)
      const roommates = room.beds
        .filter((b) => b.id !== residentData.bedId && b.resident)
        .map((b) => ({
          id: b.resident!.id,
          name: b.resident!.fullName,
          bedNumber: b.bedNumber,
          joiningDate: b.resident!.joiningDate,
          mobile: b.resident!.mobile,
        }));

      // Amenities split
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
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const fullData = await prisma.resident.findUnique({
        where: { id: resident.id },
        include: {
          user: {
            select: {
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
          bed: {
            include: {
              room: {
                include: {
                  floor: {
                    include: {
                      building: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return sendSuccess(res, fullData);
    } catch (error: any) {
      console.error('[ResidentController.getProfile] Error:', error);
      return sendError(res, error.message || 'Failed to fetch profile', 500);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const {
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        alternateMobile,
        permanentAddress,
        workCompany,
        currentPassword,
        newPassword,
      } = req.body;

      // Handle password update if requested
      if (newPassword) {
        if (!currentPassword) {
          return sendError(res, 'Current password is required to set a new password.', 400);
        }
        if (newPassword.length < 6) {
          return sendError(res, 'New password must be at least 6 characters long.', 400);
        }

        const user = await prisma.user.findUnique({ where: { id: resident.userId } });
        if (!user) {
          return sendError(res, 'User record not found.', 404);
        }

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
          return sendError(res, 'Current password entered is incorrect.', 400);
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });

        await AuditService.log({
          propertyId: resident.propertyId,
          actorId: user.id,
          actorName: resident.fullName,
          actorRole: 'RESIDENT',
          action: 'PASSWORD_CHANGE',
          entity: 'User',
          entityId: user.id,
          ipAddress: req.ip,
          details: 'Resident updated password successfully',
        });
      }

      // Update editable resident profile fields
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

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'PROFILE_UPDATE',
        entity: 'Resident',
        entityId: resident.id,
        ipAddress: req.ip,
        details: 'Resident updated personal & emergency contact details',
      });

      return sendSuccess(res, updated, 'Profile updated successfully');
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
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const [payments, deposit] = await Promise.all([
        prisma.payment.findMany({
          where: { residentId: resident.id },
          include: {
            receipt: true,
          },
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
    } catch (error: any) {
      console.error('[ResidentController.getPayments] Error:', error);
      return sendError(res, error.message || 'Failed to fetch payments', 500);
    }
  }

  static async getPaymentById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const payment = await prisma.payment.findFirst({
        where: {
          id: req.params.id,
          residentId: resident.id, // Strictly scoped to current resident
        },
        include: {
          receipt: true,
          property: {
            select: {
              name: true,
              address: true,
              upiId: true,
              gstNumber: true,
            },
          },
        },
      });

      if (!payment) {
        return sendError(res, 'Payment record not found', 404);
      }

      return sendSuccess(res, payment);
    } catch (error: any) {
      console.error('[ResidentController.getPaymentById] Error:', error);
      return sendError(res, error.message || 'Failed to fetch payment', 500);
    }
  }

  /**
   * POST /api/resident/payments/create-order
   * Creates backend payment order for a pending payment record
   */
  static async createPaymentOrder(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const { paymentId, method } = req.body;
      if (!paymentId) {
        return sendError(res, 'paymentId is required', 400);
      }

      const payment = await prisma.payment.findFirst({
        where: {
          id: paymentId,
          residentId: resident.id,
          status: { in: ['PENDING', 'OVERDUE'] },
        },
      });

      if (!payment) {
        return sendError(res, 'Valid pending payment record not found', 404);
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          orderId,
          method: method || 'UPI',
        },
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'PAYMENT_INITIATED',
        entity: 'Payment',
        entityId: payment.id,
        ipAddress: req.ip,
        details: `Initiated payment of ₹${payment.amount} for ${payment.period} (Order ID: ${orderId})`,
      });

      return sendSuccess(res, {
        orderId,
        paymentId: payment.id,
        amount: payment.amount,
        period: payment.period,
        category: payment.category,
        razorpayKeyId: config.razorpay.keyId || 'rzp_test_placeholder',
      }, 'Payment order generated');
    } catch (error: any) {
      console.error('[ResidentController.createPaymentOrder] Error:', error);
      return sendError(res, error.message || 'Failed to create payment order', 500);
    }
  }

  /**
   * POST /api/resident/payments/verify
   * Verifies signature/payment transaction and marks payment as PAID
   */
  static async verifyPayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const { paymentId, transactionId, method, razorpaySignature, razorpayPaymentId, razorpayOrderId } = req.body;

      if (!paymentId) {
        return sendError(res, 'paymentId is required', 400);
      }

      const payment = await prisma.payment.findFirst({
        where: {
          id: paymentId,
          residentId: resident.id,
        },
      });

      if (!payment) {
        return sendError(res, 'Payment record not found', 404);
      }

      if (payment.status === 'PAID') {
        return sendSuccess(res, payment, 'Payment already marked as PAID');
      }

      // If Razorpay secret is configured and payment comes through Razorpay
      if (config.razorpay.keySecret && razorpaySignature && razorpayPaymentId && razorpayOrderId) {
        const expectedSignature = crypto
          .createHmac('sha256', config.razorpay.keySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');

        if (expectedSignature !== razorpaySignature) {
          return sendError(res, 'Invalid payment signature. Verification failed.', 400, 'INVALID_PAYMENT_SIGNATURE');
        }
      }

      const finalTxnId = razorpayPaymentId || transactionId || `TXN${Date.now()}`;
      const receiptNumber = `RCP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // Complete payment in atomic transaction
      const result = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paidDate: new Date(),
            transactionId: finalTxnId,
            method: method || 'UPI',
          },
        });

        const receipt = await tx.paymentReceipt.create({
          data: {
            paymentId: updatedPayment.id,
            receiptNumber,
          },
        });

        // In-app notification
        await tx.notification.create({
          data: {
            userId: resident.userId,
            residentId: resident.id,
            title: 'Rent Payment Successful',
            message: `Your payment of ₹${payment.amount} for ${payment.period} has been received. Receipt #${receiptNumber} generated.`,
            type: 'PAYMENT',
            linkUrl: '/resident/payments',
          },
        });

        return { payment: updatedPayment, receipt };
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
        details: `Payment of ₹${payment.amount} marked as PAID. Receipt: ${receiptNumber}, Txn: ${finalTxnId}`,
      });

      return sendSuccess(res, result, 'Payment verified and marked as PAID', 200);
    } catch (error: any) {
      console.error('[ResidentController.verifyPayment] Error:', error);
      return sendError(res, error.message || 'Payment verification failed', 500);
    }
  }

  static async getReceipt(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const payment = await prisma.payment.findFirst({
        where: {
          id: req.params.id,
          residentId: resident.id,
        },
        include: {
          receipt: true,
          property: true,
          resident: {
            include: {
              bed: {
                include: {
                  room: true,
                },
              },
            },
          },
        },
      });

      if (!payment || !payment.receipt) {
        return sendError(res, 'Receipt not found for this payment record', 404);
      }

      return sendSuccess(res, {
        receiptNumber: payment.receipt.receiptNumber,
        generatedAt: payment.receipt.generatedAt,
        paymentDetails: {
          amount: payment.amount,
          category: payment.category,
          period: payment.period,
          paidDate: payment.paidDate,
          method: payment.method,
          transactionId: payment.transactionId,
        },
        residentDetails: {
          name: payment.resident.fullName,
          mobile: payment.resident.mobile,
          email: payment.resident.email,
          room: payment.resident.bed?.room?.number,
          bed: payment.resident.bed?.bedNumber,
        },
        propertyDetails: {
          name: payment.property.name,
          address: payment.property.address,
          gstNumber: payment.property.gstNumber,
          phone: payment.property.phone,
        },
      });
    } catch (error: any) {
      console.error('[ResidentController.getReceipt] Error:', error);
      return sendError(res, error.message || 'Failed to generate receipt', 500);
    }
  }

  // ============================================================================
  // 5. VISITOR MANAGEMENT & SECURE QR PASS
  // ============================================================================
  static async getVisitors(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const visitors = await prisma.visitorRequest.findMany({
        where: { residentId: resident.id },
        orderBy: { visitDate: 'desc' },
      });

      return sendSuccess(res, visitors);
    } catch (error: any) {
      console.error('[ResidentController.getVisitors] Error:', error);
      return sendError(res, error.message || 'Failed to fetch visitors', 500);
    }
  }

  static async createVisitorRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const { visitorName, visitorMobile, relation, purpose, visitDate, expectedEntryTime, expectedExitTime } = req.body;

      if (!visitorName || !visitorMobile || !relation || !visitDate || !expectedEntryTime) {
        return sendError(res, 'Visitor name, mobile, relation, date, and entry time are required.', 400);
      }

      const parsedDate = new Date(visitDate);
      if (isNaN(parsedDate.getTime())) {
        return sendError(res, 'Invalid visit date format', 400);
      }

      const qrPassToken = `VPASS-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      const newVisitor = await prisma.visitorRequest.create({
        data: {
          residentId: resident.id,
          propertyId: resident.propertyId,
          visitorName: visitorName.trim(),
          visitorMobile: visitorMobile.trim(),
          relation: relation.trim(),
          purpose: purpose ? purpose.trim() : 'Personal Visit',
          visitDate: parsedDate,
          expectedEntryTime: expectedEntryTime.trim(),
          expectedExitTime: expectedExitTime ? expectedExitTime.trim() : null,
          status: 'PENDING',
          qrPassToken,
        },
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'VISITOR_REQUEST_CREATED',
        entity: 'VisitorRequest',
        entityId: newVisitor.id,
        ipAddress: req.ip,
        details: `Created visitor pass request for ${visitorName} on ${parsedDate.toDateString()}`,
      });

      return sendSuccess(res, newVisitor, 'Visitor request created successfully', 201);
    } catch (error: any) {
      console.error('[ResidentController.createVisitorRequest] Error:', error);
      return sendError(res, error.message || 'Failed to create visitor request', 500);
    }
  }

  static async getVisitorById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const visitor = await prisma.visitorRequest.findFirst({
        where: {
          id: req.params.id,
          residentId: resident.id,
        },
        include: {
          property: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      });

      if (!visitor) {
        return sendError(res, 'Visitor request not found', 404);
      }

      return sendSuccess(res, visitor);
    } catch (error: any) {
      console.error('[ResidentController.getVisitorById] Error:', error);
      return sendError(res, error.message || 'Failed to fetch visitor request', 500);
    }
  }

  static async cancelVisitorRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const visitor = await prisma.visitorRequest.findFirst({
        where: {
          id: req.params.id,
          residentId: resident.id,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });

      if (!visitor) {
        return sendError(res, 'Visitor request cannot be cancelled or was not found.', 404);
      }

      const updated = await prisma.visitorRequest.update({
        where: { id: visitor.id },
        data: { status: 'CANCELLED' },
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'VISITOR_REQUEST_CANCELLED',
        entity: 'VisitorRequest',
        entityId: visitor.id,
        ipAddress: req.ip,
        details: `Cancelled visitor request for ${visitor.visitorName}`,
      });

      return sendSuccess(res, updated, 'Visitor request cancelled successfully');
    } catch (error: any) {
      console.error('[ResidentController.cancelVisitorRequest] Error:', error);
      return sendError(res, error.message || 'Failed to cancel visitor request', 500);
    }
  }

  // ============================================================================
  // 6. COMPLAINTS & MAINTENANCE
  // ============================================================================
  static async getComplaints(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const complaints = await prisma.complaint.findMany({
        where: { residentId: resident.id },
        include: {
          activities: {
            orderBy: { timestamp: 'asc' },
          },
          room: {
            select: {
              number: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, complaints);
    } catch (error: any) {
      console.error('[ResidentController.getComplaints] Error:', error);
      return sendError(res, error.message || 'Failed to fetch complaints', 500);
    }
  }

  static async createComplaint(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const { title, description, category, priority } = req.body;

      if (!title || !description) {
        return sendError(res, 'Complaint title and description are required.', 400);
      }

      const residentRoom = await prisma.resident.findUnique({
        where: { id: resident.id },
        include: { bed: true },
      });

      const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const result = await prisma.$transaction(async (tx) => {
        const complaint = await tx.complaint.create({
          data: {
            ticketNumber,
            residentId: resident.id,
            propertyId: resident.propertyId,
            roomId: residentRoom?.bed?.roomId || null,
            title: title.trim(),
            description: description.trim(),
            category: category || 'OTHER',
            priority: priority || 'MEDIUM',
            status: 'REPORTED',
          },
        });

        await tx.maintenanceActivity.create({
          data: {
            complaintId: complaint.id,
            status: 'REPORTED',
            updatedBy: resident.fullName,
            comment: `Complaint ticket ${ticketNumber} raised by resident.`,
          },
        });

        return complaint;
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'COMPLAINT_CREATED',
        entity: 'Complaint',
        entityId: result.id,
        ipAddress: req.ip,
        details: `Raised complaint ticket ${ticketNumber}: "${title}"`,
      });

      return sendSuccess(res, result, 'Complaint registered successfully', 201);
    } catch (error: any) {
      console.error('[ResidentController.createComplaint] Error:', error);
      return sendError(res, error.message || 'Failed to create complaint', 500);
    }
  }

  static async getComplaintById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const complaint = await prisma.complaint.findFirst({
        where: {
          id: req.params.id,
          residentId: resident.id,
        },
        include: {
          activities: {
            orderBy: { timestamp: 'asc' },
          },
          room: true,
        },
      });

      if (!complaint) {
        return sendError(res, 'Complaint record not found', 404);
      }

      return sendSuccess(res, complaint);
    } catch (error: any) {
      console.error('[ResidentController.getComplaintById] Error:', error);
      return sendError(res, error.message || 'Failed to fetch complaint details', 500);
    }
  }

  static async addComplaintComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const { comment } = req.body;
      if (!comment || !comment.trim()) {
        return sendError(res, 'Comment text is required', 400);
      }

      const complaint = await prisma.complaint.findFirst({
        where: {
          id: req.params.id,
          residentId: resident.id,
        },
      });

      if (!complaint) {
        return sendError(res, 'Complaint record not found', 404);
      }

      const activity = await prisma.maintenanceActivity.create({
        data: {
          complaintId: complaint.id,
          status: complaint.status,
          updatedBy: `${resident.fullName} (Resident)`,
          comment: comment.trim(),
        },
      });

      return sendSuccess(res, activity, 'Comment posted successfully', 201);
    } catch (error: any) {
      console.error('[ResidentController.addComplaintComment] Error:', error);
      return sendError(res, error.message || 'Failed to add comment', 500);
    }
  }

  // ============================================================================
  // 7. DOCUMENTS & KYC
  // ============================================================================
  static async getDocuments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const documents = await prisma.document.findMany({
        where: { residentId: resident.id },
        orderBy: { uploadedAt: 'desc' },
      });

      return sendSuccess(res, documents);
    } catch (error: any) {
      console.error('[ResidentController.getDocuments] Error:', error);
      return sendError(res, error.message || 'Failed to fetch documents', 500);
    }
  }

  static async uploadDocument(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const file = (req as any).file;
      const { title, type } = req.body;

      if (!file) {
        return sendError(res, 'Please attach a document file to upload.', 400);
      }

      if (!title || !type) {
        return sendError(res, 'Document title and type are required.', 400);
      }

      // Upload file safely
      const uploadRes = await StorageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'resident-kyc'
      );

      const document = await prisma.document.create({
        data: {
          residentId: resident.id,
          propertyId: resident.propertyId,
          title: title.trim(),
          type: type || 'OTHER',
          fileUrl: uploadRes.fileUrl,
          fileSize: uploadRes.fileSize,
          mimeType: uploadRes.mimeType,
          status: 'PENDING',
        },
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'DOCUMENT_UPLOADED',
        entity: 'Document',
        entityId: document.id,
        ipAddress: req.ip,
        details: `Uploaded document "${title}" (${type})`,
      });

      return sendSuccess(res, document, 'Document uploaded successfully and queued for verification', 201);
    } catch (error: any) {
      console.error('[ResidentController.uploadDocument] Error:', error);
      return sendError(res, error.message || 'Failed to upload document', 500);
    }
  }

  static async downloadDocument(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const document = await prisma.document.findFirst({
        where: {
          id: req.params.id,
          residentId: resident.id,
        },
      });

      if (!document) {
        return sendError(res, 'Document not found or access denied', 404);
      }

      const signedUrl = await StorageService.getSignedUrl(document.fileUrl, 1800);

      return sendSuccess(res, {
        downloadUrl: signedUrl,
        title: document.title,
        mimeType: document.mimeType,
      });
    } catch (error: any) {
      console.error('[ResidentController.downloadDocument] Error:', error);
      return sendError(res, error.message || 'Failed to generate download link', 500);
    }
  }

  // ============================================================================
  // 8. LEAVE REQUESTS
  // ============================================================================
  static async getLeaveRequests(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const leaves = await prisma.leaveRequest.findMany({
        where: { residentId: resident.id },
        orderBy: { appliedAt: 'desc' },
      });

      return sendSuccess(res, leaves);
    } catch (error: any) {
      console.error('[ResidentController.getLeaveRequests] Error:', error);
      return sendError(res, error.message || 'Failed to fetch leave requests', 500);
    }
  }

  static async createLeaveRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const { fromDate, toDate, reason } = req.body;

      if (!fromDate || !toDate || !reason) {
        return sendError(res, 'Start date, end date, and reason are required.', 400);
      }

      const parsedFrom = new Date(fromDate);
      const parsedTo = new Date(toDate);

      if (isNaN(parsedFrom.getTime()) || isNaN(parsedTo.getTime())) {
        return sendError(res, 'Invalid date format for leave request.', 400);
      }

      if (parsedTo < parsedFrom) {
        return sendError(res, 'End date cannot be prior to start date.', 400);
      }

      const leave = await prisma.leaveRequest.create({
        data: {
          residentId: resident.id,
          propertyId: resident.propertyId,
          fromDate: parsedFrom,
          toDate: parsedTo,
          reason: reason.trim(),
          status: 'PENDING',
        },
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'LEAVE_APPLIED',
        entity: 'LeaveRequest',
        entityId: leave.id,
        ipAddress: req.ip,
        details: `Applied leave from ${parsedFrom.toDateString()} to ${parsedTo.toDateString()}`,
      });

      return sendSuccess(res, leave, 'Leave request submitted successfully', 201);
    } catch (error: any) {
      console.error('[ResidentController.createLeaveRequest] Error:', error);
      return sendError(res, error.message || 'Failed to submit leave request', 500);
    }
  }

  static async cancelLeaveRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const leave = await prisma.leaveRequest.findFirst({
        where: {
          id: req.params.id,
          residentId: resident.id,
          status: 'PENDING',
        },
      });

      if (!leave) {
        return sendError(res, 'Leave request not found or cannot be cancelled.', 404);
      }

      const updated = await prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: 'CANCELLED' },
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'LEAVE_CANCELLED',
        entity: 'LeaveRequest',
        entityId: leave.id,
        ipAddress: req.ip,
        details: `Cancelled pending leave request #${leave.id}`,
      });

      return sendSuccess(res, updated, 'Leave request cancelled successfully');
    } catch (error: any) {
      console.error('[ResidentController.cancelLeaveRequest] Error:', error);
      return sendError(res, error.message || 'Failed to cancel leave request', 500);
    }
  }

  // ============================================================================
  // 9. NOTICES
  // ============================================================================
  static async getNotices(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const notices = await prisma.notice.findMany({
        where: { propertyId: resident.propertyId },
        orderBy: [{ isImportant: 'desc' }, { publishedAt: 'desc' }],
      });

      return sendSuccess(res, notices);
    } catch (error: any) {
      console.error('[ResidentController.getNotices] Error:', error);
      return sendError(res, error.message || 'Failed to fetch notices', 500);
    }
  }

  // ============================================================================
  // 10. NOTIFICATIONS
  // ============================================================================
  static async getNotifications(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const notifications = await prisma.notification.findMany({
        where: { userId: resident.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return sendSuccess(res, notifications);
    } catch (error: any) {
      console.error('[ResidentController.getNotifications] Error:', error);
      return sendError(res, error.message || 'Failed to fetch notifications', 500);
    }
  }

  static async markNotificationAsRead(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const updated = await prisma.notification.updateMany({
        where: {
          id: req.params.id,
          userId: resident.userId,
        },
        data: { isRead: true },
      });

      return sendSuccess(res, updated, 'Notification marked as read');
    } catch (error: any) {
      console.error('[ResidentController.markNotificationAsRead] Error:', error);
      return sendError(res, error.message || 'Failed to update notification', 500);
    }
  }

  static async markAllNotificationsAsRead(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const updated = await prisma.notification.updateMany({
        where: { userId: resident.userId, isRead: false },
        data: { isRead: true },
      });

      return sendSuccess(res, updated, 'All notifications marked as read');
    } catch (error: any) {
      console.error('[ResidentController.markAllNotificationsAsRead] Error:', error);
      return sendError(res, error.message || 'Failed to update notifications', 500);
    }
  }

  // ============================================================================
  // 11. EMERGENCY SOS
  // ============================================================================
  static async triggerSOS(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const resident = await ResidentController.getResident(req);
      if (!resident) {
        return sendError(res, 'Resident profile not found', 404);
      }

      const { notes } = req.body;

      const sosEvent = await prisma.sOSEvent.create({
        data: {
          residentId: resident.id,
          propertyId: resident.propertyId,
          status: 'ACTIVE',
          notes: notes ? notes.trim() : 'Emergency SOS triggered by resident in mobile app',
        },
      });

      // Also create urgent in-app notification
      await prisma.notification.create({
        data: {
          userId: resident.userId,
          residentId: resident.id,
          title: '🚨 EMERGENCY SOS ALERT ACTIVATED',
          message: 'Your SOS signal has been transmitted to PG Property Management and Security Staff.',
          type: 'SOS',
          linkUrl: '/resident/emergency',
        },
      });

      await AuditService.log({
        propertyId: resident.propertyId,
        actorId: resident.userId,
        actorName: resident.fullName,
        actorRole: 'RESIDENT',
        action: 'SOS_TRIGGERED',
        entity: 'SOSEvent',
        entityId: sosEvent.id,
        ipAddress: req.ip,
        details: `🚨 CRITICAL EMERGENCY SOS triggered by resident ${resident.fullName} (${resident.mobile})`,
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
