// NEXORA V1 - Unified Authentication & State Library

const API_BASE = window.location.origin;

function getToken() {
    return localStorage.getItem("nexora_token");
}

function setToken(token) {
    localStorage.setItem("nexora_token", token);
}

function getUser() {
    try {
        const u = localStorage.getItem("nexora_user");
        return u ? JSON.parse(u) : null;
    } catch {
        return null;
    }
}

function setUser(user) {
    localStorage.setItem("nexora_user", JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem("nexora_token");
    localStorage.removeItem("nexora_user");
}

function getAuthHeaders() {
    const token = getToken();
    return {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
}

async function fetchWithAuth(url, options = {}) {
    const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
        clearAuth();
        if (!window.location.pathname.endsWith("/") && !window.location.pathname.endsWith("index.html")) {
            window.location.href = "/";
        }
    }
    return response;
}

function redirectByRole(role) {
    switch (role) {
        case "ADMIN":
            window.location.href = "/admin/";
            break;
        case "DRIVER":
            window.location.href = "/driver/";
            break;
        case "RESPONDER":
            window.location.href = "/responder/";
            break;
        case "PASSENGER":
        default:
            window.location.href = "/passenger/";
            break;
    }
}

async function loginUser(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Login failed" }));
        throw new Error(err.detail || "Invalid credentials");
    }

    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    return data;
}

async function registerPassenger(name, email, password, phone) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone, role: "PASSENGER" })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Registration failed" }));
        throw new Error(err.detail || "Registration error");
    }

    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    return data;
}

async function checkSystemHealth() {
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        return await res.json();
    } catch {
        return { status: "offline", database: "disconnected" };
    }
}

function showToast(message, type = "info") {
    let toast = document.getElementById("alert-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "alert-toast";
        toast.className = "alert-toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `alert-toast show ${type}`;
    setTimeout(() => {
        toast.className = "alert-toast";
    }, 4000);
}
