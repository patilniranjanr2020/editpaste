export type AspectRatio =
  | 'original'
  | '1:1'
  | '4:3'
  | '3:2'
  | '16:9'
  | '16:10'
  | '9:16'
  | '3:4'
  | '2:3'
  | 'freestyle';

export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export type RotationAngle = 0 | 90 | 180 | 270;

export type HandleType =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

export interface CropRect {
  x: number; // in oriented image coordinates
  y: number; // in oriented image coordinates
  width: number;
  height: number;
}

export interface AppState {
  hasImage: boolean;
  fileName: string;
  fileType: string;
  fileSize: number;
  objectUrl: string | null;
  imageElement: HTMLImageElement | null;
  naturalWidth: number;
  naturalHeight: number;
  rotation: RotationAngle;
  ratio: AspectRatio;
  crop: CropRect;
  zoom: number; // 1.0 = 100% of fit scale
  pan: { x: number; y: number };
  exportFormat: ExportFormat;
  exportQuality: number; // 0.1 to 1.0
  isDraggingCrop: boolean;
  activeHandle: HandleType | null;
  notification: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    id: number;
  } | null;
}

export interface Dimensions {
  width: number;
  height: number;
}
