# V1_TO_V2_HANDOFF.md — Adarsh to Dhanushya Technical Handoff Briefing

> **From:** Adarsh (`adarshmen0n`) — Lead Architect, NEXORA V1  
> **To:** Dhanushya (`Dhanushya-lzs13`) — Lead Feature Engineer, NEXORA V2  
> **Date:** September 2026  
> **Status:** Production Verified (`v1.0.0`)  

---

## 1. Welcome to NEXORA V2 Development!

Welcome to the team! NEXORA V1 has been built, stabilized, and hardened with a complete automated test suite (21/21 passing tests), a live deployment on Render, and real-world field-tested mobile GPS telemetry across Coimbatore.

Our goal for **V2** is to elevate this solid foundation into an institutional-grade, multi-bus municipal transit network while preserving every single safety invariant and architectural standard established in V1.

---

## 2. What Works in V1 (Your Stable Foundation)

Before adding any new feature, familiarise yourself with the V1 baseline:

1. **Unified Single Page Application (SPA)**:
   - All 4 portals (`Admin`, `Driver`, `Passenger`, `Responder`) live within `frontend/index.html` and are orchestrated by `frontend/app.js`.
   - A single top navigation bar provides instant 1-tap switching between roles using pre-seeded demo accounts.
2. **Real Hardware GNSS Telemetry**:
   - Zero hardcoded mock coordinates. Driver and Passenger portals use the browser's native `navigator.geolocation.watchPosition` with high accuracy.
   - Real-time coordinates stream via WebSockets (`/ws/tracking/{client_id}`) and update Leaflet map markers dynamically.
3. **Strict 2-Step Emergency SOS**:
   - The SOS button is locked in an inert state until a genuine GPS fix is acquired.
   - Tapping opens a confirmation modal displaying the victim's exact physical coordinates and reverse-geocoded street address, accompanied by a **3-second safety countdown** to prevent accidental triggers.
4. **Responder Tactical Radar (35.0 km Coverage)**:
   - Emergency tickets broadcast to all responders within Coimbatore (35.0 km radius).
   - Responders hear an audible alert chime, view a pulsing victim marker on the map, and can progress the rescue lifecycle: `pending` ➔ `acknowledged` ➔ `en_route` ➔ `resolved`.
   - The map auto-centers directly on the victim's location and displays nearby emergency facilities (hospitals, police stations, fire brigades within 10 km).
5. **Multi-Tier Hybrid Reverse Geocoder**:
   - Primary: OpenStreetMap Nominatim reverse geocoding API.
   - Secondary: Local offline Coimbatore Point of Interest (POI) catalog (`frontend/coimbatore_pois.js` and `backend/routers/pois.py`).
   - Fallback: Exact formatted coordinates (`11.0168° N, 76.9674° E`).

---

## 3. The "DO NOT BREAK" List (Critical Invariants)

Please review this list before modifying any existing backend endpoint or frontend component:

> [!CAUTION]
> **Strict Constraints:**
> 1. **Do not remove or alter existing authentication endpoints** (`/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/me`). The existing JWT tokens and PBKDF2 hashing must remain backward compatible.
> 2. **Do not bypass the 2-step Emergency SOS confirmation modal** or remove the 3-second safety countdown.
> 3. **Do not change coordinate conventions**: Coordinates must always be stored and passed as decimal degree pairs `(latitude, longitude)`.
> 4. **Do not modify Haversine distance units**: All distance calculations must return kilometers (`km`).
> 5. **Do not dismantle the SPA into separate HTML files**: Keep the single unified application structure (`frontend/index.html`).
> 6. **All 21 existing tests in `tests/` must remain GREEN at all times**: If you refactor a function, ensure the tests pass or update the tests without weakening assertions.

---

## 4. Known Technical Debt & Opportunities for V2

While V1 is robust, the following areas were intentionally scoped for V2:

| Area | V1 Current State | V2 Target Architecture |
| :--- | :--- | :--- |
| **Fleet Capacity** | Single active bus (`BUS-001`) for clear pipeline demo | Multi-bus fleet dispatching across multiple Coimbatore routes simultaneously |
| **Crowd Density** | Static capacity indicator in database | Real-time passenger occupancy monitoring (Low / Medium / Full) |
| **Ticketing** | Informational tracking only | Digital QR ticketing, passenger boarding scans, or UPI pass integration |
| **Database** | SQLite (`nexora.db`) | Scalable PostgreSQL database with async SQLAlchemy connection pool |
| **Offline Resilience** | Browser memory caching | Progressive Web App (PWA) Service Worker for offline route schedules |
| **Driver Analytics** | Basic speed and heading | Speed limit alerts, off-route warnings, schedule adherence scoring |

---

## 5. V2 Roadmap & Dhanushya's Priorities

Here is the suggested implementation order for your V2 development:

### Milestone 1: Multi-Bus Fleet Scaling (Target: `dhanushya-v2`)
- Expand `backend/routers/buses.py` and `frontend/app.js` to dynamically render multiple active buses on the map with individual route lines and distinct marker colors.
- Allow the Admin portal to assign drivers to different buses (`BUS-002`, `BUS-003`).

### Milestone 2: Live Bus Occupancy & Crowding Indicator
- Add `occupancy_level` (`low`, `moderate`, `crowded`, `standing_only`) to the `Bus` model and `BusResponse` schema.
- Add an in-cab toggle in the Driver Cockpit so the driver can quickly update occupancy with 1 tap.
- Display a color-coded crowding badge on the Passenger tracking screen.

### Milestone 3: Route Schedule & Timetable Matrix
- Build an interactive timetable view showing upcoming scheduled trips from major Coimbatore terminals (Gandhipuram Central, Ukkadam, Singanallur, Mettupalayam Road).

### Milestone 4: Progressive Web App (PWA) Capabilities
- Add `manifest.json` and a service worker to enable "Add to Home Screen" on Android and iOS devices, with offline viewing of bus stop locations.

---

## 6. Recommended First PR Workflow for Dhanushya

1. Clone the repository:
   ```powershell
   git clone https://github.com/adarshmen0n/NEXORA_V1.git
   cd NEXORA_V1
   ```
2. Checkout your dedicated branch:
   ```powershell
   git checkout dhanushya-v2
   ```
3. Set up your virtual environment and verify V1 tests:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python -m pytest tests/ -v
   ```
4. Create a feature branch for your first enhancement:
   ```powershell
   git checkout -b feature/dhanushya-fleet-scaling
   ```
5. Commit with conventional commit messages, push to GitHub, and open a Pull Request targeting `dhanushya-v2` or `main`.
