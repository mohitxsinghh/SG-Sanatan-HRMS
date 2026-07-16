const express = require("express");

const router = express.Router();

const Leave = require("../models/Leave");
const Attendance = require("../models/Attendance");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Leave balance tracking has been removed. Leave requests now exist
// purely for approval/scheduling records - pay is determined entirely
// by what Attendance shows for each day (see routes/payrollRoutes.js).
// Present = full pay, Half Day = half deduction, Absent/Leave/unmarked
// = full-day deduction. So an approved leave still costs the employee
// a full day's pay, same as being marked Absent.

// Employees can view/apply for their OWN leave and cancel their own
// pending requests. Approving/rejecting, and managing anyone else's
// requests, stays Admin-only - enforced per-route below.

// -------------------------------------------
// Helpers
// -------------------------------------------

// Inclusive day count between two yyyy-mm-dd strings.

function computeDays(fromDate, toDate) {

    const from = new Date(fromDate + "T00:00:00");
    const to = new Date(toDate + "T00:00:00");

    const diffDays = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;

    return diffDays;

}

// Every yyyy-mm-dd date in an inclusive range, as an array.

function getDateRange(fromDate, toDate) {

    const dates = [];

    let current = new Date(fromDate + "T00:00:00");

    const end = new Date(toDate + "T00:00:00");

    while (current <= end) {

        dates.push(current.toISOString().split("T")[0]);

        current.setDate(current.getDate() + 1);

    }

    return dates;

}

// -------------------------------------------
// GET All Leave Requests
// -------------------------------------------

router.get("/", protect, async (req, res) => {

    try {

        const filter = req.user.role === "Employee" ? { employee: req.user.id } : {};

        const leaves = await Leave.find(filter)

            .populate("employee", "name department employeeId")

            .sort({ createdAt: -1 });

        res.json(leaves);

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

});

// -------------------------------------------
// POST New Leave Request (always starts Pending)
// -------------------------------------------

router.post("/", protect, async (req, res) => {

    try {

        let { employee, leaveType, fromDate, toDate, reason } = req.body;

        if (req.user.role === "Employee") {

            employee = req.user.id; // can only apply for themselves

        }

        if (!employee || !leaveType || !fromDate || !toDate) {

            return res.status(400).json({

                message: "employee, leaveType, fromDate, and toDate are required"

            });

        }

        const days = computeDays(fromDate, toDate);

        if (days <= 0) {

            return res.status(400).json({ message: "To Date must be on or after From Date" });

        }

        const leave = await Leave.create({

            employee,
            leaveType,
            fromDate,
            toDate,
            days,
            reason: reason || "",
            status: "Pending"

        });

        const populated = await leave.populate("employee", "name department employeeId");

        res.status(201).json({

            message: "Leave Request Submitted Successfully",

            leave: populated

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

// -------------------------------------------
// UPDATE Leave Request (only while Pending)
// -------------------------------------------

router.put("/:id", protect, async (req, res) => {

    try {

        const leave = await Leave.findById(req.params.id);

        if (!leave) {

            return res.status(404).json({ message: "Leave request not found" });

        }

        if (req.user.role === "Employee" && leave.employee.toString() !== req.user.id) {

            return res.status(403).json({ message: "You can only edit your own leave requests" });

        }

        if (leave.status !== "Pending") {

            return res.status(400).json({

                message: "Only pending requests can be edited"

            });

        }

        const { employee, leaveType, fromDate, toDate, reason } = req.body;

        // Employees can't reassign a request to someone else, even by editing.

        if (employee && req.user.role === "Admin") leave.employee = employee;
        if (leaveType) leave.leaveType = leaveType;
        if (fromDate) leave.fromDate = fromDate;
        if (toDate) leave.toDate = toDate;
        if (reason !== undefined) leave.reason = reason;

        leave.days = computeDays(leave.fromDate, leave.toDate);

        if (leave.days <= 0) {

            return res.status(400).json({ message: "To Date must be on or after From Date" });

        }

        await leave.save();

        const populated = await leave.populate("employee", "name department employeeId");

        res.json({

            message: "Leave Request Updated Successfully",

            leave: populated

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

// -------------------------------------------
// APPROVE
// No balance to check anymore - just flips status and writes a
// "Leave" Attendance record for every date in the range, which is
// what makes Payroll deduct a full day's pay for each of those dates.
// -------------------------------------------

router.put("/:id/approve", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const leave = await Leave.findById(req.params.id);

        if (!leave) {

            return res.status(404).json({ message: "Leave request not found" });

        }

        if (leave.status !== "Pending") {

            return res.status(400).json({ message: "Only pending requests can be approved" });

        }

        leave.status = "Approved";

        await leave.save();

        // Sync to Attendance - one upsert per date in the range.

        const dates = getDateRange(leave.fromDate, leave.toDate);

        const operations = dates.map(date => ({

            updateOne: {

                filter: { employee: leave.employee, date },

                update: {

                    $set: {

                        employee: leave.employee,
                        date,
                        status: "Leave",
                        checkIn: "",
                        checkOut: "",
                        workingHours: 0,
                        overtime: 0

                    }

                },

                upsert: true

            }

        }));

        await Attendance.bulkWrite(operations);

        const populated = await leave.populate("employee", "name department employeeId");

        res.json({

            message: "Leave Approved Successfully",

            leave: populated

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

// -------------------------------------------
// REJECT (no Attendance side-effect - the days stay whatever they
// already were, e.g. Absent/unmarked)
// -------------------------------------------

router.put("/:id/reject", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const leave = await Leave.findById(req.params.id);

        if (!leave) {

            return res.status(404).json({ message: "Leave request not found" });

        }

        if (leave.status !== "Pending") {

            return res.status(400).json({ message: "Only pending requests can be rejected" });

        }

        leave.status = "Rejected";

        await leave.save();

        const populated = await leave.populate("employee", "name department employeeId");

        res.json({

            message: "Leave Rejected",

            leave: populated

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

// -------------------------------------------
// DELETE
// If the request was Approved, removes only the "Leave" Attendance
// records this request created - it won't touch dates that were
// since edited manually. No balance to reverse anymore.
// -------------------------------------------

router.delete("/:id", protect, async (req, res) => {

    try {

        const leave = await Leave.findById(req.params.id);

        if (!leave) {

            return res.status(404).json({ message: "Leave request not found" });

        }

        if (req.user.role === "Employee") {

            if (leave.employee.toString() !== req.user.id) {

                return res.status(403).json({ message: "You can only cancel your own leave requests" });

            }

            if (leave.status !== "Pending") {

                return res.status(400).json({

                    message: "Only pending requests can be cancelled - contact your admin about an approved/rejected request"

                });

            }

        }

        if (leave.status === "Approved") {

            const dates = getDateRange(leave.fromDate, leave.toDate);

            await Attendance.deleteMany({

                employee: leave.employee,
                date: { $in: dates },
                status: "Leave"

            });

        }

        await Leave.findByIdAndDelete(req.params.id);

        res.json({

            message: "Leave Request Deleted Successfully",

            leave

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

module.exports = router;
