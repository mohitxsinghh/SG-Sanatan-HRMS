// ===========================================
// SG SANATAN HRMS - Holidays Module (Backend-Connected)
// ===========================================

const session = requireRole(["Admin", "Employee"]);

const isAdmin = session?.role === "Admin";

// In-memory copy of what the server returned last.

let holidays = [];

// Edit Mode
let editMode = false;
let editHolidayId = null;

const today = new Date().toISOString().split("T")[0];

// ==========================
// DOM Elements
// ==========================

const holidayModal = document.getElementById("holidayModal");

const closeModal = document.getElementById("closeModal");
const cancelBtn  = document.getElementById("cancelBtn");
const saveBtn    = document.getElementById("saveBtn");

const holidayTable = document.getElementById("holidayTable");

const totalHolidays      = document.getElementById("totalHolidays");
const upcomingHolidays   = document.getElementById("upcomingHolidays");
const thisMonthHolidays  = document.getElementById("thisMonthHolidays");
const nextHolidayName       = document.getElementById("nextHolidayName");
const nextHolidayCountdown  = document.getElementById("nextHolidayCountdown");

const holidayForm = document.getElementById("holidayForm");

const searchHoliday = document.getElementById("searchHoliday");
const typeFilter     = document.getElementById("typeFilter");
const toastContainer = document.getElementById("toastContainer");

// Form Fields

const holidayName        = document.getElementById("holidayName");
const holidayDate         = document.getElementById("holidayDate");
const holidayType          = document.getElementById("holidayType");
const holidayDescription   = document.getElementById("holidayDescription");

// ==========================
// Open Add Holiday Modal (Admin only - button doesn't even
// render for Employees, per topbar.js's adminOnlyAction flag)
// ==========================

document.addEventListener("click", function (e) {

    const addBtn = e.target.closest("#addHolidayBtn");

    if (!addBtn) return;

    editMode = false;
    editHolidayId = null;

    document.getElementById("modalTitle").textContent = "Add Holiday";
    saveBtn.textContent = "Save Holiday";

    clearForm();

    holidayModal.style.display = "flex";

});

// ==========================
// Close Modal
// ==========================

closeModal.onclick = closeHolidayModal;
cancelBtn.onclick = closeHolidayModal;

window.onclick = function (e) {

    if (e.target === holidayModal) {

        closeHolidayModal();

    }

};

function closeHolidayModal() {

    holidayModal.style.display = "none";

    clearForm();

}

// ==========================
// Clear Form
// ==========================

function clearForm() {

    if (!holidayForm) return;

    holidayForm.reset();

    holidayType.value = "National";

    editHolidayId = null;
    editMode = false;

}

// ==========================
// Get Form Data
// ==========================

function getHolidayFormData() {

    return {

        name: holidayName.value.trim(),
        date: holidayDate.value,
        type: holidayType.value,
        description: holidayDescription.value.trim()

    };

}

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
// Save Holiday (Admin only - route is protected server-side too)
// ==========================

