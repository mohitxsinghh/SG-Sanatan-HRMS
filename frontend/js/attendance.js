// ===========================================
// SG SANATAN HRMS - Attendance Module (Backend-Connected)
// ===========================================

const session = requireRole(["Admin"]);

// ===========================================
// DOM ELEMENTS
// ===========================================

const totalEmployees = document.getElementById("totalEmployees");
const presentCount   = document.getElementById("presentCount");
const absentCount     = document.getElementById("absentCount");
const halfDayCount   = document.getElementById("halfDayCount");
const leaveCount      = document.getElementById("leaveCount");

const attendanceSearch  = document.getElementById("attendanceSearch");
const departmentFilter  = document.getElementById("departmentFilter");
const attendanceTable   = document.getElementById("attendanceTable");
const toastContainer    = document.getElementById("toastContainer");

// In-memory copies of what the server returned last.

let employees  = [];
let attendance = [];

// Today's date (yyyy-mm-dd, used as the date key everywhere)
const today = new Date().toISOString().split("T")[0];

// Work day length used for overtime calculation (hours).
// Fetched from the backend once per page load (see refreshAttendance)
// and cached here - calculateHours() needs to run synchronously as
// the user types, so it reads this cache rather than awaiting a fetch
// on every keystroke.

let cachedWorkHours = 8;

function getStandardWorkHours() {

    return cachedWorkHours;

}

// ===========================================
// FUNCTIONS
// ===========================================

// -------------------------------------------
// Get today's attendance record for an employee
// -------------------------------------------

function getTodayRecord(employeeId) {

    return attendance.find(record =>
        (record.employee?._id || record.employee) === employeeId
    );

}

// -------------------------------------------
// Populate Department Filter Dropdown
// -------------------------------------------

function loadDepartmentFilter() {

    const departments = [...new Set(employees.map(emp => emp.department))].filter(Boolean);

    const currentValue = departmentFilter.value;

    departmentFilter.innerHTML = `<option value="">All Departments</option>`;

    departments.forEach(dept => {

        departmentFilter.innerHTML += `<option value="${dept}">${dept}</option>`;

    });

    departmentFilter.value = currentValue;

}

// -------------------------------------------
// Calculate Working Hours + Overtime
// -------------------------------------------

function calculateHours(checkIn, checkOut) {

    if (!checkIn || !checkOut) {

        return { workingHours: 0, overtime: 0 };

    }

    const [inH, inM]  = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);

    let minutes = (outH * 60 + outM) - (inH * 60 + inM);

    if (minutes < 0) minutes = 0;

    const totalHours = minutes / 60;

    const standardHours = getStandardWorkHours();

    const workingHours = Math.min(totalHours, standardHours);
    const overtime = Math.max(totalHours - standardHours, 0);

    return {
        workingHours: Math.round(workingHours * 100) / 100,
        overtime: Math.round(overtime * 100) / 100
    };

}

// -------------------------------------------
// Row status class (for row highlighting)
// -------------------------------------------

function statusRowClass(status) {

    switch (status) {

        case "Present":  return "present-row";
        case "Absent":   return "absent-row";
        case "Half Day": return "halfday-row";
        case "Leave":    return "leave-row";
        default:         return "";

    }

}

// -------------------------------------------
// Get Filtered Employee List (search + department)
// -------------------------------------------

function getFilteredEmployees() {

    const keyword = attendanceSearch.value.toLowerCase().trim();
    const dept = departmentFilter.value;

    return employees.filter(emp => {

        const matchesSearch =
            emp.name.toLowerCase().includes(keyword) ||
            (emp.department || "").toLowerCase().includes(keyword);

        const matchesDept = dept === "" || emp.department === dept;

        return matchesSearch && matchesDept;

    });

}

// -------------------------------------------
// Render Attendance Table
// -------------------------------------------

