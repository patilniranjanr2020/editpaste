import { describe, expect, it } from 'vitest';
import {
  clampCrop,
  computeInitialCrop,
  getOrientedDimensions,
  getRatioValue,
  moveCrop,
  resizeCrop,
  rotateCropClockwise,
  rotateCropCounterClockwise,
} from '../src/crop-engine';
import type { AspectRatio, CropRect } from '../src/types';

describe('crop-engine', () => {
  describe('getOrientedDimensions', () => {
    it('returns natural dimensions for 0 and 180 degrees', () => {
      expect(getOrientedDimensions(1920, 1080, 0)).toEqual({ width: 1920, height: 1080 });
      expect(getOrientedDimensions(1920, 1080, 180)).toEqual({ width: 1920, height: 1080 });
    });

    it('swaps width and height for 90 and 270 degrees', () => {
      expect(getOrientedDimensions(1920, 1080, 90)).toEqual({ width: 1080, height: 1920 });
      expect(getOrientedDimensions(1920, 1080, 270)).toEqual({ width: 1080, height: 1920 });
    });
  });

  describe('getRatioValue', () => {
    it('returns correct numeric values for standard ratios', () => {
      expect(getRatioValue('1:1', 1000, 1000)).toBe(1);
      expect(getRatioValue('4:3', 1000, 1000)).toBeCloseTo(4 / 3);
      expect(getRatioValue('3:2', 1000, 1000)).toBeCloseTo(3 / 2);
      expect(getRatioValue('16:9', 1000, 1000)).toBeCloseTo(16 / 9);
      expect(getRatioValue('16:10', 1000, 1000)).toBeCloseTo(16 / 10);
      expect(getRatioValue('9:16', 1000, 1000)).toBeCloseTo(9 / 16);
      expect(getRatioValue('3:4', 1000, 1000)).toBeCloseTo(3 / 4);
      expect(getRatioValue('2:3', 1000, 1000)).toBeCloseTo(2 / 3);
    });

    it('calculates ratio for original and null for freestyle', () => {
      expect(getRatioValue('original', 800, 400)).toBe(2);
      expect(getRatioValue('freestyle', 800, 400)).toBeNull();
    });
  });

  describe('computeInitialCrop', () => {
    it('centers crop and preserves 1:1 ratio within landscape image', () => {
      const crop = computeInitialCrop(1000, 500, '1:1', 0.8);
      // Max height is 500 * 0.8 = 400. Width should be 400.
      expect(crop.width).toBe(400);
      expect(crop.height).toBe(400);
      expect(crop.x).toBe(300); // (1000 - 400) / 2
      expect(crop.y).toBe(50); // (500 - 400) / 2
    });

    it('centers crop and preserves 16:9 ratio within square image', () => {
      const crop = computeInitialCrop(1000, 1000, '16:9', 0.9);
      expect(crop.width).toBe(900);
      expect(crop.height).toBe(Math.round(900 / (16 / 9)));
      expect(crop.x).toBe(50);
      expect(crop.y).toBe(Math.round((1000 - crop.height) / 2));
    });

    it('creates freestyle crop centered with coverage fraction', () => {
      const crop = computeInitialCrop(1000, 600, 'freestyle', 0.8);
      expect(crop.width).toBe(800);
      expect(crop.height).toBe(480);
      expect(crop.x).toBe(100);
      expect(crop.y).toBe(60);
    });

    it('stays strictly inside boundaries for all ratios', () => {
      const ratios: AspectRatio[] = [
        'original',
        '1:1',
        '4:3',
        '3:2',
        '16:9',
        '16:10',
        '9:16',
        '3:4',
        '2:3',
        'freestyle',
      ];
      for (const ratio of ratios) {
        const crop = computeInitialCrop(800, 1200, ratio);
        expect(crop.x).toBeGreaterThanOrEqual(0);
        expect(crop.y).toBeGreaterThanOrEqual(0);
        expect(crop.x + crop.width).toBeLessThanOrEqual(800);
        expect(crop.y + crop.height).toBeLessThanOrEqual(1200);
      }
    });
  });

  describe('clampCrop and moveCrop', () => {
    it('clamps negative coordinates and overflow', () => {
      const clamped = clampCrop({ x: -50, y: -20, width: 900, height: 700 }, 800, 600);
      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(0);
      expect(clamped.width).toBe(800);
      expect(clamped.height).toBe(600);
    });

    it('moves crop and stops at borders', () => {
      const initial: CropRect = { x: 100, y: 100, width: 200, height: 200 };
      const movedLeft = moveCrop(initial, -300, 0, 800, 600);
      expect(movedLeft.x).toBe(0);

      const movedRight = moveCrop(initial, 1000, 0, 800, 600);
      expect(movedRight.x).toBe(600); // 800 - 200

      const movedBottom = moveCrop(initial, 0, 1000, 800, 600);
      expect(movedBottom.y).toBe(400); // 600 - 200
    });
  });

  describe('resizeCrop', () => {
    it('preserves fixed aspect ratio when resizing from corner handle', () => {
      const initial: CropRect = { x: 100, y: 100, width: 200, height: 200 }; // 1:1
      const resized = resizeCrop(initial, 'se', 50, 50, '1:1', 1000, 1000);
      expect(resized.width).toBe(250);
      expect(resized.height).toBe(250);
      expect(resized.x).toBe(100);
      expect(resized.y).toBe(100);
    });

    it('does not exceed image boundaries during fixed ratio resize', () => {
      const initial: CropRect = { x: 700, y: 500, width: 200, height: 200 };
      const resized = resizeCrop(initial, 'se', 500, 500, '1:1', 1000, 800);
      expect(resized.x + resized.width).toBeLessThanOrEqual(1000);
      expect(resized.y + resized.height).toBeLessThanOrEqual(800);
      expect(resized.width).toBe(resized.height); // preserved 1:1
    });

    it('allows independent width and height resizing in freestyle mode', () => {
      const initial: CropRect = { x: 100, y: 100, width: 200, height: 200 };
      const resized = resizeCrop(initial, 'e', 100, 0, 'freestyle', 1000, 1000);
      expect(resized.width).toBe(300);
      expect(resized.height).toBe(200);
    });
  });

  describe('rotation handling', () => {
    it('rotates crop clockwise correctly', () => {
      // 800x600 image. Crop at x=100, y=50, w=200, h=100.
      // Clockwise rotation swaps dimensions to 600x800.
      const initial: CropRect = { x: 100, y: 50, width: 200, height: 100 };
      const rotated = rotateCropClockwise(initial, 800, 600);

      // New oriented dimensions are 600x800
      expect(rotated.width).toBe(100);
      expect(rotated.height).toBe(200);
      expect(rotated.x).toBe(600 - (50 + 100)); // 450
      expect(rotated.y).toBe(100);
      expect(rotated.x + rotated.width).toBeLessThanOrEqual(600);
      expect(rotated.y + rotated.height).toBeLessThanOrEqual(800);
    });

    it('rotates crop counter-clockwise correctly', () => {
      const initial: CropRect = { x: 100, y: 50, width: 200, height: 100 };
      const rotated = rotateCropCounterClockwise(initial, 800, 600);

      // New oriented dimensions are 600x800
      expect(rotated.width).toBe(100);
      expect(rotated.height).toBe(200);
      expect(rotated.x).toBe(50);
      expect(rotated.y).toBe(800 - (100 + 200)); // 500
      expect(rotated.x + rotated.width).toBeLessThanOrEqual(600);
      expect(rotated.y + rotated.height).toBeLessThanOrEqual(800);
    });

    it('4 consecutive rotations return to original position', () => {
      let crop: CropRect = { x: 120, y: 80, width: 300, height: 200 };
      let w = 1920;
      let h = 1080;

      for (let i = 0; i < 4; i++) {
        crop = rotateCropClockwise(crop, w, h);
        const temp = w;
        w = h;
        h = temp;
      }

      expect(crop).toEqual({ x: 120, y: 80, width: 300, height: 200 });
    });
  });
});
