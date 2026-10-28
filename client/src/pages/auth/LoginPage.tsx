import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Mail,
  HelpCircle,
  KeyRound,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { UrbanNestLogo } from '../../components/ui/UrbanNestLogo';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authSuccessRole, setAuthSuccessRole] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  // Restore remembered email on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('urbannest_remember_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Administrator';
      case 'OWNER':
        return 'Property Owner';
      case 'MANAGER':
        return 'Property Manager';
      case 'RESIDENT':
        return 'Resident';
      case 'COOK':
        return 'Chef / Mess In-Charge';
      case 'SECURITY_GUARD':
        return 'Security Guard';
      case 'HOUSEKEEPING':
        return 'Housekeeping Specialist';
      case 'MAINTENANCE':
        return 'Maintenance Specialist';
      case 'RECEPTIONIST':
        return 'Front-Desk Receptionist';
      case 'ACCOUNTANT':
        return 'Finance Accountant';
      default:
        return role;
    }
  };

  const getRoleDestination = (role: UserRole): string => {
    switch (role) {
      case 'SUPER_ADMIN':
        return '/super-admin/dashboard';
      case 'RESIDENT':
        return '/resident/dashboard';
      case 'COOK':
        return '/staff/kitchen';
      case 'SECURITY_GUARD':
        return '/staff/security';
      case 'HOUSEKEEPING':
        return '/staff/housekeeping';
      case 'MAINTENANCE':
        return '/staff/maintenance';
      case 'OWNER':
      case 'MANAGER':
      case 'RECEPTIONIST':
      case 'ACCOUNTANT':
        return '/owner/dashboard';
      default:
        return '/';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setAuthSuccessRole(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your registered email address.');
      setIsLoading(false);
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      setIsLoading(false);
      return;
    }

    try {
      // Manage Remember Me
      if (rememberMe) {
        localStorage.setItem('urbannest_remember_email', cleanEmail);
      } else {
        localStorage.removeItem('urbannest_remember_email');
      }

      // Single unified authentication call - backend validates and determines true role
      const success = await login(cleanEmail, password);

      if (success) {
        // Read authenticated role directly from the trusted backend session
        const session = localStorage.getItem('urbannest_user_session');
        const userObj = session ? JSON.parse(session) : null;
        const actualRole: UserRole = userObj?.role;

        if (!actualRole) {
          throw new Error('Unable to verify user role from server response.');
        }

        const destination = getRoleDestination(actualRole);
        const roleLabel = getRoleDisplayName(actualRole);

        // Display brief success indicator and transition to dashboard
        setAuthSuccessRole(roleLabel);
        setTimeout(() => {
          navigate(destination, { replace: true });
        }, 400);
      } else {
        throw new Error('Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#18231F] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-2xl border border-[#DDE2DD] shadow-sm overflow-hidden">
        {/* Left Brand Panel */}
        <div className="md:col-span-5 bg-[#F8F7F3] p-8 sm:p-10 border-b md:border-b-0 md:border-r border-[#DDE2DD] flex flex-col justify-between items-center text-center">
          <div className="my-auto space-y-6">
            <UrbanNestLogo variant="full" size="xl" />
            <p className="text-xs text-[#68736D] leading-relaxed max-w-xs mx-auto">
              Unified operating system powering next-generation PG communities, resident portals, and staff operations.
            </p>

            <div className="p-3 rounded-xl bg-white/80 border border-[#DDE2DD] text-left space-y-2 text-[11px] text-[#4F5953]">
              <div className="font-bold text-[#18231F] flex items-center gap-1.5 text-xs">
                <KeyRound className="w-3.5 h-3.5 text-[#0B4036]" />
                Single Sign-In for All Roles
              </div>
              <p className="leading-snug">
                Residents, Property Managers, Cooks, Security Guards, Maintenance, and Administrators sign in from here with automatic role dispatch.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-[#DDE2DD] w-full flex items-center justify-center gap-1.5 text-xs text-[#0B4036] font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#C8A45D]" />
            <span>Strict Role & Tenant Security</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-10 space-y-6">
          <div className="space-y-1 text-left">
            <h1 className="text-2xl font-extrabold text-[#18231F] tracking-tight">
              Sign in to Urban Nest
            </h1>
            <p className="text-xs text-[#68736D]">
              Enter your registered email address and password to access your role-specific dashboard.
            </p>
          </div>

          {/* Success Notice */}
          {authSuccessRole && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-left flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Authenticated as <strong>{authSuccessRole}</strong>. Opening your portal...
              </span>
            </div>
          )}

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Authentication Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <Input
                label="Email Address"
                type="email"
                placeholder="e.g. resident@gmail.com, cook@gmail.com, owner@pg.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4 text-[#68736D]" />}
                required
                autoComplete="email"
              />
              <p className="text-[10px] text-[#68736D] mt-1">
                Accepts all registered email addresses including Gmail and corporate domains.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#18231F]">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-[11px] font-semibold text-[#0B4036] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-xs rounded-lg border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-2 focus:ring-[#0B4036] focus:border-transparent transition-all"
                  required
                  autoComplete="current-password"
                />
                <Lock className="w-4 h-4 text-[#68736D] absolute left-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#68736D] hover:text-[#18231F] focus:outline-none p-0.5 rounded"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#4F5953]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#DDE2DD] text-[#0B4036] focus:ring-[#0B4036] w-3.5 h-3.5 cursor-pointer"
                />
                <span>Remember my email</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full py-2.5 font-bold shadow-xs mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isLoading ? 'Signing In...' : 'Sign In to Portal'}
            </Button>
          </form>

          {/* Quick Demo Help */}
          <div className="pt-4 border-t border-[#DDE2DD] text-[11px] text-[#68736D] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-[#C8A45D]" /> Single Unified Login
            </span>
            <span>Role detected automatically</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Reset Account Password"
      >
        <div className="space-y-4 text-xs text-[#4F5953] text-left">
          <p>
            To protect tenant security and resident privacy, password resets are coordinated with your property administration:
          </p>
          <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] space-y-2">
            <p className="font-semibold text-[#18231F]">For Residents & Operational Staff:</p>
            <p className="leading-relaxed">
              Please contact your PG Manager or Property Owner. They can issue a secure password reset directly from the Staff & Resident management console.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] space-y-2">
            <p className="font-semibold text-[#18231F]">For Property Owners & SaaS Admins:</p>
            <p className="leading-relaxed">
              Please contact platform support at <strong>support@urbannest.io</strong> with your verified organization details.
            </p>
          </div>
          <div className="pt-2 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setForgotModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
