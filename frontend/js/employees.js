// ===========================================
// SG SANATAN HRMS - Employee Module (Backend-Connected)
// ===========================================

const session = requireRole(["Admin"]);

// In-memory copy of what the server returned last, so we don't
// re-fetch on every render (search, etc.).

let employees = [];

// Departments, cached the same way - fetched from the real backend
// (previously this page called common.js's getDepartments(), a
// leftover from before the Departments module was backend-connected,
// which seeds 6 hardcoded defaults into localStorage. That's why the
// "Departments" card and dropdown never matched the real count on
// departments.html - fixed by fetching /api/departments here too.)

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
const empSalary = document.getElementById("empSalary");

const docSection = document.getElementById("docSection");
const docSectionHint = document.getElementById("docSectionHint");
const docUploadRow = document.getElementById("docUploadRow");
const docLabel = document.getElementById("docLabel");
const docFile = document.getElementById("docFile");
const docUploadBtn = document.getElementById("docUploadBtn");
const docList = document.getElementById("docList");

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
// Documents
// ==========================

function formatFileSize(bytes) {

    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";

    return (bytes / (1024 * 1024)).toFixed(1) + " MB";

}

function lockDocSection() {

    docSectionHint.style.display = "block";
    docSectionHint.textContent = "Save this employee first, then you can attach documents here.";
    docUploadRow.style.display = "none";
    docList.innerHTML = "";

}

function unlockDocSection(documents = []) {

    docSectionHint.style.display = "none";
    docUploadRow.style.display = "flex";

    renderDocuments(documents);

}

function renderDocuments(documents = []) {

    if (documents.length === 0) {

        docList.innerHTML = `<li><span class="doc-info"><small>No documents uploaded yet.</small></span></li>`;

        return;

    }

    docList.innerHTML = documents.map(doc => `

        <li>

            <div class="doc-info">
                <strong>${doc.label}</strong>
                <small>${doc.originalName} · ${formatFileSize(doc.size)}</small>
            </div>

            <div class="doc-actions">

                <button class="doc-download-btn" onclick="downloadDocument('${editEmployeeId}', '${doc._id}', '${doc.originalName.replace(/'/g, "\\'")}')" title="Download">
                    <i class="fa-solid fa-download"></i>
                </button>

                <button class="doc-delete-btn" onclick="deleteDocument('${editEmployeeId}', '${doc._id}')" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </div>

        </li>

    `).join("");

}

docUploadBtn.addEventListener("click", async () => {

    if (!editEmployeeId) {

        showToast("Save First", "Save the employee before attaching documents.", true);
        return;

    }

    const label = docLabel.value.trim();
    const file = docFile.files[0];

    if (!label) {

        showToast("Missing Label", "Please give this document a label.", true);
        docLabel.focus();
        return;

    }

    if (!file) {

        showToast("No File", "Please choose a file to upload.", true);
        return;

    }

    const formData = new FormData();

    formData.append("label", label);
    formData.append("file", file);

    docUploadBtn.disabled = true;
    docUploadBtn.textContent = "Uploading...";

    try {

        const result = await apiFetch(`/employees/${editEmployeeId}/documents`, {

            method: "POST",
            body: formData

        });

        renderDocuments(result.documents);

        docLabel.value = "";
        docFile.value = "";

        showToast("Document Uploaded", `${label} was attached to this employee.`);

    } catch (error) {

        showToast("Upload Failed", error.message, true);

    } finally {

        docUploadBtn.disabled = false;
        docUploadBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload`;

    }

});

// Downloads go through a raw fetch (not apiFetch, which auto-parses
// JSON) so the response can be handled as a file blob, with the auth
// token attached manually since this isn't a plain <a href> link.

async function downloadDocument(employeeId, docId, originalName) {

    try {

        const token = localStorage.getItem("authToken");

        const response = await fetch(`/api/employees/${employeeId}/documents/${docId}`, {

            headers: token ? { "Authorization": `Bearer ${token}` } : {}

        });

        if (!response.ok) {

            throw new Error("Download failed");

        }

        const blob = await response.blob();

        const link = document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = originalName;

        link.click();

        URL.revokeObjectURL(link.href);

    } catch (error) {

        showToast("Download Failed", error.message, true);

    }

}

window.downloadDocument = downloadDocument;

async function deleteDocument(employeeId, docId) {

    const confirmDelete = confirm("Delete this document? This cannot be undone.");

    if (!confirmDelete) return;

    try {

        const result = await apiFetch(`/employees/${employeeId}/documents/${docId}`, {

            method: "DELETE"

        });

        renderDocuments(result.documents);

        showToast("Document Deleted", "The document has been removed.");

    } catch (error) {

        showToast("Delete Failed", error.message, true);

    }

}

window.deleteDocument = deleteDocument;

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

    lockDocSection();

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
        status: empStatus.value,
        salary: Number(empSalary.value) || 0

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
    empSalary.value = employee.salary || "";

    empPassword.value = "";

}

// ==========================
// Department Dropdown
// (reads from the real /departments API - departments.html manages
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

            closeEmployeeModal();

            await loadEmployees();

        } else {

            data.employeeId = generateEmployeeId();

            const result = await apiFetch("/employees", {

                method: "POST",
                body: JSON.stringify(data)

            });

            showToast("Employee Added", `${data.name} has been added successfully. You can now attach documents below.`);

            // Stay open, switch into edit mode for the employee that
            // was just created - this unlocks the Documents section,
            // which needs a real employee _id to attach files to.

            editMode = true;
            editEmployeeId = result.employee._id;

            document.getElementById("modalTitle").textContent = "Edit Employee";
            saveBtn.textContent = "Update Employee";
            passwordLabel.innerHTML = "Password <small>(leave blank to keep current)</small>";
            empPassword.placeholder = "Leave blank to keep current password";

            unlockDocSection([]);

            await loadEmployees();

        }

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

    unlockDocSection(employee.documents || []);

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
