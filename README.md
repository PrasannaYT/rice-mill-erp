# 🌾 Rice Mill ERP – Next-Gen Industrial Enterprise Management Platform

![Rice Mill ERP Banner](https://raw.githubusercontent.com/username/repository/main/public/reel_analytics.png)

A high-performance, full-stack Enterprise Resource Planning (ERP) platform built for modern industrial rice mills. Features real-time procurement tracking, automated weighbridge integration, parboiling & milling yield analytics, multi-godown inventory valuation, double-entry financial accounting, fleet management, and automated GST billing.

---

## ✨ Key Features & Modules

### 🌾 1. Paddy & Grain Procurement
- **Dual Intake Classification**: Automatic tagging for `PADDY` (raw agricultural grain) vs. `RICE` (processed commercial rice).
- **Quality & Moisture Deduction**: Automated net weight calculation based on moisture percentage and bag tare weights.
- **Supplier Provenance Ledger**: Comprehensive history of farmers, traders, and mandi procurement slips.

### ⚖️ 2. Weighbridge & Logistics
- Integrated weighbridge ticket entry (Gross Weight, Tare Weight, Net Weight calculation).
- Driver, vehicle registration number, and transport freight logs.

### ⚙️ 3. Industrial Milling Engine
- Batch lot creation, parboiling monitoring, and high-capacity milling progress tracking.
- Automated yield calculations (Head Rice %, Broken Rice %, Rice Bran %, Husk %).
- Loss & Moisture Shrinkage Analytics.

### 🏬 4. Multi-Godown Inventory & Packaging
- **Live Stock Valuation**: Automatic category-based standard valuation (Rice @ ₹45/kg, Paddy @ ₹28/kg).
- **Consolidated Packaging Inventory**: Brand & Weight Category grouping with low-stock alerts (< 200 bags).
- **Maintenance Spares & Scrap Yard**: Automatic grouping of duplicate scrap entries, aggregated weights, and zero-quantity auto-archiving.

### 💰 5. Accounting & Financial Intelligence
- Double-entry bookkeeping engine powering Cashbook, Daybook, General Ledger, and Trial Balance.
- Automated GST Tax Invoice generation with PDF download capabilities.
- Real-Time Profit & Loss Statements and Balance Sheet generation.

### 🚗 6. Fleet & Vehicle Operations
- Kilometers tracked, fuel consumption logs, and trip cost allocation.
- Routine vehicle maintenance schedules and driver assignment.

### 🎥 7. Cinematic Welcome Reel & Sign-Out Safety
- **4K HDR Video Welcome Splash**: Glassmorphic overlay card, photorealistic 3D golden rice grains atmosphere, 3D brutalist gold emblem, and live system status loading bar.
- **Sign Out Confirmation**: Security confirmation modal protecting user sessions.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 15 App Router](https://nextjs.org/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Database & ORM** | [Prisma ORM](https://www.prisma.io/) with PostgreSQL / SQLite |
| **Authentication** | [NextAuth.js](https://next-auth.js.org/) (Credentials Provider) |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS Design Tokens |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Icons** | [Lucide React](https://lucide.dev/) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.x or higher)
- npm (v9.x or higher)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/rice-mill-erp.git
   cd rice-mill-erp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-super-secret-key-here"
   ```

4. **Initialize Database**
   ```bash
   npx prisma db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛡️ Security & Performance

- **Production Security Headers**: Configured HTTP security headers (`Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy`, `X-XSS-Protection`).
- **Input Sanitization**: Strictly validated Prisma transactions and typed server actions.
- **Clean Dev Overlays**: Suppressed Next.js development badges and toasts for seamless mobile and desktop rendering.

---

## 📦 Production Build & Deployment

To generate an optimized production bundle:

```bash
npm run build
npm run start
```

### Deploying on Vercel
1. Push your code to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Add `DATABASE_URL` and `NEXTAUTH_SECRET` to Environment Variables.
4. Deploy!

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
