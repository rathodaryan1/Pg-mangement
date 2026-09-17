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
    <div className="space-y-6 animate-fade-in text-left">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-[#EAF2EE] text-[#0B4036] border border-[#0B4036]/20 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#0B4036]" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs text-[#0B4036]/70">
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DDE2DD] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F]">
            Properties & Infrastructure
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Hierarchy: Properties → Buildings → Floors → Rooms & Beds
          </p>
        </div>

        <div className="flex items-center gap-2">
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
      <div className="p-3.5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#F8F7F3] rounded-lg w-full sm:w-auto border border-[#DDE2DD]">
          <button
            onClick={() => setActiveTab('PROPERTIES')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'PROPERTIES'
                ? 'bg-white text-[#0B4036] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Properties ({properties.length})
          </button>
          <button
            onClick={() => setActiveTab('BUILDINGS')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'BUILDINGS'
                ? 'bg-white text-[#0B4036] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Buildings ({buildings.length})
          </button>
          <button
            onClick={() => setActiveTab('FLOORS')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'FLOORS'
                ? 'bg-white text-[#0B4036] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Floors ({floors.length})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[#8A928D]" />}
          />
        </div>
      </div>

      {/* TAB 1: PROPERTIES LIST */}
      {activeTab === 'PROPERTIES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProperties.map((prop) => {
            const isActive = activeProperty?.id === prop.id;
            return (
              <Card key={prop.id} className={`p-5 space-y-4 transition-all ${isActive ? 'border-[#0B4036] ring-1 ring-[#0B4036]' : ''}`}>
                <div className="flex items-start justify-between pb-3 border-b border-[#DDE2DD]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#18231F]">{prop.name}</h3>
                      {isActive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EAF2EE] text-[#0B4036]">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#68736D] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#8A928D]" /> {prop.address}, {prop.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingProperty(prop);
                        setPropertyForm({
                          name: prop.name,
                          address: prop.address,
                          city: prop.city || 'Bengaluru',
                          phone: prop.phone || '',
                          email: prop.email || '',
                          upiId: prop.upiId || '',
                          gstNumber: prop.gstNumber || ''
                        });
                        setPropertyModalOpen(true);
                      }}
                      className="p-1 rounded text-[#8A928D] hover:text-[#0B4036] hover:bg-[#EAF2EE]"
                      title="Edit Property"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {properties.length > 1 && (
                      <button
                        onClick={() => setDeleteConfirmModal({ type: 'PROPERTY', id: prop.id, title: prop.name })}
                        className="p-1 rounded text-[#8A928D] hover:text-rose-600 hover:bg-rose-50"
                        title="Archive Property"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#F8F7F3] space-y-0.5">
                    <p className="text-[10px] text-[#8A928D]">Rooms</p>
                    <p className="font-bold text-[#18231F]">{prop._count?.rooms || prop.totalRooms || 24}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F8F7F3] space-y-0.5">
                    <p className="text-[10px] text-[#8A928D]">Total Beds</p>
                    <p className="font-bold text-[#0B4036]">{prop._count?.beds || prop.totalBeds || 48}</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <Button
                    variant={isActive ? 'outline' : 'primary'}
                    size="xs"
                    onClick={() => setActiveProperty(prop)}
                    className="w-full font-semibold"
                  >
                    {isActive ? 'Currently Active' : 'Switch to this Property'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* TAB 2: BUILDINGS LIST */}
      {activeTab === 'BUILDINGS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredBuildings.map((bld) => (
            <Card key={bld.id} className="p-5 space-y-3">
              <div className="flex justify-between items-center pb-2.5 border-b border-[#DDE2DD]">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#0B4036]" />
                  <h3 className="text-base font-bold text-[#18231F]">{bld.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingBuilding(bld);
                      setBuildingForm({ name: bld.name, code: bld.code || '', numberOfFloors: (bld.numberOfFloors || 3).toString() });
                      setBuildingModalOpen(true);
                    }}
                    className="p-1 rounded text-[#8A928D] hover:text-[#0B4036]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmModal({ type: 'BUILDING', id: bld.id, title: bld.name })}
                    className="p-1 rounded text-[#8A928D] hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#68736D]">
                <p>Code: <strong className="text-[#18231F]">{bld.code || 'MAIN'}</strong></p>
                <p>Floors: <strong className="text-[#18231F]">{bld.numberOfFloors || 4} Floors</strong></p>
                <p>Associated Property: <span className="font-semibold text-[#0B4036]">{activeProperty.name}</span></p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: FLOORS LIST */}
      {activeTab === 'FLOORS' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {floors.map((flr) => (
            <Card key={flr.id} className="p-4 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[#DDE2DD]">
                <span className="font-bold text-sm text-[#18231F]">Floor {flr.floorNumber}</span>
                <button
                  onClick={() => setDeleteConfirmModal({ type: 'FLOOR', id: flr.id, title: `Floor ${flr.floorNumber}` })}
                  className="p-1 rounded text-[#8A928D] hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-[#68736D]">Building: <strong>{flr.buildingName || 'Block A'}</strong></p>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Property Modal */}
      <Modal isOpen={propertyModalOpen} onClose={() => setPropertyModalOpen(false)} title={editingProperty ? 'Edit Property' : 'Create New Property'} maxWidth="md">
        <form onSubmit={handleSaveProperty} className="space-y-3">
          <Input label="Property Name" value={propertyForm.name} onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })} required />
          <Input label="Address" value={propertyForm.address} onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <Input label="City" value={propertyForm.city} onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })} required />
            <Input label="Contact Phone" value={propertyForm.phone} onChange={(e) => setPropertyForm({ ...propertyForm, phone: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setPropertyModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">{editingProperty ? 'Save Changes' : 'Create Property'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Building Modal */}
      <Modal isOpen={buildingModalOpen} onClose={() => setBuildingModalOpen(false)} title={editingBuilding ? 'Edit Building' : 'Add Building'} maxWidth="sm">
        <form onSubmit={handleSaveBuilding} className="space-y-3">
          <Input label="Building Name" value={buildingForm.name} onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })} required />
          <Input label="Building Code" value={buildingForm.code} onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })} />
          <Input label="Number of Floors" type="number" value={buildingForm.numberOfFloors} onChange={(e) => setBuildingForm({ ...buildingForm, numberOfFloors: e.target.value })} required />
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setBuildingModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Add Floor Modal */}
      <Modal isOpen={floorModalOpen} onClose={() => setFloorModalOpen(false)} title="Add Floor" maxWidth="sm">
        <form onSubmit={handleSaveFloor} className="space-y-3">
          <Input label="Floor Number" type="number" value={floorForm.floorNumber} onChange={(e) => setFloorForm({ ...floorForm, floorNumber: e.target.value })} required />
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setFloorModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Add Floor</Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Archive Confirmation Dialog */}
      <Modal isOpen={!!deleteConfirmModal} onClose={() => setDeleteConfirmModal(null)} title="Confirm Archive" maxWidth="sm">
        <div className="space-y-3">
          <p className="text-xs text-[#68736D]">
            Are you sure you want to archive <strong>{deleteConfirmModal?.title}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmModal(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleConfirmArchive}>Archive</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
