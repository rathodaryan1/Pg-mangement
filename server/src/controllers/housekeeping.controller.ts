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

export class HousekeepingController {
  static async getTasks(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      const { status } = req.query;

      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const whereClause: any = { propertyId };
      if (status && status !== 'ALL') {
        whereClause.status = status;
      }

      const tasks = await withDbRetry(() =>
        prisma.housekeepingTask.findMany({
          where: whereClause,
          orderBy: { scheduledAt: 'desc' },
          take: 50,
        })
      );

      return sendSuccess(res, tasks);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch housekeeping tasks', 500);
    }
  }

  static async createTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, area, targetName, scheduledAt, checklist, notes, assignedTo } = req.body;
      const targetPropertyId = propertyId || req.user?.propertyId;

      if (!targetPropertyId || !targetName || !scheduledAt) {
        return sendError(res, 'Property, target area name, and scheduled date are required.', 400);
      }

      const task = await withDbRetry(() =>
        prisma.housekeepingTask.create({
          data: {
            propertyId: targetPropertyId,
            area: area || 'ROOM',
            targetName,
            scheduledAt: new Date(scheduledAt),
            checklist: checklist ? JSON.stringify(checklist) : null,
            notes: notes || null,
            assignedTo: assignedTo || req.user?.name || 'Housekeeping',
            status: 'PENDING',
          },
        })
      );

      return sendSuccess(res, task, 'Cleaning task scheduled successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create cleaning task', 500);
    }
  }

  static async updateTaskStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!id || !status) {
        return sendError(res, 'Task ID and status are required.', 400);
      }

      const dataToUpdate: any = { status };
      if (notes) dataToUpdate.notes = notes;
      if (status === 'COMPLETED') {
        dataToUpdate.completedAt = new Date();
      }

      const updated = await withDbRetry(() =>
        prisma.housekeepingTask.update({
          where: { id },
          data: dataToUpdate,
        })
      );

      return sendSuccess(res, updated, 'Task status updated.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update task status', 500);
    }
  }

  static async verifyTask(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const verified = await withDbRetry(() =>
        prisma.housekeepingTask.update({
          where: { id },
          data: {
            verifiedBy: req.user?.name || 'Supervisor',
            notes: notes ? `Verified: ${notes}` : undefined,
          },
        })
      );

      return sendSuccess(res, verified, 'Task verified successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to verify task', 500);
    }
  }

  static async getDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = req.user?.propertyId;
      if (!propertyId) return sendError(res, 'Property assignment required.', 400);

      const [pendingTasks, inProgressTasks, completedToday] = await Promise.all([
        withDbRetry(() =>
          prisma.housekeepingTask.count({
            where: { propertyId, status: 'PENDING' },
          })
        ),
        withDbRetry(() =>
          prisma.housekeepingTask.count({
            where: { propertyId, status: 'IN_PROGRESS' },
          })
        ),
        withDbRetry(() =>
          prisma.housekeepingTask.count({
            where: { propertyId, status: 'COMPLETED' },
          })
        ),
      ]);

      const recentTasks = await withDbRetry(() =>
        prisma.housekeepingTask.findMany({
          where: { propertyId },
          orderBy: { scheduledAt: 'desc' },
          take: 10,
        })
      );

      return sendSuccess(res, {
        stats: {
          pending: pendingTasks,
          inProgress: inProgressTasks,
          completed: completedToday,
        },
        recentTasks,
      });
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch housekeeping dashboard', 500);
    }
  }
}
