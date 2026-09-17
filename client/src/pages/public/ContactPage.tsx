import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    propertyCount: '1-50',
    propertyType: 'PG / Co-Living',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="space-y-12 py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
      {/* Header */}
      <div className="max-w-2xl space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Contact & Support</span>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Get in touch with our team
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Have questions about onboarding your PG or need assistance? Reach out to our operations specialists.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Contact Form */}
        <div className="lg:col-span-7">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            {submitted ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Thank You for Reaching Out</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Our PG onboarding specialist will contact you within 2 business hours.
                </p>
                <Button variant="outline" size="sm" onClick={() => setSubmitted(false)} className="mt-4">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    placeholder="e.g. Ramesh Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="ramesh@myproperties.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                  <Select
                    label="Estimated Bed Capacity"
                    value={formData.propertyCount}
                    onChange={(e) => setFormData({ ...formData, propertyCount: e.target.value })}
                    options={[
                      { label: '1 - 50 Beds', value: '1-50' },
                      { label: '51 - 150 Beds', value: '51-150' },
                      { label: '151 - 300 Beds', value: '151-300' },
                      { label: '300+ Beds (Enterprise)', value: '300+' }
                    ]}
                  />
                </div>

                <Textarea
                  label="How can we help?"
                  placeholder="Tell us about your properties, current pain points, or specific questions..."
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto font-semibold"
                  isLoading={isSubmitting}
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Submit Inquiry
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Contact Information & Office Details */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Direct Contact
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Email Inquiries</p>
                  <p className="text-slate-500">support@urbannest.in</p>
                  <p className="text-slate-500">sales@urbannest.in</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Phone Support</p>
                  <p className="text-slate-500">+91 80 2572 8899</p>
                  <p className="text-[11px] text-slate-400">Mon - Sat: 9:00 AM - 7:00 PM IST</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Headquarters</p>
                  <p className="text-slate-500 leading-relaxed">
                    Sector 3, 27th Main Rd, HSR Layout, Bengaluru, Karnataka 560102
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Response Time SLA</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Inquiries submitted through this form are assigned to dedicated regional onboarding engineers with guaranteed same-day response.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
