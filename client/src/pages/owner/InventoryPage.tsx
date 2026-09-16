import React, { useState, useEffect } from 'react';
import {
  Box,
  ShieldAlert,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import type { Column } from '../../components/ui/Table';
import { Table } from '../../components/ui/Table';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';

export const InventoryPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals state
  const [addAssetModal, setAddAssetModal] = useState(false);
  const [editAssetModal, setEditAssetModal] = useState(false);
  const [stockModal, setStockModal] = useState(false);
  const [archiveModal, setArchiveModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Forms
  const [assetForm, setAssetForm] = useState({
    name: '',
    category: 'APPLIANCE',
    quantity: '1',
    minQuantity: '1',
    location: 'Property Level',
    vendor: '',
    cost: '',
    warrantyExpiry: '',
    condition: 'EXCELLENT'
  });

  const [stockForm, setStockForm] = useState<{
    delta: number;
    type: 'IN' | 'OUT';
    note: string;
  }>({
    delta: 1,
    type: 'IN',
    note: ''
  });

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const res = await ownerApi.getInventory(activeProperty?.id);
      setAssets(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [activeProperty]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!assetForm.name) {
        alert('Please enter asset name');
        return;
      }
      await ownerApi.createInventoryItem({
        propertyId: activeProperty?.id,
        name: assetForm.name,
        category: assetForm.category,
        quantity: parseInt(assetForm.quantity) || 1,
        minQuantity: parseInt(assetForm.minQuantity) || 1,
        location: assetForm.location,
        vendor: assetForm.vendor || undefined,
        cost: assetForm.cost ? parseFloat(assetForm.cost) : undefined,
        warrantyExpiry: assetForm.warrantyExpiry ? new Date(assetForm.warrantyExpiry).toISOString() : undefined,
        condition: assetForm.condition
      });

      setAddAssetModal(false);
      showToast(`Asset "${assetForm.name}" created successfully!`);
      setAssetForm({
        name: '',
        category: 'APPLIANCE',
        quantity: '1',
        minQuantity: '1',
        location: 'Property Level',
        vendor: '',
        cost: '',
        warrantyExpiry: '',
        condition: 'EXCELLENT'
      });
      fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to create inventory item');
    }
  };

  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await ownerApi.updateInventoryItem(selectedAsset.id, {
        name: assetForm.name,
        category: assetForm.category,
        quantity: parseInt(assetForm.quantity) || 1,
        minQuantity: parseInt(assetForm.minQuantity) || 1,
        location: assetForm.location,
        vendor: assetForm.vendor || undefined,
        cost: assetForm.cost ? parseFloat(assetForm.cost) : undefined,
        warrantyExpiry: assetForm.warrantyExpiry ? new Date(assetForm.warrantyExpiry).toISOString() : undefined,
        condition: assetForm.condition
      });

      setEditAssetModal(false);
      showToast(`Asset "${assetForm.name}" updated successfully!`);
      setSelectedAsset(null);
      fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to update asset item');
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await ownerApi.updateStock(selectedAsset.id, {
        delta: stockForm.delta,
        type: stockForm.type,
        note: stockForm.note
      });

      setStockModal(false);
      showToast(`Stock ${stockForm.type === 'IN' ? 'added' : 'deducted'} successfully!`);
      setSelectedAsset(null);
      fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  const handleArchiveAsset = async () => {
    if (!selectedAsset) return;
    try {
      await ownerApi.archiveInventoryItem(selectedAsset.id);
      setArchiveModal(false);
      showToast(`Asset "${selectedAsset.name}" archived successfully.`);
      setSelectedAsset(null);
      fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Failed to archive asset');
    }
  };

  const openEditModal = (asset: any) => {
    setSelectedAsset(asset);
    setAssetForm({
      name: asset.name || '',
      category: asset.category || 'APPLIANCE',
      quantity: String(asset.quantity || 1),
      minQuantity: String(asset.minQuantity || 1),
      location: asset.location || 'Property Level',
      vendor: asset.vendor || asset.vendorName || '',
      cost: asset.cost ? String(asset.cost) : '',
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : '',
      condition: asset.condition || 'EXCELLENT'
    });
    setEditAssetModal(true);
  };

  const openStockModal = (asset: any, type: 'IN' | 'OUT') => {
    setSelectedAsset(asset);
    setStockForm({
      delta: 1,
      type,
      note: ''
    });
    setStockModal(true);
  };

  const filteredAssets = assets.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = assets.filter((a) => a.quantity <= (a.minQuantity || 1));

  const columns: Column<any>[] = [
    {
      header: 'Asset Name',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.name}</p>
          <p className="text-[11px] text-slate-400">Vendor: {row.vendor || row.vendorName || 'Direct Purchase'}</p>
        </div>
      )
    },
    {
      header: 'Category',
      cell: (row) => <Badge variant="secondary">{row.category}</Badge>
    },
    {
      header: 'Stock Quantity',
      cell: (row) => {
        const isLow = row.quantity <= (row.minQuantity || 1);
        return (
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-xs ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {row.quantity} units
            </span>
            {isLow && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                LOW
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Condition',
      cell: (row) => <StatusBadge status={row.condition || 'GOOD'} />
    },
    {
      header: 'Location',
      accessorKey: 'location'
    },
    {
      header: 'Warranty Expiry',
      cell: (row) =>
        row.warrantyExpiry ? (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            {new Date(row.warrantyExpiry).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-slate-400">N/A</span>
        )
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openStockModal(row, 'IN')}
            className="text-[11px] h-7 px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            title="Stock In (+)"
          >
            <ArrowUpRight className="w-3 h-3 mr-0.5" /> In
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openStockModal(row, 'OUT')}
            className="text-[11px] h-7 px-2 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            title="Stock Out (-)"
          >
            <ArrowDownRight className="w-3 h-3 mr-0.5" /> Out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-600"
            title="Edit Asset"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedAsset(row);
              setArchiveModal(true);
            }}
            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
            title="Archive Asset"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ];

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Inventory & Asset Tracking</h1>
          <p className="text-xs text-slate-500">
            Track property assets (Water purifiers, ACs, Geysers, Furniture), stock in/out adjustments, and warranty alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAssets} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setAssetForm({
                name: '',
                category: 'APPLIANCE',
                quantity: '1',
                minQuantity: '1',
                location: 'Property Level',
                vendor: '',
                cost: '',
                warrantyExpiry: '',
                condition: 'EXCELLENT'
              });
              setAddAssetModal(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Log Asset Item
          </Button>
        </div>
      </div>

      {/* Low Stock Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs text-rose-900 dark:text-rose-200">
            <strong>Low Stock Alert:</strong> {lowStockItems.length} inventory items are at or below minimum threshold (
            {lowStockItems.map((i) => i.name).join(', ')}). Reorder recommended.
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card className="p-4 border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets by name, vendor, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              options={[
                { label: 'All Categories', value: 'ALL' },
                { label: 'Appliance', value: 'APPLIANCE' },
                { label: 'Furniture', value: 'FURNITURE' },
                { label: 'Electrical', value: 'ELECTRICAL' },
                { label: 'Plumbing', value: 'PLUMBING' },
                { label: 'Linen & Bedding', value: 'LINEN' },
                { label: 'Cleaning & Housekeeping', value: 'CLEANING' },
                { label: 'Other', value: 'OTHER' }
              ]}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Assets Table */}
      <Table columns={columns} data={filteredAssets} keyExtractor={(item) => item.id} isLoading={isLoading} />

      {/* Add Asset Modal */}
      <Modal isOpen={addAssetModal} onClose={() => setAddAssetModal(false)} title="Log New Property Asset / Item">
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <Input
            label="Asset / Item Name"
            placeholder="e.g. Commercial RO Water Purifier 50LPH"
            value={assetForm.name}
            onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={[
                { label: 'Appliance', value: 'APPLIANCE' },
                { label: 'Furniture', value: 'FURNITURE' },
                { label: 'Electrical', value: 'ELECTRICAL' },
                { label: 'Plumbing', value: 'PLUMBING' },
                { label: 'Linen & Bedding', value: 'LINEN' },
                { label: 'Cleaning & Housekeeping', value: 'CLEANING' },
                { label: 'Other', value: 'OTHER' }
              ]}
              value={assetForm.category}
              onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
            />
            <Select
              label="Condition"
              options={[
                { label: 'Brand New / Excellent', value: 'EXCELLENT' },
                { label: 'Good Working Condition', value: 'GOOD' },
                { label: 'Fair Condition', value: 'FAIR' },
                { label: 'Poor / Needs Service', value: 'POOR' },
                { label: 'Damaged', value: 'DAMAGED' }
              ]}
              value={assetForm.condition}
              onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Current Quantity"
              type="number"
              value={assetForm.quantity}
              onChange={(e) => setAssetForm({ ...assetForm, quantity: e.target.value })}
              required
            />
            <Input
              label="Minimum Threshold Quantity"
              type="number"
              value={assetForm.minQuantity}
              onChange={(e) => setAssetForm({ ...assetForm, minQuantity: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Vendor / Supplier"
              placeholder="e.g. Kent Water Systems"
              value={assetForm.vendor}
              onChange={(e) => setAssetForm({ ...assetForm, vendor: e.target.value })}
            />
            <Input
              label="Purchase Cost (₹)"
              type="number"
              placeholder="18500"
              value={assetForm.cost}
              onChange={(e) => setAssetForm({ ...assetForm, cost: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Location / Room / Floor"
              placeholder="e.g. Block A Cafeteria"
              value={assetForm.location}
              onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
            />
            <Input
              label="Warranty Expiry Date"
              type="date"
              value={assetForm.warrantyExpiry}
              onChange={(e) => setAssetForm({ ...assetForm, warrantyExpiry: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setAddAssetModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Log Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Asset Modal */}
      <Modal isOpen={editAssetModal} onClose={() => setEditAssetModal(false)} title={`Edit Asset: ${selectedAsset?.name}`}>
        <form onSubmit={handleEditAsset} className="space-y-4">
          <Input
            label="Asset / Item Name"
            value={assetForm.name}
            onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={[
                { label: 'Appliance', value: 'APPLIANCE' },
                { label: 'Furniture', value: 'FURNITURE' },
                { label: 'Electrical', value: 'ELECTRICAL' },
                { label: 'Plumbing', value: 'PLUMBING' },
                { label: 'Linen & Bedding', value: 'LINEN' },
                { label: 'Cleaning & Housekeeping', value: 'CLEANING' },
                { label: 'Other', value: 'OTHER' }
              ]}
              value={assetForm.category}
              onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
            />
            <Select
              label="Condition"
              options={[
                { label: 'Brand New / Excellent', value: 'EXCELLENT' },
                { label: 'Good Working Condition', value: 'GOOD' },
                { label: 'Fair Condition', value: 'FAIR' },
                { label: 'Poor / Needs Service', value: 'POOR' },
                { label: 'Damaged', value: 'DAMAGED' }
              ]}
              value={assetForm.condition}
              onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Current Quantity"
              type="number"
              value={assetForm.quantity}
              onChange={(e) => setAssetForm({ ...assetForm, quantity: e.target.value })}
              required
            />
            <Input
              label="Minimum Threshold Quantity"
              type="number"
              value={assetForm.minQuantity}
              onChange={(e) => setAssetForm({ ...assetForm, minQuantity: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Vendor / Supplier"
              value={assetForm.vendor}
              onChange={(e) => setAssetForm({ ...assetForm, vendor: e.target.value })}
            />
            <Input
              label="Purchase Cost (₹)"
              type="number"
              value={assetForm.cost}
              onChange={(e) => setAssetForm({ ...assetForm, cost: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Location / Room / Floor"
              value={assetForm.location}
              onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
            />
            <Input
              label="Warranty Expiry Date"
              type="date"
              value={assetForm.warrantyExpiry}
              onChange={(e) => setAssetForm({ ...assetForm, warrantyExpiry: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setEditAssetModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stock In / Out Adjustment Modal */}
      <Modal
        isOpen={stockModal}
        onClose={() => setStockModal(false)}
        title={`${stockForm.type === 'IN' ? 'Stock In (+)' : 'Stock Out (-)'}: ${selectedAsset?.name}`}
      >
        <form onSubmit={handleStockAdjustment} className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <p className="text-slate-500">Current Stock Quantity: <strong className="text-slate-900 dark:text-white">{selectedAsset?.quantity} units</strong></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Operation Type"
              options={[
                { label: 'Stock In (Add Stock +)', value: 'IN' },
                { label: 'Stock Out (Deduct Stock -)', value: 'OUT' }
              ]}
              value={stockForm.type}
              onChange={(e) => setStockForm({ ...stockForm, type: e.target.value as 'IN' | 'OUT' })}
            />
            <Input
              label="Quantity to Adjust"
              type="number"
              min="1"
              value={stockForm.delta}
              onChange={(e) => setStockForm({ ...stockForm, delta: parseInt(e.target.value) || 1 })}
              required
            />
          </div>
          <Input
            label="Adjustment Reason / Note"
            placeholder="e.g. Delivered new batch / Replaced damaged unit in Room 102"
            value={stockForm.note}
            onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setStockModal(false)}>
              Cancel
            </Button>
            <Button variant={stockForm.type === 'IN' ? 'primary' : 'danger'} size="sm" type="submit">
              Confirm {stockForm.type === 'IN' ? 'Stock Addition' : 'Stock Deduction'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Modal */}
      <Modal isOpen={archiveModal} onClose={() => setArchiveModal(false)} title="Confirm Asset Archival">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 dark:text-rose-200">
              Are you sure you want to archive <strong>{selectedAsset?.name}</strong>?
              This will remove the item from active stock counts while preserving historical maintenance logs.
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setArchiveModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleArchiveAsset}>
              Archive Asset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryPage;
