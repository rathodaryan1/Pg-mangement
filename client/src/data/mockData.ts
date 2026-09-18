import type {
  Property,
  Room,
  Resident,
  PaymentRecord,
  VisitorRequest,
  MaintenanceTicket,
  StaffMember,
  OperationalTask,
  AssetInventoryItem,
  PGNotice,
  AuditLog,
  LeaveRequest,
  DashboardKPIs,
  User
} from '../types';

export const MOCK_CURRENT_USER_OWNER: User = {
  id: 'usr-owner-01',
  name: 'Rajesh Sharma',
  email: 'rajesh.sharma@urbannest.in',
  role: 'OWNER',
  phone: '+91 98765 43210',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
};

export const MOCK_CURRENT_USER_RESIDENT: User = {
  id: 'usr-res-101',
  name: 'Aarav Mehta',
  email: 'aarav.mehta@example.com',
  role: 'RESIDENT',
  phone: '+91 91234 56789',
  propertyId: 'prop-01',
  residentId: 'res-101',
  avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
};

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'prop-01',
    name: 'Urban Nest Pearl - Men\'s Luxury PG',
    address: 'Plot 12, Opp. Gujarat University, Navrangpura',
    city: 'Ahmedabad, Gujarat 380009',
    phone: '+91 79 2685 8899',
    email: 'navrangpura.pearl@urbannest.in',
    totalRooms: 12,
    totalBeds: 36,
    occupiedBeds: 31,
    monthlyRevenue: 558000,
    upiId: 'urbannest.pearl@icici',
    gstNumber: '24AABCU9639R1ZM',
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'prop-02',
    name: 'Urban Nest Elite - Co-Living & Ladies PG',
    address: 'Tower B, Near Iscon Cross Road, S.G. Highway, Bodakdev',
    city: 'Ahmedabad, Gujarat 380054',
    phone: '+91 79 2685 3344',
    email: 'sghighway.elite@urbannest.in',
    totalRooms: 8,
    totalBeds: 24,
    occupiedBeds: 20,
    monthlyRevenue: 400000,
    upiId: 'urbannest.elite@hdfcbank',
    gstNumber: '24AABCU9639R2ZN',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80'
  }
];

