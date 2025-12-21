import { useState, useRef, useCallback } from 'react';
import { Upload, X, User, Camera, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PhotoEditor } from '@/components/PhotoEditor';

// Passport photo aspect ratio (35mm x 45mm = 7:9)
const PASSPORT_ASPECT_RATIO = 7 / 9;
const OUTPUT_WIDTH = 280;
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / PASSPORT_ASPECT_RATIO);
const COMPRESSION_QUALITY = 0.7; // 70% quality for good compression

interface PhotoUploadProps {
  value: string | null;
  onChange: (file: File | null, preview: string | null) => void;
  className?: string;
  disabled?: boolean;
}

export function PhotoUpload({ value, onChange, className, disabled }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (dataUrl: string): Promise<{ file: File; preview: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_WIDTH;
        canvas.height = OUTPUT_HEIGHT;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate crop dimensions to center the face area
        const imgAspect = img.width / img.height;
        const targetAspect = PASSPORT_ASPECT_RATIO;
        
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        if (imgAspect > targetAspect) {
          sourceWidth = img.height * targetAspect;
          sourceX = (img.width - sourceWidth) / 2;
        } else {
          sourceHeight = img.width / targetAspect;
          sourceY = Math.max(0, (img.height - sourceHeight) * 0.2);
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
        
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT
        );

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not create image blob'));
              return;
            }
            
            // Log compression info
            console.log(`Image compressed: ${(blob.size / 1024).toFixed(1)}KB`);
            
            const processedFile = new File([blob], `photo_${Date.now()}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve({
              file: processedFile,
              preview: canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY),
            });
          },
          'image/jpeg',
          COMPRESSION_QUALITY
        );
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = dataUrl;
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setRawImage(dataUrl);
        
        const { file: processedFile, preview } = await processImage(dataUrl);
        onChange(processedFile, preview);
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsProcessing(false);
    }
  }, [processImage, onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    setRawImage(null);
    if (inputRef.current) inputRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  }, [onChange]);

  const handleEditSave = useCallback(async (editedDataUrl: string) => {
    try {
      const { file: processedFile } = await processImage(editedDataUrl);
      onChange(processedFile, editedDataUrl);
    } catch (error) {
      console.error('Error saving edited image:', error);
    }
  }, [processImage, onChange]);

  const openEditor = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (rawImage || value) {
      setEditorOpen(true);
    }
  }, [rawImage, value]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Photo Preview Area */}
      <div
        onClick={() => !disabled && !value && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative w-28 h-36 rounded-lg border-2 border-dashed transition-all overflow-hidden",
          "flex items-center justify-center",
          !value && "cursor-pointer",
          isDragging && "border-primary bg-primary/5 scale-105",
          !isDragging && !value && "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50",
          value && "border-transparent",
          disabled && "opacity-50 cursor-not-allowed",
          isProcessing && "animate-pulse"
        )}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Photo preview"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <div className="absolute top-1 right-1 flex gap-1">
                <button
                  onClick={openEditor}
                  className="p-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={handleRemove}
                  className="p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 p-2 text-center">
            {isProcessing ? (
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Drop or click
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraRef.current?.click()}
          disabled={disabled}
          className="text-xs px-2 h-8"
        >
          <Camera className="w-3 h-3 mr-1" />
          Camera
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="text-xs px-2 h-8"
        >
          <Upload className="w-3 h-3 mr-1" />
          Gallery
        </Button>
      </div>

      <span className="text-[10px] text-muted-foreground">Passport size photo</span>

      {/* Hidden file inputs */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Photo Editor Dialog */}
      <PhotoEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        imageSrc={rawImage || value || ''}
        onSave={handleEditSave}
      />
    </div>
  );
}
