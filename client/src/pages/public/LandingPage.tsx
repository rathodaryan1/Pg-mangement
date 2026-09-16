import React from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  Building2,
  ShieldCheck,
  CreditCard,
  UserCheck,
  Wrench,
  QrCode,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Zap,
  Users,
  Clock,
  FileCheck,
  Star,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/Badge';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-20 sm:space-y-28 pb-20 animate-fade-in overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 sm:pt-20 pb-12 overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/15 to-purple-600/15 blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-xs font-semibold text-blue-700 dark:text-blue-300 shadow-sm animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Next-Gen Operating Platform for PG & Co-Living Communities</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Run Your PG Operations on <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Autopilot with Urban Nest
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            A centralized platform connecting <strong>PG Owners</strong> and <strong>Residents</strong>. Replace paper registers, manual UPI reconciliation, and unverified visitors with real-time digital workflows.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link to="/owner/dashboard">
              <Button
                variant="primary"
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 px-6 font-bold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Launch Owner Portal
              </Button>
            </Link>

            <Link to="/resident/dashboard">
              <Button
                variant="outline"
                size="lg"
                className="px-6 font-bold text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 hover:bg-purple-50"
                leftIcon={<UserCheck className="w-4 h-4 text-purple-600" />}
              >
                Explore Resident Portal
              </Button>
            </Link>

            <Link to="/pricing">
              <Button variant="ghost" size="lg" className="text-slate-600 dark:text-slate-400">
                View Pricing Plans
              </Button>
            </Link>
          </div>

          {/* Micro Trust Indicators */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant Setup in 5 Mins
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Digital QR Gate Security
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automated Rent Collection
            </span>
          </div>
        </div>

        {/* Interactive Dashboard Sneak Peek Card */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12">
          <div className="p-3 sm:p-4 rounded-3xl bg-slate-900/5 dark:bg-white/5 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-xl">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 sm:p-6 space-y-6">
              {/* Fake Mac Window Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-slate-400">urbannest.app/owner/dashboard</span>
                </div>
                <Badge variant="success">LIVE CLOUD SYSTEM</Badge>
              </div>

              {/* Sample Mini Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Live Occupancy</span>
                  <p className="text-xl font-extrabold text-blue-600 mt-1">86.1%</p>
                  <span className="text-[10px] text-slate-500">31/36 Beds Filled</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Revenue</span>
                  <p className="text-xl font-extrabold text-emerald-600 mt-1">₹5,58,000</p>
                  <span className="text-[10px] text-slate-500">+8.1% vs last mo</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">QR Gate Passes</span>
                  <p className="text-xl font-extrabold text-purple-600 mt-1">12 Active</p>
                  <span className="text-[10px] text-slate-500">Auto Security Verified</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Open Tickets</span>
                  <p className="text-xl font-extrabold text-amber-600 mt-1">2 Pending</p>
                  <span className="text-[10px] text-slate-500">Avg 14 min resolve</span>
                </div>
              </div>

              {/* Sample Room & Bed Grid Visual Demo */}
              <div className="text-left space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Interactive Bed Matrix Preview
                  </h4>
                  <Link to="/owner/rooms" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                    Open Full Matrix <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-medium flex items-center justify-between">
                    <span>Room 101-A</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200">Aarav M. (Occupied)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-medium flex items-center justify-between">
                    <span>Room 101-B</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200">Rohan G. (Occupied)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium flex items-center justify-between">
                    <span>Room 102-C</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800">Available Bed</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-medium flex items-center justify-between">
                    <span>Room 301-A</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">Maintenance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE COMPLETE LIFECYCLE ENGINE */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="primary">End-To-End Workflows</Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            The Complete Resident Lifecycle Engine
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            From the minute a resident inquires to their final security deposit settlement, every interaction is tracked and automated.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-4 hover:shadow-lg transition-all border-blue-100 dark:border-blue-900/40">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Smart Move-In & KYC</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Digital Aadhaar and PAN verification, digital lease agreement contract signing, and automatic bed matrix allocation in under 3 minutes.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
              <span>Zero paper agreements</span>
            </div>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-all border-purple-100 dark:border-purple-900/40">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">2. QR Gate Pass & Visitors</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Residents request guest passes through their phone. Owners/wardens approve with 1 click to generate encrypted time-limited QR codes.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-purple-600 font-semibold">
              <span>100% visitor accountability</span>
            </div>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-all border-emerald-100 dark:border-emerald-900/40">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Rent Ledger & Deposits</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Automated WhatsApp reminders on the 1st of every month, instant UPI/Card payments, automated PDF tax receipts, and escrow deposit tracking.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <span>Eliminate payment follow-ups</span>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. OWNER VS RESIDENT COMPARISON */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white relative overflow-hidden space-y-8">
          <div className="max-w-2xl space-y-3">
            <Badge variant="purple">Dual-Experience Architecture</Badge>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Two Tailored Portals. One United Brain.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Unlike generic property software, Urban Nest gives owners high-density financial analytics while giving residents a sleek mobile dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Owner Box */}
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">For Owners & Managers</span>
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold">The Complete PG Command Center</h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  Visual multi-property Room & Bed occupancy matrix
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  Automated overdue rent fines & payment verification ledger
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  Staff shift rosters, tasks & housekeeping assignments
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  Asset inventory tracking with warranty alerts
                </li>
              </ul>
              <Link to="/owner/dashboard" className="block pt-2">
                <Button variant="primary" size="sm" className="w-full justify-center">
                  Explore Owner Dashboard
                </Button>
              </Link>
            </div>

            {/* Resident Box */}
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">For PG Residents</span>
                <UserCheck className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold">The Seamless Living Experience</h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  Instant rent payments via UPI / Cards with instant PDF receipts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  Digital QR gate passes for visiting friends & deliveries
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  Raise maintenance tickets & track live resolution timeline
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  One-tap Emergency SOS alert to warden & emergency contacts
                </li>
              </ul>
              <Link to="/resident/dashboard" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full justify-center text-purple-300 border-purple-800 bg-purple-950/40">
                  Explore Resident Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. REAL METRICS / SOCIAL PROOF */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-blue-600">50,000+</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Beds Managed</p>
            <p className="text-[11px] text-slate-400">Across Bengaluru, Pune & Hyd</p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-emerald-600">99.4%</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">On-Time Rent Collection</p>
            <p className="text-[11px] text-slate-400">Via automated reminders</p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-purple-600">14 Min</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Avg Ticket Response</p>
            <p className="text-[11px] text-slate-400">Tracked with live SLAs</p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-amber-500">4.9 / 5</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Resident Rating</p>
            <p className="text-[11px] text-slate-400">Over 12,000+ reviews</p>
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIALS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="purple">Customer Stories</Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Loved by PG Owners & Residents Alike
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
              "Managing 3 properties in HSR Layout used to take 20 hours a week just verifying UPI screenshots. Urban Nest automated our collections and we have zero rent defaulters now."
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">Rajesh Sharma</p>
              <p className="text-slate-400">Owner, Urban Nest Pearl (120 Beds)</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
              "The QR gate pass feature is game-changing. Whenever my parents or friends visit, I create a pass on my phone and the security gate scans them in without any awkward questioning."
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">Aarav Mehta</p>
              <p className="text-slate-400">Resident & Software Engineer, Flipkart</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
              "When an AC stopped cooling in Room 101, I raised a ticket with a photo and within 2 hours the technician arrived with status updates live on my timeline. Unmatched transparency."
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">Rohan Gupta</p>
              <p className="text-slate-400">Resident, Koramangala Hub</p>
            </div>
          </Card>
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Ready to Upgrade Your PG Experience?
            </h2>
            <p className="text-xs sm:text-sm text-blue-200">
              Start your 14-day free trial or test out the live dual-role demonstration right now with zero installation.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
            <Link to="/owner/dashboard">
              <Button variant="primary" size="lg" className="bg-white text-blue-900 hover:bg-slate-100 font-bold px-6 shadow-md">
                Launch Owner Portal
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="border-blue-400/40 text-white hover:bg-blue-800/40 px-6 font-bold">
                View Pricing & ROI
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