export const MOCK_ROOMS: Room[] = [
  {
    id: 'room-101',
    number: '101',
    building: 'Block A',
    floor: 1,
    type: 'Double',
    capacity: 2,
    occupiedCount: 2,
    baseRent: 16000,
    deposit: 32000,
    status: 'FULL',
    amenities: ['AC', 'High-Speed Wi-Fi', 'Attached Bathroom', 'Smart TV', 'Balcony'],
    propertyId: 'prop-01',
    beds: [
      { id: 'bed-101-A', bedNumber: '101-A', roomId: 'room-101', status: 'OCCUPIED', residentId: 'res-101', residentName: 'Aarav Mehta', monthlyRent: 16000 },
      { id: 'bed-101-B', bedNumber: '101-B', roomId: 'room-101', status: 'OCCUPIED', residentId: 'res-102', residentName: 'Rohan Gupta', monthlyRent: 16000 }
    ]
  },
  {
    id: 'room-102',
    number: '102',
    building: 'Block A',
    floor: 1,
    type: 'Triple',
    capacity: 3,
    occupiedCount: 2,
    baseRent: 13500,
    deposit: 27000,
    status: 'AVAILABLE',
    amenities: ['AC', 'High-Speed Wi-Fi', 'Attached Bathroom', 'Individual Locker'],
    propertyId: 'prop-01',
    beds: [
      { id: 'bed-102-A', bedNumber: '102-A', roomId: 'room-102', status: 'OCCUPIED', residentId: 'res-103', residentName: 'Siddharth Nair', monthlyRent: 13500 },
      { id: 'bed-102-B', bedNumber: '102-B', roomId: 'room-102', status: 'OCCUPIED', residentId: 'res-104', residentName: 'Vikram Verma', monthlyRent: 13500 },
      { id: 'bed-102-C', bedNumber: '102-C', roomId: 'room-102', status: 'AVAILABLE', monthlyRent: 13500 }
    ]
  },
  {
    id: 'room-201',
    number: '201',
    building: 'Block A',
    floor: 2,
    type: 'Single',
    capacity: 1,
    occupiedCount: 1,
    baseRent: 24000,
    deposit: 48000,
    status: 'FULL',
    amenities: ['AC', 'Wi-Fi 500Mbps', 'Attached Bath', 'Private Desk', 'Mini Fridge'],
    propertyId: 'prop-01',
    beds: [
      { id: 'bed-201-A', bedNumber: '201-A', roomId: 'room-201', status: 'OCCUPIED', residentId: 'res-105', residentName: 'Karan Malhotra', monthlyRent: 24000 }
    ]
  },
  {
    id: 'room-202',
    number: '202',
    building: 'Block A',
    floor: 2,
    type: 'Double',
    capacity: 2,
    occupiedCount: 1,
    baseRent: 16500,
    deposit: 33000,
    status: 'AVAILABLE',
    amenities: ['AC', 'High-Speed Wi-Fi', 'Attached Bathroom', 'Power Backup'],
    propertyId: 'prop-01',
    beds: [
      { id: 'bed-202-A', bedNumber: '202-A', roomId: 'room-202', status: 'OCCUPIED', residentId: 'res-106', residentName: 'Devansh Reddy', monthlyRent: 16500 },
      { id: 'bed-202-B', bedNumber: '202-B', roomId: 'room-202', status: 'AVAILABLE', monthlyRent: 16500 }
    ]
  },
  {
    id: 'room-203',
    number: '203',
    building: 'Block B',
    floor: 2,
    type: 'Four Sharing',
    capacity: 4,
    occupiedCount: 3,
    baseRent: 11000,
    deposit: 22000,
    status: 'AVAILABLE',
    amenities: ['High-Speed Wi-Fi', 'Shared Bath', 'Large Wardrobe', 'Geyser'],
    propertyId: 'prop-01',
    beds: [
      { id: 'bed-203-A', bedNumber: '203-A', roomId: 'room-203', status: 'OCCUPIED', residentId: 'res-107', residentName: 'Nitin Pandey', monthlyRent: 11000 },
      { id: 'bed-203-B', bedNumber: '203-B', roomId: 'room-203', status: 'OCCUPIED', residentId: 'res-108', residentName: 'Amit Singh', monthlyRent: 11000 },
      { id: 'bed-203-C', bedNumber: '203-C', roomId: 'room-203', status: 'OCCUPIED', residentId: 'res-109', residentName: 'Varun Joshi', monthlyRent: 11000 },
      { id: 'bed-203-D', bedNumber: '203-D', roomId: 'room-203', status: 'AVAILABLE', monthlyRent: 11000 }
    ]
  },
  {
    id: 'room-301',
    number: '301',
    building: 'Block B',
    floor: 3,
    type: 'Double',
    capacity: 2,
    occupiedCount: 0,
    baseRent: 17000,
    deposit: 34000,
    status: 'MAINTENANCE',
    amenities: ['AC', 'Wi-Fi', 'Attached Bathroom', 'Balcony'],
    propertyId: 'prop-01',
    beds: [
      { id: 'bed-301-A', bedNumber: '301-A', roomId: 'room-301', status: 'MAINTENANCE', monthlyRent: 17000 },
      { id: 'bed-301-B', bedNumber: '301-B', roomId: 'room-301', status: 'MAINTENANCE', monthlyRent: 17000 }
    ]
  }
];

