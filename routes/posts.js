const express = require('express');
const router = express.Router();

const {createPost, getPostById}= require("../controllers/postController")

router.get('/post' , createPost)

module.exports = router