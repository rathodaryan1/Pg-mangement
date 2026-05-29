import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendSMS, sendEmail } from '../services';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'pg_premium_management_secret_key_2026';

const otpStore = new Map<string, { otp: string; expires: number; email: string; name: string; passwordHash: string; role: string; propertyId?: string }>();

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { property: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        propertyId: user.propertyId,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        propertyId: user.propertyId,
        property: user.property,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const registerRequest = async (req: Request, res: Response) => {
  const { email, password, name, phone, role, propertyId } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    otpStore.set(phone, {
      otp,
      expires,
      email,
      name,
      passwordHash,
      role: role || 'OWNER',
      propertyId: propertyId || undefined,
    });

    await sendSMS(phone, `Your OTP for Urban Nest PG signup registration is ${otp}. Valid for 5 minutes.`);
    await sendEmail(email, 'Verify your Account - Urban Nest PG', `<h3>Welcome ${name}!</h3><p>Your OTP for account registration is <b>${otp}</b>. It is valid for 5 minutes.</p>`);

    return res.json({ message: 'OTP sent to mobile and email successfully.', phone, otp }); // returns otp for easier front-end flow testing
  } catch (error) {
    console.error('Register request error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  const registration = otpStore.get(phone);
  if (!registration) {
    return res.status(400).json({ error: 'OTP request expired or not found. Please register again.' });
  }

  if (Date.now() > registration.expires) {
    otpStore.delete(phone);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (registration.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  }

  try {
    const newUser = await prisma.user.create({
      data: {
        email: registration.email,
        passwordHash: registration.passwordHash,
        name: registration.name,
        role: registration.role,
        propertyId: registration.propertyId || null,
      },
    });

    otpStore.delete(phone);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, propertyId: newUser.propertyId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Account verified successfully!',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        propertyId: newUser.propertyId,
      },
    });
  } catch (error) {
    console.error('OTP Verification error:', error);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'No user registered with this email.' });
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[MOCK RESET OTP] Email: ${email} | OTP: ${resetOtp}`);
    await sendEmail(email, 'Password Reset OTP - Urban Nest PG', `<h3>Reset Password</h3><p>Your password reset OTP code is <b>${resetOtp}</b>.</p>`);

    return res.json({ message: 'Password reset OTP dispatched to registered email.', email, resetOtp });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  if (!otp || !email || !newPassword) {
    return res.status(400).json({ error: 'Missing fields.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    return res.json({ message: 'Password reset completed successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Database update failed.' });
  }
};

export const getCurrentUser = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, propertyId: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Staff management APIs (List and Invite)
export const getStaffList = async (req: any, res: Response) => {
  const { propertyId } = req.query;

  try {
    const filters: any = {
      role: { in: ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE'] }
    };
    
    // Scoped property check
    if (propertyId) {
      filters.propertyId = propertyId;
    } else if (req.user.role !== 'OWNER' && req.user.role !== 'SUPER_ADMIN') {
      filters.propertyId = req.user.propertyId;
    }

    const staff = await prisma.user.findMany({
      where: filters,
      select: { id: true, name: true, email: true, role: true, propertyId: true, property: { select: { name: true } }, createdAt: true },
    });
    return res.json(staff);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch staff list.' });
  }
};

export const deleteStaff = async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const staff = await prisma.user.findUnique({ where: { id } });
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    if (staff.role === 'OWNER' || staff.role === 'SUPER_ADMIN') {
      return res.status(400).json({ error: 'Cannot delete administrator profiles.' });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ message: 'Staff member profile removed successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete staff member.' });
  }
};
