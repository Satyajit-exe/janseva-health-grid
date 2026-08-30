# JANSEVA HEALTH GRID

**"Find Care. Know the Wait. Reach the Right Facility."**

A state-level public healthcare coordination platform built for **SIH26133 — Improving Accessibility and
Quality of Public Healthcare Services (Government of Maharashtra)**.

Full-stack, working application: React + TypeScript frontend, Node/Express/TypeScript backend, MongoDB,
Socket.IO real-time updates, JWT auth with 7 roles, and a seeded Maharashtra demo dataset.

---

## 1. Project structure

```
janseva-health-grid/
├── backend/     Node + Express + TypeScript + Mongoose + Socket.IO REST API
├── frontend/    React + TypeScript + Vite + Tailwind CSS SPA
└── docker-compose.yml   Full stack (Mongo + backend + frontend) in one command
```

## 2. Quick start — Docker (fastest way to a working deployment)

Requires Docker + Docker Compose.

```bash
cd janseva-health-grid
docker compose up --build
```

This starts MongoDB, the API on `http://localhost:5000`, and the frontend on `http://localhost:5173`.

Once containers are up, seed the demo data (Maharashtra districts, facilities, all 7 role accounts, and
the 6 demo scenarios) by running the seed script inside the backend container:

```bash
docker compose exec backend node dist/seed/seed.js
```

Then open `http://localhost:5173` and log in with any demo account (see section 5).

## 3. Quick start — running locally without Docker

### Prerequisites
- Node.js 20+
- A MongoDB instance — either local (`mongod` running on `27017`) or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

### Backend

```bash
cd backend
cp .env.example .env
# edit .env: set MONGODB_URI and a real JWT_SECRET
npm install
npm run seed   # populates demo districts/facilities/users/scenarios
npm run dev    # starts API on http://localhost:5000 with hot reload
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev    # starts on http://localhost:5173
```

Open `http://localhost:5173`.

## 4. Production build (no Docker)

```bash
# Backend
cd backend
npm run build       # compiles to dist/
npm start           # runs dist/server.js

# Frontend
cd frontend
npm run build        # outputs static files to dist/
npm run preview       # local static preview, or deploy dist/ to any static host
```

## 5. Demo accounts

All seeded accounts share the password **`Demo@1234`**.

| Role | Email |
|---|---|
| State Admin | state.admin@janseva.gov.in |
| District Admin (Mumbai) | district.mumbai@janseva.gov.in |
| Facility Admin (Sion Hospital) | admin.sion@janseva.gov.in |
| Facility Staff (Sion Hospital) | staff.sion@janseva.gov.in |
| Pharmacy Staff (Sion Hospital) | pharmacy.sion@janseva.gov.in |
| Doctor (Sion, General Medicine) | doctor.sion@janseva.gov.in |
| Doctor (Nagpur, Cardiology) | doctor.cardio.nagpur@janseva.gov.in |
| Citizen | priya.citizen@example.com |
| Citizen (has an active emergency-priority token) | ramesh.citizen@example.com |
| Citizen | fatima.citizen@example.com |

The login page also has a one-click picker for these accounts.

## 6. Demo scenarios seeded

- **A** — Sion Civil Hospital: overloaded queue (87 waiting patients), CRITICAL pressure.
- **B** — Rajawadi Municipal Hospital: nearby facility with spare capacity, LOW pressure — demonstrates load balancing.
- **C** — Medicine shortages at Sion (low stock, out of stock) and an expired batch at Igatpuri PHC.
- **D** — A pending referral from Sion (General Medicine) to Nagpur Institute of Cardiology, awaiting acceptance.
- **E** — An emergency-priority token at Sion, assigned by facility staff with a logged audit reason.
- **F** — Igatpuri Rural PHC: a small, low-traffic facility representing a low-connectivity rural site.

## 7. What's implemented

