const express = require('express');
const router = express.Router();

const {createPost, getPosts, getMyPosts, deletePost, getLocations}= require("../controllers/postController")
const {isAuthenticated} = require("../controllers/authController");

router.post('/post' ,isAuthenticated, createPost)

router.get('/home', getPosts);

router.get('/myPost', isAuthenticated, getMyPosts)

router.delete('/deletePost/:id', deletePost)

router.get('/location', getLocations)

module.exports = router