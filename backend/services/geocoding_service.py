import logging
import requests
from typing import Dict, Tuple

logger = logging.getLogger("nexora.geocoding")

# In-memory cache to prevent redundant external API queries
_geocoding_cache: Dict[Tuple[float, float], str] = {}

def reverse_geocode(lat: float, lon: float) -> str:
    """
    Convert real (lat, lon) coordinates into a human-readable street address.
    Uses OpenStreetMap Nominatim with dynamic address component extraction.
    If offline or rate-limited, falls back cleanly to formatted GPS coordinates.
    """
    key = (round(lat, 4), round(lon, 4))
    if key in _geocoding_cache:
        return _geocoding_cache[key]

    # Live OpenStreetMap Nominatim query
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
        headers = {
            "User-Agent": "NexoraV1-LiveMobileTransitEngine/1.0 (contact@nexora.local)"
        }
        resp = requests.get(url, headers=headers, timeout=3.0)
        if resp.status_code == 200:
            data = resp.json()
            address_obj = data.get("address", {})

            # Extract specific granular components for clean human-readable street address
            road = address_obj.get("road") or address_obj.get("pedestrian") or address_obj.get("street")
            suburb = address_obj.get("suburb") or address_obj.get("neighbourhood") or address_obj.get("residential")
            city = address_obj.get("city") or address_obj.get("town") or address_obj.get("village") or address_obj.get("county")
            state = address_obj.get("state")

            components = [c for c in [road, suburb, city, state] if c]
            if components:
                formatted = ", ".join(components)
                _geocoding_cache[key] = formatted
                return formatted

            display_name = data.get("display_name")
            if display_name:
                parts = display_name.split(",")[:4]
                formatted = ", ".join(p.strip() for p in parts)
                _geocoding_cache[key] = formatted
                return formatted
    except Exception as e:
        logger.warning(f"Live Nominatim reverse geocode error: {e}")

    # Honest, exact GPS fallback (no fake hardcoded roads)
    fallback = f"GPS Position ({lat:.5f}, {lon:.5f})"
    _geocoding_cache[key] = fallback
    return fallback
