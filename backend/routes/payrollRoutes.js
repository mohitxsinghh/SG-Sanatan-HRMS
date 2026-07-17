const express = require("express");

const router = express.Router();

const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// ===========================================
// SG SANATAN HRMS - Payroll Policy
//
// 1. Sundays are NOT working days.
//    - Excluded completely.
//    - Unpaid weekly off.
//
// 2. Holidays ARE working days.
//    - Always fully paid.
//    - Attendance on holidays is ignored.
//
// 3. Normal Working Days (excluding Sundays & Holidays):
//      Present   -> Full Pay
//      Half Day  -> Half Pay
//      Absent    -> Full Day Deduction
//      Leave     -> Full Day Deduction
//      Unmarked  -> Pending (No Pay, No Deduction)
//
// 4. Working Days = Applicable Calendar Days - Sundays
//
// 5. Daily Rate = Monthly Salary / Working Days
//
// 6. Net Payable = Daily Rate × Earned Days
//
// 7. Earned Days =
//      Paid Holidays +
//      Present +
//      (Half Day × 0.5)
//
// ===========================================

function pad(n) {

    return String(n).padStart(2, "0");

}

// Every yyyy-mm-dd date in a month, built as plain strings - never
// routed through Date/toISOString, which silently shifts dates by a
// day whenever the server's timezone is ahead of UTC.

function getDatesInMonth(year, monthIndex) {

    const dates = [];

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {

        dates.push(`${year}-${pad(monthIndex + 1)}-${pad(day)}`);

    }

    return dates;

}

function isSunday(dateStr) {

    return new Date(dateStr + "T00:00:00").getDay() === 0;

}

router.get("/", async (req, res) => {

    try {

        const now = new Date();

        const month = req.query.month || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

        const [year, monthNum] = month.split("-").map(Number);
        const monthIndex = monthNum - 1;

        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        const allDatesInMonth = getDatesInMonth(year, monthIndex);

        // Only count days that have actually happened.

        const elapsedDates = allDatesInMonth;

        if (elapsedDates.length === 0) {

            // The whole month is still in the future - nothing to
            // calculate yet, full salary, zero working days so far.

            const employees = req.user.role === "Employee"
                ? await Employee.find({ _id: req.user.id })
                : await Employee.find();

            return res.json({

                month,
                workingDays: 0,
                holidayDays: 0,
                results: employees.map(emp => ({

                    employee: {
                        _id: emp._id,
                        name: emp.name,
                        employeeId: emp.employeeId,
                        department: emp.department
                    },

                    salary: emp.salary,
                    workingDays: 0,
                    dailyRate: 0,
                    present: 0,
                    halfDay: 0,
                    absent: 0,
                    leave: 0,
                    notMarked: 0,
                    holiday: 0,
                    deduction: 0,
                    netPayable: emp.salary

                }))

            });

        }

        const firstDay = allDatesInMonth[0];
        const lastDay = allDatesInMonth[allDatesInMonth.length - 1];

        // Working Days = elapsed dates, minus Sunday only. Holidays stay in.

        const workingDates = elapsedDates.filter(d => !isSunday(d));
        const workingDaysCount = workingDates.length;

        const holidays = await Holiday.find({ date: { $gte: firstDay, $lte: lastDay } });
        const holidayDates = new Set(holidays.map(h => h.date));

        // Attendance only ever matters on a non-Sunday, non-Holiday date.

        const payableDates = workingDates.filter(d => !holidayDates.has(d));
        const holidayCount = workingDates.length - payableDates.length;

        const employees = req.user.role === "Employee"
            ? await Employee.find({ _id: req.user.id })
            : await Employee.find();

        const attendanceRecords = await Attendance.find({ date: { $gte: firstDay, $lte: lastDay } });

        const results = employees.map(emp => {

            const dailyRate = workingDaysCount > 0 ? emp.salary / workingDaysCount : 0;

            const empRecords = attendanceRecords.filter(r =>

                r.employee.toString() === emp._id.toString() && payableDates.includes(r.date)

            );

            // =========================
            // Attendance Summary
            // =========================

            const present = empRecords.filter(r => r.status === "Present").length;

            const halfDay = empRecords.filter(r => r.status === "Half Day").length;

            const absent = empRecords.filter(r => r.status === "Absent").length;

            const leave = empRecords.filter(r => r.status === "Leave").length;

            // Attendance marked on normal working days
            const markedCount =
                present +
                halfDay +
                absent +
                leave;

            // Remaining working days become absent
            // during payroll calculation.
            const finalAbsent =
                absent +
                Math.max(0, payableDates.length - markedCount);

            // Keep this only for display
            const notMarked =
                Math.max(0, payableDates.length - markedCount);

            // Holidays are always paid
            const paidHolidays = holidayCount;

            // Deducted Days
            const deductedDays =
                finalAbsent +
                leave +
                (halfDay * 0.5);

            // Earned Days
            const earnedDays =
                workingDaysCount -
                deductedDays;

            // Deduction Amount
            const deduction =
                Math.round(deductedDays * dailyRate * 100) / 100;

            // Net Salary
            const netPayable =
                Math.round(earnedDays * dailyRate * 100) / 100;

            return {

                employee: {
                    _id: emp._id,
                    name: emp.name,
                    employeeId: emp.employeeId,
                    department: emp.department
                },

                salary: emp.salary,

                workingDays: workingDaysCount,

                dailyRate: Math.round(dailyRate * 100) / 100,

                present,

                halfDay,

                absent,

                leave,

                notMarked,

                holiday: paidHolidays,

                earnedDays,

                deductedDays,

                deduction,

                netPayable

            };

        });

        res.json({

            month,
            workingDays: workingDaysCount,
            holidayDays: holidayCount,
            results

        });

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

});

module.exports = router;
