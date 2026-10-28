import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

async function withDbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw new Error('Database operation failed after retries');
}

export class LeadBookingController {
  // -------------------------------------------------------------
  // 1. LEADS & ENQUIRIES (OWNER / MANAGER)
  // -------------------------------------------------------------
  static async getLeads(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      const { status } = req.query;

      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId) {
        const prop = await prisma.property.findFirst({
          where: { id: propertyId, tenantId: req.user.tenantId },
        });
        if (!prop) return sendError(res, 'Unauthorized property access.', 403);
      }

      const whereClause: any = { propertyId };
      if (status && status !== 'ALL') {
        whereClause.status = status;
      }

      const leads = await withDbRetry(() =>
        prisma.lead.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      );

      return sendSuccess(res, leads);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch leads', 500);
    }
  }

  static async createLead(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const {
        propertyId,
        name,
        email,
        phone,
        roomTypePreference,
        source,
        visitDate,
        followUpDate,
        notes,
        referrerName,
        referrerPhone,
        referralCommission,
        whatsappConsent,
        assignedTo,
      } = req.body;
      const targetPropertyId = propertyId || req.user?.propertyId;
      const tenantId = req.user?.tenantId;

      if (!targetPropertyId || !name || !email || !phone) {
        return sendError(res, 'Property, name, email, and phone number are required.', 400);
      }

      const lead = await withDbRetry(() =>
        prisma.lead.create({
          data: {
            tenantId: tenantId || 'tenant-default',
            propertyId: targetPropertyId,
            name,
            email,
            phone,
            roomTypePreference: roomTypePreference || null,
            source: source || 'WALK_IN',
            visitDate: visitDate ? new Date(visitDate) : null,
            followUpDate: followUpDate ? new Date(followUpDate) : null,
            notes: notes || null,
            referrerName: referrerName || null,
            referrerPhone: referrerPhone || null,
            referralCommission: referralCommission ? parseFloat(referralCommission) : 0,
            commissionStatus: referralCommission ? 'PENDING' : 'PENDING',
            whatsappConsent: !!whatsappConsent,
            assignedTo: assignedTo || null,
            status: 'NEW',
          },
        })
      );

      return sendSuccess(res, lead, 'Enquiry logged successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create enquiry', 500);
    }
  }

  static async updateLeadStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status, notes, followUpDate, assignedTo } = req.body;

      if (!id || !status) {
        return sendError(res, 'Lead ID and status are required.', 400);
      }

      const existingLead = await prisma.lead.findUnique({
        where: { id },
        select: { id: true, tenantId: true },
      });
      if (!existingLead) return sendError(res, 'Lead not found.', 404);
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId && existingLead.tenantId !== req.user.tenantId) {
        return sendError(res, 'Unauthorized lead modification.', 403);
      }

      const updated = await withDbRetry(() =>
        prisma.lead.update({
          where: { id },
          data: {
            status,
            notes: notes || undefined,
            followUpDate: followUpDate ? new Date(followUpDate) : undefined,
            assignedTo: assignedTo || undefined,
          },
        })
      );

      return sendSuccess(res, updated, 'Lead status updated.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update lead', 500);
    }
  }

  static async updateLeadReferral(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { referrerName, referrerPhone, referralCommission, commissionStatus } = req.body;

      if (!id) return sendError(res, 'Lead ID required.', 400);

      const existingLead = await prisma.lead.findUnique({
        where: { id },
        select: { id: true, tenantId: true },
      });
      if (!existingLead) return sendError(res, 'Lead not found.', 404);
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId && existingLead.tenantId !== req.user.tenantId) {
        return sendError(res, 'Unauthorized lead modification.', 403);
      }

      const updated = await withDbRetry(() =>
        prisma.lead.update({
          where: { id },
          data: {
            referrerName: referrerName ?? undefined,
            referrerPhone: referrerPhone ?? undefined,
            referralCommission: referralCommission !== undefined ? parseFloat(referralCommission) : undefined,
            commissionStatus: commissionStatus ?? undefined,
          },
        })
      );

      return sendSuccess(res, updated, 'Referral details updated.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update referral', 500);
    }
  }

  static async updateWhatsAppConsent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { consent, optOut } = req.body;

      if (!id) return sendError(res, 'Lead ID required.', 400);

      const existingLead = await prisma.lead.findUnique({
        where: { id },
        select: { id: true, tenantId: true },
      });
      if (!existingLead) return sendError(res, 'Lead not found.', 404);
      if (req.user?.role !== 'SUPER_ADMIN' && req.user?.tenantId && existingLead.tenantId !== req.user.tenantId) {
        return sendError(res, 'Unauthorized lead modification.', 403);
      }

      const consentData: any = {};
      if (optOut === true) {
        consentData.whatsappOptOut = true;
        consentData.whatsappConsent = false;
      } else if (consent !== undefined) {
        consentData.whatsappConsent = !!consent;
        if (consent === true) consentData.whatsappOptOut = false;
      }

      const updated = await withDbRetry(() =>
        prisma.lead.update({
          where: { id },
          data: consentData,
        })
      );

      return sendSuccess(res, updated, 'WhatsApp preferences updated with explicit consent record.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update WhatsApp consent', 500);
    }
  }

  // -------------------------------------------------------------
  // 2. BOOKINGS & ADMISSION WORKFLOW
  // -------------------------------------------------------------
  static async getBookings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      const { status } = req.query;

      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const whereClause: any = { propertyId };
      if (status && status !== 'ALL') {
        whereClause.status = status;
      }

      const bookings = await withDbRetry(() =>
        prisma.booking.findMany({
          where: whereClause,
          include: {
            lead: { select: { source: true, notes: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      );

      return sendSuccess(res, bookings);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch bookings', 500);
    }
  }

  static async createBooking(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, leadId, name, email, phone, roomId, bedId, depositAmount, checkInDate, notes } = req.body;
      const targetPropertyId = propertyId || req.user?.propertyId;
      const tenantId = req.user?.tenantId;

      if (!targetPropertyId || !name || !email || !phone || !checkInDate) {
        return sendError(res, 'Property, name, email, phone, and check-in date are required.', 400);
      }

      // Check bed availability if bedId provided
      if (bedId) {
        const bed = await prisma.bed.findUnique({ where: { id: bedId } });
        if (!bed || bed.status === 'OCCUPIED') {
          return sendError(res, 'Selected bed is no longer available.', 400);
        }
      }

      const booking = await withDbRetry(() =>
        prisma.booking.create({
          data: {
            tenantId: tenantId || 'tenant-default',
            propertyId: targetPropertyId,
            leadId: leadId || null,
            name,
            email,
            phone,
            roomId: roomId || null,
            bedId: bedId || null,
            depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
            isDepositPaid: depositAmount && parseFloat(depositAmount) > 0 ? true : false,
            checkInDate: new Date(checkInDate),
            status: 'CONFIRMED',
            notes: notes || null,
          },
        })
      );

      // If lead exists, update status to CONVERTED
      if (leadId) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: 'CONVERTED' },
        }).catch(() => {});
      }

      // If bed reserved, mark bed RESERVED
      if (bedId) {
        await prisma.bed.update({
          where: { id: bedId },
          data: { status: 'RESERVED' },
        }).catch(() => {});
      }

      return sendSuccess(res, booking, 'Booking confirmed successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create booking', 500);
    }
  }

  // -------------------------------------------------------------
  // 3. PUBLIC PROPERTY PROFILE (FOR BOOKING WEBSITE)
  // -------------------------------------------------------------
  static async getPublicPropertyProfile(req: Request, res: Response): Promise<Response> {
    try {
      const { identifier } = req.params;

      const property = await withDbRetry(() =>
        prisma.property.findFirst({
          where: {
            OR: [{ id: identifier }, { tenant: { slug: identifier } }],
          },
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
            email: true,
            rooms: {
              select: {
                id: true,
                number: true,
                type: true,
                capacity: true,
                baseRent: true,
                deposit: true,
                amenities: true,
                status: true,
                beds: {
                  select: {
                    id: true,
                    bedNumber: true,
                    status: true,
                    monthlyRent: true,
                  },
                },
              },
            },
          },
        })
      );

      if (!property) {
        return sendError(res, 'Property not found.', 404);
      }

      // Calculate public room vacancy
      const availableRooms = property.rooms.map((r) => ({
        id: r.id,
        number: r.number,
        type: r.type,
        capacity: r.capacity,
        rent: r.baseRent,
        deposit: r.deposit,
        amenities: r.amenities ? r.amenities.split(',').map((s) => s.trim()) : [],
        availableBedsCount: r.beds.filter((b) => b.status === 'AVAILABLE').length,
      }));

      return sendSuccess(res, {
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city,
        phone: property.phone,
        email: property.email,
        rooms: availableRooms,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch public property', 500);
    }
  }

  static async submitPublicEnquiry(req: Request, res: Response): Promise<Response> {
    try {
      const { propertyId, name, email, phone, roomType, visitDate, notes } = req.body;

      if (!propertyId || !name || !email || !phone) {
        return sendError(res, 'Property ID, name, email, and phone are required.', 400);
      }

      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { tenantId: true },
      });

      if (!property) {
        return sendError(res, 'Property not found.', 404);
      }

      const lead: any = await withDbRetry(() =>
        prisma.lead.create({
          data: {
            tenantId: property.tenantId || 'tenant-default',
            propertyId,
            name,
            email,
            phone,
            roomTypePreference: roomType || null,
            source: 'WEBSITE',
            visitDate: visitDate ? new Date(visitDate) : null,
            notes: notes || 'Enquiry from public website',
            status: 'NEW',
          },
        })
      );

      return sendSuccess(res, { id: lead.id }, 'Thank you! Your enquiry has been received.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to submit enquiry', 500);
    }
  }
}
