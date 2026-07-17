const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Files land in backend/uploads/employees/<employeeId>/ - one folder
// per employee, created on demand. Only PDFs and images are accepted;
// anything else is rejected before it ever touches disk.

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads", "employees");

const ALLOWED_MIME_TYPES = [

    "application/pdf",
    "image/jpeg",
    "image/png"

];

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        const employeeDir = path.join(UPLOAD_ROOT, req.params.id);

        fs.mkdirSync(employeeDir, { recursive: true });

        cb(null, employeeDir);

    },

    filename: (req, file, cb) => {

        // Random name on disk - never trust/reuse the original filename
        // directly (path traversal, collisions, weird characters).

        const uniqueName = crypto.randomBytes(16).toString("hex") + path.extname(file.originalname);

        cb(null, uniqueName);

    }

});

function fileFilter(req, file, cb) {

    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(new Error("Only PDF, JPG, and PNG files are allowed"));

    }

}

const upload = multer({

    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file

});

module.exports = { upload, UPLOAD_ROOT };
