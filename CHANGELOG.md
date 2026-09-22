# CHANGELOG — NEXORA Release History & Master Roadmap

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-09-22 (Production Baseline Tag: `v1.0.0`)

### Added
- **Unified Single Page Application (SPA)**: Consolidated transit ecosystem running from a single URL (`frontend/index.html`), seamlessly switching between Admin, Driver, Passenger, and Responder cockpits.
- **Role-Based Access Control (RBAC)**: Secure stateless JWT token authentication with PBKDF2 password encryption across 4 defined roles (`ADM-001`, `DRV-001`, `PAX-001`, `RSP-001`).
- **Genuine Mobile Hardware GNSS Telemetry**: Client-side GPS engine utilizing `navigator.geolocation.watchPosition` with high accuracy, streaming updates via WebSockets (`/ws/tracking/{client_id}`) and REST fallbacks.
- **Strict 2-Step Emergency SOS Workflow**: Locked inert button until valid GPS is acquired; 3-second countdown confirmation modal displaying coordinates and reverse-geocoded street address before dispatching.
- **Tactical Responder Operations Radar**: Instant dispatch within 35.0 km Coimbatore metro radius; dynamic Haversine distance math; auto-centering Leaflet map; 10 km POI tactical overlay (hospitals, police, fire stations).
- **Multi-Tier Hybrid Reverse Geocoder**: High-precision address resolution combining OpenStreetMap Nominatim with a curated local catalog of 50+ Coimbatore points of interest.
- **Automated Verification Suite**: 21 passing automated pytest tests in `tests/` covering authentication, telemetry, SOS lifecycle, and system health.
- **Cloud Infrastructure & Remote Testing**: Cloudflare Tunnel integration (`start_tunnel.bat`) allowing real-world testing from mobile devices over 4G/5G; Render deployment configuration (`render.yaml`).
- **Institutional Collaboration Framework**: Multi-branch setup (`main`, `adarsh-work`, `dhanushya-v2`), permanent AI contract (`AGENTS.md`), full lifecycle roadmap (`FULL_PROJECT_LIFECYCLE_GUIDE.md`), and GitHub Actions CI workflow.

### Fixed
- Resolved passenger GPS null reference error on initial map render.
- Eliminated silent fallback to mock coordinates; ensured genuine hardware satellite coordinates are preserved.
- Corrected responder tactical radar to center on the active SOS victim rather than responder location.
- Fixed Haversine distance calculation to report exact spherical distances within 0.1 km accuracy.
- Enabled bidirectional WebSocket synchronization between driver cockpit, passenger tracker, and responder console.

---

## [2.0.0-dev] — Phase 2: Fleet Scaling, Occupancy & PWA (Current Phase)

### Planned Milestones
- **Multi-Bus Fleet Telemetry**: Ingestion and visualization of multiple buses (`BUS-001`, `BUS-002`, `BUS-003`) operating on distinct Coimbatore transit corridors concurrently.
- **In-Cab Passenger Crowding Sensor**: Real-time occupancy toggle for drivers (`seats_available`, `standing_only`, `full`) and live crowding badge on commuter screens.
- **Terminal Departure Timetables**: Interactive schedule boards for major Coimbatore transit hubs (Gandhipuram, Ukkadam, Singanallur).
- **Progressive Web App (PWA)**: Offline caching service worker (`sw.js`) and app manifest for instant home screen install on mobile phones.

---

## [3.0.0-dev] — Phase 3: Smart Transit Intelligence & Digital QR Ticketing

### Planned Milestones
- **Cryptographic QR Transit Passes**: Commuters generate dynamic QR boarding passes with simulated distance-based fare deductions.
- **In-Cab Camera QR Scanner**: Driver cockpit camera scanner using `html5-qrcode` for instant pass validation.
- **Explainable AI Predictive Arrival (ETA)**: Algorithmic arrival predictions combining live vehicle speed, stop dwell time, and corridor traffic delay.
- **Coimbatore Trip Route Planner**: Multi-hop origin-to-destination transit pathfinder.

---

## [4.0.0-dev] — Phase 4: Municipal Command Center & Hardware IoT Gateway

### Planned Milestones
- **Municipal Command Operations Center**: Tactical oversight console with citywide fleet density heatmaps and incident resolution analytics.
- **Hardware IoT Telemetry Gateway**: Direct telemetry packet ingestion endpoint (`POST /api/v1/iot/telemetry`) for ESP32 / SIM800L / GPS Neo-6M microcontrollers.
- **Enterprise Database & Pub/Sub Broker**: Migration from SQLite to PostgreSQL with connection pooling and Redis Pub/Sub message broker.
- **Incident Forensics**: Comprehensive response-time audit logging and post-incident investigation reports.

---

## [5.0.0-dev] — Phase 5: V-FINAL Institutional Hardening & Final Capstone Defense

### Planned Milestones
- **Production Load & Stress Benchmarking**: Automated simulation of 100+ concurrent buses and 1,000 active passenger GPS streams.
- **OWASP Top 10 Security Audit**: Rate limiting, CORS tightening, HTTPS TLS certificates, and input sanitization.
- **Academic Capstone Deliverables**: Final project report / thesis chapters, presentation slides (`NEXORA.pptx`), and narrated video demonstration.
- **Official Production Tag**: `v-final` release tag on GitHub.
