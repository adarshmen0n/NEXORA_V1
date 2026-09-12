# NEXORA V1 (Official Unified Edition)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/adarshmen0n/NEXORA)

### Next-generation Explainable Route Optimization & Retrieval Assistant
#### AI-Powered Smart Public Transport Tracking, Prediction & Emergency Response System


---

## 🌟 1. System Overview

**NEXORA V1** is an official, single-application, multi-role smart public transportation and emergency dispatch platform. It links transit operators, bus drivers, commuters, and emergency rescue units through real-time mobile GPS telemetry, predictive arrival algorithms, geofenced alerts, and verified emergency dispatch workflows.

### 🎯 Streamlined Core Architecture (1 of Each)

Rather than cluttering the screen with multiple buses, NEXORA V1 focuses on an authentic, end-to-end operational pipeline:

| Role | Role Code | Credentials | Function |
| :--- | :--- | :--- | :--- |
| **👑 Admin Host** | `ADM-001` | `admin@nexora.local` / `Password123` | Master operations map showing Bus, Commuter, and Responder simultaneously with incident resolution. |
| **🚍 Driver** | `DRV-001` | `driver@nexora.local` / `Password123` | Mobile cockpit for **Bus BUS-001** (`TN 38 BX 1001`), broadcasting real physical mobile GPS fixes. |
| **📱 Passenger** | `PAX-001` | `passenger@nexora.local` / `Password123` | Commuter tracking Bus BUS-001 arrival with live ETA, real GPS pin, and **Strict 2-Step Confirmed Emergency SOS**. |
| **🚨 Responder** | `RSP-001` | `responder@nexora.local` / `Password123` | Tactical rescue unit receiving alerts across **Coimbatore City (35.0 km radius)**, showing exact street addresses. |

---

## 📱 2. Single Unified Web App (One Single URL)

NEXORA V1 runs as a **Single Page Application (SPA)** from **one single link**:
- **Local:** `http://localhost:8000/`
- **Worldwide Cloudflare Tunnel:** `https://<tunnel-url>.trycloudflare.com/`

When anyone opens this link on any smartphone (iOS / Android) or computer:
1. **Gateway View**: The home screen clearly displays the **Access Passwords & Credentials Roster** so anyone looking at the screen can see the passwords.
2. **1-Tap Quick Enter**: You can tap **Enter as Driver**, **Enter as Passenger**, **Enter as Responder**, or **Enter as Admin**.
3. **Seamless In-App Switching**: The view seamlessly transforms inside the exact same app into the chosen role with a top navigation bar allowing quick role switching at any time.

---

## 🛰️ 3. Genuine Mobile GPS Telemetry (Zero Fake Coordinates)

- **Real GNSS Satellites**: Uses the mobile browser's hardware Geolocation API (`navigator.geolocation.watchPosition` with `enableHighAccuracy: true, maximumAge: 0, timeout: 15000`).
- **HTTPS Enforcement**: Enabled by the Cloudflare Tunnel, allowing iOS Safari and Android Chrome to safely grant high-accuracy GPS hardware permissions.
- **Dynamic Worldwide Reverse-Geocoding**: The server receives real latitude/longitude from mobile phones anywhere in the world and resolves them in real time into human-readable street addresses via OpenStreetMap Nominatim.

---

## 🚨 4. Strict 2-Step Emergency SOS Workflow

1. **Inert State (No GPS)**: The emergency button is **disabled and locked** until a valid, active mobile GPS fix is acquired.
2. **Armed State**: Once phone GPS is active, the button turns into a pulsing red emergency button.
3. **Step 1 (Confirmation Modal)**: Tapping it opens a modal showing the victim's exact physical coordinates and reverse-geocoded street address, with a **3-second safety countdown** to prevent false alarms.
4. **Step 2 (Dispatch & Lifecycle)**: Upon confirmation, an emergency ticket is transmitted. The commuter monitors real-time status:  
   `1. Alerted ➔ 2. Accepted by Responder ➔ 3. Responder En Route ➔ 4. Safe`.
5. **Responder Action**: Responders across **Coimbatore City (35.0 km radius)** receive an audible chime and alert card with victim distance and street address. The responder can **Accept Alert**, mark **En Route**, and **Resolve Incident**.

---

## 🚀 5. Quick Start & Execution

### Option A: One-Click Windows Launchers
1. **Start Server**: Double-click `start_all.bat` (launches server on `0.0.0.0:8000` and opens browser).
2. **Start Worldwide Internet Tunnel**: Double-click `start_tunnel.bat` (generates the public `https://...trycloudflare.com` URL for smartphones on 4G/5G).

### Option B: Command Line
```powershell
# 1. Seed database
python seed.py

# 2. Start server
python run_nexora.py
```

### Running Automated Tests
```powershell
python -m pytest tests/ -v
```
*(16 of 16 tests passing).*

---

## 📁 6. Project Structure

```
NEXORA/
├── backend/
│   ├── main.py                 # FastAPI engine, WebSockets, static file mounts
│   ├── config.py               # Settings (Host 0.0.0.0, Port 8000, SOS_RADIUS_KM = 35.0)
│   ├── database.py             # SQLAlchemy session manager
│   ├── security.py             # PBKDF2 password hashing & JWT token security
│   ├── models/                 # SQLAlchemy models (User, Bus, Route, Trip, EmergencyCase)
│   ├── schemas/                # Pydantic schemas
│   ├── services/               # Reverse geocoding, Haversine distance, ETA, WebSockets
│   └── routers/                # auth, buses, routes, tracking, sos, trips, admin, pois
├── frontend/
│   ├── index.html              # Unified Single-Page Application (All 4 roles)
│   ├── style.css               # Modern dark transit theme for Mobile & Desktop
│   ├── app.js                  # Unified SPA state controller & real mobile GPS engine
│   └── coimbatore_pois.js      # 50+ Coimbatore POIs (Hospitals, Police, Fire, Schools)
├── tests/                      # Automated test suite (16 tests)
├── seed.py                     # Single-entity seeder & database initializer
├── run_nexora.py               # Master Python launcher (LAN detection & UTF-8)
├── start_all.bat               # Windows 1-click batch launcher
├── start_tunnel.bat            # Cloudflare worldwide HTTPS tunnel launcher
├── requirements.txt            # Python dependencies
├── NEXORA.pdf                  # Presentation documentation
└── NEXORA.pptx                 # Presentation slides
```
