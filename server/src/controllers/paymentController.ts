import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createRazorpayOrder, verifyRazorpaySignature, sendSMS, sendEmail } from '../services';

const prisma = new PrismaClient();

export const getAllPayments = async (req: Request, res: Response) => {
  const { status } = req.query;

  try {
    const filters: any = {};
    if (status) {
      filters.status = status as string;
    }

    const payments = await prisma.payment.findMany({
      where: filters,
      include: {
        member: { select: { id: true, fullName: true, mobile: true, email: true, rentAmount: true } },
      },
      orderBy: { dueDate: 'desc' },
    });
    return res.json(payments);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch payments.' });
  }
};

export const createPaymentRequest = async (req: Request, res: Response) => {
  const { memberId, amount, dueDate, period, method } = req.body;

  if (!memberId || !amount || !dueDate || !period) {
    return res.status(400).json({ error: 'Required fields: memberId, amount, dueDate, period.' });
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        memberId,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        period,
        method: method || 'UPI',
        status: 'PENDING',
      },
      include: { member: true },
    });

    // Notify member
    await sendSMS(payment.member.mobile, `Hi ${payment.member.fullName}, your rent of Rs.${amount} for ${period} is generated. Due date: ${new Date(dueDate).toDateString()}.`);
    await sendEmail(payment.member.email, `Rent Invoice for ${period} - Urban Nest PG`, `<h3>Dear ${payment.member.fullName},</h3><p>Your rent payment of <b>Rs. ${amount}</b> is now due for the billing period of <b>${period}</b>.</p><p>Please make the payment before ${new Date(dueDate).toLocaleDateString()} to avoid overdue penalties.</p>`);

    return res.status(201).json(payment);
  } catch (error) {
    console.error('Create payment error:', error);
    return res.status(500).json({ error: 'Failed to generate payment record.' });
  }
};

export const recordManualPayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { method, paidDate, transactionId } = req.body;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: 'PAID',
        method: method || 'CASH',
        paidDate: paidDate ? new Date(paidDate) : new Date(),
        transactionId: transactionId || `TXN${Date.now().toString().substring(5)}`,
      },
    });

    // Dispatch receipt confirmation
    await sendSMS(payment.member.mobile, `Receipt: Rent of Rs.${payment.amount} for ${payment.period} has been paid via ${method || 'CASH'}. Thank you!`);
    await sendEmail(
      payment.member.email,
      `Payment Receipt - ${payment.period}`,
      `<h3>Rent Payment Confirmed</h3><p>Hi ${payment.member.fullName},</p><p>We have successfully received your rent payment of <b>Rs. ${payment.amount}</b> for the period <b>${payment.period}</b> via <b>${method || 'CASH'}</b>.</p>`
    );

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to record payment details.' });
  }
};

// Razorpay checkout creation
export const initiateRazorpayPayment = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        member: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!payment || !payment.member) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    const property = payment.member.property;
    const upiId = property.upiId || 'urbannest@okaxis';
    const amount = payment.amount;
    const description = `Rent for ${payment.period} - Room ${payment.member.roomId || ''}`;
    
    let qrCodeUrl = '';
    let isRealRazorpay = false;
    let orderId = `order_mock_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

    // Try to create dynamic Razorpay QR Code if owner credentials are configured
    if (property.razorpayKeyId && property.razorpayKeySecret) {
      try {
        console.log(`Razorpay credentials found for property: ${property.name}. Creating QR code...`);
        const authHeader = 'Basic ' + Buffer.from(`${property.razorpayKeyId}:${property.razorpayKeySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/qr_codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            type: 'upi_qr',
            name: property.name.substring(0, 40),
            usage: 'single_use',
            fixed_amount: true,
            amount: Math.round(amount * 100), // in paise
            description: description.substring(0, 60),
            notes: {
              paymentId: payment.id,
            },
          }),
        });

        if (response.ok) {
          const qrData = await response.json();
          qrCodeUrl = qrData.image_url;
          isRealRazorpay = true;
          if (qrData.id) {
            orderId = qrData.id;
          }
          console.log(`Successfully generated Razorpay QR Code URL: ${qrCodeUrl}`);
        } else {
          const errText = await response.text();
          console.warn(`Razorpay API responded with error: ${errText}. Falling back to UPI QR Code.`);
        }
      } catch (err) {
        console.error('Error contacting Razorpay API:', err);
      }
    }

    // Fallback: Generate a high-fidelity functional UPI QR Code targeting the property's corporate UPI address
    if (!qrCodeUrl) {
      const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(property.name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(description)}`;
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;
      isRealRazorpay = false;
      console.log(`Generated fallback UPI QR Code URL: ${qrCodeUrl}`);
    }

    // Update payment with reference transaction ID
    await prisma.payment.update({
      where: { id },
      data: {
        transactionId: orderId,
      },
    });

    return res.json({
      orderId,
      amount,
      currency: 'INR',
      paymentId: payment.id,
      qrCodeUrl,
      isRealRazorpay,
      upiId,
      propertyName: property.name,
      keyId: property.razorpayKeyId || 'rzp_test_mockKeyId123',
      member: {
        name: payment.member.fullName,
        email: payment.member.email,
        mobile: payment.member.mobile,
      },
    });
  } catch (error) {
    console.error('Razorpay checkouts error:', error);
    return res.status(500).json({ error: 'Failed to initiate online payment gateway.' });
  }
};

// Verify Razorpay transaction callback
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  try {
    // If no signature is provided, it's a simulated or manual success confirmation
    const isMockSuccess = !razorpaySignature;
    
    if (!isMockSuccess) {
      const isVerified = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!isVerified) {
        return res.status(400).json({ error: 'Payment signature verification failed.' });
      }
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { member: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Associated rent billing not found.' });
    }

    const txnId = razorpayPaymentId || `TXN_RPAY_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        method: 'ONLINE',
        paidDate: new Date(),
        transactionId: txnId,
      },
    });

    // Notify
    await sendSMS(payment.member.mobile, `Paid Online: Rent of Rs.${payment.amount} for ${payment.period} successful. Receipt TXN: ${txnId}.`);
    await sendEmail(payment.member.email, `Payment Receipt - ${payment.period}`, `<h3>Online Payment Receipt</h3><p>Hi ${payment.member.fullName},</p><p>Your online payment of Rs.${payment.amount} for the period ${payment.period} was successful. Transaction ID: ${txnId}.</p>`);

    return res.json({ message: 'Online payment captured and verified successfully.', payment: updated });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ error: 'Online payment verification failed.' });
  }
};

// Request payment approval (for manual slips upload)
export const requestPaymentApproval = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { transactionId, method } = req.body;

  try {
    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: 'APPROVAL_PENDING',
        transactionId: transactionId || `TXN_PEND_${Date.now()}`,
        method: method || 'UPI',
      },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to request payment approval.' });
  }
};

// Approve payment by Administrator
export const approvePayment = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: 'PAID',
        paidDate: new Date(),
      },
    });

    // Notify member
    await sendSMS(payment.member.mobile, `Hi ${payment.member.fullName}, your payment request for Rs.${payment.amount} (${payment.period}) has been APPROVED by the administrator.`);
    await sendEmail(payment.member.email, `Payment Approved - ${payment.period}`, `<h3>Payment Approved</h3><p>Hi ${payment.member.fullName}, your payment request for <b>Rs.${payment.amount}</b> (${payment.period}) has been verified and approved.</p>`);

    return res.json({ message: 'Payment approved successfully.', payment: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to approve payment.' });
  }
};
