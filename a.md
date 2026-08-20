# SYSTEM DIRECTIVE: Ultra-Performance & Stability Overhaul (Phase 1)

## Core Instruction for AI Agent
The deployed application is experiencing severe timeouts, OOM (Out of Memory) crashes, and high latency ("A server error occurred. Reload to try again"). This is primarily caused by serving heavy 4K media files directly through the application server and executing unoptimized database queries. 

Your goal is to re-architect the application for ultra-fast, Instagram-level performance. Execute the following optimizations across the stack.

---

## 1. MEDIA DELIVERY: Offload & Stream (The Crash Fix)
Serving raw 4K `.mp4` files from the backend is strictly prohibited. It is crashing the server.
*   **External Storage & CDN:** Migrate all heavy assets (specifically `reel_paddy.mp4`, `reel_milling.mp4`, `reel_analytics.mp4`) to an external object storage bucket (e.g., AWS S3, Cloudflare R2) and serve them via a global CDN.
*   **Implement HLS (HTTP Live Streaming):** Do not serve single monolithic video files. Transcode the videos and implement an `.m3u8` playlist. Use a Svelte-compatible video library (like `video.js` or `hls.js`) to stream the video in dynamic chunks based on the user's bandwidth.
*   **Aggressive Lazy Loading:** Update the `<video>` components. They MUST use the high-fidelity images (`reel_paddy.png`, etc.) in the `poster` attribute. Add `preload="none"`. The video chunk downloading must only initiate when the user interacts with the player.

---

## 2. MONGODB OPTIMIZATION: Indexes & Data Fetching
The database is likely performing full-collection scans, causing API timeouts as the data grows.
*   **Strict Pagination:** Refactor all list-fetching endpoints (Invoices, Cashbook, Inventory). Never return the entire collection. Implement cursor-based pagination (limit to 20-50 records per request).
*   **Index Creation:** Analyze the query patterns. Create Compound Indexes in MongoDB for the most frequently queried fields (e.g., sorting invoices by `date` and filtering by `customer_id`). 
*   **Payload Trimming:** Use MongoDB Projections to return *only* the fields the frontend actually needs. Do not send complete documents if the UI only displays three fields.

---

## 3. SVELTE FRONTEND: Optimistic UI & State
Make the app *feel* instantaneous, even if the backend is taking a few hundred milliseconds to process.
*   **Optimistic Updates:** When a user submits a form (e.g., saving a scrap yard entry or logging a payment), update the Svelte UI state *immediately* before waiting for the backend API response. If the API fails, roll back the UI state and show an error toast. 
*   **SvelteKit Data Loading:** Ensure you are utilizing SvelteKit's `load` functions correctly to stream non-critical data (using nested promises) so the outer shell of the dashboard renders instantly while heavier analytics load in the background.

---

## 4. BACKEND INFRASTRUCTURE (Rust / Bun)
*   **Enable Gzip/Brotli:** Ensure the backend server is compressing all JSON API responses using Brotli or Gzip to reduce payload sizes over the network.
*   **Connection Pooling:** Verify that the database connection is utilizing a persistent connection pool, rather than opening and closing a new database connection for every single API request.
*   **Rate Limiting & Timeout Grace:** Implement a middleware that catches timeouts gracefully and returns a clean standard JSON error message instead of crashing the server instance.

---
**Agent Execution Command:** 
Begin with Section 1. Strip the static video files from the local codebase and replace them with CDN/HLS streaming components in the Svelte frontend. Then, proceed to implement cursor pagination on all main ledger endpoints. Output the necessary code changes.

# SYSTEM DIRECTIVE: Ultra-Performance Overhaul (Phase 2 - Offline-First PWA)

## Core Instruction for AI Agent
To achieve enterprise-grade, sub-millisecond perceived latency, we are converting the Svelte application into an Offline-First Progressive Web App (PWA). The browser must now act as the primary data store and server for the user interface.

Implement the following architectural shifts across the Svelte frontend and Rust/Bun backend to ensure 100% data reliability during offline periods and instant load times.

---

## 1. Client-Side Database (IndexedDB Engine)
The UI must never block or show a loading spinner while waiting for MongoDB.
*   **Implement IndexedDB:** Integrate a client-side database wrapper (like `Dexie.js` or `RxDB`) to store critical application state locally.
*   **Data Mirroring:** When the app loads, sync the latest Master Data (Suppliers, Active Godowns, Spares Inventory) directly into the browser's IndexedDB. 
*   **Local Reads/Writes:** When a user creates a new Sales Invoice or logs a Cashbook entry, the Svelte UI must write this data to IndexedDB *first*, updating the UI in 0ms.

