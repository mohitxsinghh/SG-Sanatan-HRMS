const mongoose = require("mongoose");

// One document per employee. Unpaid leave is intentionally not tracked
// here - it's unlimited and never deducts from a balance (matches the
// old localStorage behavior).

const typeBalanceSchema = new mongoose.Schema({

    quota: { type: Number, required: true },
    used: { type: Number, default: 0 }

}, { _id: false });

const leaveBalanceSchema = new mongoose.Schema({

    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        unique: true
    },

    Casual: { type: typeBalanceSchema, default: () => ({ quota: 12, used: 0 }) },
    Sick:   { type: typeBalanceSchema, default: () => ({ quota: 10, used: 0 }) },
    Earned: { type: typeBalanceSchema, default: () => ({ quota: 15, used: 0 }) }

}, {

    timestamps: true

});

module.exports = mongoose.model("LeaveBalance", leaveBalanceSchema);
