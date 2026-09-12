import math

EARTH_RADIUS_KM = 6371.0

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance in kilometers between two GPS points."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    a = min(1.0, max(0.0, a))
    
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(EARTH_RADIUS_KM * c, 3)

def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in metres between two GPS points."""
    return round(haversine_distance_km(lat1, lon1, lat2, lon2) * 1000.0, 1)

def is_within_radius_km(lat1: float, lon1: float, lat2: float, lon2: float, radius_km: float = 1.0) -> bool:
    """Return True if distance is within the specified radius threshold."""
    dist = haversine_distance_km(lat1, lon1, lat2, lon2)
    return dist <= radius_km

# Alias for backwards/cross-module compatibility
calculate_haversine_km = haversine_distance_km

