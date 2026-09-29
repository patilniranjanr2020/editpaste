import { store } from './state';
import type { AppState, ExportFormat } from './types';

export interface ExportResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  format: ExportFormat;
  filename: string;
}

/**
 * Generates an appropriate filename based on format and original name
 */
export function generateFilename(format: ExportFormat, originalName?: string): string {
  const extensionMap: Record<ExportFormat, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };

  const ext = extensionMap[format] || 'png';
  if (originalName) {
    const base = originalName.replace(/\.[^/.]+$/, '');
    return `${base}-cropped.${ext}`;
  }
  return `editpaste-crop.${ext}`;
}

/**
 * Performs high quality crop export using native 2D canvas
 */
export async function exportCroppedImage(state: AppState): Promise<ExportResult> {
  if (!state.hasImage || !state.imageElement) {
    throw new Error('No image loaded to export.');
  }

  const crop = state.crop;
  const outWidth = Math.max(1, Math.round(crop.width));
  const outHeight = Math.max(1, Math.round(crop.height));

  // Create an off-DOM export canvas sized exactly to the crop rectangle
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = outWidth;
  exportCanvas.height = outHeight;

  const ctx = exportCanvas.getContext('2d', {
    alpha: state.exportFormat !== 'image/jpeg',
    willReadFrequently: false,
  });

  if (!ctx) {
    throw new Error('Failed to initialize canvas export context.');
  }

  // If JPEG, paint a solid background (white) because JPEG does not support transparency
  if (state.exportFormat === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outWidth, outHeight);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Translate and rotate so the natural image lands appropriately in the oriented crop frame
  ctx.save();
  // We want the point (crop.x, crop.y) in the oriented image to map to (0, 0) in the export canvas
  ctx.translate(-crop.x, -crop.y);

  // Now transform according to rotation
  // Oriented image coordinates:
  // Rotation 0: (0, 0) is top-left of natural image
  // Rotation 90: (0, 0) corresponds to natural (0, naturalHeight)
  // Rotation 180: (0, 0) corresponds to natural (naturalWidth, naturalHeight)
  // Rotation 270: (0, 0) corresponds to natural (naturalWidth, 0)

  if (state.rotation === 90) {
    ctx.translate(state.naturalHeight, 0);
    ctx.rotate((90 * Math.PI) / 180);
  } else if (state.rotation === 180) {
    ctx.translate(state.naturalWidth, state.naturalHeight);
    ctx.rotate((180 * Math.PI) / 180);
  } else if (state.rotation === 270) {
    ctx.translate(0, state.naturalWidth);
    ctx.rotate((270 * Math.PI) / 180);
  }

  ctx.drawImage(state.imageElement, 0, 0, state.naturalWidth, state.naturalHeight);
  ctx.restore();

  // Convert to Blob with quality setting
  const quality = state.exportFormat === 'image/png' ? undefined : state.exportQuality;

  const blob = await new Promise<Blob>((resolve, reject) => {
    exportCanvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Export failed: Canvas could not generate image blob.'));
      },
      state.exportFormat,
      quality
    );
  });

  const url = URL.createObjectURL(blob);
  const filename = generateFilename(state.exportFormat, state.fileName);

  return {
    blob,
    url,
    width: outWidth,
    height: outHeight,
    format: state.exportFormat,
    filename,
  };
}

/**
 * Triggers native browser download for the cropped image
 */
export async function downloadCroppedImage(): Promise<void> {
  const state = store.getState();
  if (!state.hasImage) return;

  try {
    store.notify('Exporting cropped image...', 'info');
    const result = await exportCroppedImage(state);

    const anchor = document.createElement('a');
    anchor.href = result.url;
    anchor.download = result.filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(result.url);
    }, 1500);

    store.notify(
      `Exported ${result.filename} (${result.width}×${result.height}px, ${(result.blob.size / 1024).toFixed(1)} KB)`,
      'success'
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown export error';
    store.notify(`Failed to export image: ${message}`, 'error');
  }
}
