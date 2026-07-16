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
// Holidays. Daily rate = monthly salary / working days.
//
// Deduction policy (Present is the only status that's fully paid):
//   Present    -> 0 deduction
//   Half Day   -> 0.5 x daily rate
//   Absent     -> 1 x daily rate
//   Leave      -> 1 x daily rate (approved or not - leave no longer
//                 protects pay, it's just a schedule record now)
//   Not marked -> 1 x daily rate (a working day with no attendance
//                 record at all is treated the same as Absent, so the
//                 system can't be gamed by simply not marking someone)
// -------------------------------------------

router.get("/", async (req, res) => {

    try {

        const month = req.query.month || new Date().toISOString().slice(0, 7); // "YYYY-MM"

        const [year, monthNum] = month.split("-").map(Number);
        const monthIndex = monthNum - 1;

        const allDatesInMonth = getDatesInMonth(year, monthIndex);

        const firstDay = allDatesInMonth[0];
        const lastDay = allDatesInMonth[allDatesInMonth.length - 1];

        // Working days = every date except Sundays and company Holidays.

        const holidays = await Holiday.find({ date: { $gte: firstDay, $lte: lastDay } });
        const holidayDates = new Set(holidays.map(h => h.date));

        const workingDates = allDatesInMonth.filter(dateStr => {

            const dayOfWeek = new Date(dateStr + "T00:00:00").getDay(); // 0 = Sunday

            return dayOfWeek !== 0 && !holidayDates.has(dateStr);

        });

        const workingDaysCount = workingDates.length;

        const employees = await Employee.find();

        const attendanceRecords = await Attendance.find({

            date: { $gte: firstDay, $lte: lastDay }

        });

        const result = employees.map(emp => {

            const empRecords = attendanceRecords.filter(r => r.employee.toString() === emp._id.toString());

            const present = empRecords.filter(r => r.status === "Present").length;
            const halfDay = empRecords.filter(r => r.status === "Half Day").length;
            const absent = empRecords.filter(r => r.status === "Absent").length;
            const leave = empRecords.filter(r => r.status === "Leave").length;

            const markedCount = present + halfDay + absent + leave;

            const notMarked = Math.max(0, workingDaysCount - markedCount);

            const dailyRate = workingDaysCount > 0 ? emp.salary / workingDaysCount : 0;

            const deductibleDays = (halfDay * 0.5) + absent + leave + notMarked;

            const deduction = Math.round(deductibleDays * dailyRate * 100) / 100;

            const netPayable = Math.max(0, Math.round((emp.salary - deduction) * 100) / 100);

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

                deduction,
                netPayable

            };

        });

        res.json({ month, workingDays: workingDaysCount, results: result });

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

});

module.exports = router;
