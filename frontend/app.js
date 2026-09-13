// =========================================================
// NEXORA V1 — Official Unified Single-App Controller
// Next-generation Explainable Route Optimization & Retrieval Assistant
// =========================================================

const API_BASE = window.location.origin;

// State
let currentUser = null;
let currentToken = null;
let socket = null;
let activeWatchId = null;

// Live Coordinates (Real Phone Hardware GPS)
let realLat = null;
let realLng = null;
let realAccuracy = null;
let realSpeed = 0.0;
let fixesBroadcasted = 0;
let isTripActive = false;
let currentTripId = null;

// Leaflet Maps
let maps = {
    home: null,
    admin: null,
    driver: null,
    passenger: null,
    responder: null
};
let markers = {
    homeBus: null,
    adminBus: null,
    adminPax: null,
    adminResp: null,
    adminSos: null,
    driverBus: null,
    passengerUser: null,
    passengerBus: null,
    responderUser: null,
    responderCircle: null,
    responderSos: null
};

// Emergency State
let activeSOS = null;
let sosCountdown = 3;
let sosTimer = null;

// ==========================================
// 1. INITIALIZATION & AUTHENTICATION
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize Theme Preference
    const storedTheme = localStorage.getItem("nexora_theme") || "emerald";
    setDynamicTheme(storedTheme);

    checkServerHealth();
    initWebSocket();
    initHomeMap();

    // Check existing stored session
    const storedToken = localStorage.getItem("nexora_token");
    const storedUser = localStorage.getItem("nexora_user");

    if (storedToken && storedUser) {
        try {
            currentToken = storedToken;
            currentUser = JSON.parse(storedUser);
            showRoleView(currentUser.role);
            return;
        } catch (e) {
            clearSession();
        }
    }

    // Default to Gateway view
    showRoleView("gateway");
});

function setSession(token, user) {
    currentToken = token;
    currentUser = user;
    localStorage.setItem("nexora_token", token);
    localStorage.setItem("nexora_user", JSON.stringify(user));
    updateNavHeader();
}

function clearSession() {
    currentToken = null;
    currentUser = null;
    localStorage.removeItem("nexora_token");
    localStorage.removeItem("nexora_user");
    stopRealPhoneGPS();
    updateNavHeader();
}

function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        ...(currentToken ? { "Authorization": `Bearer ${currentToken}` } : {})
    };
}

async function apiRequest(url, method = "GET", body = null) {
    const options = {
        method,
        headers: getAuthHeaders()
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${url}`, options);
    if (res.status === 401) {
        clearSession();
        showRoleView("gateway");
        throw new Error("Session expired. Please sign in again.");
    }
    return res;
}

// Role Authentication Modal Handlers
let pendingAuthRole = null;

function openRoleAuthModal(role, email, roleTitle, icon) {
    pendingAuthRole = role;
    
    const iconEl = document.getElementById("roleAuthIcon");
    const titleEl = document.getElementById("roleAuthTitle");
    const emailEl = document.getElementById("roleAuthEmail");
    const passEl = document.getElementById("roleAuthPass");
    const errEl = document.getElementById("roleAuthError");
    const dialogEl = document.getElementById("roleAuthDialog");
    const explainerEl = document.getElementById("roleAuthExplainer");
    
    if (iconEl) iconEl.textContent = icon || "🔒";
    if (titleEl) titleEl.textContent = `${roleTitle} Login`;
    if (emailEl) emailEl.value = email;
    if (passEl) {
        passEl.value = "";
        passEl.type = "password";
    }
    if (errEl) {
        errEl.style.display = "none";
        errEl.textContent = "";
    }

    // Role-specific operational explanations & dynamic themes
    const roleData = {
        DRIVER: {
            color: "#f59e0b",
            glow: "rgba(245, 158, 11, 0.45)",
            explainer: `<strong>🚍 What happens in Driver Cockpit:</strong><br>Activates your smartphone's real GPS sensor to stream live coordinates as <strong>BUS-001</strong>. Calculates real-time headway, dynamic speed, and arrival countdowns at every Coimbatore transit stop along the corridor.`
        },
        PASSENGER: {
            color: "#3b82f6",
            glow: "rgba(59, 130, 246, 0.45)",
            explainer: `<strong>🧭 What happens in Passenger Radar:</strong><br>Connects to the live transit radar, calculates walking distance and precise bus arrival time (ETA) based on your real GPS location, and arms the 2-step Coimbatore citywide 35 km Emergency SOS dispatch.`
        },
        RESPONDER: {
            color: "#ef4444",
            glow: "rgba(239, 68, 68, 0.45)",
            explainer: `<strong>🚨 What happens in Rescue Responder:</strong><br>Enables the emergency dispatch radar covering the entire <strong>35.0 km Coimbatore metropolitan radius</strong>. Automatically acquires active SOS distress beacons with victim contact info, exact geocoded streets, and 1-tap navigation.`
        },
        ADMIN: {
            color: "#8b5cf6",
            glow: "rgba(139, 92, 246, 0.45)",
            explainer: `<strong>⚡ What happens in Admin Command Center:</strong><br>Provides comprehensive live oversight over all fleet vehicles, allows toggling autonomous transit simulation, monitors active emergency cases across Coimbatore, and provides 1-tap incident resolution.`
        }
    };

    const info = roleData[role.toUpperCase()] || {
        color: "#3b82f6",
        glow: "rgba(59, 130, 246, 0.4)",
        explainer: "Secure authenticated console access for authorized personnel."
    };

    if (dialogEl) {
        dialogEl.style.borderColor = info.color;
        dialogEl.style.boxShadow = `0 0 35px ${info.glow}`;
    }
    if (explainerEl) {
        explainerEl.innerHTML = info.explainer;
        explainerEl.style.borderColor = info.color;
    }
    
    const modal = document.getElementById("roleAuthModal");
    if (modal) {
        modal.classList.add("open");
        setTimeout(() => {
            if (passEl) passEl.focus();
        }, 150);
    }
}

function closeRoleAuthModal() {
    const modal = document.getElementById("roleAuthModal");
    if (modal) modal.classList.remove("open");
    pendingAuthRole = null;
}

function autofillRoleDemoPass() {
    const passEl = document.getElementById("roleAuthPass");
    if (passEl) passEl.value = "Password123";
}

