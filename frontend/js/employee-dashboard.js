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
// Leave Balance
// ==========================================

function loadLeaveBalance(balances) {

    const myBalance = balances[0]; // backend already scopes this to "self" for Employees

    const listEl = document.getElementById("leaveBalanceList");

    if (!myBalance) {

        document.getElementById("leaveDaysLeft").textContent = "0";
        listEl.innerHTML = `<li>No balance information yet.</li>`;

        return;

    }

    const types = ["Casual", "Sick", "Earned"];

    const remaining = types.reduce((sum, type) => sum + Math.max(0, myBalance[type].quota - myBalance[type].used), 0);

    document.getElementById("leaveDaysLeft").textContent = remaining;

    listEl.innerHTML = types.map(type => `

        <li>
            <div>
                <strong>${type}</strong>
                <br>
                <small>${myBalance[type].used} of ${myBalance[type].quota} used</small>
            </div>
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
// Initial Load
// ==========================================

async function init() {

    try {

        // 30 days back covers "this month" in every case and gives
        // enough history for the "last 7 records" table.

        const monthStart = new Date();
        monthStart.setDate(monthStart.getDate() - 30);
        const from = monthStart.toISOString().split("T")[0];

        const [recentRecords, balances, holidays] = await Promise.all([

            apiFetch(`/attendance?from=${from}&to=${today}`),
            apiFetch("/leave/balances/all"),
            apiFetch("/holidays")

        ]);

        loadTodayStatus(recentRecords);
        loadMonthAndRecent(recentRecords);
        loadLeaveBalance(balances);
        loadNextHoliday(holidays);

    } catch (error) {

        console.error("Failed to load dashboard:", error.message);

    }

}

init();
