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

const tableTab = document.getElementById("tableTab");
const calendarTab = document.getElementById("calendarTab");

const tableView = document.getElementById("tableView");
const calendarView = document.getElementById("calendarView");

const calendarGrid = document.getElementById("calendarGrid");
const calendarMonth = document.getElementById("calendarMonth");
const calendarYear = document.getElementById("calendarYear");
const calendarEmployee = document.getElementById("calendarEmployee");

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

const months = [

    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"

];

const attendanceModal = document.getElementById("attendanceModal");

const modalDateTitle = document.getElementById("modalDateTitle");

const modalStatus = document.getElementById("modalStatus");

const modalCheckIn = document.getElementById("modalCheckIn");

const modalCheckOut = document.getElementById("modalCheckOut");

const saveAttendanceModal = document.getElementById("saveAttendanceModal");

const closeAttendanceModal = document.getElementById("closeAttendanceModal");

let selectedCalendarDate = "";

let selectedEmployeeId = "";

const attendanceDate =
document.getElementById("attendanceDate");

// In-memory copies of what the server returned last.

let employees = [];

// Attendance for the selected date (used by table)
let attendance = [];

// Attendance for the whole month (used by calendar & statistics)
let monthlyAttendance = [];

// Today's date (yyyy-mm-dd, used as the date key everywhere)
const today = new Date().toISOString().split("T")[0];

let selectedAttendanceDate = today;

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

