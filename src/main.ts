import { CanvasRenderer } from './canvas-renderer';
import { setupClipboardListener } from './clipboard';
import { setupFileInputs } from './file-input';
import { store } from './state';
import './styles.css';
import { UIManager } from './ui';

function initApp(): void {
  const canvas = document.getElementById('crop-canvas') as HTMLCanvasElement;
  const canvasContainer = document.getElementById('canvas-container') as HTMLElement;
  const dropZone = document.getElementById('drop-zone') as HTMLElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;

  if (!canvas || !canvasContainer || !dropZone || !fileInput) {
    console.error('Initialization failed: missing required DOM elements.');
    return;
  }

  // Initialize Canvas Renderer
  const renderer = new CanvasRenderer(canvas, canvasContainer);

  // Initialize UI Manager
  new UIManager(renderer);

  // Initialize Clipboard Listeners
  setupClipboardListener();

  // Initialize File Drag & Drop + Input
  setupFileInputs(dropZone, fileInput);

  // Listen to store updates to trigger re-renders
  store.subscribe(() => {
    renderer.requestRender();
  });

  // Enable drop on the entire editor canvas container as well so users can drop another image to replace
  setupFileInputs(canvasContainer, fileInput);

  // Clicking dropZone triggers file picker, UNLESS an interactive button or control was clicked
  dropZone.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, label, input, a, .btn, kbd')) {
      return;
    }
    fileInput.click();
  });

  // Keyboard accessibility for dropzone
  dropZone.addEventListener('keydown', (e) => {
    if (document.activeElement === dropZone && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      fileInput.click();
    }
  });

  // Privacy assurance log to console for auditing
  console.info(
    '%cEditPaste%c All image processing is strictly local (100% client-side via Canvas API). No telemetry, no external uploads.',
    'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
    'color: #94a3b8; margin-left: 6px;'
  );
}

// Ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
