import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllRooms = async (req: any, res: Response) => {
  const { propertyId } = req.query;

  try {
    const filters: any = {};
    if (propertyId) {
      filters.propertyId = propertyId;
    } else if (req.user && req.user.role !== 'OWNER' && req.user.role !== 'SUPER_ADMIN') {
      filters.propertyId = req.user.propertyId;
    }

    const rooms = await prisma.room.findMany({
      where: filters,
      include: {
        members: {
          where: { status: 'ACTIVE' },
          select: { id: true, fullName: true, mobile: true },
        },
        property: { select: { name: true } },
      },
    });

    const formattedRooms = rooms.map(room => {
      const occupiedBeds = room.members.length;
      const availableBeds = Math.max(0, room.capacity - occupiedBeds);
      
      let computedStatus = room.status;
      if (room.status !== 'MAINTENANCE') {
        computedStatus = occupiedBeds >= room.capacity ? 'OCCUPIED' : 'AVAILABLE';
      }

      return {
        ...room,
        status: computedStatus,
        occupiedBeds,
        availableBeds,
      };
    });

    return res.json(formattedRooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
};

export const getRoomById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const occupiedBeds = room.members.length;
    const availableBeds = Math.max(0, room.capacity - occupiedBeds);

    return res.json({
      ...room,
      occupiedBeds,
      availableBeds,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch room detail.' });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  const { number, type, capacity, rent, status, amenities, propertyId } = req.body;

  if (!number || !type || !capacity || !rent || !propertyId) {
    return res.status(400).json({ error: 'Required fields missing: number, type, capacity, rent, propertyId.' });
  }

  try {
    const existing = await prisma.room.findFirst({
      where: { number, propertyId },
    });
    if (existing) {
      return res.status(400).json({ error: 'Room number already exists in this property.' });
    }

    const room = await prisma.room.create({
      data: {
        number,
        type,
        capacity: parseInt(capacity),
        rent: parseFloat(rent),
        status: status || 'AVAILABLE',
        amenities: amenities || '',
        propertyId,
      },
    });

    return res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({ error: 'Failed to create room.' });
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { number, type, capacity, rent, status, amenities } = req.body;

  try {
    const existingRoom = await prisma.room.findUnique({ where: { id } });
    if (!existingRoom) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (number && number !== existingRoom.number) {
      const conflict = await prisma.room.findFirst({
        where: { number, propertyId: existingRoom.propertyId },
      });
      if (conflict) {
        return res.status(400).json({ error: 'Room number already exists in this property.' });
      }
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        number: number ?? undefined,
        type: type ?? undefined,
        capacity: capacity ? parseInt(capacity) : undefined,
        rent: rent ? parseFloat(rent) : undefined,
        status: status ?? undefined,
        amenities: amenities ?? undefined,
      },
    });

    return res.json(room);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update room.' });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        members: { where: { status: 'ACTIVE' } },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.members.length > 0) {
      return res.status(400).json({ error: 'Cannot delete room. Active members are currently checked into this room.' });
    }

    await prisma.member.updateMany({
      where: { roomId: id },
      data: { roomId: null },
    });

    await prisma.room.delete({ where: { id } });
    return res.json({ message: 'Room deleted successfully.' });
  } catch (error) {
    console.error('Delete room error:', error);
    return res.status(500).json({ error: 'Failed to delete room.' });
  }
};
