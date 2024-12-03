const express = require('express');
const router = express.Router();

const {getProgressTransactions, assignTechnician, getTechniciansByLocation, getRecurringPosts} = require('../controllers/techCommissionController');

router.get('/getProgressTransactions', getProgressTransactions);

router.get('/getTransactions/assign', assignTechnician);

router.get('/technicians/:locationId', getTechniciansByLocation);

router.post('/assignTech', assignTechnician);

router.get('/getRecurring', getRecurringPosts);


module.exports = router;