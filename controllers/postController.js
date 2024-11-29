// const oracledb = require('oracledb');
const { getConnection } = require('../db/dbconfig');
const { connect } = require('../routes');
const {getSessionUser} = require('./authController')
const session = require('express-session');


async function createPost(req, res) {
    const user = getSessionUser(req); // Get the session user, ensure this works correctly
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not logged in' });
    }

    const { units, price_per_unit, location_id } = req.body;

    // Validate input
    if (!units || !price_per_unit || !location_id) {
        return res.status(400).json({ error: 'Invalid input: All fields are required' });
    }

    let connection;
    const sql = `
        INSERT INTO Posts (post_id, seller_id, location_id, units, price_per_unit)
        VALUES (Post_id_seq.NEXTVAL, :seller_id, :location_id, :units, :price_per_unit)
    `;
    const postData = {
        seller_id: user.user_id,
        location_id: parseInt(location_id),
        units: parseInt(units),
        price_per_unit: parseInt(price_per_unit),
    };
    // const postData = {
    //     seller_id: user.user_id,
    //     location_id: 2,
    //     units: 34,
    //     price_per_unit: 903,
    // };

    try {
        connection = await getConnection(); // Get the database connection
        await connection.execute(sql, postData);
        console.log("hskdj")
        await connection.commit();
        console.log("ewu")
        res.status(201).json({ message: 'Post created successfully' });
    } catch (err) {
        console.error('Error executing SQL:', err.message);
        res.status(500).json({ error: 'Error creating post', details: err.message });
    } finally {
        if (connection) {
            await connection.close(); // Ensure connection is closed to prevent leaks
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

async function getMyPosts(req, res) {
    const query = `SELECT * FROM POSTS WHERE SELLER_ID = :ID`
    let connection
    try{
        const user = getSessionUser(req);
        console.log(user.user_id,"fdg")
        connection = await getConnection();
        const result = await connection.execute(query, {ID : user.user_id});
        const posts = result.rows.map(row => ({
            post_id: row[0],    
            location_id: row[2],
            units: row[3],
            price_per_unit: row[4]
        }))
        console.log(posts)
        res.status(200).json({posts});
    }    
    catch (err){
        console.error('Error fetching posts:', err); // Log the complete error stack
        res.status(500).json({ error: 'Error fetching posts', details: err.message });
    }
    finally{
        if (connection) {
            await connection.close();
        }
    }
}

async function deletePost(req, res){
    const postId = req.params.id;  // Get the post ID from the request parameter
    const query = `DELETE FROM POSTS WHERE POST_ID = :POST_ID`;
    const delTrans = `DELETE FROM TRANSACTIONS WHERE POST_ID = :POST_ID`;
    let connection;
    console.log("Transaction committed1");

    try {
        if (!postId) {
            return res.status(400).json({ error: "Post ID is required" });
        }
        console.log("Transaction committed2");
        // const p_id = 22;  //fetch from frontend
        connection = await getConnection();
        console.log("Transaction committed4");
        await connection.execute('BEGIN');
        await connection.execute(delTrans, {POST_ID : postId});
        console.log("Transaction committed5");
        await connection.execute(query, {post_id : postId});
        await connection.commit();
        res.status(200).json({message: "Post and transaction Deleted successfully"});
    }
    catch(err){
        console.error("Error deleting post:", err);
        if (connection) {
            try {
                await connection.rollback(); // Undo all changes made since BEGIN
                console.log("Transaction rolled back successfully");
            } catch (rollbackErr) {
                console.error("Error during rollback:", rollbackErr);
            }
        }
        res.status(500).json({error: "Error in deleting", details: err.message})
    }
    finally{
        if(connection){
            try {
                await connection.close();
            } catch (closeErr) {
                console.error("Error closing connection:", closeErr);
            }
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

async function getLocations(req, res) {
    const query = `SELECT * FROM LOCATION`;
    let connection
    try{
        connection = await getConnection();
        const result = await connection.execute(query);
        const locations = result.rows.map(row => ({
            loc_id: row[0],
            address: row[1]
        }))
        console.log(locations)
        res.status(200).json({locations});

    }
    catch(err){
        console.error('Error fetching loc:', err); // Log the complete error stack
        res.status(500).json({ error: 'Error fetching loc', details: err.message });
    }
    finally{
        if (connection) {
            await connection.close();
        }
    }
    
}

module.exports = { createPost, getPosts, getMyPosts, deletePost, getLocations};


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
