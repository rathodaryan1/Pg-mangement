import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// 1. MAINTENANCE ISSUES
// ==========================================
export const getAllIssues = async (req: any, res: Response) => {
  const { propertyId } = req.query;

  try {
    const filters: any = {};
    if (propertyId) {
      filters.member = { propertyId };
    } else if (req.user && req.user.role !== 'OWNER' && req.user.role !== 'SUPER_ADMIN') {
      filters.member = { propertyId: req.user.propertyId };
    }

    const issues = await prisma.issue.findMany({
      where: filters,
      include: {
        member: { select: { id: true, fullName: true, mobile: true, roomId: true, room: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(issues);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch issues.' });
  }
};

export const createIssue = async (req: Request, res: Response) => {
  const { title, description, category, priority, memberId } = req.body;

  if (!title || !description || !category || !memberId) {
    return res.status(400).json({ error: 'Required fields missing: title, description, category, memberId' });
  }

  try {
    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        category,
        priority: priority || 'MEDIUM',
        memberId,
        status: 'OPEN',
      },
      include: { member: true },
    });
    return res.status(201).json(issue);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to report maintenance issue.' });
  }
};

export const assignIssue = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { assignedTo, priority } = req.body;

  try {
    const issue = await prisma.issue.update({
      where: { id },
      data: {
        assignedTo: assignedTo || null,
        priority: priority || undefined,
        status: 'IN_PROGRESS',
      },
    });
    return res.json(issue);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to assign issue.' });
  }
};

export const resolveIssue = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const issue = await prisma.issue.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
    return res.json(issue);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to resolve issue.' });
  }
};

// ==========================================
// 2. EXPENSE MANAGEMENT
// ==========================================
export const getAllExpenses = async (req: any, res: Response) => {
  const { propertyId } = req.query;

  try {
    const filters: any = {};
    if (propertyId) {
      filters.propertyId = propertyId;
    } else if (req.user && req.user.role !== 'OWNER' && req.user.role !== 'SUPER_ADMIN') {
      filters.propertyId = req.user.propertyId;
    }

    const expenses = await prisma.expense.findMany({
      where: filters,
      include: { property: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
    return res.json(expenses);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  const { title, amount, category, date, notes, propertyId } = req.body;

  if (!title || !amount || !category || !propertyId) {
    return res.status(400).json({ error: 'Required fields: title, amount, category, propertyId.' });
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        title,
        amount: parseFloat(amount),
        category,
        date: date ? new Date(date) : new Date(),
        notes: notes || '',
        propertyId,
      },
    });
    return res.status(201).json(expense);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add expense.' });
  }
};

// ==========================================
// 3. NOTICE BOARD
// ==========================================
export const getAllNotices = async (req: any, res: Response) => {
  const { propertyId } = req.query;

  try {
    const filters: any = {};
    if (propertyId) {
      filters.propertyId = propertyId;
    } else if (req.user && req.user.role !== 'OWNER' && req.user.role !== 'SUPER_ADMIN') {
      filters.propertyId = req.user.propertyId;
    }

    const notices = await prisma.notice.findMany({
      where: filters,
      include: { property: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(notices);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch notices.' });
  }
};

export const createNotice = async (req: Request, res: Response) => {
  const { title, content, category, isImportant, propertyId } = req.body;

  if (!title || !content || !category || !propertyId) {
    return res.status(400).json({ error: 'Required fields: title, content, category, propertyId.' });
  }

  try {
    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        category,
        isImportant: isImportant === true || isImportant === 'true',
        propertyId,
      },
    });
    return res.status(201).json(notice);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create announcement.' });
  }
};

// ==========================================
// 4. VISITOR MANAGEMENT
// ==========================================
export const getAllVisitors = async (req: any, res: Response) => {
  const { propertyId } = req.query;

  try {
    const filters: any = {};
    if (propertyId) {
      filters.propertyId = propertyId;
    } else if (req.user && req.user.role !== 'OWNER' && req.user.role !== 'SUPER_ADMIN') {
      filters.propertyId = req.user.propertyId;
    }

    const visitors = await prisma.visitor.findMany({
      where: filters,
      orderBy: { checkInTime: 'desc' },
    });
    return res.json(visitors);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch visitor registry.' });
  }
};

export const createVisitorEntry = async (req: Request, res: Response) => {
  const { fullName, mobile, purpose, hostMember, propertyId } = req.body;

  if (!fullName || !mobile || !purpose || !propertyId) {
    return res.status(400).json({ error: 'Missing fields: fullName, mobile, purpose, propertyId' });
  }

  try {
    const visitor = await prisma.visitor.create({
      data: {
        fullName,
        mobile,
        purpose,
        hostMember: hostMember || '',
        propertyId,
        checkInTime: new Date(),
      },
    });
    return res.status(201).json(visitor);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to record visitor check-in.' });
  }
};

export const checkOutVisitor = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const visitor = await prisma.visitor.update({
      where: { id },
      data: {
        checkOutTime: new Date(),
      },
    });
    return res.json(visitor);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to checkout visitor.' });
  }
};

// ==========================================
// 5. INVENTORY MANAGEMENT
// ==========================================
export const getAllInventoryItems = async (req: any, res: Response) => {
  const { propertyId } = req.query;

  try {
    const filters: any = {};
    if (propertyId) {
      filters.propertyId = propertyId;
    } else if (req.user && req.user.role !== 'OWNER' && req.user.role !== 'SUPER_ADMIN') {
      filters.propertyId = req.user.propertyId;
    }

    const items = await prisma.inventoryItem.findMany({
      where: filters,
      orderBy: { name: 'asc' },
    });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch inventory registry.' });
  }
};

export const createInventoryItem = async (req: Request, res: Response) => {
  const { name, quantity, category, status, propertyId } = req.body;

  if (!name || !quantity || !category || !propertyId) {
    return res.status(400).json({ error: 'Missing fields: name, quantity, category, propertyId' });
  }

  try {
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        quantity: parseInt(quantity),
        category,
        status: status || 'GOOD',
        propertyId,
      },
    });
    return res.status(201).json(item);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create inventory item.' });
  }
};

export const updateInventoryItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, quantity, category, status } = req.body;

  try {
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name: name ?? undefined,
        quantity: quantity ? parseInt(quantity) : undefined,
        category: category ?? undefined,
        status: status ?? undefined,
      },
    });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update inventory.' });
  }
};

export const deleteInventoryItem = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.inventoryItem.delete({ where: { id } });
    return res.json({ message: 'Inventory item removed successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete inventory item.' });
  }
};

// ==========================================
// 6. SETTINGS
// ==========================================
export const getSettings = async (req: Request, res: Response) => {
  try {
    const list = await prisma.setting.findMany();
    const config: Record<string, string> = {};
    list.forEach(s => {
      config[s.key] = s.value;
    });
    return res.json(config);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  const settingsObj = req.body;

  try {
    const promises = Object.keys(settingsObj).map(key => {
      return prisma.setting.upsert({
        where: { key },
        update: { value: String(settingsObj[key]) },
        create: { key, value: String(settingsObj[key]) },
      });
    });

    await Promise.all(promises);
    return res.json({ message: 'Settings updated successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update settings.' });
  }
};
