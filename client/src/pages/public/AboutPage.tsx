import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  Zap,
  Heart,
  Users,
  CheckCircle2,
  Lock,
  Server,
  ArrowRight,
  Sparkles,
  Siren
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const AboutPage: React.FC = () => {
  const pillars = [
    {
      title: 'Smart Operational Automation',
      desc: 'Replacing manual logbooks and Excel sheets with automated bed occupancy matrices, digital rent invoicing, and auto late fee calculations.',
      icon: Zap,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950'
    },
    {
      title: 'Resident Safety & SOS',
      desc: 'Instant QR code visitor authorization at gates and a dedicated Double-Confirmation Emergency SOS button alerting wardens and family.',
      icon: Siren,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950'
    },
    {
      title: 'Deposit Security & Transparency',
      desc: 'Transparent security deposit holding in virtual escrow with structured damage checklists and itemized move-out deduction receipts.',
      icon: ShieldCheck,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950'
    },
    {
      title: 'Enterprise Architecture',
      desc: 'Engineered with React 19, strict TypeScript, Supabase/PostgreSQL schema, and bank-grade data encryption for sensitive KYC documents.',
      icon: Server,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950'
    }
  ];

  return (
    <div className="space-y-16 sm:space-y-24 py-12 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6 animate-fade-in">
      {/* 1. HERO STORY */}
      <section className="text-center space-y-5">
        <Badge variant="primary">About Urban Nest</Badge>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          Transforming Paying Guest Living <br className="hidden sm:inline" />
          Into a <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Modern Operating Platform</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Over 6 million students and working professionals in India reside in Paying Guest accommodations. For decades, PG operations relied on fragmented WhatsApp chats, paper registers, and delayed payments. Urban Nest was built to bring structure, dignity, and transparency to modern co-living.
        </p>
      </section>

      {/* 2. THE PROBLEM WE SOLVE */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4 border-rose-100 dark:border-rose-950 bg-rose-50/30 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            The Old Way of PG Management
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <li>❌ <strong>Paper Visitor Registers:</strong> Unverified phone numbers and security risks at building gates.</li>
            <li>❌ <strong>Manual UPI Screenshots:</strong> Hours wasted every month matching bank statements to resident names.</li>
            <li>❌ <strong>Untracked Maintenance:</strong> Verbal complaints forgotten or delayed without accountability.</li>
            <li>❌ <strong>Deposit Disputes:</strong> Opaque move-out deductions causing friction between owners and residents.</li>
          </ul>
        </Card>

        <Card className="p-6 space-y-4 border-emerald-100 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            The Urban Nest Operating System
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <li>✅ <strong>Encrypted QR Gate Passes:</strong> Instant digital authorization with time-stamped entry/exit logs.</li>
            <li>✅ <strong>Server-Verified Ledger:</strong> Automated reminders, Razorpay/UPI reconciliation, and instant PDF receipts.</li>
            <li>✅ <strong>Live Ticket SLAs:</strong> Maintenance requests with photo attachments and technician status timelines.</li>
            <li>✅ <strong>Itemized Deposit Settlement:</strong> Documented room inspection checklist and escrow tracking.</li>
          </ul>
        </Card>
      </section>

      {/* 3. CORE PILLARS */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="purple">Engineering Excellence</Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Built on Four Foundational Pillars
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card key={pillar.title} className="p-6 space-y-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${pillar.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{pillar.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{pillar.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. SECURITY & PRIVACY */}
      <section className="p-8 rounded-3xl bg-slate-900 text-white space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Privacy & Security by Design</h3>
            <p className="text-xs text-slate-400">Compliant with the Digital Personal Data Protection (DPDP) Act</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
            <p className="font-bold text-white">Encrypted KYC Vault</p>
            <p className="text-slate-400">Aadhaar and PAN documents stored with role-based access control.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
            <p className="font-bold text-white">No Sensitive QR Exposure</p>
            <p className="text-slate-400">Gate QR passes contain opaque tokens verified only against secure server APIs.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
            <p className="font-bold text-white">Immutable Audit Logs</p>
            <p className="text-slate-400">All administrative approvals and financial edits are logged with timestamps.</p>
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="text-center space-y-4 pt-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Experience the Software Live</h3>
        <div className="flex justify-center gap-3">
          <Link to="/owner/dashboard">
            <Button variant="primary" size="md">
              Test Owner Portal Demo
            </Button>
          </Link>
          <Link to="/resident/dashboard">
            <Button variant="outline" size="md">
              Test Resident Portal Demo
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
