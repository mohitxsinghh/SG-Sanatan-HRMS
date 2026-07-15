// ===========================================
// One-time script to create the first Admin account.
// Run it manually from the backend folder:
//
//     node utils/seedAdmin.js
//
// Edit the name/email/password below before running, then you can
// delete this file (or just leave it - running it again just fails
// safely with a duplicate-email error since it won't overwrite
// an existing admin).
// ===========================================

require("dotenv").config();

const mongoose = require("mongoose");
const Admin = require("../models/Admin");

const ADMIN_NAME = "Mohit Singh";
const ADMIN_EMAIL = "admin@sgsanatan.com";
const ADMIN_PASSWORD = "admin123"; // change this after first login

async function seed() {

    try {

        await mongoose.connect(process.env.MONGODB_URI);

        const existing = await Admin.findOne({ email: ADMIN_EMAIL });

        if (existing) {

            console.log("⚠️  An admin with this email already exists. Nothing created.");

        } else {

            await Admin.create({

                name: ADMIN_NAME,
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD // gets hashed automatically by the pre-save hook

            });

            console.log("✅ Admin account created successfully.");
            console.log(`   Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

        }

    } catch (error) {

        console.error("❌ Failed to seed admin:", error.message);

    } finally {

        await mongoose.disconnect();

        process.exit(0);

    }

}

seed();
