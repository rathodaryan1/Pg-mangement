import React from 'react';
import {
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Mail,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const SuperAdminSupportPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-[#0B4036]" />
          Tenant Support & Inquiries
        </h1>
        <p className="text-xs text-[#68736D] mt-0.5">
          Priority technical inquiries and onboarding assistance from PG business owners
        </p>
      </div>

      <Card className="p-8 text-center space-y-4 border-[#DDE2DD] bg-white max-w-lg mx-auto">
        <CheckCircle2 className="w-12 h-12 text-[#0B4036] mx-auto" />
        <h3 className="text-base font-bold text-[#18231F]">Zero Pending Support Tickets</h3>
        <p className="text-xs text-[#68736D]">
          All PG tenant accounts are operating normally. Direct inquiries from owners are forwarded to <span className="font-mono text-[#0B4036]">support@urbannest.com</span>.
        </p>
      </Card>
    </div>
  );
};

export default SuperAdminSupportPage;
