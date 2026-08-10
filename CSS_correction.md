# SYSTEM DIRECTIVE: Ultimate Cross-Browser CSS Standardization (WebKit, Blink, Gecko, Tor)

## Core Instruction for AI Agent
Perform a full-project CSS standardization sweep file-by-file, module-by-module. 
**STRICT CONSTRAINT:** You are ONLY permitted to modify CSS/Tailwind classes. DO NOT modify HTML structure, state, React hooks, or business logic.

Your goal is absolute pixel-perfection and functional parity across Safari (WebKit), Chrome/Edge (Blink), Firefox (Gecko), and privacy-focused browsers like Tor. You must fix every popup, menu button, form, and layout corner using cross-browser standard CSS and vendor prefixes.

---

## 1. GLOBAL ROOT & VIEWPORT ENGINE FIXES (`globals.css` / Main Layout)
Browsers handle viewport heights and safe areas completely differently. Apply these fallbacks globally:

*   **The Viewport Height Bug (Safari/Chrome Mobile):**
    *   Never rely solely on `100vh`. 
    *   Enforce: `min-height: 100vh; min-height: 100dvh;` (Fallback for older browsers, `dvh` for modern mobile browsers).
*   **Overscroll & Rubber-Banding (Chrome/Safari):**
    *   Apply `overscroll-behavior: none;` to the `body` to stop the whole page from pulling-to-refresh or bouncing when interacting with inner scrollable menus.
*   **Touch Highlights (Safari/WebKit only):**
    *   Add `-webkit-tap-highlight-color: transparent;` to `*` to stop the blue/gray flash when tapping menu buttons or list items.
*   **Safe Areas (iOS Notches / Android Pill):**
    *   Always use `env()` with `var()` fallbacks: `padding-top: max(16px, env(safe-area-inset-top));`

---

## 2. SCROLLBAR NORMALIZATION (Chrome vs. Firefox vs. Tor)
Tor and Firefox use Gecko, which ignores `::-webkit-scrollbar`. Menus and popups with overflow will look ugly if not standardized.

*   **Global Scrollbar Policy (For all scrollable popups, sheets, and lists):**
    *   **Gecko/Firefox/Tor:** Add `scrollbar-width: thin; scrollbar-color: #F5A623 #1a1a1a;` (or Tailwind equivalent `scrollbar-thin`).
    *   **Blink/WebKit (Chrome/Edge/Safari):** 
        ```css
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #F5A623; }
        ```

---

## 3. POPUPS, MENUS, & BOTTOM SHEETS (Z-Index & Blur Fallbacks)
Privacy browsers like Tor and older Firefox versions disable `backdrop-filter: blur()` to prevent canvas fingerprinting.

*   **Backdrop Fallbacks (Strict Requirement):**
    *   For every popup modal or bottom sheet overlay, do NOT rely purely on `backdrop-blur`. 
    *   Ensure the overlay has a solid, semi-transparent fallback background: `bg-black/70 backdrop-blur-sm`. If the blur fails (Tor), the dark background still provides the necessary contrast to see the menu.
*   **Z-Index Sandboxing:**
    *   Enforce a strict z-index scale: Headers (`z-30`), FABs (`z-40`), Menu Overlays (`z-50`), Popup Menus (`z-60`), Toast Notifications (`z-70`).
*   **Hardware Acceleration (Safari/iOS Flickering):**
    *   For sliding bottom sheets or dropdowns, add `transform: translateZ(0);` or `will-change: transform` to force hardware acceleration and stop Safari from flickering during the CSS animation.

---

## 4. FORM CONTROLS & BUTTONS (Nooks & Corners)
Form inputs are the most heavily fragmented elements across browsers.

*   **Appearance Stripping:**
    *   Apply `-webkit-appearance: none;` and `-moz-appearance: none; appearance: none;` to ALL `<select>`, `<input>`, and `<button>` elements to strip native OS styling (especially on iOS Safari and Firefox Android).
*   **Prevent iOS Safari Zoom:**
    *   Ensure **EVERY** text input and dropdown has exactly `font-size: 16px;` (or `text-base`). If it is `14px`, Safari will forcibly zoom the camera in when the user clicks the menu input, breaking the mobile layout.
*   **Focus Rings (Edge & Chrome Accessibility):**
    *   Remove default harsh outlines: `outline: none;`.
    *   Replace with standard box-shadow rings for accessibility: `focus:ring-1 focus:ring-[#F5A623] focus:border-[#F5A623]`.

---

## 5. MODULE-BY-MODULE CSS SWEEP CHECKLIST

### A. Navigation & Dashboard (Ref: `image_54fcae.png`)
*   **List Item Touch Targets:** For the module list (Master Data, Procurement, etc.), enforce `min-height: 64px;` and `display: flex; align-items: center;`. Ensure the clickable `<a>` or `<button>` tag spans the *entire* width and height of the card, not just the text, so it works perfectly on mobile touchscreens.
*   **Text Truncation (Gecko/Blink):** For long names, use robust truncation: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`. 
*   **Active States:** Add `:active` CSS states (e.g., `active:scale-[0.98] active:opacity-80`). Mobile browsers do not register `:hover` well, so `:active` is required for tap feedback.

### B. Popup Menus & Dropdowns
*   **Positioning:** Ensure dropdown menus (like selecting a farmer or godown) use `position: absolute;` inside a `position: relative;` parent.
*   **Overflow Containment:** Give dropdown lists `max-height: 50vh; overflow-y: auto; overscroll-behavior: contain;`. The `overscroll-behavior: contain;` is critical so that scrolling to the bottom of the dropdown doesn't accidentally start scrolling the background page on Chrome/Safari.

### C. Tor Browser Font & Layout Specifics
*   **System Fonts:** Tor often blocks web fonts (like Google Fonts) to prevent tracking. Ensure the CSS includes a robust system font fallback stack in the root: 
    `font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;`
*   **Flexbox/Grid Gap Bug (Older Safari):** If using `flex` with `gap`, ensure fallbacks or verify it's compiled correctly for older iOS versions, or prefer CSS Grid for layouts like the top KPI cards.

---
**Agent Execution Command:** 
Begin the sweep. Open every component file (Layouts, Modals, Forms, Buttons, Dropdowns). Inject the `-webkit` and `-moz` prefixes where missing, fix all input font sizes to 16px to stop iOS zooming, implement the dual scrollbar strategies, and guarantee all overlays have a non-blur background color fallback. Do not touch the logic. Output only CSS/class modifications.