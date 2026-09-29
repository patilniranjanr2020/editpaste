import {
  computeInitialCrop,
  getOrientedDimensions,
  rotateCropClockwise,
  rotateCropCounterClockwise,
} from './crop-engine';
import type { AppState, AspectRatio, CropRect, ExportFormat, RotationAngle } from './types';

let nextNotificationId = 1;

const initialState: AppState = {
  hasImage: false,
  fileName: '',
  fileType: '',
  fileSize: 0,
  objectUrl: null,
  imageElement: null,
  naturalWidth: 0,
  naturalHeight: 0,
  rotation: 0,
  ratio: 'original',
  crop: { x: 0, y: 0, width: 0, height: 0 },
  zoom: 1.0,
  pan: { x: 0, y: 0 },
  exportFormat: 'image/png',
  exportQuality: 0.92,
  isDraggingCrop: false,
  activeHandle: null,
  notification: null,
};

class StateStore {
  private state: AppState = { ...initialState };
  private listeners: Set<(state: AppState) => void> = new Set();

  getState(): Readonly<AppState> {
    return this.state;
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  loadImage(file: File, img: HTMLImageElement, objectUrl: string): void {
    // Revoke previous object URL if any
    if (this.state.objectUrl && this.state.objectUrl !== objectUrl) {
      URL.revokeObjectURL(this.state.objectUrl);
    }

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    const rotation: RotationAngle = 0;
    const initialCrop = computeInitialCrop(naturalWidth, naturalHeight, 'original');

    // Default export format matching source when possible, or PNG
    let exportFormat: ExportFormat = 'image/png';
    if (file.type === 'image/jpeg') exportFormat = 'image/jpeg';
    else if (file.type === 'image/webp') exportFormat = 'image/webp';

    this.state = {
      ...this.state,
      hasImage: true,
      fileName: file.name || 'pasted-image.png',
      fileType: file.type || 'image/png',
      fileSize: file.size || 0,
      objectUrl,
      imageElement: img,
      naturalWidth,
      naturalHeight,
      rotation,
      ratio: 'original',
      crop: initialCrop,
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      exportFormat,
      isDraggingCrop: false,
      activeHandle: null,
    };

    this.notify(`Loaded "${this.state.fileName}" (${naturalWidth}×${naturalHeight}px)`, 'info');
    this.emit();
  }

  clearImage(): void {
    if (this.state.objectUrl) {
      URL.revokeObjectURL(this.state.objectUrl);
    }
    this.state = {
      ...initialState,
      notification: this.state.notification,
    };
    this.emit();
  }

  setRatio(newRatio: AspectRatio): void {
    if (!this.state.hasImage) return;
    const { width: oW, height: oH } = getOrientedDimensions(
      this.state.naturalWidth,
      this.state.naturalHeight,
      this.state.rotation
    );
    const newCrop = computeInitialCrop(oW, oH, newRatio);
    this.state = {
      ...this.state,
      ratio: newRatio,
      crop: newCrop,
    };
    this.emit();
  }

  setCrop(crop: CropRect): void {
    this.state = {
      ...this.state,
      crop,
    };
    this.emit();
  }

  resetCrop(): void {
    if (!this.state.hasImage) return;
    const { width: oW, height: oH } = getOrientedDimensions(
      this.state.naturalWidth,
      this.state.naturalHeight,
      this.state.rotation
    );
    const newCrop = computeInitialCrop(oW, oH, this.state.ratio);
    this.state = {
      ...this.state,
      crop: newCrop,
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    };
    this.notify('Crop area reset to centered fit', 'info');
    this.emit();
  }

  rotate(direction: 'cw' | 'ccw'): void {
    if (!this.state.hasImage) return;

    const oldDimensions = getOrientedDimensions(
      this.state.naturalWidth,
      this.state.naturalHeight,
      this.state.rotation
    );

    const rotationSteps: RotationAngle[] = [0, 90, 180, 270];
    const currentIndex = rotationSteps.indexOf(this.state.rotation);
    const delta = direction === 'cw' ? 1 : -1;
    const newIndex = (currentIndex + delta + 4) % 4;
    const newRotation = rotationSteps[newIndex];

    const newCrop =
      direction === 'cw'
        ? rotateCropClockwise(this.state.crop, oldDimensions.width, oldDimensions.height)
        : rotateCropCounterClockwise(this.state.crop, oldDimensions.width, oldDimensions.height);

    this.state = {
      ...this.state,
      rotation: newRotation,
      crop: newCrop,
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    };

    this.notify(`Rotated to ${newRotation}°`, 'info');
    this.emit();
  }

  setZoom(zoom: number): void {
    const clampedZoom = Math.max(0.25, Math.min(zoom, 5.0));
    this.state = {
      ...this.state,
      zoom: Number(clampedZoom.toFixed(2)),
    };
    this.emit();
  }

  zoomIn(): void {
    this.setZoom(this.state.zoom * 1.2);
  }

  zoomOut(): void {
    this.setZoom(this.state.zoom / 1.2);
  }

  setPan(x: number, y: number): void {
    this.state = {
      ...this.state,
      pan: { x, y },
    };
    this.emit();
  }

  setExportFormat(format: ExportFormat): void {
    this.state = {
      ...this.state,
      exportFormat: format,
    };
    this.emit();
  }

  setExportQuality(quality: number): void {
    this.state = {
      ...this.state,
      exportQuality: Math.max(0.1, Math.min(1.0, quality)),
    };
    this.emit();
  }

  notify(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const id = nextNotificationId++;
    this.state = {
      ...this.state,
      notification: { message, type, id },
    };
    this.emit();
  }

  clearNotification(id?: number): void {
    if (!id || (this.state.notification && this.state.notification.id === id)) {
      this.state = {
        ...this.state,
        notification: null,
      };
      this.emit();
    }
  }
}

export const store = new StateStore();