## 2. Service Workers & App Shell Caching
We must intercept network requests to guarantee the app loads instantly, even on airplane mode.
*   **Cache the App Shell:** Implement a Service Worker to automatically cache the core HTML, CSS, JavaScript, and fonts (the "App Shell") upon first visit.
*   **Cache-First Fetching:** Instruct the service worker to serve UI assets directly from the local cache first, while quietly fetching newer versions in the background. This yields dramatically faster repeat load times.

## 3. Background Sync & Conflict Resolution (The Queue)
When the mill loses Wi-Fi connection, the ERP must remain fully functional.
*   **Background Sync API:** Implement the browser's `SyncManager` API.
*   **Action Queueing:** If a user submits a form while offline, store the payload in a specific IndexedDB table (e.g., `unsynced_mutations`). 
*   **Auto-Replay:** When the service worker detects that connectivity has returned, it must silently replay the queued actions to the Rust/Bun backend without requiring the user to keep the app open.

## 4. Real-Time WebSockets Engine (The WhatsApp Logic)
To prevent users from looking at stale data, the backend must actively push updates.
*   **Persistent WebSockets:** WhatsApp achieves its speed by maintaining persistent WebSocket connections for real-time delivery. Implement a WebSocket connection between the Svelte client and the backend.
*   **Live Mutation Broadcasting:** If Admin A (on their phone) logs a payment, the backend must instantly broadcast an event payload over the WebSocket. Admin B's (on their desktop) local IndexedDB intercepts this, updates itself, and Svelte reactively updates the screen without anyone pressing "refresh".

# SYSTEM DIRECTIVE: Ultra-Performance Overhaul (Phase 3 - Mobile Browser & Native Feel)

## Core Instruction for AI Agent
The ERP is being deployed exclusively for mobile browsers (Safari/iOS, Chrome/Android). The goal is to make the Svelte web application indistinguishable from a natively compiled iOS/Android app. 

You must optimize DOM memory, stabilize the mobile viewport, and implement aggressive touch-feedback ergonomics. Execute the following changes.

---

## 1. Viewport & Layout Stabilization
Mobile browsers constantly resize the screen when the address bar appears/disappears while scrolling. This causes jarring UI jumps.
*   **Dynamic Viewport Heights:** Replace all instances of `height: 100vh` and `h-screen` with `min-h-[100dvh]` (Dynamic Viewport Height). This ensures bottom navigation bars are never hidden under the Safari/Chrome UI.
*   **Safe Area Padding:** Apply iOS Notch and Android Pill padding to the root layout: `padding-top: max(16px, env(safe-area-inset-top));` and `padding-bottom: max(16px, env(safe-area-inset-bottom));`.
*   **Kill Browser Bouncing:** Apply `overscroll-behavior-y: none;` to the `<body>` to stop the entire website from rubber-banding when the user pulls down from the top of the screen.

---

## 2. Touch Ergonomics & Interaction Speed
Web buttons feel sluggish compared to native app buttons because they lack immediate tactile feedback.
*   **Kill Tap Highlights:** Add `-webkit-tap-highlight-color: transparent;` globally to stop the browser from flashing blue/gray when an element is tapped.
*   **Active States:** Replace CSS `:hover` states with `:active` states on all touch targets. Add classes like `active:scale-95 active:opacity-80 transition-transform` to buttons and list items so they physically compress the millisecond the user touches them.
*   **Disable Double-Tap Zoom:** Add `touch-action: manipulation;` to all interactive elements to prevent the browser from waiting 300ms to see if the user is double-tapping to zoom.

---

## 3. DOM Memory Management (Virtualization)
Mobile browsers will trigger an Out-Of-Memory (OOM) crash if you render 1,000 Sales Invoices or Scrap items into the DOM at once.
*   **Implement Virtual Scrolling:** Use a virtualization library (like `@tanstack/svelte-virtual` or `svelte-virtual-list`) for the Cashbook Ledger, Invoice History, and Spares/Scrap lists. 
*   **Logic:** The browser should only render the 10 rows currently visible on the screen, recycling the DOM nodes as the user scrolls. This keeps RAM usage perfectly flat regardless of how large the database gets.

---

## 4. App Lifecycle & Battery Throttling
When a user switches to WhatsApp and leaves the ERP in the background, iOS/Android will freeze the tab to save battery, which kills WebSocket connections.
*   **Page Visibility API:** Implement a listener for `document.visibilityState`.
*   **Backgrounding:** When the app is backgrounded (`visibilityState === 'hidden'`), safely close the WebSocket connection and pause any heavy polling/animations.
*   **Foregrounding:** When the user returns to the tab (`visibilityState === 'visible'`), instantly reconnect the WebSocket, ping the backend for any missed events, and re-sync the IndexedDB state to ensure the data isn't stale.

---

