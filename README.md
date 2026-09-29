<p align="center">
  <img src="public/editpaste-logo.svg" alt="EditPaste Logo" width="380">
</p>

<p align="center">
  <strong>Fast, private, browser-only image cropping utility with instant clipboard paste, drag-and-drop, and fixed crop ratios.</strong>
</p>

<h2 align="center">
  🚀 Live Website: <a href="https://patilniranjanr2020.github.io/editpaste/">https://patilniranjanr2020.github.io/editpaste/</a>
</h2>

<p align="center">
  <a href="https://patilniranjanr2020.github.io/editpaste/">
    <img src="https://img.shields.io/badge/Live%20Website-Visit%20EditPaste-2563EB?style=for-the-badge&logo=githubpages&logoColor=white" alt="Live Website">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-111111.svg" alt="License">
  <img src="https://img.shields.io/badge/build-passing-059669.svg" alt="Build Status">
  <img src="https://img.shields.io/badge/TypeScript-5.7-2563EB.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF.svg" alt="Vite">
  <img src="https://img.shields.io/badge/privacy-100%25%20client--side-059669.svg" alt="Privacy">
</p>

---

## 🎨 Branding & Identity

EditPaste uses a clean, modern aesthetic featuring its official design language:

- **Horizontal Logo:** [`public/editpaste-logo.svg`](public/editpaste-logo.svg) — Used in the desktop application header and documentation.
- **Square Icon:** [`public/editpaste-icon.svg`](public/editpaste-icon.svg) — Used as the browser favicon, mobile header mark, PWA icon, and clipboard paste prompt.
- **Brand Palette:**
  - **Black:** `#111111`
  - **Warm Off-White:** `#F5F3EE`
  - **Cobalt Blue:** `#2563EB`
- **White Theme with Subtle CSS Texture:** A light, professional desktop-utility workspace featuring a subtle 24px repeating CSS gradient grid pattern. This ensures that pure white images and screenshots are always visually separated from the background without blending away.

---

## ⚡ Key Features

- **📋 Dedicated "Paste from Clipboard" Mode:**
  - One-click **"Paste from Clipboard"** button with a focused, softly blurred backdrop and sharp prompt card.
  - Listen for <kbd>Ctrl</kbd> + <kbd>V</kbd> paste events anywhere across the page.
  - Automatically loads images, closes the prompt overlay, and focuses the crop workspace.
  - Accessible cancelation via <kbd>Esc</kbd>, cancel button, or backdrop click.
- **🪟 Windows Clipboard History (<kbd>Win</kbd> + <kbd>V</kbd>) Support:**
  - Clear guidance for the Windows clipboard history workflow: press <kbd>Win</kbd> + <kbd>V</kbd>, click an image item, then press <kbd>Ctrl</kbd> + <kbd>V</kbd> inside EditPaste.
- **📁 Smooth Drag & Drop:**
  - Drop image files directly from File Explorer or desktop without navigating the browser away.
  - Native file picker fallback for accessibility.
- **📐 10 Aspect Ratio Presets:**
  - **Original** (matches input image aspect ratio)
  - **1:1** (Square / avatars)
  - **4:3** (Standard display)
  - **3:2** (Classic 35mm photography)
  - **16:9** (Widescreen video / slides)
  - **16:10** (Modern desktop display)
  - **9:16** (Mobile stories / Reels / TikTok)
  - **3:4** (Portrait)
  - **2:3** (Vertical photo print)
  - **Freestyle** (Independent freeform width and height resizing)
- **🔄 Transform & Navigation:**
  - **Rotate:** 90° clockwise and counter-clockwise rotation with automatic coordinate and boundary recalculation.
  - **Zoom & Pan:** Smooth mouse wheel or button zooming (25% to 500%) with drag-to-pan when zoomed in.
  - **Reset:** Centered crop reset anytime (<kbd>Esc</kbd>).
- **🎨 Interactive Crop Canvas:**
  - High-performance 2D Canvas rendering supporting device pixel ratio (Hi-DPI / Retina).
  - Rule-of-thirds alignment grid.
  - 8-point dual-contrast resize handles (4 corners + 4 edges) engineered for high contrast over both white and dark photos.
  - Strict image boundary clamping (crop area never escapes image bounds).
- **💾 Export Options:**
  - **PNG:** Full transparency preservation.
  - **JPEG:** Clean white solid background backing with quality slider (10% - 100%).
  - **WebP:** Modern web format with quality slider.
  - Instant local download via temporary Blob URLs.
