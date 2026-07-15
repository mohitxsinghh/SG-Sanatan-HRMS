const Admin = require("../models/Admin");
const Employee = require("../models/Employee");
const generateToken = require("../utils/generateToken");

// One login endpoint for both roles - checks Admin first, then Employee,
// so the frontend only needs a single login form.

async function login(req, res) {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({

                message: "Email and password are required"

            });

        }

        const normalizedEmail = email.toLowerCase().trim();

        // ---- Try Admin ----

        const admin = await Admin.findOne({ email: normalizedEmail });

        if (admin) {

            const isMatch = await admin.comparePassword(password);

            if (!isMatch) {

                return res.status(401).json({ message: "Incorrect email or password" });

            }

            const token = generateToken(admin._id, "Admin");

            return res.json({

                token,

                user: {
                    id: admin._id,
                    name: admin.name,
                    email: admin.email,
                    role: "Admin"
                }

            });

        }

        // ---- Try Employee ----

        const employee = await Employee.findOne({ email: normalizedEmail });

        if (employee) {

            if (employee.status !== "Active") {

                return res.status(403).json({

                    message: "Your account is inactive. Contact your admin."

                });

            }

            const isMatch = await employee.comparePassword(password);

            if (!isMatch) {

                return res.status(401).json({ message: "Incorrect email or password" });

            }

            const token = generateToken(employee._id, "Employee");

            return res.json({

                token,

                user: {
                    id: employee._id,
                    name: employee.name,
                    email: employee.email,
                    employeeId: employee.employeeId,
                    department: employee.department,
                    designation: employee.designation,
                    role: "Employee"
                }

            });

        }

        // ---- Neither matched ----

        return res.status(401).json({ message: "Incorrect email or password" });

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

}

// Returns the logged-in user's own profile (Admin or Employee),
// based on the id/role decoded from their JWT by the protect() middleware.

async function getMe(req, res) {

    try {

        if (req.user.role === "Admin") {

            const admin = await Admin.findById(req.user.id);

            if (!admin) {

                return res.status(404).json({ message: "Admin not found" });

            }

            return res.json({ ...admin.toJSON(), role: "Admin" });

        }

        const employee = await Employee.findById(req.user.id);

        if (!employee) {

            return res.status(404).json({ message: "Employee not found" });

        }

        res.json({ ...employee.toJSON(), role: "Employee" });

    } catch (error) {

        res.status(500).json({ message: error.message });

    }

}

module.exports = { login, getMe };
