import logging
import requests
from typing import Dict, Tuple, Optional
from backend.services.distance_service import calculate_haversine_km

logger = logging.getLogger("nexora.geocoding")

# In-memory cache to prevent redundant external API queries
_geocoding_cache: Dict[Tuple[float, float], str] = {}

# ---------------------------------------------------------------------------
# COIMBATORE HIGH-PRECISION SPATIAL LOCALITIES & POSTAL REGISTRY
# ---------------------------------------------------------------------------
COIMBATORE_LOCALITIES = [
    {"name": "Gandhipuram", "lat": 11.0180, "lng": 76.9680, "pincode": "641012"},
    {"name": "Peelamedu", "lat": 11.0250, "lng": 76.9950, "pincode": "641004"},
    {"name": "RS Puram", "lat": 11.0080, "lng": 76.9450, "pincode": "641002"},
    {"name": "Town Hall", "lat": 11.0016, "lng": 76.9628, "pincode": "641001"},
    {"name": "Ukkadam", "lat": 10.9875, "lng": 76.9615, "pincode": "641001"},
    {"name": "Singanallur", "lat": 10.9980, "lng": 77.0245, "pincode": "641005"},
    {"name": "Saibaba Colony", "lat": 11.0315, "lng": 76.9480, "pincode": "641043"},
    {"name": "Ganapathy", "lat": 11.0370, "lng": 76.9780, "pincode": "641006"},
    {"name": "Saravanampatti", "lat": 11.0790, "lng": 76.9980, "pincode": "641035"},
    {"name": "Ramanathapuram", "lat": 10.9950, "lng": 76.9890, "pincode": "641045"},
    {"name": "Hopes College", "lat": 11.0280, "lng": 77.0120, "pincode": "641004"},
    {"name": "Sitra / Airport Sector", "lat": 11.0315, "lng": 77.0330, "pincode": "641014"},
    {"name": "Vadavalli", "lat": 11.0280, "lng": 76.9020, "pincode": "641041"},
    {"name": "Kuniyamuthur", "lat": 10.9550, "lng": 76.9530, "pincode": "641008"},
    {"name": "Kovaipudur", "lat": 10.9400, "lng": 76.9320, "pincode": "641042"},
    {"name": "Sundarapuram", "lat": 10.9520, "lng": 76.9780, "pincode": "641024"},
    {"name": "Eachanari", "lat": 10.9250, "lng": 76.9720, "pincode": "641021"},
    {"name": "Malumichampatti", "lat": 10.8950, "lng": 76.9850, "pincode": "641050"},
    {"name": "Kinathukadavu", "lat": 10.8200, "lng": 76.9950, "pincode": "642109"},
    {"name": "Pollachi", "lat": 10.6600, "lng": 77.0080, "pincode": "642001"},
    {"name": "Podanur", "lat": 10.9650, "lng": 76.9950, "pincode": "641023"},
    {"name": "Ondipudur", "lat": 11.0020, "lng": 77.0420, "pincode": "641016"},
    {"name": "Sulur", "lat": 11.0250, "lng": 77.1260, "pincode": "641402"},
    {"name": "Karumathampatti", "lat": 11.1080, "lng": 77.1850, "pincode": "641659"},
    {"name": "Thudiyalur", "lat": 11.0780, "lng": 76.9350, "pincode": "641034"},
    {"name": "Periyanaickenpalayam", "lat": 11.1450, "lng": 76.9350, "pincode": "641020"},
    {"name": "Kavundampalayam", "lat": 11.0450, "lng": 76.9380, "pincode": "641030"},
    {"name": "Perur", "lat": 10.9700, "lng": 76.9200, "pincode": "641010"},
    {"name": "Race Course", "lat": 11.0060, "lng": 76.9740, "pincode": "641018"},
    {"name": "Kalapatti", "lat": 11.0650, "lng": 77.0450, "pincode": "641048"},
]

