const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const employeeSchema = new mongoose.Schema({

    employeeId: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true
    },

    department: {
        type: String,
        required: true
    },

    designation: {
        type: String,
        required: true
    },

    phone: {
        type: String
    },

    // Monthly salary used by the Payroll module to compute deductions
    // (see routes/payrollRoutes.js). Present = full pay for that day,
    // Half Day = half-day deduction, Absent/Leave/unmarked = full-day
    // deduction. Daily rate = salary ÷ working days in that month
    // (Sundays + Holidays excluded).

    salary: {
        type: Number,
        default: 0
    },

    // Stored as yyyy-mm-dd, same convention as Attendance/Leave/Holiday
    // dates. Used by Payroll to prorate a mid-month joiner's pay - days
    // before this date are excluded entirely rather than counted as
    // absent. Optional/blank for employees added before this field
    // existed - Payroll treats a missing joiningDate as "already
    // employed for the whole month" (unchanged from before this feature).

    joiningDate: {
        type: String,
        default: ""
    },

    father: {
        type: String
    },

    address: {
        type: String
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        default: "Employee"
    },

    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    },

    // Freeform uploaded documents (ID proof, resume, certificates, etc.)
    // Files themselves live on disk under backend/uploads/employees/<id>/ -
    // this just tracks the metadata + admin-given label for each one.
    // See middleware/uploadMiddleware.js and the /documents routes in
    // routes/employeeRoutes.js.

    documents: [{

        label: { type: String, required: true },
        fileName: { type: String, required: true },     // name on disk (unique, generated)
        originalName: { type: String, required: true },  // name the admin's file had
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedAt: { type: Date, default: Date.now }

    }]

}, {

    timestamps: true

});

// Hash the password automatically whenever it's set/changed,
// so routes never have to remember to hash it themselves.

employeeSchema.pre("save", async function () {

    if (!this.isModified("password")) {

        return;

    }

    const salt = await bcrypt.genSalt(10);

    this.password = await bcrypt.hash(this.password, salt);

});

// Instance method used at login to check the entered password
// against the stored hash.

employeeSchema.methods.comparePassword = function (enteredPassword) {

    return bcrypt.compare(enteredPassword, this.password);

};

// Never send the password hash back in any API response.

employeeSchema.methods.toJSON = function () {

    const obj = this.toObject();

    delete obj.password;

    return obj;

};

module.exports = mongoose.model("Employee", employeeSchema);
