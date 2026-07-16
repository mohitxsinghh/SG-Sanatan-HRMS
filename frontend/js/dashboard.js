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
// Company Notice Board (Admin: add / edit / delete)
// ==========================================

const noticeList = document.getElementById("noticeList");
const noticeForm = document.getElementById("noticeForm");
const noticeMessage = document.getElementById("noticeMessage");
const noticeExpiry = document.getElementById("noticeExpiry");
const noticeEditId = document.getElementById("noticeEditId");
const addNoticeBtn = document.getElementById("addNoticeBtn");
const noticeSaveBtn = document.getElementById("noticeSaveBtn");
const noticeCancelBtn = document.getElementById("noticeCancelBtn");

const todayStr = new Date().toISOString().split("T")[0];

let notices = [];

function openNoticeForm(notice = null) {

    noticeForm.style.display = "block";

    if (notice) {

        noticeEditId.value = notice._id;
        noticeMessage.value = notice.message;
        noticeExpiry.value = notice.expiryDate;
        noticeSaveBtn.textContent = "Update";

    } else {

        noticeEditId.value = "";
        noticeMessage.value = "";
        noticeExpiry.value = "";
        noticeSaveBtn.textContent = "Save";

    }

    noticeMessage.focus();

}

function closeNoticeForm() {

    noticeForm.style.display = "none";

    noticeEditId.value = "";
    noticeMessage.value = "";
    noticeExpiry.value = "";

}

addNoticeBtn.addEventListener("click", () => openNoticeForm());
noticeCancelBtn.addEventListener("click", closeNoticeForm);

noticeSaveBtn.addEventListener("click", async () => {

    const message = noticeMessage.value.trim();
    const expiryDate = noticeExpiry.value;

    if (!message) {

        alert("Please enter a notice message.");
        noticeMessage.focus();
        return;

    }

    if (!expiryDate) {

        alert("Please choose an expiry date.");
        noticeExpiry.focus();
        return;

    }

    const editId = noticeEditId.value;

    noticeSaveBtn.disabled = true;

    try {

        if (editId) {

            await apiFetch(`/notices/${editId}`, {

                method: "PUT",
                body: JSON.stringify({ message, expiryDate })

            });

        } else {

            await apiFetch("/notices", {

                method: "POST",
                body: JSON.stringify({ message, expiryDate })

            });

            addSystemLog("Notice Posted", "A new notice was added to the board.", "info");

        }

        closeNoticeForm();

        await loadNotices();

    } catch (error) {

        alert(error.message);

    } finally {

        noticeSaveBtn.disabled = false;

    }

});

async function deleteNotice(id) {

    const confirmDelete = confirm("Delete this notice? This cannot be undone.");

    if (!confirmDelete) return;

    try {

        await apiFetch(`/notices/${id}`, { method: "DELETE" });

        await loadNotices();

    } catch (error) {

        alert(error.message);

    }

}

window.deleteNotice = deleteNotice;

function editNotice(id) {

    const notice = notices.find(n => n._id === id);

    if (notice) openNoticeForm(notice);

}

window.editNotice = editNotice;

function renderNotices() {

    if (notices.length === 0) {

        noticeList.innerHTML = "<li>No notices posted yet.</li>";

        return;

    }

    noticeList.innerHTML = notices.map(n => `

        <li class="${n.expiryDate < todayStr ? "notice-expired" : ""}">

            <div class="notice-text">
                📢 ${n.message}
                <span class="notice-expiry-tag">Expires ${n.expiryDate}${n.expiryDate < todayStr ? " (expired)" : ""}</span>
            </div>

            <div class="notice-actions">

                <button class="notice-edit-btn" onclick="editNotice('${n._id}')" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button class="notice-delete-btn" onclick="deleteNotice('${n._id}')" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </div>

        </li>

    `).join("");

}

async function loadNotices() {

    try {

        notices = await apiFetch("/notices");

        renderNotices();

    } catch (error) {

        noticeList.innerHTML = `<li>Failed to load notices: ${error.message}</li>`;

    }

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
        loadNotices();

    } catch (error) {

        console.error("Failed to load dashboard:", error.message);

    }

}

init();
