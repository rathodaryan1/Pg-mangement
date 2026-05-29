import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { uploadFileToCloudinary, sendSMS, sendEmail } from '../services';

const prisma = new PrismaClient();

export const getAllMembers = async (req: any, res: Response) => {
  const { status, search, propertyId } = req.query;

  try {
    const filters: any = {};
    
    if (propertyId) {
      filters.propertyId = propertyId;
    } else if (req.user && req.user.role !== 'OWNER' && req.user.role !== 'SUPER_ADMIN') {
      filters.propertyId = req.user.propertyId;
    }

    if (status) {
      filters.status = status as string;
    }
    
    if (search) {
      filters.OR = [
        { fullName: { contains: search as string } },
        { email: { contains: search as string } },
        { mobile: { contains: search as string } },
      ];
    }

    const members = await prisma.member.findMany({
      where: filters,
      include: {
        room: true,
        property: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return res.status(500).json({ error: 'Failed to fetch members.' });
  }
};

export const getMemberById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        room: true,
        property: true,
        payments: { orderBy: { dueDate: 'desc' } },
        bookings: { orderBy: { checkInDate: 'desc' } },
        issues: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    return res.json(member);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch member details.' });
  }
};

export const createMember = async (req: Request, res: Response) => {
  const {
    fullName,
    mobile,
    email,
    address,
    emergencyContact,
    roomId,
    joiningDate,
    workLocation,
    rentAmount,
    depositAmount,
    status,
    propertyId,
  } = req.body;

  if (!fullName || !mobile || !email || !rentAmount || !depositAmount || !propertyId) {
    return res.status(400).json({ error: 'Required fields missing: name, mobile, email, rent, deposit, propertyId.' });
  }

  try {
    const conflictEmail = await prisma.member.findUnique({ where: { email } });
    if (conflictEmail) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const conflictMobile = await prisma.member.findUnique({ where: { mobile } });
    if (conflictMobile) {
      return res.status(400).json({ error: 'Mobile number already registered.' });
    }

    let targetRoomId = roomId || null;
    if (targetRoomId && (status === 'ACTIVE' || !status)) {
      const room = await prisma.room.findUnique({
        where: { id: targetRoomId },
        include: { members: { where: { status: 'ACTIVE' } } },
      });

      if (!room) {
        return res.status(404).json({ error: 'Selected room not found.' });
      }

      if (room.members.length >= room.capacity) {
        return res.status(400).json({ error: 'Selected room is fully occupied.' });
      }
    }

    const jDate = joiningDate ? new Date(joiningDate) : new Date();

    const member = await prisma.member.create({
      data: {
        fullName,
        mobile,
        email,
        address: address || '',
        emergencyContact: emergencyContact || '',
        roomId: targetRoomId,
        joiningDate: jDate,
        workLocation: workLocation || '',
        rentAmount: parseFloat(rentAmount),
        depositAmount: parseFloat(depositAmount),
        status: status || 'ACTIVE',
        propertyId,
      },
    });

    if (targetRoomId) {
      await prisma.booking.create({
        data: {
          memberId: member.id,
          roomId: targetRoomId,
          checkInDate: jDate,
          status: 'CONFIRMED',
          notes: 'Auto-created on onboarding',
        },
      });

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentPeriod = `${months[jDate.getMonth()]} ${jDate.getFullYear()}`;
      
      const dueDate = new Date(jDate);
      dueDate.setDate(5);
      if (dueDate < jDate) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      await prisma.payment.create({
        data: {
          memberId: member.id,
          amount: parseFloat(rentAmount),
          dueDate,
          period: currentPeriod,
          method: 'UPI',
          status: 'PENDING',
        },
      });

      // Simulation WhatsApp Onboarding notification
      console.log(`[WHATSAPP ALERT] Sent member onboarding confirmation via WhatsApp to ${mobile}: ` +
                  `"Welcome ${fullName}! You have successfully checked into Room ${roomId}. Rent details: Rs. ${rentAmount}/month."`);
    }

    return res.status(201).json(member);
  } catch (error: any) {
    console.error('Error creating member:', error);
    return res.status(500).json({ error: error.message || 'Failed to create member.' });
  }
};

export const updateMember = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    fullName,
    mobile,
    email,
    address,
    emergencyContact,
    joiningDate,
    workLocation,
    rentAmount,
    depositAmount,
    status,
  } = req.body;

  try {
    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    if (email && email !== existing.email) {
      const conflict = await prisma.member.findUnique({ where: { email } });
      if (conflict) {
        return res.status(400).json({ error: 'Email already exists.' });
      }
    }

    if (mobile && mobile !== existing.mobile) {
      const conflict = await prisma.member.findUnique({ where: { mobile } });
      if (conflict) {
        return res.status(400).json({ error: 'Mobile number already exists.' });
      }
    }

    const member = await prisma.member.update({
      where: { id },
      data: {
        fullName: fullName ?? undefined,
        mobile: mobile ?? undefined,
        email: email ?? undefined,
        address: address ?? undefined,
        emergencyContact: emergencyContact ?? undefined,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        workLocation: workLocation ?? undefined,
        rentAmount: rentAmount ? parseFloat(rentAmount) : undefined,
        depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
        status: status ?? undefined,
      },
    });

    return res.json(member);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update member.' });
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    await prisma.member.delete({ where: { id } });
    return res.json({ message: 'Member and related files removed.' });
  } catch (error) {
    console.error('Delete member error:', error);
    return res.status(500).json({ error: 'Failed to delete member.' });
  }
};

