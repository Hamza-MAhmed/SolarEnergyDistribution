const express = require('express')
const router = express.Router();

const { createTransaction, getSellerTransactedPosts, approveTransaction }= require('../controllers/transactionController');
const { isAuthenticated } = require('../controllers/authController');

router.post('/createTransaction',isAuthenticated, createTransaction);

router.get('/getReq', getSellerTransactedPosts);

router.post('/approve/:id/:units/:p_id', approveTransaction)

module.exports = router;
