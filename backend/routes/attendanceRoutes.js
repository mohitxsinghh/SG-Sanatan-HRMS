const express = require("express");

const router = express.Router();

const Attendance = require("../models/Attendance");
const Settings = require("../models/Settings");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// GET Attendance
// - Admin: sees whatever they ask for (any employee, any date/range)
// - Employee: ALWAYS scoped to their own records only, no matter what
//   query params are sent - this is enforced here, not trusted from
//   the frontend, since the frontend is not a security boundary.
//
// - ?date=YYYY-MM-DD                -> single day (defaults to today)
// - ?from=YYYY-MM-DD&to=YYYY-MM-DD  -> a range (used by Reports / My Attendance history)

router.get("/", protect, async (req, res) => {

    try {

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

        const { date, from, to, employee } = req.query;

        let filter;

        if (from && to) {

            filter = { date: { $gte: from, $lte: to } };

        } else {

            filter = { date: date || todayStr };

        }

        if (req.user.role === "Employee") {

            filter.employee = req.user.id; // Employees are always scoped to themselves, no matter what

        } else if (employee) {

            filter.employee = employee; // Admin can optionally scope to one employee (used by the Calendar view)

        }

        const records = await Attendance.find(filter)

            .populate("employee", "name department employeeId");

        res.json(records);

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

});

// UPSERT single attendance record (one employee, one day)
// - Admin: can save for any employee, any status (matches the daily
//   Attendance page's "mark anyone as anything" behavior)
// - Employee: can ONLY save for themselves, and only Present/Half Day
//   (self-marking Absent/Leave isn't allowed - Leave comes through an
//   approved leave request, which handles this automatically)

router.put("/", protect, async (req, res) => {

    try {

        let { employee, date, status, checkIn, checkOut, workingHours, overtime } = req.body;

        if (req.user.role === "Employee") {

            employee = req.user.id; // ignore whatever the client sent, force it to "self"

            if (!["Present", "Half Day"].includes(status)) {

                return res.status(403).json({

                    message: "You can only mark yourself Present or Half Day"

                });

            }

        }

        if (!employee || !date || !status) {

            return res.status(400).json({

                message: "employee, date, and status are required"

            });

        }

        const record = await Attendance.findOneAndUpdate(

            { employee, date },

            {
                employee,
                date,
                status,
                checkIn: checkIn || "",
                checkOut: checkOut || "",
                workingHours: workingHours || 0,
                overtime: overtime || 0
            },

            {
                upsert: true,
                new: true,
                runValidators: true
            }

        );

        res.json({

            message: "Attendance Saved Successfully",

            record

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

// BULK UPSERT ("Mark All") - Admin-only bulk action, unchanged.

router.post("/bulk", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const { records } = req.body;

        if (!Array.isArray(records) || records.length === 0) {

            return res.status(400).json({

                message: "records array is required"

            });

        }

        const operations = records.map(r => ({

            updateOne: {

                filter: { employee: r.employee, date: r.date },

                update: {

                    $set: {

                        status: r.status,
                        checkIn: r.checkIn || "",
                        checkOut: r.checkOut || "",
                        workingHours: r.workingHours || 0,
                        overtime: r.overtime || 0

                    }

                },

                upsert: true

            }

        }));

        await Attendance.bulkWrite(operations);

        const date = records[0].date;

        const updated = await Attendance.find({ date });

        res.json({

            message: "Attendance Updated Successfully",

            records: updated

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

// RECALCULATE PAST HOURS/OVERTIME (Admin only)
// Whenever the "Standard Work Hours / Day" setting changes, every
// past attendance record that was already saved keeps whatever
// workingHours/overtime it was computed with AT THE TIME - it doesn't
// retroactively update on its own. This lets Admin explicitly
// recompute every record that has both a Check In and Check Out,
// using whatever the standard work hours setting is RIGHT NOW.

router.post("/recalculate-hours", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const settings = await Settings.findOne();

        const standardHours = Number(settings?.timings?.workHours) || 8;

        const records = await Attendance.find({

            checkIn: { $ne: "" },
            checkOut: { $ne: "" }

        });

        if (records.length === 0) {

            return res.json({

                message: "No records with both Check In and Check Out to recalculate.",

                count: 0

            });

        }

        const operations = records.map(r => {

            const [inH, inM] = r.checkIn.split(":").map(Number);
            const [outH, outM] = r.checkOut.split(":").map(Number);

            let minutes = (outH * 60 + outM) - (inH * 60 + inM);

            if (minutes < 0) minutes = 0;

            const totalHours = minutes / 60;

            const workingHours = Math.round(Math.min(totalHours, standardHours) * 100) / 100;
            const overtime = Math.round(Math.max(totalHours - standardHours, 0) * 100) / 100;

            return {

                updateOne: {

                    filter: { _id: r._id },

                    update: { workingHours, overtime }

                }

            };

        });

        await Attendance.bulkWrite(operations);

        res.json({

            message: `Recalculated ${operations.length} attendance record(s) using ${standardHours}h as the standard work day.`,

            count: operations.length

        });

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

});

module.exports = router;
