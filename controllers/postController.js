// const oracledb = require('oracledb');
const { getConnection } = require('../db/dbconfig');
const {getSessionUser} = require('./authController')
const session = require('express-session');

async function createPost(req, res) {
    const postData = {
        seller_id: getSessionUser(req),       // Hard-coded seller ID
        location_id: 5,       // Hard-coded location ID
        units: 50,            // Hard-coded units available
        price_per_unit: 200   // Hard-coded price per unit
    };
    let connection;
    const sql = `INSERT INTO Posts (post_id, seller_id, location_id, units, price_per_unit) 
                 VALUES (Post_id_seq.NEXTVAL, :seller_id, :location_id, :units, :price_per_unit)`;
    try{
        connection = await getConnection();
    await connection.execute(sql, postData, { autoCommit: true });
    res.status(201).json({ message: 'Post created successfully' });
    }
    catch(err) {
        res.status(500).json({ error: 'Error creating post',details:err.message });
    }
    finally {
        if (connection) {
            await connection.close(); 
        }
    }
}

async function getPosts(req, res) {
    const query = "SELECT * FROM POSTS";
    let connection;
        try {
            connection = await getConnection();
            const result = await connection.execute(query);
            const posts = result.rows.map(row => ({
                post_id: row[0],    
                seller_id: row[1],
                location_id: row[2],
                units: row[3],
                price_per_unit: row[4]
            }));
            res.status(200).json({ posts });
        } catch (err) {
            res.status(500).json({ error: 'Error fetching posts', details: err.message });
        } finally {
            if (connection) {
                await connection.close();
            }
        }
    }

async function getPostById(postId) {
    const sql = `SELECT * FROM Posts WHERE post_id = :postId`;
    const conn = await oracledb.getConnection();
    const result = await conn.execute(sql, { postId });
    conn.close();
    return result.rows;
}

module.exports = { createPost, getPosts };


// const postModel = require('../models/postModel');

// async function createPost(req, res) {
//     try {
//         await postModel.createPost(req.body);
//         res.status(201).json({ message: 'Post created successfully' });
//     } catch (err) {
//         res.status(500).json({ error: 'Error creating post' });
//     }
// }

// async function getPostById(req, res) {
//     try {
//         const post = await postModel.getPostById(req.params.id);
//         res.json(post);
//     } catch (err) {
//         res.status(500).json({ error: 'Error fetching post' });
//     }
// }

// module.exports = { createPost, getPostById };
