// ===========================================
// SG SANATAN HRMS - My Attendance (Employee Self-Service)
// ===========================================

const session = requireRole(["Employee"]);

const today = new Date().toISOString().split("T")[0];

let todayRecord = null;
let cachedWorkHours = 8;

// ==========================================
// DOM Elements
// ==========================================

const punchStatusText = document.getElementById("punchStatusText");
const punchTimesText = document.getElementById("punchTimesText");
const punchStatusSelect = document.getElementById("punchStatusSelect");
const punchInBtn = document.getElementById("punchInBtn");
const punchOutBtn = document.getElementById("punchOutBtn");

const historyFrom = document.getElementById("historyFrom");
const historyTo = document.getElementById("historyTo");
const historyTable = document.getElementById("historyTable");

const toastContainer = document.getElementById("toastContainer");

// ==========================================
// Toast
// ==========================================

function showToast(title, message, isError = false) {

    if (!toastContainer) return;

    const toast = document.createElement("div");

    toast.className = "toast" + (isError ? " toast-error" : "");

    toast.innerHTML = `

        <i class="fa-solid ${isError ? "fa-triangle-exclamation" : "fa-circle-check"}"></i>

        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>

    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("hide");

        setTimeout(() => toast.remove(), 300);

    }, 3000);

}

// ==========================================
// Hours calculation (mirrors the Admin Attendance page's logic)
// ==========================================

function calculateHours(checkIn, checkOut) {

    if (!checkIn || !checkOut) return { workingHours: 0, overtime: 0 };

    const [inH, inM] = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);

    let minutes = (outH * 60 + outM) - (inH * 60 + inM);

    if (minutes < 0) minutes = 0;

    const totalHours = minutes / 60;

    const workingHours = Math.min(totalHours, cachedWorkHours);
    const overtime = Math.max(totalHours - cachedWorkHours, 0);

    return {
        workingHours: Math.round(workingHours * 100) / 100,
        overtime: Math.round(overtime * 100) / 100
    };

}

function currentTimeString() {

    const now = new Date();

    return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

}

// ==========================================
// Punch Card Display
// ==========================================

function renderPunchCard() {

    if (!todayRecord || !todayRecord.checkIn) {

        punchStatusText.textContent = "Not Marked Today";
        punchTimesText.textContent = "You haven't punched in yet.";

        punchInBtn.style.display = "inline-flex";
        punchOutBtn.style.display = "none";
        punchStatusSelect.disabled = false;

    } else if (todayRecord.checkIn && !todayRecord.checkOut) {

        punchStatusText.textContent = `${todayRecord.status} - Punched In`;
        punchTimesText.textContent = `Checked in at ${todayRecord.checkIn}`;

        punchInBtn.style.display = "none";
        punchOutBtn.style.display = "inline-flex";
        punchStatusSelect.disabled = true;

    } else {

        punchStatusText.textContent = `${todayRecord.status} - Completed`;
        punchTimesText.textContent = `${todayRecord.checkIn} to ${todayRecord.checkOut} (${todayRecord.workingHours || 0}h worked)`;

        punchInBtn.style.display = "none";
        punchOutBtn.style.display = "none";
        punchStatusSelect.disabled = true;

    }

}

// ==========================================
// Punch In
// ==========================================

punchInBtn.addEventListener("click", async () => {

    const status = punchStatusSelect.value;
    const checkIn = currentTimeString();

    punchInBtn.disabled = true;

    try {

        await apiFetch("/attendance", {

            method: "PUT",

            body: JSON.stringify({ date: today, status, checkIn, checkOut: "" })

        });

        showToast("Punched In", `Marked ${status} at ${checkIn}.`);

        await loadTodayAndMonth();

    } catch (error) {

        showToast("Punch In Failed", error.message, true);

    } finally {

        punchInBtn.disabled = false;

    }

});

// ==========================================
// Punch Out
// ==========================================

punchOutBtn.addEventListener("click", async () => {

    const checkOut = currentTimeString();

    const { workingHours, overtime } = calculateHours(todayRecord.checkIn, checkOut);

    punchOutBtn.disabled = true;

    try {

        await apiFetch("/attendance", {

            method: "PUT",

            body: JSON.stringify({

                date: today,
                status: todayRecord.status,
                checkIn: todayRecord.checkIn,
                checkOut,
                workingHours,
                overtime

            })

        });

        showToast("Punched Out", `Checked out at ${checkOut}.`);

        await loadTodayAndMonth();

    } catch (error) {

        showToast("Punch Out Failed", error.message, true);

    } finally {

        punchOutBtn.disabled = false;

    }

});

// ==========================================
// This Month Cards + Today's Record
// (one fetch covers both, same pattern as the dashboard)
// ==========================================

async function loadTodayAndMonth() {

    const monthStart = new Date();
    monthStart.setDate(1);
    const from = monthStart.toISOString().split("T")[0];

    const records = await apiFetch(`/attendance?from=${from}&to=${today}`);

    todayRecord = records.find(r => r.date === today) || null;

    renderPunchCard();

    document.getElementById("monthTotal").textContent = records.length;
    document.getElementById("monthPresent").textContent = records.filter(r => r.status === "Present").length;
    document.getElementById("monthAbsent").textContent = records.filter(r => r.status === "Absent").length;
    document.getElementById("monthHalfDay").textContent = records.filter(r => r.status === "Half Day").length;
    document.getElementById("monthLeave").textContent = records.filter(r => r.status === "Leave").length;

}

// ==========================================
// History Table (date range)
// ==========================================

async function loadHistory() {

    const from = historyFrom.value;
    const to = historyTo.value;

    if (!from || !to) return;

    historyTable.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

    try {

        const records = await apiFetch(`/attendance?from=${from}&to=${to}`);

        const sorted = records.slice().sort((a, b) => b.date.localeCompare(a.date));

        if (sorted.length === 0) {

            historyTable.innerHTML = `<tr><td colspan="6" class="empty">No records in this range.</td></tr>`;

            return;

        }

        historyTable.innerHTML = sorted.map(r => `

            <tr class="${r.status === "Present" ? "present-row" : r.status === "Absent" ? "absent-row" : r.status === "Half Day" ? "halfday-row" : r.status === "Leave" ? "leave-row" : ""}">
                <td>${r.date}</td>
                <td>${r.status}</td>
                <td>${r.checkIn || "--"}</td>
                <td>${r.checkOut || "--"}</td>
                <td>${r.workingHours || 0}</td>
                <td>${r.overtime || 0}</td>
            </tr>

        `).join("");

    } catch (error) {

        historyTable.innerHTML = `<tr><td colspan="6">Failed to load: ${error.message}</td></tr>`;

    }

}

historyFrom.addEventListener("change", loadHistory);
historyTo.addEventListener("change", loadHistory);

// ==========================================
// Initial Load
// ==========================================

async function init() {

    try {

        const settings = await apiFetch("/settings");

        cachedWorkHours = Number(settings?.timings?.workHours) || 8;

        // Default history range: last 30 days

        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);

        historyFrom.value = monthAgo.toISOString().split("T")[0];
        historyTo.value = today;

        await loadTodayAndMonth();
        await loadHistory();

    } catch (error) {

        showToast("Load Failed", error.message, true);

    }

}

init();