function toggleRolePassVisibility() {
    const passEl = document.getElementById("roleAuthPass");
    if (passEl) {
        passEl.type = passEl.type === "password" ? "text" : "password";
    }
}

async function submitRoleAuth(e) {
    if (e) e.preventDefault();
    const email = document.getElementById("roleAuthEmail").value.trim();
    const pass = document.getElementById("roleAuthPass").value;
    const errEl = document.getElementById("roleAuthError");
    const submitBtn = document.getElementById("roleAuthSubmitBtn");
    
    if (!pass) {
        if (errEl) {
            errEl.textContent = "Please enter your password (default: Password123).";
            errEl.style.display = "block";
        }
        return;
    }
    
    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Verifying...";
        }
        if (errEl) errEl.style.display = "none";
        
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: pass })
        });
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({ detail: "Invalid email or password." }));
            throw new Error(errData.detail || "Invalid password. Default is Password123");
        }
        
        const data = await res.json();
        setSession(data.access_token, data.user || {
            id: data.id,
            user_code: data.user_code,
            name: data.name,
            email: data.email,
            role: data.role
        });
        
        closeRoleAuthModal();
        showRoleView(currentUser.role);
    } catch (err) {
        if (errEl) {
            errEl.textContent = "❌ " + (err.message || "Invalid password. Check credentials.");
            errEl.style.display = "block";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign In & Enter";
        }
    }
}

// Manual form login
async function handleFormLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPass").value;
    const errEl = document.getElementById("loginFormError");
    const btn = document.getElementById("loginFormBtn");
    
    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = "Signing In...";
        }
        if (errEl) errEl.style.display = "none";
        
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: pass })
        });
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({ detail: "Invalid email or password." }));
            throw new Error(errData.detail || "Invalid email or password.");
        }
        
        const data = await res.json();
        setSession(data.access_token, data.user || {
            id: data.id,
            user_code: data.user_code,
            name: data.name,
            email: data.email,
            role: data.role
        });
        
        showRoleView(currentUser.role);
    } catch (err) {
        if (errEl) {
            errEl.textContent = "❌ " + (err.message || "Login failed. Check credentials.");
            errEl.style.display = "block";
        } else {
            alert("Login failed: " + err.message);
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Sign In";
        }
    }
}

function signOut() {
    clearSession();
    showRoleView("gateway");
}

function switchRole() {
    showRoleView("gateway");
}

// Front-page interactive showcase and live map controller
function switchShowcaseVideo(videoUrl, videoType, btn) {
    const player = document.getElementById("showcaseVideoPlayer");
    if (!player) return;
    try {
        player.pause();
        player.innerHTML = `<source src="${videoUrl}" type="${videoType}">Your browser does not support HTML5 video.`;
        player.load();
        player.play().catch(() => {});
    } catch (e) {
        console.warn("Showcase video switch error:", e);
    }
    document.querySelectorAll(".video-tab-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
}

function initHomeMap() {
    setTimeout(() => {
        if (!maps.home) {
            const container = document.getElementById("homeMap");
            if (container) {
                maps.home = setupMapWithGoogleTilesAndPOIs("homeMap", 13);
            }
        }
        if (maps.home) {
            maps.home.invalidateSize();
        }
    }, 150);
}

// Dynamic Theme Switcher Controller
function setDynamicTheme(themeName) {
    if (!themeName) themeName = "emerald";
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("nexora_theme", themeName);
    document.querySelectorAll(".theme-opt-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-theme") === themeName);
    });
}

// Live Bus Stand & Route Corridor Search Filter
function filterBusStandsAndRoutes() {
    const input = document.getElementById("busStandSearchInput");
    const query = input ? input.value.toLowerCase().trim() : "";
    
    // Filter Bus Stand Cards
    const standCards = document.querySelectorAll("#busStandsSection .route-card");
    let visibleStands = 0;
    standCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const matches = !query || text.includes(query);
        card.style.display = matches ? "flex" : "none";
        if (matches) visibleStands++;
    });

    // Filter Bus Route Cards
    const routeCards = document.querySelectorAll("#routesSection .route-card");
    let visibleRoutes = 0;
    routeCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const matches = !query || text.includes(query);
        card.style.display = matches ? "flex" : "none";
        if (matches) visibleRoutes++;
    });

    const statusEl = document.getElementById("searchFilterStatus");
    if (statusEl) {
        if (query) {
            statusEl.textContent = `Showing ${visibleStands} bus stands and ${visibleRoutes} routes matching "${query}"`;
            statusEl.style.display = "block";
        } else {
            statusEl.style.display = "none";
        }
    }
}

// ==========================================
// 2. VIEW CONTROLLER (SPA NAVIGATION)
// ==========================================

function showRoleView(role) {
    // Hide all views
    document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
    stopRealPhoneGPS();

    const tag = document.getElementById("activeRoleTag");

    if (role === "gateway" || !currentUser) {
        document.getElementById("viewGateway").classList.add("active");
        tag.textContent = "Gateway";
        tag.className = "role-tag";
        document.getElementById("btnSwitchRole").style.display = "none";
        document.getElementById("btnSignOut").style.display = "none";
        initHomeMap();
        return;
    }

    document.getElementById("btnSwitchRole").style.display = "inline-flex";
    document.getElementById("btnSignOut").style.display = "inline-flex";

    switch (role.toUpperCase()) {
        case "DRIVER":
            document.getElementById("viewDriver").classList.add("active");
            tag.textContent = "Driver Cockpit";
            tag.className = "role-tag driver";
            initDriverView();
            break;

        case "PASSENGER":
            document.getElementById("viewPassenger").classList.add("active");
            tag.textContent = "Passenger Web App";
            tag.className = "role-tag passenger";
            initPassengerView();
            break;

        case "RESPONDER":
            document.getElementById("viewResponder").classList.add("active");
            tag.textContent = "Rescue Responder";
            tag.className = "role-tag responder";
            initResponderView();
            break;

        case "ADMIN":
        default:
            document.getElementById("viewAdmin").classList.add("active");
            tag.textContent = "Admin Command Host";
            tag.className = "role-tag admin";
            initAdminView();
            break;
    }
}

