import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllProperties = async (req: Request, res: Response) => {
  try {
    const properties = await prisma.property.findMany({
      include: {
        _count: {
          select: { rooms: true, members: true, staff: true }
        }
      }
    });
    return res.json(properties);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch properties.' });
  }
};

export const getPropertyById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        rooms: true,
        members: { where: { status: 'ACTIVE' } },
        staff: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    return res.json(property);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch property details.' });
  }
};

export const createProperty = async (req: Request, res: Response) => {
  const { name, address, phone, email, upiId, gstNumber, razorpayKeyId, razorpayKeySecret } = req.body;

  if (!name || !address) {
    return res.status(400).json({ error: 'Name and Address are required fields.' });
  }

  try {
    const property = await prisma.property.create({
      data: {
        name,
        address,
        phone: phone || '',
        email: email || '',
        upiId: upiId || '',
        gstNumber: gstNumber || '',
        razorpayKeyId: razorpayKeyId || null,
        razorpayKeySecret: razorpayKeySecret || null,
      },
    });

    return res.status(201).json(property);
  } catch (error) {
    console.error('Create property error:', error);
    return res.status(500).json({ error: 'Failed to create property.' });
  }
};

export const updateProperty = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, address, phone, email, upiId, gstNumber, razorpayKeyId, razorpayKeySecret } = req.body;

  try {
    const updated = await prisma.property.update({
      where: { id },
      data: {
        name: name ?? undefined,
        address: address ?? undefined,
        phone: phone ?? undefined,
        email: email ?? undefined,
        upiId: upiId ?? undefined,
        gstNumber: gstNumber ?? undefined,
        razorpayKeyId: razorpayKeyId !== undefined ? razorpayKeyId : undefined,
        razorpayKeySecret: razorpayKeySecret !== undefined ? razorpayKeySecret : undefined,
      },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update property.' });
  }
};

export const deleteProperty = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const roomsCount = await prisma.room.count({ where: { propertyId: id } });
    const membersCount = await prisma.member.count({ where: { propertyId: id, status: 'ACTIVE' } });

    if (membersCount > 0) {
      return res.status(400).json({ error: 'Cannot delete property. There are active residents currently checked into this branch.' });
    }

    await prisma.property.delete({ where: { id } });
    return res.json({ message: 'Property deleted successfully.' });
  } catch (error) {
    console.error('Delete property error:', error);
    return res.status(500).json({ error: 'Failed to delete property.' });
  }
};
