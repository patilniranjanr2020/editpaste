import type { CanvasRenderer } from './canvas-renderer';
import { onPasteSuccess } from './clipboard';
import { getOrientedDimensions } from './crop-engine';
import { downloadCroppedImage } from './export-image';
import { store } from './state';
import type { AppState, AspectRatio, ExportFormat } from './types';

export class UIManager {
  private canvasRenderer: CanvasRenderer;

  // DOM Elements
  private emptyState = document.getElementById('empty-state') as HTMLElement;
  private editorWorkspace = document.getElementById('editor-workspace') as HTMLElement;
  private canvasContainer = document.getElementById('canvas-container') as HTMLElement;
  private fileInput = document.getElementById('file-input') as HTMLInputElement;

  // Clipboard Prompt Elements
  private clipboardOverlay = document.getElementById('clipboard-overlay') as HTMLElement;
  private btnHeaderPaste = document.getElementById('btn-header-paste') as HTMLButtonElement | null;
  private btnEmptyPaste = document.getElementById('btn-empty-paste') as HTMLButtonElement;
  private btnCancelClipboard = document.getElementById('btn-cancel-clipboard') as HTMLButtonElement;
  private btnCloseClipboard = document.getElementById('btn-close-clipboard') as HTMLButtonElement;

  // Toolbar Elements
  private ratioSelect = document.getElementById('ratio-select') as HTMLSelectElement;
  private btnReplace = document.getElementById('btn-replace') as HTMLButtonElement;
  private btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
  private btnRotateCCW = document.getElementById('btn-rotate-ccw') as HTMLButtonElement;
  private btnRotateCW = document.getElementById('btn-rotate-cw') as HTMLButtonElement;
  private btnZoomOut = document.getElementById('btn-zoom-out') as HTMLButtonElement;
  private btnZoomIn = document.getElementById('btn-zoom-in') as HTMLButtonElement;
  private zoomLevel = document.getElementById('zoom-level') as HTMLElement;
  private exportFormat = document.getElementById('export-format') as HTMLSelectElement;
  private qualityWrapper = document.getElementById('quality-wrapper') as HTMLElement;
  private exportQuality = document.getElementById('export-quality') as HTMLInputElement;
  private qualityLabel = document.getElementById('quality-label') as HTMLElement;
  private btnDownload = document.getElementById('btn-download') as HTMLButtonElement;

  // Status Bar Elements
  private statSourceSize = document.getElementById('stat-source-size') as HTMLElement;
  private statCropSize = document.getElementById('stat-crop-size') as HTMLElement;
  private statRatioVal = document.getElementById('stat-ratio-val') as HTMLElement;
  private statRotationVal = document.getElementById('stat-rotation-val') as HTMLElement;

  // Feedback Elements
  private toastBanner = document.getElementById('toast-banner') as HTMLElement;
  private srAnnouncer = document.getElementById('sr-announcer') as HTMLElement;
  private toastTimer: number | null = null;

  // About Modal
  private aboutModal = document.getElementById('about-modal') as HTMLDialogElement;
  private btnThemeInfo = document.getElementById('btn-theme-info') as HTMLButtonElement;
  private btnCloseModal = document.getElementById('btn-close-modal') as HTMLButtonElement;
  private btnModalOk = document.getElementById('btn-modal-ok') as HTMLButtonElement;

  constructor(canvasRenderer: CanvasRenderer) {
    this.canvasRenderer = canvasRenderer;
    this.initEventListeners();
    this.initClipboardOverlay();
    this.bindState();
  }

