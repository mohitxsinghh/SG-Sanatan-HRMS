const jwt = require("jsonwebtoken");

// Encodes the user's Mongo _id and role into the token so protected
// routes can identify "who is this" and "what are they allowed to do"
// without hitting the database on every request.

function generateToken(id, role) {

    return jwt.sign(

        { id, role },

        process.env.JWT_SECRET,

        { expiresIn: "7d" }

    );

}

module.exports = generateToken;