export const MOCK_RESIDENTS: Resident[] = [
  {
    id: 'res-101',
    fullName: 'Aarav Mehta',
    email: 'aarav.mehta@example.com',
    mobile: '+91 91234 56789',
    alternateMobile: '+91 98765 11223',
    gender: 'MALE',
    emergencyContact: {
      name: 'Sunil Mehta',
      relationship: 'Father',
      phone: '+91 98200 44556'
    },
    kycStatus: 'VERIFIED',
    kycDocumentType: 'AADHAAR',
    kycDocumentNumber: '5489 1234 9876',
    joiningDate: '2025-08-01',
    status: 'ACTIVE',
    propertyId: 'prop-01',
    propertyName: 'Urban Nest Pearl - HSR Layout',
    roomId: 'room-101',
    roomNumber: '101',
    bedId: 'bed-101-A',
    bedNumber: '101-A',
    monthlyRent: 16000,
    securityDeposit: 32000,
    depositPaid: true,
    rentDueDate: 5,
    lastPaymentDate: '2026-09-03',
    workCompany: 'Flipkart Software Development',
    permanentAddress: 'Flat 402, Sunshine Apts, Model Town, Delhi 110009',
    agreementSignedUrl: '/agreements/res-101-agreement.pdf',
    agreementExpiryDate: '2027-07-31'
  },
  {
    id: 'res-102',
    fullName: 'Rohan Gupta',
    email: 'rohan.g@example.com',
    mobile: '+91 98112 23344',
    gender: 'MALE',
    emergencyContact: {
      name: 'Anjali Gupta',
      relationship: 'Mother',
      phone: '+91 98112 00000'
    },
    kycStatus: 'VERIFIED',
    kycDocumentType: 'AADHAAR',
    kycDocumentNumber: '9988 7766 5544',
    joiningDate: '2025-11-15',
    status: 'ACTIVE',
    propertyId: 'prop-01',
    propertyName: 'Urban Nest Pearl - HSR Layout',
    roomId: 'room-101',
    roomNumber: '101',
    bedId: 'bed-101-B',
    bedNumber: '101-B',
    monthlyRent: 16000,
    securityDeposit: 32000,
    depositPaid: true,
    rentDueDate: 5,
    lastPaymentDate: '2026-09-04',
    workCompany: 'Swiggy Tech Lead',
    permanentAddress: 'House 14, Civil Lines, Jaipur 302006'
  },
  {
    id: 'res-103',
    fullName: 'Siddharth Nair',
    email: 'siddharth.nair@example.com',
    mobile: '+91 94470 12345',
    gender: 'MALE',
    emergencyContact: {
      name: 'K. P. Nair',
      relationship: 'Father',
      phone: '+91 94470 99999'
    },
    kycStatus: 'VERIFIED',
    kycDocumentType: 'PAN',
    kycDocumentNumber: 'ABCDE1234F',
    joiningDate: '2026-01-10',
    status: 'NOTICE_PERIOD',
    propertyId: 'prop-01',
    propertyName: 'Urban Nest Pearl - HSR Layout',
    roomId: 'room-102',
    roomNumber: '102',
    bedId: 'bed-102-A',
    bedNumber: '102-A',
    monthlyRent: 13500,
    securityDeposit: 27000,
    depositPaid: true,
    rentDueDate: 5,
    lastPaymentDate: '2026-08-05',
    expectedMoveOutDate: '2026-09-30',
    workCompany: 'Infosys Associate',
    permanentAddress: 'Nair Villa, MG Road, Kochi, Kerala'
  },
  {
    id: 'res-104',
    fullName: 'Vikram Verma',
    email: 'vikram.v@example.com',
    mobile: '+91 99887 66554',
    gender: 'MALE',
    emergencyContact: {
      name: 'Ramesh Verma',
      relationship: 'Father',
      phone: '+91 99887 00112'
    },
    kycStatus: 'PENDING',
    kycDocumentType: 'AADHAAR',
    kycDocumentNumber: '1122 3344 5566',
    joiningDate: '2026-09-01',
    status: 'PENDING_MOVE_IN',
    propertyId: 'prop-01',
    propertyName: 'Urban Nest Pearl - HSR Layout',
    roomId: 'room-102',
    roomNumber: '102',
    bedId: 'bed-102-B',
    bedNumber: '102-B',
    monthlyRent: 13500,
    securityDeposit: 27000,
    depositPaid: false,
    rentDueDate: 5,
    workCompany: 'Accenture Analyst',
    permanentAddress: 'Sector 15, Chandigarh 160015'
  }
];

