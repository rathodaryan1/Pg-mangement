import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Plus,
  Search,
  Filter,
  RefreshCw,
  QrCode,
  AlertTriangle
} from 'lucide-react';
import { operationsApi } from '../../services/operationsApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n';

export const AssetsVendorsPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assets' | 'vendors'>('assets');
  const [assets, setAssets] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Modals
  const [createAssetModal, setCreateAssetModal] = useState(false);
  const [serviceModal, setServiceModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [createVendorModal, setCreateVendorModal] = useState(false);

  // Forms
  const [assetForm, setAssetForm] = useState({
    name: '',
    category: 'AC',
    location: '',
    serialNumber: '',
    vendorName: '',
    vendorContact: '',
    serviceIntervalDays: '90',
    notes: '',
  });

  const [serviceForm, setServiceForm] = useState({
    serviceCost: '0',
    notes: 'Routine quarterly filter cleanup and gas pressure check',
  });

  const [vendorForm, setVendorForm] = useState({
    name: '',
    category: 'GROCERY',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aRes, vRes] = await Promise.all([
        operationsApi.getAssets(),
        operationsApi.getVendors(),
      ]);
      setAssets((aRes.data as any[]) || []);
      setVendors((vRes.data as any[]) || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch assets and vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await operationsApi.createAsset(assetForm);
      toast.success('Asset registered successfully');
      setCreateAssetModal(false);
      setAssetForm({
        name: '',
        category: 'AC',
        location: '',
        serialNumber: '',
        vendorName: '',
        vendorContact: '',
        serviceIntervalDays: '90',
        notes: '',
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register asset');
    }
  };

  const openServiceModal = (asset: any) => {
    setSelectedAsset(asset);
    setServiceModal(true);
  };

  const handleLogService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await operationsApi.logAssetService(selectedAsset.id, {
        serviceCost: parseFloat(serviceForm.serviceCost) || 0,
        notes: serviceForm.notes,
      });
      toast.success('Service recorded and next due date updated');
      setServiceModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log service');
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await operationsApi.createVendor(vendorForm);
      toast.success('Vendor added to procurement directory');
      setCreateVendorModal(false);
      setVendorForm({
        name: '',
        category: 'GROCERY',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstNumber: '',
        notes: '',
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create vendor');
    }
  };

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.location.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase()) ||
    v.phone.includes(search)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Physical Assets & Supply Chain
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Asset Register & Procurement Vendors
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track equipment warranties, scheduled preventive servicing, and authorized procurement suppliers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 bg-white">
            <RefreshCw className="w-3.5 h-3.5" /> {t('refresh', 'Refresh')}
          </Button>
          {activeTab === 'assets' ? (
            <Button size="sm" onClick={() => setCreateAssetModal(true)} className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
              <Plus className="w-3.5 h-3.5" /> Register Asset
            </Button>
          ) : (
            <Button size="sm" onClick={() => setCreateVendorModal(true)} className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
              <Plus className="w-3.5 h-3.5" /> Add Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-3">
        <button
          onClick={() => setActiveTab('assets')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'assets' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Equipment Assets ({assets.length})
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'vendors' ? 'border-emerald-700 text-emerald-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Procurement Directory ({vendors.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder={activeTab === 'assets' ? 'Search equipment by name, category, or location...' : 'Search supplier by name, phone, or category...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
        />
      </div>

      {/* Asset Register Tab */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.length === 0 ? (
            <div className="col-span-full py-10 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              No assets registered. Click "Register Asset" to add equipment.
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isDueSoon = asset.nextServiceDue && new Date(asset.nextServiceDue) < new Date(Date.now() + 15 * 86400000);
              return (
                <Card key={asset.id} className="p-4 bg-white border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 uppercase">
                        {asset.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">{asset.name}</h4>
                      <p className="text-[11px] text-slate-500">Location: {asset.location}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        asset.status === 'OPERATIONAL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {asset.status}
                    </span>
                  </div>

                  <div className="text-[11px] space-y-1 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p className="flex items-center justify-between">
                      <span>Next Service Due:</span>
                      <strong className={isDueSoon ? 'text-amber-700' : 'text-slate-800'}>
                        {asset.nextServiceDue ? new Date(asset.nextServiceDue).toISOString().split('T')[0] : 'Not Scheduled'}
                      </strong>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Service Interval:</span>
                      <span>Every {asset.serviceIntervalDays} days</span>
                    </p>
                    {asset.vendorName && (
                      <p className="flex items-center justify-between">
                        <span>Vendor:</span>
                        <span>{asset.vendorName} ({asset.vendorContact})</span>
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openServiceModal(asset)}
                    className="w-full text-xs gap-1 text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Log Service Maintenance
                  </Button>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Vendor Directory Tab */}
      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.length === 0 ? (
            <div className="col-span-full py-10 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              No vendors registered. Click "Add Supplier" to build your procurement network.
            </div>
          ) : (
            filteredVendors.map((vendor) => (
              <Card key={vendor.id} className="p-4 bg-white border border-slate-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                      {vendor.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 mt-1">{vendor.name}</h4>
                    <p className="text-[11px] text-slate-500">Contact: {vendor.contactPerson || 'Office Desk'}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    ★ {vendor.rating || 5.0}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{vendor.phone}</span>
                  </p>
                  {vendor.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{vendor.email}</span>
                    </p>
                  )}
                  {vendor.gstNumber && (
                    <p className="text-[10px] text-slate-400 font-mono">GST: {vendor.gstNumber}</p>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal: Register Asset */}
      <Modal isOpen={createAssetModal} onClose={() => setCreateAssetModal(false)} title="Register Physical Asset & Equipment">
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-700">Equipment / Asset Name</label>
            <input
              type="text"
              placeholder="e.g., Voltas 1.5T Inverter AC / Kent Commercial RO Plant"
              value={assetForm.name}
              onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Category</label>
              <select
                value={assetForm.category}
                onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              >
                <option value="AC">Air Conditioner (AC)</option>
                <option value="RO_WATER">RO Drinking Water Plant</option>
                <option value="WATER_PUMP">Water Pump / Motor</option>
                <option value="GEYSER">Water Geyser / Boiler</option>
                <option value="GENERATOR">Power Generator / Inverter</option>
                <option value="LIFT">Elevator / Lift</option>
                <option value="APPLIANCE">Kitchen Appliance / Fridge</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Location</label>
              <input
                type="text"
                placeholder="e.g. Room 204 / Terrace"
                value={assetForm.location}
                onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Service Interval (Days)</label>
              <input
                type="number"
                value={assetForm.serviceIntervalDays}
                onChange={(e) => setAssetForm({ ...assetForm, serviceIntervalDays: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Serial Number</label>
              <input
                type="text"
                placeholder="Optional serial #"
                value={assetForm.serialNumber}
                onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateAssetModal(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">Save Asset</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Asset Service */}
      <Modal isOpen={serviceModal} onClose={() => setServiceModal(false)} title="Log Preventive Maintenance Service">
        <form onSubmit={handleLogService} className="space-y-4">
          <p className="text-xs text-slate-600">
            Recording maintenance on <strong>{selectedAsset?.name}</strong> will reset the service clock and automatically schedule the next inspection.
          </p>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Service Cost (₹)</label>
            <input
              type="number"
              value={serviceForm.serviceCost}
              onChange={(e) => setServiceForm({ ...serviceForm, serviceCost: e.target.value })}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Service Report / Notes</label>
            <textarea
              value={serviceForm.notes}
              onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setServiceModal(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">Record Service</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Vendor */}
      <Modal isOpen={createVendorModal} onClose={() => setCreateVendorModal(false)} title="Add Procurement Vendor">
        <form onSubmit={handleCreateVendor} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-700">Vendor / Business Name</label>
            <input
              type="text"
              placeholder="e.g. Mahadev Electricals & Plumbing"
              value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Category</label>
              <select
                value={vendorForm.category}
                onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              >
                <option value="GROCERY">Grocery & Pantry</option>
                <option value="PLUMBING">Plumbing & Water</option>
                <option value="ELECTRICAL">Electrical & Appliances</option>
                <option value="SECURITY">Security & Access</option>
                <option value="INTERNET">Internet & WiFi</option>
                <option value="REPAIRS">Civil & Furniture Repairs</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Phone</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={vendorForm.phone}
                onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateVendorModal(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">Save Supplier</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
