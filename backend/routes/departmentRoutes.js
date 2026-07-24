const express = require("express");

const router = express.Router();

const Department = require("../models/Department");
const Employee = require("../models/Employee");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// GET is open to any logged-in user (Employees need this for the
// Directory page's department filter). Writes stay Admin-only below.

// GET All Departments
// "head" is populated so the frontend gets the employee's name directly,
// instead of having to look it up from a separate employee list.

router.get("/", protect, async (req, res) => {

    try {

        const departments = await Department.find().populate("head", "name");

        res.json(departments);

    } catch (error) {

        res.status(500).json({

            message: error.message

        });

    }

});

// POST New Department

router.post("/", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const department = await Department.create(req.body);

        const populated = await department.populate("head", "name");

        res.status(201).json({

            message: "Department Added Successfully",

            department: populated

        });

    } catch (error) {

        if (error.code === 11000) {

            const field = Object.keys(error.keyValue || {})[0];

            const message = field === "deptId"

                ? "That department code was already in use - please try saving again"

                : "A department with this name already exists";

            return res.status(400).json({ message });

        }

        res.status(400).json({

            message: error.message

        });

    }

});

// ===========================================
// UPDATE DEPARTMENT
// (renaming cascades to every employee currently in this department,
// since Employee.department is stored as a plain string, not a reference)
// ===========================================

router.put("/:id", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const department = await Department.findById(req.params.id);

        if (!department) {

            return res.status(404).json({

                message: "Department not found"

            });

        }

        const oldName = department.name;

        Object.assign(department, req.body);

        await department.save();

        if (req.body.name && req.body.name !== oldName) {

            await Employee.updateMany(

                { department: oldName },

                { department: req.body.name }

            );

        }

        const populated = await department.populate("head", "name");

        res.json({

            message: "Department Updated Successfully",

            department: populated

        });

    } catch (error) {

        if (error.code === 11000) {

            const field = Object.keys(error.keyValue || {})[0];

            const message = field === "deptId"

                ? "That department code was already in use - please try saving again"

                : "A department with this name already exists";

            return res.status(400).json({ message });

        }

        res.status(400).json({

            message: error.message

        });

    }

});

// ===========================================
// DELETE DEPARTMENT
// Blocked if any employee is still assigned to it - mirrors the old
// frontend-only check, now enforced where it can't be bypassed.
// ===========================================

router.delete("/:id", protect, authorizeRoles("Admin"), async (req, res) => {

    try {

        const department = await Department.findById(req.params.id);

        if (!department) {

            return res.status(404).json({

                message: "Department not found"

            });

        }

        const employeeCount = await Employee.countDocuments({ department: department.name });

        if (employeeCount > 0) {

            return res.status(400).json({

                message: `Can't delete - ${employeeCount} employee(s) are still assigned to "${department.name}". Reassign them first.`

            });

        }

        await Department.findByIdAndDelete(req.params.id);

        res.json({

            message: "Department Deleted Successfully",

            department

        });

    } catch (error) {

        res.status(400).json({

            message: error.message

        });

    }

});

module.exports = router;
