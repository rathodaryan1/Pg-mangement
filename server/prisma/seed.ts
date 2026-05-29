import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Multi-PG Database...');

  // 1. Clear existing data
  await prisma.inventoryItem.deleteMany({});
  await prisma.visitor.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.notice.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.property.deleteMany({});

  // 2. Hash password ('admin123')
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  // 3. Create Settings
  const settings = [
    { key: 'sms_enabled', value: 'true' },
    { key: 'email_enabled', value: 'true' },
    { key: 'whatsapp_enabled', value: 'true' },
    { key: 'saas_subscription_status', value: 'ACTIVE' },
  ];
  for (const s of settings) {
    await prisma.setting.create({ data: s });
  }

  // 4. Create Properties (PG Branches)
  const propGurgaon = await prisma.property.create({
    data: {
      name: 'Urban Nest Premium PG (Gurgaon)',
      address: 'Sector 45, Near Huda City Centre, Gurgaon, Haryana',
      phone: '+91 98765 43210',
      email: 'gurgaon@urbannestpg.com',
      upiId: 'urbannest.gurgaon@okaxis',
      gstNumber: '06AAAAA1111A1Z1',
    },
  });

  const propNoida = await prisma.property.create({
    data: {
      name: 'Urban Nest Luxury PG (Noida)',
      address: 'Block B, Sector 62, Near Expo Centre, Noida, UP',
      phone: '+91 98765 00000',
      email: 'noida@urbannestpg.com',
      upiId: 'urbannest.noida@okaxis',
      gstNumber: '09BBBBB2222B2Z2',
    },
  });

  console.log('Created Properties:', { Gurgaon: propGurgaon.id, Noida: propNoida.id });

  // 5. Create Users (Roles: Super Admin, Owner, Manager, Receptionist, Accountant, Maintenance)
  const owner = await prisma.user.create({
    data: {
      email: 'owner@pg.com',
      passwordHash,
      name: 'Aaryan Owner (Admin)',
      role: 'OWNER',
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@pg.com',
      passwordHash,
      name: 'SaaS Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  const managerGurgaon = await prisma.user.create({
    data: {
      email: 'manager.gurgaon@pg.com',
      passwordHash,
      name: 'Rohan Mehta (Manager)',
      role: 'MANAGER',
      propertyId: propGurgaon.id,
    },
  });

  const receptionistGurgaon = await prisma.user.create({
    data: {
      email: 'reception.gurgaon@pg.com',
      passwordHash,
      name: 'Sneha Sharma (Receptionist)',
      role: 'RECEPTIONIST',
      propertyId: propGurgaon.id,
    },
  });

  const accountantNoida = await prisma.user.create({
    data: {
      email: 'accounts.noida@pg.com',
      passwordHash,
      name: 'Vijay Verma (Accountant)',
      role: 'ACCOUNTANT',
      propertyId: propNoida.id,
    },
  });

  const maintenanceStaff = await prisma.user.create({
    data: {
      email: 'repair@pg.com',
      passwordHash,
      name: 'Kamal Electrician',
      role: 'MAINTENANCE',
    },
  });

  console.log('Created Staff and Admin Accounts.');

  // 6. Create Rooms for both properties
  const roomsGurgaonData = [
    { number: '101', type: 'Single', capacity: 1, rent: 18000, status: 'OCCUPIED', amenities: 'AC, Wifi, Attach Bathroom, Smart TV', propertyId: propGurgaon.id },
    { number: '102', type: 'Double', capacity: 2, rent: 12000, status: 'AVAILABLE', amenities: 'AC, Wifi, Attach Bathroom, Balcony', propertyId: propGurgaon.id },
    { number: '103', type: 'Double', capacity: 2, rent: 11000, status: 'OCCUPIED', amenities: 'AC, Wifi, Attach Bathroom', propertyId: propGurgaon.id },
    { number: '201', type: 'Triple', capacity: 3, rent: 8500, status: 'AVAILABLE', amenities: 'Wifi, Attach Bathroom, Balcony', propertyId: propGurgaon.id },
  ];

  const roomsNoidaData = [
    { number: '101', type: 'Single', capacity: 1, rent: 20000, status: 'OCCUPIED', amenities: 'AC, Wifi, Attach Bathroom, Smart TV, Fridge', propertyId: propNoida.id },
    { number: '102', type: 'Double', capacity: 2, rent: 13500, status: 'AVAILABLE', amenities: 'AC, Wifi, Attach Bathroom, Balcony', propertyId: propNoida.id },
    { number: '201', type: 'Double', capacity: 2, rent: 12000, status: 'OCCUPIED', amenities: 'AC, Wifi, Attach Bathroom', propertyId: propNoida.id },
  ];

  const rooms: any[] = [];
  for (const r of [...roomsGurgaonData, ...roomsNoidaData]) {
    const created = await prisma.room.create({ data: r });
    rooms.push(created);
  }
  console.log(`Created ${rooms.length} Rooms.`);

  // 7. Create Members
  const rGurgaon101 = rooms.find(r => r.number === '101' && r.propertyId === propGurgaon.id)!;
  const rGurgaon103 = rooms.find(r => r.number === '103' && r.propertyId === propGurgaon.id)!;
  const rNoida101 = rooms.find(r => r.number === '101' && r.propertyId === propNoida.id)!;
  const rNoida201 = rooms.find(r => r.number === '201' && r.propertyId === propNoida.id)!;

  const membersData = [
    // Gurgaon PG members
    {
      fullName: 'Aakash Verma',
      mobile: '9812345678',
      email: 'aakash.v@gmail.com',
      address: 'H.No 43, Sector 12, Karnal, Haryana',
      emergencyContact: 'Suresh Verma (Father) - 9812345670',
      joiningDate: new Date('2025-10-15'),
      workLocation: 'Google Signature Towers, Gurugram',
      rentAmount: 18000,
      depositAmount: 18000,
      status: 'ACTIVE',
      roomId: rGurgaon101.id,
      propertyId: propGurgaon.id,
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      fullName: 'Vikram Singh',
      mobile: '9988776655',
      email: 'vikram.singh@outlook.com',
      address: 'Shyam Nagar, Jaipur, Rajasthan',
      emergencyContact: 'Pushpa Singh (Mother) - 9988776650',
      joiningDate: new Date('2026-03-01'),
      workLocation: 'Zomato HQ, Gurugram',
      rentAmount: 11000,
      depositAmount: 11000,
      status: 'ACTIVE',
      roomId: rGurgaon103.id,
      propertyId: propGurgaon.id,
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    // Noida PG members
    {
      fullName: 'Sneha Rao',
      mobile: '9765432109',
      email: 'sneha.rao@yahoo.com',
      address: 'Road No 4, Jubilee Hills, Hyderabad',
      emergencyContact: 'Vijay Rao (Father) - 9765432100',
      joiningDate: new Date('2026-01-10'),
      workLocation: 'Deloitte Tech Park, Noida',
      rentAmount: 20000,
      depositAmount: 40000,
      status: 'ACTIVE',
      roomId: rNoida101.id,
      propertyId: propNoida.id,
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    {
      fullName: 'Riya Sen',
      mobile: '8877665544',
      email: 'riya.sen@gmail.com',
      address: 'Salt Lake, Sector V, Kolkata',
      emergencyContact: 'Amit Sen (Father) - 8877665540',
      joiningDate: new Date('2026-02-15'),
      workLocation: 'Noida Cyber Park, Noida',
      rentAmount: 12000,
      depositAmount: 12000,
      status: 'ACTIVE',
      roomId: rNoida201.id,
      propertyId: propNoida.id,
      photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
  ];

  const members: any[] = [];
  for (const m of membersData) {
    const created = await prisma.member.create({ data: m });
    members.push(created);
  }
  console.log(`Created ${members.length} Members.`);

  // 8. Bookings
  await prisma.booking.create({
    data: {
      memberId: members[0].id,
      roomId: rGurgaon101.id,
      checkInDate: new Date('2025-10-15'),
      status: 'CONFIRMED',
    },
  });
  await prisma.booking.create({
    data: {
      memberId: members[2].id,
      roomId: rNoida101.id,
      checkInDate: new Date('2026-01-10'),
      status: 'CONFIRMED',
    },
  });

  // 9. Payments
  const paymentsData = [
    { memberId: members[0].id, amount: 18000, dueDate: new Date('2026-05-05'), paidDate: new Date('2026-05-04'), period: 'May 2026', method: 'ONLINE', status: 'PAID', transactionId: 'TXNGUR120391' },
    { memberId: members[0].id, amount: 18000, dueDate: new Date('2026-06-05'), paidDate: null, period: 'June 2026', method: 'UPI', status: 'PENDING' },
    { memberId: members[2].id, amount: 20000, dueDate: new Date('2026-05-05'), paidDate: new Date('2026-05-05'), period: 'May 2026', method: 'UPI', status: 'PAID', transactionId: 'TXNNOI889234' },
    { memberId: members[2].id, amount: 20000, dueDate: new Date('2026-06-05'), paidDate: null, period: 'June 2026', method: 'UPI', status: 'PENDING' },
    { memberId: members[3].id, amount: 12000, dueDate: new Date('2026-05-05'), paidDate: null, period: 'May 2026', method: 'ONLINE', status: 'APPROVAL_PENDING', transactionId: 'TXNNOI901823' },
  ];
  for (const p of paymentsData) {
    await prisma.payment.create({ data: p });
  }

  // 10. Maintenance Issues
  await prisma.issue.create({
    data: {
      title: 'AC Leaking Water',
      description: 'AC unit in Room 101 Gurugram has a heavy water leak.',
      category: 'Others',
      status: 'OPEN',
      priority: 'HIGH',
      memberId: members[0].id,
    },
  });
  await prisma.issue.create({
    data: {
      title: 'Wifi Disconnecting',
      description: 'Router in Noida hallway keeps rebooting.',
      category: 'Wifi',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      memberId: members[2].id,
      assignedTo: 'Kamal Electrician',
    },
  });

  // 11. Expenses
  await prisma.expense.create({
    data: { title: 'Broadband Gurgaon May', amount: 4500, category: 'Misc', date: new Date('2026-05-10'), propertyId: propGurgaon.id },
  });
  await prisma.expense.create({
    data: { title: 'Gurgaon Mess Groceries', amount: 18500, category: 'Food', date: new Date('2026-05-12'), propertyId: propGurgaon.id },
  });
  await prisma.expense.create({
    data: { title: 'Noida Power Bill May', amount: 14200, category: 'Electricity', date: new Date('2026-05-15'), propertyId: propNoida.id },
  });

  // 12. Notices
  await prisma.notice.create({
    data: { title: 'Gurgaon Pest Control', content: 'Sunday pest treatment.', category: 'Maintenance', isImportant: true, propertyId: propGurgaon.id },
  });
  await prisma.notice.create({
    data: { title: 'Noida Security Timings', content: 'Gate closes at 11:30 PM.', category: 'Rules', isImportant: true, propertyId: propNoida.id },
  });

  // 13. Visitor Log entries
  await prisma.visitor.create({
    data: {
      fullName: 'Satish Verma (Uncle)',
      mobile: '9876599999',
      purpose: 'Meeting Aakash for dinner',
      hostMember: 'Aakash Verma',
      checkInTime: new Date('2026-05-29T14:00:00Z'),
      checkOutTime: new Date('2026-05-29T15:30:00Z'),
      propertyId: propGurgaon.id,
    },
  });
  await prisma.visitor.create({
    data: {
      fullName: 'Ramesh Patel (Courier)',
      mobile: '9888877777',
      purpose: 'Deliver Laptop Parcel',
      hostMember: 'Sneha Rao',
      checkInTime: new Date(),
      propertyId: propNoida.id, // Active check-in
    },
  });

  // 14. Inventory Tracking items
  const inventoryItems = [
    { name: 'Wooden Single Bed Frame', quantity: 4, category: 'Bed', status: 'GOOD', propertyId: propGurgaon.id },
    { name: 'AC Split 1.5 Ton', quantity: 3, category: 'AC', status: 'GOOD', propertyId: propGurgaon.id },
    { name: 'AC Split 1.5 Ton', quantity: 3, category: 'AC', status: 'GOOD', propertyId: propNoida.id },
    { name: 'Standard Sleepwell Mattress', quantity: 5, category: 'Mattress', status: 'GOOD', propertyId: propNoida.id },
    { name: 'Crompton Pedestal Fan', quantity: 2, category: 'Fan', status: 'UNDER_REPAIR', propertyId: propGurgaon.id },
    { name: 'Smart TV 32 inch', quantity: 2, category: 'Furniture', status: 'GOOD', propertyId: propGurgaon.id },
  ];
  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({ data: item });
  }

  console.log('Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
