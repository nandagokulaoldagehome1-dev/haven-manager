import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Wrench, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FixResult {
  residentId: string;
  name: string;
  status: 'fixed' | 'error' | 'skipped';
  message: string;
}

export function BulkPhotoFix() {
  const [open, setOpen] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<FixResult[]>([]);

  const fixPhotoPaths = async () => {
    setFixing(true);
    setProgress(0);
    setResults([]);

    try {
      // Fetch all residents with photo_url
      const { data: residents, error } = await supabase
        .from('residents')
        .select('id, full_name, photo_url')
        .not('photo_url', 'is', null);

      if (error) throw error;

      const fixResults: FixResult[] = [];
      const total = residents?.length || 0;

      for (let i = 0; i < total; i++) {
        const resident = residents[i];
        const photoUrl = resident.photo_url;

        // Check if URL contains duplicated path
        if (photoUrl && photoUrl.includes('resident_photos/resident_photos/')) {
          // Extract the correct filename
          const parts = photoUrl.split('resident_photos/');
          const fileName = parts[parts.length - 1];
          
          // Construct the correct URL
          const { data: { publicUrl } } = supabase.storage
            .from('resident_photos')
            .getPublicUrl(fileName);

          // Update the resident's photo_url
          const { error: updateError } = await supabase
            .from('residents')
            .update({ photo_url: publicUrl })
            .eq('id', resident.id);

          if (updateError) {
            fixResults.push({
              residentId: resident.id,
              name: resident.full_name,
              status: 'error',
              message: updateError.message,
            });
          } else {
            fixResults.push({
              residentId: resident.id,
              name: resident.full_name,
              status: 'fixed',
              message: 'Photo URL corrected',
            });
          }
        } else {
          fixResults.push({
            residentId: resident.id,
            name: resident.full_name,
            status: 'skipped',
            message: 'URL is correct',
          });
        }

        setProgress(Math.round(((i + 1) / total) * 100));
        setResults([...fixResults]);
      }

      const fixedCount = fixResults.filter(r => r.status === 'fixed').length;
      toast({
        title: 'Photo Fix Complete',
        description: `Fixed ${fixedCount} of ${total} resident photos`,
      });
    } catch (error) {
      console.error('Error fixing photos:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix photo paths',
        variant: 'destructive',
      });
    } finally {
      setFixing(false);
    }
  };

  const fixedCount = results.filter(r => r.status === 'fixed').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wrench className="w-4 h-4 mr-2" />
          Fix Photo Paths
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Photo Path Fix</DialogTitle>
          <DialogDescription>
            This tool fixes incorrectly stored photo URLs for residents with duplicated paths.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!fixing && results.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Click the button below to scan and fix all resident photo paths.
              </p>
              <Button onClick={fixPhotoPaths}>
                Start Fix Process
              </Button>
            </div>
          )}

          {fixing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing residents...</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">
                {progress}% complete
              </p>
            </div>
          )}

          {!fixing && results.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
                  <p className="text-lg font-semibold text-success">{fixedCount}</p>
                  <p className="text-xs text-muted-foreground">Fixed</p>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <CheckCircle className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-semibold">{skippedCount}</p>
                  <p className="text-xs text-muted-foreground">OK</p>
                </div>
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
                  <p className="text-lg font-semibold text-destructive">{errorCount}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>

              {fixedCount > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                  {results.filter(r => r.status === 'fixed').map((result) => (
                    <div key={result.residentId} className="flex items-center gap-2 text-success">
                      <CheckCircle className="w-3 h-3" />
                      <span>{result.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                onClick={() => {
                  setResults([]);
                  setProgress(0);
                }}
                variant="outline"
                className="w-full"
              >
                Run Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
