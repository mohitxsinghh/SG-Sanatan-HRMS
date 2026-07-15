const mongoose = require("mongoose");

// There's only ever ONE settings document for the whole app - not one
// per user. Routes always use findOne (creating defaults on first
// access) rather than an id, so there's no risk of accidentally
// creating duplicates.

const settingsSchema = new mongoose.Schema({

    company: {

        name: { type: String, default: "SG Sanatan" },
        tagline: { type: String, default: "Employees Management System" }

    },

    timings: {

        startTime: { type: String, default: "09:30" },
        endTime: { type: String, default: "18:30" },
        workHours: { type: Number, default: 8 }

    },

    theme: {

        accent: { type: String, default: "gold" }

    }

}, {

    timestamps: true

});

module.exports = mongoose.model("Settings", settingsSchema);
