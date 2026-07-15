const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({

    deptId: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    // References an Employee's _id. Employees themselves still store
    // their department as a plain string (see Employee.js), so this
    // is only used to show/pick "who leads this department" - it does
    // not drive employee assignment.

    head: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: null
    },

    description: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    }

}, {

    timestamps: true

});

module.exports = mongoose.model("Department", departmentSchema);
