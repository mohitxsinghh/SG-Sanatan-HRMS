// ===========================================
// SG SANATAN HRMS - Department Module (Backend-Connected)
// ===========================================

const session = requireRole(["Admin"]);

// In-memory copies of what the server returned last.

let departments = [];
let employees = [];

// Edit Mode
let editMode = false;
let editDepartmentId = null;

// ==========================
// DOM Elements
// ==========================

const departmentModal = document.getElementById("departmentModal");

const closeModal = document.getElementById("closeModal");
const cancelBtn  = document.getElementById("cancelBtn");
const saveBtn    = document.getElementById("saveBtn");

const departmentTable = document.getElementById("departmentTable");

const totalDepartments      = document.getElementById("totalDepartments");
const totalEmployeesInDepts = document.getElementById("totalEmployeesInDepts");
const largestDepartment     = document.getElementById("largestDepartment");
const emptyDepartments      = document.getElementById("emptyDepartments");

const departmentForm = document.getElementById("departmentForm");

const searchDepartment = document.getElementById("searchDepartment");
const toastContainer   = document.getElementById("toastContainer");

// Form Fields

const deptName        = document.getElementById("deptName");
const deptHead         = document.getElementById("deptHead");
const deptStatus       = document.getElementById("deptStatus");
const deptDescription  = document.getElementById("deptDescription");

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
// Open Add Department Modal
// ==========================

document.addEventListener("click", function (e) {

    const addBtn = e.target.closest("#addDepartmentBtn");

    if (!addBtn) return;

    editMode = false;
    editDepartmentId = null;

    document.getElementById("modalTitle").textContent = "Add Department";

    saveBtn.textContent = "Save Department";

    clearForm();

    populateHeadDropdown();

    departmentModal.style.display = "flex";

});

// ==========================
// Close Modal
// ==========================

closeModal.onclick = closeDepartmentModal;
cancelBtn.onclick = closeDepartmentModal;

window.onclick = function (e) {

    if (e.target === departmentModal) {

        closeDepartmentModal();

    }

};

function closeDepartmentModal() {

    departmentModal.style.display = "none";

    clearForm();

    document.getElementById("modalTitle").textContent = "Add Department";
    saveBtn.textContent = "Save Department";

}

// ==========================
// Clear Form
// ==========================

function clearForm() {

    if (!departmentForm) return;

    departmentForm.reset();

    deptStatus.value = "Active";

    editDepartmentId = null;
    editMode = false;

}

// ==========================
// Populate Department Head Dropdown
// (uses the employees list already cached from the last load)
// ==========================

function populateHeadDropdown() {

    const currentValue = deptHead.value;

    deptHead.innerHTML = `<option value="">Unassigned</option>`;

    employees.forEach(emp => {

        deptHead.innerHTML += `<option value="${emp._id}">${emp.name}</option>`;

    });

    deptHead.value = currentValue;

}

// ==========================
// Get Employee Count for a Department
// ==========================

function getEmployeeCount(departmentName) {

    return employees.filter(emp => emp.department === departmentName).length;

}

// ==========================
// Get Form Data
// ==========================

function getDepartmentFormData() {

    return {

        name: deptName.value.trim(),

        head: deptHead.value || null,

        status: deptStatus.value,

        description: deptDescription.value.trim()

    };

}

// ==========================
// Generate Department Code
// ==========================

function generateDeptId() {

    return "DEPT" + String(departments.length + 1).padStart(3, "0");

}

// ==========================
// Load Departments + Employees From Server
// (both are needed - employees to compute per-department counts
// and populate the head dropdown, same as before)
// ==========================

async function loadDepartments() {

    departmentTable.innerHTML = `<tr><td colspan="6">Loading departments...</td></tr>`;

    try {

        [departments, employees] = await Promise.all([

            apiFetch("/departments"),
            apiFetch("/employees")

        ]);

        displayDepartments();
        updateDashboard();

    } catch (error) {

        departmentTable.innerHTML = `<tr><td colspan="6">Failed to load: ${error.message}</td></tr>`;

        showToast("Load Failed", error.message, true);

    }

}

// ==========================
// Save Department (Create or Update)
// ==========================

