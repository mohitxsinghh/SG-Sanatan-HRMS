const express = require("express");

const router = express.Router();

const Holiday = require("../models/Holiday");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Unlike Employees/Departments/Attendance/Leave, Holidays are read-only
// info that both Admin and Employee should be able to see - so GET only
// requires a valid login, not a specific role. Writes stay Admin-only.

// GET All Holidays (any logged-in user)

router.get("/", protect, async (req, res) => {

    try {

        const holidays = await Holiday.find().sort({ date: 1 });

        res.json(holidays);

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

});

// POST New Holiday (Admin only)

router.post("/", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const holiday = await Holiday.create(req.body);

        res.status(201).json({

            message: "Holiday Added Successfully",

            holiday

        });

    } catch (error) {

        if (error.code === 11000) {

            return res.status(400).json({

                message: "A holiday is already set on this date"

            });

        }

        res.status(400).json({ message: error.message });

    }

});

// UPDATE Holiday (Admin only)

router.put("/:id", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const holiday = await Holiday.findByIdAndUpdate(

            req.params.id,

            req.body,

            { new: true, runValidators: true }

        );

        if (!holiday) {

            return res.status(404).json({ message: "Holiday not found" });

        }

        res.json({

            message: "Holiday Updated Successfully",

            holiday

        });

    } catch (error) {

        if (error.code === 11000) {

            return res.status(400).json({

                message: "A holiday is already set on this date"

            });

        }

        res.status(400).json({ message: error.message });

    }

});

// DELETE Holiday (Admin only)

router.delete("/:id", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const holiday = await Holiday.findByIdAndDelete(req.params.id);

        if (!holiday) {

            return res.status(404).json({ message: "Holiday not found" });

        }

        res.json({

            message: "Holiday Deleted Successfully",

            holiday

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

module.exports = router;
