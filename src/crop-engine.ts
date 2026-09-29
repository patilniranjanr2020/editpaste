import type { AspectRatio, CropRect, Dimensions, HandleType, RotationAngle } from './types';

export const MIN_CROP_SIZE = 16;

/**
 * Returns oriented dimensions based on rotation angle (0, 90, 180, 270)
 */
export function getOrientedDimensions(
  naturalWidth: number,
  naturalHeight: number,
  rotation: RotationAngle
): Dimensions {
  if (rotation === 90 || rotation === 270) {
    return { width: naturalHeight, height: naturalWidth };
  }
  return { width: naturalWidth, height: naturalHeight };
}

/**
 * Computes numeric aspect ratio value (width / height), or null for freestyle
 */
export function getRatioValue(
  ratio: AspectRatio,
  orientedWidth: number,
  orientedHeight: number
): number | null {
  switch (ratio) {
    case 'original':
      return orientedWidth > 0 && orientedHeight > 0 ? orientedWidth / orientedHeight : 1;
    case '1:1':
      return 1;
    case '4:3':
      return 4 / 3;
    case '3:2':
      return 3 / 2;
    case '16:9':
      return 16 / 9;
    case '16:10':
      return 16 / 10;
    case '9:16':
      return 9 / 16;
    case '3:4':
      return 3 / 4;
    case '2:3':
      return 2 / 3;
    case 'freestyle':
      return null;
  }
}

/**
 * Computes an initial centered crop rectangle for a given ratio and image dimensions
 */
export function computeInitialCrop(
  orientedWidth: number,
  orientedHeight: number,
  ratio: AspectRatio,
  coverageFraction = 0.85
): CropRect {
  const safeW = Math.max(orientedWidth, MIN_CROP_SIZE);
  const safeH = Math.max(orientedHeight, MIN_CROP_SIZE);
  const rValue = getRatioValue(ratio, safeW, safeH);

  if (rValue === null) {
    // Freestyle: 85% of dimensions centered
    const width = Math.max(MIN_CROP_SIZE, Math.round(safeW * coverageFraction));
    const height = Math.max(MIN_CROP_SIZE, Math.round(safeH * coverageFraction));
    const x = Math.round((safeW - width) / 2);
    const y = Math.round((safeH - height) / 2);
    return { x, y, width, height };
  }

  // Constrained ratio: fit within safeW * coverageFraction, safeH * coverageFraction
  let width: number;
  let height: number;

  const maxWidth = safeW * coverageFraction;
  const maxHeight = safeH * coverageFraction;

  if (maxWidth / maxHeight > rValue) {
    // Height is the limiting factor
    height = Math.round(maxHeight);
    width = Math.round(height * rValue);
  } else {
    // Width is the limiting factor
    width = Math.round(maxWidth);
    height = Math.round(width / rValue);
  }

  // Ensure minimum dimensions and within bounds
  width = Math.max(MIN_CROP_SIZE, Math.min(width, safeW));
  height = Math.max(MIN_CROP_SIZE, Math.min(height, safeH));

  // Re-adjust if minimum dimension pushed it out of ratio
  if (width / height !== rValue) {
    if (rValue >= 1) {
      height = Math.max(MIN_CROP_SIZE, Math.round(width / rValue));
      if (height > safeH) {
        height = safeH;
        width = Math.round(height * rValue);
      }
    } else {
      width = Math.max(MIN_CROP_SIZE, Math.round(height * rValue));
      if (width > safeW) {
        width = safeW;
        height = Math.round(width / rValue);
      }
    }
  }

  const x = Math.max(0, Math.round((safeW - width) / 2));
  const y = Math.max(0, Math.round((safeH - height) / 2));

  return clampCrop({ x, y, width, height }, safeW, safeH);
}

/**
 * Clamps a crop rectangle to strictly stay within [0, 0, orientedWidth, orientedHeight]
 */
