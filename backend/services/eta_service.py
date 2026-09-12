from typing import Union
from backend.services.distance_service import haversine_distance_km

def calculate_eta_minutes(
    *args,
    **kwargs
) -> Union[dict, float]:
    """
    Calculate estimated arrival time.
    Supports two calling signatures:
    1. calculate_eta_minutes(bus_lat, bus_lon, target_lat, target_lon, current_speed_kmh=22.0) -> dict
    2. calculate_eta_minutes(distance_km, speed_kmh=22.0) -> float
    """
    # Signature 2: (distance_km, speed_kmh)
    if len(args) == 1 or "distance_km" in kwargs:
        distance_km = args[0] if len(args) >= 1 else kwargs.get("distance_km")
        speed_kmh = kwargs.get("speed_kmh") or (args[1] if len(args) >= 2 else 22.0)
        effective_speed = speed_kmh if speed_kmh > 5.0 else 22.0
        time_hours = distance_km / effective_speed
        return round(time_hours * 60.0, 1)

    if len(args) == 2 and isinstance(args[0], (int, float)) and isinstance(args[1], (int, float)) and "target_lat" not in kwargs:
        distance_km = args[0]
        speed_kmh = args[1]
        effective_speed = speed_kmh if speed_kmh > 5.0 else 22.0
        time_hours = distance_km / effective_speed
        return round(time_hours * 60.0, 1)

    # Signature 1: (bus_lat, bus_lon, target_lat, target_lon, current_speed_kmh)
    if len(args) >= 4:
        bus_lat, bus_lon, target_lat, target_lon = args[0], args[1], args[2], args[3]
        current_speed_kmh = args[4] if len(args) >= 5 else kwargs.get("current_speed_kmh", 0.0)
    else:
        bus_lat = kwargs.get("bus_lat", 0.0)
        bus_lon = kwargs.get("bus_lon", 0.0)
        target_lat = kwargs.get("target_lat", 0.0)
        target_lon = kwargs.get("target_lon", 0.0)
        current_speed_kmh = kwargs.get("current_speed_kmh", 0.0)

    distance_km = haversine_distance_km(bus_lat, bus_lon, target_lat, target_lon)
    effective_speed = current_speed_kmh if current_speed_kmh > 5.0 else 22.0
    time_hours = distance_km / effective_speed
    time_minutes = round(time_hours * 60.0, 1)

    return {
        "distance_km": distance_km,
        "distance_m": round(distance_km * 1000.0, 1),
        "speed_kmh": round(effective_speed, 1),
        "eta_minutes": max(1.0, time_minutes),
        "eta_text": f"{max(1.0, time_minutes):.1f} min"
    }
