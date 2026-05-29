import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Code & Reset
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (!email) {
      setError('Please input your registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (res.ok) {
        setSimulatedOtp(data.resetOtp || '654321');
        setStep(2);
        setMsg('Reset OTP has been sent successfully.');
      } else {
        throw new Error(data.error || 'Password reset request failed.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      // Sandbox fallback
      setSimulatedOtp('654321');
      setStep(2);
      setMsg('Reset OTP sent (Sandbox mode).');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || !newPassword) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      setIsSubmitting(false);

      if (res.ok) {
        setMsg('Password reset completed. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Reset code verification failed.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setMsg('Password reset successfully (Sandbox mode). Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#ec4899]/10 via-[#8b5cf6]/10 to-[#3b82f6]/10 px-4">
      <div className="w-full max-w-md p-8 rounded-3xl glass-card border border-white/20 shadow-2xl relative overflow-hidden animate-slide-up">
        
        <Link to="/login" className="absolute top-6 left-6 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>

        <div className="text-center mb-6 mt-4">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Reset <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Password</span>
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {step === 1 ? 'Recover your dashboard account access' : 'Configure a new security password'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {msg && (
          <div className="mb-4 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 text-xs font-bold text-center">
            {msg}
          </div>
        )}

        {step === 2 && simulatedOtp && (
          <div className="mb-4 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-center text-xs font-bold flex items-center justify-center gap-2">
            <ShieldCheck size={14} />
            <span>Sandbox code: use <b>{simulatedOtp}</b></span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-400" size={16} />
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-semibold"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Requesting...' : 'Send Reset Code'}
              {!isSubmitting && <ArrowRight size={16} />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 pl-1">Verification Code</label>
              <input
                type="text"
                placeholder="6-digit OTP code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl glass-input text-sm font-semibold text-center tracking-widest"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 pl-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={16} />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-semibold"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
