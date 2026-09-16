import React, { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  CheckCircle2,
  Send,
  Building2,
  Sparkles
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    pgName: '',
    bedCount: '50',
    purpose: 'DEMO',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="space-y-16 sm:space-y-24 py-12 sm:py-16 max-w-6xl mx-auto px-4 sm:px-6 animate-fade-in">
      {/* 1. HEADER */}
      <section className="text-center space-y-4">
        <Badge variant="primary">Get in Touch</Badge>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
          We'd Love to Hear <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            From Your Team
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Looking to automate your PG operations or book a tailored 1-on-1 walkthrough? Our product specialists in Bengaluru are ready to help.
        </p>
      </section>

      {/* 2. CONTACT GRID: FORM + INFO */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Contact Form */}
        <div className="lg:col-span-7">
          <Card className="p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Send Us a Message</h2>
                  <p className="text-xs text-slate-500">We respond to all requests within 15 minutes during business hours.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Your Name"
                    placeholder="e.g. Rajesh Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Mobile Number"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="rajesh@yourpg.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <Input
                    label="PG / Co-Living Name"
                    placeholder="e.g. Royal Living PG"
                    value={formData.pgName}
                    onChange={(e) => setFormData({ ...formData, pgName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Total Bed Capacity"
                    value={formData.bedCount}
                    onChange={(e) => setFormData({ ...formData, bedCount: e.target.value })}
                    options={[
                      { label: 'Under 25 Beds', value: '25' },
                      { label: '25 to 75 Beds', value: '50' },
                      { label: '75 to 150 Beds', value: '100' },
                      { label: '150+ Beds (Multi-Property)', value: '200' }
                    ]}
                  />

                  <Select
                    label="Inquiry Type"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    options={[
                      { label: 'Book Product Demo', value: 'DEMO' },
                      { label: 'Commercial Sales & Pricing', value: 'SALES' },
                      { label: 'Existing Customer Support', value: 'SUPPORT' },
                      { label: 'Partnership / Integration', value: 'PARTNER' }
                    ]}
                  />
                </div>

                <Textarea
                  label="Message / Requirements"
                  rows={4}
                  placeholder="Tell us about your properties, current challenges, or specific features you need..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full justify-center font-bold"
                  rightIcon={<Send className="w-4 h-4" />}
                >
                  Submit Inquiry & Request Callback
                </Button>
              </form>
            ) : (
              <div className="text-center py-10 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Inquiry Received!</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  Thank you for reaching out, <strong>{formData.name}</strong>. A product specialist will call you at <strong>{formData.phone}</strong> within 15 minutes.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubmitted(false)}
                >
                  Send Another Message
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Office Info & Support Cards */}
        <div className="lg:col-span-5 space-y-5">
          {/* Quick Direct Support Card */}
          <Card className="p-6 space-y-4 bg-slate-900 text-white border-slate-800">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Direct Support Channels
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-800 text-blue-400 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Email Us</p>
                  <p className="text-slate-400">support@urbannest.in</p>
                  <p className="text-slate-400">sales@urbannest.in</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Direct Phone & WhatsApp</p>
                  <p className="text-slate-400">+91 80 2572 8899</p>
                  <p className="text-slate-400">+91 98765 43210 (24x7 Emergency)</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-800 text-purple-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white">Support SLA</p>
                  <p className="text-slate-400">Mon - Sat: 08:00 AM - 09:00 PM IST</p>
                  <p className="text-slate-400">Under 15 min response time</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Physical Office Hubs */}
          <Card className="p-6 space-y-4 border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Office Hubs in India
            </h3>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">Bengaluru Headquarters (HSR Layout)</p>
                <p>Urban Nest Tech Park, Sector 3, 27th Main Rd, HSR Layout, Bengaluru, Karnataka 560102</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">Koramangala Co-Living Experience Center</p>
                <p>4th Block, 80 Feet Rd, Koramangala, Bengaluru, Karnataka 560034</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};
