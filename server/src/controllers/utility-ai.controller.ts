import { Response } from 'express';
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

export class UtilityAIController {
  // -------------------------------------------------------------
  // 1. UTILITY READINGS & SUB-METERING
  // -------------------------------------------------------------
  static async getUtilityReadings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      const { type } = req.query;

      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const whereClause: any = { propertyId };
      if (type && type !== 'ALL') {
        whereClause.type = type;
      }

      const readings = await withDbRetry(() =>
        prisma.utilityReading.findMany({
          where: whereClause,
          orderBy: { readingDate: 'desc' },
          take: 50,
        })
      );

      return sendSuccess(res, readings);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch utility readings', 500);
    }
  }

  static async recordUtilityReading(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, type, meterNumber, previousReading, currentReading, unitRate, billingPeriod, notes } = req.body;
      const targetPropertyId = propertyId || req.user?.propertyId;

      if (!targetPropertyId || !meterNumber || currentReading === undefined || !unitRate || !billingPeriod) {
        return sendError(res, 'Property, meter number, current reading, unit rate, and billing period are required.', 400);
      }

      const prev = parseFloat(previousReading) || 0;
      const curr = parseFloat(currentReading);
      const rate = parseFloat(unitRate);
      const consumed = Math.max(0, curr - prev);
      const totalAmount = Math.round(consumed * rate * 100) / 100;

      const reading = await withDbRetry(() =>
        prisma.utilityReading.create({
          data: {
            propertyId: targetPropertyId,
            type: type || 'ELECTRICITY',
            meterNumber,
            previousReading: prev,
            currentReading: curr,
            unitsConsumed: consumed,
            unitRate: rate,
            totalAmount,
            billingPeriod,
            recordedBy: req.user?.name || 'Staff',
            notes: notes || null,
          },
        })
      );

      return sendSuccess(res, reading, 'Utility reading recorded successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to record utility reading', 500);
    }
  }

  // -------------------------------------------------------------
  // 2. AI BUSINESS ASSISTANT (SECURE CONTEXTUAL INTELLIGENCE)
  // -------------------------------------------------------------
  static async askAIAssistant(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { query, propertyId } = req.body;
      const targetPropertyId = propertyId || req.user?.propertyId;
      const tenantId = req.user?.tenantId;

      if (!query || typeof query !== 'string') {
        return sendError(res, 'A valid query string is required.', 400);
      }

      const cleanQuery = query.toLowerCase().trim();

      // Fetch live context strictly scoped to user's property and tenant
      const [beds, payments, complaints, leads, expenses, menus] = await Promise.all([
        withDbRetry(() =>
          prisma.bed.findMany({
            where: targetPropertyId ? { room: { propertyId: targetPropertyId } } : undefined,
            select: { status: true, monthlyRent: true, bedNumber: true, room: { select: { number: true } } },
          })
        ),
        withDbRetry(() =>
          prisma.payment.findMany({
            where: {
              propertyId: targetPropertyId || undefined,
              status: { in: ['PENDING', 'OVERDUE'] },
            },
            select: { amount: true, status: true, resident: { select: { fullName: true } } },
          })
        ),
        withDbRetry(() =>
          prisma.complaint.findMany({
            where: {
              propertyId: targetPropertyId || undefined,
              status: { notIn: ['RESOLVED', 'CLOSED'] },
            },
            select: { ticketNumber: true, title: true, priority: true, status: true },
          })
        ),
        withDbRetry(() =>
          prisma.lead.findMany({
            where: {
              propertyId: targetPropertyId || undefined,
              status: { in: ['NEW', 'CONTACTED', 'VISIT_SCHEDULED'] },
            },
            select: { name: true, phone: true, status: true, followUpDate: true },
          })
        ),
        withDbRetry(() =>
          prisma.expense.findMany({
            where: { propertyId: targetPropertyId || undefined },
            orderBy: { date: 'desc' },
            take: 10,
            select: { title: true, amount: true, category: true, date: true },
          })
        ),
        withDbRetry(() =>
          prisma.menu.findMany({
            where: { propertyId: targetPropertyId || undefined },
            orderBy: { date: 'desc' },
            take: 4,
            include: { participations: true },
          })
        ),
      ]);

      const totalBeds = beds.length;
      const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;
      const vacantBeds = beds.filter((b) => b.status === 'AVAILABLE');
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
      const totalOutstanding = payments.reduce((sum, p) => sum + p.amount, 0);

      let answer = '';
      let insights: string[] = [];

      if (cleanQuery.includes('vacant') || cleanQuery.includes('available') || cleanQuery.includes('room')) {
        answer = `You currently have ${vacantBeds.length} vacant beds out of ${totalBeds} total capacity (${occupancyRate}% occupancy).`;
        if (vacantBeds.length > 0) {
          insights = vacantBeds.slice(0, 5).map((b) => `Room ${b.room.number} (${b.bedNumber}) - ₹${b.monthlyRent}/mo`);
        } else {
          insights = ['All beds are currently occupied or reserved. Consider onboarding additional properties or expanding inventory.'];
        }
      } else if (cleanQuery.includes('rent') || cleanQuery.includes('due') || cleanQuery.includes('outstanding') || cleanQuery.includes('pending payment')) {
        answer = `Total outstanding rent is ₹${totalOutstanding.toLocaleString('en-IN')} across ${payments.length} pending/overdue invoices.`;
        insights = payments.slice(0, 5).map((p) => `${p.resident.fullName}: ₹${p.amount.toLocaleString('en-IN')} (${p.status})`);
      } else if (cleanQuery.includes('complaint') || cleanQuery.includes('maintenance') || cleanQuery.includes('repair') || cleanQuery.includes('issue')) {
        const urgentCount = complaints.filter((c) => c.priority === 'URGENT' || c.priority === 'HIGH').length;
        answer = `There are ${complaints.length} open maintenance tickets, including ${urgentCount} high/urgent priority items.`;
        insights = complaints.slice(0, 5).map((c) => `[${c.priority}] ${c.ticketNumber}: ${c.title} (${c.status})`);
      } else if (cleanQuery.includes('lead') || cleanQuery.includes('enquiry') || cleanQuery.includes('admission')) {
        answer = `You have ${leads.length} active leads requiring follow-up.`;
        insights = leads.slice(0, 5).map((l) => `${l.name} (${l.phone}) - Status: ${l.status}`);
      } else if (cleanQuery.includes('expense') || cleanQuery.includes('cost') || cleanQuery.includes('spending')) {
        const recentTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
        answer = `Recent recorded operational expenses total ₹${recentTotal.toLocaleString('en-IN')} across ${expenses.length} entries.`;
        insights = expenses.slice(0, 5).map((e) => `${e.title}: ₹${e.amount.toLocaleString('en-IN')} [${e.category}]`);
      } else if (cleanQuery.includes('food') || cleanQuery.includes('meal') || cleanQuery.includes('menu') || cleanQuery.includes('kitchen')) {
        answer = `Latest meal schedules show consistent participation.`;
        insights = menus.map((m) => `${m.title} (${m.mealPeriod}): ${m.participations.filter((p) => p.status === 'OPTED_IN').length} opted-in`);
      } else {
        answer = `Urban Nest Executive Briefing: Property has ${occupancyRate}% occupancy (${vacantBeds.length} vacant beds), ₹${totalOutstanding.toLocaleString('en-IN')} outstanding rent, ${complaints.length} open maintenance tickets, and ${leads.length} active enquiries.`;
        insights = [
          `Occupancy: ${occupiedBeds}/${totalBeds} beds (${occupancyRate}%)`,
          `Financials: ₹${totalOutstanding.toLocaleString('en-IN')} pending collection`,
          `Operations: ${complaints.length} open tickets`,
          `Pipeline: ${leads.length} leads in qualification`,
        ];
      }

      // Log the assistant interaction
      prisma.aIAssistantLog.create({
        data: {
          tenantId: tenantId || 'tenant-default',
          propertyId: targetPropertyId || null,
          userId: req.user?.id || 'user-unknown',
          query,
          response: answer,
          toolsInvoked: JSON.stringify(['bed.findMany', 'payment.findMany', 'complaint.findMany']),
        },
      }).catch(() => {});

      return sendSuccess(res, {
        query,
        answer,
        insights,
        timestamp: new Date(),
      });
    } catch (error: any) {
      console.error('[UtilityAIController.askAIAssistant] Error:', error);
      return sendError(res, error.message || 'Failed to process AI query', 500);
    }
  }
}
