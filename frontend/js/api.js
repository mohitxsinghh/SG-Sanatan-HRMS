// ===========================================
// SG SANATAN HRMS - API Helper
// ===========================================
// Every page that talks to the real backend uses this instead of
// calling fetch() directly, so token-attaching and error-handling
// only has to be written once.
//
// If you serve the backend somewhere other than localhost:3000
// later (e.g. when you deploy), this is the ONE line to change.
// ===========================================

const API_BASE_URL = "http://localhost:3000/api";

async function apiFetch(endpoint, options = {}) {

    const token = localStorage.getItem("authToken");

    const headers = {

        "Content-Type": "application/json",

        ...(options.headers || {})

    };

    if (token) {

        headers["Authorization"] = `Bearer ${token}`;

    }

    let response;

    try {

        response = await fetch(`${API_BASE_URL}${endpoint}`, {

            ...options,

            headers

        });

    } catch (networkError) {

        // The backend server isn't reachable at all (not running,
        // wrong port, etc.) - this is the most common beginner issue.

        throw new Error("Can't reach the server. Is your backend running?");

    }

    // Token missing/invalid/expired - send back to login.

    if (response.status === 401) {

        localStorage.removeItem("authToken");
        localStorage.removeItem("currentSession");

        window.location.href = "login.html";

        return null;

    }

    let data = null;

    try {

        data = await response.json();

    } catch (parseError) {

        // No JSON body (rare) - leave data as null.

    }

    if (!response.ok) {

        throw new Error(data?.message || `Request failed (${response.status})`);

    }

    return data;

}

window.apiFetch = apiFetch;
