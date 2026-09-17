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
  Receipt,
  CheckCircle,
  FileCheck,
  Shield,
  Box,
  Users,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { UrbanNestLogo } from '../../components/ui/UrbanNestLogo';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-16 sm:space-y-24 pb-20 overflow-hidden text-left bg-[#FCFBF8]">
      {/* 1. HERO SECTION */}
      <section className="pt-10 sm:pt-16 pb-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#EAF2EE] border border-[#0B4036]/20 text-xs font-semibold text-[#0B4036]">
              <span className="w-2 h-2 rounded-full bg-[#0B4036]" />
              <span>Smart PG Management System</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#18231F] dark:text-white leading-[1.15]">
              Better managed spaces. <br className="hidden sm:inline" />
              <span className="text-[#0B4036]">Better living.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#68736D] font-normal leading-relaxed max-w-xl">
              Urban Nest brings residents, rooms, rent, visitors and everyday PG operations together in one simple platform designed for modern property managers.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/login">
                <Button
                  variant="primary"
                  size="lg"
                  className="font-semibold shadow-xs"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Get Started
                </Button>
              </Link>

              <Link to="/features">
                <Button variant="outline" size="lg" className="font-semibold border-[#DDE2DD] text-[#0B4036]">
                  Explore the Platform
                </Button>
              </Link>

              <Link to="/owner/dashboard">
                <Button variant="ghost" size="lg" className="text-[#68736D] font-medium hover:bg-[#EAF2EE]">
                  Live Demo
                </Button>
              </Link>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-[#68736D] border-t border-[#DDE2DD]">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#0B4036]" /> Bed-Level Matrix
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#0B4036]" /> QR Visitor Passes
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#0B4036]" /> Automated Invoicing
              </span>
            </div>
          </div>

          {/* Right Column: Realistic Product Dashboard Preview */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-xl border border-[#DDE2DD] shadow-sm overflow-hidden">
              {/* Topbar */}
              <div className="px-4 py-3 bg-[#F8F7F3] border-b border-[#DDE2DD] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-[#0B4036] text-white flex items-center justify-center font-bold text-[10px]">
                    UN
                  </div>
                  <span className="font-bold text-[#18231F]">Urban Nest Prime — Sector 3</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#0B4036] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#0B4036]" />
                  <span>Live Operations</span>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-4 divide-x divide-[#DDE2DD] border-b border-[#DDE2DD] bg-white">
                <div className="p-3">
                  <p className="text-[10px] text-[#8A928D] uppercase font-bold">Occupancy</p>
                  <p className="text-sm font-bold text-[#0B4036] mt-0.5">94.2%</p>
                  <p className="text-[10px] text-[#68736D]">45/48 Beds</p>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-[#8A928D] uppercase font-bold">Revenue</p>
                  <p className="text-sm font-bold text-[#18231F] mt-0.5">₹4.28L</p>
                  <p className="text-[10px] text-[#0B4036] font-semibold">Oct 2026</p>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-[#8A928D] uppercase font-bold">Pending</p>
                  <p className="text-sm font-bold text-[#B9954E] mt-0.5">₹24,000</p>
                  <p className="text-[10px] text-[#68736D]">2 residents</p>
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-[#8A928D] uppercase font-bold">Tickets</p>
                  <p className="text-sm font-bold text-[#18231F] mt-0.5">1 Open</p>
                  <p className="text-[10px] text-[#68736D]">SLA: Normal</p>
                </div>
              </div>

              {/* Room Bed Matrix Preview */}
              <div className="p-4 space-y-3 bg-[#FCFBF8]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#18231F] flex items-center gap-1.5">
                    <BedDouble className="w-3.5 h-3.5 text-[#0B4036]" /> Floor 2 — Room Matrix
                  </span>
                  <span className="text-[11px] text-[#8A928D]">8 Rooms · 16 Beds</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  {/* Room 201 */}
                  <div className="p-2.5 bg-white border border-[#DDE2DD] rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#18231F]">Room 201</span>
                      <span className="text-[10px] font-semibold text-[#8A928D]">Double</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <div className="p-1 rounded bg-[#EAF2EE] text-[#0B4036] flex items-center justify-between font-medium">
                        <span>Bed A</span>
                        <span className="text-[10px]">Occupied</span>
                      </div>
                      <div className="p-1 rounded bg-[#FAF5EB] text-[#B9954E] flex items-center justify-between border border-[#C8A45D]/30 font-semibold">
                        <span>Bed B</span>
                        <span className="text-[10px]">Available</span>
                      </div>
                    </div>
                  </div>

                  {/* Room 202 */}
                  <div className="p-2.5 bg-white border border-[#DDE2DD] rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#18231F]">Room 202</span>
                      <span className="text-[10px] font-semibold text-[#8A928D]">Double</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <div className="p-1 rounded bg-[#EAF2EE] text-[#0B4036] flex items-center justify-between font-medium">
                        <span>Bed A</span>
                        <span className="text-[10px]">Aakash V.</span>
                      </div>
                      <div className="p-1 rounded bg-[#EAF2EE] text-[#0B4036] flex items-center justify-between font-medium">
                        <span>Bed B</span>
                        <span className="text-[10px]">Priya K.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Receipts List */}
                <div className="pt-2">
                  <div className="bg-white border border-[#DDE2DD] rounded-lg overflow-hidden">
                    <div className="px-3 py-1.5 bg-[#F8F7F3] border-b border-[#DDE2DD] flex justify-between items-center text-[11px]">
                      <span className="font-bold text-[#18231F]">Recent Rent Receipts</span>
                      <span className="text-[#8A928D]">Oct 2026</span>
                    </div>
                    <div className="divide-y divide-[#DDE2DD] text-[11px]">
                      <div className="px-3 py-1.5 flex justify-between items-center">
                        <span className="font-semibold text-[#18231F]">Aakash Verma (Room 202)</span>
                        <span className="font-bold text-[#0B4036]">₹14,000</span>
                        <StatusBadge status="PAID" />
                      </div>
                      <div className="px-3 py-1.5 flex justify-between items-center">
                        <span className="font-semibold text-[#18231F]">Rohan Mehta (Room 104)</span>
                        <span className="font-bold text-[#0B4036]">₹12,000</span>
                        <StatusBadge status="PAID" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRODUCT OVERVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-1 mb-8 border-b border-[#DDE2DD] pb-4">
          <p className="text-xs font-bold text-[#0B4036] uppercase tracking-wider">One Platform. Everyday PG Operations.</p>
          <h2 className="text-2xl font-bold text-[#18231F]">
            Built for properties, staff, and residents
          </h2>
          <p className="text-xs text-[#68736D] max-w-2xl">
            Everything structured around operational clarity and high hospitality standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#18231F]">Multi-Building Hierarchy</h3>
            <p className="text-xs text-[#68736D] leading-relaxed">
              Organize multiple properties, buildings, floors, rooms, and individual bed inventories with live status tracking.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] text-[#B9954E] flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#18231F]">Automated Billing & Escrow</h3>
            <p className="text-xs text-[#68736D] leading-relaxed">
              Automate monthly rent cycle invoices, record manual UPI/cash receipts, and manage security deposits transparently.
            </p>
          </div>

          <div className="p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#18231F]">Digital QR Visitor Desk</h3>
            <p className="text-xs text-[#68736D] leading-relaxed">
              Residents generate encrypted visitor passes with QR codes verified at gate check-in for modern premises security.
            </p>
          </div>
        </div>
      </section>

      {/* 3. OPERATIONAL SECTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Module A: Room Hierarchy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold text-[#0B4036] uppercase tracking-wider">Visual Hierarchy</span>
            <h3 className="text-xl font-bold text-[#18231F]">
              Room & Bed Inventory Management
            </h3>
            <p className="text-xs text-[#68736D] leading-relaxed">
              Eliminate double bookings and manual register errors. Every room maintains distinct bed records with occupancy rates, base rents, and amenities.
            </p>
            <ul className="space-y-2 text-xs text-[#18231F]">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#0B4036] shrink-0" /> Floor-by-floor room configuration
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#0B4036] shrink-0" /> Bed-level rent and deposit tracking
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#0B4036] shrink-0" /> Fast status transitions: Available, Occupied, Maintenance
              </li>
            </ul>
          </div>

          <div className="p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-[#DDE2DD] text-xs">
              <span className="font-bold text-[#18231F]">Floor 3 Matrix</span>
              <span className="text-[#8A928D] font-mono">301 - 304</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border border-[#DDE2DD] bg-[#F8F7F3] space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-[#18231F]">Room 301</span>
                  <span className="text-[10px] text-[#8A928D]">Triple</span>
                </div>
                <div className="flex gap-1 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-[#EAF2EE] text-[#0B4036] font-medium">Bed A</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#EAF2EE] text-[#0B4036] font-medium">Bed B</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FAF5EB] text-[#B9954E] font-bold">Bed C</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-[#DDE2DD] bg-[#F8F7F3] space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-[#18231F]">Room 302</span>
                  <span className="text-[10px] text-[#8A928D]">Double</span>
                </div>
                <div className="flex gap-1 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-[#EAF2EE] text-[#0B4036] font-medium">Bed A</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#EAF2EE] text-[#0B4036] font-medium">Bed B</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Module B: Resident Lifecycle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-4">
          <div className="order-2 lg:order-1 p-4 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDE2DD] text-xs">
              <span className="font-bold text-[#18231F]">Resident Dossier: Aakash Verma</span>
              <StatusBadge status="ACTIVE" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-[#F8F7F3]">
                <p className="text-[10px] text-[#8A928D]">Assigned Bed</p>
                <p className="font-bold text-[#18231F] mt-0.5">Room 202 · Bed A</p>
              </div>
              <div className="p-2 rounded bg-[#F8F7F3]">
                <p className="text-[10px] text-[#8A928D]">Monthly Rent</p>
                <p className="font-bold text-[#0B4036] mt-0.5">₹14,000 / month</p>
              </div>
              <div className="p-2 rounded bg-[#F8F7F3]">
                <p className="text-[10px] text-[#8A928D]">Security Deposit</p>
                <p className="font-bold text-[#18231F] mt-0.5">₹28,000 (Held)</p>
              </div>
              <div className="p-2 rounded bg-[#F8F7F3]">
                <p className="text-[10px] text-[#8A928D]">KYC Status</p>
                <p className="font-bold text-[#0B4036] mt-0.5">Aadhaar Verified</p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-4">
            <span className="text-xs font-bold text-[#0B4036] uppercase tracking-wider">Resident Dossiers</span>
            <h3 className="text-xl font-bold text-[#18231F]">
              Complete Resident Lifecycle Management
            </h3>
            <p className="text-xs text-[#68736D] leading-relaxed">
              Onboard residents with digital KYC, store lease agreements, manage 30-day notice periods, and handle move-out deposit settlements cleanly.
            </p>
            <ul className="space-y-2 text-xs text-[#18231F]">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#0B4036] shrink-0" /> Digital Aadhaar verification & emergency records
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#0B4036] shrink-0" /> Notice period tracking with move-out checklists
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#0B4036] shrink-0" /> Itemized deposit deductions and refund receipts
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. BRAND STATEMENT SECTION: PEOPLE • PLACES • BETTER LIVING */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 bg-[#0B4036] text-white rounded-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-widest text-[#E8D7A8]">
            Brand Philosophy
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight max-w-2xl mx-auto">
            PEOPLE • PLACES • BETTER LIVING
          </h2>

          <p className="text-xs sm:text-sm text-[#EAF2EE] max-w-xl mx-auto leading-relaxed">
            We believe that well-managed properties create better communities. Urban Nest equips property owners with structured tools so residents can enjoy peaceful, organized living.
          </p>

          <div className="pt-2 flex justify-center">
            <Link to="/about">
              <Button variant="gold" size="md" className="font-bold">
                Read Our Story
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FINAL CALL TO ACTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5 pt-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#18231F]">
          Experience a better way to run your PG.
        </h2>
        <p className="text-xs sm:text-sm text-[#68736D] max-w-lg mx-auto">
          Start exploring Urban Nest today with pre-configured sample properties.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/login">
            <Button variant="primary" size="lg" className="font-bold shadow-xs">
              Sign In to Portal
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" size="lg" className="font-semibold border-[#DDE2DD] text-[#0B4036]">
              View Plans
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