export const uploadDocument = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file attachment received.' });
  }

  if (!['photo', 'aadhaar', 'pan', 'agreement'].includes(type)) {
    return res.status(400).json({ error: 'Invalid document type.' });
  }

  try {
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const fileName = `${type}_${member.id}_${Date.now()}`;
    const fileUrl = await uploadFileToCloudinary(req.file.buffer, fileName, 'pg-members');

    const updateField: any = {};
    if (type === 'photo') updateField.photoUrl = fileUrl;
    if (type === 'aadhaar') updateField.aadhaarUrl = fileUrl;
    if (type === 'pan') updateField.panUrl = fileUrl;
    if (type === 'agreement') updateField.agreementUrl = fileUrl;

    const updatedMember = await prisma.member.update({
      where: { id },
      data: updateField,
    });

    return res.json({
      message: 'Document uploaded successfully',
      fileUrl,
      member: updatedMember,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to upload document' });
  }
};

export const checkInMember = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { roomId, checkInDate } = req.body;

  if (!roomId) {
    return res.status(400).json({ error: 'Selected room is required for check-in.' });
  }

  try {
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: { where: { status: 'ACTIVE' } } },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.members.length >= room.capacity) {
      return res.status(400).json({ error: 'Room is fully occupied.' });
    }

    const cDate = checkInDate ? new Date(checkInDate) : new Date();

    const updatedMember = await prisma.member.update({
      where: { id },
      data: {
        roomId,
        status: 'ACTIVE',
        joiningDate: cDate,
      },
    });

    await prisma.booking.create({
      data: {
        memberId: member.id,
        roomId,
        checkInDate: cDate,
        status: 'CONFIRMED',
        notes: 'Check-in room allocation',
      },
    });

    console.log(`[WHATSAPP ALERT] Sent check-in alert to ${member.mobile}: "Welcome! Checked in successfully."`);

    return res.json({ message: 'Check-in completed.', member: updatedMember });
  } catch (error) {
    return res.status(500).json({ error: 'Check-in failed.' });
  }
};

export const checkOutMember = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const member = await prisma.member.findUnique({
      where: { id },
      include: { bookings: { where: { status: 'CONFIRMED' } } },
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const updatedMember = await prisma.member.update({
      where: { id },
      data: {
        roomId: null,
        status: 'CHECKED_OUT',
      },
    });

    if (member.bookings.length > 0) {
      await prisma.booking.updateMany({
        where: { memberId: id, status: 'CONFIRMED' },
        data: { status: 'COMPLETED' },
      });
    }

    console.log(`[WHATSAPP ALERT] Sent check-out confirmation to ${member.mobile}: "Checkout processed. Thank you for staying with us."`);

    return res.json({ message: 'Check-out completed.', member: updatedMember });
  } catch (error) {
    return res.status(500).json({ error: 'Check-out failed.' });
  }
};
