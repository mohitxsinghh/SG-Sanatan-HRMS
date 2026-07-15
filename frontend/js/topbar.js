// ==========================================
// SG SANATAN HRMS
// Common Topbar
// ==========================================

// ==========================================
// PAGE DETAILS
// ==========================================

const pageDetails = {

    "dashboard.html": {
        title: "Dashboard",
        subtitle: "Welcome to SG Sanatan HRMS"
    },

    "employees.html": {
        title: "Employee Management",
        subtitle: "Manage all employees",

        actionButton:{

            id:"addEmployeeBtn",

            icon:"fa-plus",

            text:"Add Employee"

        }

    },

    "attendance.html": {
        title: "Attendance Management",
        subtitle: "Manage daily attendance"
    },

    "departments.html": {
        title: "Departments",
        subtitle: "Manage company departments",

        actionButton:{

            id:"addDepartmentBtn",

            icon:"fa-plus",

            text:"Add Department"

        }

    },

    "leave.html": {
        title: "Leave Management",
        subtitle: "Manage employee leave",

        actionButton:{

            id:"applyLeaveBtn",

            icon:"fa-plus",

            text:"Apply Leave"

        }

    },

    "reports.html": {
        title: "Reports",
        subtitle: "Generate reports"
    },

    "holidays.html": {
        title: "Holidays",
        subtitle: "Company holiday calendar",

        actionButton:{

            id:"addHolidayBtn",

            icon:"fa-plus",

            text:"Add Holiday"

        },

        adminOnlyAction: true

    },

    "settings.html": {
        title: "Settings",
        subtitle: "Application settings"
    },

    "employee-dashboard.html": {
        title: "Dashboard",
        subtitle: "Welcome back"
    },

    "my-attendance.html": {
        title: "My Attendance",
        subtitle: "Mark today's attendance and view your history"
    },

    "my-leave.html": {
        title: "My Leave",
        subtitle: "Apply for leave and track your requests",

        actionButton:{

            id:"applyLeaveBtn",

            icon:"fa-plus",

            text:"Apply Leave"

        }

    },

    "directory.html": {
        title: "Employee Directory",
        subtitle: "Browse company departments and colleagues"
    },

    "my-account.html": {
        title: "My Account",
        subtitle: "Update your name, email, and password"
    }

};

// ==========================================
// CURRENT PAGE
// ==========================================

const currentPage =
window.location.pathname.split("/").pop();

const page =
pageDetails[currentPage];

const topbarSession =
typeof getCurrentSession === "function" ? getCurrentSession() : null;

const showActionButton =
    page?.actionButton &&
    (!page.adminOnlyAction || topbarSession?.role === "Admin");

// ==========================================
// CREATE TOPBAR
// ==========================================

const topbar =
document.getElementById("commonTopbar");

if(topbar){

    topbar.innerHTML = `

    <div class="topbar">

        <div class="topbar-left">

            <h1 class="page-title">

                ${page?.title || "SG Sanatan HRMS"}

            </h1>

            <p class="page-subtitle">

                ${page?.subtitle || ""}

            </p>

        </div>

        <div class="topbar-right">

            ${showActionButton ? `

            <button
                id="${page.actionButton.id}"
                class="topbar-action-btn">

                <i class="fa-solid ${page.actionButton.icon}"></i>

                ${page.actionButton.text}

            </button>

            ` : ""}

            <!-- Notification -->

            <div class="notification-wrapper">

                <button
                    id="notificationBtn"
                    class="notification-btn">

                    <i class="fa-solid fa-bell"></i>

                    <span id="notificationCount">0</span>

                </button>

                <div
                    id="notificationDropdown"
                    class="notification-dropdown">

                    <div class="notification-header">

                        <h3>Notifications</h3>

                        <button id="clearNotifications">

                            Clear All

                        </button>

                    </div>

                    <div
                        id="notificationList"
                        class="notification-list">

                    </div>

                </div>

            </div>

            <!-- Live Clock -->

            <div class="live-clock">

                <div class="clock-icon">

                    <i class="fa-regular fa-clock"></i>

                </div>

                <div class="clock-info">

                    <span id="liveTime">

                        00:00:00

                    </span>

                    <small id="liveDate">

                        01 Jan 2026

                    </small>

                </div>

            </div>

            <!-- Profile -->

            <div class="profile-wrapper">

                <button
                    class="profile-btn"
                    id="profileBtn">

                    <div class="profile-avatar">
                        <img src="assets/logo.webp" alt="Profile">
                    </div>

                    <div class="profile-info">

                        <strong id="topbarAdminName">Admin</strong>

                        <small id="topbarAdminRole">Administrator</small>

                    </div>

                    <i class="fa-solid fa-chevron-down"></i>

                </button>

                <div class="profile-dropdown" id="profileDropdown">

                    <button id="logoutBtn">
                        <i class="fa-solid fa-right-from-bracket"></i>
                        Logout
                    </button>

                </div>

            </div>

        </div>

    </div>

    `;

}

// ==========================================
// COMMON NOTIFICATIONS
// ==========================================

const notificationBtn = document.getElementById("notificationBtn");
const notificationDropdown = document.getElementById("notificationDropdown");
const notificationList = document.getElementById("notificationList");
const notificationCount = document.getElementById("notificationCount");
const clearNotifications = document.getElementById("clearNotifications");

