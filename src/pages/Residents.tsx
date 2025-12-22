import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  MapPin,
  MoreVertical,
  Eye,
  Edit,
  Loader2,
  Trash2,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BulkPhotoFix } from '@/components/BulkPhotoFix';
import { toast } from '@/hooks/use-toast';

interface Resident {
  id: string;
  full_name: string;
  age: number;
  gender: string;
  photo_url: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  created_at: string;
  document_count?: number;
}

export default function Residents() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      // Fetch residents
      const { data: residentsData, error: residentsError } = await supabase
        .from('residents')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (residentsError) throw residentsError;

      // Fetch document counts per resident
      const { data: docCounts, error: docError } = await supabase
        .from('documents')
        .select('resident_id');

      if (docError) throw docError;

      // Count documents per resident
      const countMap: Record<string, number> = {};
      docCounts?.forEach(doc => {
        if (doc.resident_id) {
          countMap[doc.resident_id] = (countMap[doc.resident_id] || 0) + 1;
        }
      });

      // Merge counts into residents
      const residentsWithCounts = (residentsData || []).map(r => ({
        ...r,
        document_count: countMap[r.id] || 0,
      }));

      setResidents(residentsWithCounts);
    } catch (error) {
      console.error('Error fetching residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resident: Resident) => {
    if (!confirm(`Are you sure you want to delete ${resident.full_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete related records first
      await supabase.from('room_assignments').delete().eq('resident_id', resident.id);
      await supabase.from('payments').delete().eq('resident_id', resident.id);
      await supabase.from('documents').delete().eq('resident_id', resident.id);
      await supabase.from('reminders').delete().eq('resident_id', resident.id);
      await supabase.from('resident_extra_charges').delete().eq('resident_id', resident.id);

      // Delete the resident
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', resident.id);

      if (error) throw error;

      toast({
        title: 'Resident Deleted',
        description: `${resident.full_name} has been removed.`,
      });

      fetchResidents();
    } catch (error: unknown) {
      console.error('Error deleting resident:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete resident';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const filteredResidents = residents.filter(resident =>
    resident.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Residents</h1>
            <p className="page-description">
              Manage all residents in your care home
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BulkPhotoFix />
            <Button onClick={() => navigate('/residents/new')}>
              <Plus className="w-4 h-4" />
              Add Resident
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search residents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Residents Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredResidents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResidents.map((resident, index) => (
              <div 
                key={resident.id}
                className="card-elevated p-5 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-18 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ aspectRatio: '7/9' }}>
                    {resident.photo_url ? (
                      <img 
                        src={resident.photo_url} 
                        alt={resident.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold truncate">{resident.full_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {resident.age} years • {resident.gender}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/residents/${resident.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/residents/${resident.id}/edit`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(resident)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Document Count Badge */}
                    {resident.document_count !== undefined && resident.document_count > 0 && (
                      <Badge variant="secondary" className="mt-2 gap-1">
                        <FileText className="w-3 h-3" />
                        {resident.document_count} {resident.document_count === 1 ? 'doc' : 'docs'}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {resident.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{resident.phone}</span>
                    </div>
                  )}
                  {resident.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{resident.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => navigate(`/residents/${resident.id}`)}
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-elevated p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No residents found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'Try a different search term'
                : 'Start by adding your first resident'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/residents/new')}>
                <Plus className="w-4 h-4" />
                Add First Resident
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
