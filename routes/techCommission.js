const express = require('express');
const router = express.Router();

const {getTransactions, assignTechnician} = require('../controllers/techCommissionController');

router.get('/getTransactions', getTransactions);

router.get('/getTransactions/assign', assignTechnician);

module.exports = router;