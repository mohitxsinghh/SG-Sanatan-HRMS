// ===========================================
// SG SANATAN HRMS - Reports Module (Backend-Connected)
// ===========================================

const session = requireRole(["Admin"]);

const today = new Date().toISOString().split("T")[0];

// Data cached once per page load - Employees/Departments/Leave don't
// need re-fetching per filter change (filtering happens client-side),
// only Attendance re-fetches when the date range changes since ranges
// can be large.

let employees = [];
let departments = [];
let leaves = [];

let attendanceChartInstance = null;
let leaveChartInstance = null;
let departmentChartInstance = null;
let directoryChartInstance = null;

// ==========================
// Tabs
// ==========================

document.querySelectorAll(".tab-btn").forEach(btn => {

    btn.addEventListener("click", () => {

        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".report-panel").forEach(p => p.classList.remove("active"));

        btn.classList.add("active");

        document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");

    });

});

// ==========================
// Date Preset Helper
// (shared by the Attendance and Leave tabs)
// ==========================

function computeDateRange(preset) {

    const now = new Date();

    const end = new Date(now);

    let start = new Date(now);

    if (preset === "today") {

        start = new Date(now);

    } else if (preset === "week") {

        start.setDate(now.getDate() - 6);

    } else if (preset === "month") {

        start = new Date(now.getFullYear(), now.getMonth(), 1);

    } else if (preset === "year") {

        start = new Date(now.getFullYear(), 0, 1);

    }

    return {

        from: start.toISOString().split("T")[0],
        to: end.toISOString().split("T")[0]

    };

}

function destroyChart(instance) {

    if (instance) instance.destroy();

}

// ==========================
// CSV Export Helper
// ==========================

function exportCSV(filename, headerRow, rows) {

    const allRows = [headerRow, ...rows];

    const csvContent = allRows

        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))

        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = filename;

    link.click();

    URL.revokeObjectURL(link.href);

}

// ===========================================
// ATTENDANCE REPORT
// ===========================================

const attnPreset = document.getElementById("attnPreset");
const attnFrom = document.getElementById("attnFrom");
const attnTo = document.getElementById("attnTo");
const attnDeptFilter = document.getElementById("attnDeptFilter");

let currentAttendanceRows = []; // cached for CSV export

async function loadAttendanceReport() {

    const from = attnFrom.value;
    const to = attnTo.value;

    if (!from || !to) return;

    const table = document.getElementById("attendanceReportTable");

    table.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;

    try {

        let records = await apiFetch(`/attendance?from=${from}&to=${to}`);

        const deptFilter = attnDeptFilter.value;

        if (deptFilter) {

            records = records.filter(r => r.employee?.department === deptFilter);

        }

        // Group by employee

        const byEmployee = {};

        records.forEach(r => {

            const empId = r.employee?._id;

            if (!empId) return;

            if (!byEmployee[empId]) {

                byEmployee[empId] = {

                    empId,
                    name: r.employee.name,
                    department: r.employee.department,
                    Present: 0,
                    Absent: 0,
                    "Half Day": 0,
                    Leave: 0,
                    total: 0

                };

            }

            byEmployee[empId][r.status] = (byEmployee[empId][r.status] || 0) + 1;
            byEmployee[empId].total += 1;

        });

        const rows = Object.values(byEmployee);

        // Payable Salary only makes sense for a single calendar month
        // (payroll's "working days" concept is inherently monthly). If
        // the selected range spans more than one month, show "-" instead.

        const isSingleMonth = from.slice(0, 7) === to.slice(0, 7);

        if (isSingleMonth) {

            try {

                const payrollData = await apiFetch(`/payroll?month=${from.slice(0, 7)}`);

                const payMap = {};

                payrollData.results.forEach(r => { payMap[r.employee._id] = r.netPayable; });

                rows.forEach(r => { r.payableSalary = payMap[r.empId] ?? null; });

            } catch (payrollError) {

                rows.forEach(r => { r.payableSalary = null; });

            }

        } else {

            rows.forEach(r => { r.payableSalary = null; });

        }

        currentAttendanceRows = rows;

        // Cards

        const present = records.filter(r => r.status === "Present").length;
        const absent = records.filter(r => r.status === "Absent").length;
        const halfDay = records.filter(r => r.status === "Half Day").length;
        const leave = records.filter(r => r.status === "Leave").length;

        document.getElementById("attnTotalRecords").textContent = records.length;
        document.getElementById("attnPresentTotal").textContent = present;
        document.getElementById("attnAbsentTotal").textContent = absent;

        const avgPercent = rows.length > 0
            ? Math.round(rows.reduce((sum, r) => sum + ((r.Present + r["Half Day"] * 0.5) / r.total) * 100, 0) / rows.length)
            : 0;

        document.getElementById("attnAvgPercent").textContent = `${avgPercent}%`;

        // Chart

        destroyChart(attendanceChartInstance);

        attendanceChartInstance = new Chart(document.getElementById("attendanceChart").getContext("2d"), {

            type: "doughnut",

            data: {

                labels: ["Present", "Absent", "Half Day", "Leave"],

                datasets: [{

                    data: [present, absent, halfDay, leave],
                    backgroundColor: ["#16a34a", "#dc2626", "#f59e0b", "#2563eb"],
                    borderWidth: 0

                }]

            },

            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }

        });

        // Table

        if (rows.length === 0) {

            table.innerHTML = `<tr><td colspan="8" class="empty">No records in this range.</td></tr>`;

        } else {

            table.innerHTML = rows.map(r => {

                const percent = Math.round(((r.Present + r["Half Day"] * 0.5) / r.total) * 100);

                const payableText = r.payableSalary === null ? "-" : `₹${Number(r.payableSalary).toLocaleString("en-IN")}`;

                return `
                <tr>
                    <td><strong>${r.name}</strong></td>
                    <td>${r.department || "-"}</td>
                    <td>${r.Present}</td>
                    <td>${r.Absent}</td>
                    <td>${r["Half Day"]}</td>
                    <td>${r.Leave}</td>
                    <td>${percent}%</td>
                    <td>${payableText}</td>
                </tr>
                `;

            }).join("");

        }

    } catch (error) {

        table.innerHTML = `<tr><td colspan="8">Failed to load: ${error.message}</td></tr>`;

    }

}

