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

      if (signature !== expectedSignature) {
        console.error('[Razorpay Webhook] Signature verification failed');
        return sendError(res, 'Invalid webhook signature', 400);
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`[Razorpay Webhook] Received event: ${event}`);

    // Handle payment capture / order paid events
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const notes = paymentEntity?.notes || {};
      const targetPaymentId = notes.paymentId || notes.invoiceId;

      if (targetPaymentId) {
        try {
          // Idempotent update in Prisma if available
          await prisma.payment.updateMany({
            where: {
              OR: [
                { id: targetPaymentId },
                { transactionId: orderId }
              ]
            },
            data: {
              status: 'PAID',
              transactionId: paymentId || orderId,
              method: 'RAZORPAY',
              notes: `Paid online via Razorpay Gateway (WebHook Event: ${event})`
            }
          });
        } catch (dbErr) {
          console.warn('[Razorpay Webhook] DB update note:', dbErr);
        }

        await AuditService.log({
          action: 'PAYMENT_VERIFIED_WEBHOOK',
          actorRole: 'SYSTEM',
          actorName: 'Razorpay Gateway',
          entity: 'Payment',
          entityId: targetPaymentId,
          details: `Webhook payment captured for ID ${paymentId || orderId}`
        });
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
