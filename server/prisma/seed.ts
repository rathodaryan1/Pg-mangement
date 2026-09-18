import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Urban Nest Database Seeding (Phase 0 & Phase 1)...');

  // 1. Clean existing records in referential order
  console.log('🧹 Cleaning existing records...');
  await prisma.operationalTask.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.sOSEvent.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.notice.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.maintenanceActivity.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.visitorRequest.deleteMany({});
  await prisma.paymentReceipt.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.securityDeposit.deleteMany({});
  await prisma.agreement.deleteMany({});
  await prisma.resident.deleteMany({});
  await prisma.bed.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.floor.deleteMany({});
  await prisma.building.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.setting.deleteMany({});

  // 2. Pricing Plans
  await prisma.plan.createMany({
    data: [
      {
        name: 'Starter Tier',
        tier: 'STARTER',
        priceMonthly: 2999,
        priceYearly: 29990,
        maxProperties: 1,
        maxRooms: 30,
        maxResidents: 60,
        features: 'Single Property, Essential QR Pass, Basic Invoicing',
        isActive: true,
      },
      {
        name: 'Professional Tier',
        tier: 'PROFESSIONAL',
        priceMonthly: 7999,
        priceYearly: 79990,
        maxProperties: 5,
        maxRooms: 150,
        maxResidents: 350,
        features: 'Up to 5 Properties, Real-Time Visitor QR, Rent Escalation, Multi-Staff RBAC',
        isActive: true,
      },
      {
        name: 'Enterprise Tier',
        tier: 'ENTERPRISE',
        priceMonthly: 19999,
        priceYearly: 199990,
        maxProperties: 50,
        maxRooms: 2000,
        maxResidents: 5000,
        features: 'Unlimited Properties & Rooms, Dedicated SLA, Custom Subdomain, Audit Logs',
        isActive: true,
      },
    ],
  });

  // 3. Default SaaS Organization / Tenant
  const defaultTenant = await prisma.tenant.create({
    data: {
      name: 'Urban Nest Living Network',
      slug: 'urban-nest-network',
      email: 'admin@urbannestpg.com',
      phone: '+91 98765 43210',
      address: 'Sector 45, Cyber City',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      subscriptionStartedAt: new Date(),
    },
  });

  console.log('✅ Created Tenant Organization:', defaultTenant.name);

  // 4. Default Settings
  await prisma.setting.createMany({
    data: [
      { key: 'sms_notifications_enabled', value: 'true' },
      { key: 'email_notifications_enabled', value: 'true' },
      { key: 'razorpay_mock_mode', value: 'false' },
      { key: 'curfew_time', value: '23:30' },
      { key: 'guest_entry_allowed_until', value: '22:00' },
    ],
  });

  // 5. Create Properties
  const propGurgaon = await prisma.property.create({
    data: {
      tenantId: defaultTenant.id,
      name: 'Urban Nest Premium PG (Gurgaon)',
      address: 'Plot 42, Sector 45, Near Huda City Centre Metro, Gurugram, Haryana - 122003',
      city: 'Gurugram',
      phone: '+91 98765 43210',
      email: 'gurgaon@urbannestpg.com',
      upiId: 'urbannest.gurgaon@okaxis',
      gstNumber: '06AAAAA1111A1Z1',
    },
  });

  const propNoida = await prisma.property.create({
    data: {
      tenantId: defaultTenant.id,
      name: 'Urban Nest Luxury PG (Noida)',
      address: 'Tower C, Sector 62, Electronic City, Noida, UP - 201301',
      city: 'Noida',
      phone: '+91 98765 00000',
      email: 'noida@urbannestpg.com',
      upiId: 'urbannest.noida@okaxis',
      gstNumber: '09BBBBB2222B2Z2',
    },
  });

  console.log('✅ Created Properties:', propGurgaon.name, '|', propNoida.name);

  // 4. Create Buildings & Floors
  const buildingA = await prisma.building.create({
    data: {
      name: 'Block A - Executive Wing',
      propertyId: propGurgaon.id,
    },
  });

  const buildingB = await prisma.building.create({
    data: {
      name: 'Block B - Premier Suites',
      propertyId: propGurgaon.id,
    },
  });

  const floor1 = await prisma.floor.create({
    data: {
      floorNumber: 1,
      buildingId: buildingA.id,
    },
  });

  const floor2 = await prisma.floor.create({
    data: {
      floorNumber: 2,
      buildingId: buildingA.id,
    },
  });

  // 5. Create Rooms
  const room101 = await prisma.room.create({
    data: {
      number: '101',
      type: 'Single AC',
      capacity: 1,
      baseRent: 18000,
      deposit: 18000,
      status: 'AVAILABLE',
      amenities: 'AC, High-Speed Wi-Fi (300 Mbps), Attached Bath, Smart LED TV, Mini Fridge, Work Desk',
      floorId: floor1.id,
      propertyId: propGurgaon.id,
    },
  });

  const room102 = await prisma.room.create({
    data: {
      number: '102',
      type: 'Double Sharing AC',
      capacity: 2,
      baseRent: 12000,
      deposit: 12000,
      status: 'AVAILABLE',
      amenities: 'AC, High-Speed Wi-Fi, Attached Bath, Balcony, Individual Wardrobes, Work Desks',
      floorId: floor1.id,
      propertyId: propGurgaon.id,
    },
  });

  const room103 = await prisma.room.create({
    data: {
      number: '103',
      type: 'Double Sharing AC',
      capacity: 2,
      baseRent: 11000,
      deposit: 11000,
      status: 'AVAILABLE',
      amenities: 'AC, High-Speed Wi-Fi, Attached Bath, Spacious Storage, Geyser',
      floorId: floor1.id,
      propertyId: propGurgaon.id,
    },
  });

  const room201 = await prisma.room.create({
    data: {
      number: '201',
      type: 'Triple Sharing Non-AC',
      capacity: 3,
      baseRent: 8500,
      deposit: 8500,
      status: 'AVAILABLE',
      amenities: 'High-Speed Wi-Fi, Attached Bath, Balcony, Individual Wardrobe, Ceiling Fans',
      floorId: floor2.id,
      propertyId: propGurgaon.id,
    },
  });

  // 6. Create Beds
  const bed101A = await prisma.bed.create({
    data: {
      bedNumber: 'Bed 101-A',
      roomId: room101.id,
      monthlyRent: 18000,
      status: 'OCCUPIED',
    },
  });

  const bed102A = await prisma.bed.create({
    data: {
      bedNumber: 'Bed 102-A',
      roomId: room102.id,
      monthlyRent: 12000,
      status: 'AVAILABLE',
    },
  });

  const bed102B = await prisma.bed.create({
    data: {
      bedNumber: 'Bed 102-B',
      roomId: room102.id,
      monthlyRent: 12000,
      status: 'AVAILABLE',
    },
  });

  const bed103A = await prisma.bed.create({
    data: {
      bedNumber: 'Bed 103-A',
      roomId: room103.id,
      monthlyRent: 11000,
      status: 'OCCUPIED',
    },
  });

  const bed103B = await prisma.bed.create({
    data: {
      bedNumber: 'Bed 103-B',
      roomId: room103.id,
      monthlyRent: 11000,
      status: 'AVAILABLE',
    },
  });

  const bed201A = await prisma.bed.create({
    data: {
      bedNumber: 'Bed 201-A',
      roomId: room201.id,
      monthlyRent: 8500,
      status: 'OCCUPIED',
    },
  });

  console.log('✅ Created Rooms and Beds in Block A');

  // 7. Password Hash ('admin123')
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);
  const superAdminPasswordHash = await bcrypt.hash('superadmin123', salt);

  // 8. Create Owner & Super Admin Users
  const owner = await prisma.user.create({
    data: {
      tenantId: defaultTenant.id,
      email: 'owner@pg.com',
      passwordHash,
      name: 'Aaryan Sharma (Owner)',
      role: 'OWNER',
      mobile: '9876500001',
      propertyId: propGurgaon.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'superadmin@urbannest.io',
      passwordHash: superAdminPasswordHash,
      name: 'Platform Super Admin',
      role: 'SUPER_ADMIN',
      mobile: '+91 99999 00000',
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@pg.com',
      passwordHash,
      name: 'Platform Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  // 9. Create Resident Users & Profiles
  // Resident 1: Aakash Verma (Assigned to Room 101, Bed 101-A)
  const userAakash = await prisma.user.create({
    data: {
      tenantId: defaultTenant.id,
      email: 'aakash.v@gmail.com',
      passwordHash,
      name: 'Aakash Verma',
      role: 'RESIDENT',
      mobile: '9812345678',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      propertyId: propGurgaon.id,
    },
  });

  const resAakash = await prisma.resident.create({
    data: {
      userId: userAakash.id,
      propertyId: propGurgaon.id,
      bedId: bed101A.id,
      fullName: 'Aakash Verma',
      email: 'aakash.v@gmail.com',
      mobile: '9812345678',
      alternateMobile: '9812345679',
      gender: 'MALE',
      emergencyContactName: 'Suresh Verma (Father)',
      emergencyContactRelation: 'Father',
      emergencyContactPhone: '9812345670',
      kycStatus: 'VERIFIED',
      kycDocumentType: 'AADHAAR',
      kycDocumentNumber: '9876-5432-1098',
      joiningDate: new Date('2025-10-15'),
      status: 'ACTIVE',
      permanentAddress: 'House No 43, Sector 12, Karnal, Haryana - 132001',
      workCompany: 'Google India (Signature Towers)',
    },
  });

  // Resident 2: Sneha Rao (Assigned to Room 103, Bed 103-A)
  const userSneha = await prisma.user.create({
    data: {
      email: 'sneha.rao@yahoo.com',
      passwordHash,
      name: 'Sneha Rao',
      role: 'RESIDENT',
      mobile: '9765432109',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      propertyId: propGurgaon.id,
    },
  });

  const resSneha = await prisma.resident.create({
    data: {
      userId: userSneha.id,
      propertyId: propGurgaon.id,
      bedId: bed103A.id,
      fullName: 'Sneha Rao',
      email: 'sneha.rao@yahoo.com',
      mobile: '9765432109',
      gender: 'FEMALE',
      emergencyContactName: 'Vijay Rao (Father)',
      emergencyContactRelation: 'Father',
      emergencyContactPhone: '9765432100',
      kycStatus: 'VERIFIED',
      kycDocumentType: 'PASSPORT',
      kycDocumentNumber: 'Z8921092',
      joiningDate: new Date('2026-01-10'),
      status: 'ACTIVE',
      permanentAddress: 'Road No 4, Jubilee Hills, Hyderabad - 500033',
      workCompany: 'Deloitte Tech Center',
    },
  });

  // Resident 3: Vikram Singh (Assigned to Room 201, Bed 201-A)
  const userVikram = await prisma.user.create({
    data: {
      email: 'vikram.singh@outlook.com',
      passwordHash,
      name: 'Vikram Singh',
      role: 'RESIDENT',
      mobile: '9988776655',
      propertyId: propGurgaon.id,
    },
  });

  const resVikram = await prisma.resident.create({
    data: {
      userId: userVikram.id,
      propertyId: propGurgaon.id,
      bedId: bed201A.id,
      fullName: 'Vikram Singh',
      email: 'vikram.singh@outlook.com',
      mobile: '9988776655',
      gender: 'MALE',
      emergencyContactName: 'Pushpa Singh (Mother)',
      emergencyContactRelation: 'Mother',
      emergencyContactPhone: '9988776650',
      kycStatus: 'PENDING',
      kycDocumentType: 'AADHAAR',
      joiningDate: new Date('2026-03-01'),
      status: 'ACTIVE',
      permanentAddress: 'Shyam Nagar, Jaipur, Rajasthan - 302019',
      workCompany: 'Zomato HQ',
    },
  });

  console.log('✅ Created Demo Residents:', resAakash.fullName, '|', resSneha.fullName, '|', resVikram.fullName);

  // 10. Agreements & Security Deposits
  await prisma.agreement.create({
    data: {
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      agreementNumber: 'AGR-2025-101-01',
      validFrom: new Date('2025-10-15'),
      validTill: new Date('2026-09-14'),
      status: 'ACTIVE',
    },
  });

  await prisma.securityDeposit.create({
    data: {
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      amount: 18000,
      status: 'PAID',
      paidAt: new Date('2025-10-15'),
      notes: 'Initial move-in security deposit paid via NEFT',
    },
  });

  await prisma.agreement.create({
    data: {
      residentId: resSneha.id,
      propertyId: propGurgaon.id,
      agreementNumber: 'AGR-2026-103-02',
      validFrom: new Date('2026-01-10'),
      validTill: new Date('2026-12-09'),
      status: 'ACTIVE',
    },
  });

  await prisma.securityDeposit.create({
    data: {
      residentId: resSneha.id,
      propertyId: propGurgaon.id,
      amount: 11000,
      status: 'PAID',
      paidAt: new Date('2026-01-10'),
      notes: 'Security deposit paid via UPI',
    },
  });

  // 11. Payments & Receipts for Aakash
  const pAug = await prisma.payment.create({
    data: {
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      amount: 18000,
      category: 'RENT',
      period: 'August 2026',
      dueDate: new Date('2026-08-05'),
      paidDate: new Date('2026-08-04'),
      status: 'PAID',
      method: 'UPI',
      transactionId: 'TXNGUR889201',
    },
  });

  await prisma.paymentReceipt.create({
    data: {
      paymentId: pAug.id,
      receiptNumber: 'RCP-2026-104921',
      generatedAt: new Date('2026-08-04'),
    },
  });

  const pSept = await prisma.payment.create({
    data: {
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      amount: 18000,
      category: 'RENT',
      period: 'September 2026',
      dueDate: new Date('2026-09-05'),
      status: 'PENDING',
      method: 'UPI',
    },
  });

  const pElec = await prisma.payment.create({
    data: {
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      amount: 1250,
      category: 'ELECTRICITY',
      period: 'September 2026',
      dueDate: new Date('2026-09-10'),
      status: 'PENDING',
      method: 'UPI',
    },
  });

  console.log('✅ Created Rent Payments & Receipts');

  // 12. Visitor Passes
  const v1 = await prisma.visitorRequest.create({
    data: {
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      visitorName: 'Satish Verma (Uncle)',
      visitorMobile: '9876599999',
      relation: 'Uncle',
      purpose: 'Family Dinner & Catch up',
      visitDate: new Date(Date.now() + 24 * 3600 * 1000), // Tomorrow
      expectedEntryTime: '05:00 PM',
      expectedExitTime: '08:30 PM',
      status: 'APPROVED',
      approvedBy: 'Aaryan Sharma (Owner)',
      qrPassToken: 'VPASS-A8F912C0E572',
    },
  });

  const v2 = await prisma.visitorRequest.create({
    data: {
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      visitorName: 'Rohan Gupta',
      visitorMobile: '9871122334',
      relation: 'Friend',
      purpose: 'Project Discussion',
      visitDate: new Date(Date.now() - 48 * 3600 * 1000), // 2 days ago
      expectedEntryTime: '02:00 PM',
      expectedExitTime: '05:00 PM',
      status: 'CHECKED_OUT',
      checkInTime: new Date(Date.now() - 48 * 3600 * 1000),
      checkOutTime: new Date(Date.now() - 45 * 3600 * 1000),
      qrPassToken: 'VPASS-B7E823D1F683',
    },
  });

  const v3 = await prisma.visitorRequest.create({
    data: {
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      visitorName: 'Amit Sharma',
      visitorMobile: '9811224455',
      relation: 'Colleague',
      purpose: 'Deliver Documents',
      visitDate: new Date(Date.now() + 72 * 3600 * 1000),
      expectedEntryTime: '04:00 PM',
      status: 'PENDING',
      qrPassToken: 'VPASS-C6D734E2A794',
    },
  });

  console.log('✅ Created Visitor Passes & QR Tokens');

  // 13. Complaints & Maintenance Activity Timeline
  const c1 = await prisma.complaint.create({
    data: {
      ticketNumber: 'TKT-2026-1001',
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      roomId: room101.id,
      title: 'Air Conditioner not cooling effectively',
      description: 'The split AC unit in Room 101 makes a buzzing noise and stops cooling after 15 minutes of running.',
      category: 'AIR_CONDITIONING',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedStaff: 'Kamal Electrician (+91 98765 11111)',
    },
  });

  await prisma.maintenanceActivity.createMany({
    data: [
      {
        complaintId: c1.id,
        status: 'REPORTED',
        updatedBy: 'Aakash Verma (Resident)',
        comment: 'Complaint ticket created by resident via portal.',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000),
      },
      {
        complaintId: c1.id,
        status: 'ASSIGNED',
        updatedBy: 'Aaryan Sharma (Management)',
        comment: 'Assigned to senior technician Kamal Electrician.',
        timestamp: new Date(Date.now() - 18 * 3600 * 1000),
      },
      {
        complaintId: c1.id,
        status: 'IN_PROGRESS',
        updatedBy: 'Kamal Electrician (Staff)',
        comment: 'Inspected AC unit. Gas pressure is normal; identified capacitor fault. Replacement scheduled for 10:00 AM.',
        timestamp: new Date(Date.now() - 6 * 3600 * 1000),
      },
    ],
  });

  const c2 = await prisma.complaint.create({
    data: {
      ticketNumber: 'TKT-2026-1002',
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      roomId: room101.id,
      title: 'Bathroom washbasin tap leaking water',
      description: 'Minor drip from tap valve in attached washroom.',
      category: 'PLUMBING',
      priority: 'LOW',
      status: 'RESOLVED',
      resolvedAt: new Date(Date.now() - 72 * 3600 * 1000),
      rating: 5,
      feedback: 'Quick fix, plumber came within 2 hours.',
    },
  });

  await prisma.maintenanceActivity.createMany({
    data: [
      {
        complaintId: c2.id,
        status: 'REPORTED',
        updatedBy: 'Aakash Verma (Resident)',
        comment: 'Ticket raised for bathroom washbasin drip.',
        timestamp: new Date(Date.now() - 96 * 3600 * 1000),
      },
      {
        complaintId: c2.id,
        status: 'RESOLVED',
        updatedBy: 'Ramesh Plumber (Staff)',
        comment: 'Replaced ceramic washer and tightened connection. Verified no leak.',
        timestamp: new Date(Date.now() - 72 * 3600 * 1000),
      },
    ],
  });

  console.log('✅ Created Maintenance Complaints & Activity Timelines');

  // 14. Leave Requests
  await prisma.leaveRequest.create({
    data: {
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      fromDate: new Date('2026-10-28'),
      toDate: new Date('2026-11-04'),
      reason: 'Diwali Festival holidays at hometown Karnal with family.',
      status: 'APPROVED',
      approvedBy: 'Aaryan Sharma (Owner)',
    },
  });

  await prisma.leaveRequest.create({
    data: {
      residentId: resAakash.id,
      propertyId: propGurgaon.id,
      fromDate: new Date('2026-09-26'),
      toDate: new Date('2026-09-28'),
      reason: 'Weekend trip with college friends to Rishikesh.',
      status: 'PENDING',
    },
  });

  console.log('✅ Created Leave Requests');

  // 15. Documents / KYC
  await prisma.document.createMany({
    data: [
      {
        residentId: resAakash.id,
        propertyId: propGurgaon.id,
        title: 'Aadhaar Card Front & Back',
        type: 'AADHAAR',
        fileUrl: '/uploads/documents/aadhaar-aakash.pdf',
        fileSize: 1048576, // 1MB
        mimeType: 'application/pdf',
        status: 'VERIFIED',
      },
      {
        residentId: resAakash.id,
        propertyId: propGurgaon.id,
        title: 'PAN Card Copy',
        type: 'PAN',
        fileUrl: '/uploads/documents/pan-aakash.pdf',
        fileSize: 524288,
        mimeType: 'application/pdf',
        status: 'VERIFIED',
      },
      {
        residentId: resAakash.id,
        propertyId: propGurgaon.id,
        title: 'Signed PG Lease Agreement (11 Months)',
        type: 'AGREEMENT',
        fileUrl: '/uploads/documents/lease-agreement-aakash.pdf',
        fileSize: 2097152,
        mimeType: 'application/pdf',
        status: 'VERIFIED',
      },
      {
        residentId: resAakash.id,
        propertyId: propGurgaon.id,
        title: 'Haryana Police Resident Verification Form',
        type: 'POLICE_VERIFICATION',
        fileUrl: '/uploads/documents/police-verification-aakash.pdf',
        fileSize: 786432,
        mimeType: 'application/pdf',
        status: 'PENDING',
      },
    ],
  });

  console.log('✅ Created KYC & Legal Documents');

  // 16. Notices
  await prisma.notice.createMany({
    data: [
      {
        propertyId: propGurgaon.id,
        title: '⚡ High-Speed Fiber Internet Scheduled Maintenance Window',
        content:
          'Please note that our Airtel Fiber line will undergo planned bandwidth upgrades on Thursday night between 01:00 AM and 04:00 AM. Internet connectivity will experience brief intermittent downtime during this window.',
        category: 'MAINTENANCE',
        isImportant: true,
        publisherName: 'Urban Nest Management',
      },
      {
        propertyId: propGurgaon.id,
        title: '🚪 Common Area Quiet Hours & Guest Visiting Policy Reminder',
        content:
          'Residents are kindly reminded that quiet hours commence at 11:00 PM on weekdays. Outside visitors must exit the premises by 10:00 PM unless an overnight visitor pass has been pre-approved by the warden.',
        category: 'RULES',
        isImportant: false,
        publisherName: 'Warden Office',
      },
      {
        propertyId: propGurgaon.id,
        title: '🎉 Monthly Community Buffet Dinner & Indoor Games Evening',
        content:
          'Join us this Saturday at 8:00 PM in the rooftop terrace cafeteria for our monthly community buffet dinner with live acoustic music and foosball tournament!',
        category: 'EVENT',
        isImportant: false,
        publisherName: 'Community Team',
      },
    ],
  });

  console.log('✅ Created Notices');

  // 17. In-App Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: userAakash.id,
        residentId: resAakash.id,
        title: '📅 Rent Due Reminder: September 2026',
        message: 'Your monthly rent payment of ₹18,000 for September 2026 is due on 5th September.',
        type: 'PAYMENT',
        isRead: false,
        linkUrl: '/resident/payments',
      },
      {
        userId: userAakash.id,
        residentId: resAakash.id,
        title: '✅ Visitor Pass Approved',
        message: 'Visitor pass for Satish Verma (Uncle) on tomorrow has been approved by the warden.',
        type: 'VISITOR',
        isRead: false,
        linkUrl: '/resident/visitors',
      },
      {
        userId: userAakash.id,
        residentId: resAakash.id,
        title: '🔧 Complaint Update (TKT-2026-1001)',
        message: 'AC Repair ticket has been assigned to Kamal Electrician and status updated to IN_PROGRESS.',
        type: 'COMPLAINT',
        isRead: true,
        linkUrl: '/resident/complaints',
      },
      {
        userId: userAakash.id,
        residentId: resAakash.id,
        title: '📄 Document Verified',
        message: 'Your Aadhaar card document has been verified successfully by management.',
        type: 'DOCUMENT',
        isRead: true,
        linkUrl: '/resident/documents',
      },
    ],
  });

  console.log('✅ Created In-App Notifications');

  // 18. Staff Users
  const staffManager = await prisma.user.create({
    data: {
      email: 'manager.gurgaon@pg.com',
      passwordHash,
      name: 'Rohan Mehta (Manager)',
      role: 'MANAGER',
      mobile: '9876543220',
      propertyId: propGurgaon.id,
    },
  });

  const staffTech = await prisma.user.create({
    data: {
      email: 'repair.gurgaon@pg.com',
      passwordHash,
      name: 'Kamal Electrician',
      role: 'MAINTENANCE',
      mobile: '9876511111',
      propertyId: propGurgaon.id,
    },
  });

  const staffReception = await prisma.user.create({
    data: {
      email: 'reception.gurgaon@pg.com',
      passwordHash,
      name: 'Sneha Sharma (Receptionist)',
      role: 'RECEPTIONIST',
      mobile: '9876543222',
      propertyId: propGurgaon.id,
    },
  });

  console.log('✅ Created Staff Accounts');

  // 19. Expenses
  await prisma.expense.createMany({
    data: [
      {
        propertyId: propGurgaon.id,
        title: 'Electricity Bill - Gurgaon Block A (August 2026)',
        category: 'ELECTRICITY',
        amount: 24500,
        vendor: 'DHBVN Haryana Power',
        date: new Date('2026-08-15'),
        notes: 'Monthly power consumption invoice paid online',
      },
      {
        propertyId: propGurgaon.id,
        title: 'High-Speed Commercial Fiber Internet (Airtel)',
        category: 'INTERNET',
        amount: 4500,
        vendor: 'Airtel Enterprise Broadband',
        date: new Date('2026-08-10'),
        notes: '300 Mbps dedicated leased fiber line',
      },
      {
        propertyId: propGurgaon.id,
        title: 'Mess Groceries & Supplies',
        category: 'FOOD',
        amount: 18500,
        vendor: 'Blinkit B2B Wholesale',
        date: new Date('2026-08-20'),
        notes: 'Weekly kitchen grains, vegetables, and milk provisions',
      },
      {
        propertyId: propGurgaon.id,
        title: 'Staff Salary - Kamal Electrician',
        category: 'SALARY',
        amount: 16000,
        vendor: 'Direct Bank Transfer',
        date: new Date('2026-08-31'),
        notes: 'August 2026 monthly staff stipend',
      },
    ],
  });

  console.log('✅ Created PG Expenses');

  // 20. Inventory Items
  await prisma.inventoryItem.createMany({
    data: [
      {
        propertyId: propGurgaon.id,
        name: 'Single Wooden Bed Frame (Teak Finish)',
        category: 'Furniture',
        quantity: 8,
        minQuantity: 2,
        status: 'GOOD',
        location: 'Storage Room 001',
        vendor: 'IKEA Commercial',
        cost: 6500,
      },
      {
        propertyId: propGurgaon.id,
        name: 'Split AC 1.5 Ton 5-Star (Daikin)',
        category: 'Electronics',
        quantity: 6,
        minQuantity: 1,
        status: 'GOOD',
        location: 'Rooms 101, 102, 103',
        vendor: 'Reliance Digital',
        cost: 38000,
      },
      {
        propertyId: propGurgaon.id,
        name: 'Sleepwell Ortho 6-inch Mattress',
        category: 'Bedding',
        quantity: 12,
        minQuantity: 3,
        status: 'GOOD',
        location: 'Block A Suites',
        vendor: 'Sleepwell Direct',
        cost: 4800,
      },
      {
        propertyId: propGurgaon.id,
        name: 'Commercial RO Water Purifier 50L/hr',
        category: 'Appliance',
        quantity: 1,
        minQuantity: 2,
        status: 'LOW_STOCK',
        location: 'Cafeteria Kitchen',
        vendor: 'Kent RO Systems',
        cost: 22000,
      },
    ],
  });

  console.log('✅ Created Inventory Assets & Low-Stock Items');

  // 21. Operational Tasks
  await prisma.operationalTask.createMany({
    data: [
      {
        propertyId: propGurgaon.id,
        title: 'Deep Sanitation & Cleaning of Room 102',
        category: 'CLEANING',
        priority: 'MEDIUM',
        assignedTo: 'Housekeeping Team',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 24 * 3600 * 1000),
      },
      {
        propertyId: propGurgaon.id,
        title: 'Rooftop Water Tank Chlorination & Filter Replacement',
        category: 'INSPECTION',
        priority: 'HIGH',
        assignedTo: 'Kamal Electrician',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 48 * 3600 * 1000),
      },
      {
        propertyId: propGurgaon.id,
        title: 'Follow-up for September Rent Overdue Invoices',
        category: 'RENT_COLLECTION',
        priority: 'MEDIUM',
        assignedTo: 'Rohan Mehta (Manager)',
        status: 'PENDING',
      },
    ],
  });

  console.log('✅ Created Operational Tasks');

  // 22. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        propertyId: propGurgaon.id,
        actorId: userAakash.id,
        actorName: 'Aakash Verma',
        actorRole: 'RESIDENT',
        action: 'LOGIN',
        entity: 'User',
        entityId: userAakash.id,
        details: 'Resident logged into portal via web client',
      },
      {
        propertyId: propGurgaon.id,
        actorId: userAakash.id,
        actorName: 'Aakash Verma',
        actorRole: 'RESIDENT',
        action: 'PAYMENT_COMPLETED',
        entity: 'Payment',
        entityId: pAug.id,
        details: 'Paid rent ₹18,000 for August 2026 via UPI',
      },
      {
        propertyId: propGurgaon.id,
        actorId: owner.id,
        actorName: owner.name,
        actorRole: 'OWNER',
        action: 'ROOM_CREATED',
        entity: 'Room',
        entityId: room101.id,
        details: 'Configured Room 101 with Single AC capacity 1',
      },
      {
        propertyId: propGurgaon.id,
        actorId: owner.id,
        actorName: owner.name,
        actorRole: 'OWNER',
        action: 'VISITOR_APPROVED',
        entity: 'VisitorRequest',
        entityId: v1.id,
        details: 'Approved visitor pass for Satish Verma',
      },
    ],
  });

  console.log('🎉 Database Seeding Finished Successfully!');
  console.log(`
===========================================================
  🔑 DEMO LOGIN CREDENTIALS:
  ---------------------------------------------------------
  RESIDENT:
    Email:    aakash.v@gmail.com
    Password: admin123
    Room:     101 (Single AC)
    PG:       Urban Nest Premium PG (Gurgaon)

  RESIDENT 2:
    Email:    sneha.rao@yahoo.com
    Password: admin123
    Room:     103 (Double Sharing)

  OWNER / ADMIN:
    Email:    owner@pg.com
    Password: admin123
===========================================================
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
