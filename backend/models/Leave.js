const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({

    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },

    leaveType: {
        type: String,
        enum: ["Casual", "Sick", "Earned", "Unpaid"],
        required: true
    },

    // Stored as yyyy-mm-dd, same convention as Attendance.date.

    fromDate: {
        type: String,
        required: true
    },

    toDate: {
        type: String,
        required: true
    },

    // Recomputed server-side from fromDate/toDate on create/edit,
    // never trusted blindly from the client.

    days: {
        type: Number,
        required: true
    },

    reason: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    }

}, {

    timestamps: true // createdAt doubles as "applied date"

});

module.exports = mongoose.model("Leave", leaveSchema);
