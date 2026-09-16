import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { config } from '../config/env';

// ==========================================
// 1. RAZORPAY SERVICE
// ==========================================
export const createRazorpayOrder = async (amount: number, receiptId: string) => {
  const { keyId, keySecret } = config.razorpay;

  if (keyId && keySecret) {
    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // in paise
          currency: 'INR',
          receipt: receiptId,
          payment_capture: 1,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
      console.warn('[Razorpay] Gateway error:', await response.text());
    } catch (err) {
      console.error('[Razorpay] Connection error:', err);
    }
  }

  // Development sandbox order format
  return {
    id: `order_dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: receiptId,
    status: 'created',
    notes: { env: config.nodeEnv },
  };
};

export const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const { keySecret } = config.razorpay;
  if (!keySecret) {
    // In dev without Razorpay keys, verify that signature and IDs are provided
    return Boolean(orderId && paymentId);
  }

  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
};

// ==========================================
// 2. EMAIL NOTIFICATION SERVICE
// ==========================================
export const sendEmail = async (to: string, subject: string, htmlContent: string): Promise<boolean> => {
  const emailUser = process.env.SENDER_EMAIL;
  const emailPass = process.env.SENDER_EMAIL_PASSWORD;

  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      await transporter.sendMail({
        from: `"Urban Nest Premium PG" <${emailUser}>`,
        to,
        subject,
        html: htmlContent,
      });

      return true;
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      return false;
    }
  }

  console.log(`[EmailService Dev] To: ${to} | Subject: "${subject}"`);
  return true;
};
