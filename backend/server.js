// ===========================================
// SG SANATAN HRMS
// Backend Server
// ===========================================

require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const app = express();

const PORT = process.env.PORT;

const employeeRoutes = require("./routes/employeeRoutes");
const authRoutes = require("./routes/authRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const holidayRoutes = require("./routes/holidayRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve the frontend (HTML/CSS/JS) directly from Express, so the whole
// app is one deployable service - no separate hosting, no CORS between
// two different domains. "../frontend" works because the frontend
// folder sits right next to this backend folder, both checked out
// together from the same GitHub repo.

app.use(express.static(path.join(__dirname, "..", "frontend")));

// Simple health check - useful once this is deployed, to confirm the
// server is alive without needing to log in first.

app.get("/api/status", (req, res) => {

    res.json({ status: "ok", message: "SG SANATAN HRMS Backend is running" });

});

// Visiting the bare domain goes straight to the login page.

app.get("/", (req, res) => {

    res.redirect("/login.html");

});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/settings", settingsRoutes);

connectDB();

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
