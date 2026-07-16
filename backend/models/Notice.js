const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema({

    message: {
        type: String,
        required: true,
        trim: true
    },

    // Stored as yyyy-mm-dd, same convention as everywhere else.
    // The notice stops showing (for Employees) once today passes this date.

    expiryDate: {
        type: String,
        required: true
    }

}, {

    timestamps: true

});

module.exports = mongoose.model("Notice", noticeSchema);
