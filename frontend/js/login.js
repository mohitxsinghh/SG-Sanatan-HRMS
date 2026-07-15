// ===========================================
// SG SANATAN HRMS - Login
// ===========================================

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");

function showError(message) {

    loginError.textContent = message;
    loginError.classList.add("show");

}

function hideError() {

    loginError.classList.remove("show");

}

async function attemptLogin() {

    hideError();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {

        showError("Please enter both email and password.");
        return;

    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";

    try {

        const data = await apiFetch("/auth/login", {

            method: "POST",

            body: JSON.stringify({ email, password })

        });

        // Save the JWT separately - this is what apiFetch attaches to
        // every future request via the Authorization header.

        localStorage.setItem("authToken", data.token);

        // currentSession is what the rest of the app (topbar.js, sidebar.js,
        // auth.js) already knows how to read.

        saveSession({

            userId: data.user.id,

            role: data.user.role,

            employeeId: data.user.role === "Employee" ? data.user.id : null,

            name: data.user.name

        });

        window.location.href = homePageFor(data.user.role);

    } catch (error) {

        showError(error.message || "Login failed. Please try again.");

    } finally {

        loginBtn.disabled = false;
        loginBtn.textContent = "Login";

    }

}

loginBtn.addEventListener("click", attemptLogin);

loginPassword.addEventListener("keyup", e => {

    if (e.key === "Enter") attemptLogin();

});

loginEmail.addEventListener("keyup", e => {

    if (e.key === "Enter") attemptLogin();

});

togglePassword.addEventListener("click", () => {

    const isHidden = loginPassword.type === "password";

    loginPassword.type = isHidden ? "text" : "password";

    togglePassword.innerHTML = isHidden
        ? '<i class="fa-solid fa-eye-slash"></i>'
        : '<i class="fa-solid fa-eye"></i>';

});

loginEmail.focus();
