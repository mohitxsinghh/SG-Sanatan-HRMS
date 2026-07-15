// ===========================================
// SG SANATAN HRMS - Auth Guard
// ===========================================
// Every protected page also has a small blocking <script> at the very
// top of <head> that does an instant redirect check before anything
// renders (see inline snippet in each page). This file provides the
// same check as a reusable function for page-level JS to call, plus
// helpers pages use to read "who's logged in".
// ===========================================

function requireRole(allowedRoles) {

    const session = getCurrentSession();

    if (!session || allowedRoles.indexOf(session.role) === -1) {

        window.location.replace(
            !session ? "login.html" : homePageFor(session.role)
        );

        return null;

    }

    return session;

}

window.requireRole = requireRole;

// Convenience: the logged-in employee's own record (null for Admin).

function getCurrentEmployee() {

    const session = getCurrentSession();

    if (!session || !session.employeeId) return null;

    return getEmployees().find(emp => emp.id === session.employeeId) || null;

}

window.getCurrentEmployee = getCurrentEmployee;
