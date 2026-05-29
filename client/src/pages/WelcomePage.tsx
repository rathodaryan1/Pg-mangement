import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ArrowRight, Trophy, Sparkles } from 'lucide-react';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateName = (location.state as { name?: string } | null)?.name || 'Partner';

  useEffect(() => {
    // Trigger confetti explosion on load
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ec4899', '#8b5cf6', '#3b82f6'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ec4899', '#8b5cf6', '#3b82f6'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#ec4899]/10 via-[#8b5cf6]/10 to-[#3b82f6]/10 px-4">
      <div className="w-full max-w-lg p-10 rounded-3xl glass-card border border-white/20 shadow-2xl relative overflow-hidden text-center animate-slide-up">
        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-pink-500/20 blur-3xl" />

        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-3xl mx-auto shadow-xl mb-6 relative animate-pulse-slow">
          <Trophy size={40} />
          <Sparkles className="absolute -top-2 -right-2 text-yellow-300" size={20} />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight font-sans mb-3">
          Congratulations, <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">{stateName}</span>!
        </h1>
        
        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-8 max-w-md mx-auto leading-relaxed">
          Your premium PG Management System is successfully configured. You are now ready to onboard residents, track bed occupancy, manage collections, and view multi-PG dashboards.
        </p>

        <div className="space-y-4 max-w-xs mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
          >
            Launch Dashboard
            <ArrowRight size={16} />
          </button>
        </div>

        <p className="text-[10px] text-slate-400 mt-8 font-bold uppercase tracking-wider">
          Powered by{' '}
          <a
            href="https://urbann-nest.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-500 hover:text-purple-400 transition-colors underline"
          >
            Urban Nest Enterprise SaaS
          </a>
        </p>
      </div>
    </div>
  );
};
