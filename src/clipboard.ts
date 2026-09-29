import { loadImageFile } from './file-input';
import { store } from './state';

export type PasteSuccessCallback = () => void;

let pasteSuccessCallback: PasteSuccessCallback | null = null;

export function onPasteSuccess(cb: PasteSuccessCallback): void {
  pasteSuccessCallback = cb;
}

/**
 * Initializes global clipboard paste listener
 */
export function setupClipboardListener(): () => void {
  const handlePaste = (e: ClipboardEvent) => {
    // Avoid intercepting paste when user is typing in a native input or textarea
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable)
    ) {
      return;
    }

    const clipboardData = e.clipboardData;
    if (!clipboardData) {
      store.notify('Clipboard data is unavailable. Try file drag & drop.', 'warning');
      return;
    }

    const items = clipboardData.items;
    if (!items || items.length === 0) {
      store.notify('No image was found in the clipboard. Copy an image and try again.', 'info');
      return;
    }

    let foundImage = false;
    let hasText = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          foundImage = true;
          e.preventDefault();
          const ext = item.type.split('/')[1] || 'png';
          const namedFile = new File([file], `pasted-${Date.now()}.${ext}`, { type: item.type });
          loadImageFile(namedFile, {
            onSuccess: () => {
              if (pasteSuccessCallback) {
                pasteSuccessCallback();
              }
            },
          });
          break;
        }
      } else if (item.type.indexOf('text/plain') !== -1) {
        hasText = true;
      }
    }

    if (!foundImage) {
      if (hasText) {
        store.notify('No image was found in the clipboard. Copy an image and try again.', 'warning');
      } else {
        store.notify('No image was found in the clipboard. Copy an image and try again.', 'info');
      }
    }
  };

  window.addEventListener('paste', handlePaste);

  return () => {
    window.removeEventListener('paste', handlePaste);
  };
}
