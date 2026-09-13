import os
import socket
import logging
import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from backend.config import settings
from backend.database import engine, Base
import backend.models  # Register all models for metadata creation
from backend.services.websocket_service import ws_manager

# Routers
from backend.routers import auth, buses, routes, tracking, sos, trips, notifications, admin, pois, simulation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nexora.main")

# Auto-create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NEXORA V1 - AI-Powered Smart Public Transport & Emergency Response System",
    description="Next-generation Explainable Route Optimization & Retrieval Assistant (V1 MVP)",
    version="1.0.0"
)

# Enable CORS for all origins (supporting local Wi-Fi, LAN, and Cloudflare tunnels)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router)
app.include_router(buses.router)
app.include_router(routes.router)
app.include_router(tracking.router)
app.include_router(sos.router)
app.include_router(trips.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(pois.router)
app.include_router(simulation.router)

# Real-time WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive or handle incoming messages from clients
            data = await websocket.receive_text()
            # Echo heartbeat or log
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

# Health Check Endpoint
@app.get("/api/health", tags=["System Health"])
def health_check():
    return {
        "status": "healthy",
        "system": "NEXORA V1",
        "database": "SQLite (Persistent)",
        "server": "online",
        "active_ws_connections": len(ws_manager.active_connections),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

# Static file paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Specific Portal Mounts
app.mount("/admin", StaticFiles(directory=os.path.join(FRONTEND_DIR, "admin"), html=True), name="admin")
app.mount("/driver", StaticFiles(directory=os.path.join(FRONTEND_DIR, "driver"), html=True), name="driver")
app.mount("/passenger", StaticFiles(directory=os.path.join(FRONTEND_DIR, "passenger"), html=True), name="passenger")
app.mount("/responder", StaticFiles(directory=os.path.join(FRONTEND_DIR, "responder"), html=True), name="responder")

# Mount common static frontend files (index.html, auth.js, style.css) at root
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

@app.on_event("startup")
async def startup_banner():
    # Auto-seed database with default users and route if not already seeded
    try:
        from seed import seed_database
        seed_database()
    except Exception as e:
        logger.warning(f"Auto-seeding check: {e}")

    # Start continuous city transit simulation for dynamic live tracking
    try:
        from backend.services.simulation_service import simulation_service
        simulation_service.start()
    except Exception as e:
        logger.warning(f"Auto-simulation start: {e}")

    lan_ip = get_lan_ip()
    port = settings.PORT
    logger.info("=" * 65)
    logger.info("  🚀 NEXORA V1 - SMART TRANSPORT & EMERGENCY SYSTEM ACTIVE")
    logger.info("=" * 65)
    logger.info(f"  • Local Dashboard:    http://localhost:{port}/admin")
    logger.info(f"  • Central Portal:     http://localhost:{port}/")
    logger.info(f"  • LAN Mobile Portal:  http://{lan_ip}:{port}/")
    logger.info(f"  • Driver Console:     http://{lan_ip}:{port}/driver")
    logger.info(f"  • Passenger Web App:  http://{lan_ip}:{port}/passenger")
    logger.info(f"  • Responder Console:  http://{lan_ip}:{port}/responder")
    logger.info(f"  • API Documentation:  http://localhost:{port}/docs")
    logger.info("=" * 65)

