import React, { useState, useEffect } from 'react';
import { Box, ShieldAlert, Plus, Search, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import type { Column } from '../../components/ui/Table';
import { Table } from '../../components/ui/Table';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import type { AssetInventoryItem } from '../../types';

export const InventoryPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [assets, setAssets] = useState<AssetInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addAssetModal, setAddAssetModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const res = await ownerApi.getInventory(activeProperty.id);
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

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!assetForm.name) {
        alert('Please enter asset name');
        return;
      }
      await ownerApi.createInventoryItem({
        propertyId: activeProperty.id,
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
      setToastMessage(`Asset ${assetForm.name} logged successfully!`);
      setTimeout(() => setToastMessage(null), 4000);
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

  const lowStockItems = assets.filter((a) => a.quantity <= (a.minQuantity || 1));

  const columns: Column<AssetInventoryItem>[] = [
    {
      header: 'Asset Name',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.name}</p>
          <p className="text-[11px] text-slate-400">Vendor: {row.vendorName || row.vendor || 'Direct Purchase'}</p>
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
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                LOW
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Condition',
      cell: (row) => <StatusBadge status={row.condition} />
    },
    {
      header: 'Location',
      accessorKey: 'location'
    },
    {
      header: 'Warranty Expiry',
      cell: (row) => (
        row.warrantyExpiry ? (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            {new Date(row.warrantyExpiry).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-slate-400">N/A</span>
        )
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
          <p className="text-xs text-slate-500">Track property assets (Water purifiers, ACs, Geysers, Furniture), stock quantities, and warranty alerts</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setAddAssetModal(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Log Asset Item
        </Button>
      </div>

      {/* Low Stock Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs text-rose-900 dark:text-rose-200">
            <strong>Low Stock Alert:</strong> {lowStockItems.length} inventory items are at or below minimum threshold ({lowStockItems.map((i) => i.name).join(', ')}). Reorder recommended.
          </div>
        </div>
      )}

      <Table columns={columns} data={assets} keyExtractor={(item) => item.id} isLoading={isLoading} />

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
            <Button variant="outline" size="sm" type="button" onClick={() => setAddAssetModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Log Asset</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
