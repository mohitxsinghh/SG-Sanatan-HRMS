const jwt = require("jsonwebtoken");

// Reads "Authorization: Bearer <token>", verifies it, and attaches
// { id, role } to req.user so downstream routes/controllers know
// who's calling. Rejects with 401 if there's no valid token.

function protect(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {

        return res.status(401).json({

            message: "Not authorized, no token provided"

        });

    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; // { id, role, iat, exp }

        next();

    } catch (error) {

        return res.status(401).json({

            message: "Not authorized, token invalid or expired"

        });

    }

}

// Usage: authorizeRoles("Admin")  or  authorizeRoles("Admin", "Employee")
// Must run AFTER protect(), since it relies on req.user being set.

function authorizeRoles(...allowedRoles) {

    return (req, res, next) => {

        if (!req.user || !allowedRoles.includes(req.user.role)) {

            return res.status(403).json({

                message: "You don't have permission to do this"

            });

        }

        next();

    };

}

module.exports = { protect, authorizeRoles };
