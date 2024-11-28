const express = require('express');

const {dashboard} = require('../controllers/userController')
const router = express.Router();
const {isAuthenticated} = require("../controllers/authController");


router.get('/', dashboard);


module.exports = router;