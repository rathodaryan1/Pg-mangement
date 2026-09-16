import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, UserCheck, Building2, KeyRound } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('owner@pg.com');
  const [password, setPassword] = useState('admin123');
  const [selectedRole, setSelectedRole] = useState<UserRole>('OWNER');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
    if (role === 'OWNER') {
      setEmail('owner@pg.com');
      setPassword('admin123');
    } else {
      setEmail('aakash.v@gmail.com');
      setPassword('admin123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const success = await login(email, password, selectedRole);
      if (success) {
        if (selectedRole === 'RESIDENT') {
          navigate('/resident/dashboard');
        } else {
          navigate('/owner/dashboard');
        }
      } else {
        // Direct navigation if backend demo fallback is triggered
        if (selectedRole === 'RESIDENT') {
          navigate('/resident/dashboard');
        } else {
          navigate('/owner/dashboard');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

      <Card className="w-full max-w-md p-8 bg-slate-900/90 border border-slate-800 shadow-2xl rounded-3xl space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
            UN
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">URBAN NEST</h1>
          <p className="text-xs text-slate-400">Smart PG Operating Platform</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleRoleChange('OWNER')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              selectedRole === 'OWNER' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Owner / Admin
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('RESIDENT')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              selectedRole === 'RESIDENT' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Resident Portal
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            placeholder={selectedRole === 'OWNER' ? 'owner@pg.com' : 'aakash.v@gmail.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="admin123"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className={`w-full py-3 ${selectedRole === 'RESIDENT' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to {selectedRole === 'OWNER' ? 'Owner Portal' : 'Resident Portal'}
          </Button>
        </form>

        {/* Quick Demo Credentials Panel */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
          <p className="font-bold text-slate-300 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-blue-400" /> Demo Credentials:
          </p>
          <div className="space-y-1 text-[11px] text-slate-400">
            <p><strong>Owner:</strong> <span className="text-blue-400">owner@pg.com</span> / <span className="text-slate-200">admin123</span></p>
            <p><strong>Resident:</strong> <span className="text-purple-400">aakash.v@gmail.com</span> / <span className="text-slate-200">admin123</span></p>
          </div>
        </div>
      </Card>
    </div>
  );
};
