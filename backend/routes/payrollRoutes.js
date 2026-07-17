const express = require("express");

const router = express.Router();

const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Payroll is Admin-only - salary figures are sensitive.

router.use(protect, authorizeRoles("Admin"));

// -------------------------------------------
// Helper: every yyyy-mm-dd date in a given month
// -------------------------------------------

function getDatesInMonth(year, monthIndex) {

    const dates = [];

    const date = new Date(year, monthIndex, 1);

    while (date.getMonth() === monthIndex) {

        dates.push(date.toISOString().split("T")[0]);

        date.setDate(date.getDate() + 1);

    }

    return dates;

}

// -------------------------------------------
// GET /api/payroll?month=YYYY-MM
//
// Working days = every date in the month EXCEPT Sundays and company
// Holidays. Daily rate = monthly salary / working days - this rate is
// the SAME for every employee regardless of when they joined, so a
// day's worth of pay means the same thing company-wide.
//
// IMPORTANT: for the CURRENT month, this only counts days up to and
// including TODAY. A day that hasn't happened yet has no attendance
// record by definition - it must not be treated as "unmarked = Absent",
// or every employee's pay would look wrongly docked until the month
// is actually over. For a month that's entirely in the future, there's
// nothing to deduct yet at all (working days = 0, full salary shown).
//
// MID-MONTH JOINERS: an employee's own days-owed window starts at
// max(month start, their joiningDate) - days before they joined are
// excluded entirely, not counted as absent. If joiningDate is blank
// (added before this field existed), they're treated as employed for
// the whole month, same as before this feature - fully backward
// compatible. If joiningDate falls after the elapsed window (they
// haven't started yet, or start later this month), they simply have
// zero owed days so far and a full salary shown as payable (nothing
// to deduct from yet).
//
// Deduction policy (Present is the only status that's fully paid):
//   Present    -> 0 deduction
//   Half Day   -> 0.5 x daily rate
//   Absent     -> 1 x daily rate
//   Leave      -> 1 x daily rate (approved or not - leave no longer
//                 protects pay, it's just a schedule record now)
//   Not marked -> 1 x daily rate, but ONLY for the employee's own
//                 owed working days that have already passed.
// -------------------------------------------

router.get("/", async (req, res) => {

    try {

        const month = req.query.month || new Date().toISOString().slice(0, 7); // "YYYY-MM"

        const [year, monthNum] = month.split("-").map(Number);
        const monthIndex = monthNum - 1;

        const allDatesInMonth = getDatesInMonth(year, monthIndex);

        const firstDay = allDatesInMonth[0];
        const lastDay = allDatesInMonth[allDatesInMonth.length - 1];

        const todayStr = new Date().toISOString().split("T")[0];

        // Only count days up to today. If the whole month is still in
        // the future, there are zero elapsed days to judge yet.

        const elapsedDatesInMonth = allDatesInMonth.filter(d => d <= todayStr);

        const effectiveLastDay = elapsedDatesInMonth.length > 0
            ? elapsedDatesInMonth[elapsedDatesInMonth.length - 1]
            : null;

        // Company-wide working days = elapsed dates only, minus Sundays
        // and Holidays. This drives the daily rate for EVERY employee,
        // regardless of when they personally joined.

        let workingDates = [];

        if (effectiveLastDay) {

            const holidays = await Holiday.find({ date: { $gte: firstDay, $lte: effectiveLastDay } });
            const holidayDates = new Set(holidays.map(h => h.date));

            workingDates = elapsedDatesInMonth.filter(dateStr => {

                const dayOfWeek = new Date(dateStr + "T00:00:00").getDay(); // 0 = Sunday

                return dayOfWeek !== 0 && !holidayDates.has(dateStr);

            });

        }

        const workingDaysCount = workingDates.length;

        const employees = await Employee.find();

        const attendanceRecords = effectiveLastDay

            ? await Attendance.find({ date: { $gte: firstDay, $lte: effectiveLastDay } })

            : [];

        const result = employees.map(emp => {

            const dailyRate = workingDaysCount > 0 ? emp.salary / workingDaysCount : 0;

            // This employee's own owed window - working days on/after
            // their joiningDate (blank joiningDate = employed all month,
            // same behavior as before this feature existed).

            const ownWorkingDates = emp.joiningDate

                ? workingDates.filter(d => d >= emp.joiningDate)

                : workingDates;

            const ownWorkingDaysCount = ownWorkingDates.length;

            const empRecords = attendanceRecords.filter(r =>

                r.employee.toString() === emp._id.toString() && ownWorkingDates.includes(r.date)

            );

            const present = empRecords.filter(r => r.status === "Present").length;
            const halfDay = empRecords.filter(r => r.status === "Half Day").length;
            const absent = empRecords.filter(r => r.status === "Absent").length;
            const leave = empRecords.filter(r => r.status === "Leave").length;

            const markedCount = present + halfDay + absent + leave;

            const notMarked = Math.max(0, ownWorkingDaysCount - markedCount);

            const deductibleDays = (halfDay * 0.5) + absent + leave + notMarked;

            // Payable is earned FROM the days owed, not "salary minus
            // deduction" - this is what makes mid-month joining prorate
            // correctly. For an employee with no join-date cutoff this
            // reduces to exactly the old salary-minus-deduction result.

            const owedDays = Math.max(0, ownWorkingDaysCount - deductibleDays);

            const deduction = Math.round(deductibleDays * dailyRate * 100) / 100;

            const netPayable = Math.round(owedDays * dailyRate * 100) / 100;

            return {

                employee: {
                    _id: emp._id,
                    name: emp.name,
                    employeeId: emp.employeeId,
                    department: emp.department,
                    joiningDate: emp.joiningDate || null
                },

                salary: emp.salary,
                workingDays: ownWorkingDaysCount,
                dailyRate: Math.round(dailyRate * 100) / 100,

                present,
                halfDay,
                absent,
                leave,
                notMarked,

                deduction,
                netPayable

            };

        });

        res.json({

            month,
            workingDays: workingDaysCount,
            elapsedThroughDate: effectiveLastDay, // lets the frontend show "as of Jul 16" for the current month
            results: result

        });

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

});

module.exports = router;