function updateNavHeader() {
    const userLabel = document.getElementById("navUserLabel");
    if (currentUser) {
        userLabel.textContent = `${currentUser.name} (${currentUser.user_code})`;
    } else {
        userLabel.textContent = "Not Signed In";
    }
}

// ==========================================
// 3. GENUINE MOBILE HARDWARE GPS ENGINE
// ==========================================

function startRealPhoneGPS(onFixCallback) {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your mobile browser. Please use Chrome or Safari.");
        return;
    }

    stopRealPhoneGPS();

    activeWatchId = navigator.geolocation.watchPosition(
        (pos) => {
            realLat = pos.coords.latitude;
            realLng = pos.coords.longitude;
            realAccuracy = pos.coords.accuracy || 5.0;
            realSpeed = pos.coords.speed ? (pos.coords.speed * 3.6) : 25.0; // km/h

            if (onFixCallback) {
                onFixCallback(realLat, realLng, realSpeed, realAccuracy);
            }
        },
        (err) => {
            console.warn("Real GPS access error:", err);
            let msg = "Could not get physical GPS fix. ";
            if (err.code === 1) msg += "Permission was denied. Please allow Location access in your browser settings.";
            else if (err.code === 2) msg += "Position unavailable. Ensure your phone's GPS is turned on.";
            else if (err.code === 3) msg += "GPS request timed out.";
            alert(msg);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 12000
        }
    );
}

function stopRealPhoneGPS() {
    if (activeWatchId !== null) {
        navigator.geolocation.clearWatch(activeWatchId);
        activeWatchId = null;
    }
}

// ==========================================
// GOOGLE MAPS TILE ENGINE & COIMBATORE POIS
// ==========================================

const SOS_RADIUS_KM = 35.0; // 35 km Whole Coimbatore City Metropolitan Radius
const COIMBATORE_RADIUS_METERS = 35000;

function setupMapWithGoogleTilesAndPOIs(mapId, defaultZoom = 14) {
    const map = L.map(mapId, {
        zoomControl: true,
        maxZoom: 21
    }).setView([11.0168, 76.9678], defaultZoom);

    // 1. Official Google Maps Vector Raster Roadmap (Primary / Default)
    // Includes every single Coimbatore gully, street, building, apartment, shop, and hospital!
    const googleStreets = L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 21,
        attribution: "&copy; Google Maps"
    }).addTo(map);

    // 2. Official Google Satellite Hybrid (Real Aerial Photo + Roads)
    const googleSatellite = L.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 21,
        attribution: "&copy; Google Satellite"
    });

    // 3. OpenStreetMap
    const osmDetailed = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
    });

    // POI Layer Groups for this map
    const poiGroups = {
        bus_stand: L.layerGroup(),
        hospital: L.layerGroup(),
        fire: L.layerGroup(),
        police: L.layerGroup(),
        school: L.layerGroup(),
        landmark: L.layerGroup()
    };

    if (typeof COIMBATORE_POIS !== "undefined") {
        COIMBATORE_POIS.forEach(poi => {
            const marker = createPOIMarker(poi, map);
            if (poiGroups[poi.category]) {
                poiGroups[poi.category].addLayer(marker);
            }
        });

        // Add all POI layers to map by default so important places are prominently highlighted!
        Object.values(poiGroups).forEach(group => group.addTo(map));
    }

    // Leaflet Native Layer Switcher Control
    const baseMaps = {
        "🗺️ Google Maps (Streets & Buildings)": googleStreets,
        "🛰️ Google Satellite Hybrid": googleSatellite,
        "🏙️ OpenStreetMap": osmDetailed
    };
    const overlayMaps = {
        "🚏 Coimbatore Bus Stands (8)": poiGroups.bus_stand,
        "🏥 Hospitals & Trauma Centers": poiGroups.hospital,
        "🚒 Fire & Rescue Stations": poiGroups.fire,
        "🚓 Police Stations & Command": poiGroups.police,
        "🎓 Schools & Colleges": poiGroups.school,
        "🏟️ Stadiums & Key Landmarks": poiGroups.landmark
    };
    L.control.layers(baseMaps, overlayMaps, { collapsed: true, position: "topright" }).addTo(map);

    map._poiGroups = poiGroups;
    return map;
}

function toggleMapPOI(mapRole, category, btn) {
    const map = maps[mapRole];
    if (!map || !map._poiGroups) return;
    const group = map._poiGroups[category];
    if (!group) return;

    if (map.hasLayer(group)) {
        map.removeLayer(group);
        btn.classList.remove("active");
    } else {
        map.addLayer(group);
        btn.classList.add("active");
    }
}

