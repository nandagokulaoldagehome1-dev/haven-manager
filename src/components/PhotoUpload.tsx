import { useState, useRef, useCallback } from 'react';
import { Upload, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Passport photo aspect ratio (35mm x 45mm = 7:9)
const PASSPORT_ASPECT_RATIO = 7 / 9;
const OUTPUT_WIDTH = 280;
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / PASSPORT_ASPECT_RATIO);

interface PhotoUploadProps {
  value: string | null;
  onChange: (file: File | null, preview: string | null) => void;
  className?: string;
  disabled?: boolean;
}

export function PhotoUpload({ value, onChange, className, disabled }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File): Promise<{ file: File; preview: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
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
            // Image is wider - crop sides
            sourceWidth = img.height * targetAspect;
            sourceX = (img.width - sourceWidth) / 2;
          } else {
            // Image is taller - crop top/bottom (favor top portion for face)
            sourceHeight = img.width / targetAspect;
            sourceY = Math.max(0, (img.height - sourceHeight) * 0.2); // Favor upper portion
          }

          // Draw with white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
          
          // Draw cropped and resized image
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
              const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve({
                file: processedFile,
                preview: canvas.toDataURL('image/jpeg', 0.9),
              });
            },
            'image/jpeg',
            0.9
          );
        };
        img.onerror = () => reject(new Error('Could not load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    
    setIsProcessing(true);
    try {
      const { file: processedFile, preview } = await processImage(file);
      onChange(processedFile, preview);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
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
    if (inputRef.current) inputRef.current.value = '';
  }, [onChange]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative w-28 h-36 rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          "flex items-center justify-center",
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
              <button
                onClick={handleRemove}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
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
                  Drop photo or click
                </span>
              </>
            )}
          </div>
        )}
        
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">Passport size</span>
    </div>
  );
}
