import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Loader2, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Heart,
  Users,
  Edit,
  Home,
  FileText,
  Shield
} from 'lucide-react';

interface Resident {
  id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  marital_status: string | null;
  date_of_birth: string | null;
  address: string | null;
  phone: string | null;
  aadhaar_number: string | null;
  pan_number: string | null;
  photo_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_address: string | null;
  emergency_contact_relationship: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_address: string | null;
  guardian_relationship: string | null;
  guardian_financial_responsibility: boolean | null;
  chronic_illnesses: string | null;
  allergies: string | null;
  past_surgeries: string | null;
  special_medical_notes: string | null;
  number_of_children: number | null;
  children_details: string | null;
  status: string | null;
  created_at: string | null;
}

interface RoomAssignment {
  id: string;
  start_date: string;
  end_date: string | null;
  room: {
    room_number: string;
    room_type: string;
  }[] | null;
}

export default function ResidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resident, setResident] = useState<Resident | null>(null);
  const [roomAssignment, setRoomAssignment] = useState<RoomAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchResident();
      fetchRoomAssignment();
    }
  }, [id]);

  const fetchResident = async () => {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: 'Not Found',
          description: 'Resident not found',
          variant: 'destructive',
        });
        navigate('/residents');
        return;
      }
      
      setResident(data);
    } catch (error: any) {
      console.error('Error fetching resident:', error);
      toast({
        title: 'Error',
        description: 'Failed to load resident details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomAssignment = async () => {
    try {
      const { data, error } = await supabase
        .from('room_assignments')
        .select(`
          id,
          start_date,
          end_date,
          room:rooms(room_number, room_type)
        `)
        .eq('resident_id', id)
        .is('end_date', null)
        .maybeSingle();

      if (error) throw error;
      setRoomAssignment(data);
    } catch (error) {
      console.error('Error fetching room assignment:', error);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!resident) {
    return null;
  }

  const InfoItem = ({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) => (
    value ? (
      <div className="flex items-start gap-3">
        {icon && <div className="text-muted-foreground mt-0.5">{icon}</div>}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="font-medium">{value}</p>
        </div>
      </div>
    ) : null
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/residents')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Resident Profile</h1>
        </div>

        {/* Profile Card - Hero Section */}
        <div className="card-elevated overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Photo - Passport Size */}
              <div className="flex-shrink-0">
                <div className="w-28 h-36 md:w-32 md:h-[165px] rounded-xl bg-background shadow-lg flex items-center justify-center overflow-hidden border-4 border-background" style={{ aspectRatio: '7/9' }}>
                  {resident.photo_url ? (
                    <img 
                      src={resident.photo_url} 
                      alt={resident.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">{resident.full_name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {resident.age && (
                        <Badge variant="secondary">{resident.age} years</Badge>
                      )}
                      {resident.gender && (
                        <Badge variant="outline" className="capitalize">{resident.gender}</Badge>
                      )}
                      {resident.marital_status && (
                        <Badge variant="outline" className="capitalize">{resident.marital_status}</Badge>
                      )}
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        {resident.status || 'Active'}
                      </Badge>
                    </div>
                  </div>
                  <Button onClick={() => navigate(`/residents/${id}/edit`)} className="self-start">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>

                {/* Quick Info Row */}
                <div className="flex flex-wrap gap-4 pt-2">
                  {resident.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{resident.phone}</span>
                    </div>
                  )}
                  {resident.date_of_birth && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(resident.date_of_birth).toLocaleDateString()}</span>
                    </div>
                  )}
                  {roomAssignment?.room && roomAssignment.room[0] && (
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span>Room {roomAssignment.room[0].room_number} ({roomAssignment.room[0].room_type})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Details */}
          <div className="card-elevated p-5">
            <h3 className="flex items-center gap-2 font-semibold mb-4">
              <FileText className="w-5 h-5 text-primary" />
              Personal Details
            </h3>
            <div className="space-y-4">
              <InfoItem label="Aadhaar Number" value={resident.aadhaar_number} />
              <InfoItem label="PAN Number" value={resident.pan_number} />
              {resident.address && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Address</p>
                  <p className="font-medium mt-1">{resident.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="card-elevated p-5">
            <h3 className="flex items-center gap-2 font-semibold mb-4">
              <Phone className="w-5 h-5 text-red-500" />
              Emergency Contact
            </h3>
            <div className="space-y-4">
              <InfoItem label="Name" value={resident.emergency_contact_name} />
              <InfoItem label="Phone" value={resident.emergency_contact_phone} />
              <InfoItem label="Relationship" value={resident.emergency_contact_relationship} />
              <InfoItem label="Address" value={resident.emergency_contact_address} />
            </div>
          </div>

          {/* Guardian Details */}
          <div className="card-elevated p-5">
            <h3 className="flex items-center gap-2 font-semibold mb-4">
              <Shield className="w-5 h-5 text-blue-500" />
              Guardian / Introducer
            </h3>
            <div className="space-y-4">
              <InfoItem label="Name" value={resident.guardian_name} />
              <InfoItem label="Phone" value={resident.guardian_phone} />
              <InfoItem label="Relationship" value={resident.guardian_relationship} />
              <InfoItem label="Financial Responsibility" value={resident.guardian_financial_responsibility ? 'Yes' : 'No'} />
              <InfoItem label="Address" value={resident.guardian_address} />
            </div>
          </div>

          {/* Health Information */}
          <div className="card-elevated p-5">
            <h3 className="flex items-center gap-2 font-semibold mb-4">
              <Heart className="w-5 h-5 text-pink-500" />
              Health & Medical
            </h3>
            <div className="space-y-4">
              <InfoItem label="Chronic Illnesses" value={resident.chronic_illnesses} />
              <InfoItem label="Allergies" value={resident.allergies} />
              <InfoItem label="Past Surgeries" value={resident.past_surgeries} />
              <InfoItem label="Special Medical Notes" value={resident.special_medical_notes} />
            </div>
          </div>

          {/* Family Information */}
          {(resident.number_of_children || resident.children_details) && (
            <div className="card-elevated p-5 lg:col-span-2">
              <h3 className="flex items-center gap-2 font-semibold mb-4">
                <Users className="w-5 h-5 text-purple-500" />
                Family Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem label="Number of Children" value={resident.number_of_children?.toString()} />
                <InfoItem label="Children Details" value={resident.children_details} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}