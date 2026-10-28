import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  CheckCircle,
  Phone,
  Mail,
  Shield,
  Wifi,
  Wind,
  Coffee,
  BedDouble,
  Calendar,
  Send,
  Star,
  Sparkles
} from 'lucide-react';
import { saasApi } from '../../services/saasApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { toast } from '../../context/ToastContext';
import { UrbanNestLogo } from '../../components/ui/UrbanNestLogo';

export const PublicPropertyBookingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);

  // Enquiry form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roomType, setRoomType] = useState('Single');
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      try {
        const res = await saasApi.getPublicProperty(slug || 'default');
        setProperty(res.data);
      } catch (err: any) {
        toast.error('Property not found or private');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property?.id) return;

    try {
      await saasApi.submitPublicEnquiry({
        propertyId: property.id,
        name,
        email,
        phone,
        roomType,
        visitDate,
        notes,
      });
      setSubmitted(true);
      toast.success('Your booking enquiry was submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit enquiry');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-3 font-medium">Loading Property Booking Page...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex flex-col items-center justify-center p-8 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Property Listing Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">The property link you followed might be inactive or expired.</p>
        <Link to="/">
          <Button size="sm" className="bg-emerald-800 text-white">Back to Homepage</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-16 flex items-center justify-between">
        <Link to="/">
          <UrbanNestLogo variant="horizontal" size="sm" />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="outline" size="sm" className="text-xs">Resident / Owner Login</Button>
          </Link>
        </div>
      </header>

      {/* Hero Property Section */}
      <div className="bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
              Verified Urban Nest PG
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">
              {property.name}
            </h1>
            <p className="text-sm text-slate-300 flex items-center gap-1.5 mt-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> {property.address}, {property.city}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-300">
            {property.phone && (
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> {property.phone}
              </span>
            )}
            {property.email && (
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <Mail className="w-3.5 h-3.5 text-emerald-400" /> {property.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Available Rooms & Booking Form */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Room Inventory & Amenities */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-emerald-700" /> Available Rooms & Pricing
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {property.rooms && property.rooms.length > 0 ? (
                property.rooms.map((room: any) => (
                  <Card key={room.id} className="p-5 border border-slate-200 bg-white shadow-xs hover:border-emerald-300 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {room.type} Room
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {room.availableBedsCount} Beds Available
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 mb-1">Room {room.number}</h3>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-black text-slate-900">₹{room.rent}</span>
                      <span className="text-xs text-slate-500 font-medium">/ month</span>
                    </div>

                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                        {room.amenities.map((am: string, i: number) => (
                          <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                            {am}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              ) : (
                <p className="text-sm text-slate-500">No public rooms listed for this property.</p>
              )}
            </div>
          </div>

          {/* Included Amenities */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-700" /> Included Co-Living Amenities
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600" /> High-Speed Wi-Fi
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-emerald-600" /> Daily Healthy Mess
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" /> 24/7 Gate Security
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                <Wind className="w-4 h-4 text-emerald-600" /> Air Conditioning
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Direct Booking / Enquiry Form */}
        <div>
          <Card className="p-6 border border-slate-200 bg-white shadow-lg sticky top-24">
            <h3 className="font-extrabold text-lg text-slate-900 mb-1">Book a Bed or Visit</h3>
            <p className="text-xs text-slate-500 mb-4">
              Submit your enquiry to hold your bed or schedule a physical tour.
            </p>

            {submitted ? (
              <div className="p-6 text-center bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-emerald-900">Enquiry Confirmed!</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  The property manager has received your details and will call you shortly to confirm room availability.
                </p>
                <Button size="sm" onClick={() => setSubmitted(false)} className="mt-4 bg-emerald-800 text-white">
                  Send Another Enquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Patel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="priya@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Room Preference</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium"
                  >
                    <option value="Single">Single Occupancy Room</option>
                    <option value="Double">Double Sharing</option>
                    <option value="Triple">Triple Sharing</option>
                    <option value="Four-sharing">Four Sharing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Visit / Move Date</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Questions / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Inquiring for college admission"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <Button type="submit" className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 text-xs">
                  Request Booking & Contact Manager
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
