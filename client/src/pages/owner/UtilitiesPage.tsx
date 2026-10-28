import React, { useState, useEffect } from 'react';
import {
  Zap,
  Droplets,
  Plus,
  Calendar,
  Search,
  DollarSign,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { saasApi } from '../../services/saasApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../context/ToastContext';

export const UtilitiesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [utilityType, setUtilityType] = useState('ELECTRICITY');
  const [meterNumber, setMeterNumber] = useState('');
  const [previousReading, setPreviousReading] = useState('');
  const [currentReading, setCurrentReading] = useState('');
  const [unitRate, setUnitRate] = useState('11.5');
  const [billingPeriod, setBillingPeriod] = useState('October 2026');
  const [notes, setNotes] = useState('');

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const res = await saasApi.getUtilities(undefined, typeFilter);
      setReadings(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch utility readings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, [typeFilter]);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saasApi.recordUtility({
        type: utilityType as any,
        meterNumber,
        previousReading: parseFloat(previousReading) || 0,
        currentReading: parseFloat(currentReading),
        unitRate: parseFloat(unitRate),
        billingPeriod,
        notes,
      });
      toast.success('Meter reading recorded successfully!');
      setModalOpen(false);
      setMeterNumber('');
      setPreviousReading('');
      setCurrentReading('');
      setNotes('');
      fetchReadings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record reading');
    }
  };

  const totalBillAmount = readings.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalUnitsConsumed = readings.reduce((sum, r) => sum + (r.unitsConsumed || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Energy & Consumption
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Utility Monitoring & Sub-Meter Readings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track electricity sub-meters, water flow, and billing period consumption across properties and rooms.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchReadings} className="gap-1.5 bg-white">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-3.5 h-3.5" /> Record Meter Reading
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Consumed</p>
          <p className="text-3xl font-black text-slate-800">{totalUnitsConsumed.toFixed(1)} <span className="text-sm font-semibold text-slate-400">kWh / Units</span></p>
          <p className="text-[11px] text-slate-400 mt-1">Recorded across sub-meters</p>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Calculated Energy Bill</p>
          <p className="text-3xl font-black text-amber-600">₹{totalBillAmount.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total utility cost this cycle</p>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Sub-Meters</p>
          <p className="text-3xl font-black text-emerald-700">{readings.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Monitored rooms and common areas</p>
        </Card>
      </div>

      {/* Readings Table */}
      <Card className="border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Type / Meter</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Previous Reading</th>
                <th className="py-3 px-4">Current Reading</th>
                <th className="py-3 px-4">Units Consumed</th>
                <th className="py-3 px-4 text-right">Total Bill (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {readings.length > 0 ? (
                readings.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        {r.type === 'ELECTRICITY' ? <Zap className="w-3.5 h-3.5 text-amber-500" /> : <Droplets className="w-3.5 h-3.5 text-sky-500" />}
                        {r.meterNumber}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{r.type}</p>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{r.billingPeriod}</td>
                    <td className="py-3 px-4 text-slate-500">{r.previousReading}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.currentReading}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{r.unitsConsumed} Units</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">₹{r.totalAmount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No utility readings recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Record Reading */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Utility Meter Reading">
        <form onSubmit={handleRecord} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Utility Type</label>
              <select
                value={utilityType}
                onChange={(e) => setUtilityType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="ELECTRICITY">Electricity (kWh)</option>
                <option value="WATER">Water Meter</option>
                <option value="GAS">Cooking Gas Sub-meter</option>
                <option value="INTERNET">Bandwidth / Internet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Meter / Sub-Meter ID</label>
              <input
                type="text"
                required
                placeholder="e.g. MTR-ROOM-201 or MAIN-FL-1"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Previous</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="0"
                value={previousReading}
                onChange={(e) => setPreviousReading(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="120"
                value={currentReading}
                onChange={(e) => setCurrentReading(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rate (₹/Unit)</label>
              <input
                type="number"
                step="0.1"
                required
                value={unitRate}
                onChange={(e) => setUnitRate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Billing Period</label>
            <input
              type="text"
              required
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
              Save Reading
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
