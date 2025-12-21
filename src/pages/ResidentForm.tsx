import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, User, Users, Heart, Phone, Home } from 'lucide-react';
import { PhotoUpload } from '@/components/PhotoUpload';

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  max_capacity: number;
  base_monthly_charge: number;
  current_occupants?: number;
}

export default function ResidentForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [generatePayment, setGeneratePayment] = useState<boolean>(false);
  const [paymentMonths, setPaymentMonths] = useState<number>(1);
  const [rentPaymentDay, setRentPaymentDay] = useState<string>('5');

  const [formData, setFormData] = useState({
    // Personal Details
    full_name: '',
    age: '',
    gender: '',
    marital_status: '',
    date_of_birth: '',
    address: '',
    aadhaar_number: '',
    pan_number: '',

    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_address: '',
    emergency_contact_relationship: '',

    // Guardian Details
    guardian_name: '',
    guardian_phone: '',
    guardian_address: '',
    guardian_relationship: '',
    guardian_financial_responsibility: 'no',

    // Health Details
    chronic_illnesses: '',
    allergies: '',
    past_surgeries: '',
    special_medical_notes: '',

    // Children Details (comma-separated for simplicity)
    number_of_children: '',
    children_details: '',
  });

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'available');

      if (roomsError) {
        console.error('Error fetching rooms:', roomsError);
        return;
      }

      // Get current occupancy for each room
      const { data: assignments } = await supabase
        .from('room_assignments')
        .select('room_id')
        .is('end_date', null);

      const occupancyMap: Record<string, number> = {};
      assignments?.forEach(a => {
        occupancyMap[a.room_id] = (occupancyMap[a.room_id] || 0) + 1;
      });

      const roomsWithOccupancy = roomsData?.map(room => ({
        ...room,
        current_occupants: occupancyMap[room.id] || 0,
      })).filter(room => room.current_occupants < room.max_capacity) || [];

      setRooms(roomsWithOccupancy);
    };

    fetchRooms();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (file: File | null, preview: string | null) => {
    setPhotoFile(file);
    setPhotoPreview(preview);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let photoUrl = null;

      // Upload photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('resident_photos')
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('resident_photos')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // Insert resident
      const { data: residentData, error } = await supabase.from('residents').insert({
        full_name: formData.full_name,
        age: parseInt(formData.age) || null,
        gender: formData.gender,
        marital_status: formData.marital_status,
        date_of_birth: formData.date_of_birth || null,
        address: formData.address,
        aadhaar_number: formData.aadhaar_number || null,
        pan_number: formData.pan_number || null,
        photo_url: photoUrl,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_address: formData.emergency_contact_address,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        guardian_name: formData.guardian_name,
        guardian_phone: formData.guardian_phone,
        guardian_address: formData.guardian_address,
        guardian_relationship: formData.guardian_relationship,
        guardian_financial_responsibility: formData.guardian_financial_responsibility === 'yes',
        chronic_illnesses: formData.chronic_illnesses,
        allergies: formData.allergies,
        past_surgeries: formData.past_surgeries,
        special_medical_notes: formData.special_medical_notes,
        number_of_children: parseInt(formData.number_of_children) || 0,
        children_details: formData.children_details,
        status: 'active',
      }).select().single();

      if (error) throw error;

      // Create room assignment if a room was selected
      if (selectedRoomId && selectedRoomId !== 'none' && residentData) {
        const { error: assignmentError } = await supabase.from('room_assignments').insert({
          resident_id: residentData.id,
          room_id: selectedRoomId,
          start_date: new Date().toISOString().split('T')[0],
        });

        if (assignmentError) {
          console.error('Error creating room assignment:', assignmentError);
          toast({
            title: 'Warning',
            description: 'Resident created but room assignment failed.',
            variant: 'destructive',
          });
        }
      }

      // Generate initial payment if requested
      if (generatePayment && selectedRoomId && selectedRoomId !== 'none' && residentData) {
        const selectedRoom = rooms.find(r => r.id === selectedRoomId);
        if (selectedRoom) {
          const today = new Date();
          const currentYear = today.getFullYear();
          const currentMonth = today.getMonth();

          // Create payment records for each month
          const paymentRecords = [];
          for (let i = 0; i < paymentMonths; i++) {
            const paymentDate = new Date(currentYear, currentMonth + i, parseInt(rentPaymentDay));
            const monthYear = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            const receiptNumber = `RCP-${Date.now()}-${i + 1}`;

            paymentRecords.push({
              resident_id: residentData.id,
              amount: selectedRoom.base_monthly_charge || 0,
              payment_date: paymentDate.toISOString().split('T')[0],
              payment_method: 'cash',
              month_year: monthYear,
              receipt_number: receiptNumber,
              status: 'completed',
              notes: `Initial payment for ${paymentMonths} month(s) - Month ${i + 1}`,
            });
          }

          const { error: paymentError } = await supabase
            .from('payments')
            .insert(paymentRecords);

          if (paymentError) {
            console.error('Error creating payments:', paymentError);
            toast({
              title: 'Warning',
              description: 'Resident added but payment generation failed.',
              variant: 'destructive',
            });
          }
        }
      }

      toast({
        title: 'Resident Added',
        description: generatePayment 
          ? `Resident added with ${paymentMonths} month(s) payment recorded.` 
          : selectedRoomId && selectedRoomId !== 'none' 
            ? 'Resident added and room assigned.' 
            : 'The resident has been successfully added.',
      });

      navigate('/residents');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add resident',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/residents')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="page-title">Add New Resident</h1>
            <p className="page-description">Fill in the resident's information</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="form-section">
            <h2 className="form-section-title flex items-center gap-2">
              <User className="w-5 h-5" />
              Photo
            </h2>
            <PhotoUpload
              value={photoPreview}
              onChange={handlePhotoChange}
            />
          </div>

          {/* Room Assignment */}
          <div className="form-section">
            <h2 className="form-section-title flex items-center gap-2">
              <Home className="w-5 h-5" />
              Room Assignment & Payment Setup
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Assign Room (Optional)</Label>
                <Select
                  value={selectedRoomId}
                  onValueChange={setSelectedRoomId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No room assignment</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.room_number} - {room.room_type} ({room.current_occupants}/{room.max_capacity}) - ₹{room.base_monthly_charge}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Only rooms with available capacity are shown
                </p>
              </div>

              {selectedRoomId && selectedRoomId !== 'none' && (
                <>
                  <div className="md:col-span-2">
                    <Label htmlFor="rentPaymentDay">Rent Payment Day of Month</Label>
                    <div className="grid grid-cols-7 gap-2 mt-2 p-3 border rounded-lg">
                      {[...Array(31)].map((_, i) => (
                        <button
                          key={i + 1}
                          type="button"
                          onClick={() => setRentPaymentDay(String(i + 1))}
                          className={`
                            h-10 rounded-md text-sm font-medium transition-colors
                            ${rentPaymentDay === String(i + 1) 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted hover:bg-muted/80 text-foreground'
                            }
                          `}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Selected: Day {rentPaymentDay} of every month
                    </p>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={generatePayment}
                        onChange={(e) => setGeneratePayment(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Generate Initial Payment
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Record payment for initial months
                    </p>
                  </div>

                  {generatePayment && (
                    <div className="md:col-span-2">
                      <Label htmlFor="paymentMonths">Number of Months Paying For</Label>
                      <Select 
                        value={String(paymentMonths)} 
                        onValueChange={(value) => setPaymentMonths(Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(12)].map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {i + 1} {i === 0 ? 'Month' : 'Months'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        This will create payment records for {paymentMonths} month(s) at ₹{rooms.find(r => r.id === selectedRoomId)?.base_monthly_charge || 0}/month
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Personal Details */}
          <div className="form-section">
            <h2 className="form-section-title flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="Age in years"
                />
              </div>
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleSelectChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marital Status</Label>
                <Select
                  value={formData.marital_status}
                  onValueChange={(value) => handleSelectChange('marital_status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Permanent Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
                <Input
                  id="aadhaar_number"
                  name="aadhaar_number"
                  value={formData.aadhaar_number}
                  onChange={handleInputChange}
                  placeholder="12-digit Aadhaar"
                  maxLength={12}
                />
              </div>
              <div>
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input
                  id="pan_number"
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleInputChange}
                  placeholder="10-character PAN"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="form-section">
            <h2 className="form-section-title flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Emergency Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Phone Number</Label>
                <Input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                  placeholder="10-digit mobile"
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Input
                  id="emergency_contact_relationship"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleInputChange}
                  placeholder="e.g., Son, Daughter"
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_address">Address</Label>
                <Input
                  id="emergency_contact_address"
                  name="emergency_contact_address"
                  value={formData.emergency_contact_address}
                  onChange={handleInputChange}
                  placeholder="Contact's address"
                />
              </div>
            </div>
          </div>

          {/* Guardian Details */}
          <div className="form-section">
            <h2 className="form-section-title flex items-center gap-2">
              <Users className="w-5 h-5" />
              Guardian / Introducer Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guardian_name">Guardian Name</Label>
                <Input
                  id="guardian_name"
                  name="guardian_name"
                  value={formData.guardian_name}
                  onChange={handleInputChange}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label htmlFor="guardian_phone">Phone Number</Label>
                <Input
                  id="guardian_phone"
                  name="guardian_phone"
                  value={formData.guardian_phone}
                  onChange={handleInputChange}
                  placeholder="10-digit mobile"
                />
              </div>
              <div>
                <Label htmlFor="guardian_relationship">Relationship</Label>
                <Input
                  id="guardian_relationship"
                  name="guardian_relationship"
                  value={formData.guardian_relationship}
                  onChange={handleInputChange}
                  placeholder="e.g., Son, Nephew"
                />
              </div>
              <div>
                <Label>Financial Responsibility</Label>
                <Select
                  value={formData.guardian_financial_responsibility}
                  onValueChange={(value) => handleSelectChange('guardian_financial_responsibility', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="guardian_address">Address</Label>
                <Textarea
                  id="guardian_address"
                  name="guardian_address"
                  value={formData.guardian_address}
                  onChange={handleInputChange}
                  placeholder="Guardian's full address"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Health Details */}
          <div className="form-section">
            <h2 className="form-section-title flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Health & Medical Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chronic_illnesses">Chronic Illnesses</Label>
                <Textarea
                  id="chronic_illnesses"
                  name="chronic_illnesses"
                  value={formData.chronic_illnesses}
                  onChange={handleInputChange}
                  placeholder="List any chronic conditions"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  placeholder="Food, medicine allergies"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="past_surgeries">Past Surgeries</Label>
                <Textarea
                  id="past_surgeries"
                  name="past_surgeries"
                  value={formData.past_surgeries}
                  onChange={handleInputChange}
                  placeholder="Previous surgical procedures"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="special_medical_notes">Special Medical Notes</Label>
                <Textarea
                  id="special_medical_notes"
                  name="special_medical_notes"
                  value={formData.special_medical_notes}
                  onChange={handleInputChange}
                  placeholder="Any special care requirements"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Family / Children */}
          <div className="form-section">
            <h2 className="form-section-title flex items-center gap-2">
              <Users className="w-5 h-5" />
              Family Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number_of_children">Number of Children</Label>
                <Input
                  id="number_of_children"
                  name="number_of_children"
                  type="number"
                  value={formData.number_of_children}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="children_details">Children Details</Label>
                <Textarea
                  id="children_details"
                  name="children_details"
                  value={formData.children_details}
                  onChange={handleInputChange}
                  placeholder="Name, phone, email for each child (one per line)"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/residents')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Resident
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