export const MOCK_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-901',
    residentId: 'res-101',
    residentName: 'Aarav Mehta',
    roomNumber: '101',
    propertyId: 'prop-01',
    category: 'RENT',
    period: 'September 2026',
    amount: 16000,
    dueDate: '2026-09-05',
    paidDate: '2026-09-03',
    status: 'PAID',
    method: 'UPI',
    transactionId: 'UPI9872341203',
    receiptNumber: 'UN-REC-2026-091',
    notes: 'Paid via PhonePe GPay'
  },
  {
    id: 'pay-902',
    residentId: 'res-102',
    residentName: 'Rohan Gupta',
    roomNumber: '101',
    propertyId: 'prop-01',
    category: 'RENT',
    period: 'September 2026',
    amount: 16000,
    dueDate: '2026-09-05',
    paidDate: '2026-09-04',
    status: 'PAID',
    method: 'RAZORPAY',
    transactionId: 'pay_Nz928139x',
    receiptNumber: 'UN-REC-2026-092'
  },
  {
    id: 'pay-903',
    residentId: 'res-103',
    residentName: 'Siddharth Nair',
    roomNumber: '102',
    propertyId: 'prop-01',
    category: 'RENT',
    period: 'September 2026',
    amount: 13500,
    dueDate: '2026-09-05',
    status: 'OVERDUE',
    notes: 'Reminder sent on WhatsApp & SMS'
  },
  {
    id: 'pay-904',
    residentId: 'res-104',
    residentName: 'Vikram Verma',
    roomNumber: '102',
    propertyId: 'prop-01',
    category: 'SECURITY_DEPOSIT',
    period: 'Move-In Initial Deposit',
    amount: 27000,
    dueDate: '2026-09-01',
    status: 'PENDING',
    notes: 'Move-in pending deposit clearance'
  },
  {
    id: 'pay-905',
    residentId: 'res-105',
    residentName: 'Karan Malhotra',
    roomNumber: '201',
    propertyId: 'prop-01',
    category: 'RENT',
    period: 'September 2026',
    amount: 24000,
    dueDate: '2026-09-05',
    paidDate: '2026-09-02',
    status: 'PAID',
    method: 'NET_BANKING',
    transactionId: 'HDFC891238910',
    receiptNumber: 'UN-REC-2026-093'
  }
];

export const MOCK_VISITORS: VisitorRequest[] = [
  {
    id: 'vis-501',
    visitorName: 'Rajesh Kumar',
    visitorMobile: '+91 98888 11111',
    relation: 'Friend / Colleague',
    purpose: 'Study & Work Project',
    residentId: 'res-101',
    residentName: 'Aarav Mehta',
    roomNumber: '101',
    propertyId: 'prop-01',
    visitDate: '2026-09-16',
    expectedTime: '04:00 PM',
    status: 'APPROVED',
    approvedBy: 'Warden Suresh',
    qrPassCode: 'QR-UN-8921-HSR',
    createdTime: '2026-09-16 10:15 AM'
  },
  {
    id: 'vis-502',
    visitorName: 'Sunil Mehta',
    visitorMobile: '+91 98200 44556',
    relation: 'Father',
    purpose: 'Family Visit',
    residentId: 'res-101',
    residentName: 'Aarav Mehta',
    roomNumber: '101',
    propertyId: 'prop-01',
    visitDate: '2026-09-18',
    expectedTime: '11:00 AM',
    status: 'PENDING',
    qrPassCode: 'QR-UN-9012-PENDING',
    createdTime: '2026-09-16 09:30 AM'
  },
  {
    id: 'vis-503',
    visitorName: 'Praveen Sharma',
    visitorMobile: '+91 97777 22222',
    relation: 'Delivery Partner',
    purpose: 'Laptop Package Delivery',
    residentId: 'res-102',
    residentName: 'Rohan Gupta',
    roomNumber: '101',
    propertyId: 'prop-01',
    visitDate: '2026-09-15',
    expectedTime: '02:30 PM',
    checkInTime: '2026-09-15 02:32 PM',
    checkOutTime: '2026-09-15 02:40 PM',
    status: 'CHECKED_OUT',
    approvedBy: 'Auto Resident Gate Approval',
    qrPassCode: 'QR-UN-7711-EXPIRED',
    createdTime: '2026-09-15 02:20 PM'
  }
];