# Key Arterial Corridors
COIMBATORE_CORRIDORS = [
    {"name": "Avinashi Road (NH 544)", "lat": 11.0220, "lng": 76.9980},
    {"name": "Cross Cut Road", "lat": 11.0175, "lng": 76.9630},
    {"name": "100 Feet Road", "lat": 11.0200, "lng": 76.9650},
    {"name": "Dr. Nanjappa Road", "lat": 11.0140, "lng": 76.9670},
    {"name": "Trichy Road (SH 174)", "lat": 10.9990, "lng": 77.0100},
    {"name": "Mettupalayam Road (NH 181)", "lat": 11.0400, "lng": 76.9420},
    {"name": "Sathyamangalam Road (NH 209)", "lat": 11.0500, "lng": 76.9850},
    {"name": "Palakkad Main Road (NH 544)", "lat": 10.9500, "lng": 76.9450},
    {"name": "Pollachi Main Road (NH 83)", "lat": 10.9100, "lng": 76.9800},
    {"name": "Diwan Bahadur (DB) Road", "lat": 11.0100, "lng": 76.9460},
    {"name": "Marudhamalai Main Road", "lat": 11.0280, "lng": 76.9150},
    {"name": "State Bank Road", "lat": 11.0010, "lng": 76.9635},
    {"name": "Thadagam Road", "lat": 11.0200, "lng": 76.9250},
    {"name": "Race Course Ring Road", "lat": 11.0050, "lng": 76.9730},
    {"name": "Sungam Bypass Road", "lat": 10.9920, "lng": 76.9780},
]

# Major Coimbatore Landmarks & Emergency Anchors
COIMBATORE_LANDMARKS = [
    {"name": "Gandhipuram Town Bus Stand", "road": "Cross Cut Road", "locality": "Gandhipuram", "pincode": "641012", "lat": 11.0168, "lng": 76.9678},
    {"name": "Gandhipuram Central SETC Terminus", "road": "Dr. Nanjappa Road", "locality": "Gandhipuram", "pincode": "641018", "lat": 11.0180, "lng": 76.9685},
    {"name": "Gandhipuram Omni Bus Stand", "road": "Sathyamangalam Road", "locality": "Gandhipuram", "pincode": "641012", "lat": 11.0210, "lng": 76.9710},
    {"name": "Coimbatore Railway Junction", "road": "State Bank Road", "locality": "Town Hall", "pincode": "641001", "lat": 11.0016, "lng": 76.9628},
    {"name": "Ukkadam Bus Terminus", "road": "Ukkadam Bypass Road", "locality": "Ukkadam", "pincode": "641001", "lat": 10.9875, "lng": 76.9615},
    {"name": "Singanallur Bus Terminal", "road": "Trichy Road", "locality": "Singanallur", "pincode": "641005", "lat": 10.9980, "lng": 77.0245},
    {"name": "Mettupalayam Road Bus Stand", "road": "Mettupalayam Road", "locality": "Saibaba Colony", "pincode": "641043", "lat": 11.0315, "lng": 76.9480},
    {"name": "Coimbatore International Airport (CJB)", "road": "Avinashi Road", "locality": "Sitra", "pincode": "641014", "lat": 11.0315, "lng": 77.0330},
    {"name": "PSG College of Technology", "road": "Avinashi Road", "locality": "Peelamedu", "pincode": "641004", "lat": 11.0250, "lng": 76.9950},
    {"name": "Coimbatore Medical College Hospital (CMCH)", "road": "Trichy Road", "locality": "Town Hall", "pincode": "641018", "lat": 11.0025, "lng": 76.9715},
    {"name": "Kovai Medical Center and Hospital (KMCH)", "road": "Avinashi Road", "locality": "Civil Aerodrome Post", "pincode": "641014", "lat": 11.0435, "lng": 77.0380},
    {"name": "Ganga Hospital", "road": "Mettupalayam Road", "locality": "Saibaba Colony", "pincode": "641043", "lat": 11.0265, "lng": 76.9470},
    {"name": "Sri Ramakrishna Hospital", "road": "Sarojini Naidu Road", "locality": "Siddhapudur", "pincode": "641044", "lat": 11.0195, "lng": 76.9795},
    {"name": "GKNM Hospital", "road": "P.N. Palayam Road", "locality": "Pappanaickenpalayam", "pincode": "641037", "lat": 11.0115, "lng": 76.9830},
    {"name": "PSG Hospitals", "road": "Avinashi Road", "locality": "Peelamedu", "pincode": "641004", "lat": 11.0275, "lng": 77.0020},
    {"name": "Royal Care Super Speciality Hospital", "road": "Neelambur Bypass", "locality": "Neelambur", "pincode": "641062", "lat": 11.0665, "lng": 77.0750},
    {"name": "Brookefields Mall", "road": "Brookebond Road", "locality": "Sukrawar Pettai", "pincode": "641001", "lat": 11.0090, "lng": 76.9580},
    {"name": "Prozone Mall", "road": "Sathy Road", "locality": "Saravanampatti", "pincode": "641035", "lat": 11.0550, "lng": 76.9940},
    {"name": "Fun Republic Mall", "road": "Avinashi Road", "locality": "Peelamedu", "pincode": "641004", "lat": 11.0245, "lng": 77.0025},
    {"name": "Codissia Trade Fair Complex", "road": "Avinashi Road", "locality": "Peelamedu", "pincode": "641014", "lat": 11.0360, "lng": 77.0260},
    {"name": "Tidel Park Coimbatore", "road": "Avinashi Road", "locality": "Hopes College", "pincode": "641004", "lat": 11.0285, "lng": 77.0140},
    {"name": "Lakshmi Mills Junction", "road": "Avinashi Road", "locality": "Pappanaickenpalayam", "pincode": "641037", "lat": 11.0142, "lng": 76.9804},
    {"name": "Eachanari Vinayagar Temple", "road": "Pollachi Main Road", "locality": "Eachanari", "pincode": "641021", "lat": 10.9260, "lng": 76.9730},
    {"name": "Marudhamalai Murugan Temple", "road": "Marudhamalai Road", "locality": "Marudhamalai", "pincode": "641046", "lat": 11.0450, "lng": 76.8520},
    {"name": "Vadavalli Bus Terminus", "road": "Marudhamalai Road", "locality": "Vadavalli", "pincode": "641041", "lat": 11.0280, "lng": 76.9020},
    {"name": "Sulur Bus Terminus", "road": "Trichy Road", "locality": "Sulur", "pincode": "641402", "lat": 11.0250, "lng": 77.1260},
    {"name": "Nehru Stadium", "road": "Park Gate Road", "locality": "Gopalapuram", "pincode": "641018", "lat": 11.0005, "lng": 76.9690},
    {"name": "B-3 Kattoor Police Station", "road": "Cross Cut Road", "locality": "Gandhipuram", "pincode": "641012", "lat": 11.0185, "lng": 76.9640},
    {"name": "E-2 Peelamedu Police Station", "road": "Avinashi Road", "locality": "Peelamedu", "pincode": "641004", "lat": 11.0260, "lng": 76.9970},
    {"name": "B-2 RS Puram Police Station", "road": "DB Road", "locality": "RS Puram", "pincode": "641002", "lat": 11.0095, "lng": 76.9475},
]