## 5. PWA Manifest (Add to Home Screen)
Ensure the app can be installed directly to the phone's home screen, hiding the browser UI entirely.
*   **Manifest.json:** Verify `manifest.json` is configured with `"display": "standalone"`, `"theme_color": "#121212"`, and `"background_color": "#121212"`.
*   **Apple Meta Tags:** Add `<meta name="apple-mobile-web-app-capable" content="yes">` and `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` to the `index.html` head to ensure it launches as a full-screen app on iPhones.

# SYSTEM DIRECTIVE: Hyper-Performance Architecture (The Absolute Limit)

## Core Instruction for AI Agent
The objective is to achieve theoretical maximum web performance, rivaling native C++ applications. The current stack (Svelte + Rust/Bun + MongoDB) is fast, but to become the fastest application on the internet, we must eliminate JSON serialization overhead, utilize browser multithreading, and enforce zero-latency network transport.

Execute the following extreme optimizations across the entire system.

---

## 1. DATA TRANSPORT: Kill JSON & Enforce HTTP/3
JSON serialization/deserialization is a massive CPU bottleneck when parsing thousands of inventory or ledger records on a mobile device.
*   **Protocol Buffers (Protobuf) / FlatBuffers:** Strip out all `JSON.stringify()` and `JSON.parse()`. Implement Protobuf or FlatBuffers for all API payloads. The Rust backend will serialize data into binary streams, and the Svelte frontend will deserialize the binary directly. This is up to 10x faster than JSON and uses a fraction of the bandwidth.
*   **WebTransport (HTTP/3):** Upgrade the WebSocket architecture to the **WebTransport API** utilizing HTTP/3 (QUIC protocol). This eliminates TCP head-of-line blocking. If a packet drops on a weak mobile connection, it will not freeze the rest of the live telemetry feed.

---

## 2. MULTITHREADING: Web Workers & WebAssembly (Wasm)
JavaScript is single-threaded. If the browser is calculating the aggregate yield of 10,000 paddy lots, the UI will drop frames. We must unblock the main thread completely.
*   **Web Worker State Engine:** Move the *entire* IndexedDB database, syncing logic, and heavy state management off the main UI thread and into a dedicated Web Worker. The main Svelte thread should do nothing but paint the DOM and listen for user taps.
*   **Rust to WebAssembly (Wasm):** For complex business logic (e.g., recalculating the entire Cashbook ledger due to an invoice modification, or predictive harvest analytics), compile those specific Rust functions to WebAssembly (`.wasm`). Execute the Wasm binary directly inside the Web Worker for near-native CPU speeds inside the mobile browser.

---

## 3. RENDERING ENGINE: Hardware Acceleration & Paint Locking
Force the mobile device's GPU to do the heavy lifting, bypassing the CPU DOM renderer.
*   **GPU Layering:** Apply `transform: translateZ(0)` and `will-change: transform, opacity` to all sidebars, bottom sheets, and popup modals. This forces the mobile browser to composite these elements on the GPU, guaranteeing 60fps animations even on old Android phones.
*   **Content Visibility:** Add `content-visibility: auto; contain-intrinsic-size: 100px;` to all list items (Invoices, Spares, Ledger rows) that are currently off-screen. This tells the browser engine to completely skip rendering and layout calculations for anything not currently in the viewport.
*   **OffscreenCanvas:** For the dashboard charts (Profit/Loss, Yield Analytics), move the Chart.js/Canvas rendering into a Web Worker using `OffscreenCanvas`. This ensures complex visual graphs render instantly without stuttering the scroll experience.

---

## 4. BACKEND & EDGE: Zero-Latency Hot Paths
MongoDB is fast, but disk-reads still take milliseconds. We need microsecond responses.
*   **Redis In-Memory Hot Cache:** Deploy a Redis instance in front of the Rust/Bun API. Any Master Data (Suppliers, Active Godowns, Active Machinery) must be served entirely from RAM. MongoDB is strictly for permanent write-storage and cold reads.
*   **Zero-Copy Deserialization (Rust):** Ensure the Rust backend utilizes the `rkyv` framework or `serde` with zero-copy features. The server should map data directly from the database into memory and blast it to the network socket without ever allocating new memory strings.
*   **Preconnect & DNS Prefetch:** Inject `<link rel="preconnect">` and `<link rel="dns-prefetch">` in the `index.html` head for the CDN and API domains. The browser will negotiate the TLS handshake before the Svelte app even finishes loading, saving 100-300ms on the first API call.

---
**Agent Execution Command:**
Commence the rewrite. Begin by stripping JSON payloads on the `GET /invoices` and `GET /inventory` endpoints, replacing them with binary Protobuf schemas. Next, extract all IndexedDB interaction logic into a standalone Web Worker file and implement a message-passing interface with the Svelte stores. Output the strict implementation code.