- **⌨️ Keyboard Accessibility:**
  - Arrow keys: Nudge crop rectangle by 1px (or 10px with <kbd>Shift</kbd>).
  - <kbd>+</kbd> / <kbd>-</kbd>: Zoom in / Zoom out.
  - <kbd>R</kbd> / <kbd>Shift</kbd>+<kbd>R</kbd> or <kbd>[</kbd> / <kbd>]</kbd>: Rotate ±90°.
  - <kbd>Esc</kbd>: Reset crop or close modal.
  - <kbd>Ctrl</kbd> + <kbd>S</kbd> or <kbd>Enter</kbd>: Export & download.

---

## 🔒 Privacy Statement

**Your images stay in your browser and are not uploaded.**

- **Zero Server Uploads:** All image decoding, orientation changes, cropping, and encoding occur entirely in client-side browser memory via HTML5 Canvas and File APIs.
- **Zero Telemetry & Tracking:** No analytics scripts, cookies, tracking pixels, or third-party SDKs.
- **No Persistence:** Images are stored temporarily in memory and object URLs during your active session. Nothing is written to `localStorage` or `IndexedDB`. When you refresh or close the tab, the image data is completely cleared.

---

## 🛠️ Technology Stack

- **Language:** TypeScript 5.7+ (Vanilla TS, zero heavy frameworks)
- **Build Tool:** Vite 6.x
- **Testing:** Vitest 3.x
- **Styling:** Vanilla CSS (Light theme, CSS variables, CSS-only repeating background texture)
- **Browser APIs:**
  - Canvas 2D API (`OffscreenCanvas` & `HTMLCanvasElement`)
  - Clipboard API (`ClipboardEvent`, `items`)
  - File & Blob APIs (`URL.createObjectURL`, `URL.revokeObjectURL`)
  - Pointer Events API (`setPointerCapture`, `touch-action: none`)
  - ResizeObserver API for responsive canvas rendering

---

## 💻 Local Development

### Prerequisites

- Node.js 18+ (tested on Node v22.15.0)
- npm 9+

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Unit Tests

```bash
npm test
```

### Build for Production

```bash
npm run build
```

This compiles TypeScript (`tsc`) and outputs an optimized bundle to the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

---

## 🚀 GitHub Pages Deployment

The repository includes an automated GitHub Actions deployment workflow at [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

### Step-by-Step Deployment Instructions

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "feat: integrate official EditPaste branding and white theme"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/editpaste.git
   git push -u origin main
   ```

2. **Configure GitHub Pages in your repository settings:**
   - Go to your repository on GitHub.
   - Click on **Settings** > **Pages** (under "Code and automation").
   - Under **Build and deployment** > **Source**, select **GitHub Actions**.

3. **Automatic Deployment:**
   - On every push to `main`, the workflow will:
     1. Check out the code.
     2. Set up Node.js 22.
     3. Install dependencies via `npm ci`.
     4. Run the unit test suite (`npm test`).
     5. Build the web app (`npm run build`).
     6. Upload and deploy the `dist/` artifact to GitHub Pages.
   - Your site will be live at:
     ```
     https://<YOUR_USERNAME>.github.io/editpaste/
     ```

*(Note: The build uses `./` relative paths by default, so it works seamlessly under both root domains and `/editpaste/` subpaths without hardcoded usernames).*

---

## ⚠️ Browser Limitations & Notes

1. **Windows Clipboard History (<kbd>Win</kbd> + <kbd>V</kbd>):**
   - Windows restricts direct drag-and-drop from the clipboard history overlay into web browsers.
   - **Recommended Workflow:** Press <kbd>Win</kbd> + <kbd>V</kbd>, click the desired image, then press <kbd>Ctrl</kbd> + <kbd>V</kbd> inside EditPaste.
2. **Clipboard API Permissions:**
   - Passive paste events (`window.addEventListener('paste', ...)`) require no special permissions and work universally in all modern browsers. EditPaste never requests invasive background clipboard permissions.
3. **Memory & Large Images:**
   - Modern browsers support canvas dimensions up to 16,384×16,384 pixels.
   - For images exceeding 40 MB, EditPaste notifies the user that processing is underway locally without freezing the UI.
4. **Animated Images (GIF / WebP):**
   - Animated images are loaded at their first frame for static cropping and export. Animated multi-frame GIF cropping is not supported locally.

---

## License

MIT License. Free and open source for personal and commercial use.
