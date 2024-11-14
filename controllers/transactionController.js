const { getConnection } = require('../db/dbconfig');
const session = require('express-session');
const {getSessionUser} = require('./authController')

async function createTransaction(req, res) {
    // const { postId, unitsToBuy, buyerId } = req.body;
    //from select button that ost data should be posted to backend

    const postId = 1;
    const seller = 1;
    
    let connection;

    try {
        connection = await getConnection();

        const postQuery = `SELECT * FROM POSTS WHERE post_id = :postId`;
        const postResult = await connection.execute(postQuery, { postId });

        if (postResult.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        const post = postResult.rows[0];
        const availableUnits = post[3]; // Adjust index for available units column

        // Check if the units to buy are available
        if (unitsToBuy > availableUnits) {
            return res.status(400).json({ message: 'Not enough units available.' });
        }

        // Insert the transaction into the transaction table
        const transactionData = {
            buyer_id: getSessionUser(req),
            post_id: postId,
            units_bought: 30,
            total_price: 1000,
            status: 'Pending',
        };

        const query = `INSERT INTO Transactions (transaction_id, buyer_id, post_id, units_bought, 
        total_price, status, transaction_date) VALUES (Transaction_id_seq.NEXTVAL, :buyer_id, :post_id, 
        :units_bought, :total_price, :status, CURRENT_TIMESTAMP)`;
        
        await connection.execute(query, transactionData, { autoCommit: true });

        // Update the post's available units
        // const updatedUnits = availableUnits - unitsToBuy;
        // const updatePostSql = `UPDATE POSTS SET units = :units WHERE post_id = :postId`;
        
        // await connection.execute(updatePostSql, { units: updatedUnits, postId }, { autoCommit: true });

        // If units are 0, the post should not be shown in the dashboard
        // if (updatedUnits === 0) {
        //     // You can either remove this post from the dashboard or hide it
        // }

        res.status(200).json({ message: 'Transaction created successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Error creating transaction', details: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

async function getSellerTransactedPosts(req, res) {

    const sellerId = getSessionUser(req); // Assuming the seller's ID is stored in session

    const query = `select u.user_name, u.email, t.units_bought, t.post_id from users u join transactions t on u.user_id = t.buyer_id where t.post_id in (select post_id from posts where seller_id = :seller_id and t.status = 'Pending')`;
    let connection;

    try {
        connection = await getConnection();
        const result = await connection.execute(query, { sellerId });

        const posts = result.rows.map(row => ({
            user_name: row[0],
            email: row[1], 
            units: row[2],
            post_id: row[3]
        }));

        res.status(200).json({ posts });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching seller posts', details: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

async function approveTransaction(req, res) {
    const { transactionId } = req.body;
    const unitsSold = 40;
    //fetch from frontend or by approve button
    let connection;

    try {
        connection = await getConnection();

        // const transactionQuery = `SELECT * FROM Transactions WHERE transaction_id = :transactionId`;
        // const transactionResult = await connection.execute(transactionQuery, { transactionId });

        // if (transactionResult.rows.length === 0) {
        //     return res.status(404).json({ message: 'Transaction not found.' });
        // }

        // const transaction = transactionResult.rows[0];
        // const postId = transaction[1]; // Post ID from transaction
        // const unitsSold = transaction[4]; // Units bought by the buyer
        // const sellerId = transaction[3]; // Seller ID from transaction

        // Update transaction status to "Progress"
        const transQuery = `UPDATE Transactions SET status = 'Progress' WHERE transaction_id = :transactionId`;
        await connection.execute(updateQuery, { transactionId }, { autoCommit: true });

        // const postquery = `SELECT * FROM POSTS WHERE post_id = :postId`;
        // const postResult = await connection.execute(postQuery, { postId });

        // const post = postResult.rows[0];
        // const availableUnits = post[3]; // Available units in the post

        // Ensure there are enough units left for the transaction
        // if (availableUnits < unitsSold) {
        //     return res.status(400).json({ message: 'Not enough units available to complete the transaction.' });
        // }

        const newUnits = availableUnits - unitsSold;
        const postQuery = `UPDATE POSTS SET units = units - :units WHERE post_id = (select post_id from transactions where transaction_id = :transaction_id)`;
        await connection.execute(postQuery, { units: unitsSold, transactionId }, { autoCommit: true });
        const deletePost = `DELETE FROM POSTS WHERE UNITS = 0`;
        await connection.execute(deletePost)
        // If units are 0, remove post from dashboard
        if (newUnits === 0) {
            // Hide post from dashboard if needed
        }

        res.status(200).json({ message: 'Transaction approved successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Error approving transaction', details: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

app.post('/api/seller/approve', async (req, res) => {
    const { transactionId } = req.body;
    let connection;

    try {
        connection = await getConnection();

        // Fetch the transaction details
        const transactionQuery = `SELECT * FROM Transactions WHERE transaction_id = :transactionId`;
        const transactionResult = await connection.execute(transactionQuery, { transactionId });

        if (transactionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        const transaction = transactionResult.rows[0];
        const postId = transaction[1]; // Post ID from transaction
        const unitsSold = transaction[4]; // Units bought by the buyer
        const sellerId = transaction[3]; // Seller ID from transaction

        // Update transaction status to 'Progress'
        const updateTransactionSql = `UPDATE Transactions SET status = 'Progress' WHERE transaction_id = :transactionId`;
        await connection.execute(updateTransactionSql, { transactionId }, { autoCommit: true });

        // Update the post with the remaining units
        const postQuery = `SELECT * FROM POSTS WHERE post_id = :postId`;
        const postResult = await connection.execute(postQuery, { postId });

        const post = postResult.rows[0];
        const availableUnits = post[3]; // Available units in the post

        if (availableUnits < unitsSold) {
            return res.status(400).json({ message: 'Not enough units available to complete the transaction.' });
        }

        const newUnits = availableUnits - unitsSold;
        const updatePostSql = `UPDATE POSTS SET units = :units WHERE post_id = :postId`;

        await connection.execute(updatePostSql, { units: newUnits, postId }, { autoCommit: true });

        res.status(200).json({ message: 'Transaction approved and units updated successfully.' });

    } catch (err) {
        res.status(500).json({ message: 'Error approving transaction', details: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