// Pan smoothly to a specific Coimbatore bus stand
function panToBusStand(lat, lng, zoom = 16, name = "", desc = "") {
    const map = maps.home || maps.admin || maps.passenger || maps.driver || maps.responder;
    if (!map) return;
    
    // Smooth scroll to map section if page is scrolled down
    const mapEl = document.getElementById("radarSection") || document.getElementById("homeMap");
    if (mapEl) {
        mapEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    map.flyTo([lat, lng], zoom, {
        animate: true,
        duration: 1.2
    });

    setTimeout(() => {
        L.popup()
            .setLatLng([lat, lng])
            .setContent(`
                <div style="min-width: 220px; font-family: 'Inter', sans-serif;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span style="font-size: 1.3rem;">🚏</span>
                        <strong style="font-size: 0.95rem; color: #047857;">${name}</strong>
                    </div>
                    <div style="background: rgba(5,150,105,0.1); color: #047857; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">
                        COIMBATORE TRANSIT TERMINAL
                    </div>
                    <div style="font-size: 0.8rem; color: #374151; line-height: 1.4;">
                        ${desc || "Major transit terminus connecting frequent town buses and inter-city express routes across Tamil Nadu."}
                    </div>
                </div>
            `)
            .openOn(map);
    }, 1250);
}

// Locate and center map on the live moving bus
function focusOnLiveBus() {
    const map = maps.home || maps.admin || maps.passenger;
    const marker = markers.homeBus || markers.adminBus || markers.passengerBus;
    if (!map) return;

    const mapEl = document.getElementById("radarSection") || document.getElementById("homeMap");
    if (mapEl) {
        mapEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (marker) {
        const latlng = marker.getLatLng();
        map.flyTo(latlng, 16, { animate: true, duration: 1.0 });
        setTimeout(() => {
            marker.openPopup();
        }, 1100);
    } else {
        map.flyTo([11.0168, 76.9678], 15, { animate: true, duration: 1.0 });
    }
}

// Switch between Role Guide & Explainer Tabs
function switchGuideTab(tabKey, btn) {
    document.querySelectorAll(".guide-tab-pane").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".guide-tab-btn").forEach(b => b.classList.remove("active"));

    const target = document.getElementById(`guide-${tabKey}`);
    if (target) {
        target.classList.add("active");
    }
    if (btn) {
        btn.classList.add("active");
    }
}

// ==========================================
// 4. DRIVER COCKPIT IMPLEMENTATION
// ==========================================

function initDriverView() {
    setTimeout(() => {
        if (!maps.driver) {
            maps.driver = setupMapWithGoogleTilesAndPOIs("driverMap", 15);
        }
        maps.driver.invalidateSize();
    }, 150);

    document.getElementById("driverGpsPill").className = "gps-pill acquiring";
    document.getElementById("driverGpsPill").innerHTML = "<span>🟡</span> Acquiring Phone GPS...";

    // Start Real GPS transmission
    startRealPhoneGPS((lat, lng, speed, acc) => {
        document.getElementById("driverGpsPill").className = "gps-pill live";
        document.getElementById("driverGpsPill").innerHTML = "<span>🟢</span> Real Phone GPS Active";

        document.getElementById("drvLat").textContent = lat.toFixed(5);
        document.getElementById("drvLng").textContent = lng.toFixed(5);
        document.getElementById("drvSpeed").textContent = `${speed.toFixed(1)} km/h`;
        document.getElementById("drvAccuracy").textContent = `± ${acc.toFixed(1)}m`;

        // Update driver map marker
        if (markers.driverBus) {
            markers.driverBus.setLatLng([lat, lng]);
        } else {
            const icon = L.divIcon({
                className: "custom-driver-icon",
                html: `<div style="background: #10b981; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; border: 2px solid white;">🚍 BUS-001</div>`,
                iconSize: [80, 26],
                iconAnchor: [40, 13]
            });
            markers.driverBus = L.marker([lat, lng], { icon }).addTo(maps.driver);
        }
        maps.driver.panTo([lat, lng]);

        // If trip is active, broadcast fix to server
        if (isTripActive) {
            broadcastBusLocation(lat, lng, speed);
        }
    });
}

async function toggleTrip() {
    const btn = document.getElementById("btnTripToggle");

    if (!isTripActive) {
        if (!realLat || !realLng) {
            alert("Waiting for valid mobile GPS fix before starting trip. Make sure Location is enabled.");
            return;
        }

        try {
            btn.disabled = true;
            btn.textContent = "Starting trip...";
            const res = await apiRequest("/api/trips/start", "POST", {
                bus_id: "BUS-001",
                route_id: "Route 1",
                start_latitude: realLat,
                start_longitude: realLng
            });
            const data = await res.json();
            isTripActive = true;
            currentTripId = data.trip_id;
            btn.className = "btn btn-danger";
            btn.textContent = "⏹ STOP TRIP";
            document.getElementById("driverTripState").textContent = "TRIP ACTIVE (BROADCASTING)";
            document.getElementById("driverTripState").style.color = "#10b981";
        } catch (e) {
            alert(e.message);
        } finally {
            btn.disabled = false;
        }
    } else {
        try {
            btn.disabled = true;
            btn.textContent = "Stopping trip...";
            await apiRequest("/api/trips/stop", "POST", {
                bus_id: "BUS-001",
                trip_id: currentTripId,
                end_latitude: realLat,
                end_longitude: realLng
            });
            isTripActive = false;
            btn.className = "btn btn-success";
            btn.textContent = "▶ START TRIP";
            document.getElementById("driverTripState").textContent = "BUS IDLE";
            document.getElementById("driverTripState").style.color = "#94a3b8";
        } catch (e) {
            alert(e.message);
        } finally {
            btn.disabled = false;
        }
    }
}

async function broadcastBusLocation(lat, lng, speed) {
    try {
        await apiRequest("/api/tracking/bus/location", "POST", {
            bus_id: "BUS-001",
            latitude: lat,
            longitude: lng,
            speed: speed
        });
        fixesBroadcasted++;
        document.getElementById("drvFixCount").textContent = fixesBroadcasted;
    } catch (e) {
        console.error("GPS broadcast error", e);
    }
}

// ==========================================
// 5. PASSENGER APP IMPLEMENTATION (STRICT SOS)
// ==========================================

function initPassengerView() {
    setTimeout(() => {
        if (!maps.passenger) {
            maps.passenger = setupMapWithGoogleTilesAndPOIs("passengerMap", 15);
        }
        maps.passenger.invalidateSize();
    }, 150);

    // Lock SOS button initially until phone GPS is acquired
    disarmSOSButton("Acquiring real mobile GPS coordinates...");

    // Start Real Phone GPS for Commuter
    startRealPhoneGPS((lat, lng, speed, acc) => {
        document.getElementById("paxGpsPill").className = "gps-pill live";
        document.getElementById("paxGpsPill").innerHTML = `<span>🟢</span> GPS Active (±${acc.toFixed(1)}m)`;

        document.getElementById("paxCoords").textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        // Update commuter marker on passenger map
        if (markers.passengerUser) {
            markers.passengerUser.setLatLng([lat, lng]);
        } else {
            const icon = L.divIcon({
                className: "pax-commuter-marker",
                html: `<div style="background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #3b82f6;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            markers.passengerUser = L.marker([lat, lng], { icon }).addTo(maps.passenger);
        }
        maps.passenger.setView([lat, lng], 15);

        // Send passenger location to server
        apiRequest("/api/tracking/passenger/location", "POST", { latitude: lat, longitude: lng, accuracy: acc }).catch(() => {});

        // ARM THE STRICT EMERGENCY SOS BUTTON!
        armSOSButton();

        // Refresh bus arrival estimate
        updatePassengerETA();
    });

    checkActiveSOS();
}

function armSOSButton() {
    const btn = document.getElementById("btnPassengerSOS");
    btn.className = "btn-sos armed";
    btn.innerHTML = "🚨 ACTIVATE EMERGENCY SOS";
    btn.onclick = openSOSModal;
    document.getElementById("sosHelperText").textContent = "Real Phone GPS Verified • 2-Step Confirmed Emergency Dispatch Armed";
    document.getElementById("sosHelperText").style.color = "#86efac";
}

function disarmSOSButton(reason) {
    const btn = document.getElementById("btnPassengerSOS");
    btn.className = "btn-sos disabled";
    btn.innerHTML = "⚠️ GPS REQUIRED FOR EMERGENCY SOS";
    btn.onclick = null;
    document.getElementById("sosHelperText").textContent = reason;
    document.getElementById("sosHelperText").style.color = "#94a3b8";
}

function openSOSModal() {
    if (!realLat || !realLng) {
        alert("Cannot trigger emergency without real GPS coordinates.");
        return;
    }

    document.getElementById("sosModalCoords").textContent = `${realLat.toFixed(5)}, ${realLng.toFixed(5)} (±${realAccuracy.toFixed(1)}m)`;
    document.getElementById("sosModal").classList.add("open");

    // 3-second safety confirmation countdown
    sosCountdown = 3;
    const btn = document.getElementById("btnConfirmSOS");
    btn.disabled = true;
    btn.textContent = `Confirm Emergency Dispatch (${sosCountdown}s)`;

    if (sosTimer) clearInterval(sosTimer);
    sosTimer = setInterval(() => {
        sosCountdown--;
        if (sosCountdown > 0) {
            btn.textContent = `Confirm Emergency Dispatch (${sosCountdown}s)`;
        } else {
            clearInterval(sosTimer);
            btn.disabled = false;
            btn.textContent = "🚨 DISPATCH EMERGENCY ASSISTANCE NOW";
        }
    }, 1000);
}

function closeSOSModal() {
    if (sosTimer) clearInterval(sosTimer);
    document.getElementById("sosModal").classList.remove("open");
}

async function triggerConfirmedSOS() {
    closeSOSModal();
    const btn = document.getElementById("btnPassengerSOS");
    btn.disabled = true;
    btn.textContent = "Transmitting Emergency Signal...";

    try {
        const res = await apiRequest("/api/sos", "POST", {
            latitude: realLat,
            longitude: realLng
        });
        const data = await res.json();
        activeSOS = data;
        renderActiveSOSTracker(data);
    } catch (e) {
        alert("Failed to transmit emergency SOS: " + e.message);
    } finally {
        btn.disabled = false;
        armSOSButton();
    }
}

async function checkActiveSOS() {
    try {
        const res = await apiRequest("/api/sos/active");
        if (res.ok) {
            const cases = await res.json();
            if (cases.length > 0) {
                activeSOS = cases[0];
                renderActiveSOSTracker(cases[0]);
            }
        }
    } catch (e) {}
}

function renderActiveSOSTracker(sos) {
    const card = document.getElementById("activeSOSCard");
    if (!sos || ["RESOLVED", "CANCELLED"].includes(sos.status)) {
        card.style.display = "none";
        return;
    }

    card.style.display = "block";
    document.getElementById("sosTicketCode").textContent = sos.sos_id;
    document.getElementById("sosTicketAddress").textContent = sos.address || "Resolving location...";
    document.getElementById("sosTicketStatus").textContent = sos.status;

    const s1 = document.getElementById("step1");
    const s2 = document.getElementById("step2");
    const s3 = document.getElementById("step3");
    const s4 = document.getElementById("step4");

    s1.className = "step done";
    s2.className = "step";
    s3.className = "step";
    s4.className = "step";

    if (sos.status === "ACTIVE") {
        s1.className = "step active";
        document.getElementById("sosTicketDetail").textContent = "Alert broadcasted. Alerting nearest emergency rescue units across Coimbatore City (35.0 km coverage)...";
    } else if (sos.status === "ACKNOWLEDGED") {
        s1.className = "step done";
        s2.className = "step active";
        document.getElementById("sosTicketDetail").textContent = `Accepted by Responder: ${sos.responder_name || 'Rescue Unit'}. Mobilizing.`;
    } else if (sos.status === "RESPONDING") {
        s1.className = "step done";
        s2.className = "step done";
        s3.className = "step active";
        document.getElementById("sosTicketDetail").textContent = `Responder ${sos.responder_name || 'Unit'} is EN ROUTE to your coordinates!`;
    } else if (sos.status === "RESOLVED") {
        s1.className = "step done";
        s2.className = "step done";
        s3.className = "step done";
        s4.className = "step done";
        document.getElementById("sosTicketDetail").textContent = "Emergency resolved. You are marked safe.";
    }
}

async function cancelEmergency() {
    if (!activeSOS) return;
    if (!confirm("Are you sure you want to cancel this emergency alert?")) return;
    try {
        await apiRequest(`/api/sos/${activeSOS.sos_id}/cancel`, "POST", { notes: "Cancelled by commuter" });
        activeSOS = null;
        document.getElementById("activeSOSCard").style.display = "none";
    } catch (e) {
        alert(e.message);
    }
}

async function updatePassengerETA() {
    try {
        const res = await apiRequest("/api/buses/BUS-001");
        if (!res.ok) return;
        const bus = await res.json();

        if (bus.current_latitude && bus.current_longitude) {
            // Update bus marker on passenger map
            if (markers.passengerBus) {
                markers.passengerBus.setLatLng([bus.current_latitude, bus.current_longitude]);
            } else {
                const icon = L.divIcon({
                    className: "custom-bus-pax-icon",
                    html: `<div style="background: #2563eb; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid white;">🚍 BUS-001</div>`,
                    iconSize: [60, 22],
                    iconAnchor: [30, 11]
                });
                markers.passengerBus = L.marker([bus.current_latitude, bus.current_longitude], { icon }).addTo(maps.passenger);
            }

            // Calculate distance & ETA
            if (realLat && realLng) {
                const distKm = computeHaversineKm(realLat, realLng, bus.current_latitude, bus.current_longitude);
                const speed = Math.max(bus.current_speed, 20.0);
                const etaMin = Math.max(1, Math.round((distKm / speed) * 60));

                document.getElementById("paxEtaDistance").textContent = `${distKm.toFixed(2)} km`;
                document.getElementById("paxEtaMinutes").textContent = `${etaMin} min`;
                document.getElementById("paxBusStatus").textContent = bus.status;
            }
        }
    } catch (e) {}
}

// ==========================================
// 6. RESPONDER TACTICAL RADAR IMPLEMENTATION
// ==========================================

function initResponderView() {
    setTimeout(() => {
        if (!maps.responder) {
            maps.responder = setupMapWithGoogleTilesAndPOIs("responderMap", 14);
        }
        maps.responder.invalidateSize();
    }, 150);

    // Start Responder Real Phone GPS Beacon
    startRealPhoneGPS((lat, lng, speed, acc) => {
        document.getElementById("respGpsPill").className = "gps-pill live";
        document.getElementById("respGpsPill").innerHTML = `<span>🟢</span> Beacon Transmitting (±${acc.toFixed(1)}m)`;

        document.getElementById("respCoords").textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        // Update responder marker
        if (markers.responderUser) {
            markers.responderUser.setLatLng([lat, lng]);
        } else {
            const icon = L.divIcon({
                className: "custom-resp-icon",
                html: `<div style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 11px; border: 2px solid white; box-shadow: 0 0 12px #ef4444;">🛡️ RESPONDER (RSP-001)</div>`,
                iconSize: [110, 26],
                iconAnchor: [55, 13]
            });
            markers.responderUser = L.marker([lat, lng], { icon }).addTo(maps.responder);
        }

        // Whole Coimbatore City Metropolitan Geofence Radar (35 km)
        if (markers.responderCircle) {
            markers.responderCircle.setLatLng([lat, lng]);
        } else {
            markers.responderCircle = L.circle([lat, lng], {
                radius: COIMBATORE_RADIUS_METERS,
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.05,
                weight: 2,
                dashArray: "6, 8"
            }).addTo(maps.responder);
            markers.responderCircle.bindTooltip("🛡️ Coimbatore Metropolitan Rescue Radar: 35.0 km Coverage", { permanent: false });
        }

        maps.responder.panTo([lat, lng]);

        // Transmit beacon fix to server
        apiRequest("/api/tracking/responder/location", "POST", { latitude: lat, longitude: lng }).catch(() => {});

        loadResponderAlerts();
    });

    loadResponderAlerts();
}

async function loadResponderAlerts() {
    try {
        const res = await apiRequest("/api/sos/active");
        if (!res.ok) return;
        const cases = await res.json();
        const container = document.getElementById("responderAlertsFeed");
        container.innerHTML = "";

        if (cases.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 18px;">No active emergency cases. Radar monitoring sector.</div>`;
            if (markers.responderSos) {
                maps.responder.removeLayer(markers.responderSos);
                markers.responderSos = null;
            }
            return;
        }

        cases.forEach(c => {
            let distKm = 0;
            let withinCitySector = true;

            if (realLat && realLng) {
                distKm = computeHaversineKm(realLat, realLng, c.latitude, c.longitude);
                withinCitySector = distKm <= SOS_RADIUS_KM;
            }

            const distStr = distKm < 1.0 ? `${Math.round(distKm * 1000)} meters away` : `${distKm.toFixed(2)} km away`;

            const card = document.createElement("div");
            card.className = "card";
            card.style.borderColor = withinCitySector ? "#ef4444" : "#f59e0b";
            card.style.background = withinCitySector ? "rgba(239, 68, 68, 0.08)" : "var(--bg-card)";
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #f87171; font-size: 1.1rem;">🚨 ${c.sos_id}</strong>
                    <span style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: ${withinCitySector ? '#ef4444' : '#f59e0b'}; color: white;">
                        ${withinCitySector ? '📍 WITHIN COIMBATORE RESCUE SECTOR (35 KM)' : '⚠️ OUTSIDE METRO SECTOR'} • ${distStr}
                    </span>
                </div>
                <div style="font-size: 0.95rem; font-weight: 600; margin-bottom: 6px;">📍 ${c.address || 'Location Coordinates Dispatched'}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
                    Victim: ${c.passenger_name} (${c.passenger_phone}) • Status: <strong style="color: #60a5fa;">${c.status}</strong>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-primary" style="flex: 1;" onclick="responderAccept('${c.sos_id}')" ${c.status !== 'ACTIVE' ? 'disabled style="opacity:0.5"' : ''}>
                        ✓ Accept Alert
                    </button>
                    <button class="btn btn-warning" style="flex: 1; background: #f59e0b; color: #111;" onclick="responderRespond('${c.sos_id}')" ${c.status === 'RESOLVED' ? 'disabled' : ''}>
                        🏃 En Route
                    </button>
                    <button class="btn btn-success" style="flex: 1;" onclick="responderResolve('${c.sos_id}')">
                        ★ Resolve
                    </button>
                </div>
            `;
            container.appendChild(card);

            // Marker on map
            if (markers.responderSos) {
                markers.responderSos.setLatLng([c.latitude, c.longitude]);
            } else {
                const icon = L.divIcon({
                    className: "sos-icon-marker",
                    html: `<div style="background: #ef4444; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px #ef4444; animation: armedPulse 1s infinite;"></div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                });
                markers.responderSos = L.marker([c.latitude, c.longitude], { icon }).addTo(maps.responder);
            }
        });
    } catch (e) {}
}

