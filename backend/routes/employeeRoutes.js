const express = require("express");

const router = express.Router();

const Employee = require("../models/Employee");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { upload, UPLOAD_ROOT } = require("../middleware/uploadMiddleware");
const path = require("path");
const fs = require("fs");

// Every route below requires a valid token AND the Admin role,
// EXCEPT /directory (defined first, before the blanket restriction
// kicks in) - that one is deliberately open to any logged-in user,
// but only returns non-sensitive fields (no email/phone/address).

router.get("/directory", protect, async (req, res) => {

    try {

        const employees = await Employee.find()

            .select("employeeId name department designation status");

        res.json(employees);

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

});

// (An employee's own FULL profile is served separately via GET
// /api/auth/me, so employees never need the full list/manage access
// below - that stays Admin-only.)

router.use(protect, authorizeRoles("Admin"));

// GET All Employees (Admin only - full details)

router.get("/", async (req, res) => {

    try {

        const employees = await Employee.find();

        res.json(employees);

    } catch (error) {

        res.status(500).json({

            message: error.message

        });

    }

});

// POST New Employee
// (password is required by the schema - Admin sets an initial
// password here, same as the "Create Login" step in the frontend)

router.post("/", async (req, res) => {

    try {

        const employee = await Employee.create(req.body);

        res.status(201).json({

            message: "Employee Added Successfully",

            employee

        });

    } catch (error) {

        res.status(400).json({

            message: error.message

        });

    }

});

// ===========================================
// UPDATE EMPLOYEE
// ===========================================

router.put("/:id", async (req, res) => {

    try {

        // If the request doesn't include a new password, don't overwrite
        // the existing hash with an empty/undefined value.

        const updates = { ...req.body };

        if (!updates.password) {

            delete updates.password;

        }

        const employee = await Employee.findById(req.params.id);

        if (!employee) {

            return res.status(404).json({

                message: "Employee not found"

            });

        }

        Object.assign(employee, updates);

        await employee.save(); // triggers the pre("save") password hash if changed

        res.json({

            message: "Employee Updated Successfully",

            employee

        });

    } catch (error) {

        res.status(400).json({

            message: error.message

        });

    }

});

// ===========================================
// DELETE EMPLOYEE
// ===========================================

router.delete("/:id", async (req, res) => {

    try {

        const employee = await Employee.findByIdAndDelete(

            req.params.id

        );

        if (!employee) {

            return res.status(404).json({

                message: "Employee not found"

            });

        }

        res.json({

            message: "Employee Deleted Successfully",

            employee

        });

    } catch (error) {

        res.status(400).json({

            message: error.message

        });

    }

});

// ===========================================
// DOCUMENTS (Admin only - same guard as everything else in this file)
// ===========================================

// UPLOAD a document

router.post("/:id/documents", upload.single("file"), async (req, res) => {

    try {

        const employee = await Employee.findById(req.params.id);

        if (!employee) {

            // Clean up the file multer already wrote to disk, since
            // there's no employee to attach it to.

            if (req.file) fs.unlink(req.file.path, () => {});

            return res.status(404).json({ message: "Employee not found" });

        }

        if (!req.file) {

            return res.status(400).json({ message: "No file was uploaded" });

        }

        const label = (req.body.label || "").trim();

        if (!label) {

            fs.unlink(req.file.path, () => {});

            return res.status(400).json({ message: "A label is required for the document" });

        }

        employee.documents.push({

            label,
            fileName: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size

        });

        await employee.save();

        res.status(201).json({

            message: "Document Uploaded Successfully",

            documents: employee.documents

        });

    } catch (error) {

        if (req.file) fs.unlink(req.file.path, () => {});

        res.status(400).json({ message: error.message });

    }

});

// DOWNLOAD a document

router.get("/:id/documents/:docId", async (req, res) => {

    try {

        const employee = await Employee.findById(req.params.id);

        if (!employee) {

            return res.status(404).json({ message: "Employee not found" });

        }

        const doc = employee.documents.id(req.params.docId);

        if (!doc) {

            return res.status(404).json({ message: "Document not found" });

        }

        const filePath = path.join(UPLOAD_ROOT, req.params.id, doc.fileName);

        if (!fs.existsSync(filePath)) {

            return res.status(404).json({ message: "File is missing from storage" });

        }

        res.download(filePath, doc.originalName);

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

// DELETE a document

router.delete("/:id/documents/:docId", async (req, res) => {

    try {

        const employee = await Employee.findById(req.params.id);

        if (!employee) {

            return res.status(404).json({ message: "Employee not found" });

        }

        const doc = employee.documents.id(req.params.docId);

        if (!doc) {

            return res.status(404).json({ message: "Document not found" });

        }

        const filePath = path.join(UPLOAD_ROOT, req.params.id, doc.fileName);

        fs.unlink(filePath, () => {}); // best-effort - don't fail the request if the file's already gone

        doc.deleteOne();

        await employee.save();

        res.json({

            message: "Document Deleted Successfully",

            documents: employee.documents

        });

    } catch (error) {

        res.status(400).json({ message: error.message });

    }

});

module.exports = router;
