import {
  getOrientedDimensions,
  moveCrop,
  resizeCrop,
} from './crop-engine';
import { store } from './state';
import type { AppState, CropRect, HandleType } from './types';

const HANDLE_TOUCH_RADIUS = 20; // Hit-test radius in CSS pixels for easy touch & mouse target

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private resizeObserver: ResizeObserver;
  private rafId: number | null = null;

  // Active interaction tracking
  private activePointerId: number | null = null;
  private interactionMode: 'move' | 'resize' | 'pan' | null = null;
  private activeHandle: HandleType | null = null;
  private startPointerX = 0;
  private startPointerY = 0;
  private startCrop: CropRect = { x: 0, y: 0, width: 0, height: 0 };
  private startPan = { x: 0, y: 0 };

  // Computed layout cache
  private dpr = 1;
  private containerWidth = 0;
  private containerHeight = 0;
  private scale = 1;
  private imageOffsetX = 0;
  private imageOffsetY = 0;

  constructor(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas;
    this.container = container;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Could not get 2D rendering context');
    this.ctx = context;

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.setupPointerListeners();
    this.handleResize();
  }

  public destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
  }

  private handleResize(): void {
    const rect = this.container.getBoundingClientRect();
    this.containerWidth = Math.max(1, Math.floor(rect.width));
    this.containerHeight = Math.max(1, Math.floor(rect.height));
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(this.containerWidth * this.dpr);
    this.canvas.height = Math.floor(this.containerHeight * this.dpr);
    this.canvas.style.width = `${this.containerWidth}px`;
    this.canvas.style.height = `${this.containerHeight}px`;

    this.requestRender();
  }

  public requestRender(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  private computeTransform(state: AppState): void {
    const { width: oW, height: oH } = getOrientedDimensions(
      state.naturalWidth,
      state.naturalHeight,
      state.rotation
    );

    const pad = 48; // padding around workspace
    const availW = Math.max(100, this.containerWidth - pad);
    const availH = Math.max(100, this.containerHeight - pad);

    const fitScale = Math.min(availW / oW, availH / oH);
    this.scale = fitScale * state.zoom;

    const displayW = oW * this.scale;
    const displayH = oH * this.scale;

    this.imageOffsetX = (this.containerWidth - displayW) / 2 + state.pan.x;
    this.imageOffsetY = (this.containerHeight - displayH) / 2 + state.pan.y;
  }

  private render(): void {
    const state = store.getState();
    const ctx = this.ctx;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!state.hasImage || !state.imageElement) {
      ctx.restore();
      return;
    }

    ctx.scale(this.dpr, this.dpr);
    this.computeTransform(state);

    const { width: oW, height: oH } = getOrientedDimensions(
      state.naturalWidth,
      state.naturalHeight,
      state.rotation
    );
    const displayW = oW * this.scale;
    const displayH = oH * this.scale;

    // 1. Draw transparent checkerboard backing under image area
    this.drawCheckerboard(this.imageOffsetX, this.imageOffsetY, displayW, displayH);

    // 2. Draw rotated source image
    ctx.save();
    const centerX = this.imageOffsetX + displayW / 2;
    const centerY = this.imageOffsetY + displayH / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((state.rotation * Math.PI) / 180);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw unrotated image centered at rotated context
    const natW = state.naturalWidth * this.scale;
    const natH = state.naturalHeight * this.scale;
    ctx.drawImage(state.imageElement, -natW / 2, -natH / 2, natW, natH);
    ctx.restore();

    // 3. Draw crop overlay, grid and handles
    this.drawCropOverlay(state);

    ctx.restore();
  }

  private drawCheckerboard(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.save();

    // Soft drop shadow to elevate the image from the light background
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    // Light transparency checkerboard pattern inside image boundary
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);

    const size = 16;
    ctx.fillStyle = '#f1f5f9';
    for (let px = x; px < x + w; px += size) {
      for (let py = y; py < y + h; py += size) {
        if ((Math.floor((px - x) / size) + Math.floor((py - y) / size)) % 2 === 0) {
          ctx.fillRect(px, py, size, size);
        }
      }
    }

    // Crisp 1px border around image
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  private drawCropOverlay(state: AppState): void {
    const ctx = this.ctx;
    const crop = state.crop;

    const cX = this.imageOffsetX + crop.x * this.scale;
    const cY = this.imageOffsetY + crop.y * this.scale;
    const cW = crop.width * this.scale;
    const cH = crop.height * this.scale;

    const imgX = this.imageOffsetX;
    const imgY = this.imageOffsetY;
    const { width: oW, height: oH } = getOrientedDimensions(
      state.naturalWidth,
      state.naturalHeight,
      state.rotation
    );
    const imgW = oW * this.scale;
    const imgH = oH * this.scale;

    // 1. Dim background outside crop rectangle
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.44)';

    // Top
    if (cY > imgY) {
      ctx.fillRect(imgX, imgY, imgW, cY - imgY);
    }
    // Bottom
    if (cY + cH < imgY + imgH) {
      ctx.fillRect(imgX, cY + cH, imgW, imgY + imgH - (cY + cH));
    }
    // Left
    if (cX > imgX) {
      ctx.fillRect(imgX, cY, cX - imgX, cH);
    }
    // Right
    if (cX + cW < imgX + imgW) {
      ctx.fillRect(cX + cW, cY, imgX + imgW - (cX + cW), cH);
    }
    ctx.restore();

    // 2. Glass effect inside the ratio frame (selected result area)
    ctx.save();
    const glassGradient = ctx.createLinearGradient(cX, cY, cX + cW, cY + cH);
    glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    glassGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.03)');
    glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.fillStyle = glassGradient;
    ctx.fillRect(cX, cY, cW, cH);

    // Subtle glass specular highlight along top and left inner edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cX + cW - 1, cY + 1);
    ctx.lineTo(cX + 1, cY + 1);
    ctx.lineTo(cX + 1, cY + cH - 1);
    ctx.stroke();

    // Rule of thirds grid inside crop rect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    // Vertical thirds
    ctx.moveTo(cX + cW / 3, cY);
    ctx.lineTo(cX + cW / 3, cY + cH);
    ctx.moveTo(cX + (cW * 2) / 3, cY);
    ctx.lineTo(cX + (cW * 2) / 3, cY + cH);
    // Horizontal thirds
    ctx.moveTo(cX, cY + cH / 3);
    ctx.lineTo(cX + cW, cY + cH / 3);
    ctx.moveTo(cX, cY + (cH * 2) / 3);
    ctx.lineTo(cX + cW, cY + (cH * 2) / 3);
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash

    // Outer subtle contour for high contrast over any image
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cX - 1, cY - 1, cW + 2, cH + 2);

    // Inner crisp glass frame border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cX, cY, cW, cH);

    // Draw handles
    this.drawHandles(cX, cY, cW, cH);

    ctx.restore();
  }

  private drawHandles(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const cornerSize = 18;
    const barW = 28;
    const barH = 6;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;

    const corners: [number, number, number, number, number, number][] = [
      // [startX, startY, horizX, horizY, vertX, vertY]
      // NW
      [x, y + cornerSize, x, y, x + cornerSize, y],
      // NE
      [x + w - cornerSize, y, x + w, y, x + w, y + cornerSize],
      // SE
      [x + w, y + h - cornerSize, x + w, y + h, x + w - cornerSize, y + h],
      // SW
      [x + cornerSize, y + h, x, y + h, x, y + h - cornerSize],
    ];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    for (const [x1, y1, x2, y2, x3, y3] of corners) {
      // Outer dark contrast stroke
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.85)';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.stroke();

      // Inner crisp white stroke
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.stroke();
    }

    // Edge pills (N, S, E, W)
    // North
    this.drawPill(x + w / 2 - barW / 2, y - barH / 2, barW, barH);
    // South
    this.drawPill(x + w / 2 - barW / 2, y + h - barH / 2, barW, barH);
    // West
    this.drawPill(x - barH / 2, y + h / 2 - barW / 2, barH, barW);
    // East
    this.drawPill(x + w - barH / 2, y + h / 2 - barW / 2, barH, barW);
  }

  private drawPill(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const radius = Math.min(w, h) / 2;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private getHandleAt(cssX: number, cssY: number): HandleType | null {
    const state = store.getState();
    if (!state.hasImage) return null;

    const crop = state.crop;
    const cX = this.imageOffsetX + crop.x * this.scale;
    const cY = this.imageOffsetY + crop.y * this.scale;
    const cW = crop.width * this.scale;
    const cH = crop.height * this.scale;

    const r = HANDLE_TOUCH_RADIUS;

    const hit = (x: number, y: number) => {
      const dx = cssX - x;
      const dy = cssY - y;
      return dx * dx + dy * dy <= r * r;
    };

    // Corners have highest priority
    if (hit(cX, cY)) return 'nw';
    if (hit(cX + cW, cY)) return 'ne';
    if (hit(cX + cW, cY + cH)) return 'se';
    if (hit(cX, cY + cH)) return 'sw';

    // Edges
    if (hit(cX + cW / 2, cY)) return 'n';
    if (hit(cX + cW / 2, cY + cH)) return 's';
    if (hit(cX, cY + cH / 2)) return 'w';
    if (hit(cX + cW, cY + cH / 2)) return 'e';

    return null;
  }

  private isInsideCrop(cssX: number, cssY: number): boolean {
    const state = store.getState();
    if (!state.hasImage) return false;

    const crop = state.crop;
    const cX = this.imageOffsetX + crop.x * this.scale;
    const cY = this.imageOffsetY + crop.y * this.scale;
    const cW = crop.width * this.scale;
    const cH = crop.height * this.scale;

    return cssX >= cX && cssX <= cX + cW && cssY >= cY && cssY <= cY + cH;
  }

  private updateCursor(cssX: number, cssY: number): void {
    if (this.interactionMode !== null) return;

    const handle = this.getHandleAt(cssX, cssY);
    if (handle) {
      const cursorMap: Record<HandleType, string> = {
        nw: 'nwse-resize',
        se: 'nwse-resize',
        ne: 'nesw-resize',
        sw: 'nesw-resize',
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize',
      };
      this.canvas.style.cursor = cursorMap[handle];
      return;
    }

    if (this.isInsideCrop(cssX, cssY)) {
      this.canvas.style.cursor = 'move';
      return;
    }

    const state = store.getState();
    if (state.zoom > 1.0) {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  private setupPointerListeners(): void {
    const canvas = this.canvas;

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.activePointerId !== null) return;
      const rect = canvas.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;

      const state = store.getState();
      if (!state.hasImage) return;

      const handle = this.getHandleAt(cssX, cssY);
      if (handle) {
        this.activePointerId = e.pointerId;
        canvas.setPointerCapture(e.pointerId);
        this.interactionMode = 'resize';
        this.activeHandle = handle;
        this.startPointerX = cssX;
        this.startPointerY = cssY;
        this.startCrop = { ...state.crop };
        return;
      }

      if (this.isInsideCrop(cssX, cssY)) {
        this.activePointerId = e.pointerId;
        canvas.setPointerCapture(e.pointerId);
        this.interactionMode = 'move';
        this.startPointerX = cssX;
        this.startPointerY = cssY;
        this.startCrop = { ...state.crop };
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      // If clicked outside crop when zoomed in: pan
      if (state.zoom > 1.0) {
        this.activePointerId = e.pointerId;
        canvas.setPointerCapture(e.pointerId);
        this.interactionMode = 'pan';
        this.startPointerX = cssX;
        this.startPointerY = cssY;
        this.startPan = { ...state.pan };
        this.canvas.style.cursor = 'grabbing';
      }
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;

      if (this.activePointerId !== e.pointerId) {
        this.updateCursor(cssX, cssY);
        return;
      }

      const state = store.getState();
      const { width: oW, height: oH } = getOrientedDimensions(
        state.naturalWidth,
        state.naturalHeight,
        state.rotation
      );

      const dxCss = cssX - this.startPointerX;
      const dyCss = cssY - this.startPointerY;
      const dxImg = dxCss / this.scale;
      const dyImg = dyCss / this.scale;

      if (this.interactionMode === 'move') {
        const moved = moveCrop(this.startCrop, dxImg, dyImg, oW, oH);
        store.setCrop(moved);
        this.requestRender();
      } else if (this.interactionMode === 'resize' && this.activeHandle) {
        const resized = resizeCrop(
          this.startCrop,
          this.activeHandle,
          dxImg,
          dyImg,
          state.ratio,
          oW,
          oH
        );
        store.setCrop(resized);
        this.requestRender();
      } else if (this.interactionMode === 'pan') {
        store.setPan(this.startPan.x + dxCss, this.startPan.y + dyCss);
        this.requestRender();
      }
    });

    const endInteraction = (e: PointerEvent) => {
      if (this.activePointerId === e.pointerId) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore pointer capture release error if already released
        }
        this.activePointerId = null;
        this.interactionMode = null;
        this.activeHandle = null;

        const rect = canvas.getBoundingClientRect();
        this.updateCursor(e.clientX - rect.left, e.clientY - rect.top);
      }
    };

    canvas.addEventListener('pointerup', endInteraction);
    canvas.addEventListener('pointercancel', endInteraction);

    // Mouse wheel to zoom
    canvas.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        const state = store.getState();
        if (!state.hasImage) return;

        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        store.setZoom(state.zoom * factor);
        this.requestRender();
      },
      { passive: false }
    );
  }

  /**
   * Keyboard accessibility nudge for crop
   */
  public nudgeCrop(dx: number, dy: number): void {
    const state = store.getState();
    if (!state.hasImage) return;

    const { width: oW, height: oH } = getOrientedDimensions(
      state.naturalWidth,
      state.naturalHeight,
      state.rotation
    );

    const moved = moveCrop(state.crop, dx, dy, oW, oH);
    store.setCrop(moved);
    this.requestRender();
  }
}
