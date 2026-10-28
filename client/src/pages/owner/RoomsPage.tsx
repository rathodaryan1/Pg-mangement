import { toast, useToast } from '../../context/ToastContext';
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
  Layers,
  Edit2,
  Trash2,
  Ban,
  Unlock
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

  // Add / Edit Room Modal State
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({
    number: '',
    floor: '1',
    building: 'Block A',
    type: 'Double',
    capacity: '2',
    baseRent: '14000',
    deposit: '28000',
    amenities: 'Attached Washroom, High-speed WiFi, Study Table, Wardrobe'
  });

  // Archive confirmation
  const [archiveConfirmModal, setArchiveConfirmModal] = useState<{ id: string; number: string } | null>(null);

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

  // Deallocate / Vacate Bed Modal State
  const [deallocateModal, setDeallocateModal] = useState<{
    bed: Bed;
    roomNumber: string;
    residentName: string;
    residentId?: string;
  } | null>(null);
  const [deallocateMoveOut, setDeallocateMoveOut] = useState<boolean>(true);
  const [deallocateDeductions, setDeallocateDeductions] = useState<string>('0');
  const [deallocateDeductionNotes, setDeallocateDeductionNotes] = useState<string>('');
  const [deallocateRemarks, setDeallocateRemarks] = useState<string>('');
  const [isDeallocating, setIsDeallocating] = useState<boolean>(false);

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

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!roomForm.number) {
        toast.error('Please enter room number');
        return;
      }
      const cap = parseInt(roomForm.capacity) || 2;
      const rent = parseFloat(roomForm.baseRent) || 14000;
      const dep = parseFloat(roomForm.deposit) || rent * 2;
      const floorNum = parseInt(roomForm.floor) || 1;
      const amenitiesList = roomForm.amenities.split(',').map((s) => s.trim()).filter(Boolean);

      if (editingRoom) {
        await ownerApi.updateRoom(editingRoom.id, {
          number: roomForm.number,
          floor: floorNum,
          building: roomForm.building,
          type: roomForm.type,
          baseRent: rent,
          deposit: dep,
          amenities: amenitiesList
        });
        setToastMessage(`Room ${roomForm.number} updated successfully!`);
      } else {
        await ownerApi.createRoom({
          propertyId: activeProperty.id,
          number: roomForm.number,
          floor: floorNum,
          building: roomForm.building,
          type: roomForm.type,
          capacity: cap,
          baseRent: rent,
          deposit: dep,
          amenities: amenitiesList
        });
        setToastMessage(`Room ${roomForm.number} and ${cap} beds created successfully!`);
      }

      setRoomModalOpen(false);
      setEditingRoom(null);
      setTimeout(() => setToastMessage(null), 4000);
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save room');
    }
  };

  const handleArchiveRoom = async () => {
    if (!archiveConfirmModal) return;
    try {
      await ownerApi.archiveRoom(archiveConfirmModal.id);
      setToastMessage(`Room ${archiveConfirmModal.number} archived.`);
      setArchiveConfirmModal(null);
      setTimeout(() => setToastMessage(null), 3500);
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive room');
    }
  };

  const handleAllocateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBed) return;
    try {
      if (!residentForm.fullName || !residentForm.mobile || !residentForm.email) {
        toast.error('Please fill resident details');
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
      toast.error(err.message || 'Failed to allocate bed');
    }
  };

  const handleToggleBedStatus = async (bed: Bed, newStatus: string) => {
    try {
      await ownerApi.updateBedStatus(bed.id, newStatus);
      setToastMessage(`Bed ${bed.bedNumber} status changed to ${newStatus}`);
      setTimeout(() => setToastMessage(null), 3000);
      fetchRooms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bed status');
    }
  };

  const handleDeallocateBed = async () => {
    if (!deallocateModal) return;
    try {
      setIsDeallocating(true);
      await ownerApi.deallocateBed(deallocateModal.bed.id, {
        moveOut: deallocateMoveOut,
        deductions: deallocateDeductions ? parseFloat(deallocateDeductions) : 0,
        deductionNotes: deallocateDeductionNotes,
        remarks: deallocateRemarks || (deallocateMoveOut ? 'Resident vacated' : 'Bed unassigned')
      });

      setToastMessage(
        deallocateMoveOut
          ? `Resident ${deallocateModal.residentName} vacated and Bed ${deallocateModal.bed.bedNumber} is now available!`
          : `Bed ${deallocateModal.bed.bedNumber} unassigned and is now available!`
      );
      setTimeout(() => setToastMessage(null), 4000);
      setDeallocateModal(null);
      setDeallocateDeductions('0');
      setDeallocateDeductionNotes('');
      setDeallocateRemarks('');
      await fetchRooms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove resident from bed');
    } finally {
      setIsDeallocating(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.building && r.building.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalBeds = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + (r.occupiedCount || 0), 0);
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Toast Alert */}
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

      {/* Title & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DDE2DD] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F]">
            Rooms & Bed Matrix
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Real-time visual room inventory and atomic bed occupancy for {activeProperty.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#FAF5EB] text-[#B9954E] border border-[#C8A45D]/30 text-xs font-bold">
            {availableBeds} Vacant Beds Available
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingRoom(null);
              setRoomForm({
                number: '',
                floor: '1',
                building: 'Block A',
                type: 'Double',
                capacity: '2',
                baseRent: '14000',
                deposit: '28000',
                amenities: 'Attached Washroom, High-speed WiFi, Study Table, Wardrobe'
              });
              setRoomModalOpen(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add New Room
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3.5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search room number, building..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[#8A928D]" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
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
      </div>

      {/* Visual Bed Matrix Cards Grid */}
      {isLoading ? (
        <div className="p-16 text-center">
          <div className="w-8 h-8 border-2 border-[#0B4036]/20 border-t-[#0B4036] rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-xs text-[#68736D]">Loading room inventory...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[#DDE2DD] rounded-xl bg-white">
          <BedDouble className="w-10 h-10 text-[#8A928D] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#18231F]">No rooms found</h3>
          <p className="text-xs text-[#68736D] mt-1">Try adjusting your filters or click "Add New Room" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="p-4 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                {/* Card Header */}
                <div className="flex items-start justify-between pb-2.5 border-b border-[#DDE2DD]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#18231F]">Room {room.number}</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F8F7F3] text-[#68736D] border border-[#DDE2DD]">
                        {room.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8A928D] mt-0.5">
                      {room.building || 'Block A'} • Floor {room.floor || 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={room.status} />
                    <button
                      onClick={() => {
                        setEditingRoom(room);
                        setRoomForm({
                          number: room.number,
                          floor: (room.floor || 1).toString(),
                          building: room.building || 'Block A',
                          type: room.type || 'Double',
                          capacity: (room.capacity || 2).toString(),
                          baseRent: (room.baseRent || 14000).toString(),
                          deposit: (room.deposit || 28000).toString(),
                          amenities: (room.amenities || []).join(', ')
                        });
                        setRoomModalOpen(true);
                      }}
                      className="p-1 rounded text-[#8A928D] hover:text-[#0B4036] hover:bg-[#EAF2EE]"
                      title="Edit Room"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setArchiveConfirmModal({ id: room.id, number: room.number })}
                      className="p-1 rounded text-[#8A928D] hover:text-rose-600 hover:bg-rose-50"
                      title="Archive Room"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rent & Capacity Details */}
                <div className="flex items-center justify-between text-xs text-[#68736D]">
                  <span>Base Rent: <strong className="text-[#18231F]">₹{(room.baseRent || 0).toLocaleString('en-IN')}</strong></span>
                  <span>Occupancy: <strong className="text-[#0B4036]">{room.occupiedCount || 0}/{room.capacity} Beds</strong></span>
                </div>

                {/* Beds Availability Matrix */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A928D]">Bed Allocation Matrix</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(room.beds || []).map((bed) => {
                      const isOccupied = bed.status === 'OCCUPIED';
                      const isMaintenance = bed.status === 'MAINTENANCE';
                      const isBlocked = (bed.status as string) === 'BLOCKED' || bed.status === 'RESERVED';

                      return (
                        <div
                          key={bed.id}
                          className={`p-2 rounded-lg border text-xs flex flex-col justify-between transition-colors ${
                            isOccupied
                              ? 'bg-[#EAF2EE] border-[#0B4036]/20 text-[#0B4036]'
                              : isMaintenance
                              ? 'bg-slate-50 border-slate-200 text-slate-700'
                              : isBlocked
                              ? 'bg-rose-50 border-rose-200 text-rose-800'
                              : 'bg-[#FAF5EB] border-[#C8A45D]/30 text-[#B9954E]'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-[11px]">
                            <span>{bed.bedNumber}</span>
                            <span className="text-[9px] uppercase font-semibold">
                              {bed.status}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-1">
                            <span
                              className="text-[11px] truncate flex-1 font-medium"
                              title={isOccupied ? (bed.residentName || 'Occupied') : undefined}
                            >
                              {isOccupied ? (bed.residentName || 'Occupied') : isMaintenance ? 'Repair' : isBlocked ? 'Blocked' : 'Available'}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {isOccupied && (
                                <button
                                  onClick={() => {
                                    setDeallocateModal({
                                      bed,
                                      roomNumber: room.number,
                                      residentName: bed.residentName || 'Resident',
                                      residentId: bed.residentId
                                    });
                                    setDeallocateMoveOut(true);
                                    setDeallocateDeductions('0');
                                    setDeallocateDeductionNotes('');
                                    setDeallocateRemarks('');
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-0.5 shadow-xs transition-colors"
                                  title="Remove / Vacate Resident"
                                >
                                  <UserMinus className="w-3 h-3" />
                                  <span>Vacate</span>
                                </button>
                              )}
                              {!isOccupied && !isMaintenance && !isBlocked && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedBed({ roomNumber: room.number, bed });
                                      setResidentForm({
                                        ...residentForm,
                                        monthlyRent: (bed.monthlyRent || room.baseRent || 14000).toString()
                                      });
                                      setAssignModalOpen(true);
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-[#0B4036] text-white text-[10px] font-bold hover:bg-[#123F36]"
                                    title="Assign Resident"
                                  >
                                    Assign
                                  </button>
                                  <button
                                    onClick={() => handleToggleBedStatus(bed, 'MAINTENANCE')}
                                    className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 text-[10px]"
                                    title="Mark Maintenance"
                                  >
                                    <Ban className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              {(isMaintenance || isBlocked) && (
                                <button
                                  onClick={() => handleToggleBedStatus(bed, 'AVAILABLE')}
                                  className="px-1.5 py-0.5 rounded bg-[#0B4036] text-white text-[10px] font-bold"
                                  title="Mark Available"
                                >
                                  Free
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Amenities list */}
                {room.amenities && room.amenities.length > 0 && (
                  <div className="pt-2 border-t border-[#DDE2DD] flex flex-wrap gap-1">
                    {room.amenities.map((amenity) => (
                      <span key={amenity} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F8F7F3] text-[#68736D]">
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Room Modal */}
      <Modal
        isOpen={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        title={editingRoom ? `Edit Room ${editingRoom.number}` : 'Add Room & Configure Beds'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveRoom} className="space-y-3 text-left">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Room Number"
              placeholder="e.g. 204"
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

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Building / Wing"
              placeholder="Block A"
              value={roomForm.building}
              onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
            />
            <Select
              label="Sharing Type"
              options={[
                { label: 'Single Room', value: 'Single' },
                { label: 'Double Sharing', value: 'Double' },
                { label: 'Triple Sharing', value: 'Triple' },
                { label: 'Four Sharing', value: 'Four Sharing' }
              ]}
              value={roomForm.type}
              onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Capacity (Beds)"
              type="number"
              value={roomForm.capacity}
              onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
              required
            />
            <Input
              label="Base Rent per Bed (₹)"
              type="number"
              value={roomForm.baseRent}
              onChange={(e) => setRoomForm({ ...roomForm, baseRent: e.target.value })}
              required
            />
          </div>

          <Input
            label="Amenities (Comma separated)"
            placeholder="Attached Washroom, WiFi, Geyser..."
            value={roomForm.amenities}
            onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setRoomModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingRoom ? 'Update Room' : 'Create Room'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bed Allocation Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Allocate Bed ${selectedBed?.bed.bedNumber} in Room ${selectedBed?.roomNumber}`}
        maxWidth="md"
      >
        <form onSubmit={handleAllocateBed} className="space-y-3 text-left">
          <Input
            label="Resident Full Name"
            placeholder="e.g. Aakash Verma"
            value={residentForm.fullName}
            onChange={(e) => setResidentForm({ ...residentForm, fullName: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Email Address"
              type="email"
              placeholder="aakash@gmail.com"
              value={residentForm.email}
              onChange={(e) => setResidentForm({ ...residentForm, email: e.target.value })}
              required
            />
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="9876543210"
              value={residentForm.mobile}
              onChange={(e) => setResidentForm({ ...residentForm, mobile: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Agreed Monthly Rent (₹)"
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

          <div className="grid grid-cols-2 gap-2">
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

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Bed Allocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Room Confirmation Modal */}
      <Modal
        isOpen={!!archiveConfirmModal}
        onClose={() => setArchiveConfirmModal(null)}
        title="Archive Room"
        maxWidth="sm"
      >
        <div className="space-y-3 text-left">
          <p className="text-xs text-[#68736D]">
            Are you sure you want to archive Room <strong>{archiveConfirmModal?.number}</strong>?
            Archived rooms will no longer accept new bookings.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setArchiveConfirmModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleArchiveRoom}>
              Archive Room
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deallocate / Vacate Bed Modal */}
      <Modal
        isOpen={!!deallocateModal}
        onClose={() => !isDeallocating && setDeallocateModal(null)}
        title={`Vacate / Remove Resident from Bed ${deallocateModal?.bed.bedNumber}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-left">
          {/* Summary Banner */}
          <div className="p-3 bg-[#FAF5EB] border border-[#C8A45D]/30 rounded-lg flex items-start gap-3">
            <div className="p-2 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#18231F]">
                Resident: {deallocateModal?.residentName}
              </h4>
              <p className="text-[11px] text-[#68736D]">
                Room {deallocateModal?.roomNumber} • Bed {deallocateModal?.bed.bedNumber} (Rent: ₹{(deallocateModal?.bed.monthlyRent || 0).toLocaleString('en-IN')}/mo)
              </p>
            </div>
          </div>

          {/* Action Choice */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#18231F]">Select Deallocation Action</label>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${deallocateMoveOut ? 'border-rose-300 bg-rose-50/50' : 'border-[#DDE2DD] bg-white'}`}>
                <input
                  type="radio"
                  name="deallocateAction"
                  checked={deallocateMoveOut}
                  onChange={() => setDeallocateMoveOut(true)}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#18231F] block">Vacate & Move Out (Full Checkout)</span>
                  <span className="text-[#68736D] text-[11px] block mt-0.5">
                    Marks resident status as <strong>MOVED_OUT</strong>, unlinks bed, and frees bed status back to <strong>AVAILABLE</strong> for new residents.
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${!deallocateMoveOut ? 'border-amber-300 bg-amber-50/50' : 'border-[#DDE2DD] bg-white'}`}>
                <input
                  type="radio"
                  name="deallocateAction"
                  checked={!deallocateMoveOut}
                  onChange={() => setDeallocateMoveOut(false)}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#18231F] block">Unassign Bed Only (Keep Resident Active)</span>
                  <span className="text-[#68736D] text-[11px] block mt-0.5">
                    Frees bed back to <strong>AVAILABLE</strong> while keeping the resident record <strong>ACTIVE</strong> (useful for room transfers or reassignment).
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Optional Settlement fields if Move Out */}
          {deallocateMoveOut && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-[#F8F7F3] rounded-lg border border-[#DDE2DD]">
              <Input
                label="Deductions from Deposit (₹)"
                type="number"
                placeholder="0"
                value={deallocateDeductions}
                onChange={(e) => setDeallocateDeductions(e.target.value)}
              />
              <Input
                label="Deduction Reason (Optional)"
                placeholder="e.g. Electricity, Maintenance"
                value={deallocateDeductionNotes}
                onChange={(e) => setDeallocateDeductionNotes(e.target.value)}
              />
            </div>
          )}

          {/* Remarks */}
          <Input
            label="Remarks / Reason"
            placeholder="e.g. Vacating after tenure end / Personal relocation"
            value={deallocateRemarks}
            onChange={(e) => setDeallocateRemarks(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeallocateModal(null)}
              disabled={isDeallocating}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeallocateBed}
              disabled={isDeallocating}
            >
              {isDeallocating ? 'Processing...' : deallocateMoveOut ? 'Vacate Resident' : 'Unassign Bed'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