export const MOCK_MAINTENANCE_TICKETS: MaintenanceTicket[] = [
  {
    id: 'tkt-301',
    ticketNumber: 'TKT-2026-104',
    title: 'AC Cooling Leakage in Room 101',
    category: 'AIR_CONDITIONING',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    residentId: 'res-101',
    residentName: 'Aarav Mehta',
    roomNumber: '101',
    propertyId: 'prop-01',
    description: 'The split AC unit is dripping water from the front panel onto the desk area.',
    assignedStaffId: 'stf-02',
    assignedStaffName: 'Ramesh (HVAC Tech)',
    createdAt: '2026-09-15 08:30 AM',
    history: [
      { id: 'h-1', status: 'REPORTED', updatedBy: 'Aarav Mehta', timestamp: '2026-09-15 08:30 AM', comment: 'Ticket submitted with photo attachment' },
      { id: 'h-2', status: 'ASSIGNED', updatedBy: 'Admin Rajesh', timestamp: '2026-09-15 09:15 AM', comment: 'Assigned to HVAC Tech Ramesh for inspection' },
      { id: 'h-3', status: 'IN_PROGRESS', updatedBy: 'Ramesh (HVAC Tech)', timestamp: '2026-09-15 02:00 PM', comment: 'Drain pipe unclogging under process, replacing filter.' }
    ]
  },
  {
    id: 'tkt-302',
    ticketNumber: 'TKT-2026-105',
    title: 'Geyser Switch Not Turning On',
    category: 'ELECTRICAL',
    priority: 'URGENT',
    status: 'REPORTED',
    residentId: 'res-103',
    residentName: 'Siddharth Nair',
    roomNumber: '102',
    propertyId: 'prop-01',
    description: 'Bathroom geyser trip switch is down and sparking slightly.',
    createdAt: '2026-09-16 07:15 AM',
    history: [
      { id: 'h-10', status: 'REPORTED', updatedBy: 'Siddharth Nair', timestamp: '2026-09-16 07:15 AM', comment: 'Reported urgent electrical issue' }
    ]
  },
  {
    id: 'tkt-303',
    ticketNumber: 'TKT-2026-098',
    title: 'Wi-Fi Signal Weak on 2nd Floor',
    category: 'WIFI_INTERNET',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    residentId: 'res-105',
    residentName: 'Karan Malhotra',
    roomNumber: '201',
    propertyId: 'prop-01',
    description: 'Wi-Fi mesh extender was offline.',
    assignedStaffId: 'stf-01',
    assignedStaffName: 'Suresh Warden',
    createdAt: '2026-09-12 11:00 AM',
    resolvedAt: '2026-09-12 04:30 PM',
    rating: 5,
    feedback: 'Prompt fix by warden. Extender rebooted and speed tested to 300Mbps.',
    history: [
      { id: 'h-20', status: 'REPORTED', updatedBy: 'Karan Malhotra', timestamp: '2026-09-12 11:00 AM', comment: 'Created ticket' },
      { id: 'h-21', status: 'RESOLVED', updatedBy: 'Suresh Warden', timestamp: '2026-09-12 04:30 PM', comment: 'Extender reset and reconfigured.' }
    ]
  }
];

export const MOCK_STAFF: StaffMember[] = [
  {
    id: 'stf-01',
    name: 'Suresh Kumar',
    role: 'WARDEN',
    mobile: '+91 98450 11223',
    propertyId: 'prop-01',
    assignedBuilding: 'Block A & B',
    status: 'ACTIVE',
    shift: 'FULL_DAY',
    salary: 28000
  },
  {
    id: 'stf-02',
    name: 'Ramesh Technician',
    role: 'MAINTENANCE_TECH',
    mobile: '+91 98450 33445',
    propertyId: 'prop-01',
    status: 'ACTIVE',
    shift: 'MORNING',
    salary: 22000
  },
  {
    id: 'stf-03',
    name: 'Lakshmi Amma',
    role: 'HOUSEKEEPING',
    mobile: '+91 98450 55667',
    propertyId: 'prop-01',
    assignedBuilding: 'Block A Floor 1-3',
    status: 'ACTIVE',
    shift: 'MORNING',
    salary: 16000
  }
];

export const MOCK_TASKS: OperationalTask[] = [
  {
    id: 'tsk-01',
    title: 'Deep Housekeeping & Sanitize Room 301',
    category: 'CLEANING',
    priority: 'HIGH',
    assignedStaffId: 'stf-03',
    assignedStaffName: 'Lakshmi Amma',
    dueDate: '2026-09-17',
    status: 'IN_PROGRESS',
    notes: 'Prepare for new tenant move-in next week.'
  },
  {
    id: 'tsk-02',
    title: 'Inspect Move-Out Checklist for Room 102 Bed A',
    category: 'INSPECTION',
    priority: 'MEDIUM',
    assignedStaffId: 'stf-01',
    assignedStaffName: 'Suresh Kumar',
    dueDate: '2026-09-28',
    status: 'PENDING'
  }
];