async function responderAccept(sosId) {
    try {
        await apiRequest(`/api/sos/${sosId}/accept`, "POST", { notes: "Responder acknowledged" });
        loadResponderAlerts();
    } catch (e) { alert(e.message); }
}

async function responderRespond(sosId) {
    try {
        await apiRequest(`/api/sos/${sosId}/respond`, "POST", { notes: "Rescue unit dispatched" });
        loadResponderAlerts();
    } catch (e) { alert(e.message); }
}

async function responderResolve(sosId) {
    const notes = prompt("Enter resolution notes:", "Assistance rendered safely. Emergency resolved.");
    if (notes === null) return;
    try {
        await apiRequest(`/api/sos/${sosId}/resolve`, "POST", { notes });
        loadResponderAlerts();
    } catch (e) { alert(e.message); }
}

// ==========================================
// 7. ADMIN COMMAND CENTER IMPLEMENTATION
// ==========================================

function initAdminView() {
    setTimeout(() => {
        if (!maps.admin) {
            maps.admin = setupMapWithGoogleTilesAndPOIs("adminMap", 13);
        }
        maps.admin.invalidateSize();
    }, 150);

    loadAdminDashboard();
}

async function loadAdminDashboard() {
    try {
        await pollBusTelemetry();

        // Load active emergencies
        const sosRes = await apiRequest("/api/sos/active");
        if (sosRes.ok) {
            const cases = await sosRes.json();
            document.getElementById("admActiveSosCount").textContent = cases.length;
            const container = document.getElementById("adminSosFeed");
            container.innerHTML = "";

            if (cases.length === 0) {
                container.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85rem;">No active emergencies. System nominal.</div>`;
                if (markers.adminSos) { maps.admin.removeLayer(markers.adminSos); markers.adminSos = null; }
            } else {
                cases.forEach(c => {
                    const el = document.createElement("div");
                    el.className = "card";
                    el.style.background = "rgba(239, 68, 68, 0.1)";
                    el.style.borderColor = "rgba(239, 68, 68, 0.4)";
                    el.innerHTML = `
                        <strong>🚨 ${c.sos_id} — ${c.status}</strong>
                        <div style="font-size: 0.85rem; margin: 4px 0;">📍 ${c.address}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Victim: ${c.passenger_name} (${c.passenger_phone})</div>
                        <button class="btn btn-danger" style="margin-top: 8px; padding: 6px 12px; font-size: 0.8rem;" onclick="adminResolve('${c.sos_id}')">Resolve Incident</button>
                    `;
                    container.appendChild(el);

                    // Add emergency marker
                    if (markers.adminSos) {
                        markers.adminSos.setLatLng([c.latitude, c.longitude]);
                    } else {
                        const icon = L.divIcon({
                            className: "admin-sos-icon",
                            html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px #ef4444; animation: armedPulse 1s infinite;"></div>`,
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        });
                        markers.adminSos = L.marker([c.latitude, c.longitude], { icon }).addTo(maps.admin);
                    }
                });
            }
        }
    } catch (e) {}
}

