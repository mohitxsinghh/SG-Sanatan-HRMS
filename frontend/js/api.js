// ===========================================
// SG SANATAN HRMS - API Helper
// ===========================================
// Every page that talks to the real backend uses this instead of
// calling fetch() directly, so token-attaching and error-handling
// only has to be written once.
//
// If you serve the backend somewhere other than where the frontend
// is loaded from, change this. As of Step 3 of deployment, Express
// serves both from the same origin, so a relative path just works -
// no matter whether that origin is localhost:3000 or your live domain.

const API_BASE_URL = "/api";

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
