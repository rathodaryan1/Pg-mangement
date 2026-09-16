import React from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  QrCode,
  CreditCard,
  Wrench,
  ShieldCheck,
  Siren,
  Users,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  Clock,
  Building2,
  FileCheck
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const FeaturesPage: React.FC = () => {
  const featureList = [
    {
      id: 'bed-matrix',
      category: 'Occupancy & Inventory',
      title: 'Interactive Visual Bed Matrix',
      subtitle: 'Instant visibility into room availability across floors and buildings.',
      description: 'Replace fragmented spreadsheets with a graphical bed matrix. View which rooms are occupied, available, reserved, or under maintenance at a glance.',
      highlights: [
        'Real-time bed-level status (Bed A, B, C, D)',
        'Single, Double, Triple, and 4-Sharing room support',
        'Floor-wise and building-wise categorization',
        'One-click resident assignment & key handover tracking'
      ],
      icon: BedDouble,
      color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    },
    {
      id: 'qr-gate',
      category: 'Security & Access',
      title: 'Encrypted QR Code Visitor Gate Passes',
      subtitle: 'Eliminate manual paper registers with contactless, verified digital passes.',
      description: 'Residents request visitor passes directly on their smartphone. Owners or wardens approve requests in real time to generate unique, time-stamped QR gate passes.',
      highlights: [
        'Resident pre-approval workflow for visiting guests & deliveries',
        'Opaque secure QR tokens (zero sensitive data leakage)',
        'Automatic entry/exit time logging at the security gate',
        'Automated pass expiry to prevent unauthorized re-entry'
      ],
      icon: QrCode,
      color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
    },
    {
      id: 'finance-ledger',
      category: 'Billing & Payments',
      title: 'Automated Rent Ledger & Escrow Deposits',
      subtitle: 'Server-verified payment collection with instant tax receipts.',
      description: 'Automate monthly rent invoicing on the 1st of every month. Residents pay through UPI or Cards, and payments are automatically reconciled without manual screenshot verification.',
      highlights: [
        'Automated WhatsApp & SMS rent reminders',
        'Automated late fine calculation after due date',
        'Official branded PDF tax receipts for resident tax exemptions',
        'Security deposit holding ledger with itemized move-out deduction checklists'
      ],
      icon: CreditCard,
      color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    },
    {
      id: 'maintenance-desk',
      category: 'Operations & SLAs',
      title: 'Maintenance Ticket Desk & Timeline',
      subtitle: 'End-to-end issue tracking from report to verified resolution.',
      description: 'Residents report room issues with photos in seconds. Admins assign tasks to on-duty technicians, tracking progress on a live status timeline with resident ratings upon completion.',
      highlights: [
        'Categorized ticketing: Plumbing, Electrical, AC, Wi-Fi, Cleaning',
        'Priority tagging (Urgent, High, Medium, Low)',
        'Complete chronological audit timeline for every ticket',
        'Post-resolution resident feedback & 5-star ratings'
      ],
      icon: Wrench,
      color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    },
    {
      id: 'emergency-sos',
      category: 'Safety & Emergency',
      title: 'Emergency SOS & Safety Desk',
      subtitle: 'Instant double-confirmation panic alert system for resident emergencies.',
      description: 'In critical medical or security emergencies, residents can trigger the SOS button with double confirmation. The system instantly broadcasts room location alerts to wardens and security staff.',
      highlights: [
        'Accidental-trigger prevention with double-confirmation dialog',
        'Instant location broadcast (Building, Room, Bed ID)',
        'Immediate display of PG warden and local emergency phone numbers',
        'Automatic emergency contact SMS notification'
      ],
      icon: Siren,
      color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    },
    {
      id: 'analytics-audit',
      category: 'Governance & Insights',
      title: 'Analytics, Reports & Immutable Audit Logs',
      subtitle: 'Actionable financial intelligence and security compliance.',
      description: 'Gain complete operational visibility with occupancy trends, collection efficiencies, expense breakdowns, and tamper-proof security audit logs.',
      highlights: [
        'Occupancy rate and monthly revenue trajectory graphs',
        'Outstanding dues breakdown and payment velocity metrics',
        'Immutable audit logs capturing user, role, action, and timestamp',
        'One-click Excel / PDF data export for accounting compliance'
      ],
      icon: BarChart3,
      color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
    }
  ];

  return (
    <div className="space-y-16 sm:space-y-24 py-12 sm:py-16 max-w-6xl mx-auto px-4 sm:px-6 animate-fade-in">
      {/* 1. HERO HEADER */}
      <section className="text-center space-y-4">
        <Badge variant="primary">Comprehensive Feature Suite</Badge>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          Everything You Need to Run a <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            World-Class PG Community
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          From room allocation to automated rent collection, digital QR gate security, and maintenance SLAs—discover how Urban Nest unifies every aspect of PG operations.
        </p>
      </section>

      {/* 2. DETAILED FEATURE CARDS */}
      <section className="space-y-10">
        {featureList.map((feat, idx) => {
          const Icon = feat.icon;
          const isEven = idx % 2 === 0;

          return (
            <Card
              key={feat.id}
              className="p-6 sm:p-10 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                {/* Text Content */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {feat.category}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{feat.title}</h2>
                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">{feat.subtitle}</p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feat.description}</p>

                  {/* Bullet Highlights */}
                  <div className="space-y-2 pt-2">
                    {feat.highlights.map((item, hIdx) => (
                      <div key={hIdx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Icon Illustration Box */}
                <div className="lg:col-span-5 flex items-center justify-center">
                  <div className={`w-full max-w-sm p-8 rounded-3xl border flex flex-col items-center justify-center text-center shadow-inner ${feat.color}`}>
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 shadow-md flex items-center justify-center mb-4">
                      <Icon className="w-10 h-10" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{feat.title}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{feat.subtitle}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      {/* 3. CTA FOOTER */}
      <section className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white text-center space-y-6">
        <div className="max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black">See These Features in Action</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Launch the live interactive demonstration for Owners or Residents right now.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/owner/dashboard">
            <Button variant="primary" size="md">
              Launch Owner Portal
            </Button>
          </Link>
          <Link to="/resident/dashboard">
            <Button variant="outline" size="md" className="text-purple-300 border-purple-800 bg-purple-950/40">
              Launch Resident Portal
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