async function adminResolve(sosId) {
    if (!confirm(`Mark ${sosId} as RESOLVED?`)) return;
    try {
        await apiRequest(`/api/sos/${sosId}/resolve`, "POST", { notes: "Closed by Admin Command" });
        loadAdminDashboard();
    } catch (e) { alert(e.message); }
}

// ==========================================
// 8. WEBSOCKET REAL-TIME BROADCAST LISTENER
// ==========================================

let wsHeartbeatInterval = null;

function initWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    if (socket) {
        try { socket.close(); } catch(e) {}
    }

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("WebSocket connected to NEXORA telemetry stream.");
        if (wsHeartbeatInterval) clearInterval(wsHeartbeatInterval);
        wsHeartbeatInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send("ping");
            }
        }, 15000);
    };

    socket.onmessage = (e) => {
        try {
            if (e.data === "pong") return;
            const msg = JSON.parse(e.data);
            handleWsMessage(msg);
        } catch (err) {}
    };

    socket.onclose = () => {
        if (wsHeartbeatInterval) clearInterval(wsHeartbeatInterval);
        setTimeout(initWebSocket, 2500);
    };

    socket.onerror = () => {
        try { socket.close(); } catch(e) {}
    };
}

function handleWsMessage(msg) {
    if (msg.type === "BUS_LOCATION_UPDATE") {
        applyLiveBusUpdate(msg.data);
    } else if (msg.type === "SOS_ALERT") {
        playAlertTone();
        if (currentUser && currentUser.role === "RESPONDER") {
            loadResponderAlerts();
        }
        loadAdminDashboard();
    } else if (msg.type === "SOS_STATUS_UPDATE") {
        if (activeSOS && activeSOS.sos_id === msg.data.sos_id) {
            activeSOS.status = msg.data.status;
            if (msg.data.responder_name) activeSOS.responder_name = msg.data.responder_name;
            renderActiveSOSTracker(activeSOS);
        }
        if (currentUser && currentUser.role === "RESPONDER") loadResponderAlerts();
        loadAdminDashboard();
    }
}

