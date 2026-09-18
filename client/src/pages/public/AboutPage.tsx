import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, Target, Users, Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-16 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left bg-[#FCFBF8]">
      {/* Header */}
      <div className="max-w-3xl space-y-3 border-b border-[#DDE2DD] pb-6">
        <span className="text-xs font-semibold text-[#0B4036] uppercase tracking-wider">About Urban Nest</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#18231F]">
          Building software for the modern co-living and PG ecosystem
        </h1>
        <p className="text-xs sm:text-sm text-[#68736D] leading-relaxed">
          Urban Nest is a centralized property operating platform connecting PG owners, wardens, security staff, and residents through structured digital workflows.
        </p>
      </div>

      {/* Problem & Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Target className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-[#18231F]">The Problem We Solve</h2>
          <p className="text-xs text-[#68736D] leading-relaxed">
            For years, PG operations in urban hubs like Ahmedabad, Pune, and NCR have relied on disjointed spreadsheets, paper entry registers, manual UPI screenshots on WhatsApp, and unorganized maintenance requests. This leads to revenue leakage, disputed security deposits, and compromised gate security.
          </p>
        </div>

        <div className="p-6 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-3">
          <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-[#18231F]">Our Product Philosophy</h2>
          <p className="text-xs text-[#68736D] leading-relaxed">
            We believe commercial property software should be fast, data-focused, and operational. We prioritize crisp tables, accurate bed-level inventory, structured maintenance lifecycles, and cryptographic QR gate passes over flashy decorative elements.
          </p>
        </div>
      </div>

      {/* Who It Is For */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#18231F]">Who Urban Nest is Built For</h2>
          <p className="text-xs text-[#68736D]">Tailored experiences for every role in the property ecosystem.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B4036]">PG Owners & Operators</h3>
            <p className="text-xs text-[#68736D] leading-relaxed">
              Track multi-building occupancy, automated rent billing, expense accounting, and overall profitability from a single command dashboard.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B4036]">Wardens & Facility Staff</h3>
            <p className="text-xs text-[#68736D] leading-relaxed">
              Manage daily check-ins, verify resident documents, handle maintenance work orders, and coordinate cleaning schedules.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B4036]">Residents</h3>
            <p className="text-xs text-[#68736D] leading-relaxed">
              Enjoy a seamless living experience with instant rent payment receipts, self-service QR visitor passes, ticket tracking, and emergency SOS.
            </p>
          </div>
        </div>
      </div>

      {/* Security & Reliability */}
      <div className="p-6 bg-[#F8F7F3] border border-[#DDE2DD] rounded-2xl space-y-3">
        <h2 className="text-sm font-bold text-[#18231F] uppercase tracking-wider">
          Enterprise Trust & Privacy
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#68736D]">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0B4036] shrink-0 mt-0.5" />
            <span>Bank-grade encryption for all KYC identity proofs & agreements.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0B4036] shrink-0 mt-0.5" />
            <span>Immutable audit logs tracking all administrative actions.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0B4036] shrink-0 mt-0.5" />
            <span>Zero resident data sharing across different property organizations.</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-8 bg-[#0B4036] text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-base font-bold">Experience the software in action</h3>
          <p className="text-xs text-[#EAF2EE]">Test all owner and resident workflows in our live demo sandbox.</p>
        </div>
        <Link to="/owner/dashboard">
          <Button variant="gold" size="md" className="font-bold">
            Launch Owner Portal
          </Button>
        </Link>
      </div>
    </div>
  );
};
