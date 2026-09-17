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
    { label: 'Solutions', path: '/solutions' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#18231F] flex flex-col selection:bg-[#0B4036] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#DDE2DD] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[76px] sm:min-h-[84px] py-2 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center group py-1">
            <UrbanNestLogo variant="horizontal" size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.path ||
                (link.path === '/solutions' && location.pathname === '/features');
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
              {navLinks.map((link) => {
                const isActive =
                  location.pathname === link.path ||
                  (link.path === '/solutions' && location.pathname === '/features');
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium ${
                      isActive
                        ? 'bg-[#EAF2EE] text-[#0B4036] font-bold'
                        : 'text-[#68736D] hover:bg-[#F8F7F3]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
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
          {/* Main Footer Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Section 1: HOME */}
            <div className="text-left space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A45D] pb-1 border-b border-white/15">
                Home
              </h4>
              <ul className="space-y-2 text-xs text-slate-200">
                <li><Link to="/" className="hover:text-[#C8A45D] transition-colors">Platform Overview</Link></li>
                <li><Link to="/owner/dashboard" className="hover:text-[#C8A45D] transition-colors font-medium">Live Dashboard</Link></li>
                <li><Link to="/owner/rooms" className="hover:text-[#C8A45D] transition-colors">Bed Matrix</Link></li>
                <li><Link to="/owner/visitors" className="hover:text-[#C8A45D] transition-colors">QR Gate Passes</Link></li>
              </ul>
            </div>

            {/* Section 2: SOLUTIONS */}
            <div className="text-left space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A45D] pb-1 border-b border-white/15">
                Solutions
              </h4>
              <ul className="space-y-2 text-xs text-slate-200">
                <li><Link to="/solutions" className="hover:text-[#C8A45D] transition-colors">Single PG Owners</Link></li>
                <li><Link to="/solutions" className="hover:text-[#C8A45D] transition-colors">Multi-Branch Chains</Link></li>
                <li><Link to="/solutions" className="hover:text-[#C8A45D] transition-colors">Resident App Perks</Link></li>
                <li><Link to="/solutions" className="hover:text-[#C8A45D] transition-colors">Automated Billing</Link></li>
              </ul>
            </div>

            {/* Section 3: PRICING */}
            <div className="text-left space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A45D] pb-1 border-b border-white/15">
                Pricing
              </h4>
              <ul className="space-y-2 text-xs text-slate-200">
                <li><Link to="/pricing" className="hover:text-[#C8A45D] transition-colors">Starter Plan</Link></li>
                <li><Link to="/pricing" className="hover:text-[#C8A45D] transition-colors font-medium">Growth Pro Tier</Link></li>
                <li><Link to="/pricing" className="hover:text-[#C8A45D] transition-colors">Enterprise Portfolio</Link></li>
                <li><Link to="/contact" className="hover:text-[#C8A45D] transition-colors">Custom Onboarding</Link></li>
              </ul>
            </div>

            {/* Section 4: ABOUT */}
            <div className="text-left space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A45D] pb-1 border-b border-white/15">
                About
              </h4>
              <ul className="space-y-2 text-xs text-slate-200">
                <li><Link to="/about" className="hover:text-[#C8A45D] transition-colors">Company & Vision</Link></li>
                <li><Link to="/about" className="hover:text-[#C8A45D] transition-colors">Core Philosophy</Link></li>
                <li><Link to="/about" className="hover:text-[#C8A45D] transition-colors">Security & DPDP</Link></li>
                <li><Link to="/about" className="hover:text-[#C8A45D] transition-colors">Brand Identity</Link></li>
              </ul>
            </div>

            {/* Section 5: CONTACT & PORTALS */}
            <div className="text-left space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A45D] pb-1 border-b border-white/15">
                Contact & Portals
              </h4>
              <ul className="space-y-2 text-xs text-slate-200">
                <li><Link to="/contact" className="hover:text-[#C8A45D] transition-colors">Bengaluru Support</Link></li>
                <li><Link to="/login" className="hover:text-[#C8A45D] transition-colors">Sign In Portal</Link></li>
                <li><Link to="/owner/dashboard" className="hover:text-[#C8A45D] transition-colors">Owner Console</Link></li>
                <li><Link to="/resident/dashboard" className="hover:text-[#C8A45D] transition-colors">Resident App</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Brand Bar */}
          <div className="border-t border-white/15 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/10 rounded-lg inline-block">
                <UrbanNestLogo variant="horizontal" size="sm" dark />
              </div>
              <span>© 2026 Urban Nest Technologies Inc.</span>
            </div>

            <div className="flex items-center gap-2 font-semibold tracking-wider uppercase text-[11px] text-white">
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
