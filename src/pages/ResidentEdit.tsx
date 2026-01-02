import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, User, Users, Heart, Phone, Home, Trash2 } from 'lucide-react';
import { PhotoUpload } from '@/components/PhotoUpload';

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  max_capacity: number;
  current_occupants?: number;
}

export default function ResidentEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [currentRoomAssignmentId, setCurrentRoomAssignmentId] = useState<string | null>(null);
  const [previousRoomId, setPreviousRoomId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: '',
    marital_status: '',
    date_of_birth: '',
    address: '',
    phone: '',
    aadhaar_number: '',
    pan_number: '',
    photo_url: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_address: '',
    emergency_contact_relationship: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_address: '',
    guardian_relationship: '',
    guardian_financial_responsibility: 'no',
    chronic_illnesses: '',
    allergies: '',
    past_surgeries: '',
    special_medical_notes: '',
    number_of_children: '',
    children_details: '',
  });

  useEffect(() => {
    if (id) {
      fetchResident();
      fetchRooms();
      fetchCurrentRoomAssignment();
    }
  }, [id]);

  const fetchResident = async () => {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        full_name: data.full_name || '',
        age: data.age?.toString() || '',
        gender: data.gender || '',
        marital_status: data.marital_status || '',
        date_of_birth: data.date_of_birth || '',
        address: data.address || '',
        phone: data.phone || '',
        aadhaar_number: data.aadhaar_number || '',
        pan_number: data.pan_number || '',
        photo_url: data.photo_url || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        emergency_contact_address: data.emergency_contact_address || '',
        emergency_contact_relationship: data.emergency_contact_relationship || '',
        guardian_name: data.guardian_name || '',
        guardian_phone: data.guardian_phone || '',
        guardian_address: data.guardian_address || '',
        guardian_relationship: data.guardian_relationship || '',
        guardian_financial_responsibility: data.guardian_financial_responsibility ? 'yes' : 'no',
        chronic_illnesses: data.chronic_illnesses || '',
        allergies: data.allergies || '',
        past_surgeries: data.past_surgeries || '',
        special_medical_notes: data.special_medical_notes || '',
        number_of_children: data.number_of_children?.toString() || '',
        children_details: data.children_details || '',
      });

      if (data.photo_url) {
        setPhotoPreview(data.photo_url);
      }
    } catch (error) {
      console.error('Error fetching resident:', error);
      toast({
        title: 'Error',
        description: 'Failed to load resident data',
        variant: 'destructive',
      });
      navigate('/residents');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'available');

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
    })) || [];

    setRooms(roomsWithOccupancy);
  };

  const fetchCurrentRoomAssignment = async () => {
    const { data } = await supabase
      .from('room_assignments')
      .select('id, room_id')
      .eq('resident_id', id)
      .is('end_date', null)
      .maybeSingle();

    if (data) {
      setSelectedRoomId(data.room_id);
      setCurrentRoomAssignmentId(data.id);
      setPreviousRoomId(data.room_id);
    }
  };

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
    setSaving(true);

    try {
      let photoUrl = formData.photo_url;

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

      const { error } = await supabase
        .from('residents')
        .update({
          full_name: formData.full_name,
          age: parseInt(formData.age) || null,
          gender: formData.gender || null,
          marital_status: formData.marital_status || null,
          date_of_birth: formData.date_of_birth || null,
          address: formData.address || null,
          phone: formData.phone || null,
          aadhaar_number: formData.aadhaar_number || null,
          pan_number: formData.pan_number || null,
          photo_url: photoUrl || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          emergency_contact_address: formData.emergency_contact_address || null,
          emergency_contact_relationship: formData.emergency_contact_relationship || null,
          guardian_name: formData.guardian_name || null,
          guardian_phone: formData.guardian_phone || null,
          guardian_address: formData.guardian_address || null,
          guardian_relationship: formData.guardian_relationship || null,
          guardian_financial_responsibility: formData.guardian_financial_responsibility === 'yes',
          chronic_illnesses: formData.chronic_illnesses || null,
          allergies: formData.allergies || null,
          past_surgeries: formData.past_surgeries || null,
          special_medical_notes: formData.special_medical_notes || null,
          number_of_children: parseInt(formData.number_of_children) || 0,
          children_details: formData.children_details || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Handle room assignment changes
      if (selectedRoomId !== previousRoomId) {
        // End current assignment if exists
        if (currentRoomAssignmentId) {
          await supabase
            .from('room_assignments')
            .update({ end_date: new Date().toISOString().split('T')[0] })
            .eq('id', currentRoomAssignmentId);
        }

        // Create new assignment if room selected
        if (selectedRoomId && selectedRoomId !== 'none') {
          await supabase.from('room_assignments').insert({
            resident_id: id,
            room_id: selectedRoomId,
            start_date: new Date().toISOString().split('T')[0],
          });

          // Auto-update base payments with new room's rate
          const newRoom = rooms.find(r => r.id === selectedRoomId);
          if (newRoom) {
            const { data: monthlyRate } = await supabase
              .from('rooms')
              .select('base_monthly_charge')
              .eq('id', selectedRoomId)
              .single();

            if (monthlyRate && monthlyRate.base_monthly_charge) {
              // Get all pending payments for this resident
              const { data: payments } = await supabase
                .from('payments')
                .select('id, month_year')
                .eq('resident_id', id)
                .eq('status', 'pending');

              // Update base_amount for all pending payments
              if (payments && payments.length > 0) {
                for (const payment of payments) {
                  await supabase
                    .from('payments')
                    .update({ base_amount: monthlyRate.base_monthly_charge })
                    .eq('id', payment.id);
                }

                toast({
                  title: 'Room Reassigned',
                  description: `Updated base payment amount to ₹${monthlyRate.base_monthly_charge.toLocaleString()} for all pending payments.`,
                });
              }
            }
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Resident updated successfully',
      });

      navigate(`/residents/${id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update resident',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResident = async () => {
    setDeleting(true);
    try {
      // Delete room assignments
      await supabase
        .from('room_assignments')
        .delete()
        .eq('resident_id', id);

      // Delete payments
      await supabase
        .from('payments')
        .delete()
        .eq('resident_id', id);

      // Delete extra charges
      await supabase
        .from('resident_extra_charges')
        .delete()
        .eq('resident_id', id);

      // Delete documents
      await supabase
        .from('documents')
        .delete()
        .eq('resident_id', id);

      // Delete reminders
      await supabase
        .from('reminders')
        .delete()
        .eq('resident_id', id);

      // Delete resident
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Resident Deleted',
        description: 'Resident and all associated data have been removed.',
      });

      navigate('/residents');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete resident',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/residents/${id}`)} aria-label="Go back to resident details">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="page-title">Edit Resident</h1>
            <p className="page-description">Update resident information</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="card-elevated p-5">
            <h2 className="form-section-title flex items-center gap-2">
              <User className="w-5 h-5" />
              Photo
            </h2>
            <div className="mt-4">
              <PhotoUpload
                value={photoPreview}
                onChange={handlePhotoChange}
              />
            </div>
          </div>

          {/* Room Assignment */}
          <div className="card-elevated p-5">
            <h2 className="form-section-title flex items-center gap-2">
              <Home className="w-5 h-5" />
              Room Assignment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Assign Room</Label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No room assignment</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.room_number} - {room.room_type} ({room.current_occupants}/{room.max_capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="card-elevated p-5">
            <h2 className="form-section-title flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="md:col-span-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
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
                <Select value={formData.gender} onValueChange={(value) => handleSelectChange('gender', value)}>
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
                <Select value={formData.marital_status} onValueChange={(value) => handleSelectChange('marital_status', value)}>
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
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
                <Input
                  id="aadhaar_number"
                  name="aadhaar_number"
                  value={formData.aadhaar_number}
                  onChange={handleInputChange}
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
                  maxLength={10}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="card-elevated p-5">
            <h2 className="form-section-title flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Emergency Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="emergency_contact_name">Name</Label>
                <Input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Input
                  id="emergency_contact_relationship"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_address">Address</Label>
                <Input
                  id="emergency_contact_address"
                  name="emergency_contact_address"
                  value={formData.emergency_contact_address}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Guardian Details */}
          <div className="card-elevated p-5">
            <h2 className="form-section-title flex items-center gap-2">
              <Users className="w-5 h-5" />
              Guardian / Introducer
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="guardian_name">Name</Label>
                <Input
                  id="guardian_name"
                  name="guardian_name"
                  value={formData.guardian_name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="guardian_phone">Phone</Label>
                <Input
                  id="guardian_phone"
                  name="guardian_phone"
                  value={formData.guardian_phone}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="guardian_relationship">Relationship</Label>
                <Input
                  id="guardian_relationship"
                  name="guardian_relationship"
                  value={formData.guardian_relationship}
                  onChange={handleInputChange}
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
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
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
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Health Details */}
          <div className="card-elevated p-5">
            <h2 className="form-section-title flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Health & Medical
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="chronic_illnesses">Chronic Illnesses</Label>
                <Textarea
                  id="chronic_illnesses"
                  name="chronic_illnesses"
                  value={formData.chronic_illnesses}
                  onChange={handleInputChange}
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
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Family Details */}
          <div className="card-elevated p-5">
            <h2 className="form-section-title flex items-center gap-2">
              <Users className="w-5 h-5" />
              Family Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="number_of_children">Number of Children</Label>
                <Input
                  id="number_of_children"
                  name="number_of_children"
                  type="number"
                  value={formData.number_of_children}
                  onChange={handleInputChange}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="children_details">Children Details</Label>
                <Textarea
                  id="children_details"
                  name="children_details"
                  value={formData.children_details}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Names, ages, contact info..."
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-between items-center gap-3">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
              Delete Resident
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(`/residents/${id}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Resident?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {formData.full_name} and all associated data including:
                <ul className="mt-2 ml-4 space-y-1 list-disc text-sm">
                  <li>Room assignments</li>
                  <li>Payment records</li>
                  <li>Extra charges</li>
                  <li>Documents</li>
                  <li>Reminders</li>
                </ul>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteResident}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}