export function clampCrop(
  crop: CropRect,
  orientedWidth: number,
  orientedHeight: number
): CropRect {
  const minW = Math.min(MIN_CROP_SIZE, orientedWidth);
  const minH = Math.min(MIN_CROP_SIZE, orientedHeight);

  let width = Math.max(minW, Math.min(crop.width, orientedWidth));
  let height = Math.max(minH, Math.min(crop.height, orientedHeight));

  let x = Math.max(0, Math.min(crop.x, orientedWidth - width));
  let y = Math.max(0, Math.min(crop.y, orientedHeight - height));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Moves crop rectangle by dx, dy and clamps within image bounds
 */
export function moveCrop(
  crop: CropRect,
  dx: number,
  dy: number,
  orientedWidth: number,
  orientedHeight: number
): CropRect {
  const newX = Math.max(0, Math.min(crop.x + dx, orientedWidth - crop.width));
  const newY = Math.max(0, Math.min(crop.y + dy, orientedHeight - crop.height));

  return {
    x: Math.round(newX),
    y: Math.round(newY),
    width: crop.width,
    height: crop.height,
  };
}

/**
 * Resizes crop rectangle with handle dragging.
 * If ratio is fixed, enforces aspect ratio strictly while respecting image boundaries.
 */
export function resizeCrop(
  initialCrop: CropRect,
  handle: HandleType,
  dx: number,
  dy: number,
  ratio: AspectRatio,
  orientedWidth: number,
  orientedHeight: number
): CropRect {
  const rValue = getRatioValue(ratio, orientedWidth, orientedHeight);

  // If freestyle, resize edges/corners independently
  if (rValue === null) {
    let left = initialCrop.x;
    let top = initialCrop.y;
    let right = initialCrop.x + initialCrop.width;
    let bottom = initialCrop.y + initialCrop.height;

    if (handle.includes('w')) {
      left = Math.min(initialCrop.x + dx, right - MIN_CROP_SIZE);
      left = Math.max(0, left);
    }
    if (handle.includes('e')) {
      right = Math.max(initialCrop.x + initialCrop.width + dx, left + MIN_CROP_SIZE);
      right = Math.min(orientedWidth, right);
    }
    if (handle.includes('n')) {
      top = Math.min(initialCrop.y + dy, bottom - MIN_CROP_SIZE);
      top = Math.max(0, top);
    }
    if (handle.includes('s')) {
      bottom = Math.max(initialCrop.y + initialCrop.height + dy, top + MIN_CROP_SIZE);
      bottom = Math.min(orientedHeight, bottom);
    }

    return {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.round(right - left),
      height: Math.round(bottom - top),
    };
  }

  // Fixed aspect ratio resize
  // Determine anchor point opposite to handle
  let anchorX: number;
  let anchorY: number;

  // Sign modifiers for expanding from anchor
  let dirX: 1 | -1 | 0 = 1;
  let dirY: 1 | -1 | 0 = 1;

  switch (handle) {
    case 'se':
      anchorX = initialCrop.x;
      anchorY = initialCrop.y;
      dirX = 1;
      dirY = 1;
      break;
    case 'nw':
      anchorX = initialCrop.x + initialCrop.width;
      anchorY = initialCrop.y + initialCrop.height;
      dirX = -1;
      dirY = -1;
      break;
    case 'ne':
      anchorX = initialCrop.x;
      anchorY = initialCrop.y + initialCrop.height;
      dirX = 1;
      dirY = -1;
      break;
    case 'sw':
      anchorX = initialCrop.x + initialCrop.width;
      anchorY = initialCrop.y;
      dirX = -1;
      dirY = 1;
      break;
    case 'e':
      anchorX = initialCrop.x;
      anchorY = initialCrop.y + initialCrop.height / 2;
      dirX = 1;
      dirY = 0;
      break;
    case 'w':
      anchorX = initialCrop.x + initialCrop.width;
      anchorY = initialCrop.y + initialCrop.height / 2;
      dirX = -1;
      dirY = 0;
      break;
    case 's':
      anchorX = initialCrop.x + initialCrop.width / 2;
      anchorY = initialCrop.y;
      dirX = 0;
      dirY = 1;
      break;
    case 'n':
      anchorX = initialCrop.x + initialCrop.width / 2;
      anchorY = initialCrop.y + initialCrop.height;
      dirX = 0;
      dirY = -1;
      break;
  }

  // For corner handles
  if (dirX !== 0 && dirY !== 0) {
    // Current diagonal displacement along pointer movement
    const currentW = initialCrop.width + dirX * dx;
    const currentH = initialCrop.height + dirY * dy;

    // Pick dimension with larger change or project to ratio
    let targetW = currentW;
    let targetH = targetW / rValue;

    if (Math.abs(currentH - initialCrop.height) > Math.abs(currentW - initialCrop.width)) {
      targetH = currentH;
      targetW = targetH * rValue;
    }

    // Enforce bounds relative to anchor
    const maxAvailableW = dirX === 1 ? orientedWidth - anchorX : anchorX;
    const maxAvailableH = dirY === 1 ? orientedHeight - anchorY : anchorY;

    if (targetW > maxAvailableW) {
      targetW = maxAvailableW;
      targetH = targetW / rValue;
    }
    if (targetH > maxAvailableH) {
      targetH = maxAvailableH;
      targetW = targetH * rValue;
    }

    targetW = Math.max(MIN_CROP_SIZE, targetW);
    targetH = Math.max(MIN_CROP_SIZE / rValue, targetH);

    // Final check for bounds
    if (targetW > maxAvailableW || targetH > maxAvailableH) {
      const scale = Math.min(maxAvailableW / targetW, maxAvailableH / targetH);
      targetW *= scale;
      targetH *= scale;
    }

    const finalX = dirX === 1 ? anchorX : anchorX - targetW;
    const finalY = dirY === 1 ? anchorY : anchorY - targetH;

    return clampCrop(
      {
        x: Math.round(finalX),
        y: Math.round(finalY),
        width: Math.round(targetW),
        height: Math.round(targetH),
      },
      orientedWidth,
      orientedHeight
    );
  }

  // Edge handles with fixed ratio: expand symmetrically along perpendicular axis
  if (dirX !== 0) {
    // Horizontal edge (e or w)
    let targetW = Math.max(MIN_CROP_SIZE, initialCrop.width + dirX * dx);
    const maxAvailableW = dirX === 1 ? orientedWidth - anchorX : anchorX;
    targetW = Math.min(targetW, maxAvailableW);

    let targetH = targetW / rValue;
    // Check if targetH exceeds orientedHeight
    if (targetH > orientedHeight) {
      targetH = orientedHeight;
      targetW = targetH * rValue;
    }

    const finalX = dirX === 1 ? anchorX : anchorX - targetW;
    let finalY = anchorY - targetH / 2;
    if (finalY < 0) finalY = 0;
    if (finalY + targetH > orientedHeight) finalY = orientedHeight - targetH;

    return clampCrop(
      {
        x: Math.round(finalX),
        y: Math.round(finalY),
        width: Math.round(targetW),
        height: Math.round(targetH),
      },
      orientedWidth,
      orientedHeight
    );
  } else {
    // Vertical edge (n or s)
    let targetH = Math.max(MIN_CROP_SIZE, initialCrop.height + dirY * dy);
    const maxAvailableH = dirY === 1 ? orientedHeight - anchorY : anchorY;
    targetH = Math.min(targetH, maxAvailableH);

    let targetW = targetH * rValue;
    if (targetW > orientedWidth) {
      targetW = orientedWidth;
      targetH = targetW / rValue;
    }

    const finalY = dirY === 1 ? anchorY : anchorY - targetH;
    let finalX = anchorX - targetW / 2;
    if (finalX < 0) finalX = 0;
    if (finalX + targetW > orientedWidth) finalX = orientedWidth - targetW;

    return clampCrop(
      {
        x: Math.round(finalX),
        y: Math.round(finalY),
        width: Math.round(targetW),
        height: Math.round(targetH),
      },
      orientedWidth,
      orientedHeight
    );
  }
}

/**
 * Handles rotation of crop rectangle when rotating by +90 degrees clockwise
 */
export function rotateCropClockwise(
  crop: CropRect,
  oldOrientedWidth: number,
  oldOrientedHeight: number
): CropRect {
  // A point (x, y) becomes (oldOrientedHeight - (y + h), x)
  const newWidth = crop.height;
  const newHeight = crop.width;
  const newX = oldOrientedHeight - (crop.y + crop.height);
  const newY = crop.x;

  return clampCrop(
    {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    },
    oldOrientedHeight,
    oldOrientedWidth
  );
}

/**
 * Handles rotation of crop rectangle when rotating by -90 degrees counter-clockwise
 */
export function rotateCropCounterClockwise(
  crop: CropRect,
  oldOrientedWidth: number,
  oldOrientedHeight: number
): CropRect {
  // A point (x, y) becomes (y, oldOrientedWidth - (x + w))
  const newWidth = crop.height;
  const newHeight = crop.width;
  const newX = crop.y;
  const newY = oldOrientedWidth - (crop.x + crop.width);

  return clampCrop(
    {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    },
    oldOrientedHeight,
    oldOrientedWidth
  );
}