// -------------------------------------------------------------
// DYNAMIC LIVE BUS TELEMETRY & ANIMATION ENGINE
// -------------------------------------------------------------
function applyLiveBusUpdate(b) {
    if (!b || typeof b.latitude !== "number" || typeof b.longitude !== "number") return;
    const lat = b.latitude;
    const lng = b.longitude;
    const speed = typeof b.speed === "number" ? b.speed : 0.0;
    const road = b.road || b.location_name || "Avinashi Transit Corridor";
    const status = b.status || "ACTIVE";

    // 0. Update Front Page Live Radar HUD & Home Map Bus Marker
    const homeCoords = document.getElementById("homeBusCoords");
    if (homeCoords) homeCoords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const homeSpeed = document.getElementById("homeBusSpeed");
    if (homeSpeed) homeSpeed.textContent = `${speed.toFixed(1)} km/h`;
    const homeRoad = document.getElementById("homeBusRoad");
    if (homeRoad) homeRoad.textContent = road;

    if (maps.home) {
        if (markers.homeBus) {
            markers.homeBus.setLatLng([lat, lng]);
            if (markers.homeBus.getPopup() && markers.homeBus.isPopupOpen()) {
                markers.homeBus.setPopupContent(`
                    <div style="font-size: 0.85rem; line-height: 1.4;">
                        <strong style="color: #2563eb;">🚍 BUS-001 (TN 38 BX 1001)</strong><br>
                        <strong>📍 Coordinates:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}<br>
                        <strong>⚡ Speed:</strong> ${speed.toFixed(1)} km/h<br>
                        <strong>🛣️ Sector:</strong> ${road}<br>
                        <strong>🟢 Status:</strong> ${status}
                    </div>
                `);
            }
        } else {
            const icon = L.divIcon({
                className: "home-bus-icon",
                html: `<div style="background: #2563eb; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; border: 2px solid white; box-shadow: 0 0 14px rgba(37,99,235,0.8); display: flex; align-items: center; gap: 4px;"><span>🚍</span> BUS-001 <span style="font-size: 9px; opacity: 0.9;">(${speed.toFixed(0)}km/h)</span></div>`,
                iconSize: [95, 28],
                iconAnchor: [47, 14]
            });
            markers.homeBus = L.marker([lat, lng], { icon }).addTo(maps.home);
            markers.homeBus.bindPopup(`
                <div style="font-size: 0.85rem; line-height: 1.4;">
                    <strong style="color: #2563eb;">🚍 BUS-001 (TN 38 BX 1001)</strong><br>
                    <strong>📍 Coordinates:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}<br>
                    <strong>⚡ Speed:</strong> ${speed.toFixed(1)} km/h<br>
                    <strong>🛣️ Sector:</strong> ${road}<br>
                    <strong>🟢 Status:</strong> ${status}
                </div>
            `);
        }
    }

    // 1. Update Admin Dashboard UI Telemetry Row
    const admCoords = document.getElementById("admBusCoords");
    if (admCoords) admCoords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const admSpeed = document.getElementById("admBusSpeed");
    if (admSpeed) admSpeed.textContent = `${speed.toFixed(1)} km/h`;
    const admStatus = document.getElementById("admBusStatus");
    if (admStatus) admStatus.textContent = `${status} (LIVE)`;
    const admRoad = document.getElementById("admBusRoad");
    if (admRoad) admRoad.textContent = road;

    // 2. Update Admin Map Bus Marker
    if (maps.admin) {
        if (markers.adminBus) {
            markers.adminBus.setLatLng([lat, lng]);
            if (markers.adminBus.getPopup() && markers.adminBus.isPopupOpen()) {
                markers.adminBus.setPopupContent(`
                    <div style="font-size: 0.85rem; line-height: 1.4;">
                        <strong style="color: #2563eb;">🚍 BUS-001 (TN 38 BX 1001)</strong><br>
                        <strong>📍 Coordinates:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}<br>
                        <strong>⚡ Speed:</strong> ${speed.toFixed(1)} km/h<br>
                        <strong>🛣️ Sector:</strong> ${road}<br>
                        <strong>🟢 Status:</strong> ${status}
                    </div>
                `);
            }
        } else {
            const icon = L.divIcon({
                className: "admin-bus-icon",
                html: `<div style="background: #2563eb; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; border: 2px solid white; box-shadow: 0 0 14px rgba(37,99,235,0.8); display: flex; align-items: center; gap: 4px;"><span>🚍</span> BUS-001 <span style="font-size: 9px; opacity: 0.9;">(${speed.toFixed(0)}km/h)</span></div>`,
                iconSize: [95, 28],
                iconAnchor: [47, 14]
            });
            markers.adminBus = L.marker([lat, lng], { icon }).addTo(maps.admin);
            markers.adminBus.bindPopup(`
                <div style="font-size: 0.85rem; line-height: 1.4;">
                    <strong style="color: #2563eb;">🚍 BUS-001 (TN 38 BX 1001)</strong><br>
                    <strong>📍 Coordinates:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}<br>
                    <strong>⚡ Speed:</strong> ${speed.toFixed(1)} km/h<br>
                    <strong>🛣️ Sector:</strong> ${road}<br>
                    <strong>🟢 Status:</strong> ${status}
                </div>
            `);
        }
    }

    // 3. Update Passenger Map & Commuter Radar
    if (maps.passenger) {
        if (markers.passengerBus) {
            markers.passengerBus.setLatLng([lat, lng]);
        } else {
            const icon = L.divIcon({
                className: "custom-bus-pax-icon",
                html: `<div style="background: #2563eb; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid white; box-shadow: 0 0 8px rgba(37,99,235,0.7);">🚍 BUS-001</div>`,
                iconSize: [65, 22],
                iconAnchor: [32, 11]
            });
            markers.passengerBus = L.marker([lat, lng], { icon }).addTo(maps.passenger);
        }

        // Compute Distance and ETA if commuter GPS is available
        if (realLat && realLng) {
            const distKm = computeHaversineKm(realLat, realLng, lat, lng);
            const effSpeed = Math.max(speed, 20.0);
            const etaMin = Math.max(1, Math.round((distKm / effSpeed) * 60));

            const distEl = document.getElementById("paxEtaDistance");
            if (distEl) distEl.textContent = `${distKm.toFixed(2)} km away`;
            const minEl = document.getElementById("paxEtaMinutes");
            if (minEl) minEl.textContent = `${etaMin} min`;
        }
        const paxStatus = document.getElementById("paxBusStatus");
        if (paxStatus) paxStatus.textContent = `${status} (EN ROUTE)`;
    }
}

