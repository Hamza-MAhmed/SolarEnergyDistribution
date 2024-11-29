const { getConnection } = require('../db/dbconfig');
const session = require('express-session');
const {getSessionUser} = require('./authController')

async function createTransaction(req, res) {
    // const { postId, unitsToBuy, buyerId } = req.body;
    //from select button that ost data should be posted to backend
    const { post_id, units_bought, total_price, status } = req.body;

    // const postId = 12;
    // const seller = 2;
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
     
  
//       // Update the available units in the post
//       const updatePostQuery = `UPDATE POSTS SET units = units - :units_bought WHERE post_id = :post_id`;
//       await connection.execute(updatePostQuery, { units_bought, post_id }, { autoCommit: true });
  
//       res.status(200).json({ message: 'Transaction created successfully!' });
//     } catch (err) {
//       res.status(500).json({ error: 'Error creating transaction', details: err.message });
//     } finally {
//       if (connection) {
//         await connection.close();
//       }
//     }
//   }
  

async function getSellerTransactedPosts(req, res) {

    const sellerId = getSessionUser(req).user_id; // Assuming the seller's ID is stored in session
    console.log(sellerId)

    const query = `select u.user_name, u.email, t.transaction_id, t.units_bought, t.post_id from users u join transactions t on u.user_id = t.buyer_id where t.post_id in (select post_id from posts where seller_id = :seller_id and t.status = 'Pending')`;
    let connection;

    try {
        connection = await getConnection();
        const result = await connection.execute(query, { seller_id : sellerId });

        const posts = result.rows.map(row => ({
            user_name: row[0],
            email: row[1],
            trans_id: row[2], 
            units: row[3],
            post_id: row[4]
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

// async function approveTransaction(req, res) {
//     // const { transactionId } = req.body;
//     const {id,units,p_id} = req.params;
//     console.log(id,p_id,units)
//     const unitsSold = 30;
//     //fetch from frontend or by approve button
//     let connection;

//     try {
//         connection = await getConnection();
//         const transQuery = `UPDATE Transactions SET status = 'Progress' WHERE transaction_id = :transaction_id`;
//         await connection.execute(transQuery, { transaction_id : id });

//         // const newUnits = availableUnits - unitsSold;
//         const postQuery = `UPDATE POSTS SET units = units - :units WHERE post_id = 
//         (select post_id from transactions where transaction_id = :transaction_id)`;
//         await connection.execute(postQuery, { units: units, transaction_Id : id });
//         console.log("1")
//         const deleteTrans = `delete TRANSACTIONS where POST_ID = :post_id AND UNITS_BOUGHT >
//          (select units from posts where post_id = :post_id);`
//         await connection.execute(deleteTrans, {post_id : p_id,post_id : p_id})
//         console.log("2")
//         const deletePost = `DELETE FROM POSTS WHERE UNITS = 0`;
//         await connection.execute(deletePost)
//         console.log("3")
//         await connection.commit();
//         // If units are 0, remove post from dashboard
//         // if (newUnits === 0) {
//         //     // Hide post from dashboard if needed
//         // }

//         res.status(200).json({ message: 'Transaction approved successfully!' });
//     } catch (err) {
//         res.status(500).json({ error: 'Error approving transaction', details: err.message });
//     } finally {
//         if (connection) {
//             await connection.close();
//         }
//     }
// }


async function approveTransaction(req, res) {
    const { id, units, p_id } = req.params;
    let connection;

    try {
        connection = await getConnection();

        console.log('Executing Transactions Update');
        const transQuery = `UPDATE Transactions SET status = 'Progress' WHERE transaction_id = :transaction_id`;
        await connection.execute(transQuery, { transaction_id: id });

        console.log('Executing Posts Update');
        const postQuery = `UPDATE POSTS SET units = units - :units WHERE post_id = 
                           (SELECT post_id FROM transactions WHERE transaction_id = :transaction_id)`;
        await connection.execute(postQuery, { units: units, transaction_id: id });

        console.log('Executing Delete Transactions');
        const deleteTrans = `DELETE FROM TRANSACTIONS WHERE POST_ID = :post_id 
                             AND UNITS_BOUGHT > (SELECT units FROM posts WHERE post_id = :post_id) AND STATUS = 'PENDING'`;
        await connection.execute(deleteTrans, { post_id: p_id });

        console.log('Executing Delete Posts');
        const deletePost = `DELETE FROM POSTS WHERE UNITS = 0`;
        await connection.execute(deletePost);

        await connection.commit();
        res.status(200).json({ message: 'Transaction approved successfully!' });
    } catch (err) {
        console.error('Error approving transaction:', err.message);
        res.status(500).json({ error: 'Error approving transaction', details: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

// app.post('/api/seller/approve', async (req, res) => {
//     const { transactionId } = req.body;
//     let connection;

//     try {
//         connection = await getConnection();

//         // Fetch the transaction details
//         const transactionQuery = `SELECT * FROM Transactions WHERE transaction_id = :transactionId`;
//         const transactionResult = await connection.execute(transactionQuery, { transactionId });

//         if (transactionResult.rows.length === 0) {
//             return res.status(404).json({ message: 'Transaction not found.' });
//         }

//         const transaction = transactionResult.rows[0];
//         const postId = transaction[1]; // Post ID from transaction
//         const unitsSold = transaction[4]; // Units bought by the buyer
//         const sellerId = transaction[3]; // Seller ID from transaction

//         // Update transaction status to 'Progress'
//         const updateTransactionSql = `UPDATE Transactions SET status = 'Progress' WHERE transaction_id = :transactionId`;
//         await connection.execute(updateTransactionSql, { transactionId }, { autoCommit: true });

//         // Update the post with the remaining units
//         const postQuery = `SELECT * FROM POSTS WHERE post_id = :postId`;
//         const postResult = await connection.execute(postQuery, { postId });

//         const post = postResult.rows[0];
//         const availableUnits = post[3]; // Available units in the post

//         if (availableUnits < unitsSold) {
//             return res.status(400).json({ message: 'Not enough units available to complete the transaction.' });
//         }

//         const newUnits = availableUnits - unitsSold;
//         const updatePostSql = `UPDATE POSTS SET units = :units WHERE post_id = :postId`;

//         await connection.execute(updatePostSql, { units: newUnits, postId }, { autoCommit: true });

//         res.status(200).json({ message: 'Transaction approved and units updated successfully.' });

//     } catch (err) {
//         res.status(500).json({ message: 'Error approving transaction', details: err.message });
//     } finally {
//         if (connection) {
//             await connection.close();
//         }
//     }
// });

module.exports = { createTransaction, getSellerTransactedPosts, approveTransaction};

