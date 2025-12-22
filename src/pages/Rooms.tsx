import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  BedDouble, 
  Users,
  IndianRupee,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react';

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  max_capacity: number;
  base_monthly_charge: number;
  included_services: string;
  status: string;
  current_occupants?: number;
}

const roomTypes = [
  { value: 'sharing', label: 'Sharing Room', price: 20000 },
  { value: 'single', label: 'Single Occupancy', price: 30000 },
  { value: 'double', label: 'Double Occupancy (Couple)', price: 35000 },
  { value: 'short_stay', label: 'Short Stay (Daily)', price: 1500 },
];

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    room_number: '',
    room_type: '',
    max_capacity: '2',
    base_monthly_charge: '',
    included_services: 'Food, Housekeeping, Laundry',
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data: roomsData, error } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number');

      if (error) throw error;

      // Get occupancy counts
      const { data: assignments } = await supabase
        .from('room_assignments')
        .select('room_id')
        .is('end_date', null);

      const occupancyCounts: Record<string, number> = {};
      assignments?.forEach(a => {
        occupancyCounts[a.room_id] = (occupancyCounts[a.room_id] || 0) + 1;
      });

      const roomsWithOccupancy = roomsData?.map(room => ({
        ...room,
        current_occupants: occupancyCounts[room.id] || 0,
      })) || [];

      setRooms(roomsWithOccupancy);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    const roomType = roomTypes.find(t => t.value === type);
    setFormData(prev => ({
      ...prev,
      room_type: type,
      base_monthly_charge: roomType?.price.toString() || '',
      max_capacity: type === 'sharing' ? '2' : type === 'double' ? '2' : '1',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const roomData = {
        room_number: formData.room_number,
        room_type: formData.room_type,
        max_capacity: parseInt(formData.max_capacity),
        base_monthly_charge: parseInt(formData.base_monthly_charge),
        included_services: formData.included_services,
        status: 'available',
      };

      if (editingRoom) {
        const { error } = await supabase
          .from('rooms')
          .update(roomData)
          .eq('id', editingRoom.id);

        if (error) throw error;

        toast({
          title: 'Room Updated',
          description: 'Room details have been updated.',
        });
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert(roomData);

        if (error) throw error;

        toast({
          title: 'Room Added',
          description: 'New room has been added.',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchRooms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save room',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number,
      room_type: room.room_type,
      max_capacity: room.max_capacity.toString(),
      base_monthly_charge: room.base_monthly_charge.toString(),
      included_services: room.included_services || '',
    });
    setDialogOpen(true);
  };

  const confirmDelete = (roomId: string) => {
    setRoomToDelete(roomId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!roomToDelete) return;

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomToDelete);

      if (error) throw error;

      toast({
        title: 'Room Deleted',
        description: 'The room has been removed.',
      });

      setDeleteDialogOpen(false);
      setRoomToDelete(null);
      fetchRooms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete room',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setRoomToDelete(null);
    }
  };

  const resetForm = () => {
    setEditingRoom(null);
    setFormData({
      room_number: '',
      room_type: '',
      max_capacity: '2',
      base_monthly_charge: '',
      included_services: 'Food, Housekeeping, Laundry',
    });
  };

  const getOccupancyStatus = (room: Room) => {
    const occupancy = room.current_occupants || 0;
    if (occupancy === 0) return { label: 'Vacant', class: 'badge-success' };
    if (occupancy < room.max_capacity) return { label: 'Partial', class: 'badge-warning' };
    return { label: 'Full', class: 'badge-destructive' };
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Rooms</h1>
            <p className="page-description">Manage rooms and assignments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="room_number">Room Number / Name</Label>
                  <Input
                    id="room_number"
                    value={formData.room_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, room_number: e.target.value }))}
                    placeholder="e.g., 101, A-Block"
                    required
                  />
                </div>
                <div>
                  <Label>Room Type</Label>
                  <Select value={formData.room_type} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} - ₹{type.price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_capacity">Max Capacity</Label>
                    <Input
                      id="max_capacity"
                      type="number"
                      value={formData.max_capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_capacity: e.target.value }))}
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="base_monthly_charge">Monthly Charge (₹)</Label>
                    <Input
                      id="base_monthly_charge"
                      type="number"
                      value={formData.base_monthly_charge}
                      onChange={(e) => setFormData(prev => ({ ...prev, base_monthly_charge: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="included_services">Included Services</Label>
                  <Input
                    id="included_services"
                    value={formData.included_services}
                    onChange={(e) => setFormData(prev => ({ ...prev, included_services: e.target.value }))}
                    placeholder="Food, Housekeeping, etc."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingRoom ? 'Update' : 'Add'} Room
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Room Type Legend */}
        <div className="flex flex-wrap gap-3">
          {roomTypes.map(type => (
            <div key={type.value} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-primary/30" />
              <span className="text-muted-foreground">{type.label}</span>
              <span className="font-medium">₹{type.price.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Rooms Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room, index) => {
              const status = getOccupancyStatus(room);
              return (
                <div 
                  key={room.id}
                  className="card-elevated p-5 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BedDouble className="w-6 h-6 text-primary" />
                    </div>
                    <span className={status.class}>{status.label}</span>
                  </div>

                  <h3 className="font-semibold text-lg mb-1">Room {room.room_number}</h3>
                  <p className="text-sm text-muted-foreground capitalize mb-4">
                    {room.room_type.replace('_', ' ')}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Occupancy
                      </span>
                      <span className="font-medium">
                        {room.current_occupants || 0} / {room.max_capacity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <IndianRupee className="w-4 h-4" />
                        Monthly
                      </span>
                      <span className="font-medium">
                        ₹{room.base_monthly_charge?.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEdit(room)}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => confirmDelete(room.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-elevated p-12 text-center">
            <BedDouble className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No rooms added yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding rooms to your facility
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Add First Room
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this room? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
