import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  bedLimit: string;
  popular?: boolean;
  features: string[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Essential management for single-location PGs and boutique hostels.',
    priceMonthly: 1499,
    priceAnnual: 1199,
    bedLimit: 'Up to 50 Beds',
    features: [
      '1 Property Location',
      'Bed-level room matrix',
      'Resident KYC & Onboarding',
      'Automated rent invoice generation',
      'Manual payment recording (UPI/Cash)',
      'Digital visitor QR gate passes',
      'Maintenance ticket tracker',
      'Standard email support'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Complete operating system for growing multi-property PG businesses.',
    priceMonthly: 3999,
    priceAnnual: 3199,
    bedLimit: 'Up to 250 Beds',
    popular: true,
    features: [
      'Up to 5 Property Locations',
      'Multi-building & floor hierarchy',
      'Full resident lifecycle & move-out settlement',
      'Escrow security deposit ledger',
      'Operating expense tracking & vendor reports',
      'Staff shift & duty assignment',
      'Asset & consumables inventory tracking',
      'Financial & occupancy analytics export',
      'Priority phone & WhatsApp support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom infrastructure for large co-living chains and student housing.',
    priceMonthly: 8999,
    priceAnnual: 7199,
    bedLimit: 'Unlimited Beds',
    features: [
      'Unlimited Property Locations',
      'Custom role-based permissions & audit trails',
      'Automated payment gateway integration (Razorpay)',
      'Custom lease agreement contract generation',
      'Dedicated account manager',
      'Custom ERP & accounting exports',
      '99.9% uptime SLA guarantee',
      'On-site staff training'
    ]
  }
];

const COMPARISON_FEATURES = [
  {
    category: 'Capacity & Structure',
    items: [
      { name: 'Bed Limit', starter: '50 Beds', growth: '250 Beds', enterprise: 'Unlimited' },
      { name: 'Properties', starter: '1 Property', growth: 'Up to 5', enterprise: 'Unlimited' },
      { name: 'Floor & Room Hierarchy', starter: true, growth: true, enterprise: true }
    ]
  },
  {
    category: 'Finance & Billing',
    items: [
      { name: 'Automated Rent Invoicing', starter: true, growth: true, enterprise: true },
      { name: 'Security Deposit Ledger', starter: 'Basic', growth: 'Advanced Escrow', enterprise: 'Multi-Account' },
      { name: 'Operating Expense Tracking', starter: false, growth: true, enterprise: true },
      { name: 'Online Payment Gateway', starter: false, growth: 'Add-on', enterprise: true },
      { name: 'CSV & Excel Financial Export', starter: 'Monthly', growth: 'Real-time', enterprise: 'Custom API' }
    ]
  },
  {
    category: 'Operations & Security',
    items: [
      { name: 'QR Visitor Gate Pass Desk', starter: true, growth: true, enterprise: true },
      { name: 'Emergency SOS Broadcast', starter: true, growth: true, enterprise: true },
      { name: 'Maintenance Ticket Desk', starter: true, growth: true, enterprise: true },
      { name: 'Staff Management & Shifts', starter: false, growth: true, enterprise: true },
      { name: 'Inventory & Consumables Tracking', starter: false, growth: true, enterprise: true },
      { name: 'Immutable Audit Logs', starter: '7 Days', growth: '90 Days', enterprise: '1 Year' }
    ]
  }
];

const FAQS = [
  {
    q: 'Can I upgrade my plan as my PG expands?',
    a: 'Yes, you can upgrade your plan anytime with prorated billing. Your bed allocation limits and multi-property features will unlock instantly.'
  },
  {
    q: 'Is there any setup or onboarding fee?',
    a: 'No setup fees. You can start with our Starter or Growth plan immediately. For Enterprise setups, our team provides complimentary database onboarding.'
  },
  {
    q: 'Do residents need to download an app?',
    a: 'No. Urban Nest includes a progressive web app (PWA) resident portal that works on any smartphone browser with zero friction.'
  },
  {
    q: 'How is data privacy handled for resident KYC?',
    a: 'All resident government documents and contact records are encrypted with bank-grade security complying with Indian DPDP standards.'
  }
];

export const PricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <div className="space-y-16 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Commercial Pricing</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Simple, predictable pricing for your PG
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Choose the plan that fits your property portfolio. No hidden commissions or charges.
        </p>

        {/* Billing Switcher */}
        <div className="pt-2 flex items-center justify-center gap-2">
          <div className="inline-flex p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRICING_TIERS.map((tier) => {
          const price = billingCycle === 'annual' ? tier.priceAnnual : tier.priceMonthly;
          return (
            <div
              key={tier.id}
              className={`p-6 rounded-xl border flex flex-col justify-between transition-all ${
                tier.popular
                  ? 'bg-white dark:bg-slate-900 border-blue-600 shadow-sm ring-1 ring-blue-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{tier.name}</h3>
                  {tier.popular && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Most Popular
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">{tier.description}</p>

                <div className="pt-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <p className="text-[11px] font-semibold text-blue-600 mt-1">{tier.bedLimit}</p>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    Included Features:
                  </p>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs leading-tight">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6">
                <Link to="/login">
                  <Button
                    variant={tier.popular ? 'primary' : 'outline'}
                    size="md"
                    className="w-full font-semibold"
                  >
                    Start with {tier.name}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="space-y-6 pt-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Detailed Plan Comparison</h2>
          <p className="text-xs text-slate-500">Compare operational capabilities across Urban Nest tiers.</p>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="p-3.5 font-semibold text-slate-900 dark:text-white w-1/3">Feature</th>
                <th className="p-3.5 font-semibold text-center">Starter</th>
                <th className="p-3.5 font-semibold text-center text-blue-600">Growth</th>
                <th className="p-3.5 font-semibold text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {COMPARISON_FEATURES.map((cat, catIdx) => (
                <React.Fragment key={catIdx}>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                    <td colSpan={4} className="px-3.5 py-2 font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {cat.category}
                    </td>
                  </tr>
                  {cat.items.map((item, iIdx) => (
                    <tr key={iIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                      <td className="px-3.5 py-2.5 text-center text-slate-600 dark:text-slate-400">
                        {typeof item.starter === 'boolean' ? (
                          item.starter ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : '—'
                        ) : (
                          item.starter
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-medium text-slate-800 dark:text-slate-200">
                        {typeof item.growth === 'boolean' ? (
                          item.growth ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : '—'
                        ) : (
                          item.growth
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-600 dark:text-slate-400">
                        {typeof item.enterprise === 'boolean' ? (
                          item.enterprise ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : '—'
                        ) : (
                          item.enterprise
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-500">Quick answers about billing, security, and setup.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
