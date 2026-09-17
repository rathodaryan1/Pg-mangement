import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  Users,
  ShieldCheck,
  Wifi,
  Sparkles,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Building,
  AlertTriangle,
  RefreshCw,
  Home,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { residentApi } from '../../services/residentApi';
import type { ResidentRoomData } from '../../services/residentApi';

export const ResidentRoomPage: React.FC = () => {
  const [data, setData] = useState<ResidentRoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await residentApi.getRoom();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load room data:', err.message);
      setError(err.message || 'Failed to load assigned room details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-center space-y-4 max-w-lg mx-auto mt-8">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="text-base font-bold text-red-900 dark:text-red-200">Unable to Fetch Room Information</h3>
        <p className="text-xs text-red-700 dark:text-red-400">{error || 'Network error occurred'}</p>
        <Button variant="secondary" size="sm" onClick={fetchRoomData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data.assigned || !data.room) {
    return (
      <div className="p-12 rounded-2xl bg-white border border-[#DDE2DD] text-center space-y-3 max-w-md mx-auto mt-8">
        <Home className="w-12 h-12 text-[#8A928D] mx-auto" />
        <h3 className="text-base font-bold text-[#18231F]">No Room Assigned</h3>
        <p className="text-xs text-[#68736D]">
          {data.message || 'You have not been assigned to a room yet. Please contact the property manager.'}
        </p>
      </div>
    );
  }

  const { room, myBed, property, roommates = [] } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#18231F]">My Room Details</h1>
        <p className="text-xs text-[#68736D]">
          Allocated room specifications, roommates, amenities, and property contacts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Room Specifications & Roommates */}
        <Card className="p-6 md:col-span-2 space-y-6 border-[#DDE2DD]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDE2DD] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-[#18231F]">
                  Room {room.roomNumber} • {myBed?.bedNumber || 'Bed A'}
                </h3>
                <Badge variant="success">ACTIVE LEASE</Badge>
              </div>
              <p className="text-xs text-[#68736D] mt-1 flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-[#0B4036]" />
                {room.building}, Floor {room.floor} • {room.roomType}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#8A928D] uppercase tracking-wider block">Monthly Rent</span>
              <span className="text-lg font-black text-[#0B4036]">
                ₹{(myBed?.monthlyRent || room.baseRent).toLocaleString()}/mo
              </span>
            </div>
          </div>

          {/* Roommates Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#18231F] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#0B4036]" />
              Roommates ({roommates.length} {roommates.length === 1 ? 'Person' : 'People'})
            </h4>

            {roommates.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#EAF2EE] border border-[#0B4036]/20 text-xs text-[#0B4036]">
                ✨ Single occupancy room or no other residents currently assigned to this room.
              </div>
            ) : (
              <div className="space-y-2">
                {roommates.map((mate) => (
                  <div
                    key={mate.id}
                    className="p-3.5 rounded-xl border border-[#DDE2DD] bg-[#FCFBF8] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EAF2EE] text-[#0B4036] font-bold flex items-center justify-center text-xs shadow-xs">
                        {mate.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-[#18231F]">{mate.name}</p>
                        <p className="text-[11px] text-[#68736D]">
                          {mate.bedNumber} • Since {new Date(mate.joiningDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{mate.bedNumber}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Included Room Amenities */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-forest dark:text-brand-gold" />
              Included Room Amenities
            </h4>
            <div className="flex flex-wrap gap-2">
              {room.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="px-3 py-1.5 rounded-xl bg-brand-surface text-brand-forest dark:bg-brand-forest/20 dark:text-brand-gold text-xs font-medium flex items-center gap-1.5 border border-brand-border dark:border-brand-border-dark"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-forest dark:text-brand-gold shrink-0" />
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Property & House Rules Sidebar */}
        <div className="space-y-6">
          {/* Property Contact Info */}
          {property && (
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">
                PG Branch & Contact
              </h3>
              <div className="space-y-2.5 text-xs">
                <p className="font-bold text-slate-900 dark:text-white">{property.name}</p>
                <p className="text-slate-500 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  {property.address}
                </p>
                <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
                  <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-brand-forest dark:text-brand-gold" />
                    <strong>Manager:</strong> {property.phone}
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-brand-forest dark:text-brand-gold" />
                    <strong>Email:</strong> {property.email}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* House Rules Card */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-forest dark:text-brand-gold" />
              PG House Rules & Timings
            </h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-1.5">
                <span className="text-brand-forest dark:text-brand-gold font-bold">•</span>
                <strong>Main Gate Closes:</strong> 11:30 PM sharp IST
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand-forest dark:text-brand-gold font-bold">•</span>
                <strong>Visitor Hours:</strong> 09:00 AM – 08:00 PM with gate pass
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand-forest dark:text-brand-gold font-bold">•</span>
                <strong>Quiet Hours:</strong> 11:00 PM to 07:00 AM
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand-forest dark:text-brand-gold font-bold">•</span>
                Smoking & alcohol strictly prohibited on premises.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