function renderAttendanceTable() {

    const list = getFilteredEmployees();

    if (list.length === 0) {

        attendanceTable.innerHTML = `

        <tr>
            <td colspan="6" class="empty">No employees found.</td>
        </tr>

        `;

        return;

    }

    let rows = "";

    list.forEach(emp => {

        const record = getTodayRecord(emp._id);

        const status   = record?.status   || "Not Marked";
        const checkIn  = record?.checkIn  || "";
        const checkOut = record?.checkOut || "";

        rows += `

        <tr class="${statusRowClass(status)}" data-emp-id="${emp._id}">

            <td>
                <strong>${emp.name}</strong><br>
                <small>${emp.employeeId || ""}</small>
            </td>

            <td>${emp.department || "-"}</td>

            <td>

                <select class="status-select" data-role="status">

                    <option value="Not Marked" ${status === "Not Marked" ? "selected" : ""}>Not Marked</option>
                    <option value="Present" ${status === "Present" ? "selected" : ""}>Present</option>
                    <option value="Absent" ${status === "Absent" ? "selected" : ""}>Absent</option>
                    <option value="Half Day" ${status === "Half Day" ? "selected" : ""}>Half Day</option>
                    <option value="Leave" ${status === "Leave" ? "selected" : ""}>Leave</option>

                </select>

            </td>

            <td>

                <div class="time-box">

                    <input type="time" data-role="checkIn" value="${checkIn}">

                    <button class="punch-btn" data-role="punchIn" title="Set current time">
                        <i class="fa-solid fa-clock"></i>
                    </button>

                </div>

            </td>

            <td>

                <div class="time-box">

                    <input type="time" data-role="checkOut" value="${checkOut}">

                    <button class="punch-btn" data-role="punchOut" title="Set current time">
                        <i class="fa-solid fa-clock"></i>
                    </button>

                </div>

            </td>

            <td>

                <button class="save-btn" data-role="save" title="Save attendance">
                    <i class="fa-solid fa-check"></i>
                </button>

            </td>

        </tr>

        `;

    });

    attendanceTable.innerHTML = rows;

}

// -------------------------------------------
// Update Dashboard Cards (always reflects ALL employees, not just the filtered view)
// -------------------------------------------

function updateCards() {

    totalEmployees.textContent = employees.length;

    presentCount.textContent  = attendance.filter(r => r.status === "Present").length;
    absentCount.textContent   = attendance.filter(r => r.status === "Absent").length;
    halfDayCount.textContent  = attendance.filter(r => r.status === "Half Day").length;
    leaveCount.textContent    = attendance.filter(r => r.status === "Leave").length;

}

// -------------------------------------------
// Save / Update a Single Attendance Record
// -------------------------------------------

async function upsertAttendance(employeeId, status, checkIn, checkOut) {

    const { workingHours, overtime } = calculateHours(checkIn, checkOut);

    await apiFetch("/attendance", {

        method: "PUT",

        body: JSON.stringify({

            employee: employeeId,
            date: today,
            status,
            checkIn: checkIn || "",
            checkOut: checkOut || "",
            workingHours,
            overtime

        })

    });

}

// -------------------------------------------
// Load Employees + Today's Attendance From Server
// -------------------------------------------

async function refreshAttendance() {

    attendanceTable.innerHTML = `<tr><td colspan="6">Loading attendance...</td></tr>`;

    try {

        const [employeesData, attendanceData, settingsData] = await Promise.all([

            apiFetch("/employees"),
            apiFetch(`/attendance?date=${today}`),
            apiFetch("/settings")

        ]);

        employees = employeesData;
        attendance = attendanceData;
        cachedWorkHours = Number(settingsData?.timings?.workHours) || 8;

        loadDepartmentFilter();
        renderAttendanceTable();
        updateCards();

    } catch (error) {

        attendanceTable.innerHTML = `<tr><td colspan="6">Failed to load: ${error.message}</td></tr>`;

        showToast("Load Failed", error.message, true);

    }

}

// -------------------------------------------
// Toast Notifications
// -------------------------------------------

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

    }, 2500);

}

// -------------------------------------------
// Mark All (bulk action for currently filtered employees)
// -------------------------------------------