export const MOCK_ASSETS: AssetInventoryItem[] = [
  {
    id: 'ast-01',
    name: 'Daikin 1.5 Ton 5-Star Inverter AC',
    category: 'ELECTRONICS',
    quantity: 12,
    propertyId: 'prop-01',
    condition: 'GOOD',
    purchaseDate: '2024-03-15',
    warrantyExpiry: '2027-03-15',
    vendorName: 'Daikin India Care',
    serviceHistoryCount: 3
  },
  {
    id: 'ast-02',
    name: 'Godrej Ergonomic Study Desk & Chair Set',
    category: 'FURNITURE',
    quantity: 36,
    propertyId: 'prop-01',
    condition: 'EXCELLENT',
    purchaseDate: '2024-04-10',
    serviceHistoryCount: 0
  },
  {
    id: 'ast-03',
    name: 'A.O. Smith 25L Glass-Lined Water Heater',
    category: 'APPLIANCE',
    quantity: 12,
    propertyId: 'prop-01',
    condition: 'NEEDS_REPAIR',
    purchaseDate: '2024-02-01',
    warrantyExpiry: '2026-10-01',
    vendorName: 'A.O. Smith Authorized Vendor',
    serviceHistoryCount: 2
  }
];

export const MOCK_NOTICES: PGNotice[] = [
  {
    id: 'ntc-101',
    title: 'Monthly Pest Control Drive on Saturday',
    content: 'Please ensure all rooms in Block A & B are accessible between 10:00 AM and 01:00 PM on Saturday, 20th September for eco-friendly pest treatment.',
    category: 'MAINTENANCE',
    isImportant: true,
    propertyId: 'prop-01',
    publishedAt: '2026-09-15',
    expiresAt: '2026-09-21',
    publisherName: 'Urban Nest Management'
  },
  {
    id: 'ntc-102',
    title: 'Rent Reminder: Due Date 5th of Every Month',
    content: 'Dear Residents, kindly clear monthly rent before the 5th to avoid automated late fine calculation (\$200/day after 5th). You can pay seamlessly via UPI or Cards in the Resident Portal.',
    category: 'PAYMENT',
    isImportant: false,
    propertyId: 'prop-01',
    publishedAt: '2026-09-01',
    publisherName: 'Accounts Desk'
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-801',
    actorName: 'Rajesh Sharma (Owner)',
    actorRole: 'OWNER',
    action: 'APPROVED_VISITOR',
    targetEntity: 'Visitor: Rajesh Kumar (Ref: vis-501)',
    timestamp: '2026-09-16 10:15 AM',
    ipAddress: '49.207.210.12',
    details: 'Approved visitor request for Resident Aarav Mehta (Room 101)'
  },
  {
    id: 'aud-802',
    actorName: 'System Automated Engine',
    actorRole: 'SYSTEM',
    action: 'MARK_RENT_OVERDUE',
    targetEntity: 'Payment Record: pay-903',
    timestamp: '2026-09-06 12:00 AM',
    details: 'Rent status updated to OVERDUE for Siddharth Nair'
  },
  {
    id: 'aud-803',
    actorName: 'Aarav Mehta (Resident)',
    actorRole: 'RESIDENT',
    action: 'CREATE_MAINTENANCE_TICKET',
    targetEntity: 'Ticket: TKT-2026-104',
    timestamp: '2026-09-15 08:30 AM',
    details: 'Raised AC leakage ticket'
  }
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lv-01',
    residentId: 'res-101',
    residentName: 'Aarav Mehta',
    roomNumber: '101',
    fromDate: '2026-10-02',
    toDate: '2026-10-08',
    reason: 'Diwali Festival Family Holiday',
    status: 'APPROVED',
    appliedOn: '2026-09-14',
    approvedBy: 'Suresh Warden'
  }
];

export const MOCK_DASHBOARD_KPIS: DashboardKPIs = {
  totalOccupancyPercentage: 86.1,
  occupiedBeds: 31,
  totalBeds: 36,
  vacantBeds: 5,
  monthlyRevenue: 558000,
  outstandingRent: 13500,
  openComplaints: 2,
  todayVisitors: 2,
  actionRequired: {
    overdueRentsCount: 1,
    pendingVisitorsCount: 1,
    openMaintenanceCount: 2,
    expiringAgreementsCount: 1
  }
};
