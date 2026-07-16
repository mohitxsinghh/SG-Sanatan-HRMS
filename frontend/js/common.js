// ==========================================
// SG SANATAN HRMS
// COMMON FUNCTIONS
// ==========================================

function addSystemLog(title, message, type = "info") {

    // =========================
    // Notifications
    // =========================

    let notifications = getNotifications();

    notifications.unshift({

        id: Date.now(),

        title,

        message,

        type,

        time: new Date().toLocaleString(),

        read: false

    });

    if (notifications.length > 30) {

        notifications.pop();

    }

    saveNotifications(notifications);

    // =========================
    // Recent Activity
    // =========================

    let activities = getActivities();

    activities.unshift({

        title,

        message,

        type,

        time: new Date().toLocaleString()

    });

    if (activities.length > 30) {

        activities.pop();

    }

    saveActivities(activities);

    // Refresh notification UI

    if(typeof refreshNotifications==="function"){

        refreshNotifications();

    }

}

// ==========================================
// EMPLOYEE STORAGE
// ==========================================

function getEmployees() {

    return JSON.parse(
        localStorage.getItem("employees")
    ) || [];

}

function saveEmployees(employees) {

    localStorage.setItem(
        "employees",
        JSON.stringify(employees)
    );

}

// ==========================================
// ATTENDANCE STORAGE
// ==========================================

function getAttendance() {

    return JSON.parse(
        localStorage.getItem("attendance")
    ) || [];

}

function saveAttendance(attendance) {

    localStorage.setItem(
        "attendance",
        JSON.stringify(attendance)
    );

}

// ==========================================
// NOTIFICATION STORAGE
// ==========================================

function getNotifications() {

    return JSON.parse(
        localStorage.getItem("notifications")
    ) || [];

}

function saveNotifications(notifications) {

    localStorage.setItem(
        "notifications",
        JSON.stringify(notifications)
    );

}

// ==========================================
// DEPARTMENT STORAGE
// ==========================================

function getDepartments() {

    let departments = JSON.parse(
        localStorage.getItem("departments")
    );

    // First run: seed with the departments employees already used
    // so existing employee records keep matching a real department.

    if (!departments) {

        departments = seedDefaultDepartments();

        saveDepartments(departments);

    }

    return departments;

}

function saveDepartments(departments) {

    localStorage.setItem(
        "departments",
        JSON.stringify(departments)
    );

}

function seedDefaultDepartments() {

    const defaults = ["IT", "HR", "Accounts", "Marketing", "Sales", "Production"];

    return defaults.map((name, index) => ({

        id: Date.now() + index,

        deptId: "DEPT" + String(index + 1).padStart(3, "0"),

        name,

        headId: null,

        description: "",

        status: "Active"

    }));

}

// ==========================================
// HOLIDAY STORAGE
// ==========================================

function getHolidays() {

    let holidays = JSON.parse(
        localStorage.getItem("holidays")
    );

    // First run: seed a few common holidays so the page isn't empty.

    if (!holidays) {

        holidays = seedDefaultHolidays();

        saveHolidays(holidays);

    }

    return holidays;

}

function saveHolidays(holidays) {

    localStorage.setItem(
        "holidays",
        JSON.stringify(holidays)
    );

}

function seedDefaultHolidays() {

    const year = new Date().getFullYear();

    const defaults = [

        { name: "Republic Day", date: `${year}-01-26`, type: "National" },
        { name: "Independence Day", date: `${year}-08-15`, type: "National" },
        { name: "Gandhi Jayanti", date: `${year}-10-02`, type: "National" },
        { name: "Diwali", date: `${year}-11-01`, type: "Festival" }

    ];

    return defaults.map((holiday, index) => ({

        id: Date.now() + index,

        name: holiday.name,

        date: holiday.date,

        type: holiday.type,

        description: ""

    }));

}

// ==========================================
// THEME
// (Settings themselves now live on the backend - see /api/settings.
// This is just the DOM utility that applies a chosen accent preset.)
// ==========================================

// Preset accent colors available in Settings -> Theme.
// Each preset provides the same variable set style.css expects.

const THEME_PRESETS = {

    gold:   { accent: "#D9A521", accentDeep: "#B3860F", accentSoft: "#FBF1D9" },
    blue:   { accent: "#2563EB", accentDeep: "#1D4ED8", accentSoft: "#E8EEFD" },
    green:  { accent: "#16A34A", accentDeep: "#0F7A38", accentSoft: "#E7F7EE" },
    purple: { accent: "#7C3AED", accentDeep: "#6025C4", accentSoft: "#F0E9FD" },
    rose:   { accent: "#E11D48", accentDeep: "#BE123C", accentSoft: "#FDE8ED" }

};

// Applies the chosen accent preset to the live page by overriding the
// --gold / --gold-deep / --gold-soft CSS variables everywhere they're used.

function applyTheme(themeName) {

    const preset = THEME_PRESETS[themeName] || THEME_PRESETS.gold;

    const root = document.documentElement;

    root.style.setProperty("--gold", preset.accent);
    root.style.setProperty("--gold-deep", preset.accentDeep);
    root.style.setProperty("--gold-soft", preset.accentSoft);

}

