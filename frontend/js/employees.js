// ===========================================
// SG SANATAN HRMS - Employee Module (Backend-Connected)
// ===========================================

const session = requireRole(["Admin"]);

// In-memory copy of what the server returned last, so we don't
// re-fetch on every render (search, etc.).

let employees = [];

// Departments, cached the same way - the dropdown and the "Departments"
// stat card both read from this instead of hitting the API every time.

let departmentsCache = [];

// Edit Mode
let editMode = false;
let editEmployeeId = null;

// ==========================
// DOM Elements
// ==========================

const employeeModal = document.getElementById("employeeModal");

const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");

const employeeTable = document.getElementById("employeeTable");

const totalEmployees = document.getElementById("totalEmployees");
const activeEmployees = document.getElementById("activeEmployees");
const inactiveEmployees = document.getElementById("inactiveEmployees");
const departmentCount = document.getElementById("departmentCount");
const employeeForm = document.getElementById("employeeForm");

const toastContainer = document.createElement("div");
toastContainer.id = "toastContainer";
document.body.appendChild(toastContainer);

// Form Fields

const empName = document.getElementById("empName");
const empFather = document.getElementById("empFather");
const empDept = document.getElementById("empDept");
const empDesig = document.getElementById("empDesig");
const empPhone = document.getElementById("empPhone");
const empEmail = document.getElementById("empEmail");
const empPassword = document.getElementById("empPassword");
const passwordLabel = document.getElementById("passwordLabel");
const empAddress = document.getElementById("empAddress");
const empStatus = document.getElementById("empStatus");

// ==========================
// Toast
// ==========================

