import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  BedDouble,
  Users,
  CreditCard,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  QrCode,
  Sparkles,
  Layers,
  Smartphone,
  BarChart3,
  KeyRound,
  ShieldAlert,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const SolutionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'multi' | 'residents'>('single');

  return (
    <div className="space-y-16 sm:space-y-20 py-10 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left bg-[#FCFBF8]">
      {/* 1. Header Hero */}
      <div className="max-w-3xl space-y-3 border-b border-[#DDE2DD] pb-8">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#EAF2EE] border border-[#0B4036]/20 text-xs font-semibold text-[#0B4036]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tailored Property Operations</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#18231F]">
          Solutions built for modern PG living
        </h1>
        <p className="text-sm text-[#68736D] leading-relaxed">
          From independent single-building PG owners to growing multi-branch portfolios and everyday residents, Urban Nest delivers a purpose-built operating workflow.
        </p>
      </div>

      {/* 2. Audience Selector Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-[#F8F7F3] border border-[#DDE2DD] rounded-xl max-w-2xl">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-xs font-semibold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'single'
              ? 'bg-[#0B4036] text-white shadow-xs'
              : 'text-[#68736D] hover:text-[#18231F] hover:bg-white/60'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Single PG Owners
        </button>

        <button
          onClick={() => setActiveTab('multi')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-xs font-semibold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'multi'
              ? 'bg-[#0B4036] text-white shadow-xs'
              : 'text-[#68736D] hover:text-[#18231F] hover:bg-white/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Multi-Branch Chains
        </button>

        <button
          onClick={() => setActiveTab('residents')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-xs font-semibold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'residents'
              ? 'bg-[#0B4036] text-white shadow-xs'
              : 'text-[#68736D] hover:text-[#18231F] hover:bg-white/60'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Resident Experience
        </button>
      </div>

      {/* 3. Active Solution Breakdown */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B4036]">For Standalone PGs & Hostels</span>
              <h2 className="text-2xl font-bold text-[#18231F]">End the manual register & WhatsApp chaos</h2>
              <p className="text-xs sm:text-sm text-[#68736D] leading-relaxed">
                Replace unorganized paper ledgers, lost deposit receipts, and awkward payment follow-up chats with one clean dashboard accessible from your phone or laptop.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
                  <BedDouble className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">Live Bed Matrix</h3>
                <p className="text-xs text-[#68736D]">
                  Know exactly which bed in room 102 is vacant, reserved, or occupied with zero guesswork.
                </p>
              </div>

              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">Auto Rent Tracking</h3>
                <p className="text-xs text-[#68736D]">
                  System automatically generates rent due notifications and records UPI/cash settlements with instant receipts.
                </p>
              </div>

              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">Digital KYC Vault</h3>
                <p className="text-xs text-[#68736D]">
                  Collect Aadhaar, college/work ID, and emergency contact details securely prior to key handover.
                </p>
              </div>

              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">QR Security Gate Desk</h3>
                <p className="text-xs text-[#68736D]">
                  Warden and gate guard verify visitor entry and outstation leave passes in under 5 seconds.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-6 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18231F]">Owner Quick Workflow</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD]/60">
                <span className="w-5 h-5 rounded-full bg-[#0B4036] text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                <div>
                  <p className="font-bold text-[#18231F]">Add Floors & Rooms</p>
                  <p className="text-[#68736D] mt-0.5">Map double & triple sharing layouts in under 2 minutes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD]/60">
                <span className="w-5 h-5 rounded-full bg-[#0B4036] text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                <div>
                  <p className="font-bold text-[#18231F]">Onboard Residents</p>
                  <p className="text-[#68736D] mt-0.5">Residents receive SMS login links and upload their ID proofs.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD]/60">
                <span className="w-5 h-5 rounded-full bg-[#0B4036] text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                <div>
                  <p className="font-bold text-[#18231F]">Collect Rent & Automate Ops</p>
                  <p className="text-[#68736D] mt-0.5">Daily automated audit trails, complaint escalation, and profit ledger.</p>
                </div>
              </div>
            </div>

            <Link to="/login" className="block pt-2">
              <Button variant="primary" size="md" className="w-full justify-center">
                Launch Owner Demo Portal
              </Button>
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'multi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B4036]">For Co-Living Operators & PG Chains</span>
              <h2 className="text-2xl font-bold text-[#18231F]">Portfolio oversight across 5 to 50+ branches</h2>
              <p className="text-xs sm:text-sm text-[#68736D] leading-relaxed">
                Gain instant visibility over portfolio-wide bed occupancy, rent collection rates, property manager performance, and operational expenses in one executive cockpit.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] text-[#B9954E] flex items-center justify-center font-bold">
                  <BarChart3 className="w-4 h-4 text-[#C8A45D]" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">Portfolio Analytics</h3>
                <p className="text-xs text-[#68736D]">
                  Compare occupancy rates, average revenue per bed, and overdue rent across different properties.
                </p>
              </div>

              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] text-[#B9954E] flex items-center justify-center font-bold">
                  <Users className="w-4 h-4 text-[#C8A45D]" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">Role-Based Staff Access</h3>
                <p className="text-xs text-[#68736D]">
                  Assign granular warden, accountant, and security access with strict property branch scoping.
                </p>
              </div>

              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] text-[#B9954E] flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4 text-[#C8A45D]" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">Centralized SLA Ticketing</h3>
                <p className="text-xs text-[#68736D]">
                  Track maintenance turnaround times across plumbing, Wi-Fi, and electrical vendors.
                </p>
              </div>

              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] text-[#B9954E] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#C8A45D]" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">Audit Logs & Compliance</h3>
                <p className="text-xs text-[#68736D]">
                  Every bed assignment, payment entry, and deposit deduction is logged with timestamp and user attribution.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-6 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18231F]">Enterprise Security & Scale</h3>
            <ul className="space-y-2.5 text-xs text-[#68736D]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0B4036] shrink-0" />
                <span>Unlimited rooms, beds, and property branches</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0B4036] shrink-0" />
                <span>Custom billing cycle rules & late penalty policies</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0B4036] shrink-0" />
                <span>Exportable CSV reports for monthly tax filing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0B4036] shrink-0" />
                <span>Dedicated account manager with SLA onboarding</span>
              </li>
            </ul>

            <Link to="/contact" className="block pt-2">
              <Button variant="primary" size="md" className="w-full justify-center">
                Contact Enterprise Sales
              </Button>
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'residents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B4036]">For Paying Guests & Co-Living Residents</span>
              <h2 className="text-2xl font-bold text-[#18231F]">A modern, dignified hospitality experience</h2>
              <p className="text-xs sm:text-sm text-[#68736D] leading-relaxed">
                Residents get a dedicated self-service mobile portal for transparent rent receipts, zero-friction visitor passes, and direct warden communication.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">Direct Rent Invoices</h3>
                <p className="text-xs text-[#68736D]">
                  View exact monthly rent breakdowns, due dates, and download official PDF receipts anytime.
                </p>
              </div>

              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">Digital Visitor Passes</h3>
                <p className="text-xs text-[#68736D]">
                  Pre-approve friends or family with a time-bound QR code for contact-free security check-in.
                </p>
              </div>

              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">Room Repair Tickets</h3>
                <p className="text-xs text-[#68736D]">
                  Report AC or plumbing issues in 3 clicks and track technician repair timeline in real time.
                </p>
              </div>

              <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#18231F]">24x7 Emergency SOS</h3>
                <p className="text-xs text-[#68736D]">
                  One-tap distress signal dispatched immediately to on-duty warden and security team.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-6 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#18231F]">Resident App Perks</h3>
            <div className="space-y-2.5 text-xs text-[#68736D]">
              <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD]/60">
                <p className="font-bold text-[#18231F]">Zero Paperwork Onboarding</p>
                <p className="text-[#68736D] mt-0.5">Upload KYC and sign lease agreement directly on your mobile device.</p>
              </div>
              <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD]/60">
                <p className="font-bold text-[#18231F]">Notice & Outstation Leave</p>
                <p className="text-[#68736D] mt-0.5">Apply for home visits or 30-day move-out notice with automated approval status.</p>
              </div>
            </div>

            <Link to="/resident/dashboard" className="block pt-2">
              <Button variant="primary" size="md" className="w-full justify-center">
                Explore Resident Portal
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 4. Bottom CTA */}
      <div className="p-8 bg-[#0B4036] text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">Ready to modernize your PG operations?</h3>
          <p className="text-xs text-slate-200">
            Get started with Urban Nest today and experience organized property living.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/pricing">
            <Button variant="gold" size="md">
              View Pricing
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline" size="md" className="!bg-transparent !border-white/30 !text-white hover:!bg-white/10">
              Talk to Specialist
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