function applyAttendancePreset() {

    if (attnPreset.value === "custom") return;

    const { from, to } = computeDateRange(attnPreset.value);

    attnFrom.value = from;
    attnTo.value = to;

    loadAttendanceReport();

}

attnPreset.addEventListener("change", applyAttendancePreset);
attnFrom.addEventListener("change", loadAttendanceReport);
attnTo.addEventListener("change", loadAttendanceReport);
attnDeptFilter.addEventListener("change", loadAttendanceReport);

document.getElementById("exportAttnBtn").addEventListener("click", () => {

    const rows = currentAttendanceRows.map(r => {

        const percent = Math.round(((r.Present + r["Half Day"] * 0.5) / r.total) * 100);

        return [

            r.name, r.department, r.Present, r.Absent, r["Half Day"], r.Leave, `${percent}%`,
            r.payableSalary === null ? "-" : r.payableSalary

        ];

    });

    exportCSV(

        `attendance_report_${attnFrom.value}_to_${attnTo.value}.csv`,
        ["Employee", "Department", "Present", "Absent", "Half Day", "Leave", "Attendance %", "Payable Salary"],
        rows

    );

});

// ===========================================
// LEAVE REPORT
// ===========================================

const leavePreset = document.getElementById("leavePreset");
const leaveFrom = document.getElementById("leaveFrom");
const leaveTo = document.getElementById("leaveTo");
const leaveStatusFilter = document.getElementById("leaveStatusFilter");

let currentLeaveRows = [];