  private initClipboardOverlay(): void {
    const openClipboardMode = () => {
      this.clipboardOverlay.style.display = 'flex';
    };

    const closeClipboardMode = () => {
      this.clipboardOverlay.style.display = 'none';
    };

    this.btnHeaderPaste?.addEventListener('click', (e) => {
      e.stopPropagation();
      openClipboardMode();
    });
    this.btnEmptyPaste?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openClipboardMode();
    });
    this.btnCancelClipboard?.addEventListener('click', closeClipboardMode);
    this.btnCloseClipboard?.addEventListener('click', closeClipboardMode);

    // Outside click on backdrop cancels clipboard mode
    this.clipboardOverlay?.addEventListener('click', (e) => {
      if (e.target === this.clipboardOverlay) {
        closeClipboardMode();
      }
    });

    // Auto-close on successful paste and focus workspace
    onPasteSuccess(() => {
      closeClipboardMode();
      this.canvasContainer?.focus();
    });
  }

  private initEventListeners(): void {
    // Aspect Ratio Change
    this.ratioSelect.addEventListener('change', () => {
      const selected = this.ratioSelect.value as AspectRatio;
      store.setRatio(selected);
      this.canvasRenderer.requestRender();
    });

    // Replace Image
    this.btnReplace.addEventListener('click', () => {
      this.fileInput.click();
    });

    // Reset Crop
    this.btnReset.addEventListener('click', () => {
      store.resetCrop();
      this.canvasRenderer.requestRender();
    });

    // Rotation
    this.btnRotateCCW.addEventListener('click', () => {
      store.rotate('ccw');
      this.canvasRenderer.requestRender();
    });

    this.btnRotateCW.addEventListener('click', () => {
      store.rotate('cw');
      this.canvasRenderer.requestRender();
    });

    // Zoom
    this.btnZoomOut.addEventListener('click', () => {
      store.zoomOut();
      this.canvasRenderer.requestRender();
    });

    this.btnZoomIn.addEventListener('click', () => {
      store.zoomIn();
      this.canvasRenderer.requestRender();
    });

    // Export Format & Quality
    this.exportFormat.addEventListener('change', () => {
      const format = this.exportFormat.value as ExportFormat;
      store.setExportFormat(format);
      this.updateQualityVisibility(format);
    });

    this.exportQuality.addEventListener('input', () => {
      const val = parseInt(this.exportQuality.value, 10);
      this.qualityLabel.textContent = `Quality: ${val}%`;
      store.setExportQuality(val / 100);
    });

    // Download button
    this.btnDownload.addEventListener('click', () => {
      downloadCroppedImage();
    });

    // About Modal
    this.btnThemeInfo?.addEventListener('click', () => {
      this.aboutModal?.showModal();
    });
    this.btnCloseModal?.addEventListener('click', () => {
      this.aboutModal?.close();
    });
    this.btnModalOk?.addEventListener('click', () => {
      this.aboutModal?.close();
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // If clipboard overlay is active, Escape closes it
      if (this.clipboardOverlay.style.display === 'flex') {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.clipboardOverlay.style.display = 'none';
          return;
        }
      }

      // Ignore other shortcuts if inside input, select, or textarea
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const state = store.getState();
      if (!state.hasImage) return;

      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.canvasRenderer.nudgeCrop(-step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.canvasRenderer.nudgeCrop(step, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.canvasRenderer.nudgeCrop(0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.canvasRenderer.nudgeCrop(0, step);
          break;
        case '+':
        case '=':
          e.preventDefault();
          store.zoomIn();
          this.canvasRenderer.requestRender();
          break;
        case '-':
        case '_':
          e.preventDefault();
          store.zoomOut();
          this.canvasRenderer.requestRender();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          if (e.shiftKey) {
            store.rotate('ccw');
          } else {
            store.rotate('cw');
          }
          this.canvasRenderer.requestRender();
          break;
        case '[':
          e.preventDefault();
          store.rotate('ccw');
          this.canvasRenderer.requestRender();
          break;
        case ']':
          e.preventDefault();
          store.rotate('cw');
          this.canvasRenderer.requestRender();
          break;
        case 'Escape':
          e.preventDefault();
          store.resetCrop();
          this.canvasRenderer.requestRender();
          break;
        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            downloadCroppedImage();
          }
          break;
        case 'Enter':
          if (
            document.activeElement === this.canvasContainer ||
            document.activeElement === document.body
          ) {
            e.preventDefault();
            downloadCroppedImage();
          }
          break;
      }
    });
  }

  private updateQualityVisibility(format: ExportFormat): void {
    if (format === 'image/jpeg' || format === 'image/webp') {
      this.qualityWrapper.style.display = 'flex';
    } else {
      this.qualityWrapper.style.display = 'none';
    }
  }

  private bindState(): void {
    store.subscribe((state) => {
      this.renderUIState(state);
    });
  }

  private renderUIState(state: AppState): void {
    if (state.hasImage) {
      this.emptyState.style.display = 'none';
      this.editorWorkspace.style.display = 'flex';

      // Ratio dropdown sync
      if (this.ratioSelect.value !== state.ratio) {
        this.ratioSelect.value = state.ratio;
      }

      // Zoom readout
      this.zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;

      // Status Bar Readouts
      const { width: oW, height: oH } = getOrientedDimensions(
        state.naturalWidth,
        state.naturalHeight,
        state.rotation
      );
      this.statSourceSize.textContent = `${oW} × ${oH} px`;
      this.statCropSize.textContent = `${Math.round(state.crop.width)} × ${Math.round(state.crop.height)} px`;
      this.statRatioVal.textContent = state.ratio.toUpperCase();
      this.statRotationVal.textContent = `${state.rotation}°`;
    } else {
      this.emptyState.style.display = 'flex';
      this.editorWorkspace.style.display = 'none';
    }

    // Handle Toast and Live Region Notifications
    if (state.notification) {
      this.showToast(state.notification.message, state.notification.type);
      this.announceToScreenReader(state.notification.message);
    }
  }

  private showToast(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    this.toastBanner.textContent = message;
    this.toastBanner.className = `toast-banner show type-${type}`;

    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = window.setTimeout(() => {
      this.toastBanner.classList.remove('show');
      this.toastTimer = null;
    }, 3800);
  }

  private announceToScreenReader(message: string): void {
    if (this.srAnnouncer) {
      this.srAnnouncer.textContent = message;
    }
  }
}
