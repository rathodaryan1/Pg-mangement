import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Phone, ArrowRight, Building } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('OWNER');
  const [propertyId, setPropertyId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name || !email || !phone || !password) {
      setValidationError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const otp = await register(name, email, phone, password, role, propertyId || undefined);
      setIsSubmitting(false);
      
      // Navigate to OTP verification page with signup states
      navigate('/otp-verify', { 
        state: { phone, email, name, role, otp } 
      });
    } catch (err: any) {
      setIsSubmitting(false);
      setValidationError(err.message || 'Signup failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#ec4899]/10 via-[#8b5cf6]/10 to-[#3b82f6]/10 px-4">
      <div className="w-full max-w-md p-8 rounded-3xl glass-card border border-white/20 shadow-2xl relative overflow-hidden animate-slide-up">
        {/* Glow backgrounds */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-pink-500/20 blur-3xl" />

        <div className="relative text-center mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Create <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">Account</span>
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">Join thousands of PG managers across India</p>
        </div>

        {validationError && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold text-center">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 pl-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Aaryan Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs font-semibold"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 pl-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={15} />
              <input
                type="email"
                placeholder="aaryan@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs font-semibold"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 pl-1">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-slate-400" size={15} />
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs font-semibold"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 pl-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={15} />
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs font-semibold"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 pl-1">Account Role</label>
            <div className="relative">
              <Building className="absolute left-3 top-3 text-slate-400" size={15} />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs font-semibold appearance-none bg-transparent"
              >
                <option value="OWNER" className="dark:bg-slate-900">PG Owner (Manage Branches)</option>
                <option value="MANAGER" className="dark:bg-slate-900">Branch Manager</option>
                <option value="RECEPTIONIST" className="dark:bg-slate-900">Receptionist</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? 'Registering Account...' : 'Request Verification OTP'}
            {!isSubmitting && <ArrowRight size={15} />}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-500/10 pt-4">
          <p className="text-xs text-slate-400 font-semibold">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-500 hover:text-purple-600 font-extrabold transition-colors">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
