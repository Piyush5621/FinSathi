# 💼 Karobar (कारोबार) — Intelligent Business & Stock OS for Indian MSMEs

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.2.0-blue.svg)](https://react.dev/)
[![Vite Version](https://img.shields.io/badge/vite-7.2.1-purple.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/tests-85%2F85%20passing-success.svg)](backend/package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **Karobar** is an all-in-one, mobile-first Business Operating System engineered specifically for Kirana stores, retail merchants, distributors, and wholesalers across India. It simplifies POS billing, automates FEFO/FIFO inventory tracking, manages customer credit (*Udhaar*) with WhatsApp payment links, generates GST-compliant reports (GSTR-1, GSTR-3B), forecasts 14-day cash flow, and answers business queries in Hindi and Hinglish voice.

---

## 🚀 Key Features

* **⚡ Ultra-Fast POS Billing**: 10-second checkout with barcode scanning (camera & hardware), quick customer selection, and automated multi-tax GST computation.
* **📦 Modern Karobar Stock Engine**: Real-time warehouse balances, FEFO/FIFO batch allocation, variant management (Size/Color/Flavour), and immutable movement audit logs with atomic database row locks.
* **📥 Purchase Order Inwarding**: Automatically increments warehouse stock, creates batch records, and logs movement entries upon receiving supplier shipments.
* **🔄 Sales Returns & Restocking**: Partial or full invoice returns with automatic stock restoration, batch reversal, and customer Khata credit balance adjustment.
* **📒 Customer Khata Ledger**: Real-time credit tracking with automated FIFO partial debt repayments, payment history, and one-click WhatsApp payment reminders.
* **📶 Offline POS Billing**: Local IndexedDB queueing allowing uninterrupted billing during network dropouts, with automatic background sync and idempotency protection upon reconnection.
* **📊 GST Filing Center**: Instant generation and Excel export of GSTR-1 and GSTR-3B summaries with B2B, B2CL, B2CS, and HSN breakdowns.
* **🧠 Financial Intelligence & Caching**: Business Health Score (0–100), 14-Day Cash Flow Forecast, daily briefs, and tenant-isolated Redis cache invalidation.
* **🎙️ FinVoice AI Assistant**: Natural language voice and text queries in Hindi/Hinglish (*"Aaj kitna bika?"*, *"Konsa item low stock pe hai?"*) powered by Google Gemini and Deepgram.
* **🤝 B2B Trade Network**: Discover verified suppliers, issue digital purchase orders, track supplier credit, and view trust scores.

---

## 🏗️ Architecture & Technology Stack

```
Karobar Monorepo
├── backend/                  # Express.js REST API with Domain-Driven Modularity
│   ├── src/
│   │   ├── modules/          # Core Domain Subsystems
│   │   │   ├── identity/     # IAM, JWT, Sessions, RBAC, Rate Limiting
│   │   │   ├── masters/      # UOMs, Categories, Brands, Warehouses
│   │   │   ├── catalog/      # Products, Variants, Barcode Registries, SKUs
│   │   │   ├── inventory/    # StockService, BatchSelectionEngine, Movements
│   │   │   └── network/      # B2B Trade Directory, Partner Connections
│   │   ├── services/         # SalesService, GstService, CashFlowService, AIService
│   │   ├── controllers/      # Route controllers
│   │   └── server.js         # Express app entry point & middleware stack
│   └── tests/                # 16 automated test suites (85/85 passing)
│
├── frontend/                 # React 18 + Vite 7 Single Page Application (PWA)
│   ├── src/
│   │   ├── pages/            # Billing (POS), Inventory, Khata, GST, AI Advisor
│   │   ├── components/       # Shared UI components & layout
│   │   ├── services/         # Axios API client with 401 token auto-refresh
│   │   └── main.jsx          # React app root
│   └── vite.config.js        # Vite config with PWA Service Worker precaching
```

---

## 🛠️ Quick Start

### Prerequisites
* Node.js `>= 20.0.0`
* Supabase PostgreSQL instance
* Redis (Optional for local development; in-memory cache/queues used as fallback)
* Google Gemini API Key (for FinVoice AI)

### 1. Clone & Install
```bash
git clone https://github.com/Piyush5621/FinSathi.git
cd FinSathi

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Create `.env` in `backend/`:
```env
PORT=5001
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
GEMINI_API_KEY=your_gemini_api_key
REDIS_URL=redis://127.0.0.1:6379 # Optional
```

### 3. Run Tests
```bash
cd backend
npm test
```
*Expected: 74 / 74 tests passing across 15 suites.*

### 4. Start Development Servers
```bash
# Start backend (from backend/)
npm run dev

# Start frontend (from frontend/)
npm run dev
```

### 5. Build for Production
```bash
cd frontend
npm run build
```

---

## 👥 Demo Accounts

The database comes pre-seeded with specialized demo business accounts for testing:

| Role | Email | Password | Business Name |
| :--- | :--- | :--- | :--- |
| **Retail Owner** | `owner@shreenathji.karobar` | `Karobar@2026` | Shree Nathji Kirana & Supermarket |
| **Wholesale Owner** | `owner@vermatraders.karobar` | `Karobar@2026` | Verma Traders FMCG Wholesale |
| **Apparel Owner** | `owner@shreeramapparel.karobar` | `Karobar@2026` | Shree Ram Apparels & Textiles |
| **Store Manager** | `manager@shreenathji.karobar` | `Karobar@2026` | Shree Nathji Kirana & Supermarket |
| **Cashier / POS** | `cashier@shreenathji.karobar` | `Karobar@2026` | Shree Nathji Kirana & Supermarket |
| **Accountant** | `accountant@shreenathji.karobar` | `Karobar@2026` | Shree Nathji Kirana & Supermarket |
| **Super Admin** | `admin@karobar.com` | `finadmin123` | Karobar Command Center |

---

## 📜 License
This project is licensed under the MIT License.