- **Auth & RBAC**: JWT, bcrypt password hashing, 7 roles, protected routes on both API and frontend.
- **Smart facility discovery** ("Find the Right Care"): ranked by service match, distance, live queue, pressure.
- **Live queue engine**: token generation, call-next (priority-aware), check-in, consultation lifecycle, skip/no-show,
  emergency priority overrides (audited), all broadcast over Socket.IO rooms.
- **Wait-time estimation**: patients-ahead × average consultation time, clearly labeled as an estimate.
- **Bed management**: per-category (General/ICU/Emergency/Pediatric/Maternity/Isolation) live counts.
- **Medicine finder + pharmacy inventory**: public search across facilities, stock in/out with audit trail,
  automatic status derivation (AVAILABLE/LOW_STOCK/OUT_OF_STOCK/EXPIRED), low-stock notifications.
- **Referral network**: doctor-initiated referrals with a decision-support recommendation engine (ranked by
  specialty match, distance, facility pressure), full status lifecycle, accept/reject with audit logging.
- **My Care Journey**: the unified patient timeline from facility search through care completion — the platform's
  core differentiator.
- **Facility Pressure Index**: configurable weighted score (queue + bed occupancy + doctor availability + referral load).
- **Dashboards for all 7 roles**: Citizen, Facility Staff/Admin, Doctor, Pharmacy Staff, District Admin
  (command center), State Admin (Maharashtra-wide KPIs + district comparison + charts).
- **Public Transparency Mode**: read-only, no-auth dashboard showing aggregate facility status with zero patient data.
- **Notifications**: in-app, real-time via Socket.IO; architecture is integration-ready for SMS/WhatsApp but does
  not claim to send them today.
- **Audit logging**: every sensitive action (bed changes, priority overrides, referral decisions, stock adjustments)
  is recorded with old/new values and viewable via the audit-logs API.
- **Accessibility**: semantic HTML, ARIA labels, visible focus states, `prefers-reduced-motion` support, status
  conveyed by icon+text (not color alone).
- **Connection status indicator**: online/offline awareness on the citizen dashboard per the offline-resilience brief.

## 8. What's intentionally simplified for this build

- **Multilingual UI**: the data model and facility records already carry `languagesSupported` and a
  `preferredLanguage` field per user, but the UI strings themselves are English-only in this pass — the
  translation-dictionary layer is the natural next addition.
- **Interactive Leaflet map view**: `react-leaflet` and `leaflet` are installed and ready to use; the current
  build surfaces facility geolocation through search/ranking and facility detail pages rather than a dedicated
  map screen.
- **SMS/WhatsApp delivery**: notifications are real, persisted, and delivered in-app in real time; external
  channels are deliberately not implemented (see spec note on integration-ready architecture).
- **Offline write queuing**: the app detects and displays connection status; queuing/replaying failed writes
  while offline is not yet implemented.

## 9. Deploying to the cloud (no infrastructure of your own)

A common free/low-cost path:

1. **Database**: create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas), whitelist your
   backend host's IP (or `0.0.0.0/0` for a demo), and copy the connection string into `MONGODB_URI`.
2. **Backend**: deploy `backend/` to [Render](https://render.com), [Railway](https://railway.app), or any
   Node host. Set the environment variables from `backend/.env.example`, use `npm run build` as the build
   command and `npm start` as the start command. Run `npm run seed` once via the host's shell/console.
3. **Frontend**: deploy `frontend/` to [Vercel](https://vercel.com) or [Netlify](https://netlify.com). Set
   `VITE_API_URL` and `VITE_SOCKET_URL` to your deployed backend's URL. Build command `npm run build`,
   output directory `dist`.
4. Update the backend's `CLIENT_URL` env var to your deployed frontend origin so CORS and Socket.IO allow it.

## 10. Security notes

- Never commit `.env` files — only `.env.example` is tracked.
- Rotate `JWT_SECRET` before any real deployment; the example value is a placeholder.
- The `/api/auth/register` route only ever creates `CITIZEN` accounts. Staff/doctor/admin accounts are
  provisioned via the seed script for this demo; in a real deployment they'd go through an admin invite flow.
