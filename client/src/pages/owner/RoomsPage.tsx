import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  Building2,
  Filter,
  Plus,
  Search,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Wrench,
  AlertCircle,
  Eye,
  Sparkles,
  Layers
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import type { Room, Bed } from '../../types';

export const RoomsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Room Modal State
  const [addRoomModal, setAddRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    number: '',
    floor: '1',
    building: 'Block A',
    type: 'Double',
    capacity: '2',
    baseRent: '14000',
    amenities: 'Attached Washroom, High-speed WiFi, Study Table, Wardrobe'
  });

  // Bed Status / Allocation Modal
  const [selectedBed, setSelectedBed] = useState<{ roomNumber: string; bed: Bed } | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [residentForm, setResidentForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    monthlyRent: '14000',
    depositAmount: '28000',
    leaseStartDate: '2026-10-01',
    leaseEndDate: '2027-09-30'
  });

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const res = await ownerApi.getRooms(activeProperty.id);
      setRooms(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [activeProperty]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!roomForm.number) {
        alert('Please enter room number');
        return;
      }
      const cap = parseInt(roomForm.capacity) || 2;
      const rent = parseFloat(roomForm.baseRent) || 14000;
      const floorNum = parseInt(roomForm.floor) || 1;
      const amenitiesList = roomForm.amenities.split(',').map((s) => s.trim()).filter(Boolean);

      await ownerApi.createRoom({
        propertyId: activeProperty.id,
        number: roomForm.number,
        floor: floorNum,
        building: roomForm.building,
        type: roomForm.type,
        capacity: cap,
        baseRent: rent,
        amenities: amenitiesList
      });

      setAddRoomModal(false);
      setToastMessage(`Room ${roomForm.number} and ${cap} beds created successfully!`);
      setTimeout(() => setToastMessage(null), 4000);
      fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to create room');
    }
  };

  const handleAllocateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBed) return;
    try {
      if (!residentForm.fullName || !residentForm.mobile || !residentForm.email) {
        alert('Please fill resident details');
        return;
      }

      await ownerApi.moveInResident({
        propertyId: activeProperty.id,
        bedId: selectedBed.bed.id,
        fullName: residentForm.fullName,
        email: residentForm.email,
        mobile: residentForm.mobile,
        monthlyRent: parseFloat(residentForm.monthlyRent) || selectedBed.bed.monthlyRent,
        depositAmount: parseFloat(residentForm.depositAmount) || 28000,
        leaseStartDate: residentForm.leaseStartDate,
        leaseEndDate: residentForm.leaseEndDate
      });

      setAssignModalOpen(false);
      setToastMessage(`Resident ${residentForm.fullName} allocated to Bed ${selectedBed.bed.bedNumber}!`);
      setTimeout(() => setToastMessage(null), 4000);
      fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to allocate bed');
    }
  };

  const handleToggleBedStatus = async (bed: Bed, newStatus: string) => {
    try {
      await ownerApi.updateBedStatus(bed.id, newStatus);
      setToastMessage(`Bed ${bed.bedNumber} status changed to ${newStatus}`);
      setTimeout(() => setToastMessage(null), 3000);
      fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to update bed status');
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.building.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalBeds = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + (r.occupiedCount || 0), 0);
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);

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

      {/* Title & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Rooms & Bed Availability Matrix
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time visual room inventory and atomic bed occupancy for {activeProperty.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 text-xs font-bold">
            {availableBeds} Vacant Beds Available
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setAddRoomModal(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add New Room
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-72">
          <Input
            placeholder="Search room number, building..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select
            options={[
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Available', value: 'AVAILABLE' },
              { label: 'Full', value: 'FULL' },
              { label: 'Under Maintenance', value: 'MAINTENANCE' }
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />

          <Select
            options={[
              { label: 'All Room Types', value: 'ALL' },
              { label: 'Single', value: 'Single' },
              { label: 'Double', value: 'Double' },
              { label: 'Triple', value: 'Triple' },
              { label: 'Four Sharing', value: 'Four Sharing' }
            ]}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Visual Bed Matrix Cards Grid */}
      {isLoading ? (
        <div className="p-16 text-center">
          <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-xs text-slate-500">Loading room inventory from database...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <BedDouble className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No rooms found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or click "Add New Room" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              {/* Card Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Room {room.number}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {room.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {room.building} • Floor {room.floor}
                  </p>
                </div>
                <StatusBadge status={room.status} />
              </div>

              {/* Rent & Capacity Details */}
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Base Rent: <strong className="text-slate-900 dark:text-white">₹{(room.baseRent || 0).toLocaleString('en-IN')}/mo</strong></span>
                <span>Occupancy: <strong className="text-blue-600 dark:text-blue-400">{room.occupiedCount}/{room.capacity} Beds</strong></span>
              </div>

              {/* Beds Availability Matrix */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bed Allocation Matrix</p>
                <div className="grid grid-cols-2 gap-2">
                  {(room.beds || []).map((bed) => {
                    const isOccupied = bed.status === 'OCCUPIED';
                    const isMaintenance = bed.status === 'MAINTENANCE';

                    return (
                      <div
                        key={bed.id}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                          isOccupied
                            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/40 text-blue-900 dark:text-blue-200'
                            : isMaintenance
                            ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                            : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{bed.bedNumber}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                            isOccupied ? 'bg-blue-200 text-blue-800' : isMaintenance ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-800'
                          }`}>
                            {bed.status}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] truncate max-w-[100px]">
                            {isOccupied ? (bed.residentName || 'Occupied') : isMaintenance ? 'Under Repair' : 'Available'}
                          </span>
                          {!isOccupied && !isMaintenance && (
                            <button
                              onClick={() => {
                                setSelectedBed({ roomNumber: room.number, bed });
                                setResidentForm({
                                  ...residentForm,
                                  monthlyRent: (bed.monthlyRent || room.baseRent || 14000).toString()
                                });
                                setAssignModalOpen(true);
                              }}
                              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold"
                              title="Assign Resident"
                            >
                              Assign
                            </button>
                          )}
                          {isMaintenance && (
                            <button
                              onClick={() => handleToggleBedStatus(bed, 'AVAILABLE')}
                              className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[10px] font-bold"
                              title="Mark Available"
                            >
                              Free
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Amenities list */}
              {room.amenities && room.amenities.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                  {room.amenities.map((amenity) => (
                    <span key={amenity} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {amenity}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add New Room Modal */}
      <Modal isOpen={addRoomModal} onClose={() => setAddRoomModal(false)} title="Create New PG Room">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Room Number"
              placeholder="e.g. 104"
              value={roomForm.number}
              onChange={(e) => setRoomForm({ ...roomForm, number: e.target.value })}
              required
            />
            <Input
              label="Floor Number"
              type="number"
              value={roomForm.floor}
              onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Building / Block"
              value={roomForm.building}
              onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
              required
            />
            <Select
              label="Room Type"
              options={[
                { label: 'Single Sharing', value: 'Single' },
                { label: 'Double Sharing', value: 'Double' },
                { label: 'Triple Sharing', value: 'Triple' },
                { label: 'Four Sharing', value: 'Four Sharing' }
              ]}
              value={roomForm.type}
              onChange={(e) => {
                const type = e.target.value;
                let cap = '2';
                if (type === 'Single') cap = '1';
                else if (type === 'Double') cap = '2';
                else if (type === 'Triple') cap = '3';
                else if (type === 'Four Sharing') cap = '4';
                setRoomForm({ ...roomForm, type, capacity: cap });
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Bed Capacity"
              type="number"
              value={roomForm.capacity}
              onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
              required
            />
            <Input
              label="Monthly Rent per Bed (₹)"
              type="number"
              value={roomForm.baseRent}
              onChange={(e) => setRoomForm({ ...roomForm, baseRent: e.target.value })}
              required
            />
          </div>

          <Input
            label="Room Amenities (comma separated)"
            value={roomForm.amenities}
            onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setAddRoomModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Create Room & Generate Beds</Button>
          </div>
        </form>
      </Modal>

      {/* Bed Assignment Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Allocate Bed ${selectedBed?.bed.bedNumber} (Room ${selectedBed?.roomNumber})`}
      >
        <form onSubmit={handleAllocateBed} className="space-y-4">
          <Input
            label="Resident Full Name"
            placeholder="e.g. Vikram Verma"
            value={residentForm.fullName}
            onChange={(e) => setResidentForm({ ...residentForm, fullName: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="vikram@example.com"
              value={residentForm.email}
              onChange={(e) => setResidentForm({ ...residentForm, email: e.target.value })}
              required
            />
            <Input
              label="Mobile Number"
              placeholder="+91 99887 66554"
              value={residentForm.mobile}
              onChange={(e) => setResidentForm({ ...residentForm, mobile: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monthly Rent (₹)"
              type="number"
              value={residentForm.monthlyRent}
              onChange={(e) => setResidentForm({ ...residentForm, monthlyRent: e.target.value })}
              required
            />
            <Input
              label="Security Deposit (₹)"
              type="number"
              value={residentForm.depositAmount}
              onChange={(e) => setResidentForm({ ...residentForm, depositAmount: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Lease Start Date"
              type="date"
              value={residentForm.leaseStartDate}
              onChange={(e) => setResidentForm({ ...residentForm, leaseStartDate: e.target.value })}
              required
            />
            <Input
              label="Lease End Date"
              type="date"
              value={residentForm.leaseEndDate}
              onChange={(e) => setResidentForm({ ...residentForm, leaseEndDate: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Confirm Allocation & Move-In</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
