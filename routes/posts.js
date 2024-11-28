const express = require('express');
const router = express.Router();

const {createPost, getPosts, getMyPosts, deletePost}= require("../controllers/postController")
const {isAuthenticated} = require("../controllers/authController");

router.get('/post' ,isAuthenticated, createPost)

router.get('/home', getPosts);

router.get('/myPost', isAuthenticated, getMyPosts)

router.post('/deletePost/:id', deletePost)

module.exports = router