function loadLeaveReport() {

    const from = leaveFrom.value;
    const to = leaveTo.value;

    const table = document.getElementById("leaveReportTable");

    if (!from || !to) return;

    // Filter by applied date (createdAt), matching the original design.

    let filtered = leaves.filter(l => {

        const appliedDate = l.createdAt ? l.createdAt.split("T")[0] : "";

        return appliedDate >= from && appliedDate <= to;

    });

    document.getElementById("leaveTotalRequests").textContent = filtered.length;
    document.getElementById("leavePendingTotal").textContent = filtered.filter(l => l.status === "Pending").length;
    document.getElementById("leaveApprovedTotal").textContent = filtered.filter(l => l.status === "Approved").length;
    document.getElementById("leaveRejectedTotal").textContent = filtered.filter(l => l.status === "Rejected").length;

    // Chart - approved days by type

    const typeDays = { Casual: 0, Sick: 0, Earned: 0, Unpaid: 0 };

    filtered.filter(l => l.status === "Approved").forEach(l => {

        typeDays[l.leaveType] = (typeDays[l.leaveType] || 0) + l.days;

    });

    destroyChart(leaveChartInstance);

    leaveChartInstance = new Chart(document.getElementById("leaveChart").getContext("2d"), {

        type: "pie",

        data: {

            labels: Object.keys(typeDays),

            datasets: [{

                data: Object.values(typeDays),
                backgroundColor: ["#D9A521", "#dc2626", "#2563eb", "#6b7280"],
                borderWidth: 0

            }]

        },

        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }

    });

    // Status filter (table only, doesn't affect the cards above)

    const status = leaveStatusFilter.value;

    if (status) {

        filtered = filtered.filter(l => l.status === status);

    }

    currentLeaveRows = filtered;

    if (filtered.length === 0) {

        table.innerHTML = `<tr><td colspan="6" class="empty">No requests in this range.</td></tr>`;

    } else {

        table.innerHTML = filtered.map(l => `

            <tr>
                <td><strong>${l.employee?.name || "Unknown"}</strong></td>
                <td><span class="leave-type-tag">${l.leaveType}</span></td>
                <td>${l.fromDate}</td>
                <td>${l.toDate}</td>
                <td>${l.days}</td>
                <td><span class="status-${l.status.toLowerCase()}">${l.status}</span></td>
            </tr>

        `).join("");

    }

}

function applyLeavePreset() {

    if (leavePreset.value === "custom") return;

    const { from, to } = computeDateRange(leavePreset.value);

    leaveFrom.value = from;
    leaveTo.value = to;

    loadLeaveReport();

}

leavePreset.addEventListener("change", applyLeavePreset);
leaveFrom.addEventListener("change", loadLeaveReport);
leaveTo.addEventListener("change", loadLeaveReport);
leaveStatusFilter.addEventListener("change", loadLeaveReport);

document.getElementById("exportLeaveBtn").addEventListener("click", () => {

    const rows = currentLeaveRows.map(l => [

        l.employee?.name || "Unknown", l.leaveType, l.fromDate, l.toDate, l.days, l.status

    ]);

    exportCSV(

        `leave_report_${leaveFrom.value}_to_${leaveTo.value}.csv`,
        ["Employee", "Type", "From", "To", "Days", "Status"],
        rows

    );

});

// ===========================================
// DEPARTMENT REPORT (live snapshot, no date range)
// ===========================================

let currentDepartmentRows = [];

function loadDepartmentReport() {

    const table = document.getElementById("departmentReportTable");

    const rows = departments.map(dept => {

        const deptEmployees = employees.filter(emp => emp.department === dept.name);

        const active = deptEmployees.filter(emp => emp.status === "Active").length;
        const inactive = deptEmployees.filter(emp => emp.status === "Inactive").length;

        return {

            name: dept.name,
            head: dept.head ? dept.head.name : "Unassigned",
            active,
            inactive,
            total: deptEmployees.length,
            status: dept.status

        };

    });

    currentDepartmentRows = rows;

    document.getElementById("deptTotalCount").textContent = departments.length;
    document.getElementById("deptTotalEmployees").textContent = employees.length;

    document.getElementById("deptAvgCount").textContent =
        departments.length > 0 ? Math.round(employees.length / departments.length) : 0;

    document.getElementById("deptEmptyCount").textContent =
        rows.filter(r => r.total === 0).length;

    destroyChart(departmentChartInstance);

    departmentChartInstance = new Chart(document.getElementById("departmentChart").getContext("2d"), {

        type: "bar",

        data: {

            labels: rows.map(r => r.name),

            datasets: [{

                label: "Employees",
                data: rows.map(r => r.total),
                backgroundColor: "#D9A521"

            }]

        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }

    });

    if (rows.length === 0) {

        table.innerHTML = `<tr><td colspan="6" class="empty">No departments found.</td></tr>`;

    } else {

        table.innerHTML = rows.map(r => `

            <tr>
                <td><strong>${r.name}</strong></td>
                <td>${r.head}</td>
                <td>${r.active}</td>
                <td>${r.inactive}</td>
                <td>${r.total}</td>
                <td><span class="status-${r.status.toLowerCase()}">${r.status}</span></td>
            </tr>

        `).join("");

    }

}

document.getElementById("exportDeptBtn").addEventListener("click", () => {

    const rows = currentDepartmentRows.map(r => [r.name, r.head, r.active, r.inactive, r.total, r.status]);

    exportCSV(

        `department_report_${today}.csv`,
        ["Department", "Head", "Active", "Inactive", "Total", "Status"],
        rows

    );

});