// Continuous polling fallback (2.5s) to guarantee updates never stall even if WS drops
async function pollBusTelemetry() {
    try {
        const res = await fetch(`${API_BASE}/api/buses/BUS-001`);
        if (res.ok) {
            const b = await res.json();
            if (b.current_latitude && b.current_longitude) {
                applyLiveBusUpdate({
                    bus_id: b.bus_id,
                    registration_number: b.registration_number,
                    latitude: b.current_latitude,
                    longitude: b.current_longitude,
                    speed: b.current_speed,
                    status: b.status
                });
            }
        }
    } catch (e) {}
}

setInterval(pollBusTelemetry, 2500);

async function toggleSimulationUI() {
    const btn = document.getElementById("btnSimToggle");
    try {
        if (btn) btn.disabled = true;
        const res = await fetch(`${API_BASE}/api/simulation/toggle`, { method: "POST" });
        const data = await res.json();
        if (btn) {
            btn.textContent = data.is_running ? "⏸ Pause Transit" : "▶ Resume Transit";
            btn.style.color = data.is_running ? "#f59e0b" : "#10b981";
        }
        const badge = document.getElementById("admLiveBadge");
        if (badge) {
            badge.className = data.is_running ? "gps-pill live" : "gps-pill acquiring";
            badge.innerHTML = data.is_running ? "<span>🟢</span> LIVE TELEMETRY" : "<span>🟡</span> TRANSIT PAUSED";
        }
    } catch (e) {
        alert("Could not toggle transit: " + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}


function playAlertTone() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
}

// ==========================================
// 9. UTILITIES & GEOMETRY
// ==========================================

function computeHaversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371.0;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function checkServerHealth() {
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        const badge = document.getElementById("serverHealthBadge");
        if (data.status === "healthy") {
            badge.textContent = "🟢 Server Online";
            badge.style.color = "#10b981";
        }
    } catch (e) {
        const badge = document.getElementById("serverHealthBadge");
        badge.textContent = "🔴 Server Offline";
        badge.style.color = "#ef4444";
    }
}
