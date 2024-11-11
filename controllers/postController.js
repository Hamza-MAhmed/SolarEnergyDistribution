// const oracledb = require('oracledb');
const { getConnection } = require('../db/dbconfig');


async function createPost(req, res) {
    const postData = {
        seller_id: 1,       // Hard-coded seller ID
        location_id: 5,       // Hard-coded location ID
        units: 50,            // Hard-coded units available
        price_per_unit: 200   // Hard-coded price per unit
    };
    let connection;
    const sql = `INSERT INTO Posts (post_id, seller_id, location_id, units, price_per_unit) 
                 VALUES (Post_id_seq.NEXTVAL, :seller_id, :location_id, :units, :price_per_unit)`;
    try{
        connection = await getConnection();
    // const conn = await oracledb.getConnection();
    await connection.execute(sql, postData, { autoCommit: true });
    res.status(201).json({ message: 'Post created successfully' });
    }
    catch(err) {
        res.status(500).json({ error: 'Error creating post',details:err.message });
        connection.close();
    }
    finally {
        if (connection) {
            await connection.close();  // Close the connection in the finally block
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

module.exports = { createPost, getPostById };


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
