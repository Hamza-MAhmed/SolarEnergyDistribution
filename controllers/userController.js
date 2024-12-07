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

function getUser(req, res) {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    // res.set('Pragma', 'no-cache');
    // res.set('Expires', '0');
    // res.set('Surrogate-Control', 'no-store');
    if (req.session && req.session.user) {
      console.log(req.session.user.role, "from get session");
      // Responding with the session user
      return res.json({ user: req.session.user });
    } else {
      console.log("No session user found");
      // Responding with an error or null
      return res.status(401).json({ error: "No user is logged in" });
    }
}

module.exports = { dashboard, getUser }