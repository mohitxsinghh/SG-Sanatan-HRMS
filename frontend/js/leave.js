// ===========================================
// SG SANATAN HRMS - Leave Module (Backend-Connected)
// ===========================================

const session = requireRole(["Admin"]);

// In-memory copies of what the server returned last.

let leaves = [];
let balances = [];
let employees = [];

// Edit Mode
let editMode = false;
let editLeaveId = null;

const today = new Date().toISOString().split("T")[0];

// ==========================
// DOM Elements
// ==========================

const leaveModal = document.getElementById("leaveModal");

const closeModal = document.getElementById("closeModal");
const cancelBtn  = document.getElementById("cancelBtn");
const saveBtn    = document.getElementById("saveBtn");

const leaveTable = document.getElementById("leaveTable");
const balanceTable = document.getElementById("balanceTable");

const totalRequests = document.getElementById("totalRequests");
const pendingCount   = document.getElementById("pendingCount");
const approvedCount  = document.getElementById("approvedCount");
const onLeaveToday   = document.getElementById("onLeaveToday");

const leaveForm = document.getElementById("leaveForm");

const leaveSearch   = document.getElementById("leaveSearch");
const statusFilter  = document.getElementById("statusFilter");
const toastContainer = document.getElementById("toastContainer");

// Form Fields

const leaveEmployee = document.getElementById("leaveEmployee");
const leaveType      = document.getElementById("leaveType");
const leaveFrom       = document.getElementById("leaveFrom");
const leaveTo          = document.getElementById("leaveTo");
const leaveReason       = document.getElementById("leaveReason");
const daysPreview        = document.getElementById("daysPreview");

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
// Open Apply Leave Modal
// ==========================

document.addEventListener("click", function (e) {

    const addBtn = e.target.closest("#applyLeaveBtn");

    if (!addBtn) return;

    editMode = false;
    editLeaveId = null;

    document.getElementById("modalTitle").textContent = "Apply Leave";
    saveBtn.textContent = "Submit Request";

    clearForm();

    populateEmployeeDropdown();

    leaveModal.style.display = "flex";

});

// ==========================
// Close Modal
// ==========================

closeModal.onclick = closeLeaveModal;
cancelBtn.onclick = closeLeaveModal;

window.onclick = function (e) {

    if (e.target === leaveModal) {

        closeLeaveModal();

    }

};

function closeLeaveModal() {

    leaveModal.style.display = "none";

    clearForm();

}

// ==========================
// Clear Form
// ==========================

function clearForm() {

    if (!leaveForm) return;

    leaveForm.reset();

    daysPreview.textContent = "0 day(s)";

    editLeaveId = null;
    editMode = false;

}

// ==========================
// Populate Employee Dropdown
// ==========================

function populateEmployeeDropdown() {

    const currentValue = leaveEmployee.value;

    leaveEmployee.innerHTML = `<option value="">Select Employee</option>`;

    employees.forEach(emp => {

        leaveEmployee.innerHTML += `<option value="${emp._id}">${emp.name}</option>`;

    });

    leaveEmployee.value = currentValue;

}

// ==========================
// Live Days Preview
// ==========================

function calculateDaysPreview() {

    if (!leaveFrom.value || !leaveTo.value) {

        daysPreview.textContent = "0 day(s)";

        return;

    }

    const from = new Date(leaveFrom.value + "T00:00:00");
    const to = new Date(leaveTo.value + "T00:00:00");

    const diffDays = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;

    daysPreview.textContent = diffDays > 0 ? `${diffDays} day(s)` : "Invalid range";

}

leaveFrom.addEventListener("change", calculateDaysPreview);
leaveTo.addEventListener("change", calculateDaysPreview);

// ==========================
// Get Form Data
// ==========================

function getLeaveFormData() {

    return {

        employee: leaveEmployee.value,
        leaveType: leaveType.value,
        fromDate: leaveFrom.value,
        toDate: leaveTo.value,
        reason: leaveReason.value.trim()

    };

}

