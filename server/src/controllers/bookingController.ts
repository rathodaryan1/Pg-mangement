import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        member: { select: { id: true, fullName: true, mobile: true } },
        room: { select: { id: true, number: true, type: true } },
      },
      orderBy: { checkInDate: 'desc' },
    });
    return res.json(bookings);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  const { memberId, roomId, checkInDate, notes } = req.body;

  if (!memberId || !roomId || !checkInDate) {
    return res.status(400).json({ error: 'Required fields missing: memberId, roomId, checkInDate.' });
  }

  try {
    // Check if room has capacity
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: { where: { status: 'ACTIVE' } } },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.members.length >= room.capacity) {
      return res.status(400).json({ error: 'Selected room is fully occupied.' });
    }

    const booking = await prisma.booking.create({
      data: {
        memberId,
        roomId,
        checkInDate: new Date(checkInDate),
        status: 'PENDING',
        notes: notes || '',
      },
      include: {
        member: true,
        room: true,
      },
    });

    return res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ error: 'Failed to create booking.' });
  }
};

export const confirmBooking = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return res.status(404).json({ error: 'Booking reservation not found.' });
    }

    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: `Booking is already in status: ${booking.status}` });
    }

    // Allocate the room and check-in member
    await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      }),
      prisma.member.update({
        where: { id: booking.memberId },
        data: {
          roomId: booking.roomId,
          status: 'ACTIVE',
          joiningDate: booking.checkInDate,
        },
      }),
    ]);

    return res.json({ message: 'Booking confirmed and member checked in.' });
  } catch (error) {
    console.error('Confirm booking error:', error);
    return res.status(500).json({ error: 'Failed to confirm booking.' });
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return res.json({ message: 'Booking reservation cancelled successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to cancel booking.' });
  }
};