// ===========================================
// EMPLOYEE DIRECTORY REPORT
// ===========================================

const directorySearch = document.getElementById("directorySearch");
const directoryDeptFilter = document.getElementById("directoryDeptFilter");
const directoryStatusFilter = document.getElementById("directoryStatusFilter");

let currentDirectoryRows = [];

function loadDirectoryReport() {

    const keyword = directorySearch.value.toLowerCase().trim();
    const dept = directoryDeptFilter.value;
    const status = directoryStatusFilter.value;

    const filtered = employees.filter(emp => {

        const matchesSearch =
            emp.name.toLowerCase().includes(keyword) ||
            (emp.designation || "").toLowerCase().includes(keyword);

        const matchesDept = dept === "" || emp.department === dept;
        const matchesStatus = status === "" || emp.status === status;

        return matchesSearch && matchesDept && matchesStatus;

    });

    currentDirectoryRows = filtered;

    const table = document.getElementById("directoryReportTable");

    document.getElementById("dirTotalCount").textContent = filtered.length;
    document.getElementById("dirActiveCount").textContent = filtered.filter(e => e.status === "Active").length;
    document.getElementById("dirInactiveCount").textContent = filtered.filter(e => e.status === "Inactive").length;
    document.getElementById("dirDeptCount").textContent = departments.length;

    const activeCount = filtered.filter(e => e.status === "Active").length;
    const inactiveCount = filtered.filter(e => e.status === "Inactive").length;

    destroyChart(directoryChartInstance);

    directoryChartInstance = new Chart(document.getElementById("directoryChart").getContext("2d"), {

        type: "doughnut",

        data: {

            labels: ["Active", "Inactive"],

            datasets: [{

                data: [activeCount, inactiveCount],
                backgroundColor: ["#16a34a", "#dc2626"],
                borderWidth: 0

            }]

        },

        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }

    });

    if (filtered.length === 0) {

        table.innerHTML = `<tr><td colspan="6" class="empty">No employees found.</td></tr>`;

    } else {

        table.innerHTML = filtered.map(emp => `

            <tr>
                <td>${emp.employeeId}</td>
                <td><strong>${emp.name}</strong></td>
                <td>${emp.department}</td>
                <td>${emp.designation}</td>
                <td>${emp.phone || "-"}</td>
                <td><span class="status-${emp.status.toLowerCase()}">${emp.status}</span></td>
            </tr>

        `).join("");

    }

}

directorySearch.addEventListener("keyup", loadDirectoryReport);
directoryDeptFilter.addEventListener("change", loadDirectoryReport);
directoryStatusFilter.addEventListener("change", loadDirectoryReport);

document.getElementById("exportDirectoryBtn").addEventListener("click", () => {

    const rows = currentDirectoryRows.map(e => [

        e.employeeId, e.name, e.department, e.designation, e.phone || "", e.status

    ]);

    exportCSV(

        `employee_directory_${today}.csv`,
        ["ID", "Name", "Department", "Designation", "Phone", "Status"],
        rows

    );

});

// ==========================================
// Populate Department Dropdowns (shared by Attendance + Directory tabs)
// ==========================================

function populateDepartmentDropdowns() {

    [attnDeptFilter, directoryDeptFilter].forEach(select => {

        const currentValue = select.value;

        select.innerHTML = `<option value="">All Departments</option>`;

        departments.forEach(dept => {

            select.innerHTML += `<option value="${dept.name}">${dept.name}</option>`;

        });

        select.value = currentValue;

    });

}

// ==========================================
// Initial Load
// ==========================================

async function init() {

    try {

        [employees, departments, leaves] = await Promise.all([

            apiFetch("/employees"),
            apiFetch("/departments"),
            apiFetch("/leave")

        ]);

        populateDepartmentDropdowns();

        // Attendance + Leave tabs start on "This Month" (matches the
        // default-selected option in the HTML)

        applyAttendancePreset();
        applyLeavePreset();

        loadDepartmentReport();
        loadDirectoryReport();

    } catch (error) {

        showGlobalLoadError(error.message);

    }

}

function showGlobalLoadError(message) {

    document.querySelectorAll("tbody[id$='ReportTable']").forEach(tbody => {

        tbody.innerHTML = `<tr><td colspan="7">Failed to load: ${message}</td></tr>`;

    });

}

init();
