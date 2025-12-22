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
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search,
  FileText,
  Upload,
  Trash2,
  Loader2,
  Eye,
  HardDrive,
  Download,
  FolderDown
} from 'lucide-react';
import JSZip from 'jszip';

interface Document {
  id: string;
  resident_id: string;
  resident_name?: string;
  document_type: string;
  file_name: string;
  file_url: string;
  drive_file_id?: string;
  uploaded_at: string;
}

interface Resident {
  id: string;
  full_name: string;
}

const documentTypes = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'medical_report', label: 'Medical Report' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'discharge_summary', label: 'Discharge Summary' },
  { value: 'other', label: 'Other' },
];

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResident, setFilterResident] = useState('');
  const [filterType, setFilterType] = useState('');

  const [formData, setFormData] = useState({
    resident_id: '',
    document_type: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select(`
          *,
          residents (full_name)
        `)
        .order('uploaded_at', { ascending: false });

      if (docsError) throw docsError;

      const formattedDocs = docsData?.map(d => ({
        ...d,
        resident_name: d.residents?.full_name,
      })) || [];

      setDocuments(formattedDocs);

      const { data: residentsData } = await supabase
        .from('residents')
        .select('id, full_name')
        .eq('status', 'active')
        .order('full_name');

      setResidents(residentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !formData.resident_id || !formData.document_type) return;

    setUploading(true);

    try {
      const resident = residents.find(r => r.id === formData.resident_id);
      if (!resident) throw new Error('Resident not found');

      const fileContent = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || 'application/octet-stream';

      const fileExt = selectedFile.name.split('.').pop() || 'bin';
      const safeType = formData.document_type || 'document';
      const fileName = `${safeType}_${Date.now()}.${fileExt}`;

      const { data: uploadResult, error: uploadError } = await supabase.functions.invoke('upload-to-drive', {
        body: {
          action: 'upload',
          fileName,
          fileContent,
          mimeType,
          residentName: resident.full_name,
        },
      });

      if (uploadError) throw uploadError;
      if (!uploadResult?.success) {
        throw new Error(uploadResult?.error || 'Upload failed');
      }

      const { error: dbError } = await supabase.from('documents').insert({
        resident_id: formData.resident_id,
        document_type: formData.document_type,
        file_name: selectedFile.name,
        file_url: uploadResult.webViewLink,
        drive_file_id: uploadResult.id,
      });

      if (dbError) throw dbError;

      toast({
        title: 'Document Uploaded',
        description: 'The document has been uploaded to Google Drive.',
      });

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      if (doc.drive_file_id) {
        const response = await supabase.functions.invoke('upload-to-drive', {
          body: {
            action: 'delete',
            fileId: doc.drive_file_id,
          },
        });

        if (response.error || !response.data?.success) {
          console.warn('Could not delete from Google Drive:', response.data?.error);
        }
      } else if (doc.file_url.startsWith('gdrive:')) {
        const fileId = doc.file_url.replace('gdrive:', '').split('|')[0];
        
        const response = await supabase.functions.invoke('upload-to-drive', {
          body: {
            action: 'delete',
            fileId,
          },
        });

        if (response.error || !response.data?.success) {
          console.warn('Could not delete from Google Drive:', response.data?.error);
        }
      } else if (!doc.file_url.includes('drive.google.com')) {
        const urlParts = doc.file_url.split('/');
        const filePath = urlParts.slice(-2).join('/');

        await supabase.storage
          .from('medical_documents')
          .remove([filePath]);
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: 'Document Deleted',
        description: 'The document has been removed.',
      });

      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete document';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleBulkDownload = async (residentId?: string) => {
    const docsToDownload = residentId 
      ? filteredDocuments.filter(d => d.resident_id === residentId)
      : filteredDocuments;

    if (docsToDownload.length === 0) {
      toast({
        title: 'No Documents',
        description: 'No documents to download.',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(true);
    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;

    const residentName = residentId 
      ? residents.find(r => r.id === residentId)?.full_name || 'Unknown'
      : 'All_Residents';

    toast({
      title: 'Preparing Download',
      description: `Downloading ${docsToDownload.length} document(s)...`,
    });

    for (const doc of docsToDownload) {
      try {
        // For Google Drive files, we need to use a proxy or direct download URL
        let downloadUrl = doc.file_url;
        
        // Convert Google Drive view URL to direct download URL
        if (doc.file_url.includes('drive.google.com/file/d/')) {
          const fileId = doc.file_url.match(/\/d\/([^/]+)/)?.[1];
          if (fileId) {
            downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          }
        }

        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error('Failed to fetch file');
        
        const blob = await response.blob();
        const folderName = doc.resident_name || 'Unknown';
        zip.file(`${folderName}/${doc.file_name}`, blob);
        successCount++;
      } catch (error) {
        console.error(`Failed to download ${doc.file_name}:`, error);
        failCount++;
      }
    }

    if (successCount === 0) {
      toast({
        title: 'Download Failed',
        description: 'Could not download any files. Google Drive files may require manual download.',
        variant: 'destructive',
      });
      setDownloading(false);
      return;
    }

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${residentName}_Documents_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: `Downloaded ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ''}.`,
      });
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to create ZIP file.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const resetForm = () => {
    setFormData({ resident_id: '', document_type: '' });
    setSelectedFile(null);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.resident_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesResident = !filterResident || filterResident === 'all' || doc.resident_id === filterResident;
    const matchesType = !filterType || filterType === 'all' || doc.document_type === filterType;
    return matchesSearch && matchesResident && matchesType;
  });

  const getDocumentTypeLabel = (type: string) => {
    return documentTypes.find(t => t.value === type)?.label || type;
  };

  const isGoogleDriveFile = (doc: Document) => {
    return doc.drive_file_id || doc.file_url.includes('drive.google.com') || doc.file_url.startsWith('gdrive:');
  };

  // Get unique residents from filtered documents for bulk download options
  const residentsWithDocs = [...new Set(filteredDocuments.map(d => d.resident_id))];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">Documents</h1>
            <p className="page-description">Manage resident documents stored in Google Drive</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk Download Button */}
            {filteredDocuments.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => handleBulkDownload()}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderDown className="w-4 h-4" />
                )}
                {downloading ? 'Downloading...' : 'Download All'}
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    Upload to Google Drive
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4 mt-4">
                  <div>
                    <Label>Resident</Label>
                    <Select 
                      value={formData.resident_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, resident_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select resident" />
                      </SelectTrigger>
                      <SelectContent>
                        {residents.map(resident => (
                          <SelectItem key={resident.id} value={resident.id}>
                            {resident.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Document will be stored in resident's folder
                    </p>
                  </div>
                  <div>
                    <Label>Document Type</Label>
                    <Select 
                      value={formData.document_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, document_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="file">File</Label>
                    <div className="mt-2">
                      <label 
                        htmlFor="file"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        {selectedFile ? (
                          <div className="text-center">
                            <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
                            <p className="text-sm font-medium truncate max-w-[200px]">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload (Max 10MB)
                            </p>
                          </div>
                        )}
                      </label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploading || !selectedFile}>
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterResident} onValueChange={setFilterResident}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by resident" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Residents</SelectItem>
              {residents.map(resident => (
                <SelectItem key={resident.id} value={resident.id}>
                  {resident.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {documentTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Download per Resident */}
        {filterResident && filterResident !== 'all' && filteredDocuments.length > 1 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Download className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {filteredDocuments.length} documents for this resident
            </span>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => handleBulkDownload(filterResident)}
              disabled={downloading}
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderDown className="w-4 h-4" />}
              Download All
            </Button>
          </div>
        )}

        {/* Documents List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc, index) => (
              <div 
                key={doc.id}
                className="card-elevated p-4 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {isGoogleDriveFile(doc) ? (
                      <HardDrive className="w-6 h-6 text-primary" />
                    ) : (
                      <FileText className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{doc.file_name}</h3>
                    <p className="text-sm text-muted-foreground">{doc.resident_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge-primary">
                        {getDocumentTypeLabel(doc.document_type)}
                      </span>
                      {isGoogleDriveFile(doc) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          Drive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(doc)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-elevated p-12 text-center">
            <HardDrive className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterResident || filterType 
                ? 'Try different filters'
                : 'Upload your first document to Google Drive'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                Upload First Document
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
