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

// Lets the logged-in user (Admin or Employee) update their own name,
// email, and/or password. Changing the password requires the current
// password as proof - a valid JWT alone isn't enough, since tokens can
// leak (shared screen, saved browser, etc.) and this is the one action
// that should require re-proving identity.

async function updateMe(req, res) {

    try {

        const Model = req.user.role === "Admin" ? Admin : Employee;

        const user = await Model.findById(req.user.id);

        if (!user) {

            return res.status(404).json({ message: `${req.user.role} not found` });

        }

        const { name, email, currentPassword, newPassword } = req.body;

        if (name) {

            user.name = name.trim();

        }

        if (email) {

            user.email = email.toLowerCase().trim();

        }

        if (newPassword) {

            if (!currentPassword) {

                return res.status(400).json({

                    message: "Current password is required to set a new password"

                });

            }

            const isMatch = await user.comparePassword(currentPassword);

            if (!isMatch) {

                return res.status(401).json({ message: "Current password is incorrect" });

            }

            user.password = newPassword; // pre-save hook hashes it automatically

        }

        await user.save();

        res.json({

            message: "Profile updated successfully",

            user: { ...user.toJSON(), role: req.user.role }

        });

    } catch (error) {

        if (error.code === 11000) {

            return res.status(400).json({ message: "That email is already in use" });

        }

        res.status(400).json({ message: error.message });

    }

}

module.exports = { login, getMe, updateMe };
