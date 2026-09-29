import { store } from './state';

export interface ImageLoaderOptions {
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Loads an image File into the application state safely using URL.createObjectURL
 */
export async function loadImageFile(file: File, options?: ImageLoaderOptions): Promise<void> {
  if (!file.type.startsWith('image/')) {
    const errorMsg = `Unsupported file type "${file.type || 'unknown'}". Please select an image file (PNG, JPEG, WebP, GIF, SVG).`;
    store.notify(errorMsg, 'error');
    options?.onError?.(new Error(errorMsg));
    return;
  }

  // Large file warning (> 40MB)
  if (file.size > 40 * 1024 * 1024) {
    store.notify('Loading a large image. Processing might take a moment...', 'warning');
  }

  const objectUrl = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      URL.revokeObjectURL(objectUrl);
      const errorMsg = 'Failed to decode image dimensions. File might be corrupted.';
      store.notify(errorMsg, 'error');
      options?.onError?.(new Error(errorMsg));
      return;
    }

    store.loadImage(file, img, objectUrl);
    options?.onSuccess?.();
  };

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    const errorMsg = 'Failed to load image. The format may not be supported by your browser.';
    store.notify(errorMsg, 'error');
    options?.onError?.(new Error(errorMsg));
  };

  img.src = objectUrl;
}

/**
 * Sets up drag-and-drop and file input handlers
 */
export function setupFileInputs(dropZone: HTMLElement, fileInput: HTMLInputElement): () => void {
  // Prevent browser default file open behavior across the entire window
  const preventWindowDrag = (e: DragEvent) => {
    e.preventDefault();
  };

  window.addEventListener('dragover', preventWindowDrag);
  window.addEventListener('drop', preventWindowDrag);

  // Drop zone drag events
  let dragCounter = 0;

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCounter++;
    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
      dropZone.classList.add('drag-active');
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropZone.classList.remove('drag-active');
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCounter = 0;
    dropZone.classList.remove('drag-active');

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      // Check if text or link was dropped
      const text = e.dataTransfer?.getData('text/plain');
      if (text) {
        store.notify('Dropped content is text/URL, not an image file.', 'warning');
      }
      return;
    }

    const file = files[0];
    loadImageFile(file);
  };

  const onFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      loadImageFile(input.files[0]);
      // Reset input value so selecting the same file again works
      input.value = '';
    }
  };

  dropZone.addEventListener('dragenter', onDragEnter);
  dropZone.addEventListener('dragover', onDragOver);
  dropZone.addEventListener('dragleave', onDragLeave);
  dropZone.addEventListener('drop', onDrop);
  fileInput.addEventListener('change', onFileChange);

  return () => {
    window.removeEventListener('dragover', preventWindowDrag);
    window.removeEventListener('drop', preventWindowDrag);
    dropZone.removeEventListener('dragenter', onDragEnter);
    dropZone.removeEventListener('dragover', onDragOver);
    dropZone.removeEventListener('dragleave', onDragLeave);
    dropZone.removeEventListener('drop', onDrop);
    fileInput.removeEventListener('change', onFileChange);
  };
}
