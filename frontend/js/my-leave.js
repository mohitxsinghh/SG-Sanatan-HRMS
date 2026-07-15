// ===========================================
// SG SANATAN HRMS - My Leave (Employee Self-Service)
// ===========================================

const session = requireRole(["Employee"]);

const today = new Date().toISOString().split("T")[0];

let leaves = [];
let myBalance = null;

let editMode = false;
let editLeaveId = null;

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
const statusFilter  = document.getElementById("statusFilter");
const toastContainer = document.getElementById("toastContainer");

const leaveType   = document.getElementById("leaveType");
const leaveFrom     = document.getElementById("leaveFrom");
const leaveTo         = document.getElementById("leaveTo");
const leaveReason       = document.getElementById("leaveReason");
const daysPreview         = document.getElementById("daysPreview");

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

    leaveModal.style.display = "flex";

});

// ==========================
// Close Modal
// ==========================

closeModal.onclick = closeLeaveModal;
cancelBtn.onclick = closeLeaveModal;

window.onclick = function (e) {

    if (e.target === leaveModal) closeLeaveModal();

};

function closeLeaveModal() {

    leaveModal.style.display = "none";

    clearForm();

}

function clearForm() {

    if (!leaveForm) return;

    leaveForm.reset();

    daysPreview.textContent = "0 day(s)";

    editLeaveId = null;
    editMode = false;

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
// Save (Apply or Edit)
// ==========================

saveBtn.onclick = async function () {

    const data = {

        leaveType: leaveType.value,
        fromDate: leaveFrom.value,
        toDate: leaveTo.value,
        reason: leaveReason.value.trim()

    };

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

            showToast("Request Updated", "Your leave request was updated.");

        } else {

            await apiFetch("/leave", {

                method: "POST",
                body: JSON.stringify(data)

            });

            showToast("Request Submitted", "Your leave request was submitted as Pending.");

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
// Display
// ==========================

function statusBadgeClass(status) {

    if (status === "Approved") return "status-approved";
    if (status === "Rejected") return "status-rejected";
    return "status-pending";

}

function getFilteredLeaves() {

    const status = statusFilter.value;

    return status ? leaves.filter(l => l.status === status) : leaves;

}

function displayLeaves() {

    const list = getFilteredLeaves();

    if (list.length === 0) {

        leaveTable.innerHTML = `<tr><td colspan="6" class="empty">No leave requests yet.</td></tr>`;
        return;

    }

    leaveTable.innerHTML = list.map(leave => `

        <tr>

            <td><span class="leave-type-tag">${leave.leaveType}</span></td>
            <td>${leave.fromDate}</td>
            <td>${leave.toDate}</td>
            <td>${leave.days}</td>
            <td><span class="${statusBadgeClass(leave.status)}">${leave.status}</span></td>

            <td>

                ${leave.status === "Pending" ? `

                    <button class="edit-btn" onclick="editLeave('${leave._id}')" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button class="delete-btn" onclick="cancelLeave('${leave._id}')" title="Cancel">
                        <i class="fa-solid fa-trash"></i>
                    </button>

                ` : "-"}

            </td>

        </tr>

    `).join("");

}

function editLeave(id) {

    const leave = leaves.find(l => l._id === id);

    if (!leave || leave.status !== "Pending") {

        showToast("Can't Edit", "Only pending requests can be edited.", true);
        return;

    }

    editMode = true;
    editLeaveId = id;

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

async function cancelLeave(id) {

    const confirmCancel = confirm("Cancel this leave request?");

    if (!confirmCancel) return;

    try {

        await apiFetch(`/leave/${id}`, { method: "DELETE" });

        showToast("Request Cancelled", "Your leave request has been cancelled.");

        await loadLeaveData();

    } catch (error) {

        showToast("Cancel Failed", error.message, true);

    }

}

window.cancelLeave = cancelLeave;

// ==========================
// Balance
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

function displayBalance() {

    if (!myBalance) {

        balanceTable.innerHTML = `<tr><td colspan="3" class="empty">No balance information yet.</td></tr>`;
        return;

    }

    balanceTable.innerHTML = `

        <tr>
            <td>${balanceBarHTML(myBalance.Casual)}</td>
            <td>${balanceBarHTML(myBalance.Sick)}</td>
            <td>${balanceBarHTML(myBalance.Earned)}</td>
        </tr>

    `;

}

// ==========================
// Filter
// ==========================

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
// Load
// ==========================

async function loadLeaveData() {

    leaveTable.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

    try {

        const [leaveData, balanceData] = await Promise.all([

            apiFetch("/leave"),
            apiFetch("/leave/balances/all")

        ]);

        leaves = leaveData;
        myBalance = balanceData[0] || null; // backend already scopes this to "self"

        displayLeaves();
        displayBalance();
        updateDashboard();

    } catch (error) {

        leaveTable.innerHTML = `<tr><td colspan="6">Failed to load: ${error.message}</td></tr>`;

        showToast("Load Failed", error.message, true);

    }

}

loadLeaveData();
