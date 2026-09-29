import { describe, expect, it } from 'vitest';
import { generateFilename } from '../src/export-image';

describe('export-image utils', () => {
  it('generates predictable filenames for PNG, JPEG, WebP', () => {
    expect(generateFilename('image/png', 'screenshot.png')).toBe('screenshot-cropped.png');
    expect(generateFilename('image/jpeg', 'photo.jpg')).toBe('photo-cropped.jpg');
    expect(generateFilename('image/webp', 'graphic.webp')).toBe('graphic-cropped.webp');
  });

  it('handles files with no original name or custom extension', () => {
    expect(generateFilename('image/png')).toBe('editpaste-crop.png');
    expect(generateFilename('image/jpeg')).toBe('editpaste-crop.jpg');
    expect(generateFilename('image/webp')).toBe('editpaste-crop.webp');
  });
});
