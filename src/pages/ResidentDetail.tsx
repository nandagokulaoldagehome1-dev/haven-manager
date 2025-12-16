import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
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
  Home
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

  const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => (
    value ? (
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    ) : null
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/residents')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                {resident.photo_url ? (
                  <img 
                    src={resident.photo_url} 
                    alt={resident.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <div>
                <h1 className="page-title">{resident.full_name}</h1>
                <p className="page-description">
                  {resident.age} years • {resident.gender} • {resident.marital_status}
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => navigate(`/residents/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        {/* Room Assignment */}
        {roomAssignment?.room && roomAssignment.room[0] && (
          <div className="card-elevated p-5">
            <h2 className="form-section-title flex items-center gap-2 mb-4">
              <Home className="w-5 h-5" />
              Current Room
            </h2>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Room Number</p>
                <p className="font-semibold text-lg">{roomAssignment.room[0].room_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Room Type</p>
                <p className="font-medium capitalize">{roomAssignment.room[0].room_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Since</p>
                <p className="font-medium">{new Date(roomAssignment.start_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Personal Details */}
        <div className="card-elevated p-5">
          <h2 className="form-section-title flex items-center gap-2 mb-4">
            <User className="w-5 h-5" />
            Personal Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem label="Date of Birth" value={resident.date_of_birth ? new Date(resident.date_of_birth).toLocaleDateString() : null} />
            <InfoItem label="Phone" value={resident.phone} />
            <InfoItem label="Aadhaar Number" value={resident.aadhaar_number} />
            <InfoItem label="PAN Number" value={resident.pan_number} />
            <div className="md:col-span-2 lg:col-span-3">
              <InfoItem label="Address" value={resident.address} />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card-elevated p-5">
          <h2 className="form-section-title flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5" />
            Emergency Contact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Name" value={resident.emergency_contact_name} />
            <InfoItem label="Phone" value={resident.emergency_contact_phone} />
            <InfoItem label="Relationship" value={resident.emergency_contact_relationship} />
            <InfoItem label="Address" value={resident.emergency_contact_address} />
          </div>
        </div>

        {/* Guardian Details */}
        <div className="card-elevated p-5">
          <h2 className="form-section-title flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" />
            Guardian / Introducer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Name" value={resident.guardian_name} />
            <InfoItem label="Phone" value={resident.guardian_phone} />
            <InfoItem label="Relationship" value={resident.guardian_relationship} />
            <InfoItem label="Financial Responsibility" value={resident.guardian_financial_responsibility ? 'Yes' : 'No'} />
            <div className="md:col-span-2">
              <InfoItem label="Address" value={resident.guardian_address} />
            </div>
          </div>
        </div>

        {/* Health Information */}
        <div className="card-elevated p-5">
          <h2 className="form-section-title flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5" />
            Health & Medical Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Chronic Illnesses" value={resident.chronic_illnesses} />
            <InfoItem label="Allergies" value={resident.allergies} />
            <InfoItem label="Past Surgeries" value={resident.past_surgeries} />
            <InfoItem label="Special Medical Notes" value={resident.special_medical_notes} />
          </div>
        </div>

        {/* Family Information */}
        {(resident.number_of_children || resident.children_details) && (
          <div className="card-elevated p-5">
            <h2 className="form-section-title flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" />
              Family Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="Number of Children" value={resident.number_of_children?.toString()} />
              <div className="md:col-span-2">
                <InfoItem label="Children Details" value={resident.children_details} />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
