import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

export const OtpVerifyPage: React.FC = () => {
  const { verifyOtp, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(30);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // States forwarded from signup
  const signupState = location.state as { phone: string; email: string; name: string; role: string; otp?: string } | null;

  useEffect(() => {
    if (!signupState?.phone) {
      navigate('/signup');
    }
  }, [signupState, navigate]);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const updatedOtp = [...otp];
    updatedOtp[index] = element.value;
    setOtp(updatedOtp);

    // Auto-focus next input
    if (element.nextSibling && element.value !== '') {
      (element.nextSibling as HTMLInputElement).focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const updatedOtp = [...otp];
      updatedOtp[index] = '';
      setOtp(updatedOtp);

      // Auto-focus previous input
      if (e.currentTarget.previousSibling) {
        (e.currentTarget.previousSibling as HTMLInputElement).focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError(null);

    const code = otp.join('');
    if (code.length !== 6) {
      setVerificationError('Please enter the 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    const success = await verifyOtp(signupState?.phone || '', code);
    setIsSubmitting(false);

    if (success) {
      navigate('/welcome', { state: { name: signupState?.name } });
    }
  };

  const handleResend = () => {
    setTimer(30);
    // Trigger simulated resend notices
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#ec4899]/10 via-[#8b5cf6]/10 to-[#3b82f6]/10 px-4">
      <div className="w-full max-w-md p-8 rounded-3xl glass-card border border-white/20 shadow-2xl relative overflow-hidden animate-slide-up">
        
        <button 
          onClick={() => navigate('/signup')} 
          className="absolute top-6 left-6 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="text-center mb-6 mt-4">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Security <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Verification</span>
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">We sent a 6-digit OTP to +91 {signupState?.phone}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {verificationError && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold text-center">
            {verificationError}
          </div>
        )}

        {/* Simulated Sandbox OTP Indicator */}
        {signupState?.otp && (
          <div className="mb-6 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-center text-xs font-bold flex items-center justify-center gap-2">
            <ShieldAlert size={14} />
            <span>Sandbox Mode: Auto-filled OTP is <b>{signupState.otp}</b></span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onFocus={(e) => e.target.select()}
                className="w-12 h-14 rounded-2xl glass-input text-center text-xl font-bold focus:border-purple-500"
                disabled={isSubmitting}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Confirming Code...' : 'Verify & Continue'}
          </button>
        </form>

        <div className="mt-6 text-center">
          {timer > 0 ? (
            <p className="text-xs text-slate-400 font-semibold">Resend OTP in <span className="text-purple-500 font-bold">{timer}s</span></p>
          ) : (
            <button 
              onClick={handleResend}
              className="text-xs text-purple-500 hover:text-purple-600 font-bold transition-all inline-flex items-center gap-1"
            >
              <RefreshCw size={12} /> Resend OTP Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
