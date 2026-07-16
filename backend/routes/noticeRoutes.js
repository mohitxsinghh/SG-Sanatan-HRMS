const express = require("express");

const router = express.Router();

const Notice = require("../models/Notice");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// GET Notices
// - Admin: sees everything (including already-expired ones), so they
//   can still find and delete old notices from the dashboard card.
// - Employee: only ever sees notices that haven't expired yet - this
//   is enforced here, not just hidden in the UI.

router.get("/", protect, async (req, res) => {

    try {

        const today = new Date().toISOString().split("T")[0];

        const filter = req.user.role === "Employee"

            ? { expiryDate: { $gte: today } }

            : {};

        const notices = await Notice.find(filter).sort({ createdAt: -1 });

        res.json(notices);

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

});

// POST New Notice (Admin only)

router.post("/", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const { message, expiryDate } = req.body;

        if (!message || !message.trim()) {

            return res.status(400).json({ message: "Notice message is required" });

        }

        if (!expiryDate) {

            return res.status(400).json({ message: "Expiry date is required" });

        }

        const notice = await Notice.create({

            message: message.trim(),
            expiryDate

        });

        res.status(201).json({

            message: "Notice Added Successfully",

            notice

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

// UPDATE Notice (Admin only)

router.put("/:id", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const { message, expiryDate } = req.body;

        const notice = await Notice.findById(req.params.id);

        if (!notice) {

            return res.status(404).json({ message: "Notice not found" });

        }

        if (message !== undefined) notice.message = message.trim();
        if (expiryDate !== undefined) notice.expiryDate = expiryDate;

        if (!notice.message) {

            return res.status(400).json({ message: "Notice message is required" });

        }

        await notice.save();

        res.json({

            message: "Notice Updated Successfully",

            notice

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

// DELETE Notice (Admin only)

router.delete("/:id", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const notice = await Notice.findByIdAndDelete(req.params.id);

        if (!notice) {

            return res.status(404).json({ message: "Notice not found" });

        }

        res.json({

            message: "Notice Deleted Successfully",

            notice

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

module.exports = router;