saveBtn.onclick = async function () {

    const data = getDepartmentFormData();

    if (data.name === "") {

        showToast("Missing Name", "Please enter a department name.", true);

        deptName.focus();

        return;

    }

    const duplicate = departments.find(dept =>

        dept.name.toLowerCase() === data.name.toLowerCase() &&
        dept._id !== editDepartmentId

    );

    if (duplicate) {

        showToast("Duplicate Department", "A department with this name already exists.", true);

        deptName.focus();

        return;

    }

    saveBtn.disabled = true;
    saveBtn.textContent = editMode ? "Updating..." : "Saving...";

    try {

        if (editMode) {

            await apiFetch(`/departments/${editDepartmentId}`, {

                method: "PUT",
                body: JSON.stringify(data)

            });

            showToast("Department Updated", `${data.name}'s details were updated.`);

        } else {

            data.deptId = generateDeptId();

            await apiFetch("/departments", {

                method: "POST",
                body: JSON.stringify(data)

            });

            showToast("Department Created", `${data.name} has been added successfully.`);

        }

        closeDepartmentModal();

        await loadDepartments();

    } catch (error) {

        showToast(editMode ? "Update Failed" : "Add Failed", error.message, true);

    } finally {

        saveBtn.disabled = false;
        saveBtn.textContent = editMode ? "Update Department" : "Save Department";

    }

};

// ==========================
// Display Departments
// ==========================

function displayDepartments(list = departments) {

    if (list.length === 0) {

        departmentTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty">No departments found.</td>
            </tr>
        `;

        return;

    }

    let rows = "";

    list.forEach(dept => {

        const count = getEmployeeCount(dept.name);

        rows += `
        <tr>

            <td>${dept.deptId}</td>

            <td>
                <strong>${dept.name}</strong>
                ${dept.description ? `<br><small>${dept.description}</small>` : ""}
            </td>

            <td>${dept.head ? dept.head.name : "Unassigned"}</td>

            <td>
                <span class="employee-count-badge ${count === 0 ? "empty" : ""}">
                    ${count} ${count === 1 ? "employee" : "employees"}
                </span>
            </td>

            <td>
                <span class="${dept.status === "Active" ? "status-active" : "status-inactive"}">
                    ${dept.status}
                </span>
            </td>

            <td>

                <button class="edit-btn" onclick="editDepartment('${dept._id}')">
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteDepartment('${dept._id}')"
                    ${count > 0 ? `disabled title="Reassign employees before deleting"` : ""}>
                    <i class="fa-solid fa-trash"></i>
                </button>

            </td>

        </tr>
        `;

    });

    departmentTable.innerHTML = rows;

}

// ==========================
// Edit Department
// ==========================

function editDepartment(id) {

    const department = departments.find(dept => dept._id === id);

    if (!department) return;

    editMode = true;
    editDepartmentId = id;

    populateHeadDropdown();

    deptName.value = department.name;
    deptHead.value = department.head ? department.head._id : "";
    deptStatus.value = department.status;
    deptDescription.value = department.description || "";

    document.getElementById("modalTitle").textContent = "Edit Department";
    saveBtn.textContent = "Update Department";

    departmentModal.style.display = "flex";

}

window.editDepartment = editDepartment;

// ==========================
// Delete Department
// (the "still has employees" block now happens on the server -
// the disabled button above already prevents the common case,
// this catch handles it if it somehow gets clicked anyway)
// ==========================

async function deleteDepartment(id) {

    const department = departments.find(dept => dept._id === id);

    if (!department) return;

    const confirmDelete = confirm(`Delete "${department.name}"? This cannot be undone.`);

    if (!confirmDelete) return;

    try {

        await apiFetch(`/departments/${id}`, { method: "DELETE" });

        showToast("Department Deleted", `${department.name} has been removed.`);

        await loadDepartments();

    } catch (error) {

        showToast("Can't Delete", error.message, true);

    }

}

window.deleteDepartment = deleteDepartment;

// ==========================
// Search
// ==========================

searchDepartment.addEventListener("keyup", function () {

    const keyword = this.value.toLowerCase();

    const filtered = departments.filter(dept =>

        dept.name.toLowerCase().includes(keyword)

    );

    displayDepartments(filtered);

});

// ==========================
// Dashboard Cards
// ==========================

function updateDashboard() {

    totalDepartments.textContent = departments.length;

    totalEmployeesInDepts.textContent = employees.length;

    emptyDepartments.textContent =
        departments.filter(dept => getEmployeeCount(dept.name) === 0).length;

    if (departments.length === 0) {

        largestDepartment.textContent = "-";

    } else {

        const withCounts = departments.map(dept => ({
            name: dept.name,
            count: getEmployeeCount(dept.name)
        }));

        const biggest = withCounts.reduce((max, current) =>
            current.count > max.count ? current : max
        , withCounts[0]);

        largestDepartment.textContent = biggest.count > 0 ? biggest.name : "-";

    }

}

// ==========================
// Initial Load
// ==========================

loadDepartments();
