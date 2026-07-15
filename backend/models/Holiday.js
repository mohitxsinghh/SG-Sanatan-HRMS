const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    // Stored as yyyy-mm-dd, same convention as everywhere else.

    date: {
        type: String,
        required: true,
        unique: true
    },

    type: {
        type: String,
        enum: ["National", "Festival", "Company", "Optional"],
        default: "National"
    },

    description: {
        type: String,
        default: ""
    }

}, {

    timestamps: true

});

module.exports = mongoose.model("Holiday", holidaySchema);
