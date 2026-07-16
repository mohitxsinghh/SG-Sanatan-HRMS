// ===========================================
// SG SANATAN HRMS - Dynamic Sidebar
// ===========================================
// The sidebar menu depends on who's logged in (Admin sees the full
// management console, Employee sees a self-service menu). Rather than
// hardcode two different <ul> lists per page, every page has an empty
// <ul id="sidebarMenu"></ul> that this file fills in at load time.
// ===========================================

const ADMIN_MENU = [

    { href: "dashboard.html",   icon: "fa-house",              label: "Dashboard" },
    { href: "employees.html",   icon: "fa-users",               label: "Employees" },
    { href: "attendance.html",  icon: "fa-calendar-check",      label: "Attendance" },
    { href: "departments.html", icon: "fa-building",            label: "Departments" },
    { href: "leave.html",       icon: "fa-file-circle-check",   label: "Leave" },
    { href: "reports.html",     icon: "fa-chart-column",        label: "Reports" },
    { href: "holidays.html",    icon: "fa-calendar-days",       label: "Holidays" },
    { href: "payroll.html",     icon: "fa-money-check-dollar",  label: "Payroll" },
    { href: "settings.html",    icon: "fa-gear",                label: "Settings" }

];

const EMPLOYEE_MENU = [

    { href: "employee-dashboard.html", icon: "fa-house",             label: "Dashboard" },
    { href: "my-attendance.html",      icon: "fa-calendar-check",    label: "My Attendance" },
    { href: "my-leave.html",           icon: "fa-file-circle-check", label: "My Leave" },
    { href: "holidays.html",           icon: "fa-calendar-days",     label: "Holidays" },
    { href: "directory.html",          icon: "fa-users",             label: "Directory" },
    { href: "my-account.html",         icon: "fa-user-gear",         label: "My Account" }

];

function renderSidebar() {

    const container = document.getElementById("sidebarMenu");

    if (!container) return;

    const session = typeof getCurrentSession === "function" ? getCurrentSession() : null;

    const menu = session && session.role === "Employee" ? EMPLOYEE_MENU : ADMIN_MENU;

    const currentPage = window.location.pathname.split("/").pop();

    container.innerHTML = menu.map(item => `

        <li class="${item.href === currentPage ? "active" : ""}">
            <a href="${item.href}">
                <i class="fa-solid ${item.icon}"></i>
                ${item.label}
            </a>
        </li>

    `).join("");

}

renderSidebar();
