import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  RotateCw, 
  RotateCcw, 
  Sun, 
  Contrast, 
  Check, 
  X,
  FlipHorizontal,
  FlipVertical
} from 'lucide-react';

interface PhotoEditorProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (editedImage: string) => void;
}

export function PhotoEditor({ open, onClose, imageSrc, onSave }: PhotoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

  // Passport photo dimensions
  const CANVAS_WIDTH = 280;
  const CANVAS_HEIGHT = 360;

  useEffect(() => {
    if (open && imageSrc) {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        setFlipH(false);
        setFlipV(false);
      };
      img.src = imageSrc;
    }
  }, [open, imageSrc]);

  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Save context
    ctx.save();

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Move to center
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply flip
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Calculate dimensions to fit and center
    const imgAspect = originalImage.width / originalImage.height;
    const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    
    let drawWidth, drawHeight;
    if (imgAspect > canvasAspect) {
      drawHeight = CANVAS_HEIGHT;
      drawWidth = drawHeight * imgAspect;
    } else {
      drawWidth = CANVAS_WIDTH;
      drawHeight = drawWidth / imgAspect;
    }

    // Draw image centered
    ctx.drawImage(
      originalImage,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    // Restore context
    ctx.restore();
  }, [originalImage, rotation, brightness, contrast, flipH, flipV]);

  const handleRotateLeft = () => setRotation((r) => r - 90);
  const handleRotateRight = () => setRotation((r) => r + 90);
  const handleFlipH = () => setFlipH((f) => !f);
  const handleFlipV = () => setFlipV((f) => !f);

  const handleSave = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
    onSave(dataUrl);
    onClose();
  };

  const handleReset = () => {
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setFlipH(false);
    setFlipV(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas Preview */}
          <div className="flex justify-center">
            <div className="border rounded-lg overflow-hidden bg-muted">
              <canvas
                ref={canvasRef}
                className="max-w-full"
                style={{ width: 200, height: 257 }}
              />
            </div>
          </div>

          {/* Rotation & Flip Controls */}
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRotateLeft} aria-label="Rotate left">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleRotateRight} aria-label="Rotate right">
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleFlipH} aria-label="Flip horizontally">
              <FlipHorizontal className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleFlipV} aria-label="Flip vertically">
              <FlipVertical className="w-4 h-4" />
            </Button>
          </div>

          {/* Brightness Control */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Sun className="w-4 h-4" />
              <span>Brightness</span>
              <span className="ml-auto text-muted-foreground">{brightness}%</span>
            </div>
            <Slider
              value={[brightness]}
              onValueChange={([v]) => setBrightness(v)}
              min={50}
              max={150}
              step={5}
            />
          </div>

          {/* Contrast Control */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Contrast className="w-4 h-4" />
              <span>Contrast</span>
              <span className="ml-auto text-muted-foreground">{contrast}%</span>
            </div>
            <Slider
              value={[contrast]}
              onValueChange={([v]) => setContrast(v)}
              min={50}
              max={150}
              step={5}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="w-4 h-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
