import React, { useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Radio,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import { residentApi } from '../../services/residentApi';

export const ResidentEmergencyPage: React.FC = () => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [sosTimestamp, setSosTimestamp] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [emergencyNotes, setEmergencyNotes] = useState('');

  const handleTriggerSOS = async () => {
    setIsTriggering(true);
    try {
      await residentApi.triggerSOS(emergencyNotes || 'Emergency SOS triggered from Resident Emergency Portal');
      setSosActivated(true);
      setSosTimestamp(new Date().toLocaleTimeString());
      setConfirmModalOpen(false);
      setEmergencyNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to broadcast SOS event. Please dial 112 directly.');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDE2DD] shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-600" />
              24x7 PG Security & Emergency Network
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18231F]">Emergency Assistance & SOS</h1>
          <p className="text-xs sm:text-sm text-[#68736D] max-w-xl">
            In case of medical emergency, fire, security distress, or immediate danger, activate the SOS alert to dispatch the on-duty warden and security team.
          </p>
        </div>
      </div>

      {/* SOS Trigger Card */}
      <Card className="p-8 text-center space-y-6 border border-[#DDE2DD] bg-white rounded-2xl shadow-sm">
        {sosActivated ? (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-red-600 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-red-700">
              🚨 SOS ALERT TRANSMITTED
            </h2>
            <p className="text-xs text-[#18231F]">
              Your emergency signal with location coordinates (Room & Bed) has been dispatched to PG Warden and Night Security Staff at <strong>{sosTimestamp}</strong>.
            </p>
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-600" /> Staff Dispatched to Your Room
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-[#0B4036] hover:bg-red-600 text-white font-bold text-lg sm:text-xl flex flex-col items-center justify-center mx-auto shadow-md hover:scale-105 active:scale-95 transition-all border-4 border-[#EAF2EE] hover:border-red-200"
            >
              <ShieldAlert className="w-9 h-9 sm:w-10 sm:h-10 mb-1" />
              <span>SOS ALERT</span>
            </button>
            <p className="text-xs text-[#68736D]">
              Click to confirm and broadcast emergency alert to PG management
            </p>
          </div>
        )}
      </Card>

      {/* Direct Emergency Contact Directory */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-white border border-[#DDE2DD] space-y-1 text-center shadow-sm">
          <p className="text-[#68736D] font-medium">PG Warden (24x7)</p>
          <p className="text-sm font-bold text-[#18231F]">+91 98765 43210</p>
          <a href="tel:+919876543210" className="inline-block text-[11px] text-[#0B4036] font-bold hover:underline">
            Call Warden
          </a>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DDE2DD] space-y-1 text-center shadow-sm">
          <p className="text-[#68736D] font-medium">National Emergency</p>
          <p className="text-sm font-bold text-red-600">112</p>
          <a href="tel:112" className="inline-block text-[11px] text-red-600 font-bold hover:underline">
            Dial 112
          </a>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DDE2DD] space-y-1 text-center shadow-sm">
          <p className="text-[#68736D] font-medium">Ambulance Services</p>
          <p className="text-sm font-bold text-[#18231F]">108</p>
          <a href="tel:108" className="inline-block text-[11px] text-[#0B4036] font-bold hover:underline">
            Dial 108
          </a>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DDE2DD] space-y-1 text-center shadow-sm">
          <p className="text-[#68736D] font-medium">Women Safety Helpline</p>
          <p className="text-sm font-bold text-[#18231F]">1091</p>
          <a href="tel:1091" className="inline-block text-[11px] text-[#0B4036] font-bold hover:underline">
            Dial 1091
          </a>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="Confirm Emergency SOS Broadcast">
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            ⚠️ This will instantly trigger an emergency sound alert and push notification to the property warden and night manager.
          </div>

          <Textarea
            label="Emergency Details / Specific Assistance Needed (Optional)"
            rows={2}
            placeholder="e.g. Severe chest pain, electrical fire spark in washroom..."
            value={emergencyNotes}
            onChange={(e) => setEmergencyNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" onClick={() => setConfirmModalOpen(false)} disabled={isTriggering}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleTriggerSOS}
              isLoading={isTriggering}
            >
              CONFIRM & BROADCAST SOS
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