let notifications =
JSON.parse(localStorage.getItem("notifications")) || [];

function loadNotifications(){

    if(!notificationList) return;

    notificationList.innerHTML = "";

    if(notifications.length===0){

        notificationList.innerHTML=`

            <div class="notification-item">

                <div class="notification-icon icon-info">

                    <i class="fa-solid fa-circle-info"></i>

                </div>

                <div>

                    <strong>No Notifications</strong>

                    <p>You're all caught up.</p>

                </div>

            </div>

        `;

        notificationCount.style.display="none";

        return;

    }

    let unread=0;

    notifications.forEach(note=>{

        if(!note.read) unread++;

        let icon="fa-circle-info";
        let color="icon-info";

        switch(note.type){

            case "employee":

                icon="fa-user-plus";
                color="icon-employee";
                break;

            case "attendance":

                icon="fa-calendar-check";
                color="icon-attendance";
                break;

            case "warning":

                icon="fa-triangle-exclamation";
                color="icon-warning";
                break;

            case "leave":

                icon="fa-plane-departure";
                color="icon-leave";
                break;

        }

        notificationList.innerHTML += `

        <div
            class="notification-item ${note.read ? "" : "unread"}"
            data-id="${note.id}">

            <div class="notification-icon ${color}">

                <i class="fa-solid ${icon}"></i>

            </div>

            <div>

                <strong>${note.title}</strong>

                <p>${note.message}</p>

                <small>${note.time}</small>

            </div>

        </div>

        `;

    });

    notificationCount.style.display =
    unread ? "flex" : "none";

    notificationCount.textContent = unread;

}

loadNotifications();

notificationBtn?.addEventListener("click",e=>{

    e.stopPropagation();

    notificationDropdown.classList.toggle("show");

});

document.addEventListener("click",()=>{

    notificationDropdown?.classList.remove("show");

});

clearNotifications?.addEventListener("click",()=>{

    notifications=[];

    localStorage.removeItem("notifications");

    loadNotifications();

});

// ==========================================
// PROFILE DROPDOWN / LOGOUT
// ==========================================

const profileBtn = document.getElementById("profileBtn");
const profileDropdown = document.getElementById("profileDropdown");
const logoutBtn = document.getElementById("logoutBtn");

profileBtn?.addEventListener("click", e => {

    e.stopPropagation();

    profileDropdown.classList.toggle("show");

});

document.addEventListener("click", () => {

    profileDropdown?.classList.remove("show");

});

logoutBtn?.addEventListener("click", () => {

    if (typeof logout === "function") {

        logout();

    }

});

// ==========================================
// GLOBAL REFRESH
// ==========================================

window.refreshNotifications = function(){

    notifications =
    JSON.parse(localStorage.getItem("notifications")) || [];

    loadNotifications();

};

window.refreshNotifications();

// ==========================================
// LIVE CLOCK
// ==========================================

function updateLiveClock(){

    const time =
    document.getElementById("liveTime");

    const date =
    document.getElementById("liveDate");

    if(!time || !date) return;

    const now = new Date();

    time.textContent =
    now.toLocaleTimeString("en-IN",{

        hour:"2-digit",

        minute:"2-digit",

        second:"2-digit",

        hour12:true

    });

    date.textContent =
    now.toLocaleDateString("en-IN",{

        day:"2-digit",

        month:"short",

        year:"numeric"

    });

}

updateLiveClock();

setInterval(updateLiveClock,1000);

// ==========================================
// APPLY SETTINGS GLOBALLY
// (theme accent, sidebar company info)
// Runs on every page since topbar.js is loaded everywhere.
// Settings now live on the backend, so this is async - the topbar
// briefly shows defaults, then updates once the fetch resolves.
// ==========================================

async function applyGlobalSettings(){

    // Profile name/role - always the REAL logged-in identity now
    // (Admin's own account name, or the Employee's own name), not a
    // separately-editable "Admin Profile" setting.

    const adminNameEl = document.getElementById("topbarAdminName");
    const adminRoleEl = document.getElementById("topbarAdminRole");

    if (topbarSession) {

        if (adminNameEl) adminNameEl.textContent = topbarSession.name || topbarSession.role;
        if (adminRoleEl) adminRoleEl.textContent = topbarSession.role;

    }

    // Theme + company info come from the backend.

    if (!topbarSession || typeof apiFetch !== "function") return;

    try {

        const settings = await apiFetch("/settings");

        if (typeof applyTheme === "function") {

            applyTheme(settings.theme.accent);

        }

        const sidebarName = document.querySelector(".sidebar .logo h2");
        const sidebarTagline = document.querySelector(".sidebar .logo p");

        if (sidebarName) sidebarName.textContent = settings.company.name;
        if (sidebarTagline) sidebarTagline.textContent = settings.company.tagline;

    } catch (error) {

        // Non-fatal - page still works with default styling if this fails
        // (e.g. backend not running yet). No need to show a toast for it.

        console.warn("Couldn't load settings:", error.message);

    }

}

applyGlobalSettings();

// Re-apply instantly if Settings are changed in this tab (no reload needed)

window.addEventListener("settingsUpdated", applyGlobalSettings);