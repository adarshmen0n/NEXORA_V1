# AGENTS.md — Antigravity Multi-Developer AI Operating Contract (Permanent)

> **Target Audience:** All AI Coding Assistants (Google Antigravity, Gemini Code Assist, Cursor, Claude Code) operating on either **Adarsh's** or **Dhanushya's** workstation.
> **Project:** NEXORA (Next-generation Explainable Route Optimization & Retrieval Assistant)
> **Lifecycle Coverage:** V1 Baseline ➔ V2 Fleet Scaling ➔ V3 Smart Transit ➔ V4 Municipal Command ➔ V-FINAL Production Finish.

---

## 1. Multi-Developer Context & Long-Term Roles

NEXORA is engineered cooperatively by a two-person team using **Google Antigravity**:

| Developer | GitHub Username | Core Domain & Long-Term Responsibilities | Primary Working Branch |
| :--- | :--- | :--- | :--- |
| **Adarsh** | `adarshmen0n` | **System Architect & Infrastructure Lead:** Backend FastAPI engine, SQLite/PostgreSQL architecture, security/JWT, telemetry ingestion, IoT gateway, CI/CD pipelines, and cloud deployment. | `adarsh-work` / `main` |
| **Dhanushya** | `Dhanushya-lzs13` | **Feature Engineering & Transit Experience Lead:** Multi-bus frontend scaling, passenger experience, real-time crowding sensors, digital QR ticketing, PWA offline caching, and administrative analytics dashboards. | `dhanushya-v2` |

**Canonical Repository:** `https://github.com/adarshmen0n/NEXORA_V1.git`

Both developers run Antigravity instances on separate physical machines. The AI must act as an institutional team member that maintains total code integrity, adheres to architectural patterns, and never introduces conflicting or destructive changes.

---

## 2. The Zero-Destruction Policy (Strict Permanent Rule)

The NEXORA V1 codebase is fully functioning, deployed on Render, and validated by **21 automated pytest test suites**. 

When working on ANY phase or feature from V1 to V-FINAL:

1. **NEVER delete, overwrite, or break established functionality**:
   - Authentication & Role-Based Access Control (`ADMIN`, `DRIVER`, `PASSENGER`, `RESPONDER`).
   - Hardware GNSS Mobile GPS Telemetry (Driver cockpit, Passenger tracking, Responder location).
   - Two-Step Confirmed Emergency SOS Pipeline with dynamic 35.0 km geofencing.
   - Responder Tactical Map with auto-centering on victim SOS, dynamic Haversine distance, and 10 km POI tactical overlay.
   - Dual-channel WebSocket synchronization (`/ws/tracking/{client_id}` and `/ws/sos`).
   - Multi-tier hybrid reverse geocoder (OSM Nominatim with Coimbatore POI fallback).
2. **NEVER run destructive Git commands**:
   - `git push --force` or `git push -f` is **STRICTLY PROHIBITED** on all branches.
   - `git reset --hard` must never be run on uncommitted shared work.
   - Never delete remote branches `main`, `adarsh-work`, or `dhanushya-v2`.
3. **NEVER commit sensitive credentials**:
   - Never commit `.env`, private tokens, or secrets.
   - Keep `.env.example` updated with mock placeholders when adding new environment keys.

---

## 3. Git Branching & Synchronization Discipline Across All Phases

### Branch Structure

```
origin/main (PROTECTED - Production Baseline - Tagged releases: v1.0.0, v2.0.0, etc.)
   │
   ├── origin/adarsh-work    (Adarsh's architectural & infrastructure branch)
   │
   └── origin/dhanushya-v2   (Dhanushya's feature engineering branch)
         │
         ├── feature/dhanushya-fleet-scaling
         ├── feature/dhanushya-crowd-density
         ├── feature/v3-qr-ticketing
         └── feature/v4-command-center
```

### Daily Operating Protocol for Antigravity

Before writing or editing code on any machine:
1. **Check active branch**: Ensure you are on your designated branch (`adarsh-work` or `dhanushya-v2`).
2. **Pull upstream changes**:
   ```powershell
   git fetch origin
   git merge origin/main --no-edit   # Keep your branch up-to-date with production baseline
   ```
3. **Run automated test suite before starting**:
   ```powershell
   python -m pytest tests/ -v
   ```
4. **Implement changes incrementally** with atomic, scoped commits.
5. **Run automated test suite before pushing**:
   ```powershell
   python -m pytest tests/ -v
   ```
6. **Push to your designated remote branch**:
   ```powershell
   git push origin <your-branch-name>
   ```

---

## 4. Phase-by-Phase Evolutionary Invariants

When extending the system across phases, follow these architectural rules:

### A. Phase 2 (V2: Fleet Scaling & PWA)
- **Multi-bus Support**: `Bus` model must support multiple active buses without breaking `BUS-001`.
- **Occupancy Telemetry**: Add `occupancy_level` (`seats_available`, `standing_only`, `full`) to `BusResponse` schema with safe defaults so V1 clients don't crash.
- **PWA Integrity**: Service worker must cache static assets while bypassing real-time WebSocket and telemetry endpoints.

### B. Phase 3 (V3: Smart Transit & QR Ticketing)
- **Token Security**: QR boarding pass tokens must be cryptographically signed using the existing `SECRET_KEY` and include an expiration timestamp (`exp`).
- **Explainable ETA Formula**: AI arrival predictions must factor in:
  $$\text{ETA} = \frac{\text{Haversine Distance}}{\text{Live Speed}} + (\text{Remaining Stops} \times \text{Dwell Time}) + \text{Traffic Delay}$$

### C. Phase 4 (V4: Municipal Command & IoT Gateway)
- **IoT Payload Schema**: Telemetry from microcontrollers (ESP32/SIM800L) must pass through a strict Pydantic validator before hitting the tracking service.
- **Database Scalability**: Any schema additions must include backward-compatible SQLAlchemy migrations that work identically on SQLite and PostgreSQL.

### D. Phase 5 (V-FINAL: Production Finish)
- **GitHub Actions**: Continuous integration must run all test suites on every pull request.
- **Documentation**: Final defense presentation and thesis report must be kept in sync with code reality.

---

## 5. Testing & Quality Assurance Standard

- **Current Baseline:** 21 passing automated tests in `tests/`.
- **Target Across Phases:**
  - V1: 21 tests (100% Passing)
  - V2: 27 tests (+6 tests for fleet scaling and crowding)
  - V3: 35 tests (+8 tests for QR ticketing and ETA predictions)
  - V4: 41 tests (+6 tests for IoT gateway and command metrics)
  - V-FINAL: 45+ tests (full regression and stress tests)
- **Rule:** Every pull request into `main` MUST maintain 100% green tests. Never merge failing code.

---

## 6. Commit Message Convention

```
<type>(<scope>): <short description>
```

- `feat(v2-fleet)`: Multi-bus dynamic visualization
- `feat(v2-crowd)`: Bus crowding sensor telemetry
- `feat(v3-qr)`: Digital QR ticketing engine
- `feat(v4-iot)`: ESP32 hardware telemetry gateway
- `fix(gps)`: Geolocation calibration or bugfix
- `docs(lifecycle)`: Documentation or roadmap updates
- `test(v2)`: Adding new test suites
