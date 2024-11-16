const express = require('express')
const router = express.Router();

const { createTransaction, getSellerTransactedPosts, approveTransaction }= require('../controllers/transactionController');
const { isAuthenticated } = require('../controllers/authController');

router.get('/createTransaction',isAuthenticated, createTransaction);

router.get('/getReq', getSellerTransactedPosts);

router.get('/approve', approveTransaction)

module.exports = router;