saveBtn.onclick = async function () {

    const data = getHolidayFormData();

    if (data.name === "") {
        showToast("Missing Name", "Please enter a holiday name.", true);
        holidayName.focus();
        return;
    }

    if (data.date === "") {
        showToast("Missing Date", "Please select a date.", true);
        holidayDate.focus();
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = editMode ? "Updating..." : "Saving...";

    try {

        if (editMode) {

            await apiFetch(`/holidays/${editHolidayId}`, {

                method: "PUT",
                body: JSON.stringify(data)

            });

            showToast("Holiday Updated", `${data.name} was updated.`);

        } else {

            await apiFetch("/holidays", {

                method: "POST",
                body: JSON.stringify(data)

            });

            showToast("Holiday Added", `${data.name} has been added successfully.`);

        }

        closeHolidayModal();

        await loadHolidays();

    } catch (error) {

        showToast(editMode ? "Update Failed" : "Add Failed", error.message, true);

    } finally {

        saveBtn.disabled = false;
        saveBtn.textContent = editMode ? "Update Holiday" : "Save Holiday";

    }

};

// ==========================
// Day-of-week helper
// ==========================

function dayOfWeek(dateStr) {

    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" });

}

// ==========================
// Filtered List
// ==========================

function getFilteredHolidays() {

    const keyword = searchHoliday.value.toLowerCase().trim();
    const type = typeFilter.value;

    return holidays.filter(h => {

        const matchesSearch = h.name.toLowerCase().includes(keyword);
        const matchesType = type === "" || h.type === type;

        return matchesSearch && matchesType;

    });

}

// ==========================
// Display Holidays
// ==========================

function displayHolidays() {

    const list = getFilteredHolidays();

    if (list.length === 0) {

        holidayTable.innerHTML = `<tr><td colspan="6" class="empty">No holidays found.</td></tr>`;

        return;

    }

    let rows = "";

    list.forEach(h => {

        const isPast = h.date < today;

        rows += `
        <tr class="${isPast ? "holiday-past" : ""}">

            <td><strong>${h.name}</strong></td>

            <td>${h.date}</td>

            <td>${dayOfWeek(h.date)}</td>

            <td><span class="holiday-type-tag ${h.type}">${h.type}</span></td>

            <td>${h.description || "-"}</td>

            <td>

                ${isAdmin ? `

                    <button class="edit-btn" onclick="editHoliday('${h._id}')">
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button class="delete-btn" onclick="deleteHoliday('${h._id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>

                ` : "-"}

            </td>

        </tr>
        `;

    });

    holidayTable.innerHTML = rows;

}

// ==========================
// Edit Holiday (Admin only)
// ==========================

function editHoliday(id) {

    const holiday = holidays.find(h => h._id === id);

    if (!holiday) return;

    editMode = true;
    editHolidayId = id;

    holidayName.value = holiday.name;
    holidayDate.value = holiday.date;
    holidayType.value = holiday.type;
    holidayDescription.value = holiday.description || "";

    document.getElementById("modalTitle").textContent = "Edit Holiday";
    saveBtn.textContent = "Update Holiday";

    holidayModal.style.display = "flex";

}

window.editHoliday = editHoliday;

// ==========================
// Delete Holiday (Admin only)
// ==========================

async function deleteHoliday(id) {

    const holiday = holidays.find(h => h._id === id);

    if (!holiday) return;

    const confirmDelete = confirm(`Delete "${holiday.name}"? This cannot be undone.`);

    if (!confirmDelete) return;

    try {

        await apiFetch(`/holidays/${id}`, { method: "DELETE" });

        showToast("Holiday Deleted", `${holiday.name} has been removed.`);

        await loadHolidays();

    } catch (error) {

        showToast("Delete Failed", error.message, true);

    }

}

window.deleteHoliday = deleteHoliday;

// ==========================
// Search / Filter
// ==========================

searchHoliday.addEventListener("keyup", displayHolidays);
typeFilter.addEventListener("change", displayHolidays);

// ==========================
// Dashboard Cards
// ==========================

function updateDashboard() {

    totalHolidays.textContent = holidays.length;

    const upcoming = holidays

        .filter(h => h.date >= today)
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date));

    upcomingHolidays.textContent = upcoming.length;

    const currentMonth = today.slice(0, 7);

    thisMonthHolidays.textContent =
        holidays.filter(h => h.date.slice(0, 7) === currentMonth).length;

    if (upcoming.length === 0) {

        nextHolidayName.textContent = "-";
        nextHolidayCountdown.textContent = "";

    } else {

        const next = upcoming[0];

        const daysLeft = Math.round(
            (new Date(next.date + "T00:00:00") - new Date(today + "T00:00:00"))
            / (1000 * 60 * 60 * 24)
        );

        nextHolidayName.textContent = next.name;

        nextHolidayCountdown.textContent =
            daysLeft === 0 ? "Today" :
            daysLeft === 1 ? "Tomorrow" :
            `In ${daysLeft} days`;

    }

}

// ==========================
// Load From Server
// ==========================

async function loadHolidays() {

    holidayTable.innerHTML = `<tr><td colspan="6">Loading holidays...</td></tr>`;

    try {

        holidays = await apiFetch("/holidays");

        displayHolidays();
        updateDashboard();

    } catch (error) {

        holidayTable.innerHTML = `<tr><td colspan="6">Failed to load: ${error.message}</td></tr>`;

        showToast("Load Failed", error.message, true);

    }

}

// ==========================
// Initial Load
// ==========================

loadHolidays();