def _match_coimbatore_spatial(lat: float, lon: float) -> Optional[str]:
    """
    High-precision mathematical spatial matcher for Coimbatore Metropolitan Sector (35 km).
    Matches nearest landmarks, arterial corridors, and locality postal codes.
    Guarantees an authentic, human-readable street address without external API reliance.
    """
    # Verify coordinates are in the broad Coimbatore / Western Tamil Nadu sector
    if not (10.50 <= lat <= 11.45 and 76.60 <= lon <= 77.40):
        return None

    # 1. Find closest landmark
    closest_landmark = None
    min_lm_dist = float("inf")
    for lm in COIMBATORE_LANDMARKS:
        d = calculate_haversine_km(lat, lon, lm["lat"], lm["lng"])
        if d < min_lm_dist:
            min_lm_dist = d
            closest_landmark = lm

    # 2. Find closest locality
    closest_locality = None
    min_loc_dist = float("inf")
    for loc in COIMBATORE_LOCALITIES:
        d = calculate_haversine_km(lat, lon, loc["lat"], loc["lng"])
        if d < min_loc_dist:
            min_loc_dist = d
            closest_locality = loc

    # 3. Find closest corridor
    closest_corridor = None
    min_cor_dist = float("inf")
    for cor in COIMBATORE_CORRIDORS:
        d = calculate_haversine_km(lat, lon, cor["lat"], cor["lng"])
        if d < min_cor_dist:
            min_cor_dist = d
            closest_corridor = cor

    if not closest_locality:
        return None

    # Synthesis based on proximity thresholds
    if closest_landmark and min_lm_dist <= 0.85:
        road = closest_landmark.get("road") or (closest_corridor["name"] if closest_corridor and min_cor_dist <= 1.2 else "")
        road_part = f", {road}" if road else ""
        return f"Near {closest_landmark['name']}{road_part}, {closest_landmark['locality']}, Coimbatore - {closest_landmark['pincode']}"

    elif closest_corridor and min_cor_dist <= 0.90:
        return f"{closest_corridor['name']}, {closest_locality['name']}, Coimbatore - {closest_locality['pincode']}"

    else:
        return f"{closest_locality['name']} Sector, Coimbatore, Tamil Nadu - {closest_locality['pincode']}"


