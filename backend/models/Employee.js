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

    father: {
        type: String
    },

    // Monthly base salary - used by Payroll to calculate deductions
    // for Absent/Half Day/Leave days. Defaults to 0 so existing
    // employees don't fail validation until an Admin sets a real value.

    salary: {
        type: Number,
        default: 0
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
    }

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