async function markAll(status) {

    const list = getFilteredEmployees();

    if (list.length === 0) {

        showToast("No Employees", "There are no employees matching the current filters.");

        return;

    }

    const now = new Date();

    const currentTime =
        String(now.getHours()).padStart(2, "0") + ":" +
        String(now.getMinutes()).padStart(2, "0");

    const records = list.map(emp => {

        const record = getTodayRecord(emp._id);

        const checkIn =
            (status === "Present" || status === "Half Day")
                ? (record?.checkIn || currentTime)
                : "";

        const checkOut = record?.checkOut || "";

        const { workingHours, overtime } = calculateHours(checkIn, checkOut);

        return {

            employee: emp._id,
            date: today,
            status,
            checkIn,
            checkOut,
            workingHours,
            overtime

        };

    });

    try {

        await apiFetch("/attendance/bulk", {

            method: "POST",

            body: JSON.stringify({ records })

        });

        addSystemLog(
            "Attendance Marked",
            `${list.length} employee(s) marked as ${status}.`,
            "attendance"
        );

        await refreshAttendance();

        showToast("Attendance Updated", `Marked ${list.length} employee(s) as ${status}.`);

    } catch (error) {

        showToast("Update Failed", error.message, true);

    }

}

window.markAll = markAll;

// -------------------------------------------
// Export Attendance (CSV, all employees for today)
// -------------------------------------------

function exportAttendance() {

    const rows = [
        ["Employee ID", "Name", "Department", "Status", "Check In", "Check Out", "Working Hours", "Overtime"]
    ];

    employees.forEach(emp => {

        const record = getTodayRecord(emp._id);

        rows.push([
            emp.employeeId || "",
            emp.name,
            emp.department || "",
            record?.status || "Not Marked",
            record?.checkIn || "",
            record?.checkOut || "",
            record?.workingHours ?? "",
            record?.overtime ?? ""
        ]);

    });

    const csvContent = rows
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${today}.csv`;

    link.click();

    URL.revokeObjectURL(link.href);

    addSystemLog(
        "Report Generated",
        `Attendance for ${today} was exported to CSV.`,
        "attendance"
    );

    showToast("Export Complete", "Attendance CSV has been downloaded.");

}

window.exportAttendance = exportAttendance;

// ===========================================
// EVENT LISTENERS
// ===========================================

attendanceSearch.addEventListener("keyup", renderAttendanceTable);

departmentFilter.addEventListener("change", renderAttendanceTable);

// Delegated events for dynamically-rendered rows

attendanceTable.addEventListener("click", async function (e) {

    const row = e.target.closest("tr[data-emp-id]");

    if (!row) return;

    const employeeId = row.dataset.empId;

    // Punch In / Punch Out (fills current time)

    const punchBtn = e.target.closest("[data-role='punchIn'], [data-role='punchOut']");

    if (punchBtn) {

        const now = new Date();

        const currentTime =
            String(now.getHours()).padStart(2, "0") + ":" +
            String(now.getMinutes()).padStart(2, "0");

        const targetRole = punchBtn.dataset.role === "punchIn" ? "checkIn" : "checkOut";

        row.querySelector(`[data-role="${targetRole}"]`).value = currentTime;

        return;

    }

    // Save row

    const saveBtn = e.target.closest("[data-role='save']");

    if (saveBtn) {

        const status   = row.querySelector("[data-role='status']").value;
        const checkIn  = row.querySelector("[data-role='checkIn']").value;
        const checkOut = row.querySelector("[data-role='checkOut']").value;

        const employee = employees.find(emp => emp._id === employeeId);

        saveBtn.disabled = true;

        try {

            await upsertAttendance(employeeId, status, checkIn, checkOut);

            addSystemLog(
                "Attendance Marked",
                `${employee ? employee.name : "An employee"}'s attendance was marked as ${status}.`,
                "attendance"
            );

            attendance = await apiFetch(`/attendance?date=${today}`);

            updateCards();

            showToast("Attendance Saved", `${employee ? employee.name : "Employee"} marked as ${status}.`);

        } catch (error) {

            showToast("Save Failed", error.message, true);

        } finally {

            saveBtn.disabled = false;

        }

    }

});

// Update row highlight instantly when status is changed (before saving)

attendanceTable.addEventListener("change", function (e) {

    const statusSelect = e.target.closest("[data-role='status']");

    if (!statusSelect) return;

    const row = statusSelect.closest("tr[data-emp-id]");

    row.className = statusRowClass(statusSelect.value);

});

// ===========================================
// INITIAL LOAD
// ===========================================

refreshAttendance();
