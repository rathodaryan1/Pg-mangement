import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Menu,
  X,
  UserCheck,
  CheckCircle2,
  Sparkles,
  LogIn
} from 'lucide-react';
import { Button } from '../ui/Button';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-black text-lg shadow-md group-hover:scale-105 transition-transform">
              UN
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                URBAN NEST
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                  SaaS
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">Smart PG Operating Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action Portal Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link to="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-slate-700 dark:text-slate-300"
                leftIcon={<LogIn className="w-3.5 h-3.5" />}
              >
                Sign In
              </Button>
            </Link>

            <Link to="/resident/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                leftIcon={<UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
              >
                Resident Portal
              </Button>
            </Link>

            <Link to="/owner/dashboard">
              <Button
                variant="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 shadow-sm font-bold"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Owner Portal
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 animate-fade-in shadow-xl">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold ${
                    location.pathname === link.path
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
              <Link to="/resident/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full text-purple-600 border-purple-200 justify-center">
                  Resident Portal Demo
                </Button>
              </Link>
              <Link to="/owner/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="sm" className="w-full justify-center font-bold">
                  Owner Portal Demo
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main className="flex-1">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Column 1: Brand Info */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
                  UN
                </div>
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">URBAN NEST</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The centralized Smart PG Operating Platform connecting PG Owners, Wardens, and Residents through unified digital workflows.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Bank-Grade Escrow & Data Privacy</span>
              </div>
            </div>

            {/* Column 2: Navigation Links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li><Link to="/" className="hover:text-blue-600">Home</Link></li>
                <li><Link to="/features" className="hover:text-blue-600">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-blue-600">Pricing & Plans</Link></li>
                <li><Link to="/about" className="hover:text-blue-600">About Platform</Link></li>
                <li><Link to="/contact" className="hover:text-blue-600">Contact & Support</Link></li>
              </ul>
            </div>

            {/* Column 3: Live Portals */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">Live Portals</h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li><Link to="/owner/dashboard" className="hover:text-blue-600 font-semibold">Owner / Admin Dashboard</Link></li>
                <li><Link to="/resident/dashboard" className="hover:text-purple-600 font-semibold">Resident Portal (with QR & SOS)</Link></li>
                <li><Link to="/owner/rooms" className="hover:text-blue-600">Visual Bed Matrix</Link></li>
                <li><Link to="/owner/visitors" className="hover:text-blue-600">QR Gate Passes</Link></li>
                <li><Link to="/login" className="hover:text-blue-600">Sign In</Link></li>
              </ul>
            </div>

            {/* Column 4: Contact & Locations */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">Headquarters</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Sector 3, 27th Main Rd, HSR Layout, Bengaluru, Karnataka 560102
              </p>
              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs">
                <span className="text-slate-400">Direct Support:</span>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">support@urbannest.in</p>
                <p className="text-slate-500 mt-0.5">+91 80 2572 8899</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2026 Urban Nest Technologies Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Security Audited</span>
              <span>•</span>
              <span>GDPR & DPDP Ready</span>
              <span>•</span>
              <span>Made with care for Modern Co-Living</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
