const express = require('express');
const router = express.Router();

const {createPost, getPosts}= require("../controllers/postController")
const {isAuthenticated} = require("../controllers/authController");

router.get('/post' ,isAuthenticated, createPost)

router.get('/home', getPosts);

module.exports = router