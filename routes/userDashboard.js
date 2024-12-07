const express = require('express');

const {dashboard, getUser} = require('../controllers/userController')
const router = express.Router();
const {isAuthenticated} = require("../controllers/authController");


router.get('/', isAuthenticated, dashboard);

router.get('/getUser', getUser);

module.exports = router;