function showToast(title, message, isError = false) {

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
// Open Add Employee Modal
// ==========================

document.addEventListener("click", async function (e) {

    const addBtn = e.target.closest("#addEmployeeBtn");

    if (!addBtn) return;

    editMode = false;
    editEmployeeId = null;

    document.getElementById("modalTitle").textContent = "Add Employee";
    saveBtn.textContent = "Save Employee";
    passwordLabel.innerHTML = "Password *";
    empPassword.placeholder = "Set a login password";

    clearForm();

    await loadDepartmentsCache();
    populateDepartmentDropdown();

    employeeModal.style.display = "flex";

});

// ==========================
// Close Modal
// ==========================

closeModal.onclick = closeEmployeeModal;
cancelBtn.onclick = closeEmployeeModal;

window.onclick = function (e) {

    if (e.target === employeeModal) {

        closeEmployeeModal();

    }

};

function closeEmployeeModal() {

    employeeModal.style.display = "none";

    clearForm();

}

// ==========================
// Clear Form
// ==========================

function clearForm() {

    if (!employeeForm) return;

    employeeForm.reset();

    empStatus.value = "Active";

    editEmployeeId = null;
    editMode = false;

}

// ==========================
// Get Employee Form Data
// ==========================

function getEmployeeFormData() {

    const data = {

        name: empName.value.trim(),
        father: empFather.value.trim(),
        department: empDept.value,
        designation: empDesig.value.trim(),
        phone: empPhone.value.trim(),
        email: empEmail.value.trim(),
        address: empAddress.value.trim(),
        status: empStatus.value

    };

    // Only send a password if one was typed - on edit, an empty box
    // means "leave the current password alone" (the backend already
    // knows to skip it if it's missing from the request body).

    if (empPassword.value) {

        data.password = empPassword.value;

    }

    return data;

}

// ==========================
// Fill Employee Form (edit mode)
// ==========================

function fillEmployeeForm(employee) {

    empName.value = employee.name || "";
    empFather.value = employee.father || "";
    empDept.value = employee.department || "";
    empDesig.value = employee.designation || "";
    empPhone.value = employee.phone || "";
    empEmail.value = employee.email || "";
    empAddress.value = employee.address || "";
    empStatus.value = employee.status || "Active";

    empPassword.value = "";

}

// ==========================
// Department Dropdown
// (now reads from the real /departments API - departments.html manages
// the actual list, this just displays whatever it currently has)
// ==========================

async function loadDepartmentsCache() {

    try {

        departmentsCache = await apiFetch("/departments");

    } catch (error) {

        departmentsCache = [];

    }

}

function populateDepartmentDropdown() {

    const currentValue = empDept.value;

    empDept.innerHTML = `<option value="">Select Department</option>`;

    departmentsCache.forEach(dept => {

        empDept.innerHTML += `<option value="${dept.name}">${dept.name}</option>`;

    });

    empDept.value = currentValue;

}

// ==========================
// Dashboard Cards
// ==========================

function updateDashboard() {

    totalEmployees.textContent = employees.length;

    activeEmployees.textContent =
        employees.filter(emp => emp.status === "Active").length;

    inactiveEmployees.textContent =
        employees.filter(emp => emp.status === "Inactive").length;

    departmentCount.textContent = departmentsCache.length;

}

// ==========================
// Generate Employee ID
// ==========================

function generateEmployeeId() {

    return "EMP" + String(employees.length + 1).padStart(3, "0");

}

// ==========================
// Load Employees From Server
// ==========================

async function loadEmployees() {

    employeeTable.innerHTML = `<tr><td colspan="7">Loading employees...</td></tr>`;

    try {

        employees = await apiFetch("/employees");

        displayEmployees();
        updateDashboard();

    } catch (error) {

        employeeTable.innerHTML = `<tr><td colspan="7">Failed to load: ${error.message}</td></tr>`;

        showToast("Load Failed", error.message, true);

    }

}

// ==========================
// Save Employee (Create or Update)
// ==========================

saveBtn.onclick = async function () {

    const data = getEmployeeFormData();

    if (data.name === "") {
        showToast("Missing Name", "Please enter employee name.", true);
        empName.focus();
        return;
    }

    if (data.department === "") {
        showToast("Missing Department", "Please select a department.", true);
        empDept.focus();
        return;
    }

    if (data.designation === "") {
        showToast("Missing Designation", "Please enter a designation.", true);
        empDesig.focus();
        return;
    }

    if (!/^\d{10}$/.test(data.phone)) {
        showToast("Invalid Phone", "Please enter a valid 10-digit phone number.", true);
        empPhone.focus();
        return;
    }

    if (data.email === "") {
        showToast("Missing Email", "Email is required - it's used as the employee's login.", true);
        empEmail.focus();
        return;
    }

    if (!editMode && !data.password) {
        showToast("Missing Password", "Please set a login password for this employee.", true);
        empPassword.focus();
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = editMode ? "Updating..." : "Saving...";

    try {

        if (editMode) {

            await apiFetch(`/employees/${editEmployeeId}`, {

                method: "PUT",
                body: JSON.stringify(data)

            });

            showToast("Employee Updated", `${data.name}'s details were updated.`);

        } else {

            data.employeeId = generateEmployeeId();

            await apiFetch("/employees", {

                method: "POST",
                body: JSON.stringify(data)

            });

            showToast("Employee Added", `${data.name} has been added successfully.`);

        }

        closeEmployeeModal();

        await loadEmployees();

    } catch (error) {

        showToast(editMode ? "Update Failed" : "Add Failed", error.message, true);

    } finally {

        saveBtn.disabled = false;
        saveBtn.textContent = editMode ? "Update Employee" : "Save Employee";

    }

};

// ==========================
// Display Employees
// ==========================

function displayEmployees(list = employees) {

    if (list.length === 0) {

        employeeTable.innerHTML = `<tr><td colspan="7">No employees added.</td></tr>`;

        return;

    }

    let rows = "";

    list.forEach(function (emp) {

        rows += `
        <tr>

            <td>${emp.employeeId}</td>

            <td>
                <strong>${emp.name}</strong><br>
                <small>${emp.email || "-"}</small>
            </td>

            <td>${emp.department}</td>

            <td>${emp.designation}</td>

            <td>${emp.phone || "-"}</td>

            <td>
                <span class="${emp.status === "Active" ? "status-active" : "status-inactive"}">
                    ${emp.status}
                </span>
            </td>

            <td>

                <button class="edit-btn" onclick="editEmployee('${emp._id}')">
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button class="delete-btn" onclick="deleteEmployee('${emp._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </td>

        </tr>
        `;

    });

    employeeTable.innerHTML = rows;

}

// ==========================
// Edit Employee
// ==========================

async function editEmployee(id) {

    const employee = employees.find(emp => emp._id === id);

    if (!employee) return;

    editMode = true;
    editEmployeeId = id;

    await loadDepartmentsCache();
    populateDepartmentDropdown();
    fillEmployeeForm(employee);

    document.getElementById("modalTitle").textContent = "Edit Employee";
    saveBtn.textContent = "Update Employee";
    passwordLabel.innerHTML = "Password <small>(leave blank to keep current)</small>";
    empPassword.placeholder = "Leave blank to keep current password";

    employeeModal.style.display = "flex";

}

window.editEmployee = editEmployee;

// ==========================
// Delete Employee
// ==========================

async function deleteEmployee(id) {

    const confirmDelete = confirm("Are you sure you want to delete this employee? This cannot be undone.");

    if (!confirmDelete) return;

    try {

        await apiFetch(`/employees/${id}`, { method: "DELETE" });

        showToast("Employee Deleted", "The employee has been removed.");

        await loadEmployees();

    } catch (error) {

        showToast("Delete Failed", error.message, true);

    }

}

window.deleteEmployee = deleteEmployee;

// ==========================
// Search
// ==========================

const searchEmployee = document.getElementById("searchEmployee");

searchEmployee.addEventListener("keyup", function () {

    const keyword = this.value.toLowerCase();

    const filtered = employees.filter(emp =>

        emp.name.toLowerCase().includes(keyword) ||
        emp.department.toLowerCase().includes(keyword) ||
        emp.designation.toLowerCase().includes(keyword)

    );

    displayEmployees(filtered);

});

// ==========================
// Initial Load
// ==========================

async function init() {

    await loadDepartmentsCache();
    await loadEmployees();

}

init();
