const express = require("express");

const router = express.Router();

const Settings = require("../models/Settings");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Creates the one-and-only settings document if it doesn't exist yet
// (first server start ever), otherwise returns the existing one.

async function getOrCreateSettings() {

    let settings = await Settings.findOne();

    if (!settings) {

        settings = await Settings.create({});

    }

    return settings;

}

// GET Settings - any logged-in user (Admin or Employee both need the
// theme/company info applied to their sidebar/topbar).

router.get("/", protect, async (req, res) => {

    try {

        const settings = await getOrCreateSettings();

        res.json(settings);

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

});

// UPDATE Settings - Admin only. Accepts a partial body (just
// "company", just "timings", or just "theme") and merges it in,
// matching the frontend's "save one section at a time" UI.

router.put("/", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const settings = await getOrCreateSettings();

        if (req.body.company) {

            Object.assign(settings.company, req.body.company);

        }

        if (req.body.timings) {

            Object.assign(settings.timings, req.body.timings);

        }

        if (req.body.theme) {

            Object.assign(settings.theme, req.body.theme);

        }

        await settings.save();

        res.json({

            message: "Settings Updated Successfully",

            settings

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

module.exports = router;
