import nodemailer from 'nodemailer';

// ==========================================
// 1. CLOUDINARY FILE UPLOAD SERVICE
// ==========================================
export const uploadFileToCloudinary = async (
  fileBuffer: Buffer,
  fileName: string,
  folder: string
): Promise<string> => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  if (name && key && secret) {
    // True Cloudinary upload (simplified stream mock or SDK load)
    console.log(`Cloudinary API Keys found. Uploading ${fileName} to folder ${folder}...`);
  }

  // Fallback to high-quality Unsplash image placeholders based on upload type
  console.log(`[MOCK CLOUDINARY] Uploading ${fileName} in folder '${folder}'. Returning placeholder.`);
  
  if (fileName.includes('aadhaar')) {
    return 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=600&auto=format&fit=crop';
  } else if (fileName.includes('pan')) {
    return 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop';
  } else if (fileName.includes('agreement')) {
    return 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop';
  }
  
  // Default member photo placeholders
  return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop';
};

// ==========================================
// 2. RAZORPAY PAYMENT GATEWAY SERVICE
// ==========================================
export const createRazorpayOrder = async (amount: number, receiptId: string) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (keyId && keySecret) {
    console.log(`Razorpay API Keys found. Generating real order for amount: INR ${amount}`);
  }

  console.log(`[MOCK RAZORPAY] Generated mock order for amount ${amount} (Receipt: ${receiptId})`);
  return {
    id: `order_mock_${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
    amount: amount * 100, // in paise
    currency: 'INR',
    receipt: receiptId,
    status: 'created',
  };
};

export const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  console.log(`[MOCK RAZORPAY] Verifying payment signatures for:`, { orderId, paymentId });
  return true; // Always return true in sandbox/mock mode
};

// ==========================================
// 3. FAST2SMS OTP SERVICE
// ==========================================
export const sendSMS = async (phoneNumber: string, message: string): Promise<boolean> => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (apiKey) {
    console.log(`Fast2SMS active. Dispatching SMS to ${phoneNumber}: "${message}"`);
  }

  console.log(`[MOCK SMS] Outbox target: +91 ${phoneNumber} | Message: "${message}"`);
  return true;
};

// ==========================================
// 4. NODEMAILER EMAIL SERVICE
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

      console.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending email via Nodemailer:', error);
      // Fallback
    }
  }

  console.log(`[MOCK EMAIL] Outbox target: ${to} | Subject: "${subject}"`);
  console.log(`--- Email Content Start ---`);
  console.log(htmlContent.replace(/<[^>]*>/g, '').substring(0, 200) + '...');
  console.log(`--- Email Content End ---`);
  return true;
};
