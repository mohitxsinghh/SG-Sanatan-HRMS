const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({

    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },

    // Stored as yyyy-mm-dd (not a Date type) - matches the frontend's
    // date-key convention exactly, no timezone conversion surprises.

    date: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ["Present", "Absent", "Half Day", "Leave"],
        required: true
    },

    checkIn: {
        type: String,
        default: ""
    },

    checkOut: {
        type: String,
        default: ""
    },

    // Computed on the frontend (depends on Office Timings in Settings,
    // which isn't backend-connected yet) - stored as-is here.

    workingHours: {
        type: Number,
        default: 0
    },

    overtime: {
        type: Number,
        default: 0
    }

}, {

    timestamps: true

});

// One attendance record per employee per day - matches the old
// upsert-by-(employeeId,date) behavior exactly.

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
