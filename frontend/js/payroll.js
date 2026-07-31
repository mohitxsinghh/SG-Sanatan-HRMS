// ===========================================
// SG SANATAN HRMS - Payroll (Admin Only)
// ===========================================

const session = requireRole(["Admin"]);

const payrollMonth = document.getElementById("payrollMonth");
const payrollTable = document.getElementById("payrollTable");
const toastContainer = document.getElementById("toastContainer");

let currentResults = [];

// ==========================
// Toast
// ==========================

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

// ==========================
// Currency formatting
// ==========================

function formatRupees(amount) {

    return "₹" + Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 });

}

// ==========================
// Load Payroll for the selected month
// ==========================

async function loadPayroll() {

    const month = payrollMonth.value; // "YYYY-MM"

    if (!month) return;

    payrollTable.innerHTML = `<tr><td colspan="14">Loading...</td></tr>`;

    try {

        const data = await apiFetch(`/payroll?month=${month}`);

        currentResults = data.results;

        document.getElementById("payrollEmployeeCount").textContent = data.results.length;
        document.getElementById("payrollWorkingDays").textContent = data.workingDays;

        const totalDeduction = data.results.reduce((sum, r) => sum + r.deduction, 0);

        document.getElementById("payrollTotalDeduction").textContent = formatRupees(totalDeduction);
        document.getElementById("payrollTotalOvertime").textContent = formatRupees(data.totalOvertimePay);
        document.getElementById("payrollTotalPayable").textContent = formatRupees(data.totalPayableWithOvertime);

        if (data.results.length === 0) {

            payrollTable.innerHTML = `<tr><td colspan="14" class="empty">No employees found.</td></tr>`;

            return;

        }

        payrollTable.innerHTML = data.results.map(r => `

            <tr>
                <td><strong>${r.employee.name}</strong><br><small>${r.employee.employeeId}</small></td>
                <td>${r.employee.department}</td>
                <td>${formatRupees(r.salary)}</td>
                <td>${r.present}</td>
                <td>${r.halfDay}</td>
                <td>${r.absent}</td>
                <td>${r.leave}</td>
                <td>${r.notMarked}</td>
                <td>${r.holiday}</td>
                <td>${formatRupees(r.dailyRate)}</td>
                <td>${formatRupees(r.deduction)}</td>
                <td>${formatRupees(r.netPayable)}</td>
                <td>${r.overtimeHours > 0 ? formatRupees(r.overtimePay) + ` <small>(${r.overtimeHours}h)</small>` : formatRupees(0)}</td>
                <td><strong>${formatRupees(r.totalPayable)}</strong></td>
            </tr>

        `).join("");

    } catch (error) {

        payrollTable.innerHTML = `<tr><td colspan="14">Failed to load: ${error.message}</td></tr>`;

        showToast("Load Failed", error.message, true);

    }

}

payrollMonth.addEventListener("change", loadPayroll);

// ==========================
// Export CSV
// ==========================

document.getElementById("exportPayrollBtn").addEventListener("click", () => {

    const rows = currentResults.map(r => [

        r.employee.name,
        r.employee.employeeId,
        r.employee.department,
        r.salary,
        r.present,
        r.halfDay,
        r.absent,
        r.leave,
        r.notMarked,
        r.holiday,
        r.earnedDays,
        r.deductedDays,
        r.dailyRate,
        r.deduction,
        r.netPayable,
        r.overtimeHours,
        r.overtimePay,
        r.totalPayable

    ]);

    const header = [

        "Employee",
        "Employee ID",
        "Department",
        "Salary",
        "Present",
        "Half Day",
        "Absent",
        "Leave",
        "Unmarked",
        "Holiday",
        "Earned Days",
        "Deducted Days",
        "Daily Rate",
        "Deduction",
        "Net Payable",
        "Overtime Hours",
        "Overtime Pay",
        "Total Payable"

    ];

    const allRows = [header, ...rows];

    const csvContent = allRows

        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))

        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `payroll_${payrollMonth.value}.csv`;

    link.click();

    URL.revokeObjectURL(link.href);

});

// ==========================
// Initial Load - defaults to the current month
// ==========================

payrollMonth.value = new Date().toISOString().slice(0, 7);

loadPayroll();
