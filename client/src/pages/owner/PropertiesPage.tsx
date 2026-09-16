import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  Layers,
  Home,
  CheckCircle2,
  AlertTriangle,
  Building,
  ChevronRight,
  Shield,
  Phone,
  Mail,
  CreditCard
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import ownerApi from '../../services/ownerApi';

export const PropertiesPage: React.FC = () => {
  const { activeProperty, setActiveProperty } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PROPERTIES' | 'BUILDINGS' | 'FLOORS'>('PROPERTIES');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    city: 'Bengaluru',
    phone: '',
    email: '',
    upiId: '',
    gstNumber: ''
  });

  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<any | null>(null);
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    code: '',
    numberOfFloors: '3'
  });

  const [floorModalOpen, setFloorModalOpen] = useState(false);
  const [floorForm, setFloorForm] = useState({
    floorNumber: '1',
    buildingId: '',
    buildingName: ''
  });

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    type: 'PROPERTY' | 'BUILDING' | 'FLOOR';
    id: string;
    title: string;
  } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [propRes, bldRes, flrRes] = await Promise.all([
        ownerApi.getProperties(),
        ownerApi.getBuildings(activeProperty.id),
        ownerApi.getFloors()
      ]);
      setProperties(propRes.data || []);
      setBuildings(bldRes.data || []);
      setFloors(flrRes.data || []);
    } catch (err: any) {
      console.error('Failed to fetch property data:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProperty]);

  // Property Handlers
  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!propertyForm.name || !propertyForm.address) {
        alert('Please fill property name and address');
        return;
      }

      if (editingProperty) {
        await ownerApi.updateProperty(editingProperty.id, propertyForm);
        setToastMessage(`Property ${propertyForm.name} updated successfully!`);
      } else {
        await ownerApi.createProperty(propertyForm);
        setToastMessage(`Property ${propertyForm.name} created successfully!`);
      }

      setPropertyModalOpen(false);
      setEditingProperty(null);
      setTimeout(() => setToastMessage(null), 3500);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save property');
    }
  };

  // Building Handlers
  const handleSaveBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!buildingForm.name) {
        alert('Please enter building name');
        return;
      }

      if (editingBuilding) {
        await ownerApi.updateBuilding(editingBuilding.id, buildingForm);
        setToastMessage(`Building ${buildingForm.name} updated successfully!`);
      } else {
        await ownerApi.createBuilding({
          propertyId: activeProperty.id,
          ...buildingForm,
          numberOfFloors: parseInt(buildingForm.numberOfFloors, 10)
        });
        setToastMessage(`Building ${buildingForm.name} added successfully!`);
      }

      setBuildingModalOpen(false);
      setEditingBuilding(null);
      setTimeout(() => setToastMessage(null), 3500);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save building');
    }
  };

  // Floor Handlers
  const handleSaveFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ownerApi.createFloor({
        floorNumber: parseInt(floorForm.floorNumber, 10),
        buildingId: floorForm.buildingId || (buildings[0]?.id || 'bld-1'),
        buildingName: floorForm.buildingName || (buildings[0]?.name || 'Block A')
      });

      setFloorModalOpen(false);
      setToastMessage(`Floor ${floorForm.floorNumber} created successfully!`);
      setTimeout(() => setToastMessage(null), 3500);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create floor');
    }
  };

  // Archive / Delete Handlers
  const handleConfirmArchive = async () => {
    if (!deleteConfirmModal) return;
    try {
      if (deleteConfirmModal.type === 'PROPERTY') {
        await ownerApi.archiveProperty(deleteConfirmModal.id);
        setToastMessage('Property archived successfully');
      } else if (deleteConfirmModal.type === 'BUILDING') {
        await ownerApi.archiveBuilding(deleteConfirmModal.id);
        setToastMessage('Building archived successfully');
      } else if (deleteConfirmModal.type === 'FLOOR') {
        await ownerApi.archiveFloor(deleteConfirmModal.id);
        setToastMessage('Floor archived successfully');
      }
      setDeleteConfirmModal(null);
      setTimeout(() => setToastMessage(null), 3500);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to archive entity');
    }
  };

  const filteredProperties = properties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBuildings = buildings.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.code && b.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
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

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Property & Infrastructure Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-tier hierarchy: Properties → Buildings → Floors → Rooms & Inventory
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'PROPERTIES' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingProperty(null);
                setPropertyForm({ name: '', address: '', city: 'Bengaluru', phone: '', email: '', upiId: '', gstNumber: '' });
                setPropertyModalOpen(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Property
            </Button>
          )}
          {activeTab === 'BUILDINGS' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingBuilding(null);
                setBuildingForm({ name: '', code: '', numberOfFloors: '3' });
                setBuildingModalOpen(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Building
            </Button>
          )}
          {activeTab === 'FLOORS' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFloorForm({ floorNumber: (floors.length + 1).toString(), buildingId: buildings[0]?.id || '', buildingName: buildings[0]?.name || 'Block A' });
                setFloorModalOpen(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Floor
            </Button>
          )}
        </div>
      </div>

      {/* Tab Selector & Search Toolbar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('PROPERTIES')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PROPERTIES'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Properties ({properties.length})
          </button>
          <button
            onClick={() => setActiveTab('BUILDINGS')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'BUILDINGS'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Buildings ({buildings.length})
          </button>
          <button
            onClick={() => setActiveTab('FLOORS')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'FLOORS'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Floors ({floors.length})
          </button>
        </div>

        <div className="w-full md:w-72">
          <Input
            placeholder="Search name, code, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </Card>

      {/* TAB 1: PROPERTIES */}
      {activeTab === 'PROPERTIES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((prop) => (
            <Card key={prop.id} className="p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{prop.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{prop.city}</span>
                      </p>
                    </div>
                  </div>
                  {activeProperty.id === prop.id && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {prop.address}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Capacity</span>
                    <strong className="text-slate-900 dark:text-white">{prop.totalBeds || 24} Beds</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Active Residents</span>
                    <strong className="text-blue-600 dark:text-blue-400">{prop.occupiedBeds || prop.activeResidentsCount || 18} Occupied</strong>
                  </div>
                </div>

                {prop.phone && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" /> {prop.phone}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setActiveProperty(prop);
                    setToastMessage(`Switched active context to ${prop.name}`);
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                >
                  Select Context
                </Button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingProperty(prop);
                      setPropertyForm({
                        name: prop.name || '',
                        address: prop.address || '',
                        city: prop.city || 'Bengaluru',
                        phone: prop.phone || '',
                        email: prop.email || '',
                        upiId: prop.upiId || '',
                        gstNumber: prop.gstNumber || ''
                      });
                      setPropertyModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit Property"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmModal({ type: 'PROPERTY', id: prop.id, title: prop.name })}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Archive Property"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: BUILDINGS */}
      {activeTab === 'BUILDINGS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBuildings.map((bld) => (
            <Card key={bld.id} className="p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{bld.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{bld.code || 'MAIN-WING'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Active
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between">
                  <span className="text-slate-500">Configured Floors:</span>
                  <strong className="text-slate-900 dark:text-white">{bld.floors?.length || 3} Floors</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingBuilding(bld);
                    setBuildingForm({
                      name: bld.name || '',
                      code: bld.code || '',
                      numberOfFloors: (bld.floors?.length || 3).toString()
                    });
                    setBuildingModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit Building"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmModal({ type: 'BUILDING', id: bld.id, title: bld.name })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Archive Building"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: FLOORS */}
      {activeTab === 'FLOORS' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Floor Level</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Building</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Rooms Count</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {floors.map((flr) => (
                  <tr key={flr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      Floor {flr.floorNumber}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                      {flr.buildingName || 'Block A - Executive Wing'}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {flr.totalRooms || 4} Rooms
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setDeleteConfirmModal({ type: 'FLOOR', id: flr.id, title: `Floor ${flr.floorNumber}` })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Archive Floor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Property Modal */}
      <Modal
        isOpen={propertyModalOpen}
        onClose={() => setPropertyModalOpen(false)}
        title={editingProperty ? 'Edit Property Details' : 'Add New PG Property'}
      >
        <form onSubmit={handleSaveProperty} className="space-y-4">
          <Input
            label="Property Name"
            placeholder="e.g. Urban Nest Residency (Whitefield)"
            value={propertyForm.name}
            onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
            required
          />
          <Input
            label="Full Physical Address"
            placeholder="Plot No, Street, Landmark..."
            value={propertyForm.address}
            onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={propertyForm.city}
              onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
              required
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              value={propertyForm.phone}
              onChange={(e) => setPropertyForm({ ...propertyForm, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Email"
              type="email"
              placeholder="pg@urbannest.com"
              value={propertyForm.email}
              onChange={(e) => setPropertyForm({ ...propertyForm, email: e.target.value })}
            />
            <Input
              label="UPI ID (Rent Collection)"
              placeholder="urbannest@okhdfc"
              value={propertyForm.upiId}
              onChange={(e) => setPropertyForm({ ...propertyForm, upiId: e.target.value })}
            />
          </div>
          <Input
            label="GST Number (Optional)"
            placeholder="06AAAAA0000A1Z5"
            value={propertyForm.gstNumber}
            onChange={(e) => setPropertyForm({ ...propertyForm, gstNumber: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setPropertyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingProperty ? 'Save Changes' : 'Create Property'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Building Modal */}
      <Modal
        isOpen={buildingModalOpen}
        onClose={() => setBuildingModalOpen(false)}
        title={editingBuilding ? 'Edit Building' : 'Add New Building Block'}
      >
        <form onSubmit={handleSaveBuilding} className="space-y-4">
          <Input
            label="Building Name"
            placeholder="e.g. Block B - Premier Wing"
            value={buildingForm.name}
            onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Building Code"
              placeholder="e.g. BLK-B"
              value={buildingForm.code}
              onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })}
            />
            <Input
              label="Number of Floors"
              type="number"
              value={buildingForm.numberOfFloors}
              onChange={(e) => setBuildingForm({ ...buildingForm, numberOfFloors: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setBuildingModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingBuilding ? 'Update Building' : 'Create Building'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Floor Modal */}
      <Modal
        isOpen={floorModalOpen}
        onClose={() => setFloorModalOpen(false)}
        title="Add New Floor"
      >
        <form onSubmit={handleSaveFloor} className="space-y-4">
          <Input
            label="Floor Number"
            type="number"
            value={floorForm.floorNumber}
            onChange={(e) => setFloorForm({ ...floorForm, floorNumber: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setFloorModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Add Floor
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmModal}
        onClose={() => setDeleteConfirmModal(null)}
        title="Confirm Deletion / Archive"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Are you sure you want to archive <strong>{deleteConfirmModal?.title}</strong>? Historical financial and resident records will remain safely preserved.</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmArchive}>
              Confirm Archive
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PropertiesPage;
