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

export class KitchenController {
  // -------------------------------------------------------------
  // 1. MENU MANAGEMENT (COOK & MANAGER)
  // -------------------------------------------------------------
  static async getMenus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, date } = req.query;
      const targetPropertyId = (propertyId as string) || req.user?.propertyId;

      if (!targetPropertyId) {
        return sendError(res, 'Property ID is required.', 400);
      }

      const targetDate = date ? new Date(date as string) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const menus = await withDbRetry(() =>
        prisma.menu.findMany({
          where: {
            propertyId: targetPropertyId,
            date: {
              gte: targetDate,
              lt: nextDay,
            },
          },
          include: {
            items: true,
            participations: {
              select: {
                residentId: true,
                status: true,
              },
            },
          },
          orderBy: { mealPeriod: 'asc' },
        })
      );

      // Map with participant counts
      const result = menus.map((m) => {
        const optedInCount = m.participations.filter((p) => p.status === 'OPTED_IN').length;
        const optedOutCount = m.participations.filter((p) => p.status === 'OPTED_OUT').length;
        const residentSelection = req.user?.residentId
          ? m.participations.find((p) => p.residentId === req.user?.residentId)?.status || null
          : null;

        return {
          id: m.id,
          propertyId: m.propertyId,
          date: m.date,
          mealPeriod: m.mealPeriod,
          title: m.title,
          status: m.status,
          servingTime: m.servingTime,
          cutoffTime: m.cutoffTime,
          notes: m.notes,
          items: m.items,
          participationsCount: {
            optedIn: optedInCount,
            optedOut: optedOutCount,
          },
          residentSelection,
          createdAt: m.createdAt,
        };
      });

      return sendSuccess(res, result);
    } catch (error: any) {
      console.error('[KitchenController.getMenus] Error:', error);
      return sendError(res, error.message || 'Failed to fetch menus', 500);
    }
  }

  static async createOrUpdateMenu(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, date, mealPeriod, title, servingTime, cutoffTime, notes, items } = req.body;
      const targetPropertyId = propertyId || req.user?.propertyId;

      if (!targetPropertyId || !date || !mealPeriod || !title) {
        return sendError(res, 'Property, date, meal period, and title are required.', 400);
      }

      const menuDate = new Date(date);
      menuDate.setHours(0, 0, 0, 0);

      const menu = await withDbRetry(() =>
        prisma.menu.upsert({
          where: {
            propertyId_date_mealPeriod: {
              propertyId: targetPropertyId,
              date: menuDate,
              mealPeriod,
            },
          },
          update: {
            title,
            servingTime,
            cutoffTime,
            notes,
            status: 'PUBLISHED',
          },
          create: {
            propertyId: targetPropertyId,
            date: menuDate,
            mealPeriod,
            title,
            servingTime,
            cutoffTime,
            notes,
            status: 'PUBLISHED',
          },
        })
      );

      // Handle items if provided
      if (Array.isArray(items) && items.length > 0) {
        // Clear old items and insert fresh
        await prisma.menuItem.deleteMany({ where: { menuId: menu.id } });
        await prisma.menuItem.createMany({
          data: items.map((it: any) => ({
            menuId: menu.id,
            name: it.name,
            description: it.description || null,
            dietaryType: it.dietaryType || 'VEG',
            allergens: it.allergens || null,
            isAvailable: it.isAvailable !== false,
          })),
        });
      }

      const updatedMenu = await prisma.menu.findUnique({
        where: { id: menu.id },
        include: { items: true },
      });

      return sendSuccess(res, updatedMenu, 'Menu saved and published successfully.');
    } catch (error: any) {
      console.error('[KitchenController.createOrUpdateMenu] Error:', error);
      return sendError(res, error.message || 'Failed to save menu', 500);
    }
  }

  // -------------------------------------------------------------
  // 2. RESIDENT MEAL PARTICIPATION (OPT-IN / OPT-OUT)
  // -------------------------------------------------------------
  static async toggleMealParticipation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { menuId, status, notes } = req.body;
      const residentId = req.user?.residentId;

      if (!residentId) {
        return sendError(res, 'Resident profile not found.', 404);
      }

      if (!menuId || !status) {
        return sendError(res, 'Menu ID and participation status are required.', 400);
      }

      const menu = await prisma.menu.findUnique({
        where: { id: menuId },
      });

      if (!menu) {
        return sendError(res, 'Menu not found.', 404);
      }

      const participation = await withDbRetry(() =>
        prisma.mealParticipation.upsert({
          where: {
            menuId_residentId: {
              menuId,
              residentId,
            },
          },
          update: {
            status,
            notes: notes || null,
          },
          create: {
            menuId,
            residentId,
            propertyId: menu.propertyId,
            status,
            notes: notes || null,
          },
        })
      );

      return sendSuccess(res, participation, `Successfully ${status === 'OPTED_IN' ? 'opted in to' : 'opted out of'} meal.`);
    } catch (error: any) {
      console.error('[KitchenController.toggleMealParticipation] Error:', error);
      return sendError(res, error.message || 'Failed to record meal selection', 500);
    }
  }

  // -------------------------------------------------------------
  // 3. COOK DASHBOARD METRICS
  // -------------------------------------------------------------
  static async getCookDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = req.user?.propertyId;
      if (!propertyId) {
        return sendError(res, 'No property assigned to current cook.', 400);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 1);

      const [todayMenus, totalResidents, lowStockIngredients, pendingPurchaseRequests] = await Promise.all([
        withDbRetry(() =>
          prisma.menu.findMany({
            where: {
              propertyId,
              date: { gte: today, lt: nextDay },
            },
            include: {
              items: true,
              participations: true,
            },
            orderBy: { mealPeriod: 'asc' },
          })
        ),
        withDbRetry(() =>
          prisma.resident.count({
            where: { propertyId, status: 'ACTIVE' },
          })
        ),
        withDbRetry(() =>
          prisma.kitchenIngredient.findMany({
            where: {
              propertyId,
              currentStock: { lte: prisma.kitchenIngredient.fields.minStock },
            },
            take: 5,
          })
        ),
        withDbRetry(() =>
          prisma.purchaseRequest.findMany({
            where: { propertyId, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        ),
      ]);

      const mealSummaries = todayMenus.map((m) => {
        const optedIn = m.participations.filter((p) => p.status === 'OPTED_IN').length;
        const optedOut = m.participations.filter((p) => p.status === 'OPTED_OUT').length;
        // Default to total residents minus opted out if not explicitly opted in
        const expectedCount = optedIn > 0 ? optedIn : Math.max(0, totalResidents - optedOut);

        return {
          id: m.id,
          mealPeriod: m.mealPeriod,
          title: m.title,
          servingTime: m.servingTime,
          cutoffTime: m.cutoffTime,
          expectedCount,
          optedInCount: optedIn,
          optedOutCount: optedOut,
          status: m.status,
          itemsCount: m.items.length,
          items: m.items,
        };
      });

      return sendSuccess(res, {
        totalActiveResidents: totalResidents,
        todayMeals: mealSummaries,
        lowStockAlerts: lowStockIngredients,
        pendingPurchaseRequests,
      });
    } catch (error: any) {
      console.error('[KitchenController.getCookDashboard] Error:', error);
      return sendError(res, error.message || 'Failed to fetch cook dashboard', 500);
    }
  }

  // -------------------------------------------------------------
  // 4. KITCHEN INVENTORY
  // -------------------------------------------------------------
  static async getInventory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const propertyId = (req.query.propertyId as string) || req.user?.propertyId;
      if (!propertyId) return sendError(res, 'Property ID is required.', 400);

      const ingredients = await withDbRetry(() =>
        prisma.kitchenIngredient.findMany({
          where: { propertyId },
          orderBy: { name: 'asc' },
        })
      );

      return sendSuccess(res, ingredients);
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch inventory', 500);
    }
  }

  static async recordStockMovement(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { ingredientId, propertyId, type, quantity, reason } = req.body;
      const targetPropertyId = propertyId || req.user?.propertyId;

      if (!ingredientId || !type || !quantity) {
        return sendError(res, 'Ingredient, type, and quantity are required.', 400);
      }

      const numQty = parseFloat(quantity);
      if (isNaN(numQty) || numQty <= 0) {
        return sendError(res, 'Valid positive quantity is required.', 400);
      }

      const ingredient = await prisma.kitchenIngredient.findUnique({
        where: { id: ingredientId },
      });

      if (!ingredient) {
        return sendError(res, 'Ingredient not found.', 404);
      }

      // Update current stock
      let newStock = ingredient.currentStock;
      if (type === 'STOCK_IN') {
        newStock += numQty;
      } else if (type === 'CONSUMED' || type === 'WASTED') {
        newStock = Math.max(0, newStock - numQty);
      }

      const [movement, updatedIngredient] = await prisma.$transaction([
        prisma.kitchenMovement.create({
          data: {
            ingredientId,
            propertyId: targetPropertyId,
            type,
            quantity: numQty,
            reason: reason || null,
            recordedBy: req.user?.name || 'Cook',
          },
        }),
        prisma.kitchenIngredient.update({
          where: { id: ingredientId },
          data: { currentStock: newStock },
        }),
      ]);

      return sendSuccess(res, { movement, ingredient: updatedIngredient }, 'Stock movement recorded successfully.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to record stock movement', 500);
    }
  }

  static async createPurchaseRequest(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { propertyId, itemTitle, quantity, unit, estimatedCost, notes } = req.body;
      const targetPropertyId = propertyId || req.user?.propertyId;

      if (!targetPropertyId || !itemTitle || !quantity || !unit) {
        return sendError(res, 'Property, item title, quantity, and unit are required.', 400);
      }

      const request = await withDbRetry(() =>
        prisma.purchaseRequest.create({
          data: {
            propertyId: targetPropertyId,
            itemTitle,
            quantity: parseFloat(quantity),
            unit,
            estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
            notes: notes || null,
            requestedBy: req.user?.name || 'Cook',
            status: 'PENDING',
          },
        })
      );

      return sendSuccess(res, request, 'Purchase request submitted for owner approval.');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to create purchase request', 500);
    }
  }
}
