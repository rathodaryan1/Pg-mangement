import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  PhoneCall,
  Clock,
  User,
  ShieldAlert,
  Search,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import ownerApi from '../../services/ownerApi';

export const OwnerEmergencyPage: React.FC = () => {
  const [sosEvents, setSosEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await ownerApi.getSOSEvents();
      setSosEvents(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch SOS events:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      await ownerApi.acknowledgeSOS(id);
      setToastMessage('SOS broadcast acknowledged! Emergency team notified.');
      setTimeout(() => setToastMessage(null), 3500);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge SOS');
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      await ownerApi.resolveSOS(selectedEvent.id, resolutionNotes || 'Incident verified and safely resolved');
      setResolveModalOpen(false);
      setSelectedEvent(null);
      setResolutionNotes('');
      setToastMessage('Emergency incident marked as RESOLVED and logged in audit trail.');
      setTimeout(() => setToastMessage(null), 3500);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve SOS');
    }
  };

  const activeCount = sosEvents.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Emergency SOS Incident Center
            </h1>
            {activeCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold animate-pulse">
                {activeCount} Active Trigger
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time critical distress broadcast monitor and rapid response logging
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="tel:112"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency Police / Medical (112)</span>
          </a>
        </div>
      </div>

      {/* SOS Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sosEvents.map((evt) => {
          const isActive = evt.status === 'ACTIVE';
          return (
            <Card
              key={evt.id}
              className={`p-5 space-y-4 border-2 transition-all ${
                isActive
                  ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-lg'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      isActive
                        ? 'bg-rose-500 text-white animate-bounce'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {evt.residentName || 'Resident Alert'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Room {evt.roomNumber || '101'} • {evt.propertyId}
                    </p>
                  </div>
                </div>
                <StatusBadge status={evt.status} />
              </div>

              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Trigger Time:</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{new Date(evt.triggeredAt).toLocaleString()}</strong>
                </div>
                {evt.notes && (
                  <div className="pt-2 text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-semibold">Notes: </span>{evt.notes}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {isActive && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs bg-amber-600 hover:bg-amber-700"
                    onClick={() => handleAcknowledge(evt.id)}
                  >
                    Acknowledge
                  </Button>
                )}
                {evt.status !== 'RESOLVED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      setSelectedEvent(evt);
                      setResolutionNotes('');
                      setResolveModalOpen(true);
                    }}
                  >
                    Mark Resolved
                  </Button>
                )}
                {evt.status === 'RESOLVED' && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Incident Closed
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Resolution Modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Resolve Emergency Incident"
      >
        <form onSubmit={handleResolve} className="space-y-4">
          <p className="text-xs text-slate-500">
            Confirm the safe resolution of the distress incident for <strong>{selectedEvent?.residentName}</strong> (Room {selectedEvent?.roomNumber}).
          </p>
          <Input
            label="Resolution Incident Notes"
            placeholder="e.g. Attended on site by manager. Resident confirmed safe."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Complete Resolution
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OwnerEmergencyPage;
