import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Zap,
  Building2,
  ShieldCheck,
  Calculator,
  ArrowRight,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const PricingPage: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [bedsCount, setBedsCount] = useState(40);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans = [
    {
      name: 'Starter PG',
      desc: 'Ideal for independent PG owners managing a single boutique building.',
      monthlyPrice: 1499,
      annualPrice: 1199,
      bedsLimit: 'Up to 25 Beds',
      propertiesLimit: '1 Property',
      popular: false,
      features: [
        'Visual Room & Bed Matrix',
        'Automated Rent Invoicing (WhatsApp)',
        'Basic Visitor Approval Log',
        'Standard Maintenance Ticketing',
        'Resident Mobile Web Portal',
        'Downloadable Payment Receipts',
        'Email Support'
      ]
    },
    {
      name: 'Pro Operator',
      desc: 'For growing co-living operators needing gate security & staff delegation.',
      monthlyPrice: 3999,
      annualPrice: 3199,
      bedsLimit: 'Up to 100 Beds',
      propertiesLimit: 'Up to 3 Properties',
      popular: true,
      badge: 'MOST POPULAR',
      features: [
        'Everything in Starter PG, plus:',
        'Digital QR Code Gate Security',
        'Double-Confirmation Emergency SOS',
        'Staff Roles, Shifts & Task Allocations',
        'Maintenance Ticket Timeline & SLAs',
        'Digital Lease Agreement E-Signing',
        'Security Deposit Escrow Ledger',
        'Asset & Inventory Warranty Tracking',
        'Priority Phone & WhatsApp Support'
      ]
    },
    {
      name: 'Enterprise Network',
      desc: 'Designed for large multi-city PG chains requiring advanced compliance & APIs.',
      monthlyPrice: 8999,
      annualPrice: 7199,
      bedsLimit: 'Unlimited Beds',
      propertiesLimit: 'Unlimited Properties',
      popular: false,
      features: [
        'Everything in Pro Operator, plus:',
        'Multi-City Property Switcher',
        'Custom Domain & Brand Whitelabel',
        'Direct Razorpay / Payment Gateway Key Integration',
        'Automated Biometric Fingerprint API Sync',
        'Immutable Security Audit Trail Logs',
        'Automated Daily Cloud Backups',
        'Dedicated Technical Account Manager',
        '99.9% Uptime SLA Guarantee'
      ]
    }
  ];

  const faqs = [
    {
      q: 'Do I need special hardware to scan QR Gate Passes at our PG?',
      a: 'No! Any smartphone or tablet with a standard camera can scan and verify Urban Nest visitor passes directly in the browser with zero hardware investment.'
    },
    {
      q: 'How does the rent collection & payment verification work?',
      a: 'Residents can pay via UPI, NetBanking, or Cards. Urban Nest verifies payments server-side and automatically updates the ledger and issues instant branded tax receipts to residents.'
    },
    {
      q: 'Can I switch or upgrade plans as our bed count grows?',
      a: 'Yes, you can upgrade or modify your plan instantly. Your billing will automatically be prorated with zero disruption to active resident data.'
    },
    {
      q: 'Is resident KYC and Aadhaar data securely stored?',
      a: 'Absolutely. All sensitive documents are encrypted at rest and in transit in compliance with Indian DPDP Act standards. Only authorized PG admins have role-gated access.'
    }
  ];

  // ROI estimation
  const hoursSaved = Math.round(bedsCount * 0.4);
  const revenueLeakageSaved = Math.round(bedsCount * 350);

  return (
    <div className="space-y-16 sm:space-y-24 py-12 sm:py-16 max-w-6xl mx-auto px-4 sm:px-6 animate-fade-in">
      {/* 1. HEADER & BILLING TOGGLE */}
      <section className="text-center space-y-4">
        <Badge variant="primary">Transparent Commercial Pricing</Badge>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          Simple, Predictable Plans for <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Every PG Scale</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          No hidden fees per transaction. Pick a plan scaled to your bed capacity and unlock complete operational automation.
        </p>

        {/* Monthly / Annual Switcher */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold ${!isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            Monthly Billing
          </span>
          <button
            type="button"
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-blue-600 focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isAnnual ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${isAnnual ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            Annual Billing
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              SAVE 20%
            </span>
          </span>
        </div>
      </section>

      {/* 2. PRICING CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => {
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

          return (
            <Card
              key={plan.name}
              className={`p-6 sm:p-8 flex flex-col justify-between relative transition-all ${
                plan.popular
                  ? 'border-2 border-blue-600 dark:border-blue-500 shadow-xl ring-4 ring-blue-50 dark:ring-blue-950/40 bg-white dark:bg-slate-900'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white font-black text-[10px] tracking-wider shadow-md">
                  {plan.badge}
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">{plan.desc}</p>
                </div>

                <div className="py-2 border-y border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ month</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isAnnual ? 'Billed annually (₹' + (price * 12).toLocaleString('en-IN') + '/yr)' : 'Billed monthly'}
                  </p>
                </div>

                <div className="space-y-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <p>• {plan.bedsLimit}</p>
                  <p>• {plan.propertiesLimit}</p>
                </div>

                {/* Features list */}
                <div className="space-y-2.5 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">What's Included</p>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <Link to="/owner/dashboard" className="block">
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    size="md"
                    className="w-full justify-center font-bold"
                  >
                    Start 14-Day Free Trial
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </section>

      {/* 3. INTERACTIVE ROI CALCULATOR */}
      <section className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <Badge variant="purple">ROI Estimator</Badge>
            <h3 className="text-xl sm:text-2xl font-bold">Calculate Your Monthly Time & Money Saved</h3>
          </div>
          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400">Selected Capacity:</span>
            <p className="text-xl font-bold text-blue-400">{bedsCount} Active PG Beds</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-300">Slide to adjust your PG bed count:</label>
          <input
            type="range"
            min={10}
            max={300}
            step={5}
            value={bedsCount}
            onChange={(e) => setBedsCount(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>10 Beds (Single PG)</span>
            <span>150 Beds (Medium Hub)</span>
            <span>300+ Beds (Multi-Property)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Admin Hours Saved</span>
              <p className="text-2xl font-black text-white">{hoursSaved} Hours / Month</p>
              <p className="text-[11px] text-slate-400">Zero manual rent calls & paperwork</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Recovered Rent Leakage</span>
              <p className="text-2xl font-black text-emerald-400">₹{revenueLeakageSaved.toLocaleString('en-IN')} / Month</p>
              <p className="text-[11px] text-slate-400">Eliminating unbilled days & late fines</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FAQS */}
      <section className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="purple">Got Questions?</Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
