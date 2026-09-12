import os
from typing import Dict

class Settings:
    APP_NAME: str = "NEXORA V1"
    APP_FULL_NAME: str = "Next-generation Explainable Route Optimization & Retrieval Assistant"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Network Binding (Laptop server listens on all interfaces)
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))

    # Database: SQLite for V1 with PostgreSQL migration compatibility
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./nexora.db")

    # JWT Authentication & Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "nexora-secret-jwt-encryption-key-v1-coimbatore-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

    # Geolocation & Geofencing Parameters
    SOS_RADIUS_KM: float = float(os.getenv("SOS_RADIUS_KM", 35.0))       # Whole Coimbatore City Metropolitan Area (35 km radius)
    STOP_RADIUS_METRES: float = float(os.getenv("STOP_RADIUS_METRES", 40.0)) # Stop arrival radius
    GPS_UPDATE_INTERVAL: int = int(os.getenv("GPS_UPDATE_INTERVAL", 3)) # Seconds between pings
    BUS_OFFLINE_TIMEOUT: int = int(os.getenv("BUS_OFFLINE_TIMEOUT", 30)) # Seconds before marked offline

    # Geographic Scope: Coimbatore, Tamil Nadu, India
    COIMBATORE_BOUNDS: Dict[str, float] = {
        "lat_min": 10.8500,
        "lat_max": 11.2000,
        "lon_min": 76.8000,
        "lon_max": 77.1500
    }
    COIMBATORE_CENTER: Dict[str, float] = {
        "latitude": 11.0168,
        "longitude": 76.9674
    }

settings = Settings()
