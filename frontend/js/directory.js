// ===========================================
// SG SANATAN HRMS - Directory (Employee Self-Service)
// ===========================================

const session = requireRole(["Employee"]);

let employees = [];
let departments = [];

const searchInput = document.getElementById("searchEmployee");
const departmentFilter = document.getElementById("departmentFilter");
const directoryTable = document.getElementById("directoryTable");

function populateDepartmentFilter() {

    const currentValue = departmentFilter.value;

    departmentFilter.innerHTML = `<option value="">All Departments</option>`;

    departments.forEach(dept => {

        departmentFilter.innerHTML += `<option value="${dept.name}">${dept.name}</option>`;

    });

    departmentFilter.value = currentValue;

}

function displayDirectory() {

    const keyword = searchInput.value.toLowerCase().trim();
    const dept = departmentFilter.value;

    const filtered = employees.filter(emp => {

        const matchesSearch =
            emp.name.toLowerCase().includes(keyword) ||
            (emp.designation || "").toLowerCase().includes(keyword);

        const matchesDept = dept === "" || emp.department === dept;

        return matchesSearch && matchesDept;

    });

    document.getElementById("totalCount").textContent = filtered.length;
    document.getElementById("deptCount").textContent = departments.length;

    if (filtered.length === 0) {

        directoryTable.innerHTML = `<tr><td colspan="5">No colleagues found.</td></tr>`;
        return;

    }

    directoryTable.innerHTML = filtered.map(emp => `

        <tr>
            <td>${emp.employeeId}</td>
            <td><strong>${emp.name}</strong></td>
            <td>${emp.department}</td>
            <td>${emp.designation}</td>
            <td>
                <span class="${emp.status === "Active" ? "status-active" : "status-inactive"}">
                    ${emp.status}
                </span>
            </td>
        </tr>

    `).join("");

}

searchInput.addEventListener("keyup", displayDirectory);
departmentFilter.addEventListener("change", displayDirectory);

async function init() {

    directoryTable.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;

    try {

        [employees, departments] = await Promise.all([

            apiFetch("/employees/directory"),
            apiFetch("/departments")

        ]);

        populateDepartmentFilter();
        displayDirectory();

    } catch (error) {

        directoryTable.innerHTML = `<tr><td colspan="5">Failed to load: ${error.message}</td></tr>`;

    }

}

init();
