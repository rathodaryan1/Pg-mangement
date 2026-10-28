import { Router } from 'express';
import { LeadBookingController } from '../controllers/lead-booking.controller';
import { UtilityAIController } from '../controllers/utility-ai.controller';
import { authenticateToken, requireOwnerOrStaff } from '../middleware/auth';

const router = Router();

// Public Property Profiles & Public Booking Enquiry (No Auth required)
router.get('/public/property/:identifier', LeadBookingController.getPublicPropertyProfile as any);
router.post('/public/booking-enquiry', LeadBookingController.submitPublicEnquiry as any);

// Protected Owner & Staff Routes
router.use(authenticateToken as any, requireOwnerOrStaff as any);

// Leads & Enquiries
router.get('/leads', LeadBookingController.getLeads as any);
router.post('/leads', LeadBookingController.createLead as any);
router.patch('/leads/:id', LeadBookingController.updateLeadStatus as any);
router.patch('/leads/:id/referral', LeadBookingController.updateLeadReferral as any);
router.patch('/leads/:id/whatsapp', LeadBookingController.updateWhatsAppConsent as any);

// Bookings & Admissions
router.get('/bookings', LeadBookingController.getBookings as any);
router.post('/bookings', LeadBookingController.createBooking as any);

// Utilities & Sub-metering
router.get('/utilities', UtilityAIController.getUtilityReadings as any);
router.post('/utilities', UtilityAIController.recordUtilityReading as any);

// AI Business Assistant
router.post('/ai/ask', UtilityAIController.askAIAssistant as any);

export default router;