function getAttendanceRecord(employeeId){

    return attendance.find(record =>

        (record.employee?._id || record.employee) === employeeId &&

        record.date === selectedAttendanceDate

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
            <td colspan="8" class="empty">No employees found.</td>
        </tr>

        `;

        return;

    }

    let rows = "";

    list.forEach(emp => {

        const record = getAttendanceRecord(emp._id);

        const status   = record?.status   || "Not Marked";
        const checkIn  = record?.checkIn  || "";
        const checkOut = record?.checkOut || "";
        const workingHours = record?.workingHours ?? 0;
        const overtime      = record?.overtime ?? 0;

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

            <td>${workingHours}h</td>

            <td class="${overtime > 0 ? "overtime-value" : ""}">${overtime}h</td>

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

    presentCount.textContent = attendance.filter(r => r.status === "Present").length;

    absentCount.textContent = attendance.filter(r => r.status === "Absent").length;

    halfDayCount.textContent = attendance.filter(r => r.status === "Half Day").length;

    leaveCount.textContent = attendance.filter(r => r.status === "Leave").length;

}

// -------------------------------------------
// Save / Update a Single Attendance Record
// -------------------------------------------

async function upsertAttendance(

    employeeId,

    status,

    checkIn,

    checkOut,

    date = today

){

    const { workingHours, overtime } = calculateHours(checkIn, checkOut);

    await apiFetch("/attendance", {

        method: "PUT",

        body: JSON.stringify({

            employee: employeeId,
            date: date,
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

    attendanceTable.innerHTML = `<tr><td colspan="8">Loading attendance...</td></tr>`;

    try {

        const firstDay =
        `${currentYear}-${String(currentMonth + 1).padStart(2,"0")}-01`;

        const lastDay =
        `${currentYear}-${String(currentMonth + 1).padStart(2,"0")}-${String(
        new Date(currentYear,currentMonth+1,0).getDate()
        ).padStart(2,"0")}`;

        const [employeesData, attendanceData, settingsData] = await Promise.all([

            apiFetch("/employees"),

            apiFetch(`/attendance?from=${firstDay}&to=${lastDay}`),

            apiFetch("/settings")

        ]);

        employees = employeesData;

        // Monthly attendance for calendar
        monthlyAttendance = attendanceData;

        // Attendance only for selected day (table)
        attendance = attendanceData.filter(
            record => record.date === selectedAttendanceDate
        );
        renderCalendar();
        cachedWorkHours = Number(settingsData?.timings?.workHours) || 8;

        loadDepartmentFilter();

        loadCalendarEmployees();

        loadMonths();

        loadYears();

        renderCalendar();

        renderAttendanceTable();

        updateCards();

    } catch (error) {

        attendanceTable.innerHTML = `<tr><td colspan="8">Failed to load: ${error.message}</td></tr>`;

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

        const record = getAttendanceRecord(emp._id);

        const checkIn =
            (status === "Present" || status === "Half Day")
                ? (record?.checkIn || currentTime)
                : "";

        const checkOut = record?.checkOut || "";

        const { workingHours, overtime } = calculateHours(checkIn, checkOut);

        return {

            employee: emp._id,
            date: selectedAttendanceDate,
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

        const record = getAttendanceRecord(emp._id);

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

attendanceDate.value = selectedAttendanceDate;

attendanceDate.addEventListener("change", async () => {

    selectedAttendanceDate = attendanceDate.value;

    await refreshAttendance();

});

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

            await upsertAttendance(
                employeeId,
                status,
                checkIn,
                checkOut,
                selectedAttendanceDate
            );

            addSystemLog(
                "Attendance Marked",
                `${employee ? employee.name : "An employee"}'s attendance was marked as ${status}.`,
                "attendance"
            );

            const firstDay =
            `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-01`;

            const lastDay =
            `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(
            new Date(currentYear,currentMonth+1,0).getDate()
            ).padStart(2,"0")}`;

            monthlyAttendance = await apiFetch(
            `/attendance?from=${firstDay}&to=${lastDay}`
            );

            attendance = monthlyAttendance.filter(
            record => record.date === selectedAttendanceDate
            );

            renderCalendar();
            renderAttendanceTable();
            updateCards();

            renderCalendar();

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

function openAttendanceModal(date){

    if(!calendarEmployee.value){

        showToast(

            "Select Employee",

            "Please select an employee first."

        );

        return;

    }

    selectedCalendarDate=date;

    selectedEmployeeId=calendarEmployee.value;

    const record=monthlyAttendance.find(r=>

        r.date===date &&

        String(r.employee?._id||r.employee)===String(selectedEmployeeId)

    );

    modalDateTitle.textContent=date;

    modalStatus.value=record?.status || "Present";

    modalCheckIn.value=record?.checkIn || "";

    modalCheckOut.value=record?.checkOut || "";

    updateModalHoursReadout();

    attendanceModal.classList.add("active");

}

// Live preview of what Working Hours/Overtime will be saved as,
// recalculated the same way upsertAttendance() actually computes it -
// so Admin can see the effect of a Check In/Out edit before saving.

function updateModalHoursReadout(){

    const { workingHours, overtime } = calculateHours(modalCheckIn.value, modalCheckOut.value);

    document.getElementById("modalWorkingHours").textContent = `${workingHours}h`;

    const overtimeEl = document.getElementById("modalOvertime");

    overtimeEl.textContent = `${overtime}h`;

    overtimeEl.classList.toggle("has-overtime", overtime > 0);

}

modalCheckIn.addEventListener("input", updateModalHoursReadout);
modalCheckOut.addEventListener("input", updateModalHoursReadout);

closeAttendanceModal.onclick=()=>{

    attendanceModal.classList.remove("active");

};

// ===========================================
// Attendance Tabs
// ===========================================

tableTab.addEventListener("click", () => {

    tableTab.classList.add("active");
    calendarTab.classList.remove("active");

    tableView.style.display = "block";
    calendarView.style.display = "none";

});

calendarTab.addEventListener("click", () => {

    calendarTab.classList.add("active");
    tableTab.classList.remove("active");

    tableView.style.display = "none";
    calendarView.style.display = "block";

});

function renderCalendar(){

    calendarGrid.innerHTML="";

    const firstDay=new Date(currentYear,currentMonth,1).getDay();

    const totalDays=new Date(currentYear,currentMonth+1,0).getDate();

    const todayDate=new Date();

    for(let i=0;i<firstDay;i++){

        const empty=document.createElement("div");

        empty.className="calendar-day empty-day";

        calendarGrid.appendChild(empty);

    }

    for(let day=1;day<=totalDays;day++){

        const dateString=
        currentYear+"-"+
        String(currentMonth+1).padStart(2,"0")+"-"+
        String(day).padStart(2,"0");

        const cell=document.createElement("div");

        cell.className="calendar-day";

        const record = monthlyAttendance.find(r=>{

            return r.date===dateString &&
            (!calendarEmployee.value ||
            String(r.employee?._id||r.employee)===String(calendarEmployee.value));

        });

        if(record){

            switch(record.status){

                case "Present":

                    cell.classList.add("present");

                    break;

                case "Absent":

                    cell.classList.add("absent");

                    break;

                case "Half Day":

                    cell.classList.add("halfday");

                    break;

                case "Leave":

                    cell.classList.add("leave");

                    break;

            }

        }

        const current=new Date(currentYear,currentMonth,day);

        if(current.getDay()===0){

            cell.classList.add("weeklyoff");

        }

        if(

            day===todayDate.getDate() &&

            currentMonth===todayDate.getMonth() &&

            currentYear===todayDate.getFullYear()

        ){

            cell.classList.add("today");

        }

        let badgeHTML="";

        if(record){

            switch(record.status){

                case "Present":

                    badgeHTML='<div class="status-badge badge-present">P</div>';

                    break;

                case "Absent":

                    badgeHTML='<div class="status-badge badge-absent">A</div>';

                    break;

                case "Half Day":

                    badgeHTML='<div class="status-badge badge-halfday">HD</div>';

                    break;

                case "Leave":

                    badgeHTML='<div class="status-badge badge-leave">L</div>';

                    break;

            }

        }

        else if(current.getDay()===0){

            badgeHTML='<div class="status-badge badge-weeklyoff">WO</div>';

        }

        cell.innerHTML=`

        <div class="day-number">

        ${day}

        </div>

        ${badgeHTML}

        `;

        cell.dataset.date = dateString;

        cell.addEventListener("click",()=>{

            openAttendanceModal(dateString);

        });

        calendarGrid.appendChild(cell);

    }

}

function loadMonths(){

    calendarMonth.innerHTML="";

    months.forEach((month,index)=>{

        calendarMonth.innerHTML+=`

        <option value="${index}">

            ${month}

        </option>

        `;

    });

    calendarMonth.value=currentMonth;

}

function loadYears(){

    calendarYear.innerHTML="";

    const current = new Date().getFullYear();

    for(let year=current-5;year<=current+5;year++){

        calendarYear.innerHTML+=`

        <option value="${year}">

            ${year}

        </option>

        `;

    }

    calendarYear.value=currentYear;

}

calendarEmployee.addEventListener("change",()=>{

    renderCalendar();

});

function loadCalendarEmployees(){

    calendarEmployee.innerHTML=`
        <option value="">Select Employee</option>
    `;

    employees.forEach(emp=>{

        calendarEmployee.innerHTML+=`

        <option value="${emp._id}">

            ${emp.name}

        </option>

        `;

    });

}

calendarMonth.addEventListener("change",()=>{

    currentMonth=Number(calendarMonth.value);

    renderCalendar();

});

calendarYear.addEventListener("change",()=>{

    currentYear=Number(calendarYear.value);

    renderCalendar();

});

document.getElementById("prevMonth").addEventListener("click",()=>{

    currentMonth--;

    if(currentMonth<0){

        currentMonth=11;

        currentYear--;

    }

    loadYears();

    calendarMonth.value=currentMonth;

    calendarYear.value=currentYear;

    renderCalendar();

});

document.getElementById("nextMonth").addEventListener("click",()=>{

    currentMonth++;

    if(currentMonth>11){

        currentMonth=0;

        currentYear++;

    }

    loadYears();

    calendarMonth.value=currentMonth;

    calendarYear.value=currentYear;

    renderCalendar();

});

// ===========================================
// SAVE ATTENDANCE FROM CALENDAR MODAL
// ===========================================

saveAttendanceModal.addEventListener("click", async () => {

    try {

        await upsertAttendance(

            selectedEmployeeId,

            modalStatus.value,

            modalCheckIn.value,

            modalCheckOut.value,

            selectedCalendarDate

        );

        const firstDay =
        `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-01`;

        const lastDay =
        `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(new Date(currentYear,currentMonth+1,0).getDate()).padStart(2,"0")}`;

        monthlyAttendance = await apiFetch(
        `/attendance?from=${firstDay}&to=${lastDay}`
        );

        attendance = monthlyAttendance.filter(
        record => record.date === selectedAttendanceDate
        );

        renderCalendar();

        renderAttendanceTable();

        updateCards();

        attendanceModal.classList.remove("active");

        showToast(

            "Attendance Updated",

            "Attendance has been updated successfully."

        );

    }

    catch(error){

        showToast(

            "Update Failed",

            error.message,

            true

        );

    }

});

// ===========================================
// RECALCULATE PAST HOURS/OVERTIME
// One-time action: rewrites workingHours/overtime on every attendance
// record that has both a Check In and Check Out, using whatever the
// "Standard Work Hours / Day" setting is RIGHT NOW. Needed whenever
// that setting is changed, since past records don't update on their
// own - they keep whatever they were computed with at the time.
// ===========================================

const recalculateHoursBtn = document.getElementById("recalculateHoursBtn");

recalculateHoursBtn?.addEventListener("click", async () => {

    const confirmed = confirm(

        `This will recompute Working Hours and Overtime for every past attendance record ` +
        `that has both a Check In and Check Out, using the CURRENT standard work hours ` +
        `(${cachedWorkHours}h/day from Settings). This cannot be undone. Continue?`

    );

    if (!confirmed) return;

    recalculateHoursBtn.disabled = true;

    const originalText = recalculateHoursBtn.innerHTML;

    recalculateHoursBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Recalculating...`;

    try {

        const result = await apiFetch("/attendance/recalculate-hours", { method: "POST" });

        showToast("Recalculated", result.message);

        addSystemLog(

            "Attendance Recalculated",

            result.message,

            "attendance"

        );

        await refreshAttendance();

    } catch (error) {

        showToast("Recalculate Failed", error.message, true);

    } finally {

        recalculateHoursBtn.disabled = false;

        recalculateHoursBtn.innerHTML = originalText;

    }

});

// ===========================================
// INITIAL LOAD
// ===========================================

refreshAttendance();