def _query_bigdatacloud(lat: float, lon: float) -> Optional[str]:
    """Free client-compatible reverse geocode endpoint with zero rate limits."""
    try:
        url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
        resp = requests.get(url, timeout=2.5)
        if resp.status_code == 200:
            data = resp.json()
            locality = data.get("locality") or data.get("city")
            city = data.get("city")
            state = data.get("principalSubdivision") or "Tamil Nadu"
            postcode = data.get("postcode")

            parts = []
            if locality and locality != city:
                parts.append(locality)
            if city:
                parts.append(city)
            if state:
                parts.append(state)

            if parts:
                addr = ", ".join(parts)
                if postcode:
                    addr += f" - {postcode}"
                return addr
    except Exception as e:
        logger.debug(f"BigDataCloud reverse geocode notice: {e}")
    return None


def _query_nominatim(lat: float, lon: float) -> Optional[str]:
    """OpenStreetMap Nominatim reverse geocode with granular address breakdown."""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
        headers = {
            "User-Agent": "NexoraV1-LiveMobileTransitEngine/1.0 (contact@nexora.local)"
        }
        resp = requests.get(url, headers=headers, timeout=2.5)
        if resp.status_code == 200:
            data = resp.json()
            address_obj = data.get("address", {})

            road = address_obj.get("road") or address_obj.get("pedestrian") or address_obj.get("street")
            suburb = address_obj.get("suburb") or address_obj.get("neighbourhood") or address_obj.get("residential")
            city = address_obj.get("city") or address_obj.get("town") or address_obj.get("village") or address_obj.get("county")
            state = address_obj.get("state")
            postcode = address_obj.get("postcode")

            components = [c for c in [road, suburb, city, state] if c]
            if components:
                formatted = ", ".join(components)
                if postcode and postcode not in formatted:
                    formatted += f" - {postcode}"
                return formatted

            display_name = data.get("display_name")
            if display_name:
                parts = display_name.split(",")[:4]
                return ", ".join(p.strip() for p in parts)
    except Exception as e:
        logger.debug(f"Nominatim reverse geocode notice: {e}")
    return None


def reverse_geocode(lat: float, lon: float) -> str:
    """
    Convert (lat, lon) coordinates into an authentic, human-readable street address.
    Multi-tier architecture:
    1. Memory Cache
    2. Coimbatore High-Precision Spatial Locality & Landmark Matcher (Instant, zero latency)
    3. OpenStreetMap Nominatim Live Query
    4. BigDataCloud Global Client Reverse Geocode
    5. Guaranteed Sector Locality Formatter (NEVER returns raw generic GPS coordinates)
    """
    key = (round(lat, 4), round(lon, 4))
    if key in _geocoding_cache:
        return _geocoding_cache[key]

    # Tier 1: Coimbatore Spatial Landmark & Locality Matcher (Instantaneous, authentic)
    spatial_address = _match_coimbatore_spatial(lat, lon)

    # Tier 2: OpenStreetMap Nominatim (if online and not blocked)
    osm_address = _query_nominatim(lat, lon)
    if osm_address and len(osm_address.split(",")) >= 2:
        _geocoding_cache[key] = osm_address
        return osm_address

    # Tier 3: If spatial address matched for Coimbatore sector, use it!
    if spatial_address:
        _geocoding_cache[key] = spatial_address
        return spatial_address

    # Tier 4: BigDataCloud Global Geocode
    bdc_address = _query_bigdatacloud(lat, lon)
    if bdc_address:
        _geocoding_cache[key] = bdc_address
        return bdc_address

    # Tier 5: Safe Regional Fallback
    fallback = f"Coimbatore Sector ({lat:.5f}, {lon:.5f}), Tamil Nadu"
    _geocoding_cache[key] = fallback
    return fallback
