// routes/authRoutes.js
const express = require('express');
const { register, login, verify_otp, logout } = require('../controllers/authController');

const router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});
// Register route
router.get('/register', register);


// Login route
router.get('/login', login);

router.get("/verify-otp", verify_otp)

router.get("/logout", logout)

module.exports = router;
