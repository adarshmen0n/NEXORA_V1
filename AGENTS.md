# AGENTS.md — Antigravity Multi-Developer AI Operating Contract

> **Target Audience:** All AI Coding Assistants (Google Antigravity, Gemini Code Assist, Cursor, Claude Code) operating on either **Adarsh's** or **Dhanushya's** workstation.
> **Project:** NEXORA (Next-generation Explainable Route Optimization & Retrieval Assistant)
> **Baseline Release:** `v1.0.0` (Protected & Verified)

---

## 1. Multi-Developer Context & Team Roles

NEXORA is developed collaboratively by a two-person team using **Google Antigravity**:

| Developer | GitHub Username | Role | Primary Working Branch |
| :--- | :--- | :--- | :--- |
| **Adarsh** | `adarshmen0n` | Original V1 Creator / Lead Architect | `adarsh-work` / `main` |
| **Dhanushya** | `Dhanushya-lzs13` | V2 Lead Developer / Feature Engineer | `dhanushya-v2` |

**Canonical Repository:** `https://github.com/adarshmen0n/NEXORA_V1.git`

Both developers run Antigravity instances on separate physical computers. The AI must act as an institutional team member that maintains total code integrity, adheres to architectural patterns, and never introduces conflicting or destructive changes.

---

## 2. The Zero-Destruction Policy (Strict Rule)

The NEXORA V1 codebase is fully functioning, deployed on Render, and validated by **21 automated pytest test suites**. 

When working on any task or prompt:

1. **NEVER delete, overwrite, or break working V1 functionality**:
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

## 3. Git Branching & Synchronization Discipline

### Branch Structure

```
origin/main (PROTECTED - V1.0.0 baseline - Only merge verified, tested code)
   │
   ├── origin/adarsh-work    (Adarsh's active development & architectural stabilization)
   │
   └── origin/dhanushya-v2   (Dhanushya's V2 feature engineering & enhancements)
         │
         └── feature/<dev>-<feature-name> (Optional task-specific feature branches)
```

### Daily Operating Protocol for Antigravity

Before writing or editing code on any machine:
1. **Check active branch**: Ensure you are on your designated branch (`adarsh-work` or `dhanushya-v2`).
2. **Pull upstream changes**:
   ```powershell
   git fetch origin
   git merge origin/main   # Keep your branch up-to-date with production baseline
   ```
3. **Run automated test suite before starting**:
   ```powershell
   python -m pytest tests/ -v
   ```
4. **Implement changes incrementally** with atomic commits.
5. **Run automated test suite before pushing**:
   ```powershell
   python -m pytest tests/ -v
   ```
6. **Push to your designated remote branch**:
   ```powershell
   git push origin <your-branch-name>
   ```

---

## 4. Architectural Rules & Invariants

All AI agents must respect the following architectural invariants:

### A. Coordinate System & Geolocation
- **Format:** Decimal degrees `(latitude, longitude)`.
- **Primary Region:** Coimbatore, Tamil Nadu, India (`11.0168° N, 76.9674° E`).
- **Distance Metric:** Great-circle distance calculated strictly using the **Haversine formula** returning values in kilometers (`km`).
- **Emergency Geofence:** Tactical dispatch limit is `35.0 km` (configurable via `SOS_RADIUS_KM`).
- **Zero Mocking Fallbacks:** Real hardware coordinates from `navigator.geolocation` must never be silently overwritten by hardcoded default values. If GPS is unavailable, the UI must explicitly display "Acquiring GNSS fix..." and arm the SOS only when a genuine fix arrives.

### B. Backend Architecture (FastAPI + SQLAlchemy)
- **FastAPI Engine:** `backend/main.py`.
- **Database:** SQLAlchemy ORM with SQLite (`nexora.db`) for development; schema designed for smooth PostgreSQL migration.
- **Dependency Injection:** Database sessions must use `Depends(get_db)`.
- **Security:** Passwords hashed with PBKDF2-SHA256 (`passlib`). Stateless authentication via signed JWTs (`python-jose`).
- **Data Schemas:** All incoming and outgoing data models must be defined in `backend/schemas/` using Pydantic.

### C. Frontend Architecture (Single Page Application)
- **Unified Portal:** All four user experiences live in `frontend/index.html` and `frontend/app.js`:
  - `admin-view`: Master fleet operations, driver roster, emergency ticket monitor.
  - `driver-view`: Driver cockpit with start/stop trip, route stops, speed/heading telemetry.
  - `passenger-view`: Commuter tracking, live bus ETA, stop sequence, 2-step emergency SOS.
  - `responder-view`: Incident alert radar, victim street address, Haversine distance, status lifecycle.
- **Style Theme:** Official dark transit theme (Dark Green / Forest Navy `#064e3b` accents) optimized for both desktop operations and mobile cockpits.
- **Mapping:** Leaflet.js with high-contrast OpenStreetMap tiles, custom animated vehicle/responder/victim markers, and tactical POI overlays.

---

## 5. Testing & Quality Assurance Standard

- **Test Suite Directory:** `tests/`
- **Current Baseline:** 21 passing automated tests:
  - `tests/test_auth_rbac.py`: User registration, login, role restrictions, password hashing.
  - `tests/test_gps_tracking.py`: Bus telemetry, passenger geolocation, responder beacons, ETA math.
  - `tests/test_sos_lifecycle.py`: SOS trigger, validation, alert dispatch, status progression, POIs.
  - `tests/test_system_health.py`: Health endpoints, route retrieval, fleet status, trip lifecycle.
- **Rule for New Features:** Every new feature branch created by Dhanushya or Adarsh **must include new unit/integration tests**.
- **Passing Threshold:** `pytest` must report `21 passed` (or more) with `0 failed`. Never push code with failing tests.

---

## 6. Commit Message Convention

Follow standard Conventional Commits:

```
<type>(<scope>): <short description>

[optional body]
```

- `feat`: A new user-facing feature or enhancement.
- `fix`: A bug fix in existing logic.
- `docs`: Documentation updates (`README`, `AGENTS.md`, etc.).
- `test`: Adding or updating test cases.
- `refactor`: Code reorganization without functional changes.
- `chore`: Build scripts, dependencies, or configuration changes.

*Example:* `feat(v2-crowd): introduce passenger bus occupancy sensor telemetry`
