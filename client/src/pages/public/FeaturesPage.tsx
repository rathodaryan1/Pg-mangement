import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  BedDouble,
  Users,
  CreditCard,
  Wrench,
  ShieldCheck,
  Bell,
  CheckCircle,
  FileCheck,
  Receipt,
  QrCode,
  Box,
  LifeBuoy,
  FileSpreadsheet,
  ArrowRight,
  Shield
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface FeatureCategory {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  features: {
    name: string;
    description: string;
  }[];
}

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    title: 'PROPERTY OPERATIONS',
    subtitle: 'Full hierarchy from property portfolio down to individual bed records.',
    icon: Building2,
    features: [
      {
        name: 'Multi-Property Management',
        description: 'Manage multiple branches, buildings, and addresses under one owner profile.'
      },
      {
        name: 'Floor & Room Hierarchy',
        description: 'Organize properties by floors and individual rooms with customizable capacities.'
      },
      {
        name: 'Bed Allocation Matrix',
        description: 'Assign, reserve, and release beds (Bed A, Bed B) with live occupancy status.'
      },
      {
        name: 'Room Amenities & Pricing',
        description: 'Set custom base rents, security deposit requirements, and room amenities.'
      }
    ]
  },
  {
    title: 'RESIDENT MANAGEMENT',
    subtitle: 'End-to-end digital lifecycle from onboarding to security deposit settlement.',
    icon: Users,
    features: [
      {
        name: 'Digital Resident Dossiers',
        description: 'Comprehensive resident profiles storing emergency contacts, workplace, and room allocations.'
      },
      {
        name: 'Move-In & Agreement Tracking',
        description: 'Log move-in dates, agreement durations, lease start/end periods, and agreement copies.'
      },
      {
        name: 'KYC & Document Verification',
        description: 'Secure Aadhaar / Government ID verification records with police verification notes.'
      },
      {
        name: 'Notice Period & Move-Out Workflow',
        description: 'Track 30-day notice periods with itemized deposit deductions and refund settlements.'
      }
    ]
  },
  {
    title: 'FINANCE & BILLING',
    subtitle: 'Transparent accounting with automated invoices, receipts, and expense tracking.',
    icon: Receipt,
    features: [
      {
        name: 'Recurring Rent Invoicing',
        description: 'Generate monthly rent invoices automatically with custom billing cycle dates.'
      },
      {
        name: 'Payment Reconciliation',
        description: 'Record manual UPI, Cash, NEFT, and online payments with unique transaction IDs.'
      },
      {
        name: 'Escrow Security Deposit Ledger',
        description: 'Track held deposits, deductions for property damage, and return refunds.'
      },
      {
        name: 'Operating Expense Tracking',
        description: 'Record property expenses (Electricity, Wi-Fi, Water, Maintenance) categorized by vendor.'
      }
    ]
  },
  {
    title: 'FACILITY OPERATIONS',
    subtitle: 'Resolve maintenance complaints and coordinate on-ground staff seamlessly.',
    icon: Wrench,
    features: [
      {
        name: 'Maintenance Ticket Desk',
        description: 'Structured ticketing for electrical, plumbing, cleaning, and appliance issues.'
      },
      {
        name: 'Staff & Shift Management',
        description: 'Staff directory with shift assignments (Morning, Evening), roles, and contact details.'
      },
      {
        name: 'Asset & Consumables Inventory',
        description: 'Track inventory (cleaning supplies, linen, bulbs) with minimum threshold alerts.'
      },
      {
        name: 'Task Delegation',
        description: 'Assign operational daily tasks to wardens with priority tags and due dates.'
      }
    ]
  },
  {
    title: 'SECURITY & ACCESS CONTROL',
    subtitle: 'Protect premises with digital gate passes and verified visitor logs.',
    icon: Shield,
    features: [
      {
        name: 'Digital QR Visitor Passes',
        description: 'Residents create visitor invites with unique QR passes scanned at the security desk.'
      },
      {
        name: 'Gate Entry / Exit Logs',
        description: 'Record visitor arrival and departure timestamps with host confirmation.'
      },
      {
        name: 'Emergency SOS Broadcast',
        description: 'One-touch resident emergency alert triggering instant warden & security alarms.'
      },
      {
        name: 'Immutable Audit Logs',
        description: 'Log all critical administrative actions, invoice creations, and record modifications.'
      }
    ]
  },
  {
    title: 'COMMUNICATION & NOTICES',
    subtitle: 'Keep all residents informed without noisy WhatsApp groups.',
    icon: Bell,
    features: [
      {
        name: 'Official Digital Noticeboard',
        description: 'Broadcast maintenance alerts, meal schedules, and rules directly to resident dashboards.'
      },
      {
        name: 'Resident Leave Approvals',
        description: 'Residents submit overnight or vacation leave requests with warden approval workflows.'
      },
      {
        name: 'Automated Status Alerts',
        description: 'Instant notification on rent payments, complaint updates, and visitor approvals.'
      },
      {
        name: 'Resident Self-Service',
        description: 'Mobile-friendly resident portal accessible 24/7 from any device without app installation.'
      }
    ]
  }
];

export const FeaturesPage: React.FC = () => {
  return (
    <div className="space-y-16 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-left space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Product Features</span>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Comprehensive PG Operating Platform
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Explore every module built into Urban Nest to automate property management, streamline finances, and enhance the resident living experience.
        </p>
      </div>

      {/* Feature Categories Grid */}
      <div className="space-y-12">
        {FEATURE_CATEGORIES.map((category, idx) => {
          const Icon = category.icon;
          return (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 flex items-center justify-center font-bold">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {category.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{category.subtitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {category.features.map((feature, fIdx) => (
                  <div
                    key={fIdx}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-1.5 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feature.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Bottom Banner */}
      <div className="p-8 bg-slate-900 text-white rounded-xl text-left flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold">Ready to modernize your PG operations?</h3>
          <p className="text-xs text-slate-400">Launch a live demo in seconds with pre-configured sample properties.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/owner/dashboard">
            <Button variant="primary" size="md" className="font-semibold">
              Explore Owner Portal
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" size="md" className="bg-transparent border-slate-700 text-white hover:bg-slate-800">
              View Pricing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
