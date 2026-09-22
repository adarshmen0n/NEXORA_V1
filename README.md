# NEXORA — Smart Public Transit & Emergency Response Platform

[![NEXORA Version](https://img.shields.io/badge/version-1.0.0-emerald.svg)](https://github.com/adarshmen0n/NEXORA_V1)
[![Automated Tests](https://img.shields.io/badge/pytest-21%2F21%20passing-brightgreen.svg)](tests/)
[![Python](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/adarshmen0n/NEXORA_V1)

> **Next-generation Explainable Route Optimization & Retrieval Assistant**  
> AI-Powered Smart Public Transport Tracking, Prediction & Emergency Response System  
> **Operational Domain:** Coimbatore Metropolitan Area, Tamil Nadu, India  

---

## 👥 Collaborative Engineering Team

NEXORA is engineered cooperatively using **Google Antigravity** as our AI-powered vibe-coding pair programming environment:

| Developer | GitHub Profile | Role & Responsibilities | Working Branch |
| :--- | :--- | :--- | :--- |
| **Adarsh** | [`adarshmen0n`](https://github.com/adarshmen0n) | V1 Original Creator, Architecture Lead, Deployment & Stability | `adarsh-work` / `main` |
| **Dhanushya** | [`Dhanushya-lzs13`](https://github.com/Dhanushya-lzs13) | V2 Lead Engineer, Fleet Scaling, Crowding Sensors & PWA | `dhanushya-v2` |

**Single Canonical GitHub Repository:**  
[`https://github.com/adarshmen0n/NEXORA_V1`](https://github.com/adarshmen0n/NEXORA_V1)

---

## 🌟 1. System Overview

NEXORA is a unified, single-application smart public transportation and emergency dispatch ecosystem. It connects transit administrators, municipal bus drivers, daily commuters, and emergency rescue units through real-time hardware GNSS telemetry, predictive arrival algorithms, geofenced alerts, and verified emergency dispatch workflows.

### 🎯 Core Operational Pipeline (Unified Roles)

| Role | Access Code | Email | Password | Primary Cockpit Function |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Admin Host** | `ADM-001` | `admin@nexora.local` | `Password123` | Master operations radar tracking Bus, Commuter, and Responders simultaneously. |
| **🚍 Driver** | `DRV-001` | `driver@nexora.local` | `Password123` | In-cab mobile cockpit for **Bus BUS-001** (`TN 38 BX 1001`), streaming real GNSS fixes. |
| **📱 Passenger** | `PAX-001` | `passenger@nexora.local` | `Password123` | Commuter portal tracking bus arrival with live ETA, stop list, and **2-Step Confirmed SOS**. |
| **🚨 Responder** | `RSP-001` | `responder@nexora.local` | `Password123` | Tactical rescue console with **35.0 km Coimbatore coverage**, audible siren, and 10 km POIs. |

---

## 📱 2. Single Unified Web App (One Single URL)

NEXORA runs as a **Single Page Application (SPA)** from **one single URL**:
- **Local Workstation:** `http://localhost:8000/`
- **Worldwide Mobile HTTPS Tunnel:** `https://<tunnel-id>.trycloudflare.com/`
- **Render Production Cloud:** `https://nexora-v1.onrender.com/`

When opened on any desktop, laptop, or mobile smartphone (iOS Safari / Android Chrome):
1. **Gateway View**: Instant 1-tap quick buttons to enter any role.
2. **Seamless Switching**: Top navigation bar allows instantaneous switching between roles without logging out.
3. **No App Store Install Required**: Works directly in any modern browser with hardware GPS permissions.

---

## 🛰️ 3. Genuine Mobile GPS Telemetry (Zero Fake Coordinates)

- **Real GNSS Satellites**: Uses the mobile browser's hardware Geolocation API (`navigator.geolocation.watchPosition` with `enableHighAccuracy: true, maximumAge: 0, timeout: 15000`).
- **HTTPS Security**: High-accuracy GPS requires an encrypted HTTPS context, provided seamlessly by the Cloudflare Tunnel or Render SSL certificate.
- **Dynamic Multi-Tier Reverse-Geocoding**: Lat/Lon coordinates are automatically translated into human-readable street names via OpenStreetMap Nominatim with an offline Coimbatore POI fallback.

---

## 🚨 4. Strict 2-Step Emergency SOS Workflow

1. **Inert State (Locked)**: The SOS trigger is disabled until an active, verified GPS fix is acquired.
2. **Armed State**: Pulsing red button ready for emergency activation.
3. **Step 1 (Safety Modal)**: Tapping opens a confirmation dialog showing exact coordinates and reverse-geocoded street address, accompanied by a **3-second safety countdown** to prevent accidental clicks.
4. **Step 2 (Dispatch & Tracking)**: Transmits ticket across WebSockets to all responders within **35.0 km radius**.
5. **Responder Action**: Tactical map auto-centers on victim, plays alert chime, calculates live distance via Haversine formula, and allows responders to progress status:  
   `1. Pending ➔ 2. Acknowledged ➔ 3. En Route ➔ 4. Resolved`.

---

## 🚀 5. Developer Quick Start Guide

### Prerequisites
- **Python 3.12+**
- **Git**
- Modern Web Browser (Chrome / Firefox / Edge / Safari)

### Setup Instructions (For Adarsh & Dhanushya)

```powershell
# 1. Clone the canonical repository
git clone https://github.com/adarshmen0n/NEXORA_V1.git
cd NEXORA_V1

# 2. Checkout your designated development branch
# For Dhanushya:
git checkout dhanushya-v2
# For Adarsh:
git checkout adarsh-work

# 3. Create and activate a Python virtual environment
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On macOS / Linux:
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create local environment configuration
# Windows PowerShell:
Copy-Item .env.example .env
# macOS / Linux:
cp .env.example .env

# 6. Initialize and seed local database (creates demo routes, stops, buses, users)
python seed.py

# 7. Run automated test suite (must report 21 passed)
python -m pytest tests/ -v

# 8. Launch local development server
python run_nexora.py
# Or on Windows, double-click: start_all.bat
```

Open `http://localhost:8000/` in your browser.

---

## 🌐 6. Testing on Physical Mobile Phones (Cloudflare Tunnel)

To test GPS positioning on a real smartphone on 4G/5G:

```powershell
# In a separate terminal, launch the worldwide HTTPS tunnel:
.\start_tunnel.bat
```

The script will generate a public URL like:
`https://nexora-live-demo.trycloudflare.com`

Open this link on your smartphone, grant location permissions when prompted, and tap **Enter as Driver** or **Enter as Passenger**!

---

## 🤖 7. Antigravity AI Pair-Programming Rules

When working with **Google Antigravity**:
1. **Read `AGENTS.md`** before instructing the AI on new features.
2. **Zero-Destruction Policy**: Never break or delete working V1 endpoints, schemas, or tests.
3. **Branch Discipline**:
   - `main`: Protected production baseline (tagged `v1.0.0`).
   - `adarsh-work`: Adarsh's branch.
   - `dhanushya-v2`: Dhanushya's branch for V2 feature development.
4. **Pre-Push Testing**: Always run `python -m pytest tests/ -v` before committing or pushing.

For full architectural details, consult:
- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — Technical Blueprint & Data Models
- [`V1_TO_V2_HANDOFF.md`](V1_TO_V2_HANDOFF.md) — Handoff Guide & V2 Priorities
- [`AGENTS.md`](AGENTS.md) — AI Operating Contract & Coding Guidelines
- [`CHANGELOG.md`](CHANGELOG.md) — Release History

---

## 🧪 8. Automated Verification Suite

Run all tests with:

```powershell
python -m pytest tests/ -v
```

Current test coverage (**21/21 passing**):
- `tests/test_auth_rbac.py` — Authentication, JWT token lifecycle, role-based access restrictions.
- `tests/test_gps_tracking.py` — Mobile GPS telemetry ingestion, Haversine distance, arrival ETA calculations.
- `tests/test_sos_lifecycle.py` — 2-step emergency validation, 35 km geofence dispatch, responder transitions, 10 km POIs.
- `tests/test_system_health.py` — System health check, fleet queries, trip start/stop lifecycle.

---

## 📜 License

MIT License. Designed and developed by Adarsh & Dhanushya for smart municipal transit systems.
