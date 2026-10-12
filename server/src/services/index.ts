import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { config } from '../config/env';

// ==========================================
// 1. RAZORPAY SERVICE
// ==========================================
export const createRazorpayOrder = async (
  amount: number,
  receiptId: string,
  customKeyId?: string,
  customKeySecret?: string
) => {
  const keyId = customKeyId || config.razorpay.keyId;
  const keySecret = customKeySecret || config.razorpay.keySecret;

  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const isProd = config.nodeEnv === 'production';

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
      const errorText = await response.text();
      console.error('[Razorpay] Gateway order creation failed:', errorText);
      if (isProd) {
        throw new Error(`Razorpay gateway order creation rejected: ${errorText}`);
      }
    } catch (err: any) {
      console.error('[Razorpay] Connection error:', err.message);
      if (isProd) {
        throw new Error(`Razorpay connection failure: ${err.message}`);
      }
    }
  } else if (isProd) {
    throw new Error('Production Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing.');
  }

  // Development sandbox fallback order
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
  signature: string,
  customKeySecret?: string
): boolean => {
  const keySecret = customKeySecret || config.razorpay.keySecret;

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  if (!keySecret) {
    if (config.nodeEnv === 'production') {
      throw new Error('Server-side RAZORPAY_KEY_SECRET is not configured in production.');
    }
    // Fail-safe: even in dev without secret, do not blindly return true unless explicitly testing
    return false;
  }

  try {
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const genBuf = Buffer.from(generatedSignature, 'utf8');

    if (sigBuf.length !== genBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, genBuf);
  } catch (err) {
    console.error('[Razorpay] Cryptographic signature verification error:', err);
    return false;
  }
};

export const fetchRazorpayPayment = async (
  paymentId: string,
  customKeyId?: string,
  customKeySecret?: string
): Promise<any | null> => {
  const keyId = customKeyId || config.razorpay.keyId;
  const keySecret = customKeySecret || config.razorpay.keySecret;
  if (!keyId || !keySecret || !paymentId) return null;

  try {
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    if (response.ok) {
      return await response.json();
    }
    console.warn(`[Razorpay] Payment fetch returned status ${response.status} for ${paymentId}`);
    return null;
  } catch (err) {
    console.error('[Razorpay] Error fetching payment status from gateway:', err);
    return null;
  }
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
