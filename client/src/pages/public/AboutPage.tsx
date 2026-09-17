import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, Target, Users, Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-16 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
      {/* Header */}
      <div className="max-w-3xl space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">About Urban Nest</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Building software for the modern co-living and PG ecosystem
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Urban Nest is a centralized property operating platform connecting PG owners, wardens, security staff, and residents through structured digital workflows.
        </p>
      </div>

      {/* Problem & Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold">
            <Target className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">The Problem We Solve</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            For years, PG operations in urban hubs like Bengaluru, Pune, and NCR have relied on disjointed spreadsheets, paper entry registers, manual UPI screenshots on WhatsApp, and unorganized maintenance requests. This leads to revenue leakage, disputed security deposits, and compromised gate security.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Our Product Philosophy</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            We believe commercial property software should be fast, data-focused, and operational. We prioritize crisp tables, accurate bed-level inventory, structured maintenance lifecycles, and cryptographic QR gate passes over flashy decorative elements.
          </p>
        </div>
      </div>

      {/* Who It Is For */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Who Urban Nest is Built For</h2>
          <p className="text-xs text-slate-500">Tailored experiences for every role in the property ecosystem.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">PG Owners & Operators</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Track multi-building occupancy, automated rent billing, expense accounting, and overall profitability from a single command dashboard.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">Wardens & Facility Staff</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Manage daily check-ins, verify resident documents, handle maintenance work orders, and coordinate cleaning schedules.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600">Residents</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Enjoy a seamless living experience with instant rent payment receipts, self-service QR visitor passes, ticket tracking, and emergency SOS.
            </p>
          </div>
        </div>
      </div>

      {/* Security & Reliability */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Enterprise Trust & Privacy
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Bank-grade encryption for all KYC identity proofs & agreements.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Immutable audit logs tracking all administrative actions.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Zero resident data sharing across different property organizations.</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-8 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-base font-bold">Experience the software in action</h3>
          <p className="text-xs text-slate-400">Test all owner and resident workflows in our live demo sandbox.</p>
        </div>
        <Link to="/owner/dashboard">
          <Button variant="primary" size="md" className="font-semibold">
            Launch Owner Portal
          </Button>
        </Link>
      </div>
    </div>
  );
};
