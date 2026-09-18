import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, UserCheck, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { UrbanNestLogo } from '../../components/ui/UrbanNestLogo';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('SUPER_ADMIN');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const success = await login(email, password, selectedRole);
      if (success) {
        // Read stored session to determine exact role
        const session = localStorage.getItem('urbannest_user_session');
        const userObj = session ? JSON.parse(session) : null;
        const actualRole: UserRole = userObj?.role;

        // Role verification against selected portal tab
        if (selectedRole === 'SUPER_ADMIN' && actualRole !== 'SUPER_ADMIN') {
          throw new Error('Your account does not have access to the Super Admin portal.');
        }
        if (selectedRole === 'OWNER' && actualRole !== 'OWNER' && actualRole !== 'MANAGER' && actualRole !== 'STAFF') {
          throw new Error('Your account does not have access to the PG Owner portal.');
        }
        if (selectedRole === 'RESIDENT' && actualRole !== 'RESIDENT') {
          throw new Error('Your account does not have access to the Resident portal.');
        }

        if (actualRole === 'SUPER_ADMIN') {
          navigate('/super-admin/dashboard');
        } else if (actualRole === 'RESIDENT') {
          navigate('/resident/dashboard');
        } else {
          navigate('/owner/dashboard');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify email and password.');
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
              Multi-Tenant SaaS platform powering next-generation PG & co-living management networks.
            </p>
          </div>

          <div className="pt-6 border-t border-[#DDE2DD] w-full flex items-center justify-center gap-1.5 text-xs text-[#0B4036] font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#C8A45D]" />
            <span>Strict Tenant Isolation & Security</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-10 space-y-6">
          <div className="space-y-1 text-left">
            <h2 className="text-xl font-bold text-[#18231F]">Account Sign In</h2>
            <p className="text-xs text-[#68736D]">
              Select your portal role to access SaaS platform, management or resident features.
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleRoleChange('SUPER_ADMIN')}
              className={`py-2 rounded-md transition-colors flex items-center justify-center gap-1 ${
                selectedRole === 'SUPER_ADMIN'
                  ? 'bg-[#0B4036] text-white shadow-xs'
                  : 'text-[#68736D] hover:text-[#18231F]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#C8A45D]" />
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('OWNER')}
              className={`py-2 rounded-md transition-colors flex items-center justify-center gap-1 ${
                selectedRole === 'OWNER'
                  ? 'bg-[#0B4036] text-white shadow-xs'
                  : 'text-[#68736D] hover:text-[#18231F]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              PG Owner
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('RESIDENT')}
              className={`py-2 rounded-md transition-colors flex items-center justify-center gap-1 ${
                selectedRole === 'RESIDENT'
                  ? 'bg-[#0B4036] text-white shadow-xs'
                  : 'text-[#68736D] hover:text-[#18231F]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Resident
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Sign In Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <Input
              label="Email Address"
              type="email"
              placeholder={
                selectedRole === 'SUPER_ADMIN'
                  ? 'admin@urbannest.io'
                  : selectedRole === 'OWNER'
                  ? 'owner@pgcompany.com'
                  : 'resident@example.com'
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full py-2.5 font-bold shadow-xs"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to{' '}
              {selectedRole === 'SUPER_ADMIN'
                ? 'Super Admin Portal'
                : selectedRole === 'OWNER'
                ? 'Owner Portal'
                : 'Resident Portal'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

