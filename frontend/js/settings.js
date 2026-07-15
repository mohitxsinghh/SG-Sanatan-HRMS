// ===========================================
// SG SANATAN HRMS - Settings Module (Backend-Connected)
// ===========================================

const session = requireRole(["Admin"]);

// ==========================
// DOM Elements
// ==========================

const toastContainer = document.getElementById("toastContainer");

// My Account
const accountName      = document.getElementById("accountName");
const accountEmail      = document.getElementById("accountEmail");
const currentPassword    = document.getElementById("currentPassword");
const newPassword         = document.getElementById("newPassword");
const confirmPassword      = document.getElementById("confirmPassword");
const saveAccountBtn        = document.getElementById("saveAccountBtn");

// Company Info
const companyName    = document.getElementById("companyName");
const companyTagline = document.getElementById("companyTagline");
const saveCompanyBtn = document.getElementById("saveCompanyBtn");

// Office Timings
const officeStart   = document.getElementById("officeStart");
const officeEnd      = document.getElementById("officeEnd");
const workHours       = document.getElementById("workHours");
const saveTimingsBtn  = document.getElementById("saveTimingsBtn");

// Theme
const themeSwatches = document.getElementById("themeSwatches");

// ==========================
// Toast
// ==========================

function showToast(title, message, isError = false) {

    if (!toastContainer) return;

    const toast = document.createElement("div");

    toast.className = "toast" + (isError ? " toast-error" : "");

    toast.innerHTML = `

        <i class="fa-solid ${isError ? "fa-triangle-exclamation" : "fa-circle-check"}"></i>

        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>

    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("hide");

        setTimeout(() => toast.remove(), 300);

    }, 3000);

}

// ==========================
// Load Form Values From Server
// ==========================

async function loadForm() {

    try {

        const [settings, me] = await Promise.all([

            apiFetch("/settings"),
            apiFetch("/auth/me")

        ]);

        accountName.value = me.name;
        accountEmail.value = me.email;

        companyName.value    = settings.company.name;
        companyTagline.value = settings.company.tagline;

        officeStart.value = settings.timings.startTime;
        officeEnd.value    = settings.timings.endTime;
        workHours.value     = settings.timings.workHours;

        highlightActiveSwatch(settings.theme.accent);

    } catch (error) {

        showToast("Load Failed", error.message, true);

    }

}

// ==========================
// Broadcast Change
// (lets topbar.js re-fetch and re-apply sidebar/theme instantly, no reload)
// ==========================

function broadcastSettingsChange() {

    window.dispatchEvent(new Event("settingsUpdated"));

}

// ==========================
// Save: My Account
// ==========================

saveAccountBtn.addEventListener("click", async () => {

    if (accountName.value.trim() === "") {

        showToast("Missing Name", "Please enter your name.", true);
        accountName.focus();
        return;

    }

    if (accountEmail.value.trim() === "") {

        showToast("Missing Email", "Please enter your email.", true);
        accountEmail.focus();
        return;

    }

    const isChangingPassword = newPassword.value || confirmPassword.value;

    if (isChangingPassword) {

        if (newPassword.value !== confirmPassword.value) {

            showToast("Passwords Don't Match", "New Password and Confirm New Password must match.", true);
            confirmPassword.focus();
            return;

        }

        if (!currentPassword.value) {

            showToast("Current Password Required", "Enter your current password to set a new one.", true);
            currentPassword.focus();
            return;

        }

    }

    const payload = {

        name: accountName.value.trim(),
        email: accountEmail.value.trim()

    };

    if (isChangingPassword) {

        payload.currentPassword = currentPassword.value;
        payload.newPassword = newPassword.value;

    }

    saveAccountBtn.disabled = true;

    try {

        const result = await apiFetch("/auth/me", {

            method: "PUT",

            body: JSON.stringify(payload)

        });

        // Keep the session in sync so the topbar shows the new name
        // immediately, without needing to log out and back in.

        const currentSession = getCurrentSession();

        if (currentSession) {

            currentSession.name = result.user.name;

            saveSession(currentSession);

        }

        // Clear password fields - never leave them sitting filled in.

        currentPassword.value = "";
        newPassword.value = "";
        confirmPassword.value = "";

        broadcastSettingsChange(); // re-runs topbar.js's applyGlobalSettings

        showToast("Saved", "Your account has been updated.");

    } catch (error) {

        showToast("Save Failed", error.message, true);

    } finally {

        saveAccountBtn.disabled = false;

    }

});

// ==========================
// Save: Company Info
// ==========================

saveCompanyBtn.addEventListener("click", async () => {

    if (companyName.value.trim() === "") {

        showToast("Missing Name", "Please enter a company name.", true);
        companyName.focus();
        return;

    }

    saveCompanyBtn.disabled = true;

    try {

        await apiFetch("/settings", {

            method: "PUT",

            body: JSON.stringify({

                company: {
                    name: companyName.value.trim(),
                    tagline: companyTagline.value.trim()
                }

            })

        });

        addSystemLog("Settings Updated", "Company information was updated.", "info");

        broadcastSettingsChange();

        showToast("Saved", "Company information has been updated.");

    } catch (error) {

        showToast("Save Failed", error.message, true);

    } finally {

        saveCompanyBtn.disabled = false;

    }

});

// ==========================
// Save: Office Timings
// ==========================

saveTimingsBtn.addEventListener("click", async () => {

    const hours = Number(workHours.value);

    if (!hours || hours <= 0) {

        showToast("Invalid Hours", "Please enter a valid number of work hours.", true);
        workHours.focus();
        return;

    }

    saveTimingsBtn.disabled = true;

    try {

        await apiFetch("/settings", {

            method: "PUT",

            body: JSON.stringify({

                timings: {
                    startTime: officeStart.value,
                    endTime: officeEnd.value,
                    workHours: hours
                }

            })

        });

        addSystemLog("Settings Updated", "Office timings were updated.", "info");

        broadcastSettingsChange();

        showToast("Saved", "Office timings have been updated.");

    } catch (error) {

        showToast("Save Failed", error.message, true);

    } finally {

        saveTimingsBtn.disabled = false;

    }

});

// ==========================
// Theme Swatches
// ==========================

function highlightActiveSwatch(themeName) {

    themeSwatches.querySelectorAll(".swatch-btn").forEach(btn => {

        btn.classList.toggle("active", btn.dataset.theme === themeName);

    });

}

themeSwatches.addEventListener("click", async (e) => {

    const btn = e.target.closest(".swatch-btn");

    if (!btn) return;

    const themeName = btn.dataset.theme;

    try {

        await apiFetch("/settings", {

            method: "PUT",

            body: JSON.stringify({ theme: { accent: themeName } })

        });

        applyTheme(themeName);

        highlightActiveSwatch(themeName);

        addSystemLog("Settings Updated", `Theme changed to ${themeName}.`, "info");

        broadcastSettingsChange();

        showToast("Theme Updated", `Accent color switched to ${btn.textContent.trim()}.`);

    } catch (error) {

        showToast("Save Failed", error.message, true);

    }

});

// ==========================
// Initial Load
// ==========================

loadForm();
