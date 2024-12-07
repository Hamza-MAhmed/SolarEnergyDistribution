const { getConnection } = require('../db/dbconfig');
const session = require('express-session');
const {getSessionUser} = require('./authController')

async function createTransaction(req, res) {
    // const { postId, unitsToBuy, buyerId } = req.body;
    //from select button that ost data should be posted to backend
    const { post_id, units_bought, total_price, status } = req.body;
    let connection;

    try {
        console.log("dui")
        connection = await getConnection();
        console.log("dui2")

        const postQuery = `SELECT * FROM POSTS WHERE post_id = :post_id`;
        const postResult = await connection.execute(postQuery, { post_id:post_id });
        console.log("dui3")


        if (postResult.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found.' });
        }
        const post = postResult.rows[0];
        const availableUnits = post[3]; // Adjust index for available units column
        console.log(post)

        // Insert the transaction into the transaction table
        const transactionData = {
            buyer_id: getSessionUser(req).user_id,
            post_id: post_id,
            units_bought: units_bought,
            total_price: total_price,
            status: status
        };
        console.log(transactionData);
        if (transactionData.units_bought > availableUnits) {
            return res.status(400).json({ message: 'Not enough units available.' });
        }


        const query = `INSERT INTO Transactions (transaction_id, buyer_id, post_id, units_bought, 
        total_price, status, transaction_date) VALUES (Trans_id_seq.NEXTVAL, :buyer_id, :post_id, 
        :units_bought, :total_price, :status, CURRENT_TIMESTAMP)`;
        console.log("dui4")
        
        await connection.execute(query, transactionData, { autoCommit: true });
        console.log("dui5")
        await connection.commit();

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

    const user = getSessionUser(req); // Assuming the seller's ID is stored in session
   

    const query = `select u.user_name, u.email, t.transaction_id, t.units_bought, t.post_id, t.status from users u join transactions t on u.user_id = t.buyer_id where t.post_id in (select post_id from posts where seller_id = :seller_id and (t.status = 'Pending' or t.status = 'Progress'))`;
    let connection;

    try {
        connection = await getConnection();
        const result = await connection.execute(query, { seller_id : user.user_id });

        const posts = result.rows.map(row => ({
            user_name: row[0],
            email: row[1],
            trans_id: row[2], 
            units: row[3],
            post_id: row[4],
            status : row[5]
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
    const { id, units, p_id } = req.params;
    let connection;

    try {
        connection = await getConnection();
        await connection.execute('savepoint approve');

        console.log('Executing Transactions Update');
        const transQuery = `UPDATE Transactions SET status = 'Progress' WHERE transaction_id = :transaction_id`;
        await connection.execute(transQuery, { transaction_id: id });

        console.log('Executing Posts Update');
        const postQuery = `UPDATE POSTS SET units = units - :units WHERE post_id = 
                           (SELECT post_id FROM transactions WHERE transaction_id = :transaction_id)`;
        await connection.execute(postQuery, { units: units, transaction_id: id });

        console.log('Executing Delete Transactions');
        const deleteTrans = `DELETE FROM TRANSACTIONS WHERE POST_ID = :post_id 
                             AND UNITS_BOUGHT > (SELECT units FROM posts WHERE post_id = :post_id) AND STATUS = 'Pending'`;
        await connection.execute(deleteTrans, { post_id: p_id });

        console.log('Executing Commit');
        await connection.commit(); // Commit transaction

        res.status(200).json({ message: 'Transaction approved successfully!' });
    } catch (err) {
        console.error('Error approving transaction:', err.message);
        
        if (connection) {
            console.log('Rolling back transaction');
            await connection.execute('rollback to savepoint approve'); // Rollback in case of an error
        }

        res.status(500).json({ error: 'Error approving transaction', details: err.message });
    } finally {
        if (connection) {
            await connection.close(); // Close the connection
        }
    }
}

async function getRecurringPosts(req, res) {

    const user = getSessionUser(req); // Assuming the seller's ID is stored in session
    // const sellerId = user.user_id
    console.log(user.user_id)
    if (!user || !user.user_id) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }    

    const query = `select u.user_name, u.email, t.transaction_id, t.units_bought, t.post_id from users u join 
    transactions t on u.user_id = t.buyer_id where t.post_id in (select post_id from posts where seller_id = :seller_id and t.status = 'Recurring')`;
    const buyer_query = `select u.user_name, u.email, t.transaction_id, t.units_bought, t.post_id from users u join 
    posts p on u.user_id = p.seller_id join transactions t on t.post_id = p.post_id where t.transaction_id in
     (select transaction_id from transactions where buyer_id = :buyer_id and (t.status = 'Recurring'))`;
    let connection;

    try {
        connection = await getConnection();
        const result = await connection.execute(query, { seller_id : user.user_id });
        const result2 = await connection.execute(buyer_query, {buyer_id : user.user_id});
        console.log(result)
        console.log(result2)

        const posts = result.rows.map(row => ({
            user_name: row[0],
            email: row[1],
            trans_id: row[2], 
            units: row[3],
            post_id: row[4]
        }));

        const posts2 = result2.rows.map(row => ({
            user_name: row[0],
            email: row[1],
            trans_id: row[2], 
            units: row[3],
            post_id: row[4]
        }))

        res.status(200).json({ posts ,posts2});
    } catch (err) {
        res.status(500).json({ error: 'Error fetching seller posts', details: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}


module.exports = { createTransaction, getSellerTransactedPosts, approveTransaction, getRecurringPosts};

