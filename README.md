# SunPower Solutions - Solar Installation Management System (ERP)

A full-lifecycle ERP designed for rooftop solar companies (~40 projects/month, 15 technicians) covering the entire workflow:
**Enquiry → Site Survey → Auto-BOM Quote → Order & Deposit → Serial Scan Dispatch → Mobile Installation → Warranty Engine → Service Desk → Finance & Job Costing Dashboard**.

---

## 🌟 Key Highlights & Hackathon Demo Features

1. **Instant 1-Click Role Switcher**: Switch on the fly between **ADMIN**, **SALESMAN**, **WAREHOUSE**, **TECHNICIAN**, **SUPPORT**, and **CUSTOMER** directly from the header dropdown without logging out.
2. **Strict Multi-Tenant Scoping**: All Prisma queries are strictly scoped by `companyId` with relational isolation and JWT authentication.
3. **11 Strict Server-Enforced Business Rules**:
   - **Rule 1 (Leads)**: Never hard-deleted (archive only). 9-stage Kanban (`NEW` → `QUALIFIED` → `SURVEY_SCHEDULED` → `SURVEY_APPROVED` → `QUOTED` → `WON`/`LOST`).
   - **Rule 2 (Survey Gate)**: Quotes **CANNOT** be created unless the site survey is `APPROVED` by sales/engineering.
   - **Rule 3 (Auto-BOM Expansion)**: Package template automatically scales Bill of Materials (panels, inverters, cables, earthing, structures) by system kW, allows line-item edits, and factors in GST + MNRE subsidy notes.
   - **Rule 4 (Transaction Milestone)**: Order confirmation occurs upon advance payment. In **ONE atomic database transaction**, the system confirms the order, creates the Pick List, spawns the Installation Job, and sends team notifications.
   - **Rule 5 (Serial Validation Gate)**: Delivery validation requires scanned serials for all tracked items (panels, inverters). Missing serials trigger a `400 Bad Request` with an exact itemized breakdown of missing units.
   - **Rule 6 (Auto-Warranties)**: Validating delivery in **ONE atomic transaction** auto-creates active `Warranty` records with expiry date calculated as `startDate + product.warrantyYears`.
   - **Rule 7 (Mobile Installation Verification)**: Installation job can only transition to `COMPLETED` when start time, end time, confirmed kW, all 5 checklist verification steps are checked, ≥1 installation photo is provided, and customer signature is captured.
   - **Rule 8 (Warranty Engine & Replacement)**: Live search returns active/expired status and days remaining. In-warranty parts/labour cost ₹0; expired parts automatically generate a GST tax invoice. Swapping a defective component voids the old serial and starts a brand new warranty.
   - **Rule 9 (Job Costing)**: `Profit = Revenue - BOM Cost - Technician Labour Cost - Other Incident Expenses`. Loss-making jobs (`profit < 0`) are automatically flagged in high-contrast red alerts.
   - **Rule 10 (Subsidies & Tech Payouts)**: PM Surya Ghar government subsidy tracker per customer; automated technician wage payouts aggregated from verified `TimeEntry` records.
   - **Rule 11 (Audit Trail)**: Every status change and entity mutation writes an immutable `AuditLog` row with before/after state diffs.
4. **Offline & Hackathon Resilience**: Built-in fallback transforms photos and signatures to DataURIs if external Cloudinary credentials are not configured.
5. **Direct PDF Generation**: Native server-side vector PDF generation (PDFKit) for Quotations, GST Tax Invoices, and Installation Completion Certificates.
6. **Public Expiring Share Link**: Generate tokenized, read-only live executive dashboards (Recharts) with customizable expiry (e.g., 7 days) for investors and auditors without authentication.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Tailwind CSS v4, Lucide Icons, React Router v7, TanStack Query v5, Recharts, `html5-qrcode`, `react-signature-canvas` |
| **Backend** | Node.js + Express, **CommonJS ONLY** (`require`/`module.exports`) |
| **Database** | PostgreSQL + Prisma ORM (26+ models, schema migrations, complete demo seed) |
| **Authentication** | JWT + bcrypt, role-based route guards, and company multi-tenant isolation |
| **File Storage** | Cloudinary via multer memory storage with local base64/dataURI fallback |
| **PDF Generation** | PDFKit (Dynamic Quotations, Invoices, Certificates) |

---

## 👥 Demo Accounts (Credentials)

All accounts share the default password: **`password123`**

| Role | Email | Persona & Primary Dashboard |
| :--- | :--- | :--- |
| **ADMIN** | `admin@sunpower.com` | Arjun Verma (Managing Director) — Full Analytics & Finance |
| **SALESMAN** | `sales@sunpower.com` | Priya Sharma (Sales Executive) — Lead Board & Quote Builder |
| **WAREHOUSE** | `warehouse@sunpower.com` | Rahul Verma (Inventory Manager) — Pick Lists & Serial Scanner |
| **TECHNICIAN** | `tech@sunpower.com` | Vikram Singh (Senior Installer) — Mobile Checklist & Signatures |
| **SUPPORT** | `support@sunpower.com` | Neha Patel (Customer Service) — Warranty Lookup & Tickets |
| **CUSTOMER** | `customer@sunpower.com` | Ananya Deshmukh (Client) — Live Milestone Tracker & Portal |

*(Tip: You can use the Quick-Switch dropdown at the top of the app sidebar to switch between any persona in 1 click!)*

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL running locally (default: `localhost:5432/solar_management`)

### 1. Database Setup & Seeding
In the `server/` directory, configure your `.env` file:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/solar_management?schema=public"
JWT_SECRET="solar_secret_jwt_key_hackathon_2026"
PORT=5000
CLIENT_URL="http://localhost:5173"
```

Run database migrations and seed realistic solar business data:
```bash
cd server
npm install
npx prisma migrate dev --name init_solar_management
npm run seed
```

### 2. Frontend Setup
```bash
cd ../client
npm install
npm run build   # Verifies bundle compilation
```

### 3. Run Development Servers
From the root directory:
```bash
npm run dev
```
Or start individually:
- **Backend API**: `cd server && npm run dev` → `http://localhost:5000`
- **Frontend App**: `cd client && npm run dev` → `http://localhost:5173`

---

## 🧪 Automated End-to-End Verification Suites

The repository includes comprehensive automated test suites verifying all 11 business rules against live database transactions:

```bash
cd server

# Verify Phase 1 to Phase 4 (Leads, Surveys, Quotes, Orders, Picklists, Serial Scanning, Delivery)
node test_phase3_phase4.js

# Verify Phase 5 & 6 (Installation Job Completion, Warranties, Swaps, Costing, PDFs, Shared Dashboard)
node test_phase5_phase6.js
```

---

## 📱 Mobile-First Workflows

- **Technicians (`/technician/jobs/:id`)**: Optimized for mobile viewports. Includes touch-friendly checklist switches, camera file uploads for installation photos, and a touch-responsive canvas for customer signatures.
- **Customers (`/customer-portal`)**: Mobile-first portal showing real-time milestone progress, installed equipment serial numbers with days remaining on warranty, 1-click support ticket creation, and proposal downloads.