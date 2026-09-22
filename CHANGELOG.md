# CHANGELOG — NEXORA Release History

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-09-22 (Production Baseline Tag: `v1.0.0`)

### Added
- **Unified Single Page Application (SPA)**: Consolidated transit ecosystem running from a single URL (`frontend/index.html`), seamlessly switching between Admin, Driver, Passenger, and Responder cockpits.
- **Role-Based Access Control (RBAC)**: Secure stateless JWT token authentication with PBKDF2 password encryption across 4 defined roles:
  - `ADM-001` (Admin Master Fleet Operator)
  - `DRV-001` (Bus BUS-001 Driver In-Cab Cockpit)
  - `PAX-001` (Commuter Live Tracking & Emergency SOS)
  - `RSP-001` (Coimbatore City Emergency Dispatcher)
- **Genuine Mobile Hardware GNSS Telemetry**: Client-side GPS engine utilizing `navigator.geolocation.watchPosition` with high accuracy, streaming updates via WebSockets (`/ws/tracking/{client_id}`) and REST fallbacks.
- **Strict 2-Step Emergency SOS Workflow**: Locked inert button until valid GPS is acquired; 3-second countdown confirmation modal displaying coordinates and reverse-geocoded street address before dispatching.
- **Tactical Responder Operations Radar**: Instant dispatch within 35.0 km Coimbatore metro radius; dynamic Haversine distance math; auto-centering Leaflet map; 10 km POI tactical overlay (hospitals, police, fire stations).
- **Multi-Tier Hybrid Reverse Geocoder**: High-precision address resolution combining OpenStreetMap Nominatim with a curated local catalog of 50+ Coimbatore points of interest.
- **Automated Verification Suite**: 21 passing automated pytest tests in `tests/` covering authentication, telemetry, SOS lifecycle, and system health.
- **Cloud Infrastructure & Remote Testing**: Cloudflare Tunnel integration (`start_tunnel.bat`) allowing real-world testing from mobile devices over 4G/5G; Render deployment configuration (`render.yaml`).

### Fixed
- Resolved passenger GPS null reference error on initial map render.
- Eliminated silent fallback to mock coordinates; ensured genuine hardware satellite coordinates are preserved.
- Corrected responder tactical radar to center on the active SOS victim rather than responder location.
- Fixed Haversine distance calculation to report exact spherical distances within 0.1 km accuracy.
- Enabled bidirectional WebSocket synchronization between driver cockpit, passenger tracker, and responder console.

---

## [2.0.0-dev] — Planned V2 Milestones (Lead: Dhanushya)

### Planned
- **Multi-Bus Fleet Scaling**: Dynamic tracking and visualization for concurrent buses across multiple Coimbatore bus routes.
- **Live Crowding & Occupancy Telemetry**: In-cab occupancy toggle for drivers and color-coded seat availability for passengers.
- **PWA Service Worker**: Full offline support for bus schedules and stop lists in low-connectivity areas.
- **Digital Ticketing & QR Validation**: Simulated QR boarding passes and fare payment status.
- **Advanced Driver Telemetry**: Speed alerts, schedule adherence scoring, and automated delay notifications.
