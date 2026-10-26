import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError, sendCreated } from '../utils/response';

// In-memory rate limiting map for spam prevention: IP -> timestamp array
const submissionWindowMs = 10 * 60 * 1000; // 10 minutes
const maxSubmissionsPerWindow = 5;
const ipSubmissions = new Map<string, number[]>();

export class PublicController {
  /**
   * POST /api/public/enquiry
   * Public Contact & PG Onboarding Enquiry
   */
  static async submitEnquiry(req: Request, res: Response): Promise<Response | void> {
    try {
      const { name, email, phone, propertyCount, propertyType, message, honeypot } = req.body;

      // 1. Honeypot check for automated bots
      if (honeypot) {
        return sendError(res, 'Spam detection triggered', 400);
      }

      // 2. IP Rate Limiting
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown-ip';
      const now = Date.now();
      const clientHistory = (ipSubmissions.get(clientIp) || []).filter(
        (timestamp) => now - timestamp < submissionWindowMs
      );

      if (clientHistory.length >= maxSubmissionsPerWindow) {
        return sendError(
          res,
          'Too many submissions from this connection. Please wait a few minutes before trying again.',
          429
        );
      }

      clientHistory.push(now);
      ipSubmissions.set(clientIp, clientHistory);

      // 3. Field Validations
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return sendError(res, 'Full Name is required (minimum 2 characters)', 400);
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
        return sendError(res, 'A valid email address is required', 400);
      }

      const cleanPhone = (phone || '').toString().replace(/[\s\-\(\)\+]/g, '');
      if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
        return sendError(res, 'A valid phone number is required (10-15 digits)', 400);
      }

      if (!message || typeof message !== 'string' || message.trim().length < 5) {
        return sendError(res, 'Please provide a message or inquiry details (at least 5 characters)', 400);
      }

      if (message.length > 3000) {
        return sendError(res, 'Message exceeds maximum length of 3000 characters', 400);
      }

      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      const capacity = propertyCount || '1-50';
      const type = propertyType || 'PG / Co-Living';
      const cleanMessage = message.trim();

      // 4. Determine priority based on PG capacity
      const priority = capacity === '300+' ? 'HIGH' : capacity === '151-300' ? 'MEDIUM' : 'LOW';

      // 5. Persist enquiry into PostgreSQL via SupportTicket
      const ticket = await prisma.supportTicket.create({
        data: {
          creatorName: cleanName,
          creatorEmail: cleanEmail,
          subject: `[Public Enquiry] ${capacity} Beds (${type}) - ${cleanName}`,
          description: `Contact Phone: ${cleanPhone}\nEstimated Bed Capacity: ${capacity}\nProperty Type: ${type}\n\nClient Message:\n${cleanMessage}`,
          priority: priority as any,
          status: 'OPEN',
          internalNotes: `Public Contact Form submission received at ${new Date().toISOString()} from IP: ${clientIp}`,
        },
      });

      // 6. Record Audit Trail
      try {
        await prisma.auditLog.create({
          data: {
            actorName: cleanName,
            actorRole: 'ANONYMOUS',
            action: 'ENQUIRY_SUBMITTED',
            entity: 'SupportTicket',
            entityId: ticket.id,
            ipAddress: clientIp,
            details: `Public lead submitted by ${cleanName} (${cleanEmail}, ${cleanPhone}) for ${capacity} beds`,
          },
        });
      } catch (auditErr) {
        console.warn('[PublicController] Audit log failed (non-critical):', auditErr);
      }

      // 7. Check if external email provider is configured
      const hasEmailProvider = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
      const emailNotificationStatus = hasEmailProvider
        ? 'QUEUED_FOR_DISPATCH'
        : 'SKIPPED_NO_SMTP_CONFIGURED';

      return sendCreated(
        res,
        {
          submissionId: ticket.id,
          name: cleanName,
          email: cleanEmail,
          status: 'RECEIVED',
          emailNotificationStatus,
          createdAt: ticket.createdAt,
        },
        'Your enquiry has been successfully received. Our onboarding specialist will contact you shortly.'
      );
    } catch (error: any) {
      console.error('[PublicController.submitEnquiry] Error:', error);
      return sendError(res, error.message || 'Failed to submit enquiry', 500);
    }
  }
}
