<div align="center">

# FinSathi (कारोबार / Karobar)

### The mobile-first Business Operating System for Indian MSMEs

POS billing · Multi-batch inventory · GST reporting · Business credit scoring · B2B trade network · Hindi/Hinglish voice assistant

![Version](https://img.shields.io/badge/version-1.0.0--RC1-blue)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=white)
![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-339933?logo=node.js&logoColor=white)
![Database](https://img.shields.io/badge/database-Supabase%20PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Queue](https://img.shields.io/badge/queue-Redis%20%2B%20BullMQ-DC382D?logo=redis&logoColor=white)

[Features](#-key-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [Scripts](#-available-scripts) · [Documentation](#-documentation)

</div>

---

## 📖 Overview

**FinSathi** (marketed as **Karobar / कारोबार**) is an intelligent, mobile-first Business Operating System built for India's Micro, Small and Medium Enterprises (MSMEs). It moves merchants from traditional, reactive bookkeeping to **proactive, AI-driven business management** by bringing everyday operations into a single platform:

- Point-of-sale billing and invoicing
- Multi-batch inventory tracking
- CIBIL-style business health and credit scoring
- GST compliance reporting
- A conversational voice assistant (**FinVoice**) that understands Hindi and Hinglish
- A B2B business network for partner discovery, trade and trade credit

---

## ✨ Key Features

| Module | What it does |
| --- | --- |
| **POS Billing Terminal** | Real-time customer search, barcode input, automatic tax calculation and inventory decrement on sale |
| **FinVoice (Voice AI)** | Hindi/Hinglish transcription and natural-language ledger summaries |
| **Inventory & Multi-Batch** | Stock counting, per-batch cost tracking, margin analysis and low-stock alerts |
| **Business Health Score** | Algorithmic 0–100 score across 5 parameters, persisted automatically every day |
| **GST Reporting** | GSTR-oriented reports for compliance |
| **Customers & CRM** | Customer ledgers, payment tracking and relationship management |
| **Suppliers & Logistics** | Supplier management, purchase orders and logistics |
| **Workforce & Payroll** | Staff management, attendance and payroll |
| **RBAC & Admin** | Role-based access control with multi-tenant organizations and store branches |
| **B2B Business Network** | Partner discovery, trade inbox/outbox, stock import, trade credit and reputation |
| **Notifications & Integrations** | Background notifications, webhooks and kiosk endpoints |

---

## 🧱 Tech Stack

**Frontend**
- React (Vite) single-page application, PWA-ready
- React Router, TanStack Query, Zustand
- Tailwind CSS, `lucide-react`
- Axios API client with concurrency-safe token refresh

**Backend**
- Node.js + Express REST API (layered: routes → controllers → services → repositories)
- Supabase (PostgreSQL) for persistence
- Redis + BullMQ for background jobs and event distribution
- JWT authentication with HttpOnly refresh cookies
- Helmet, CORS, compression, rate limiting, correlation-ID tracing

---

## 🏗 Architecture

```
React SPA ──► Axios apiClient ──► Express (middleware: CORS, Helmet, rate limit, auth)
                                        │
                          Routes ► Controllers ► Services ► Repositories
                                        │                        │
                                   Redis / BullMQ           Supabase PostgreSQL
                              (reputation, growth, AI,
                               notifications, analytics…)
```

**Highlights**

- **Auth:** JWT bearer tokens plus HttpOnly-cookie refresh. A refresh lock and request queue prevent race conditions when several calls fail with `401` at once.
- **Plan & suspension handling:** `PLAN_LIMIT_REACHED` redirects to the subscription page; `ACCOUNT_SUSPENDED` clears credentials and shows the suspension notice.
- **Async processing:** BullMQ queues (`reputation`, `growth`, `notification`, `marketplace`, `ai`, `cache`, `analytics`) with exponential backoff and 5 retries. Falls back to an in-memory publisher in tests or when Redis is unavailable.
- **Observability:** Correlation IDs, response-time tracking, performance monitoring and a Bull Board dashboard at `/admin/queues` (when `REDIS_URL` is set).
- **Health checks:** `GET /api/health` and `GET /health`.

---

## 📁 Project Structure

```
karobar/
├── frontend/     # Vite + React SPA (Tailwind CSS, TanStack Query, Zustand)
├── backend/      # Express REST API (Supabase Postgres, BullMQ, Redis)
├── database/     # PostgreSQL migrations, schema dumps and seed datasets
├── design/       # UI/UX mockups, wireframes and brand assets
└── docs/         # Release notes, changelog and project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- A **Supabase** project (PostgreSQL)
- **Redis** (optional locally; required for BullMQ queues and the queue dashboard)

### 1. Clone the repository

```bash
git clone https://github.com/Piyush5621/FinSathi.git
cd FinSathi
```

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure environment variables

**`backend/.env`**

```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key   # or SUPABASE_ANON_KEY
JWT_SECRET=your_strong_jwt_secret
REDIS_URL=redis://localhost:6379
```

**`frontend/.env`**

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> ⚠️ Never commit `.env` files or service-role keys. If Supabase variables are missing on the frontend, a safe mock client is used so the app does not crash in local development.

### 4. Set up the database

Apply the SQL migrations from the [`database/`](./database) directory to your Supabase project.

### 5. (Optional) Seed demo data

```bash
cd backend
npm run seed:demo
```

The seeder is idempotent. It creates multi-tenant organizations, branches and **10 demo accounts covering every RBAC role**, plus 70+ products with multi-batch stock, 25+ customers, 12+ suppliers, sales invoices, payment ledgers and a full B2B network profile.

> Demo accounts use the `@karobar.test` / `@sanchay.test` domains. **Change or remove demo credentials before any public deployment.**

### 6. Run the app

```bash
# Terminal 1 – backend
cd backend
npm run dev

# Terminal 2 – frontend
cd frontend
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

---

## 🧰 Available Scripts

| Location | Command | Description |
| --- | --- | --- |
| Root | `npm run build` | Production build of the frontend |
| `backend/` | `npm run dev` | Start the API with `nodemon` (hot reload) |
| `backend/` | `npm start` | Start the production server (`node src/server.js`) |
| `backend/` | `npm run seed:demo` | Seed the demo environment |
| `backend/` | `npm test` | Run the automated backend test suites |
| `frontend/` | `npm run dev` | Start the Vite dev server |
| `frontend/` | `npm run build` | Build the SPA for production |
| `frontend/` | `npm run lint` | Run ESLint |
| `frontend/` | `npm run preview` | Preview the production build locally |

---

## 🧪 Testing

The backend ships with **16 automated test suites** covering identity and auth, stock flows, POS concurrency and GSTR reporting.

```bash
cd backend
npm test
```

---

## 🗺 Roadmap

Planned modules previewed in the in-app Demo Hub:

- E-commerce storefronts
- Advanced vendor and logistics hub
- Employee portal and HR payroll
- Third-party API developer portal

---

## 📚 Documentation

- [Release Notes – v1.0.0 RC1](./docs/RELEASE_NOTES_v1.0.0_RC1.md)
- [Changelog](./CHANGELOG.md)
- [Current State](./docs/CURRENT_STATE.md)
- [Full code wiki on DeepWiki](https://deepwiki.com/Piyush5621/FinSathi)

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please run `npm run lint` (frontend) and `npm test` (backend) before submitting.

---

## 📄 License

Add your license here (for example, MIT) and include a `LICENSE` file in the repository root.

---

## 👤 Author

**Piyush** – [@Piyush5621](https://github.com/Piyush5621)

<div align="center">

*Built to help Indian merchants run smarter, not harder.*

</div>