// ==========================================
// USERS / AUTH STORAGE
// ==========================================

// NOTE: This is a client-only, localStorage-based app (no server).
// simpleHash() below is a lightweight obfuscation, NOT real cryptographic
// security - anyone with access to the browser/device can still inspect
// localStorage directly. This is appropriate for a trusted shared device,
// not for an internet-exposed multi-device deployment.

function simpleHash(str) {

    let hash = 0;

    for (let i = 0; i < str.length; i++) {

        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;

    }

    return "h" + Math.abs(hash).toString(36);

}

function getUsers() {

    let users = JSON.parse(
        localStorage.getItem("users")
    );

    if (!users) {

        users = seedDefaultUsers();

        saveUsers(users);

    }

    return users;

}

function saveUsers(users) {

    localStorage.setItem(
        "users",
        JSON.stringify(users)
    );

}

function seedDefaultUsers() {

    return [{

        id: Date.now(),

        username: "admin",

        passwordHash: simpleHash("admin123"),

        role: "Admin",

        employeeId: null,

        name: "Admin"

    }];

}

// Returns the matching user object if credentials are correct, else null.

function verifyLogin(username, password) {

    const users = getUsers();

    const match = users.find(u =>
        u.username.toLowerCase() === username.toLowerCase().trim() &&
        u.passwordHash === simpleHash(password)
    );

    return match || null;

}

// Creates a login for an employee. Returns { ok, error }.

function createEmployeeLogin(employeeId, username, password, name) {

    const users = getUsers();

    username = username.trim();

    if (!username || !password) {

        return { ok: false, error: "Username and password are required." };

    }

    const duplicate = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (duplicate) {

        return { ok: false, error: "That username is already taken." };

    }

    users.push({

        id: Date.now(),

        username,

        passwordHash: simpleHash(password),

        role: "Employee",

        employeeId,

        name

    });

    saveUsers(users);

    return { ok: true };

}

// Resets an existing employee's password.

function resetEmployeePassword(employeeId, newPassword) {

    const users = getUsers();

    const user = users.find(u => u.employeeId === employeeId);

    if (!user) return { ok: false, error: "No login found for this employee." };

    if (!newPassword) return { ok: false, error: "Please enter a new password." };

    user.passwordHash = simpleHash(newPassword);

    saveUsers(users);

    return { ok: true };

}

// Removes an employee's login (e.g. when the employee record is deleted).

function removeEmployeeLogin(employeeId) {

    let users = getUsers();

    users = users.filter(u => u.employeeId !== employeeId);

    saveUsers(users);

}

function getUserByEmployeeId(employeeId) {

    return getUsers().find(u => u.employeeId === employeeId) || null;

}

// ==========================================
// SESSION STORAGE
// ==========================================

function getCurrentSession() {

    return JSON.parse(
        localStorage.getItem("currentSession")
    ) || null;

}

function saveSession(session) {

    localStorage.setItem(
        "currentSession",
        JSON.stringify(session)
    );

}

function clearSession() {

    localStorage.removeItem("currentSession");

}

function homePageFor(role) {

    return role === "Admin" ? "dashboard.html" : "employee-dashboard.html";

}

function logout() {

    clearSession();

    localStorage.removeItem("authToken");

    window.location.href = "login.html";

}

window.logout = logout;

// ==========================================
// ACTIVITY STORAGE
// ==========================================

function getActivities() {

    return JSON.parse(
        localStorage.getItem("activities")
    ) || [];

}

function saveActivities(activities) {

    localStorage.setItem(
        "activities",
        JSON.stringify(activities)
    );

}

// ==========================================
// PWA - SERVICE WORKER REGISTRATION
// ==========================================
// Runs on every page since common.js is loaded everywhere. Service
// workers require HTTPS (localhost is exempted for dev) - registration
// just silently no-ops on unsupported browsers or plain-HTTP hosting.

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker.register("/sw.js")

            .then((registration) => {

                // If a new service worker takes over (after a deploy),
                // do a one-time reload so the user isn't stuck running
                // stale JS against a newer backend/API contract.

                registration.addEventListener("updatefound", () => {

                    const newWorker = registration.installing;

                    newWorker?.addEventListener("statechange", () => {

                        if (newWorker.state === "activated" && navigator.serviceWorker.controller) {

                            window.location.reload();

                        }

                    });

                });

            })

            .catch((error) => {

                console.warn("Service worker registration failed:", error.message);

            });

    });

}

// ==========================================
// PWA - INSTALL PROMPT
// ==========================================
// Chrome/Edge suppress the automatic install banner once a page calls
// preventDefault() on this event, and hand control to us instead - so
// any page can show its own "Install App" button by calling
// window.promptInstall() from a click handler.

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {

    event.preventDefault();

    deferredInstallPrompt = event;

});

window.promptInstall = async function () {

    if (!deferredInstallPrompt) return { outcome: "unavailable" };

    deferredInstallPrompt.prompt();

    const choice = await deferredInstallPrompt.userChoice;

    deferredInstallPrompt = null;

    return choice;

};

window.addEventListener("appinstalled", () => {

    deferredInstallPrompt = null;

});
