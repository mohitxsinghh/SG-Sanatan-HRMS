// ==========================================
// SG SANATAN HRMS
// Admin Dashboard (Backend-Connected)
// ==========================================

const session = requireRole(["Admin"]);

const today = new Date().toISOString().split("T")[0];

let employees = [];
let todayAttendance = [];

// DOM Elements

const totalEmployees = document.getElementById("totalEmployees");
const presentToday = document.getElementById("presentToday");
const absentToday = document.getElementById("absentToday");
const leaveToday = document.getElementById("leaveToday");

// ==========================================
// Dashboard Cards
// ==========================================

function updateCards() {

    totalEmployees.textContent = employees.length;

    presentToday.textContent = todayAttendance.filter(a => a.status === "Present").length;
    absentToday.textContent = todayAttendance.filter(a => a.status === "Absent").length;
    leaveToday.textContent = todayAttendance.filter(a => a.status === "Leave").length;

}

// ==========================================
// Today's Attendance
// ==========================================

const todayAttendanceTable = document.getElementById("todayAttendanceTable");

function loadTodayAttendance() {

    if (todayAttendance.length === 0) {

        todayAttendanceTable.innerHTML = `<tr><td colspan="3">No attendance marked today.</td></tr>`;

        return;

    }

    todayAttendanceTable.innerHTML = todayAttendance.map(record => `

        <tr>
            <td>${record.employee?.name || "Unknown"}</td>
            <td>${record.status}</td>
            <td>${record.checkIn || "--"}</td>
        </tr>

    `).join("");

}

// ==========================================
// Recent Employees
// ==========================================

const recentEmployees = document.getElementById("recentEmployees");

function loadRecentEmployees() {

    if (employees.length === 0) {

        recentEmployees.innerHTML = "<li>No employees available.</li>";

        return;

    }

    const latest = [...employees].reverse().slice(0, 5);

    recentEmployees.innerHTML = latest.map(emp => `

        <li>
            <div>
                <strong>${emp.name}</strong>
                <br>
                <small>${emp.department}</small>
            </div>
        </li>

    `).join("");

}

// ==========================================
// Attendance Overview
// ==========================================

function loadAttendanceOverview() {

    document.getElementById("overviewPresent").textContent =
        todayAttendance.filter(a => a.status === "Present").length;

    document.getElementById("overviewAbsent").textContent =
        todayAttendance.filter(a => a.status === "Absent").length;

    document.getElementById("overviewHalfDay").textContent =
        todayAttendance.filter(a => a.status === "Half Day").length;

    document.getElementById("overviewLeave").textContent =
        todayAttendance.filter(a => a.status === "Leave").length;

}

// ==========================================
// Attendance Chart
// ==========================================

let attendanceChartInstance = null;

function loadAttendanceChart() {

    const present = todayAttendance.filter(a => a.status === "Present").length;
    const absent = todayAttendance.filter(a => a.status === "Absent").length;
    const halfDay = todayAttendance.filter(a => a.status === "Half Day").length;
    const leave = todayAttendance.filter(a => a.status === "Leave").length;

    if (attendanceChartInstance) attendanceChartInstance.destroy();

    const ctx = document.getElementById("attendanceChart").getContext("2d");

    attendanceChartInstance = new Chart(ctx, {

        type: "doughnut",

        data: {

            labels: ["Present", "Absent", "Half Day", "Leave"],

            datasets: [{

                data: [present, absent, halfDay, leave],
                backgroundColor: ["#16a34a", "#dc2626", "#f59e0b", "#2563eb"],
                borderWidth: 0

            }]

        },

        options: {

            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom" } }

        }

    });

}

// ==========================================
// Recent Activity
// (still local per-browser - this is just a UI convenience log, not
// core business data, so it doesn't need to be backend-connected)
// ==========================================

const activityFeed = document.getElementById("activityFeed");

function loadActivities() {

    const activities = JSON.parse(localStorage.getItem("activities")) || [];

    if (activities.length === 0) {

        activityFeed.innerHTML = `

        <div class="activity-item">
            <i class="fa-solid fa-circle-info"></i>
            <div><strong>No recent activity.</strong></div>
        </div>

        `;

        return;

    }

    activityFeed.innerHTML = activities.slice().reverse().map(activity => `

        <div class="activity-item">
            <i class="${activity.icon || "fa-solid fa-circle-info"}"></i>
            <div>
                <strong>${activity.message}</strong>
                <small>${activity.time}</small>
            </div>
        </div>

    `).join("");

}

// ==========================================
// Initial Load
// ==========================================

async function init() {

    try {

        [employees, todayAttendance] = await Promise.all([

            apiFetch("/employees"),
            apiFetch(`/attendance?date=${today}`)

        ]);

        updateCards();
        loadTodayAttendance();
        loadRecentEmployees();
        loadAttendanceOverview();
        loadAttendanceChart();
        loadActivities();

    } catch (error) {

        console.error("Failed to load dashboard:", error.message);

    }

}

init();
