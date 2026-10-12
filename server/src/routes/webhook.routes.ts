import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';

const router = Router();

/**
 * POST /api/webhooks/razorpay
 * Production Razorpay Webhook Handler
 */
router.post('/razorpay', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = config.razorpay.webhookSecret;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      if (!signature) {
        return sendError(res, 'Missing x-razorpay-signature header', 400);
      }

      const bodyPayload = (req as any).rawBody
        ? (req as any).rawBody
        : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyPayload)
        .digest('hex');

      const sigBuf = Buffer.from(signature, 'utf8');
      const genBuf = Buffer.from(expectedSignature, 'utf8');

      if (sigBuf.length !== genBuf.length || !crypto.timingSafeEqual(sigBuf, genBuf)) {
        console.error('[Razorpay Webhook] Signature verification failed');
        return sendError(res, 'Invalid webhook signature', 400);
      }
    } else if (config.nodeEnv === 'production') {
      return sendError(res, 'Webhook secret not configured on server', 500);
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    console.log(`[Razorpay Webhook] Received verified event: ${event}`);

    // Handle payment capture / order paid events
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const amountPaise = paymentEntity?.amount;
      const notes = paymentEntity?.notes || {};
      const targetPaymentId = notes.paymentId || notes.invoiceId;

      const targetPayment = await prisma.payment.findFirst({
        where: {
          OR: [
            ...(targetPaymentId ? [{ id: targetPaymentId }] : []),
            ...(orderId ? [{ orderId }] : []),
          ],
        },
      });

      if (targetPayment) {
        // Validate amount if present
        if (amountPaise && Math.round(targetPayment.amount * 100) !== amountPaise) {
          console.warn(`[Razorpay Webhook] Amount mismatch: DB ${targetPayment.amount} vs Webhook ${amountPaise / 100}`);
        } else if (targetPayment.status !== 'PAID') {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: targetPayment.id },
              data: {
                status: 'PAID',
                paidDate: new Date(),
                transactionId: paymentId || orderId,
                orderId: orderId || targetPayment.orderId,
                method: 'RAZORPAY',
                notes: `Paid online via Razorpay Gateway (WebHook Event: ${event})`,
              },
            });

            const receiptNo = `UN-REC-${Date.now().toString().slice(-6)}`;
            await tx.paymentReceipt.upsert({
              where: { paymentId: targetPayment.id },
              create: {
                paymentId: targetPayment.id,
                receiptNumber: receiptNo,
              },
              update: {},
            });
          });

          await AuditService.log({
            propertyId: targetPayment.propertyId,
            action: 'PAYMENT_VERIFIED_WEBHOOK',
            actorRole: 'SYSTEM',
            actorName: 'Razorpay Gateway',
            entity: 'Payment',
            entityId: targetPayment.id,
            details: `Webhook payment captured: ${paymentId || orderId} for rent period ${targetPayment.period}`,
          });
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      const notes = paymentEntity?.notes || {};
      const targetPaymentId = notes.paymentId;

      if (targetPaymentId) {
        try {
          await prisma.payment.updateMany({
            where: { id: targetPaymentId },
            data: {
              status: 'FAILED',
              notes: `Payment attempt failed via Razorpay: ${paymentEntity?.error_description || 'Transaction declined'}`
            }
          });
        } catch {}
      }
    }

    return res.status(200).json({ status: 'ok', received: true, event });
  } catch (error: any) {
    console.error('[Razorpay Webhook Error]:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
