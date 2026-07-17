// ===========================================
// SG SANATAN HRMS - Employee Dashboard (Backend-Connected)
// ===========================================

const session = requireRole(["Employee"]);

const today = new Date().toISOString().split("T")[0];

// ==========================================
// Today's Status
// ==========================================

async function loadTodayStatus(recentRecords) {

    const record = recentRecords.find(r => r.date === today);

    document.getElementById("todayStatus").textContent = record?.status || "Not Marked";

}

// ==========================================
// This Month Attendance % + Recent Table
// (both come from the same "last 30 days" fetch, so it's one request)
// ==========================================

function loadMonthAndRecent(recentRecords) {

    const currentMonth = today.slice(0, 7);

    const monthRecords = recentRecords.filter(r => r.date.slice(0, 7) === currentMonth);

    const presentDays = monthRecords.filter(r => r.status === "Present" || r.status === "Half Day").length;

    const percent = monthRecords.length > 0
        ? Math.round((presentDays / monthRecords.length) * 100)
        : 0;

    document.getElementById("monthAttendancePercent").textContent = `${percent}%`;

    const table = document.getElementById("recentAttendanceTable");

    const last7 = recentRecords

        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7);

    if (last7.length === 0) {

        table.innerHTML = `<tr><td colspan="4">No records yet.</td></tr>`;

        return;

    }

    table.innerHTML = last7.map(r => `

        <tr>
            <td>${r.date}</td>
            <td>${r.status}</td>
            <td>${r.checkIn || "--"}</td>
            <td>${r.checkOut || "--"}</td>
        </tr>

    `).join("");

}

// ==========================================
// This Month's Deduction (Payroll)
// ==========================================

function loadMonthDeduction(payrollData) {

    const el = document.getElementById("monthDeduction");

    if (!el) return;

    const myRow = payrollData.results[0]; // backend scopes this to "self" for Employees

    el.textContent = "₹" + Number(myRow?.deduction || 0).toLocaleString("en-IN");

}

// ==========================================
// Recent Leave Requests
// ==========================================

function statusBadgeClass(status) {

    if (status === "Approved") return "status-approved";
    if (status === "Rejected") return "status-rejected";
    return "status-pending";

}

function loadRecentLeave(leaves) {

    const listEl = document.getElementById("recentLeaveList");

    if (!listEl) return;

    if (leaves.length === 0) {

        listEl.innerHTML = "<li>No leave requests yet.</li>";

        return;

    }

    const recent = leaves.slice(0, 5); // already sorted newest-first by the backend

    listEl.innerHTML = recent.map(l => `

        <li>
            <div>
                <strong>${l.leaveType}</strong>
                <br>
                <small>${l.fromDate} to ${l.toDate} · ${l.days} day(s)</small>
            </div>
            <span class="${statusBadgeClass(l.status)}">${l.status}</span>
        </li>

    `).join("");

}

// ==========================================
// Next Holiday
// ==========================================

function loadNextHoliday(holidays) {

    const upcoming = holidays

        .filter(h => h.date >= today)
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date));

    const nameEl = document.getElementById("nextHolidayName");
    const countdownEl = document.getElementById("nextHolidayCountdown");

    if (upcoming.length === 0) {

        nameEl.textContent = "-";
        countdownEl.textContent = "No upcoming holidays";

        return;

    }

    const next = upcoming[0];

    const daysLeft = Math.round(
        (new Date(next.date + "T00:00:00") - new Date(today + "T00:00:00"))
        / (1000 * 60 * 60 * 24)
    );

    nameEl.textContent = next.name;

    countdownEl.textContent =
        daysLeft === 0 ? "Today" :
        daysLeft === 1 ? "Tomorrow" :
        `In ${daysLeft} days`;

}

// ==========================================
// Company Notice Board (read-only - the backend already only
// returns non-expired notices for the Employee role)
// ==========================================

function loadNotices(notices) {

    const noticeList = document.getElementById("noticeList");

    if (!noticeList) return;

    if (notices.length === 0) {

        noticeList.innerHTML = "<li>No notices posted yet.</li>";

        return;

    }

    noticeList.innerHTML = notices.map(n => `

        <li>📢 ${n.message}</li>

    `).join("");

}

// ==========================================
// Initial Load
// ==========================================

async function init() {

    try {

        // 30 days back covers "this month" in every case and gives
        // enough history for the "last 7 records" table.

        const monthStart = new Date();
        monthStart.setDate(monthStart.getDate() - 30);
        const from = monthStart.toISOString().split("T")[0];

        const currentMonth = today.slice(0, 7);

        const [recentRecords, holidays, notices, payrollData, leaves] = await Promise.all([

            apiFetch(`/attendance?from=${from}&to=${today}`),
            apiFetch("/holidays"),
            apiFetch("/notices"),
            apiFetch(`/payroll?month=${currentMonth}`),
            apiFetch("/leave")

        ]);

        loadTodayStatus(recentRecords);
        loadMonthAndRecent(recentRecords);
        loadNextHoliday(holidays);
        loadNotices(notices);
        loadMonthDeduction(payrollData);
        loadRecentLeave(leaves);

    } catch (error) {

        console.error("Failed to load dashboard:", error.message);

    }

}

init();
