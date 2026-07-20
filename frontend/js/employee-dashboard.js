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
// Salary Summary
// - Current Salary: this month's Payroll Net Payable (salary AFTER
//   attendance deductions - Present/Half Day/Absent/Leave/Unmarked,
//   Holidays paid) - comes straight from the Payroll endpoint, which
//   already does this calculation correctly.
// - Overtime: this month's total overtime hours (summed from
//   Attendance), converted to rupees at (Daily Rate ÷ standard work
//   hours) per hour.
// - Net Pay: Current Salary (post-deduction) + Overtime.
// The same overtime-hours total also feeds the "Overtime This Month"
// stat card at the top of the page, so it's computed once here.
// ==========================================

async function loadSalarySummary() {

    try {

        const currentMonth = today.slice(0, 7);
        const monthStart = today.slice(0, 8) + "01"; // "yyyy-mm-01", pure string - no Date/toISOString involved

        const [payrollData, settings, monthRecords] = await Promise.all([

            apiFetch(`/payroll?month=${currentMonth}`),
            apiFetch("/settings"),
            apiFetch(`/attendance?from=${monthStart}&to=${today}`)

        ]);

        const myPayroll = payrollData?.results?.[0] || {};

        const netPayable = Number(myPayroll.netPayable) || 0;

        const dailyRate = Number(myPayroll.dailyRate) || 0;

        const standardWorkHours = Number(settings?.timings?.workHours) || 8;

        const hourlyRate = standardWorkHours > 0 ? dailyRate / standardWorkHours : 0;

        const totalOvertimeHours = monthRecords.reduce((sum, r) => sum + (Number(r.overtime) || 0), 0);

        const overtimePay = totalOvertimeHours * hourlyRate;

        const netPay = netPayable + overtimePay;

        document.getElementById("salaryCurrentAmount").textContent = "₹" + Math.round(netPayable).toLocaleString("en-IN");
        document.getElementById("salaryOvertimeAmount").textContent = "₹" + Math.round(overtimePay).toLocaleString("en-IN");
        document.getElementById("salaryNetAmount").textContent = "₹" + Math.round(netPay).toLocaleString("en-IN");

        const overtimeStatEl = document.getElementById("monthOvertimeHours");

        if (overtimeStatEl) {

            overtimeStatEl.textContent = `${Math.round(totalOvertimeHours * 10) / 10}h`;

        }

    } catch (error) {

        console.error("Failed to load salary summary:", error.message);

    }

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

        const [recentRecords, holidays, notices] = await Promise.all([

            apiFetch(`/attendance?from=${from}&to=${today}`),
            apiFetch("/holidays"),
            apiFetch("/notices")

        ]);

        loadTodayStatus(recentRecords);
        loadMonthAndRecent(recentRecords);
        loadNextHoliday(holidays);
        loadNotices(notices);

        loadSalarySummary(); // separate try/catch inside - won't block the rest of the dashboard if it fails

    } catch (error) {

        console.error("Failed to load dashboard:", error.message);

    }

}

init();
