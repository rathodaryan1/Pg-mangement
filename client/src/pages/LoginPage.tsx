import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email || !password) {
      setValidationError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);

    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#ec4899]/10 via-[#8b5cf6]/10 to-[#3b82f6]/10 px-4">
      <div className="w-full max-w-md p-8 rounded-3xl glass-card border border-white/20 shadow-2xl relative overflow-hidden animate-slide-up">
        {/* Glow backgrounds */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-pink-500/20 blur-3xl" />

        <div className="relative text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-md mb-3">
            🏠
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight font-sans">
            Welcome to <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">Urban Nest</span>
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">Enterprise PG Management Platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {validationError && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold text-center">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 pl-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                type="email"
                placeholder="owner@pg.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-semibold"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 pl-1">
              <label className="block text-xs font-bold text-slate-400 uppercase">Password</label>
              <Link to="/forgot-password" className="text-xs font-bold text-purple-500 hover:text-purple-600 transition-colors">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400" size={16} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-semibold"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? 'Verifying Credentials...' : 'Sign In'}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-500/10 pt-4">
          <p className="text-xs text-slate-400 font-semibold">
            Manage properties?{' '}
            <Link to="/signup" className="text-purple-500 hover:text-purple-600 font-extrabold transition-colors">
              Create Owner Account
            </Link>
          </p>
        </div>

        {/* Demo Accounts Box */}
        <div className="mt-6 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 text-[10px]">
          <p className="font-bold text-purple-400 uppercase mb-2 flex items-center gap-1">
            <ShieldCheck size={12} /> Sandbox Access Credentials (admin123)
          </p>
          <div className="grid grid-cols-2 gap-2 text-slate-400 font-semibold">
            <div>Owner: <span className="text-purple-400">owner@pg.com</span></div>
            <div>Manager: <span className="text-purple-400">manager.gurgaon@pg.com</span></div>
            <div>Reception: <span className="text-purple-400">reception.gurgaon@pg.com</span></div>
            <div>Accountant: <span className="text-purple-400">accounts.noida@pg.com</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
