import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  Building2,
  Layers,
  ArrowRightLeft,
  Wrench,
  CheckCircle2,
  Clock,
  User,
  RefreshCw,
  LayoutGrid,
  List
} from 'lucide-react';
import { operationsApi } from '../../services/operationsApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n';

export const VisualOccupancyPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('ALL');

  // Modals
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<any | null>(null);

  // Forms
  const [targetBedId, setTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('Resident requested quieter room');
  const [maintenanceReason, setMaintenanceReason] = useState('AC repair / deep cleaning required');

  const fetchVisualMap = async () => {
    setLoading(true);
    try {
      const res = await operationsApi.getVisualOccupancyMap();
      setData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load visual occupancy map');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisualMap();
  }, []);

  const openTransferModal = (bed: any) => {
    setSelectedBed(bed);
    setTargetBedId('');
    setTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBed || !selectedBed.resident || !targetBedId) {
      toast.error('Please select an available target bed.');
      return;
    }

    try {
      await operationsApi.transferResidentBed({
        residentId: selectedBed.resident.id,
        targetBedId,
        reason: transferReason,
      });
      toast.success(`Resident ${selectedBed.resident.fullName} transferred successfully.`);
      setTransferModalOpen(false);
      fetchVisualMap();
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed');
    }
  };

  const openMaintenanceModal = (bed: any) => {
    setSelectedBed(bed);
    setMaintenanceModalOpen(true);
  };

  const handleToggleMaintenance = async (isBlocked: boolean) => {
    if (!selectedBed) return;
    try {
      await operationsApi.toggleBedMaintenance({
        bedId: selectedBed.id,
        isMaintenance: isBlocked,
        reason: maintenanceReason,
      });
      toast.success(isBlocked ? 'Bed marked under maintenance' : 'Bed restored to Available');
      setMaintenanceModalOpen(false);
      fetchVisualMap();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bed status');
    }
  };

  const summary = data?.summary || {};
  const property = data?.property || {};
  const buildings = property?.buildings || [];
  const unassignedRooms = property?.unassignedRooms || [];

  // Extract all available beds across the property for transfer target dropdown
  const allAvailableBeds: { id: string; label: string }[] = [];
  buildings.forEach((b: any) => {
    (b.floors || []).forEach((f: any) => {
      (f.rooms || []).forEach((r: any) => {
        (r.beds || []).forEach((bed: any) => {
          if (bed.status === 'AVAILABLE' && bed.id !== selectedBed?.id) {
            allAvailableBeds.push({
              id: bed.id,
              label: `${b.name} - Floor ${f.number} - Room ${r.number} - Bed ${bed.bedNumber} (₹${bed.monthlyRent || r.baseRent}/mo)`,
            });
          }
        });
      });
    });
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Physical Inventory Architecture
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Visual Room & Bed Allocation Layout
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time physical property map showing live bed states, resident assignments, move-outs, and maintenance blocks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View mode toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Floor Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Table View
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={fetchVisualMap} className="gap-1.5 bg-white">
            <RefreshCw className="w-3.5 h-3.5" /> {t('refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <p className="text-[10px] font-bold uppercase text-slate-500">Total Capacity</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{summary.totalBeds || 0} Beds</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{summary.totalRooms || 0} Rooms total</p>
        </div>
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
          <p className="text-[10px] font-bold uppercase text-blue-700">Occupied Beds</p>
          <p className="text-xl font-extrabold text-blue-900 mt-1">{summary.occupiedBeds || 0}</p>
          <p className="text-[10px] text-blue-600 mt-0.5">{summary.occupancyPercentage || 0}% Occupancy</p>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
          <p className="text-[10px] font-bold uppercase text-emerald-700">Available Beds</p>
          <p className="text-xl font-extrabold text-emerald-900 mt-1">{summary.availableBeds || 0}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Ready for booking</p>
        </div>
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
          <p className="text-[10px] font-bold uppercase text-amber-700">Reserved Beds</p>
          <p className="text-xl font-extrabold text-amber-900 mt-1">{summary.reservedBeds || 0}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Bookings pending</p>
        </div>
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
          <p className="text-[10px] font-bold uppercase text-rose-700">Under Maintenance</p>
          <p className="text-xl font-extrabold text-rose-900 mt-1">{summary.maintenanceBeds || 0}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Blocked from booking</p>
        </div>
        <div className="p-3.5 rounded-xl border border-[#DDE2DD] bg-[#F8F7F3] flex flex-col justify-center">
          <p className="text-[10px] font-bold text-slate-600">Quick Legend</p>
          <div className="flex flex-wrap gap-1.5 mt-1 text-[9px] font-bold">
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Available</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Occupied</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">Blocked</span>
          </div>
        </div>
      </div>

      {/* Grid Floor Plan View */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {buildings.map((building: any) => (
            <div key={building.id} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Building2 className="w-4 h-4 text-emerald-800" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">{building.name}</h3>
                <span className="text-xs text-slate-400 font-normal">({(building.floors || []).length} Floors)</span>
              </div>

              {(building.floors || []).map((floor: any) => (
                <div key={floor.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" /> Floor {floor.number}
                    </span>
                    <span className="text-[11px] text-slate-400">{(floor.rooms || []).length} Rooms on this floor</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {(floor.rooms || []).map((room: any) => (
                      <div key={room.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900">Room {room.number}</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{room.type}</span>
                        </div>

                        {/* Interactive Beds */}
                        <div className="space-y-1.5">
                          {(room.beds || []).map((bed: any) => {
                            let statusStyle = 'border-emerald-300 bg-emerald-50 text-emerald-900';
                            if (bed.status === 'OCCUPIED') statusStyle = 'border-blue-300 bg-blue-50 text-blue-900';
                            else if (bed.status === 'RESERVED') statusStyle = 'border-amber-300 bg-amber-50 text-amber-900';
                            else if (bed.status === 'MAINTENANCE') statusStyle = 'border-rose-300 bg-rose-50 text-rose-900';

                            return (
                              <div
                                key={bed.id}
                                className={`p-2 rounded-md border text-xs flex items-center justify-between transition-all ${statusStyle}`}
                              >
                                <div>
                                  <span className="font-bold">{bed.bedNumber}</span>
                                  {bed.resident ? (
                                    <p className="text-[10px] text-slate-700 font-medium truncate max-w-[130px]">
                                      {bed.resident.fullName}
                                      {bed.resident.status === 'NOTICE_PERIOD' && (
                                        <span className="text-rose-700 font-bold ml-1">(Notice)</span>
                                      )}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-slate-500">₹{bed.monthlyRent || room.baseRent}/mo</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  {bed.status === 'OCCUPIED' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openTransferModal(bed)}
                                      className="p-1 h-6 text-slate-600 hover:text-blue-700 hover:bg-blue-100/50"
                                      title="Transfer Bed"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openMaintenanceModal(bed)}
                                    className="p-1 h-6 text-slate-600 hover:text-rose-700 hover:bg-rose-100/50"
                                    title={bed.status === 'MAINTENANCE' ? 'Restore Bed' : 'Mark Maintenance'}
                                  >
                                    <Wrench className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Accessible Table Alternative View */}
      {viewMode === 'table' && (
        <Card className="p-4 bg-white border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">Building</th>
                  <th className="py-2.5 px-3">Floor</th>
                  <th className="py-2.5 px-3">Room</th>
                  <th className="py-2.5 px-3">Bed</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Current Resident</th>
                  <th className="py-2.5 px-3">Monthly Rent</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buildings.flatMap((b: any) =>
                  (b.floors || []).flatMap((f: any) =>
                    (f.rooms || []).flatMap((r: any) =>
                      (r.beds || []).map((bed: any) => (
                        <tr key={bed.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold">{b.name}</td>
                          <td className="py-2.5 px-3 text-slate-500">Floor {f.number}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{r.number}</td>
                          <td className="py-2.5 px-3 font-medium">{bed.bedNumber}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                bed.status === 'OCCUPIED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : bed.status === 'AVAILABLE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : bed.status === 'MAINTENANCE'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {bed.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {bed.resident ? bed.resident.fullName : '—'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">₹{bed.monthlyRent || r.baseRent}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {bed.status === 'OCCUPIED' && (
                                <Button size="sm" variant="ghost" onClick={() => openTransferModal(bed)} className="p-1 h-6">
                                  <ArrowRightLeft className="w-3 h-3" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => openMaintenanceModal(bed)} className="p-1 h-6">
                                <Wrench className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Transfer Resident to Another Bed */}
      <Modal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transfer Resident to Another Bed">
        <form onSubmit={handleExecuteTransfer} className="space-y-4">
          <p className="text-xs text-slate-600">
            Transferring <strong>{selectedBed?.resident?.fullName}</strong> from current bed {selectedBed?.bedNumber}.
          </p>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Target Bed (Available Only)</label>
            <select
              value={targetBedId}
              onChange={(e) => setTargetBedId(e.target.value)}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              required
            >
              <option value="">Select target bed...</option>
              {allAvailableBeds.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Transfer Reason</label>
            <textarea
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setTransferModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">Execute Transfer</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Toggle Bed Maintenance */}
      <Modal isOpen={maintenanceModalOpen} onClose={() => setMaintenanceModalOpen(false)} title="Update Bed Maintenance State">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Current status for bed <strong>{selectedBed?.bedNumber}</strong> is <strong>{selectedBed?.status}</strong>.
          </p>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Maintenance Reason / Notes</label>
            <textarea
              value={maintenanceReason}
              onChange={(e) => setMaintenanceReason(e.target.value)}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setMaintenanceModalOpen(false)}>Cancel</Button>
            {selectedBed?.status === 'MAINTENANCE' ? (
              <Button size="sm" onClick={() => handleToggleMaintenance(false)} className="bg-emerald-700 hover:bg-emerald-800 text-white">
                Restore Bed to Available
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleToggleMaintenance(true)} className="bg-rose-700 hover:bg-rose-800 text-white">
                Block Bed for Maintenance
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
