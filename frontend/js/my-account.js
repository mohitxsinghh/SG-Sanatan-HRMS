// ===========================================
// SG SANATAN HRMS - My Account (Employee Self-Service)
// ===========================================

const session = requireRole(["Employee"]);

const toastContainer = document.getElementById("toastContainer");

const accountName      = document.getElementById("accountName");
const accountEmail      = document.getElementById("accountEmail");
const currentPassword    = document.getElementById("currentPassword");
const newPassword         = document.getElementById("newPassword");
const confirmPassword      = document.getElementById("confirmPassword");
const saveAccountBtn        = document.getElementById("saveAccountBtn");

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
// Load Current Info
// ==========================

async function loadAccount() {

    try {

        const me = await apiFetch("/auth/me");

        accountName.value = me.name;
        accountEmail.value = me.email;

    } catch (error) {

        showToast("Load Failed", error.message, true);

    }

}

// ==========================
// Save
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

        currentPassword.value = "";
        newPassword.value = "";
        confirmPassword.value = "";

        window.dispatchEvent(new Event("settingsUpdated")); // re-runs topbar.js's applyGlobalSettings

        showToast("Saved", "Your account has been updated.");

    } catch (error) {

        showToast("Save Failed", error.message, true);

    } finally {

        saveAccountBtn.disabled = false;

    }

});

// ==========================
// Initial Load
// ==========================

loadAccount();
