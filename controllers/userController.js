const { getConnection } = require('../db/dbconfig');
const { connect } = require('../routes');
const {getSessionUser} = require('./authController')
const session = require('express-session');

async function dashboard(req , res){
    console.log("jdsfis")
    const user = req.session.user;
    console.log(user);
    if (!user) {
        return res.status(401).json({ message: "Unauthorized access" });
    }
    // Send user data in response
    res.json(user);
}

module.exports = { dashboard }