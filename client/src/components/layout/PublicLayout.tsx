import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  Menu,
  X,
  UserCheck,
  LogIn
} from 'lucide-react';
import { Button } from '../ui/Button';
import { UrbanNestLogo } from '../ui/UrbanNestLogo';

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
    <div className="min-h-screen bg-[#FCFBF8] text-[#18231F] flex flex-col selection:bg-[#0B4036] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#DDE2DD] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center group py-2">
            <UrbanNestLogo variant="horizontal" size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#EAF2EE] text-[#0B4036]'
                      : 'text-[#68736D] hover:text-[#18231F] hover:bg-[#F8F7F3]'
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
                className="text-xs font-semibold text-[#18231F] hover:text-[#0B4036]"
                leftIcon={<LogIn className="w-3.5 h-3.5 text-[#0B4036]" />}
              >
                Sign In
              </Button>
            </Link>

            <Link to="/resident/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-[#0B4036] font-semibold border-[#DDE2DD] bg-[#FCFBF8] hover:bg-[#EAF2EE]"
                leftIcon={<UserCheck className="w-3.5 h-3.5 text-[#C8A45D]" />}
              >
                Resident Portal
              </Button>
            </Link>

            <Link to="/owner/dashboard">
              <Button
                variant="primary"
                size="sm"
                className="text-xs font-semibold shadow-xs bg-[#0B4036] hover:bg-[#072C25] text-white"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Owner Portal
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#18231F] hover:bg-[#EAF2EE]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#DDE2DD] bg-[#FCFBF8] p-4 space-y-3 animate-fade-in shadow-lg">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${
                    location.pathname === link.path
                      ? 'bg-[#EAF2EE] text-[#0B4036] font-bold'
                      : 'text-[#68736D] hover:bg-[#F8F7F3]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-[#DDE2DD] flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
              <Link to="/resident/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full justify-center bg-[#FCFBF8]">
                  Resident Portal
                </Button>
              </Link>
              <Link to="/owner/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="sm" className="w-full justify-center bg-[#0B4036] text-white">
                  Owner Portal
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main className="flex-1 bg-[#FCFBF8]">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="bg-[#0B4036] text-white border-t border-[#072C25] pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Column 1: Brand Info */}
            <div className="space-y-3 md:col-span-1 text-left">
              <div className="p-2 bg-white/10 rounded-xl inline-block">
                <UrbanNestLogo variant="horizontal" size="sm" dark />
              </div>
              <p className="text-xs text-slate-200 leading-relaxed pt-1">
                Centralized smart PG & property management system designed for operational clarity, hospitality, and better living.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[#C8A45D] font-semibold pt-1">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Enterprise Data Privacy & Security</span>
              </div>
            </div>

            {/* Column 2: Navigation Links */}
            <div className="text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A45D] mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-slate-200">
                <li><Link to="/" className="hover:text-white transition-colors">Home Platform</Link></li>
                <li><Link to="/features" className="hover:text-white transition-colors">Core Capabilities</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Commercial Plans</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">Company & Vision</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Sales</Link></li>
              </ul>
            </div>

            {/* Column 3: Live Portals */}
            <div className="text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A45D] mb-3">Live Portals</h4>
              <ul className="space-y-2 text-xs text-slate-200">
                <li><Link to="/owner/dashboard" className="hover:text-white transition-colors font-medium">Owner Dashboard</Link></li>
                <li><Link to="/resident/dashboard" className="hover:text-white transition-colors font-medium">Resident Portal</Link></li>
                <li><Link to="/owner/rooms" className="hover:text-white transition-colors">Room & Bed Matrix</Link></li>
                <li><Link to="/owner/visitors" className="hover:text-white transition-colors">Visitor QR Gate Desk</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Account Login</Link></li>
              </ul>
            </div>

            {/* Column 4: Contact & Locations */}
            <div className="text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A45D] mb-3">Headquarters</h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                Sector 3, 27th Main Rd, HSR Layout, Bengaluru, Karnataka 560102
              </p>
              <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/10 text-xs">
                <span className="text-[#C8A45D] font-semibold">Direct Support:</span>
                <p className="font-semibold text-white mt-0.5">support@urbannest.in</p>
                <p className="text-slate-300 mt-0.5">+91 80 2572 8899</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/15 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300">
            <p>© 2026 Urban Nest Technologies Inc. All rights reserved.</p>
            <div className="flex items-center gap-2 font-medium tracking-wider uppercase text-[11px] text-white">
              <span>PEOPLE</span>
              <span className="text-[#C8A45D]">•</span>
              <span>PLACES</span>
              <span className="text-[#C8A45D]">•</span>
              <span>BETTER LIVING</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

