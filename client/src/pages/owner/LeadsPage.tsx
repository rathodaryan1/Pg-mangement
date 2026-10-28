import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Phone,
  Mail,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { saasApi } from '../../services/saasApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../context/ToastContext';

export const LeadsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roomType, setRoomType] = useState('Single');
  const [source, setSource] = useState('WALK_IN');
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');

  // Referral state in form
  const [referrerName, setReferrerName] = useState('');
  const [referrerPhone, setReferrerPhone] = useState('');
  const [referralCommission, setReferralCommission] = useState('0');
  const [whatsappConsent, setWhatsappConsent] = useState(false);

  // Referral payout modal
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [selectedLeadForReferral, setSelectedLeadForReferral] = useState<any | null>(null);
  const [editRefCommission, setEditRefCommission] = useState('');
  const [editRefStatus, setEditRefStatus] = useState('PENDING');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await saasApi.getLeads(undefined, statusFilter);
      setLeads(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saasApi.createLead({
        name,
        email,
        phone,
        roomTypePreference: roomType,
        source,
        visitDate: visitDate ? new Date(visitDate).toISOString() : undefined,
        notes,
        referrerName: referrerName || undefined,
        referrerPhone: referrerPhone || undefined,
        referralCommission: referralCommission ? parseFloat(referralCommission) : 0,
        whatsappConsent,
      });
      toast.success('Lead enquiry logged successfully!');
      setModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setNotes('');
      setReferrerName('');
      setReferrerPhone('');
      setReferralCommission('0');
      setWhatsappConsent(false);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log enquiry');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await saasApi.updateLeadStatus(id, newStatus);
      toast.success(`Lead moved to ${newStatus}`);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    }
  };

  const handleToggleWhatsApp = async (lead: any) => {
    try {
      const newConsent = !lead.whatsappConsent;
      await saasApi.updateWhatsAppConsent(lead.id, {
        consent: newConsent,
        optOut: !newConsent,
      });
      toast.success(newConsent ? 'WhatsApp notifications consent logged' : 'WhatsApp opted out upon request');
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update WhatsApp preferences');
    }
  };

  const handleSaveReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForReferral) return;
    try {
      await saasApi.updateLeadReferral(selectedLeadForReferral.id, {
        referralCommission: parseFloat(editRefCommission || '0'),
        commissionStatus: editRefStatus,
      });
      toast.success('Referral payout status updated');
      setReferralModalOpen(false);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update referral');
    }
  };

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.email.toLowerCase().includes(search.toLowerCase())
  );

  // Conversion analytics
  const totalCount = leads.length;
  const visitCount = leads.filter((l) => l.status === 'VISIT_SCHEDULED' || l.status === 'CONVERTED').length;
  const convertedCount = leads.filter((l) => l.status === 'CONVERTED').length;
  const conversionRate = totalCount > 0 ? Math.round((convertedCount / totalCount) * 100) : 0;
  const totalReferralPayout = leads.reduce((sum, l) => sum + (l.referralCommission || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Admissions CRM & Referral Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Enquiries, Conversions & Referrals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Capture prospective tenant leads, schedule room visits, track referral commissions, and log WhatsApp consent.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchLeads} className="gap-1.5 bg-white">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
            <Plus className="w-3.5 h-3.5" /> New Enquiry
          </Button>
        </div>
      </div>

      {/* CRM Funnel & Conversion Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Inquiries</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">All prospective leads</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Room Visits</p>
          <p className="text-2xl font-black text-sky-700 mt-1">{visitCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Physical property tours</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Converted Residents</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{convertedCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Admissions finalized</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Conversion Rate</p>
          <p className="text-2xl font-black text-[#0B4036] mt-1">{conversionRate}%</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Inquiry to move-in yield</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Referral Payouts</p>
          <p className="text-2xl font-black text-amber-700 mt-1">₹{totalReferralPayout.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Commissions tracked</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search prospect by name, phone, email, or referrer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
        >
          <option value="ALL">All Stages</option>
          <option value="NEW">New Enquiries</option>
          <option value="CONTACTED">Contacted</option>
          <option value="VISIT_SCHEDULED">Visit Scheduled</option>
          <option value="CONVERTED">Converted to Admission</option>
          <option value="LOST">Lost</option>
        </select>
      </div>

      {/* Pipeline Grid */}
      <Card className="border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Prospect Details</th>
                <th className="py-3 px-4">Room Preference</th>
                <th className="py-3 px-4">Source & Referral</th>
                <th className="py-3 px-4">WhatsApp Consent</th>
                <th className="py-3 px-4">Stage Status</th>
                <th className="py-3 px-4">Visit Date</th>
                <th className="py-3 px-4 text-right">Advance Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length > 0 ? (
                filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{lead.name}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {lead.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {lead.email}</span>
                      </p>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {lead.roomTypePreference || 'Any Room'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-bold text-slate-600 block w-fit">
                          {lead.source}
                        </span>
                        {lead.referrerName && (
                          <div className="text-[10px] text-slate-500">
                            <span className="text-slate-400">Ref:</span> {lead.referrerName}{' '}
                            <button
                              onClick={() => {
                                setSelectedLeadForReferral(lead);
                                setEditRefCommission(lead.referralCommission?.toString() || '0');
                                setEditRefStatus(lead.commissionStatus || 'PENDING');
                                setReferralModalOpen(true);
                              }}
                              className="font-bold text-emerald-700 hover:underline"
                            >
                              (₹{lead.referralCommission || 0} - {lead.commissionStatus || 'PENDING'})
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {lead.whatsappOptOut ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Opted Out
                        </span>
                      ) : lead.whatsappConsent ? (
                        <button
                          onClick={() => handleToggleWhatsApp(lead)}
                          title="Click to toggle consent"
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        >
                          Consent Logged
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleWhatsApp(lead)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          Record Consent
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          lead.status === 'CONVERTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lead.status === 'VISIT_SCHEDULED'
                            ? 'bg-sky-100 text-sky-800'
                            : lead.status === 'CONTACTED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {lead.visitDate ? new Date(lead.visitDate).toLocaleDateString() : 'Not scheduled'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {lead.status === 'NEW' && (
                        <Button size="xs" onClick={() => handleUpdateStatus(lead.id, 'CONTACTED')} className="bg-amber-600 text-white">
                          Mark Contacted
                        </Button>
                      )}
                      {lead.status === 'CONTACTED' && (
                        <Button size="xs" onClick={() => handleUpdateStatus(lead.id, 'VISIT_SCHEDULED')} className="bg-sky-600 text-white">
                          Schedule Visit
                        </Button>
                      )}
                      {lead.status === 'VISIT_SCHEDULED' && (
                        <Button size="xs" onClick={() => handleUpdateStatus(lead.id, 'CONVERTED')} className="bg-emerald-600 text-white">
                          Convert to Admission
                        </Button>
                      )}
                      {lead.status === 'CONVERTED' && (
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Admitted
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No leads found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Add Enquiry */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record New Prospective Resident Enquiry">
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Prospect Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="rahul@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Room Type Preference</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="Single">Single Occupancy</option>
                <option value="Double">Double Sharing</option>
                <option value="Triple">Triple Sharing</option>
                <option value="Four-sharing">Four Sharing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="WALK_IN">Walk-In Visit</option>
                <option value="PHONE">Phone Call</option>
                <option value="WEBSITE">Public Website</option>
                <option value="REFERRAL">Resident Referral</option>
                <option value="COLLEGE_DRIVE">Campus / Work Drive</option>
              </select>
            </div>
          </div>

          {/* Referral Fields */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Referrer Name</label>
              <input
                type="text"
                placeholder="e.g. Aryan (Room 204)"
                value={referrerName}
                onChange={(e) => setReferrerName(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Referrer Phone</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={referrerPhone}
                onChange={(e) => setReferrerPhone(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Commission (₹)</label>
              <input
                type="number"
                placeholder="500"
                value={referralCommission}
                onChange={(e) => setReferralCommission(e.target.value)}
                className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Planned Visit Date (Optional)</label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <input
              type="checkbox"
              id="whatsappConsentCheck"
              checked={whatsappConsent}
              onChange={(e) => setWhatsappConsent(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="whatsappConsentCheck" className="text-xs text-emerald-950 font-medium">
              Prospect gave explicit consent to receive room availability and booking links on WhatsApp
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Company or College</label>
            <input
              type="text"
              placeholder="e.g. Interning at TCS Gandhinagar, looking for moving next month"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white">
              Log Enquiry
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Referral Payout */}
      <Modal isOpen={referralModalOpen} onClose={() => setReferralModalOpen(false)} title="Manage Referral Commission">
        <form onSubmit={handleSaveReferral} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded text-xs space-y-1">
            <p><span className="text-slate-500">Lead:</span> <strong>{selectedLeadForReferral?.name}</strong></p>
            <p><span className="text-slate-500">Referrer:</span> <strong>{selectedLeadForReferral?.referrerName}</strong> ({selectedLeadForReferral?.referrerPhone || 'No tel'})</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Commission Amount (INR)</label>
              <input
                type="number"
                value={editRefCommission}
                onChange={(e) => setEditRefCommission(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Commission Status</label>
              <select
                value={editRefStatus}
                onChange={(e) => setEditRefStatus(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 text-sm font-bold"
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setReferralModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white">
              Save Payout Status
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