// ==========================
// Load Everything From Server
// ==========================

async function loadLeaveData() {

    leaveTable.innerHTML = `<tr><td colspan="7">Loading leave requests...</td></tr>`;
    balanceTable.innerHTML = `<tr><td colspan="4">Loading balances...</td></tr>`;

    try {

        [leaves, balances, employees] = await Promise.all([

            apiFetch("/leave"),
            apiFetch("/leave/balances/all"),
            apiFetch("/employees")

        ]);

        displayLeaves();
        displayBalances();
        updateDashboard();

    } catch (error) {

        leaveTable.innerHTML = `<tr><td colspan="7">Failed to load: ${error.message}</td></tr>`;

        showToast("Load Failed", error.message, true);

    }

}

// ==========================
// Save Leave Request (Create or Edit - edit only while Pending)
// ==========================

saveBtn.onclick = async function () {

    const data = getLeaveFormData();

    if (!data.employee) {
        showToast("Missing Employee", "Please select an employee.", true);
        return;
    }

    if (!data.leaveType) {
        showToast("Missing Type", "Please select a leave type.", true);
        return;
    }

    if (!data.fromDate || !data.toDate) {
        showToast("Missing Dates", "Please select both From and To dates.", true);
        return;
    }

    if (data.toDate < data.fromDate) {
        showToast("Invalid Range", "To Date must be on or after From Date.", true);
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = editMode ? "Updating..." : "Submitting...";

    try {

        if (editMode) {

            await apiFetch(`/leave/${editLeaveId}`, {

                method: "PUT",
                body: JSON.stringify(data)

            });

            showToast("Request Updated", "The leave request was updated.");

        } else {

            await apiFetch("/leave", {

                method: "POST",
                body: JSON.stringify(data)

            });

            showToast("Request Submitted", "The leave request was submitted as Pending.");

        }

        closeLeaveModal();

        await loadLeaveData();

    } catch (error) {

        showToast(editMode ? "Update Failed" : "Submit Failed", error.message, true);

    } finally {

        saveBtn.disabled = false;
        saveBtn.textContent = editMode ? "Update Request" : "Submit Request";

    }

};

// ==========================
// Display Leave Requests
// ==========================

function statusBadgeClass(status) {

    if (status === "Approved") return "status-approved";
    if (status === "Rejected") return "status-rejected";
    return "status-pending";

}

function getFilteredLeaves() {

    const keyword = leaveSearch.value.toLowerCase().trim();
    const status = statusFilter.value;

    return leaves.filter(leave => {

        const empName = leave.employee?.name || "";

        const matchesSearch = empName.toLowerCase().includes(keyword);
        const matchesStatus = status === "" || leave.status === status;

        return matchesSearch && matchesStatus;

    });

}

function displayLeaves() {

    const list = getFilteredLeaves();

    if (list.length === 0) {

        leaveTable.innerHTML = `<tr><td colspan="7" class="empty">No leave requests found.</td></tr>`;

        return;

    }

    let rows = "";

    list.forEach(leave => {

        const empName = leave.employee?.name || "Unknown";

        rows += `
        <tr>

            <td><strong>${empName}</strong></td>

            <td><span class="leave-type-tag">${leave.leaveType}</span></td>

            <td>${leave.fromDate}</td>

            <td>${leave.toDate}</td>

            <td>${leave.days}</td>

            <td><span class="${statusBadgeClass(leave.status)}">${leave.status}</span></td>

            <td>

                ${leave.status === "Pending" ? `

                    <button class="approve-btn" onclick="approveLeave('${leave._id}')" title="Approve">
                        <i class="fa-solid fa-check"></i>
                    </button>

                    <button class="reject-btn" onclick="rejectLeave('${leave._id}')" title="Reject">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                    <button class="edit-btn" onclick="editLeave('${leave._id}')" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>

                ` : ""}

                <button class="delete-btn" onclick="deleteLeave('${leave._id}')" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </td>

        </tr>
        `;

    });

    leaveTable.innerHTML = rows;

}

// ==========================
// Edit (Pending only)
// ==========================

function editLeave(id) {

    const leave = leaves.find(l => l._id === id);

    if (!leave) return;

    if (leave.status !== "Pending") {

        showToast("Can't Edit", "Only pending requests can be edited.", true);
        return;

    }

    editMode = true;
    editLeaveId = id;

    populateEmployeeDropdown();

    leaveEmployee.value = leave.employee?._id || "";
    leaveType.value = leave.leaveType;
    leaveFrom.value = leave.fromDate;
    leaveTo.value = leave.toDate;
    leaveReason.value = leave.reason || "";

    calculateDaysPreview();

    document.getElementById("modalTitle").textContent = "Edit Leave Request";
    saveBtn.textContent = "Update Request";

    leaveModal.style.display = "flex";

}

window.editLeave = editLeave;

// ==========================
// Approve / Reject / Delete
// ==========================

async function approveLeave(id) {

    try {

        await apiFetch(`/leave/${id}/approve`, { method: "PUT" });

        showToast("Leave Approved", "The request was approved and marked in Attendance.");

        await loadLeaveData();

    } catch (error) {

        showToast("Approve Failed", error.message, true);

    }

}

window.approveLeave = approveLeave;

async function rejectLeave(id) {

    try {

        await apiFetch(`/leave/${id}/reject`, { method: "PUT" });

        showToast("Leave Rejected", "The request was rejected.");

        await loadLeaveData();

    } catch (error) {

        showToast("Reject Failed", error.message, true);

    }

}

window.rejectLeave = rejectLeave;

async function deleteLeave(id) {

    const confirmDelete = confirm("Delete this leave request? This cannot be undone.");

    if (!confirmDelete) return;

    try {

        await apiFetch(`/leave/${id}`, { method: "DELETE" });

        showToast("Request Deleted", "The leave request has been removed.");

        await loadLeaveData();

    } catch (error) {

        showToast("Delete Failed", error.message, true);

    }

}

window.deleteLeave = deleteLeave;

// ==========================
// Balance Overview Table
// ==========================

function balanceBarHTML(data) {

    const percentUsed = data.quota > 0 ? Math.min(100, (data.used / data.quota) * 100) : 0;

    return `

        <div class="balance-cell">

            <div class="balance-bar">
                <div class="balance-bar-fill ${percentUsed >= 100 ? "full" : ""}" style="width:${percentUsed}%"></div>
            </div>

            <div class="balance-text">${data.used} / ${data.quota}</div>

        </div>

    `;

}

function displayBalances() {

    if (balances.length === 0) {

        balanceTable.innerHTML = `<tr><td colspan="4" class="empty">No employees found.</td></tr>`;

        return;

    }

    let rows = "";

    balances.forEach(b => {

        rows += `
        <tr>

            <td><strong>${b.employee.name}</strong></td>

            <td>${balanceBarHTML(b.Casual)}</td>

            <td>${balanceBarHTML(b.Sick)}</td>

            <td>${balanceBarHTML(b.Earned)}</td>

        </tr>
        `;

    });

    balanceTable.innerHTML = rows;

}

// ==========================
// Search / Filter
// ==========================

leaveSearch.addEventListener("keyup", displayLeaves);
statusFilter.addEventListener("change", displayLeaves);

// ==========================
// Dashboard Cards
// ==========================

function updateDashboard() {

    totalRequests.textContent = leaves.length;

    pendingCount.textContent = leaves.filter(l => l.status === "Pending").length;

    approvedCount.textContent = leaves.filter(l => l.status === "Approved").length;

    onLeaveToday.textContent = leaves.filter(l =>

        l.status === "Approved" && l.fromDate <= today && l.toDate >= today

    ).length;

}

// ==========================
// Initial Load
// ==========================

loadLeaveData();
